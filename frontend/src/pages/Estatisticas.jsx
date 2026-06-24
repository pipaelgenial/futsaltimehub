import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Trash2, ChevronDown, ChevronUp, Trophy, Calendar, Users, ArrowRight, AlertTriangle, Square } from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { getMatches, deleteMatch, getTeam } from '../lib/storage';
import { formatTime, formatTimeLong, formatCountdown } from '../lib/time';
import { toast } from 'sonner';

export default function Estatisticas() {
  const navigate = useNavigate();
  const team = getTeam();
  const [matches, setMatches] = useState(getMatches());
  const [expanded, setExpanded] = useState(matches[0]?.id || null);

  const aggregate = useMemo(() => {
    const stats = {};
    matches.forEach((m) => {
      m.players.forEach((p) => {
        if (!stats[p.id]) {
          stats[p.id] = {
            id: p.id, name: p.name, number: p.number, position: p.position,
            totalTime: 0, games: 0, scored: 0, goalsFor: 0, goalsAgainst: 0,
            foulsCommitted: 0, yellowCards: 0, redCards: 0,
          };
        }
        stats[p.id].totalTime += p.totalTime || 0;
        stats[p.id].scored += p.scored || 0;
        stats[p.id].goalsFor += p.goalsFor || 0;
        stats[p.id].goalsAgainst += p.goalsAgainst || 0;
        stats[p.id].foulsCommitted += p.foulsCommitted || 0;
        stats[p.id].yellowCards += p.yellowCards || 0;
        stats[p.id].redCards += p.redCards || 0;
        if ((p.totalTime || 0) > 0) stats[p.id].games += 1;
      });
    });
    return Object.values(stats)
      .map((s) => ({ ...s, plusMinus: s.goalsFor - s.goalsAgainst }))
      .sort((a, b) => b.totalTime - a.totalTime);
  }, [matches]);

  if (!team) {
    navigate('/team-setup');
    return null;
  }

  const handleDelete = (id) => {
    if (!window.confirm('Eliminar este jogo definitivamente?')) return;
    deleteMatch(id);
    setMatches(getMatches());
    toast.success('JOGO ELIMINADO');
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="border-b border-white/10 px-5 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-20">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden md:block border-l border-white/10 pl-6">
            <div className="text-[10px] tracking-label uppercase text-white/50">Estatísticas</div>
            <div className="font-display text-base uppercase">{team.name}</div>
          </div>
        </div>
        <Link
          to="/dashboard"
          className="text-xs uppercase tracking-label text-white/55 hover:text-neon flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </header>

      <main className="flex-1 px-5 lg:px-8 py-8 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <div className="text-neon text-[11px] tracking-label uppercase mb-2">Histórico</div>
          <h1 className="font-display text-4xl lg:text-5xl uppercase leading-none">
            Jogos <span className="text-neon">·</span> {matches.length}
          </h1>
          <p className="text-sm text-white/55 mt-3">
            Histórico completo de partidas, minutos por atleta e substituições.
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-sm p-14 text-center">
            <BarChart3 size={40} className="mx-auto text-white/30 mb-4" />
            <div className="font-display text-2xl uppercase mb-2">Sem jogos registados</div>
            <div className="text-sm text-white/50 mb-6">
              Quando terminares um jogo no monitor, este aparecerá aqui automaticamente.
            </div>
            <Link
              to="/monitor"
              className="inline-flex items-center gap-2 bg-neon text-black font-display text-base uppercase tracking-wider px-6 py-3 rounded-sm hover:bg-[#bbdc0d] transition-colors"
            >
              Criar Jogo <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            {/* Aggregate per athlete */}
            <section className="mb-10">
              <h2 className="font-display text-2xl uppercase mb-4 flex items-center gap-3">
                <span className="w-7 h-7 bg-neon text-black flex items-center justify-center rounded-sm">
                  <Trophy size={14} />
                </span>
                Atletas · Minutos, Golos & Disciplina (Total)
              </h2>
              <div className="border border-white/10 rounded-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="bg-[#0f0f0f] text-[10px] tracking-label uppercase text-white/50">
                    <tr>
                      <th className="text-left px-4 py-3 w-16">#</th>
                      <th className="text-left px-4 py-3">Atleta</th>
                      <th className="text-left px-4 py-3 w-20">Pos.</th>
                      <th className="text-right px-4 py-3 w-20">Jogos</th>
                      <th className="text-right px-4 py-3 w-28">Minutos</th>
                      <th className="text-right px-4 py-3 w-20" title="Golos marcados">G</th>
                      <th className="text-right px-4 py-3 w-20" title="Golos a favor enquanto em campo">GF</th>
                      <th className="text-right px-4 py-3 w-20" title="Golos sofridos enquanto em campo">GS</th>
                      <th className="text-right px-4 py-3 w-16" title="Faltas cometidas">F</th>
                      <th className="text-right px-4 py-3 w-16" title="Cartões amarelos">CA</th>
                      <th className="text-right px-4 py-3 w-16" title="Cartões vermelhos">CV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregate.map((a) => (
                      <tr key={a.id} className="border-t border-white/5 bg-[#0a0a0a] hover:bg-[#111]">
                        <td className="px-4 py-3">
                          <span className="w-7 h-7 bg-white/10 text-white rounded-sm flex items-center justify-center text-xs font-mono">
                            {a.number}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold uppercase">{a.name}</td>
                        <td className="px-4 py-3 text-white/55 text-xs uppercase tracking-label">{a.position}</td>
                        <td className="px-4 py-3 text-right font-mono">{a.games}</td>
                        <td className="px-4 py-3 text-right font-mono text-neon">{formatTimeLong(a.totalTime)}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {a.scored > 0 ? <span className="text-neon">{a.scored}</span> : <span className="text-white/30">0</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-neon/80">{a.goalsFor}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-400/80">{a.goalsAgainst}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {a.foulsCommitted > 0 ? <span className="text-orange-400">{a.foulsCommitted}</span> : <span className="text-white/30">0</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {a.yellowCards > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono text-yellow-300">
                              <span className="inline-block w-2.5 h-3.5 bg-yellow-400 rounded-[1px]" />
                              {a.yellowCards}
                            </span>
                          ) : <span className="text-white/30 font-mono">0</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {a.redCards > 0 ? (
                            <span className="inline-flex items-center gap-1 font-mono text-red-400">
                              <span className="inline-block w-2.5 h-3.5 bg-red-500 rounded-[1px]" />
                              {a.redCards}
                            </span>
                          ) : <span className="text-white/30 font-mono">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] tracking-label uppercase text-white/40 mt-2">
                G = golos marcados · GF = golos a favor em campo · GS = golos sofridos em campo · F = faltas · CA/CV = cartões
              </div>
            </section>

            {/* Per-match list */}
            <section>
              <h2 className="font-display text-2xl uppercase mb-4 flex items-center gap-3">
                <span className="w-7 h-7 bg-neon text-black flex items-center justify-center rounded-sm">
                  <Calendar size={14} />
                </span>
                Jogos Registados
              </h2>
              <div className="space-y-3">
                {matches.map((m) => {
                  const isOpen = expanded === m.id;
                  return (
                    <div key={m.id} className="border border-white/10 bg-[#0f0f0f] rounded-sm overflow-hidden">
                      <button
                        onClick={() => setExpanded(isOpen ? null : m.id)}
                        className="w-full p-4 lg:p-5 flex items-center justify-between gap-4 hover:bg-[#141414] transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <div className="font-display text-xl lg:text-2xl uppercase truncate">
                              {team.name} <span className="text-white/40">vs</span> {m.opponent}
                            </div>
                            {(typeof m.homeScore === 'number') && (
                              <span className="font-display text-xl lg:text-2xl tabular-nums">
                                <span className={m.homeScore > m.awayScore ? 'text-neon' : m.homeScore < m.awayScore ? 'text-white/70' : 'text-white'}>
                                  {m.homeScore}
                                </span>
                                <span className="text-white/30 mx-2">·</span>
                                <span className={m.awayScore > m.homeScore ? 'text-red-400' : 'text-white/70'}>
                                  {m.awayScore}
                                </span>
                              </span>
                            )}
                            {(typeof m.homeScore === 'number') && (
                              <span className={`text-[10px] tracking-label uppercase px-2 py-1 rounded-sm ${
                                m.homeScore > m.awayScore ? 'bg-neon/15 text-neon' :
                                m.homeScore < m.awayScore ? 'bg-red-500/15 text-red-400' :
                                'bg-white/10 text-white/60'
                              }`}>
                                {m.homeScore > m.awayScore ? 'Vitória' : m.homeScore < m.awayScore ? 'Derrota' : 'Empate'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] tracking-label uppercase text-white/50">
                            {m.competition && <>{m.competition} · </>}
                            {m.matchday && <>Jornada {m.matchday} · </>}
                            {new Date(m.date).toLocaleDateString('pt-PT', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}{' '}
                            · {m.players.length} atletas · {(m.goals || []).length} golos · {(m.fouls || []).length} faltas · {(m.cards || []).length} cartões · {m.subs.length} substituições
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <div className="text-[10px] tracking-label uppercase text-white/50">Duração</div>
                            <div className="font-mono text-neon">{formatTimeLong(m.totalDuration || 0)}</div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(m.id);
                            }}
                            className="text-white/40 hover:text-red-400 p-2"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                          {isOpen ? (
                            <ChevronUp size={18} className="text-white/40" />
                          ) : (
                            <ChevronDown size={18} className="text-white/40" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-white/10 p-4 lg:p-5 space-y-5">
                          {/* Goals timeline */}
                          {(m.goals || []).length > 0 && (
                            <div>
                              <div className="text-[10px] tracking-label uppercase text-neon mb-2 flex items-center gap-2">
                                <Trophy size={12} /> Marcador ({(m.goals || []).length} golos)
                              </div>
                              <div className="space-y-1">
                                {[...m.goals].reverse().map((g) => (
                                  <div key={g.id} className="text-xs flex items-center gap-3">
                                    <span className="font-mono text-white/50 w-16">
                                      {g.half}.ª {formatCountdown(g.minute)}
                                    </span>
                                    {g.type === 'home' ? (
                                      <>
                                        <span className="text-neon font-semibold uppercase w-24 truncate">{team.name}</span>
                                        <span className="flex-1">
                                          {g.scorerName ? (
                                            <span className="inline-flex items-center gap-2">
                                              <span className="w-5 h-5 bg-neon text-black rounded-sm flex items-center justify-center text-[10px] font-mono font-bold">
                                                {g.scorerNumber}
                                              </span>
                                              {g.scorerName}
                                            </span>
                                          ) : (
                                            <span className="text-white/40 italic">Sem marcador</span>
                                          )}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-red-400 font-semibold uppercase w-24 truncate">{m.opponent}</span>
                                        <span className="flex-1 text-white/40 italic">Golo Adversário</span>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fouls summary */}
                          {((m.fouls || []).length > 0 || (typeof m.foulsCommitted === 'number' && m.foulsCommitted > 0)) && (
                            <div>
                              <div className="text-[10px] tracking-label uppercase text-orange-400 mb-2 flex items-center gap-2">
                                <AlertTriangle size={12} /> Faltas — Marcadas: {m.foulsCommitted ?? 0} · Sofridas: {m.foulsSuffered ?? 0}
                              </div>
                              {(m.fouls || []).length > 0 && (
                                <div className="space-y-1">
                                  {[...(m.fouls || [])].reverse().map((f) => (
                                    <div key={f.id} className="text-xs flex items-center gap-3">
                                      <span className="font-mono text-white/50 w-16">{f.half}.ª {formatCountdown(f.minute)}</span>
                                      {f.type === 'committed' ? (
                                        <span className="text-orange-400 uppercase font-semibold w-20">Marcada</span>
                                      ) : (
                                        <span className="text-blue-300 uppercase font-semibold w-20">Sofrida</span>
                                      )}
                                      <span className="flex-1">
                                        {f.playerName ? (
                                          <span className="inline-flex items-center gap-2">
                                            <span className="w-5 h-5 bg-orange-500/20 text-orange-300 rounded-sm flex items-center justify-center text-[10px] font-mono">
                                              {f.playerNumber}
                                            </span>
                                            {f.playerName}
                                          </span>
                                        ) : (
                                          <span className="text-white/40 italic">
                                            {f.type === 'committed' ? 'Sem autor' : 'A favor da equipa'}
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Cards summary */}
                          {(m.cards || []).length > 0 && (
                            <div>
                              <div className="text-[10px] tracking-label uppercase text-white/55 mb-2 flex items-center gap-2">
                                <Square size={12} /> Cartões — Amarelos: <span className="text-yellow-300">{m.yellowCards ?? 0}</span> · Vermelhos: <span className="text-red-400">{m.redCards ?? 0}</span>
                              </div>
                              <div className="space-y-1">
                                {[...m.cards].reverse().map((c) => (
                                  <div key={c.id} className="text-xs flex items-center gap-3">
                                    <span className="font-mono text-white/50 w-16">{c.half}.ª {formatCountdown(c.minute)}</span>
                                    <span className={`inline-block w-3 h-4 rounded-[1px] ${c.type === 'red' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                                    <span className={`uppercase font-semibold w-20 ${c.type === 'red' ? 'text-red-400' : 'text-yellow-300'}`}>
                                      {c.type === 'red' ? 'Vermelho' : 'Amarelo'}
                                    </span>
                                    <span className="inline-flex items-center gap-2 flex-1">
                                      <span className="w-5 h-5 bg-white/10 rounded-sm flex items-center justify-center text-[10px] font-mono">
                                        {c.playerNumber}
                                      </span>
                                      {c.playerName}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Players summary with +/- and parciais */}
                          <div>
                            <div className="text-[10px] tracking-label uppercase text-neon mb-2 flex items-center gap-2">
                              <Users size={12} /> Atletas neste Jogo · Tempos & Parciais
                            </div>
                            <div className="space-y-2">
                              {[...m.players]
                                .sort((a, b) => b.totalTime - a.totalTime)
                                .map((p) => {
                                  const gf = p.goalsFor || 0;
                                  const gs = p.goalsAgainst || 0;
                                  const stints = p.stints || [];
                                  return (
                                    <div
                                      key={p.id}
                                      className="bg-black/40 border border-white/5 rounded-sm px-3 py-2.5"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 bg-white/10 rounded-sm flex items-center justify-center text-xs font-mono shrink-0">
                                          {p.number}
                                        </span>
                                        <span className={`flex-1 min-w-0 text-xs uppercase tracking-wide truncate ${p.sentOff ? 'text-red-400' : ''}`}>
                                          {p.name}
                                          {p.sentOff && <span className="ml-2 text-[9px] text-red-400">EXPULSO</span>}
                                        </span>
                                        {p.scored > 0 && (
                                          <span className="text-[10px] tracking-label uppercase text-neon" title="Golos marcados">
                                            ⚽{p.scored}
                                          </span>
                                        )}
                                        {p.yellowCards > 0 && (
                                          <span className="inline-flex items-center gap-0.5" title="Cartões amarelos">
                                            <span className="inline-block w-2 h-2.5 bg-yellow-400 rounded-[1px]" />
                                            <span className="text-[10px] font-mono text-yellow-300">{p.yellowCards}</span>
                                          </span>
                                        )}
                                        {p.redCards > 0 && (
                                          <span className="inline-flex items-center gap-0.5" title="Cartões vermelhos">
                                            <span className="inline-block w-2 h-2.5 bg-red-500 rounded-[1px]" />
                                            <span className="text-[10px] font-mono text-red-400">{p.redCards}</span>
                                          </span>
                                        )}
                                        <span className="font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded-sm bg-neon/15 text-neon" title="Golos a favor em campo">
                                          GF {gf}
                                        </span>
                                        <span className="font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded-sm bg-red-500/15 text-red-400" title="Golos sofridos em campo">
                                          GS {gs}
                                        </span>
                                        <span className="font-mono text-sm text-neon tabular-nums shrink-0">
                                          {formatTime(p.totalTime)}
                                        </span>
                                      </div>

                                      {/* Parciais (stints) */}
                                      {stints.length > 0 && (
                                        <div className="mt-2 ml-10 flex flex-wrap gap-1.5">
                                          {stints.map((s, idx) => {
                                            const isOpen = s.outHalf === null;
                                            const dur = s.duration || 0;
                                            return (
                                              <span
                                                key={idx}
                                                className="inline-flex items-center gap-1.5 text-[10px] bg-black/40 border border-white/5 rounded-sm px-2 py-1"
                                                title={`Parcial ${idx + 1}`}
                                              >
                                                <span className="text-white/40 tracking-label uppercase">P{idx + 1}</span>
                                                <span className="font-mono text-white/70">
                                                  {s.inHalf}.ª {formatCountdown(s.inMinute)}
                                                </span>
                                                <span className="text-white/30">→</span>
                                                <span className="font-mono text-white/70">
                                                  {isOpen ? '—' : `${s.outHalf}.ª ${formatCountdown(s.outMinute)}`}
                                                </span>
                                                <span className="font-mono text-neon">
                                                  {formatTime(dur)}
                                                </span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                      {stints.length === 0 && (
                                        <div className="mt-1 ml-10 text-[10px] text-white/30 italic">Sem participação</div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          </div>

                          {/* Subs */}
                          {m.subs.length > 0 && (
                            <div>
                              <div className="text-[10px] tracking-label uppercase text-neon mb-2">
                                Substituições ({m.subs.length})
                              </div>
                              <div className="space-y-1">
                                {m.subs.map((s, i) => (
                                  <div key={i} className="text-xs flex items-center gap-3 text-white/70">
                                    <span className="font-mono text-white/50 w-14">{s.half}.ª {formatCountdown(s.minute)}</span>
                                    <span className="text-red-400">↓ {s.out.number} {s.out.name}</span>
                                    <span className="text-white/30">→</span>
                                    <span className="text-neon">↑ {s.in.number} {s.in.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
