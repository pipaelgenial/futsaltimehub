import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('TOKEN EM FALTA');
      setTimeout(() => navigate('/'), 1500);
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('PASSWORD MÍNIMA DE 6 CARACTERES');
      return;
    }
    if (password !== confirm) {
      toast.error('AS PASSWORDS NÃO COINCIDEM');
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, password });
      setDone(true);
      toast.success('PASSWORD ATUALIZADA');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Erro ao atualizar password';
      toast.error(msg.toUpperCase());
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md text-center fade-up">
            <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
            <h2 className="font-display text-2xl uppercase">Link inválido</h2>
            <p className="text-sm text-white/55 mt-3">A redirecionar...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md fade-up">
          <div className="mb-8">
            <Logo size="md" />
          </div>

          {done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-5 bg-neon/15 border-2 border-neon/40 rounded-sm flex items-center justify-center">
                <CheckCircle2 size={32} className="text-neon" />
              </div>
              <h2 className="font-display text-3xl uppercase leading-none mb-3">Password Atualizada</h2>
              <p className="text-sm text-white/65 leading-relaxed">A redirecionar para o login...</p>
            </div>
          ) : (
            <>
              <Link to="/" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-neon mb-5">
                <ArrowLeft size={14} /> VOLTAR
              </Link>
              <h2 className="font-display text-4xl lg:text-5xl uppercase leading-none mb-3">Nova Password</h2>
              <p className="text-sm text-white/55 mb-7">
                Define uma nova password para a tua conta. Mínimo 6 caracteres.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] tracking-label uppercase text-white/60 mb-2">Nova Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#141414] border border-white/10 px-4 py-3 text-sm outline-none focus:border-neon focus:bg-[#181818] rounded-sm"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-label uppercase text-white/60 mb-2">Confirmar Password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full bg-[#141414] border border-white/10 px-4 py-3 text-sm outline-none focus:border-neon focus:bg-[#181818] rounded-sm"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-neon text-black font-display text-xl tracking-wider uppercase py-3.5 rounded-sm transition-all hover:bg-[#bbdc0d] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : null}
                  {busy ? 'A Atualizar...' : 'Atualizar Password'}
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
