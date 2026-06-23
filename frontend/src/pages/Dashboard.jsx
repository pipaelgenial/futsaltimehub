import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { Timer, Users, BarChart3, ClipboardList, LogOut, ChevronRight } from 'lucide-react';
import { TEAM_INFO } from '../mock/mock';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('flh_user') || '{"name":"Treinador"}');

  const cards = [
    {
      title: 'Monitor de Partida',
      desc: 'Cronómetros individuais, substituições e tempos parciais em tempo real.',
      icon: Timer,
      to: '/monitor',
      cta: 'Iniciar',
      featured: true,
    },
    {
      title: 'Plantel',
      desc: 'Gere a tua equipa, posições e números de camisola.',
      icon: Users,
      to: '/monitor',
      cta: 'Gerir',
    },
    {
      title: 'Estatísticas',
      desc: 'Histórico de minutos, ACWR e indicadores de carga.',
      icon: BarChart3,
      to: '/monitor',
      cta: 'Analisar',
    },
    {
      title: 'Relatórios',
      desc: 'Exporta relatórios de minutos e substituições.',
      icon: ClipboardList,
      to: '/monitor',
      cta: 'Ver',
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('flh_user');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Top bar */}
      <header className="border-b border-white/10 px-6 lg:px-10 py-5 flex items-center justify-between">
        <Logo size="md" />
        <div className="flex items-center gap-5">
          <div className="hidden sm:block text-right">
            <div className="text-[10px] tracking-label uppercase text-white/50">Treinador</div>
            <div className="text-sm text-white">{user.name}</div>
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
        {/* Hero */}
        <div className="mb-10 fade-up">
          <div className="text-neon text-[11px] tracking-label uppercase mb-3">
            Dashboard · Hoje
          </div>
          <h1 className="font-display text-5xl lg:text-7xl uppercase leading-none">
            Bem-vindo, <span className="text-neon">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-white/55 mt-4 max-w-xl">
            Inicia a monitorização da próxima partida ou consulta o histórico da tua equipa.
          </p>
        </div>

        {/* Next match strip */}
        <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-5 lg:p-6 mb-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="text-[10px] tracking-label uppercase text-neon mb-2">
                Próxima Partida
              </div>
              <div className="font-display text-2xl lg:text-3xl uppercase">
                {TEAM_INFO.homeTeam} <span className="text-white/40">vs</span> {TEAM_INFO.awayTeam}
              </div>
              <div className="text-xs text-white/55 mt-2 tracking-wide uppercase">
                {TEAM_INFO.competition} · {TEAM_INFO.matchday} · {TEAM_INFO.venue} · {TEAM_INFO.date}
              </div>
            </div>
            <Link
              to="/monitor"
              className="bg-neon text-black font-display text-lg uppercase tracking-wider px-7 py-3 rounded-sm hover:bg-[#bbdc0d] transition-colors inline-flex items-center gap-2 self-start lg:self-auto"
            >
              Iniciar Monitor <ChevronRight size={18} />
            </Link>
          </div>
        </div>

        {/* Action cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="text-[11px] tracking-label uppercase text-neon mt-5">
                  {c.cta}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
