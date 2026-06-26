import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RecoverPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('INSERE O EMAIL');
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSent(true);
      toast.success('EMAIL ENVIADO');
    } catch (err) {
      // Backend always returns 200 unless server error
      toast.error('ERRO AO PROCESSAR PEDIDO');
    } finally {
      setBusy(false);
    }
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

          {sent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-5 bg-neon/15 border-2 border-neon/40 rounded-sm flex items-center justify-center">
                <CheckCircle2 size={32} className="text-neon" />
              </div>
              <h2 className="font-display text-3xl uppercase leading-none mb-3">Verifica o teu email</h2>
              <p className="text-sm text-white/65 leading-relaxed">
                Se a conta <span className="text-neon">{email}</span> existir, foi enviado um link para repor a password.
                <br /><br />
                O link é válido durante <span className="text-white">1 hora</span>. Verifica também a pasta de spam.
              </p>
              <Link to="/" className="inline-block mt-7 text-sm text-neon hover:underline">
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-4xl lg:text-5xl uppercase leading-none mb-3">Recuperar Password</h2>
              <p className="text-sm text-white/55 mb-7">
                Indica o teu email e receberás um link para criar uma nova password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] tracking-label uppercase text-white/60 mb-2">Email</label>
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
                  disabled={busy}
                  className="w-full bg-neon text-black font-display text-xl tracking-wider uppercase py-3.5 rounded-sm transition-all hover:bg-[#bbdc0d] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : null}
                  {busy ? 'A Enviar...' : 'Enviar Email'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
