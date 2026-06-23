import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { Timer, Users, BarChart3, LogOut, ChevronRight, Shield, Trash2, RotateCcw } from 'lucide-react';
import {
  getUser, clearUser, getTeam, clearTeam, getRoster, getMatches, getActiveMatch, clearActiveMatch, setRoster,
} from '../lib/storage';
import { formatTimeLong } from '../lib/time';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getUser() || { name: 'Treinador' };
  const team = getTeam();
  const roster = getRoster();
  const matches = getMatches();
  const active = getActiveMatch();

  if (!team) {
    navigate('/team-setup');
    return null;
  }

  const cards = [
    {
      title: active ? 'Continuar Jogo' : 'Monitor de Partida',
      desc: active
        ? `Jogo em curso vs ${active.opponent}. Continua a monitorização.`
        : 'Cronómetros individuais, substituições e tempos parciais em tempo real.',
      icon: Timer,
      to: '/monitor',
      cta: active ? 'Continuar' : 'Criar Jogo',
      featured: true,
    },
    {
      title: 'Plantel',
      desc: `Gere os teus atletas (${roster.length} ${roster.length === 1 ? 'atleta' : 'atletas'}).`,
      icon: Users,
      to: '/plantel',
      cta: 'Gerir',
    },
    {
      title: 'Estatísticas',
      desc: `Histórico de jogos passados (${matches.length} ${matches.length === 1 ? 'jogo' : 'jogos'}).`,
      icon: BarChart3,
      to: '/estatisticas',
      cta: 'Analisar',
    },
  ];

  const handleLogout = () => {
    clearUser();
    navigate('/');
  };

  const handleResetTeam = () => {
    if (!window.confirm('APAGAR TUDO?\n\nVai apagar:\n· A equipa\n· Todos os atletas do plantel\n· Todos os jogos do histórico\n· Jogo em curso (se existir)\n\nEsta ação é irreversível.')) return;
    if (!window.confirm('Tens a certeza? Esta ação não pode ser desfeita.')) return;
    clearTeam();
    setRoster([]);
    clearActiveMatch();
    localStorage.removeItem('flh_matches');
    navigate('/team-setup');
  };

  const handleResetMatches = () => {
    if (!window.confirm('Apagar apenas o histórico de jogos? Equipa e plantel mantêm-se.')) return;
    localStorage.removeItem('flh_matches');
    clearActiveMatch();
    window.location.reload();
  };

  const totalMinutesPlayed = matches.reduce((s, m) => s + (m.totalDuration || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="border-b border-white/10 px-6 lg:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo size="md" />
          <div className="hidden md:block border-l border-white/10 pl-6">
            <div className="text-[10px] tracking-label uppercase text-white/50">Equipa</div>
            <div className="font-display text-lg uppercase">{team.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="hidden sm:block text-right">
            <div className="text-[10px] tracking-label uppercase text-white/50">Treinador</div>
            <div className="text-sm text-white">{team.coach || user.name}</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs uppercase tracking-label text-white/60 hover:text-neon transition-colors"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 lg:px-10 py-10 max-w-7xl mx-auto w-full">
        <div className="mb-10 fade-up">
          <div className="text-neon text-[11px] tracking-label uppercase mb-3">
            Dashboard · {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <h1 className="font-display text-5xl lg:text-7xl uppercase leading-none">
            <span className="text-neon">{team.name}</span>
          </h1>
          <p className="text-sm text-white/55 mt-4 max-w-xl">
            Bem-vindo, {team.coach || user.name}. Inicia um novo jogo ou consulta o histórico da equipa.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <StatTile icon={Users} label="Atletas no Plantel" value={roster.length} />
          <StatTile icon={BarChart3} label="Jogos Registados" value={matches.length} />
          <StatTile icon={Timer} label="Minutos Totais Jogados" value={formatTimeLong(totalMinutesPlayed)} small />
        </div>

        {/* Active match banner */}
        {active && (
          <div className="border border-neon/40 bg-[#161b05] rounded-sm p-5 lg:p-6 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 fade-up">
            <div>
              <div className="text-[10px] tracking-label uppercase text-neon mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 live-dot" /> Jogo em curso
              </div>
              <div className="font-display text-2xl uppercase">
                {team.name} <span className="text-white/40">vs</span> {active.opponent}
              </div>
              <div className="text-xs text-white/55 mt-1 uppercase tracking-wide">
                {active.competition || 'Amigável'}
                {active.matchday && ` · Jornada ${active.matchday}`} · {active.half}.ª Parte
              </div>
            </div>
            <Link
              to="/monitor"
              className="bg-neon text-black font-display text-lg uppercase tracking-wider px-7 py-3 rounded-sm hover:bg-[#bbdc0d] transition-colors inline-flex items-center gap-2 self-start lg:self-auto"
            >
              Continuar <ChevronRight size={18} />
            </Link>
          </div>
        )}

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.title}
                to={c.to}
                className={`group border rounded-sm p-6 transition-all hover:border-neon ${
                  c.featured ? 'border-neon/40 bg-[#0f1305]' : 'border-white/10 bg-[#0f0f0f]'
                }`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className={`w-12 h-12 flex items-center justify-center rounded-sm ${
                      c.featured ? 'bg-neon text-black' : 'bg-white/5 text-neon'
                    }`}
                  >
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-white/30 group-hover:text-neon group-hover:translate-x-1 transition-all"
                  />
                </div>
                <div className="font-display text-2xl uppercase mb-2">{c.title}</div>
                <div className="text-sm text-white/55 leading-relaxed">{c.desc}</div>
                <div className="text-[11px] tracking-label uppercase text-neon mt-5">{c.cta}</div>
              </Link>
            );
          })}
        </div>

        {/* Team info / danger zone */}
        <div className="border border-red-500/20 bg-red-500/5 rounded-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-sm flex items-center justify-center"
                style={{ backgroundColor: team.color || '#d4ff1a' }}
              >
                <Shield size={18} className="text-black" />
              </div>
              <div>
                <div className="font-display text-base uppercase">{team.name}</div>
                <div className="text-[10px] tracking-label uppercase text-white/50">
                  Criada em {new Date(team.createdAt).toLocaleDateString('pt-PT')}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleResetMatches}
                className="text-xs uppercase tracking-label bg-white/5 border border-white/10 text-white/70 hover:text-orange-400 hover:border-orange-400/40 flex items-center gap-2 px-4 py-2 rounded-sm transition-colors"
              >
                <RotateCcw size={12} /> Limpar Histórico
              </button>
              <button
                onClick={handleResetTeam}
                className="text-xs uppercase tracking-label bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 flex items-center gap-2 px-4 py-2 rounded-sm transition-colors font-semibold"
              >
                <Trash2 size={12} /> Reset Total
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, small }) {
  return (
    <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-5 flex items-center gap-4">
      <div className="w-11 h-11 bg-white/5 text-neon rounded-sm flex items-center justify-center">
        <Icon size={20} />
      </div>
      <div>
        <div className="text-[10px] tracking-label uppercase text-white/50">{label}</div>
        <div className={`font-display ${small ? 'text-2xl' : 'text-3xl'} text-white tabular-nums`}>{value}</div>
      </div>
    </div>
  );
}
