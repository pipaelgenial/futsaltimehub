import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, Trash2, ChevronDown, ChevronUp, Trophy, Calendar, Users, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { getMatches, deleteMatch, getTeam } from '../lib/storage';
import { formatTime, formatTimeLong } from '../lib/time';
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
          stats[p.id] = { id: p.id, name: p.name, number: p.number, position: p.position, totalTime: 0, games: 0 };
        }
        stats[p.id].totalTime += p.totalTime || 0;
        if ((p.totalTime || 0) > 0) stats[p.id].games += 1;
      });
    });
    return Object.values(stats).sort((a, b) => b.totalTime - a.totalTime);
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
                Minutos por Atleta (Total)
              </h2>
              <div className="border border-white/10 rounded-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#0f0f0f] text-[10px] tracking-label uppercase text-white/50">
                    <tr>
                      <th className="text-left px-4 py-3 w-16">#</th>
                      <th className="text-left px-4 py-3">Atleta</th>
                      <th className="text-left px-4 py-3 w-20">Pos.</th>
                      <th className="text-right px-4 py-3 w-28">Jogos</th>
                      <th className="text-right px-4 py-3 w-32">Minutos</th>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                          <div className="flex items-center gap-3 mb-1">
                            <div className="font-display text-xl lg:text-2xl uppercase truncate">
                              {team.name} <span className="text-white/40">vs</span> {m.opponent}
                            </div>
                          </div>
                          <div className="text-[10px] tracking-label uppercase text-white/50">
                            {m.competition && <>{m.competition} · </>}
                            {m.matchday && <>Jornada {m.matchday} · </>}
                            {new Date(m.date).toLocaleDateString('pt-PT', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}{' '}
                            · {m.players.length} atletas · {m.subs.length} substituições
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
                          {/* Players summary */}
                          <div>
                            <div className="text-[10px] tracking-label uppercase text-neon mb-2 flex items-center gap-2">
                              <Users size={12} /> Minutos por Atleta neste Jogo
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {[...m.players]
                                .sort((a, b) => b.totalTime - a.totalTime)
                                .map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center gap-3 bg-black/40 border border-white/5 rounded-sm px-3 py-2"
                                  >
                                    <span className="w-7 h-7 bg-white/10 rounded-sm flex items-center justify-center text-xs font-mono">
                                      {p.number}
                                    </span>
                                    <span className="flex-1 text-xs uppercase tracking-wide truncate">
                                      {p.name}
                                    </span>
                                    <span className="font-mono text-sm text-neon tabular-nums">
                                      {formatTime(p.totalTime)}
                                    </span>
                                  </div>
                                ))}
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
                                    <span className="font-mono text-white/50 w-14">{s.half}.ª {formatTime(s.minute)}</span>
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
