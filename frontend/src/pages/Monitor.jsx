import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play, Pause, RotateCcw, ArrowLeftRight, History, ChevronRight,
  Timer as TimerIcon, Users, Trophy, X, ArrowRight, ArrowLeft, Save,
  Plus, Check, AlertTriangle,
} from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import {
  getTeam, getRoster, getActiveMatch, setActiveMatch, clearActiveMatch,
  saveMatch, HALF_DURATION,
} from '../lib/storage';
import { formatTime, formatTimeLong } from '../lib/time';
import { toast } from 'sonner';

export default function Monitor() {
  const navigate = useNavigate();
  const team = getTeam();
  const roster = getRoster();
  const [activeMatch, setActive] = useState(getActiveMatch());

  if (!team) {
    navigate('/team-setup');
    return null;
  }

  if (!activeMatch) {
    return <CreateMatchForm team={team} roster={roster} onCreated={(m) => setActive(m)} />;
  }

  return <LiveMatch team={team} match={activeMatch} onEnd={() => setActive(null)} />;
}

/* ====================== CREATE MATCH FORM ====================== */

function CreateMatchForm({ team, roster, onCreated }) {
  const navigate = useNavigate();
  const [opponent, setOpponent] = useState('');
  const [competition, setCompetition] = useState('');
  const [matchday, setMatchday] = useState('');
  const [venue, setVenue] = useState('');
  // assignment: { [playerId]: 'court' | 'bench' | 'out' }
  const [assignment, setAssignment] = useState({});

  const courtCount = Object.values(assignment).filter((v) => v === 'court').length;
  const benchCount = Object.values(assignment).filter((v) => v === 'bench').length;

  const cycle = (id) => {
    setAssignment((prev) => {
      const cur = prev[id] || 'out';
      let next = 'out';
      if (cur === 'out') next = 'court';
      else if (cur === 'court') next = 'bench';
      else next = 'out';
      if (next === 'court' && courtCount >= 5 && cur !== 'court') {
        toast.error('MÁXIMO 5 EM CAMPO');
        return prev;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleStart = () => {
    if (!opponent.trim()) {
      toast.error('INSERE A EQUIPA ADVERSÁRIA');
      return;
    }
    if (courtCount !== 5) {
      toast.error('ESCOLHE EXATAMENTE 5 ATLETAS EM CAMPO');
      return;
    }

    const selected = roster
      .filter((p) => assignment[p.id] === 'court' || assignment[p.id] === 'bench')
      .map((p) => ({
        ...p,
        onCourt: assignment[p.id] === 'court',
        totalTime: 0,
        currentStint: 0,
        stintsCount: assignment[p.id] === 'court' ? 1 : 0,
        lastStintTime: 0,
      }));

    const match = {
      id: Date.now(),
      opponent: opponent.trim().toUpperCase(),
      competition: competition.trim().toUpperCase(),
      matchday: matchday.trim(),
      venue: venue.trim(),
      date: new Date().toISOString(),
      players: selected,
      subs: [],
      half: 1,
      elapsedHalf: 0,
      running: false,
      ended: false,
    };
    setActiveMatch(match);
    onCreated(match);
    toast.success('JOGO CRIADO');
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="border-b border-white/10 px-5 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-20">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden md:block border-l border-white/10 pl-6">
            <div className="text-[10px] tracking-label uppercase text-white/50">Monitor</div>
            <div className="font-display text-base uppercase">Criar Jogo</div>
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
          <div className="text-neon text-[11px] tracking-label uppercase mb-2">Configuração</div>
          <h1 className="font-display text-4xl lg:text-5xl uppercase leading-none">
            Criar <span className="text-neon">Jogo</span>
          </h1>
          <p className="text-sm text-white/55 mt-3">
            Define o adversário, a competição e seleciona os atletas para esta partida.
          </p>
        </div>

        {roster.length < 5 ? (
          <div className="border border-yellow-500/40 bg-yellow-500/5 rounded-sm p-5 flex gap-4">
            <AlertTriangle className="text-yellow-400 shrink-0" size={22} />
            <div>
              <div className="font-display text-lg uppercase mb-1">Plantel insuficiente</div>
              <div className="text-sm text-white/70 mb-3">
                Precisas de pelo menos 5 atletas no plantel para iniciar um jogo. Atualmente tens {roster.length}.
              </div>
              <Link
                to="/plantel"
                className="inline-flex items-center gap-2 bg-neon text-black font-display text-sm uppercase tracking-wider px-4 py-2 rounded-sm hover:bg-[#bbdc0d]"
              >
                <Plus size={14} /> Adicionar Atletas
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
            {/* Match info form */}
            <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-5 h-fit">
              <div className="text-[10px] tracking-label uppercase text-neon mb-4">
                Informações do Jogo
              </div>
              <div className="space-y-4">
                <Field label="Equipa Adversária *" value={opponent} onChange={setOpponent} placeholder="BENFICA" upper />
                <Field label="Competição" value={competition} onChange={setCompetition} placeholder="LIGA PLACARD" upper />
                <Field label="Jornada (n.º)" value={matchday} onChange={setMatchday} placeholder="14" type="number" />
                <Field label="Pavilhão / Local" value={venue} onChange={setVenue} placeholder="Pavilhão João Rocha" />
              </div>

              <div className="border-t border-white/10 mt-5 pt-4 grid grid-cols-2 gap-3 text-center">
                <div className="bg-black/40 rounded-sm py-3">
                  <div className="text-[9px] tracking-label uppercase text-white/50">Em Campo</div>
                  <div className={`font-display text-3xl ${courtCount === 5 ? 'text-neon' : 'text-white'}`}>
                    {courtCount}<span className="text-white/30 text-lg">/5</span>
                  </div>
                </div>
                <div className="bg-black/40 rounded-sm py-3">
                  <div className="text-[9px] tracking-label uppercase text-white/50">No Banco</div>
                  <div className="font-display text-3xl text-white">{benchCount}</div>
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={courtCount !== 5 || !opponent.trim()}
                className="w-full mt-4 bg-neon text-black font-display text-lg uppercase tracking-wider py-3 rounded-sm hover:bg-[#bbdc0d] transition-all flex items-center justify-center gap-2 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed"
              >
                <Play size={18} /> Iniciar Jogo
              </button>
            </div>

            {/* Athlete selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] tracking-label uppercase text-white/55">
                  Plantel ({roster.length}) · Clica para definir
                </div>
                <div className="text-[10px] tracking-label uppercase flex gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-neon rounded-full" /> Campo
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-blue-400 rounded-full" /> Banco
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-white/20 rounded-full" /> Fora
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[...roster]
                  .sort((a, b) => a.number - b.number)
                  .map((p) => {
                    const state = assignment[p.id] || 'out';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => cycle(p.id)}
                        className={`text-left p-3 rounded-sm border transition-all flex items-center gap-3 ${
                          state === 'court'
                            ? 'border-neon bg-[#161b05]'
                            : state === 'bench'
                            ? 'border-blue-400/50 bg-blue-500/5'
                            : 'border-white/10 bg-[#0a0a0a] hover:border-white/25'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 flex items-center justify-center rounded-sm font-display text-lg ${
                            state === 'court'
                              ? 'bg-neon text-black'
                              : state === 'bench'
                              ? 'bg-blue-500/30 text-blue-200'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {p.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold uppercase truncate">{p.name}</div>
                          <div className="text-[10px] tracking-label uppercase text-white/45">
                            {p.position}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] tracking-label uppercase shrink-0 ${
                            state === 'court'
                              ? 'text-neon'
                              : state === 'bench'
                              ? 'text-blue-300'
                              : 'text-white/30'
                          }`}
                        >
                          {state === 'court' ? 'Campo' : state === 'bench' ? 'Banco' : 'Fora'}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', upper = false }) {
  return (
    <div>
      <label className="block text-[10px] tracking-label uppercase text-white/55 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-[#141414] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-neon rounded-sm ${
          upper ? 'uppercase tracking-wide' : ''
        }`}
      />
    </div>
  );
}

/* ====================== LIVE MATCH ====================== */

function LiveMatch({ team, match, onEnd }) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState(match.players);
  const [subs, setSubs] = useState(match.subs);
  const [half, setHalf] = useState(match.half);
  const [elapsedHalf, setElapsedHalf] = useState(match.elapsedHalf);
  const [running, setRunning] = useState(false);
  const [ended, setEnded] = useState(match.ended || false);
  const [selectedOut, setSelectedOut] = useState(null);
  const [selectedIn, setSelectedIn] = useState(null);
  const tickRef = useRef(null);

  // Persist on state change
  useEffect(() => {
    setActiveMatch({ ...match, players, subs, half, elapsedHalf, ended });
  }, [players, subs, half, elapsedHalf, ended]); // eslint-disable-line

  // Tick
  useEffect(() => {
    if (!running || ended) return;
    tickRef.current = setInterval(() => {
      setElapsedHalf((t) => {
        if (t + 1 >= HALF_DURATION) {
          // half ended automatically
          clearInterval(tickRef.current);
          setRunning(false);
          toast.message(`FIM DA ${half}.ª PARTE`, {
            description: half === 1 ? 'Pronto para iniciar a 2.ª parte.' : 'Jogo terminado. Pode gravar.',
          });
          if (half === 2) setEnded(true);
          return HALF_DURATION;
        }
        return t + 1;
      });
      setPlayers((prev) =>
        prev.map((p) =>
          p.onCourt
            ? { ...p, totalTime: p.totalTime + 1, currentStint: p.currentStint + 1 }
            : p
        )
      );
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running, ended, half]);

  const onCourtPlayers = useMemo(() => players.filter((p) => p.onCourt), [players]);
  const benchPlayers = useMemo(() => players.filter((p) => !p.onCourt), [players]);
  const totalMatchTime = useMemo(
    () => players.reduce((acc, p) => acc + p.totalTime, 0),
    [players]
  );
  const remaining = HALF_DURATION - elapsedHalf;
  const halfFinished = remaining <= 0;
  const isLast30 = remaining > 0 && remaining <= 30;

  const toggleClock = () => {
    if (ended) return;
    if (halfFinished) {
      toast.error(`${half}.ª PARTE TERMINADA`);
      return;
    }
    setRunning((r) => !r);
  };

  const goNextHalf = () => {
    if (half === 1) {
      if (!window.confirm('Terminar a 1.ª parte e preparar a 2.ª?')) return;
      setHalf(2);
      setElapsedHalf(0);
      setRunning(false);
      // reset current stints but keep total times
      setPlayers((prev) =>
        prev.map((p) =>
          p.onCourt ? { ...p, currentStint: 0, stintsCount: p.stintsCount + 1 } : p
        )
      );
      toast.success('2.ª PARTE PRONTA');
    } else {
      if (!window.confirm('Terminar o jogo definitivamente?')) return;
      setRunning(false);
      setEnded(true);
      toast.message('JOGO TERMINADO', { description: 'Podes agora gravar.' });
    }
  };

  const resetMatch = () => {
    if (!window.confirm('Cancelar este jogo e voltar ao "Criar Jogo"? Os tempos serão perdidos.')) return;
    clearActiveMatch();
    onEnd();
    toast.message('JOGO CANCELADO');
  };

  const saveCurrentMatch = () => {
    if (!ended) {
      if (!window.confirm('O jogo não terminou. Gravar mesmo assim?')) return;
    }
    saveMatch({
      id: match.id,
      opponent: match.opponent,
      competition: match.competition,
      matchday: match.matchday,
      venue: match.venue,
      date: match.date,
      players: players.map(({ id, number, name, position, totalTime, stintsCount }) => ({
        id, number, name, position, totalTime, stintsCount,
      })),
      subs,
      totalDuration: totalMatchTime,
      halfReached: half,
      teamName: team.name,
    });
    clearActiveMatch();
    toast.success('JOGO GRAVADO', { description: 'A redirecionar para estatísticas...' });
    setTimeout(() => navigate('/estatisticas'), 800);
  };

  const performSubstitution = (outId, inId) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === outId) {
          return { ...p, onCourt: false, lastStintTime: p.currentStint, currentStint: 0 };
        }
        if (p.id === inId) {
          return { ...p, onCourt: true, currentStint: 0, stintsCount: p.stintsCount + 1 };
        }
        return p;
      })
    );
    const outP = players.find((p) => p.id === outId);
    const inP = players.find((p) => p.id === inId);
    setSubs((s) => [
      {
        id: Date.now(),
        minute: elapsedHalf,
        half,
        out: { id: outId, name: outP.name, number: outP.number },
        in: { id: inId, name: inP.name, number: inP.number },
      },
      ...s,
    ]);
    setSelectedOut(null);
    setSelectedIn(null);
    toast.success(`SUBSTITUIÇÃO #${subs.length + 1}`, {
      description: `${inP.number} ${inP.name.toUpperCase()} ↑   ${outP.number} ${outP.name.toUpperCase()} ↓`,
    });
  };

  const handleCourtClick = (pid) => {
    if (ended) return;
    if (selectedIn !== null) {
      performSubstitution(pid, selectedIn);
      return;
    }
    setSelectedOut((cur) => (cur === pid ? null : pid));
  };
  const handleBenchClick = (pid) => {
    if (ended) return;
    if (selectedOut !== null) {
      performSubstitution(selectedOut, pid);
      return;
    }
    setSelectedIn((cur) => (cur === pid ? null : pid));
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="border-b border-white/10 px-5 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-20">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden md:block border-l border-white/10 pl-6">
            <div className="text-[10px] tracking-label uppercase text-white/50">
              {match.competition || 'Amigável'}
              {match.matchday && <> · Jornada {match.matchday}</>}
            </div>
            <div className="font-display text-base uppercase">
              {team.name} <span className="text-white/40">vs</span> {match.opponent}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {ended && (
            <button
              onClick={saveCurrentMatch}
              className="bg-neon text-black font-display text-sm uppercase tracking-wider px-4 py-2 rounded-sm hover:bg-[#bbdc0d] transition-colors flex items-center gap-2"
            >
              <Save size={14} /> Gravar Jogo
            </button>
          )}
          <button
            onClick={resetMatch}
            className="text-xs uppercase tracking-label text-white/55 hover:text-red-400 flex items-center gap-2"
            title="Cancelar jogo"
          >
            <X size={14} /> Cancelar
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 lg:px-8 py-6 max-w-[1500px] mx-auto w-full">
        {/* Control panel */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mb-6">
          {/* Big clock - COUNTDOWN */}
          <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-6 lg:p-7">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] tracking-label uppercase text-neon mb-1">
                  Cronómetro · Contagem Decrescente
                </div>
                <div className="text-xs text-white/55 uppercase tracking-wide">
                  {half === 1 ? '1.ª Parte' : '2.ª Parte'} · 20:00 min
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    ended ? 'bg-white/30' : running ? 'bg-red-500 live-dot' : 'bg-white/30'
                  }`}
                />
                <span className="text-[10px] tracking-label uppercase text-white/60">
                  {ended ? 'Terminado' : running ? 'AO VIVO' : halfFinished ? 'Fim da Parte' : 'Em Pausa'}
                </span>
              </div>
            </div>

            <div
              className={`font-display text-7xl lg:text-8xl xl:text-9xl leading-none tracking-tight tabular-nums ${
                isLast30 ? 'text-red-400' : 'text-neon neon-text'
              }`}
            >
              {formatTime(remaining)}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={toggleClock}
                disabled={ended || halfFinished}
                className={`flex-1 min-w-[150px] font-display text-lg uppercase tracking-wider px-5 py-3 rounded-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                  running
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-neon text-black hover:bg-[#bbdc0d]'
                }`}
              >
                {running ? <Pause size={18} /> : <Play size={18} />}
                {running ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                onClick={goNextHalf}
                disabled={ended}
                className="flex-1 min-w-[150px] font-display text-lg uppercase tracking-wider px-5 py-3 rounded-sm bg-white/5 border border-white/10 text-white hover:border-neon transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
                {half === 1 ? 'Fim 1.ª Parte' : 'Terminar Jogo'}
              </button>
              {ended ? (
                <button
                  onClick={saveCurrentMatch}
                  className="font-display text-lg uppercase tracking-wider px-5 py-3 rounded-sm bg-neon text-black hover:bg-[#bbdc0d] transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Gravar
                </button>
              ) : null}
            </div>
          </div>

          {/* Stats panel */}
          <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-6">
            <div className="text-[10px] tracking-label uppercase text-neon mb-4">
              Resumo Atual
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Stat icon={Users} label="Em Campo" value={onCourtPlayers.length} suffix="/5" />
              <Stat icon={Users} label="No Banco" value={benchPlayers.length} />
              <Stat icon={ArrowLeftRight} label="Substituições" value={subs.length} />
              <Stat icon={TimerIcon} label="Minutos Totais" value={formatTimeLong(totalMatchTime)} large />
            </div>

            <div className="border-t border-white/10 mt-5 pt-4 flex items-center gap-3">
              <Trophy size={16} className="text-neon" />
              <div className="text-[11px] tracking-label uppercase text-white/55">
                {team.name} {match.venue && <>· {match.venue}</>}
              </div>
            </div>
          </div>
        </section>

        {/* Substitution helper bar */}
        {(selectedOut || selectedIn) && !ended && (
          <div className="mb-4 border border-neon/40 bg-[#161b05] rounded-sm p-4 flex items-center justify-between gap-3 fade-up">
            <div className="text-sm text-white/80 flex items-center gap-2 flex-wrap">
              <ArrowLeftRight size={16} className="text-neon" />
              <span className="font-display uppercase text-base">Substituição</span>
              <span className="text-white/50">·</span>
              {selectedOut ? (
                <span>
                  <span className="text-red-400 uppercase">Sai:</span>{' '}
                  {players.find((p) => p.id === selectedOut)?.number}{' '}
                  {players.find((p) => p.id === selectedOut)?.name}
                </span>
              ) : (
                <span className="text-white/50">Seleciona um jogador em campo</span>
              )}
              <ArrowRight size={14} className="text-white/40" />
              {selectedIn ? (
                <span>
                  <span className="text-neon uppercase">Entra:</span>{' '}
                  {players.find((p) => p.id === selectedIn)?.number}{' '}
                  {players.find((p) => p.id === selectedIn)?.name}
                </span>
              ) : (
                <span className="text-white/50">Seleciona um jogador do banco</span>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedIn(null);
                setSelectedOut(null);
              }}
              className="text-white/60 hover:text-red-400 transition-colors"
              aria-label="Cancelar"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Players grids */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <div>
            <SectionHeader title="Em Campo" count={onCourtPlayers.length} accent />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {onCourtPlayers.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  selected={selectedOut === p.id}
                  onClick={() => handleCourtClick(p.id)}
                  onCourt
                  disabled={ended}
                />
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="Banco" count={benchPlayers.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benchPlayers.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  selected={selectedIn === p.id}
                  onClick={() => handleBenchClick(p.id)}
                  disabled={ended}
                />
              ))}
              {benchPlayers.length === 0 && (
                <div className="text-xs text-white/40 italic p-4 border border-dashed border-white/10 rounded-sm">
                  Sem atletas no banco.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Subs log */}
        <section className="mt-8">
          <SectionHeader title="Histórico de Substituições" count={subs.length} icon={History} />
          {subs.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-sm p-8 text-center text-sm text-white/40">
              Sem substituições registadas. Clica num jogador em campo e depois num do banco para trocar.
            </div>
          ) : (
            <div className="border border-white/10 rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#0f0f0f] text-[10px] tracking-label uppercase text-white/50">
                  <tr>
                    <th className="text-left px-4 py-3 w-16">#</th>
                    <th className="text-left px-4 py-3 w-24">Parte</th>
                    <th className="text-left px-4 py-3 w-28">Minuto</th>
                    <th className="text-left px-4 py-3">Sai</th>
                    <th className="text-center px-4 py-3 w-12"></th>
                    <th className="text-left px-4 py-3">Entra</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s, i) => (
                    <tr key={s.id} className="border-t border-white/5 bg-[#0a0a0a] hover:bg-[#111]">
                      <td className="px-4 py-3 font-mono text-neon">#{subs.length - i}</td>
                      <td className="px-4 py-3 text-white/70">{s.half}.ª</td>
                      <td className="px-4 py-3 font-mono">{formatTime(s.minute)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-7 h-7 bg-red-500/15 text-red-400 rounded-sm flex items-center justify-center text-xs font-mono">
                            {s.out.number}
                          </span>
                          {s.out.name}
                        </span>
                      </td>
                      <td className="text-center text-white/30">
                        <ArrowRight size={14} className="inline" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-7 h-7 bg-neon text-black rounded-sm flex items-center justify-center text-xs font-mono font-bold">
                            {s.in.number}
                          </span>
                          {s.in.name}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

/* ----------- Shared Subcomponents ----------- */

function SectionHeader({ title, count, accent, icon: Icon = Users }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-7 h-7 flex items-center justify-center rounded-sm ${
            accent ? 'bg-neon text-black' : 'bg-white/5 text-neon'
          }`}
        >
          <Icon size={14} strokeWidth={2.5} />
        </div>
        <h3 className="font-display text-xl uppercase tracking-wide">{title}</h3>
        <span className="text-[10px] tracking-label uppercase text-white/40">
          {count} {count === 1 ? 'jogador' : 'jogadores'}
        </span>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, suffix, large }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-sm p-3">
      <div className="flex items-center gap-2 text-[10px] tracking-label uppercase text-white/50 mb-2">
        <Icon size={12} className="text-neon" /> {label}
      </div>
      <div className={`${large ? 'text-2xl' : 'text-3xl'} font-display text-white tabular-nums`}>
        {value}
        {suffix && <span className="text-white/30 text-base ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function PlayerCard({ player, onClick, selected, onCourt, disabled }) {
  const stintActive = onCourt && player.currentStint > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left rounded-sm border p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        selected
          ? onCourt
            ? 'border-red-500/70 bg-red-500/5'
            : 'border-neon bg-[#161b05]'
          : onCourt
          ? 'border-white/10 bg-[#0f0f0f] hover:border-neon/50 hover:bg-[#121509]'
          : 'border-white/10 bg-[#0a0a0a] hover:border-white/25'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-11 h-11 flex items-center justify-center rounded-sm font-display text-xl tabular-nums ${
            onCourt ? 'bg-neon text-black' : 'bg-white/10 text-white/80'
          }`}
        >
          {player.number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm uppercase tracking-wide truncate">{player.name}</div>
          <div className="text-[10px] tracking-label uppercase text-white/45 mt-0.5">
            {player.position}
          </div>
        </div>
        {stintActive && (
          <span className="w-2 h-2 rounded-full bg-red-500 live-dot mt-2" title="Em jogo" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/40 rounded-sm px-3 py-2">
          <div className="text-[9px] tracking-label uppercase text-white/45">Total</div>
          <div className="font-mono text-base text-neon tabular-nums">
            {formatTime(player.totalTime)}
          </div>
        </div>
        <div className="bg-black/40 rounded-sm px-3 py-2">
          <div className="text-[9px] tracking-label uppercase text-white/45">
            {onCourt ? 'Parcial' : 'Último'}
          </div>
          <div className="font-mono text-base text-white tabular-nums">
            {onCourt ? formatTime(player.currentStint) : formatTime(player.lastStintTime)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-[10px] tracking-label uppercase text-white/40">
        <span>Entradas: {player.stintsCount}</span>
        {onCourt ? <span className="text-neon">Em campo</span> : <span>Banco</span>}
      </div>
    </button>
  );
}
