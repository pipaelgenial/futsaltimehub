import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function RecoverPassword() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('INSERE O EMAIL');
      return;
    }
    toast.success('EMAIL DE RECUPERAÇÃO ENVIADO');
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md fade-up">
          <div className="mb-8">
            <Logo size="md" />
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-neon mb-5">
            <ArrowLeft size={14} /> VOLTAR
          </Link>

          <h2 className="font-display text-4xl lg:text-5xl uppercase leading-none mb-3">
            Recuperar Password
          </h2>
          <p className="text-sm text-white/55 mb-7">
            Indica o teu email e receberás instruções para repor a tua password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] tracking-label uppercase text-white/60 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 px-4 py-3 text-sm outline-none focus:border-neon focus:bg-[#181818] rounded-sm"
                placeholder="treinador@equipa.pt"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-neon text-black font-display text-xl tracking-wider uppercase py-3.5 rounded-sm transition-all hover:bg-[#bbdc0d] active:scale-[0.99]"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
