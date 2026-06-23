import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play, Pause, RotateCcw, ArrowLeftRight, History, ChevronRight,
  Timer as TimerIcon, Users, Trophy, X, ArrowRight, ArrowLeft,
} from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { INITIAL_PLAYERS, STARTING_LINEUP_IDS, TEAM_INFO } from '../mock/mock';
import { formatTime, formatTimeLong } from '../lib/time';
import { toast } from 'sonner';

export default function MatchMonitor() {
  const navigate = useNavigate();

  // Match clock
  const [matchTime, setMatchTime] = useState(0); // seconds since start of half
  const [half, setHalf] = useState(1); // 1 or 2
  const [running, setRunning] = useState(false);
  const tickRef = useRef(null);

  // Player state: each has totalTime (cumulative), partialTime (current stint or last stint), onCourt boolean
  const [players, setPlayers] = useState(() =>
    INITIAL_PLAYERS.map((p) => ({
      ...p,
      onCourt: STARTING_LINEUP_IDS.includes(p.id),
      totalTime: 0,
      currentStint: 0,
      stintsCount: STARTING_LINEUP_IDS.includes(p.id) ? 1 : 0,
      lastStintTime: 0,
    }))
  );

  // Substitutions log
  const [subs, setSubs] = useState([]);

  // Selection states for substitution
  const [selectedOut, setSelectedOut] = useState(null); // player id on court
  const [selectedIn, setSelectedIn] = useState(null); // player id on bench

  // Tick the clock + accumulate player times
  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setMatchTime((t) => t + 1);
      setPlayers((prev) =>
        prev.map((p) =>
          p.onCourt
            ? { ...p, totalTime: p.totalTime + 1, currentStint: p.currentStint + 1 }
            : p
        )
      );
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running]);

  // Derived
  const onCourtPlayers = useMemo(() => players.filter((p) => p.onCourt), [players]);
  const benchPlayers = useMemo(() => players.filter((p) => !p.onCourt), [players]);
  const totalMatchTime = useMemo(
    () => players.reduce((acc, p) => acc + p.totalTime, 0),
    [players]
  );

  // Actions
  const toggleClock = () => setRunning((r) => !r);

  const resetClock = () => {
    if (!window.confirm('Reiniciar a partida e zerar todos os tempos?')) return;
    clearInterval(tickRef.current);
    setRunning(false);
    setMatchTime(0);
    setHalf(1);
    setSubs([]);
    setSelectedIn(null);
    setSelectedOut(null);
    setPlayers(
      INITIAL_PLAYERS.map((p) => ({
        ...p,
        onCourt: STARTING_LINEUP_IDS.includes(p.id),
        totalTime: 0,
        currentStint: 0,
        stintsCount: STARTING_LINEUP_IDS.includes(p.id) ? 1 : 0,
        lastStintTime: 0,
      }))
    );
    toast.success('PARTIDA REINICIADA');
  };

  const nextHalf = () => {
    if (half === 1) {
      setHalf(2);
      setMatchTime(0);
      setRunning(false);
      toast.success('2.ª PARTE PRONTA');
    } else {
      toast.message('PARTIDA ENCERRADA', { description: 'Tempos finais registados.' });
      setRunning(false);
    }
  };

  const performSubstitution = (outId, inId) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === outId) {
          return {
            ...p,
            onCourt: false,
            lastStintTime: p.currentStint,
            currentStint: 0,
          };
        }
        if (p.id === inId) {
          return {
            ...p,
            onCourt: true,
            currentStint: 0,
            stintsCount: p.stintsCount + 1,
          };
        }
        return p;
      })
    );
    const outP = players.find((p) => p.id === outId);
    const inP = players.find((p) => p.id === inId);
    setSubs((s) => [
      {
        id: Date.now(),
        minute: matchTime,
        half,
        out: { id: outId, name: outP.name, number: outP.number },
        in: { id: inId, name: inP.name, number: inP.number },
      },
      ...s,
    ]);
    setSelectedOut(null);
    setSelectedIn(null);
    toast.success(`SUBSTITUIÇÃO #${subs.length + 1}`, {
      description: `${inP.number} ${inP.name.toUpperCase()} \u2192 ${outP.number} ${outP.name.toUpperCase()}`,
    });
  };

  // Handle player click
  const handleCourtClick = (pid) => {
    if (selectedIn !== null) {
      performSubstitution(pid, selectedIn);
      return;
    }
    setSelectedOut((cur) => (cur === pid ? null : pid));
  };
  const handleBenchClick = (pid) => {
    if (selectedOut !== null) {
      performSubstitution(selectedOut, pid);
      return;
    }
    setSelectedIn((cur) => (cur === pid ? null : pid));
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 px-5 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-20">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden md:block border-l border-white/10 pl-6">
            <div className="text-[10px] tracking-label uppercase text-white/50">
              {TEAM_INFO.competition} · {TEAM_INFO.matchday}
            </div>
            <div className="font-display text-base uppercase">
              {TEAM_INFO.homeTeam} <span className="text-white/40">vs</span> {TEAM_INFO.awayTeam}
            </div>
          </div>
        </div>
        <Link
          to="/dashboard"
          className="text-xs uppercase tracking-label text-white/55 hover:text-neon flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </header>

      <main className="flex-1 px-5 lg:px-8 py-6 max-w-[1500px] mx-auto w-full">
        {/* Control panel */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mb-6">
          {/* Big clock */}
          <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-6 lg:p-7">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] tracking-label uppercase text-neon mb-1">
                  Cronómetro da Partida
                </div>
                <div className="text-xs text-white/55 uppercase tracking-wide">
                  {half === 1 ? '1.ª Parte' : '2.ª Parte'} · 20:00 min
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    running ? 'bg-red-500 live-dot' : 'bg-white/30'
                  }`}
                />
                <span className="text-[10px] tracking-label uppercase text-white/60">
                  {running ? 'AO Vivo' : 'Em Pausa'}
                </span>
              </div>
            </div>

            <div className="font-display text-7xl lg:text-8xl xl:text-9xl text-neon neon-text leading-none tracking-tight tabular-nums">
              {formatTime(matchTime)}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={toggleClock}
                className={`flex-1 min-w-[150px] font-display text-lg uppercase tracking-wider px-5 py-3 rounded-sm transition-all flex items-center justify-center gap-2 ${
                  running
                    ? 'bg-white/10 text-white hover:bg-white/15'
                    : 'bg-neon text-black hover:bg-[#bbdc0d]'
                }`}
              >
                {running ? <Pause size={18} /> : <Play size={18} />}
                {running ? 'Pausar' : 'Iniciar'}
              </button>
              <button
                onClick={nextHalf}
                className="flex-1 min-w-[150px] font-display text-lg uppercase tracking-wider px-5 py-3 rounded-sm bg-white/5 border border-white/10 text-white hover:border-neon transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight size={18} />
                {half === 1 ? 'Fim 1.ª Parte' : 'Terminar'}
              </button>
              <button
                onClick={resetClock}
                className="font-display text-lg uppercase tracking-wider px-5 py-3 rounded-sm bg-white/5 border border-white/10 text-white/70 hover:text-red-400 hover:border-red-500/50 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> Reset
              </button>
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
              <Stat
                icon={TimerIcon}
                label="Minutos Totais"
                value={formatTimeLong(totalMatchTime)}
                large
              />
            </div>

            <div className="border-t border-white/10 mt-5 pt-4 flex items-center gap-3">
              <Trophy size={16} className="text-neon" />
              <div className="text-[11px] tracking-label uppercase text-white/55">
                {TEAM_INFO.homeTeam} · {TEAM_INFO.venue}
              </div>
            </div>
          </div>
        </section>

        {/* Substitution helper bar */}
        {(selectedOut || selectedIn) && (
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
          {/* On court */}
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
                />
              ))}
            </div>
          </div>

          {/* Bench */}
          <div>
            <SectionHeader title="Banco" count={benchPlayers.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benchPlayers.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  selected={selectedIn === p.id}
                  onClick={() => handleBenchClick(p.id)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Substitutions log */}
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
                    <tr
                      key={s.id}
                      className="border-t border-white/5 bg-[#0a0a0a] hover:bg-[#111] transition-colors"
                    >
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

/* ----------- Subcomponents ----------- */

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
      <div
        className={`${large ? 'text-2xl' : 'text-3xl'} font-display text-white tabular-nums`}
      >
        {value}
        {suffix && <span className="text-white/30 text-base ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function PlayerCard({ player, onClick, selected, onCourt }) {
  const stintActive = onCourt && player.currentStint > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-sm border p-4 transition-all ${
        selected
          ? onCourt
            ? 'border-red-500/70 bg-red-500/5 shadow-[0_0_0_1px_rgba(239,68,68,0.4)]'
            : 'border-neon bg-[#161b05] shadow-[0_0_0_1px_rgba(212,255,26,0.5)]'
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
          <div className="font-semibold text-sm uppercase tracking-wide truncate">
            {player.name}
          </div>
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
        {onCourt ? (
          <span className="text-neon">Em campo</span>
        ) : (
          <span>Banco</span>
        )}
      </div>
    </button>
  );
}
