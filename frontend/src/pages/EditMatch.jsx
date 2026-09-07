import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Plus, Trash2, Trophy, AlertTriangle, Square, ArrowLeftRight } from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import {
  apiListMatches, apiUpdateMatch, apiGetTeam, apiListCompetitions, apiListAthletes,
  getSessionUser,
} from '../lib/api';
import { formatCountdown, formatTime } from '../lib/time';

const DEFAULT_HALF = 1200;

// Rebuilds all player stints from the match's subs list.
// Uses existing stints[0] to infer H1 starters (players who started at H1 min 0)
// and existing stints to infer H2 starters (who started at H2 min 0).
// This makes edits to subs propagate correctly into player times.
function rebuildStintsFromSubs(players, subs, halfDuration) {
  const startersH1 = new Set(
    players.filter((p) => (p.stints || []).some((s) => s.inHalf === 1 && s.inMinute === 0)).map((p) => p.id)
  );
  const startersH2 = new Set(
    players.filter((p) => (p.stints || []).some((s) => s.inHalf === 2 && s.inMinute === 0)).map((p) => p.id)
  );
  const byId = {};
  players.forEach((p) => { byId[p.id] = []; });
  startersH1.forEach((pid) => {
    if (byId[pid]) byId[pid].push({ inHalf: 1, inMinute: 0, outHalf: null, outMinute: null, duration: 0 });
  });
  const sorted = [...(subs || [])].sort((a, b) => (a.half - b.half) || (a.minute - b.minute));
  sorted.filter((s) => s.half === 1).forEach((s) => {
    const outArr = byId[s.out?.id]; const inArr = byId[s.in?.id];
    if (outArr) {
      const open = outArr.find((x) => x.outHalf === null);
      if (open) { open.outHalf = 1; open.outMinute = s.minute; open.duration = Math.max(0, s.minute - open.inMinute); }
    }
    if (inArr) inArr.push({ inHalf: 1, inMinute: s.minute, outHalf: null, outMinute: null, duration: 0 });
  });
  Object.values(byId).forEach((arr) => arr.forEach((s) => {
    if (s.outHalf === null) { s.outHalf = 1; s.outMinute = halfDuration; s.duration = Math.max(0, halfDuration - s.inMinute); }
  }));
  startersH2.forEach((pid) => {
    if (byId[pid]) byId[pid].push({ inHalf: 2, inMinute: 0, outHalf: null, outMinute: null, duration: 0 });
  });
  sorted.filter((s) => s.half === 2).forEach((s) => {
    const outArr = byId[s.out?.id]; const inArr = byId[s.in?.id];
    if (outArr) {
      const open = outArr.find((x) => x.outHalf === null);
      if (open) { open.outHalf = 2; open.outMinute = s.minute; open.duration = Math.max(0, s.minute - open.inMinute); }
    }
    if (inArr) inArr.push({ inHalf: 2, inMinute: s.minute, outHalf: null, outMinute: null, duration: 0 });
  });
  Object.values(byId).forEach((arr) => arr.forEach((s) => {
    if (s.outHalf === null) { s.outHalf = 2; s.outMinute = halfDuration; s.duration = Math.max(0, halfDuration - s.inMinute); }
  }));
  return players.map((p) => {
    const stints = byId[p.id] || [];
    const totalTime = stints.reduce((a, s) => a + (s.duration || 0), 0);
    return { ...p, stints, totalTime, stintsCount: stints.length };
  });
}

export default function EditMatch() {
  const navigate = useNavigate();
  const { id } = useParams();
  const sessionUser = getSessionUser();
  const [team, setTeam] = useState(null);
  const [match, setMatch] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sessionUser) {
      navigate('/');
      return;
    }
    (async () => {
      const [t, ms, cs, r] = await Promise.all([
        apiGetTeam(),
        apiListMatches(),
        apiListCompetitions(),
        apiListAthletes(),
      ]);
      if (t.ok) setTeam(t.team);
      if (cs.ok) setCompetitions(cs.competitions);
      if (r.ok) setRoster(r.athletes);
      if (ms.ok) {
        const m = ms.matches.find((x) => x.id === id);
        if (!m) {
          toast.error('JOGO NÃO ENCONTRADO');
          navigate('/estatisticas');
          return;
        }
        // Normalize event arrays: ensure every entry has a unique id.
        // Old matches (seeded or created before this fix) may have subs/goals/fouls/cards without an id,
        // which would break filter/patch-by-id operations.
        const uid = (kind, i) =>
          `${kind}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
        const withIds = (arr, kind) =>
          (arr || []).map((e, i) => (e && e.id ? e : { ...e, id: uid(kind, i) }));
        setMatch({
          ...m,
          subs: withIds(m.subs, 'sub'),
          goals: withIds(m.goals, 'goal'),
          fouls: withIds(m.fouls, 'foul'),
          cards: withIds(m.cards, 'card'),
        });
      }
      setLoading(false);
    })();
  }, [id, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Player picker list for event editors: athletes that participated in this match.
  const matchPlayers = useMemo(() => {
    if (!match) return [];
    return (match.players || []).map((p) => ({ id: p.id, number: p.number, name: p.name }));
  }, [match]);

  if (!sessionUser) return null;
  if (loading || !match || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin text-neon" size={32} />
      </div>
    );
  }

  const update = (patch) => setMatch((prev) => ({ ...prev, ...patch }));

  // Half duration (from match or fallback). Used by MinuteInput and stints rebuild.
  const halfDuration = (match && match.halfDurationSec) || DEFAULT_HALF;

  // When subs change, auto-rebuild every player's stints so times stay coherent.
  const updateSubs = (nextSubs) => {
    const nextPlayers = rebuildStintsFromSubs(match.players || [], nextSubs, halfDuration);
    setMatch((prev) => ({ ...prev, subs: nextSubs, players: nextPlayers }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      opponent: match.opponent,
      competition: match.competition || '',
      matchday: match.matchday || '',
      venue: match.venue || '',
      date: match.date,
      home_score: Number(match.home_score) || 0,
      away_score: Number(match.away_score) || 0,
      fouls_committed: Number(match.fouls_committed) || 0,
      fouls_suffered: Number(match.fouls_suffered) || 0,
      yellow_cards: Number(match.yellow_cards) || 0,
      red_cards: Number(match.red_cards) || 0,
      goals: match.goals || [],
      fouls: match.fouls || [],
      cards: match.cards || [],
      subs: match.subs || [],
      players: match.players || [],
    };
    const r = await apiUpdateMatch(id, payload);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error.toUpperCase());
      return;
    }
    toast.success('JOGO ATUALIZADO');
    navigate('/estatisticas');
  };

  // Event helpers — subs use dedicated updater so stints auto-sync
  const removeEvent = (kind, eventId) => {
    if (kind === 'subs') {
      updateSubs(match.subs.filter((e) => e.id !== eventId));
      return;
    }
    update({ [kind]: match[kind].filter((e) => e.id !== eventId) });
  };
  const patchEvent = (kind, eventId, patch) => {
    if (kind === 'subs') {
      updateSubs(match.subs.map((e) => (e.id === eventId ? { ...e, ...patch } : e)));
      return;
    }
    update({ [kind]: match[kind].map((e) => (e.id === eventId ? { ...e, ...patch } : e)) });
  };
  const addEvent = (kind, ev) => {
    const withId = { ...ev, id: `${kind}-${Date.now()}` };
    if (kind === 'subs') {
      updateSubs([...(match.subs || []), withId]);
      return;
    }
    update({ [kind]: [...(match[kind] || []), withId] });
  };

  // Stints editor helpers (per-player, edit each stint)
  const patchStint = (playerId, idx, patch) => {
    setMatch((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id !== playerId) return p;
        const stints = p.stints.map((s, i) => {
          if (i !== idx) return s;
          const next = { ...s, ...patch };
          // Recompute duration when inMinute/outMinute/half change
          if (next.outHalf !== null) {
            // Same-half duration: outMinute - inMinute (only valid when same half)
            next.duration = Math.max(0, (next.outMinute || 0) - (next.inMinute || 0));
          }
          return next;
        });
        const totalTime = stints.reduce((a, s) => a + (s.duration || 0), 0);
        return { ...p, stints, totalTime };
      }),
    }));
  };
  const removeStint = (playerId, idx) => {
    setMatch((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id !== playerId) return p;
        const stints = p.stints.filter((_, i) => i !== idx);
        const totalTime = stints.reduce((a, s) => a + (s.duration || 0), 0);
        return { ...p, stints, totalTime, stintsCount: stints.length };
      }),
    }));
  };
  const addStint = (playerId) => {
    setMatch((prev) => ({
      ...prev,
      players: prev.players.map((p) => {
        if (p.id !== playerId) return p;
        const stints = [...p.stints, { inHalf: 1, inMinute: 0, outHalf: 1, outMinute: 0, duration: 0 }];
        return { ...p, stints, stintsCount: stints.length };
      }),
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="border-b border-white/10 px-5 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-20">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden md:block border-l border-white/10 pl-6">
            <div className="text-[10px] tracking-label uppercase text-white/50">Editar Jogo</div>
            <div className="font-display text-base uppercase">
              {team.name} vs {match.opponent}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/estatisticas"
            className="text-xs uppercase tracking-label text-white/55 hover:text-neon flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Cancelar
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="save-match-btn"
            className="bg-neon text-black font-display text-xs uppercase tracking-wider px-4 py-2 rounded-sm hover:bg-[#bbdc0d] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Gravar
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 lg:px-8 py-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Metadata */}
        <section className="border border-white/10 bg-[#0f0f0f] rounded-sm p-4 lg:p-5">
          <div className="text-[10px] tracking-label uppercase text-neon mb-4">
            Metadados do Jogo
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Adversário *">
              <input
                data-testid="edit-opponent"
                value={match.opponent}
                onChange={(e) => update({ opponent: e.target.value.toUpperCase() })}
                className="input"
                maxLength={48}
              />
            </Field>
            <Field label="Competição">
              <select
                data-testid="edit-competition"
                value={match.competition || ''}
                onChange={(e) => update({ competition: e.target.value })}
                className="input"
              >
                <option value="">— Sem competição —</option>
                {competitions.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                {match.competition && !competitions.some((c) => c.name === match.competition) && (
                  <option value={match.competition}>{match.competition} (não listada)</option>
                )}
              </select>
            </Field>
            <Field label="Jornada">
              <input
                value={match.matchday || ''}
                onChange={(e) => update({ matchday: e.target.value })}
                className="input"
                maxLength={16}
              />
            </Field>
            <Field label="Pavilhão / Local">
              <input
                value={match.venue || ''}
                onChange={(e) => update({ venue: e.target.value })}
                className="input"
                maxLength={64}
              />
            </Field>
            <Field label="Data (ISO)">
              <input
                type="date"
                value={(match.date || '').slice(0, 10)}
                onChange={(e) => update({ date: e.target.value })}
                className="input"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Golos Casa">
                <input
                  type="number"
                  min={0}
                  value={match.home_score}
                  onChange={(e) => update({ home_score: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Golos Fora">
                <input
                  type="number"
                  min={0}
                  value={match.away_score}
                  onChange={(e) => update({ away_score: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
          </div>
          <p className="text-[10px] tracking-label uppercase text-white/40 mt-4">
            Ao editar eventos (golos, faltas, cartões) abaixo, os totais e as estatísticas por atleta são
            recalculados automaticamente ao gravar.
          </p>
        </section>

        {/* Goals */}
        <EventSection
          title="Golos"
          icon={Trophy}
          color="neon"
          count={(match.goals || []).length}
          onAdd={() =>
            addEvent('goals', {
              half: 1,
              minute: 0,
              type: 'home',
              scorerId: null, scorerNumber: null, scorerName: null,
              assistId: null, assistNumber: null, assistName: null,
            })
          }
        >
          {(match.goals || []).length === 0 && <Empty>Sem golos.</Empty>}
          {(match.goals || []).map((g) => (
            <div key={g.id} className="border border-white/10 bg-[#0a0a0a] rounded-sm p-3 grid grid-cols-1 md:grid-cols-[auto_auto_auto_1fr_1fr_auto] gap-2 items-center">
              <SelectHalf value={g.half} onChange={(v) => patchEvent('goals', g.id, { half: v })} />
              <MinuteInput value={g.minute} onChange={(v) => patchEvent('goals', g.id, { minute: v })} halfDuration={halfDuration} />
              <select
                value={g.type}
                onChange={(e) => patchEvent('goals', g.id, {
                  type: e.target.value,
                  ...(e.target.value === 'away' ? { scorerId: null, scorerNumber: null, scorerName: null, assistId: null, assistNumber: null, assistName: null } : {}),
                })}
                className="input"
              >
                <option value="home">A favor</option>
                <option value="away">Adversário</option>
              </select>
              {g.type === 'home' ? (
                <>
                  <PlayerSelect
                    label="Marcador"
                    players={matchPlayers}
                    value={g.scorerId}
                    onChange={(p) =>
                      patchEvent('goals', g.id, {
                        scorerId: p?.id || null,
                        scorerNumber: p?.number || null,
                        scorerName: p?.name || null,
                      })
                    }
                    allowNone
                  />
                  <PlayerSelect
                    label="Assist."
                    players={matchPlayers}
                    value={g.assistId}
                    onChange={(p) =>
                      patchEvent('goals', g.id, {
                        assistId: p?.id || null,
                        assistNumber: p?.number || null,
                        assistName: p?.name || null,
                      })
                    }
                    allowNone
                  />
                </>
              ) : (
                <div className="md:col-span-2 text-[10px] tracking-label uppercase text-white/40 italic">Golo do adversário</div>
              )}
              <RemoveBtn onClick={() => removeEvent('goals', g.id)} />
            </div>
          ))}
        </EventSection>

        {/* Fouls */}
        <EventSection
          title="Faltas"
          icon={AlertTriangle}
          color="orange"
          count={(match.fouls || []).length}
          onAdd={() =>
            addEvent('fouls', {
              half: 1, minute: 0, type: 'committed',
              playerId: null, playerNumber: null, playerName: null,
            })
          }
        >
          {(match.fouls || []).length === 0 && <Empty>Sem faltas.</Empty>}
          {(match.fouls || []).map((f) => (
            <div key={f.id} className="border border-white/10 bg-[#0a0a0a] rounded-sm p-3 grid grid-cols-1 md:grid-cols-[auto_auto_auto_1fr_auto] gap-2 items-center">
              <SelectHalf value={f.half} onChange={(v) => patchEvent('fouls', f.id, { half: v })} />
              <MinuteInput value={f.minute} onChange={(v) => patchEvent('fouls', f.id, { minute: v })} halfDuration={halfDuration} />
              <select
                value={f.type}
                onChange={(e) => patchEvent('fouls', f.id, { type: e.target.value })}
                className="input"
              >
                <option value="committed">Marcada</option>
                <option value="suffered">Sofrida</option>
              </select>
              <PlayerSelect
                label="Atleta"
                players={matchPlayers}
                value={f.playerId}
                onChange={(p) =>
                  patchEvent('fouls', f.id, {
                    playerId: p?.id || null,
                    playerNumber: p?.number || null,
                    playerName: p?.name || null,
                  })
                }
                allowNone
              />
              <RemoveBtn onClick={() => removeEvent('fouls', f.id)} />
            </div>
          ))}
        </EventSection>

        {/* Cards */}
        <EventSection
          title="Cartões"
          icon={Square}
          color="yellow"
          count={(match.cards || []).length}
          onAdd={() => {
            const first = matchPlayers[0];
            if (!first) {
              toast.error('SEM ATLETAS NESTE JOGO');
              return;
            }
            addEvent('cards', {
              half: 1, minute: 0, type: 'yellow',
              playerId: first.id, playerNumber: first.number, playerName: first.name,
            });
          }}
        >
          {(match.cards || []).length === 0 && <Empty>Sem cartões.</Empty>}
          {(match.cards || []).map((c) => (
            <div key={c.id} className="border border-white/10 bg-[#0a0a0a] rounded-sm p-3 grid grid-cols-1 md:grid-cols-[auto_auto_auto_1fr_auto] gap-2 items-center">
              <SelectHalf value={c.half} onChange={(v) => patchEvent('cards', c.id, { half: v })} />
              <MinuteInput value={c.minute} onChange={(v) => patchEvent('cards', c.id, { minute: v })} halfDuration={halfDuration} />
              <select
                value={c.type}
                onChange={(e) => patchEvent('cards', c.id, { type: e.target.value })}
                className="input"
              >
                <option value="yellow">Amarelo</option>
                <option value="red">Vermelho</option>
              </select>
              <PlayerSelect
                label="Atleta *"
                players={matchPlayers}
                value={c.playerId}
                onChange={(p) =>
                  patchEvent('cards', c.id, {
                    playerId: p?.id || null,
                    playerNumber: p?.number || null,
                    playerName: p?.name || null,
                  })
                }
              />
              <RemoveBtn onClick={() => removeEvent('cards', c.id)} />
            </div>
          ))}
        </EventSection>

        {/* Subs */}
        <EventSection
          title="Substituições"
          icon={ArrowLeftRight}
          color="neon"
          count={(match.subs || []).length}
          onAdd={() => {
            const first = matchPlayers[0];
            const second = matchPlayers[1];
            if (!first || !second) {
              toast.error('NECESSÁRIOS 2 ATLETAS');
              return;
            }
            addEvent('subs', {
              half: 1, minute: 0,
              out: { id: first.id, number: first.number, name: first.name },
              in: { id: second.id, number: second.number, name: second.name },
            });
          }}
        >
          {(match.subs || []).length === 0 && <Empty>Sem substituições.</Empty>}
          {(match.subs || []).map((s) => (
            <div key={s.id || `${s.half}-${s.minute}-${s.out.id}-${s.in.id}`} className="border border-white/10 bg-[#0a0a0a] rounded-sm p-3 grid grid-cols-1 md:grid-cols-[auto_auto_1fr_1fr_auto] gap-2 items-center">
              <SelectHalf value={s.half} onChange={(v) => patchEvent('subs', s.id, { half: v })} />
              <MinuteInput value={s.minute} onChange={(v) => patchEvent('subs', s.id, { minute: v })} halfDuration={halfDuration} />
              <PlayerSelect
                label="Sai"
                players={matchPlayers}
                value={s.out?.id}
                onChange={(p) =>
                  patchEvent('subs', s.id, { out: { id: p.id, number: p.number, name: p.name } })
                }
              />
              <PlayerSelect
                label="Entra"
                players={matchPlayers}
                value={s.in?.id}
                onChange={(p) =>
                  patchEvent('subs', s.id, { in: { id: p.id, number: p.number, name: p.name } })
                }
              />
              <RemoveBtn onClick={() => removeEvent('subs', s.id)} />
            </div>
          ))}
        </EventSection>

        {/* Player Stints (times / parciais) */}
        <section className="border border-white/10 bg-[#0f0f0f] rounded-sm p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-[10px] tracking-label uppercase text-neon">
                Tempos & Parciais · {(match.players || []).filter(p => (p.stints || []).length).length} atletas com stints
              </div>
            </div>
            <button
              type="button"
              data-testid="rebuild-stints-btn"
              onClick={() => {
                const nextPlayers = rebuildStintsFromSubs(match.players || [], match.subs || [], halfDuration);
                setMatch((prev) => ({ ...prev, players: nextPlayers }));
                toast.success('TEMPOS RECALCULADOS');
              }}
              className="text-[10px] tracking-label uppercase text-white/55 hover:text-neon border border-white/10 hover:border-neon px-3 py-1.5 rounded-sm"
              title="Reconstruir todos os stints a partir da lista de substituições"
            >
              ↻ Recalcular pelos subs
            </button>
          </div>
          <p className="text-[10px] tracking-label uppercase text-white/40 mb-3">
            Edita as entradas/saídas de cada atleta. Ao gravar, o tempo total é a soma dos parciais.
          </p>
          <div className="space-y-3">
            {(match.players || []).map((p) => (
              <div key={p.id} data-testid={`stints-player-${p.id}`} className="border border-white/10 rounded-sm p-3 bg-[#0a0a0a]">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/10 text-white/80 font-display text-sm tabular-nums">
                      {p.number}
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wide">{p.name}</div>
                      <div className="text-[9px] tracking-label uppercase text-white/40">
                        {p.position} · Total <span className="text-neon">{formatTime(p.totalTime || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addStint(p.id)}
                    className="text-[10px] tracking-label uppercase text-white/55 hover:text-neon inline-flex items-center gap-1"
                  >
                    <Plus size={11} /> Adicionar parcial
                  </button>
                </div>
                {(p.stints || []).length === 0 ? (
                  <div className="text-xs text-white/40 italic">Sem parciais.</div>
                ) : (
                  <div className="space-y-1.5">
                    {p.stints.map((s, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-2 md:grid-cols-[auto_auto_auto_auto_auto_1fr_auto] gap-2 items-center text-[11px]"
                      >
                        <select
                          value={s.inHalf}
                          onChange={(e) => patchStint(p.id, i, { inHalf: Number(e.target.value) })}
                          className="input md:w-20"
                          title="Parte de entrada"
                        >
                          <option value={1}>1.ª P.</option>
                          <option value={2}>2.ª P.</option>
                        </select>
                        <MinuteInput
                          value={s.inMinute}
                          onChange={(v) => patchStint(p.id, i, { inMinute: v })}
                          halfDuration={halfDuration}
                        />
                        <span className="text-white/40 text-center">→</span>
                        <select
                          value={s.outHalf ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            patchStint(p.id, i, { outHalf: v === '' ? null : Number(v) });
                          }}
                          className="input md:w-20"
                          title="Parte de saída"
                        >
                          <option value="">Ainda em campo</option>
                          <option value={1}>1.ª P.</option>
                          <option value={2}>2.ª P.</option>
                        </select>
                        <MinuteInput
                          value={s.outMinute || 0}
                          onChange={(v) => patchStint(p.id, i, { outMinute: v })}
                          halfDuration={halfDuration}
                        />
                        <div className="text-[10px] tracking-label uppercase text-white/45">
                          Dur.: <span className="text-neon font-mono">{formatTime(s.duration || 0)}</span>
                        </div>
                        <RemoveBtn onClick={() => removeStint(p.id, i)} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <style>{`
        .input {
          width: 100%;
          background: #141414;
          border: 1px solid rgba(255,255,255,0.10);
          padding: 8px 10px;
          font-size: 12px;
          border-radius: 2px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          outline: none;
        }
        .input:focus { border-color: #d4ff1a; background: #181818; }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] tracking-label uppercase text-white/60 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function EventSection({ title, icon: Icon, color, count, onAdd, children }) {
  const clr =
    color === 'orange' ? 'text-orange-400' :
    color === 'yellow' ? 'text-yellow-300' :
    color === 'red'    ? 'text-red-400' :
    'text-neon';
  return (
    <section className="border border-white/10 bg-[#0f0f0f] rounded-sm p-4 lg:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className={clr} />
          <div className="text-[10px] tracking-label uppercase text-neon">{title} · {count}</div>
        </div>
        <button
          onClick={onAdd}
          className="text-[10px] tracking-label uppercase text-white/55 hover:text-neon flex items-center gap-1.5"
        >
          <Plus size={12} /> Adicionar
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <div className="text-xs text-white/40 italic">{children}</div>;
}

function SelectHalf({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="input md:w-24"
      title="Parte"
    >
      <option value={1}>1.ª P.</option>
      <option value={2}>2.ª P.</option>
    </select>
  );
}

function MinuteInput({ value, onChange, halfDuration = DEFAULT_HALF }) {
  // Store as elapsed seconds. Display as countdown (mm:ss remaining).
  const remaining = Math.max(0, halfDuration - (value || 0));
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const [text, setText] = useState(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`);
  useEffect(() => {
    const r = Math.max(0, halfDuration - (value || 0));
    setText(`${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`);
  }, [value, halfDuration]);
  const commit = () => {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(text.trim());
    if (!m) {
      // Invalid text — reset display to canonical value
      const r = Math.max(0, halfDuration - (value || 0));
      setText(`${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`);
      return;
    }
    const rem = Math.min(halfDuration, Math.max(0, Number(m[1]) * 60 + Number(m[2])));
    const nextElapsed = halfDuration - rem;
    // Always resync text to the clamped/canonical value so user sees the effective value
    setText(`${String(Math.floor(rem / 60)).padStart(2, '0')}:${String(rem % 60).padStart(2, '0')}`);
    onChange(nextElapsed);
  };
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      className="input md:w-24"
      title="Minuto (contagem decrescente, mm:ss)"
      placeholder="20:00"
    />
  );
}

function PlayerSelect({ label, players, value, onChange, allowNone = false }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return onChange(null);
        const p = players.find((x) => x.id === v);
        if (p) onChange(p);
      }}
      className="input"
      title={label}
    >
      {allowNone && <option value="">— {label} (nenhum) —</option>}
      {!allowNone && <option value="" disabled>— {label} —</option>}
      {players.map((p) => (
        <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
      ))}
    </select>
  );
}

function RemoveBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-white/40 hover:text-red-400 p-1.5 md:justify-self-end"
      title="Remover"
    >
      <Trash2 size={14} />
    </button>
  );
}
