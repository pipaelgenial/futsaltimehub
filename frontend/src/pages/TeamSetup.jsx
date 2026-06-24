import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { apiCreateTeam, apiAddAthlete, apiGetTeam, getSessionUser } from '../lib/api';
import { Shield, Loader2 } from 'lucide-react';

const SAMPLE_ATHLETES = [
  { number: 1, name: 'Guarda-Redes', position: 'GR' },
  { number: 4, name: 'Defesa Fixo', position: 'FIXO' },
  { number: 7, name: 'Ala Direito', position: 'ALA' },
  { number: 9, name: 'Pivot', position: 'PIVOT' },
  { number: 10, name: 'Ala Esquerdo', position: 'ALA' },
];

export default function TeamSetup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [coach, setCoach] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [seedSample, setSeedSample] = useState(false);
  const [busy, setBusy] = useState(false);

  const colors = [
    { name: 'Neon', hex: '#d4ff1a' },
    { name: 'Vermelho', hex: '#ef4444' },
    { name: 'Azul', hex: '#3b82f6' },
    { name: 'Verde', hex: '#10b981' },
    { name: 'Laranja', hex: '#f97316' },
    { name: 'Branco', hex: '#f5f5f5' },
  ];

  useEffect(() => {
    const user = getSessionUser();
    if (!user) {
      navigate('/');
      return;
    }
    // If already has team, send to dashboard
    apiGetTeam().then((r) => {
      if (r.ok && r.team) navigate('/dashboard');
    });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('INSERE O NOME DA EQUIPA');
      return;
    }
    setBusy(true);
    const res = await apiCreateTeam({
      name: name.trim(),
      coach: coach.trim() || 'Treinador',
      color: colors[colorIdx].hex,
    });
    if (!res.ok) {
      toast.error(res.error.toUpperCase());
      setBusy(false);
      return;
    }
    if (seedSample) {
      for (const a of SAMPLE_ATHLETES) {
        await apiAddAthlete(a);
      }
    }
    toast.success('EQUIPA CRIADA');
    setTimeout(() => navigate('/dashboard'), 350);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl fade-up">
          <div className="mb-8">
            <Logo size="md" />
          </div>

          <div className="text-neon text-[11px] tracking-label uppercase mb-3">
            Passo 1 · Configuração
          </div>
          <h2 className="font-display text-4xl lg:text-5xl uppercase leading-none mb-2">
            Cria a tua Equipa
          </h2>
          <p className="text-sm text-white/55 mb-8">
            Antes de iniciar a monitorização, define o nome e identidade da tua equipa.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] tracking-label uppercase text-white/60 mb-2">Nome da Equipa *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 px-4 py-3 text-sm outline-none focus:border-neon focus:bg-[#181818] rounded-sm uppercase tracking-wide"
                placeholder="SPORTING CP"
                maxLength={32}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] tracking-label uppercase text-white/60 mb-2">Treinador</label>
              <input
                type="text"
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
                className="w-full bg-[#141414] border border-white/10 px-4 py-3 text-sm outline-none focus:border-neon focus:bg-[#181818] rounded-sm"
                placeholder="Pedro Pipa"
                maxLength={48}
              />
            </div>

            <div>
              <label className="block text-[10px] tracking-label uppercase text-white/60 mb-3">Cor Principal</label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((c, i) => (
                  <button
                    type="button"
                    key={c.hex}
                    onClick={() => setColorIdx(i)}
                    className={`w-10 h-10 rounded-sm border-2 transition-all ${
                      colorIdx === i ? 'border-white scale-110' : 'border-white/15 hover:border-white/40'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 border border-white/10 rounded-sm bg-[#0f0f0f] hover:border-white/25 cursor-pointer">
              <input
                type="checkbox"
                checked={seedSample}
                onChange={(e) => setSeedSample(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-neon"
              />
              <div className="flex-1">
                <div className="text-sm font-semibold">Adicionar 5 atletas de exemplo</div>
                <div className="text-xs text-white/50 mt-1">
                  Útil para testar rapidamente. Podes editar/remover depois no Plantel.
                </div>
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-neon text-black font-display text-xl tracking-wider uppercase py-3.5 rounded-sm transition-all hover:bg-[#bbdc0d] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
              {busy ? 'A criar...' : 'Criar Equipa'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
