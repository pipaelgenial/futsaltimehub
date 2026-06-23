import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { setUser, getTeam } from '../lib/storage';

const HERO_IMG = 'https://images.unsplash.com/photo-1630420598913-44208d36f9af?auto=format&fit=crop&w=1600&q=80';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('PREENCHA TODOS OS CAMPOS');
      return;
    }
    setUser({ email, name: email.split('@')[0] });
    toast.success('SESSÃO INICIADA');
    const hasTeam = !!getTeam();
    setTimeout(() => navigate(hasTeam ? '/dashboard' : '/team-setup'), 400);
  };

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* LEFT: Hero image with overlay text */}
        <div className="relative min-h-[420px] lg:min-h-screen overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_IMG})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/65 to-black/85" />
          <div className="absolute inset-0 bg-black/35" />

          {/* Top-left Logo */}
          <div className="absolute top-8 left-8 z-10">
            <Logo size="md" />
          </div>

          {/* Bottom-left content */}
          <div className="absolute bottom-12 left-8 right-8 lg:right-16 z-10">
            <div className="text-neon text-[11px] tracking-label uppercase mb-4">
              Cronometra · Substitui · Decide
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[0.95] uppercase">
              Controla o tempo. <br />
              <span className="text-neon">Domina</span> o jogo.
            </h1>
            <p className="text-sm text-white/65 mt-5 max-w-md leading-relaxed">
              Tempos individuais, parciais e substituições em tempo real para a tua equipa de futsal.
            </p>
          </div>
        </div>

        {/* RIGHT: Login form */}
        <div className="flex items-center justify-center px-6 py-12 lg:py-0 bg-[#0a0a0a]">
          <div className="w-full max-w-md fade-up">
            <div className="mb-7">
              <div className="text-neon text-[11px] tracking-label uppercase mb-3">
                Acesso Treinador
              </div>
              <h2 className="font-display text-4xl lg:text-5xl uppercase leading-none">
                Iniciar Sessão
              </h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-[10px] tracking-label uppercase text-white/60 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-neon focus:bg-[#181818] rounded-sm"
                  placeholder="treinador@equipa.pt"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-label uppercase text-white/60 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-neon focus:bg-[#181818] rounded-sm"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-neon text-black font-display text-xl tracking-wider uppercase py-3.5 rounded-sm transition-all hover:bg-[#bbdc0d] active:scale-[0.99]"
              >
                Entrar
              </button>

              <div className="text-center pt-1">
                <Link to="/recuperar-password" className="text-xs text-white/55 hover:text-neon transition-colors">
                  Esqueceste a password?
                </Link>
              </div>
            </form>

            <div className="text-sm text-white/60 mt-7">
              Não tem conta?{' '}
              <Link to="/register" className="text-neon hover:underline">
                Criar conta
              </Link>
            </div>

            <div className="mt-8 border border-white/10 bg-[#0f0f0f] p-4 rounded-sm">
              <div className="text-[10px] tracking-label uppercase text-neon mb-1">
                Validação
              </div>
              <div className="text-xs text-white/55 leading-relaxed">
                Novas contas precisam de ser validadas por um administrador antes do primeiro acesso.
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
