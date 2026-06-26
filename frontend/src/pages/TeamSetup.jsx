import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { apiCreateTeam, apiAddAthlete, apiGetTeam, apiSaveMatch, getSessionUser } from '../lib/api';
import { Shield, Loader2 } from 'lucide-react';

const SAMPLE_ATHLETES = [
  { number: 1, name: 'Guarda-Redes', position: 'GR' },
  { number: 12, name: 'GR Suplente', position: 'GR' },
  { number: 4, name: 'Defesa Fixo', position: 'FIXO' },
  { number: 3, name: 'Defesa Reserva', position: 'FIXO' },
  { number: 7, name: 'Ala Direito', position: 'ALA' },
  { number: 11, name: 'Ala Esquerdo', position: 'ALA' },
  { number: 8, name: 'Ala Reserva', position: 'ALA' },
  { number: 9, name: 'Pivot', position: 'PIVOT' },
  { number: 10, name: 'Pivot Reserva', position: 'PIVOT' },
  { number: 5, name: 'Universal', position: 'UNI' },
];

// Build a realistic sample match (40 min, 3-2 win) using the just-created athletes.
// Athletes is an array of { id, number, name, position } returned from apiAddAthlete.
const buildSampleMatch = (athletes, teamName) => {
  const byNum = Object.fromEntries(athletes.map((a) => [a.number, a]));
  const p = (n) => byNum[n];
  // Stints per player number → list of { inHalf, inMinute, outHalf, outMinute, duration }
  const stintsByNum = {
    1: [{ inHalf: 1, inMinute: 0, outHalf: 1, outMinute: 1200, duration: 1200 }, { inHalf: 2, inMinute: 0, outHalf: 2, outMinute: 1200, duration: 1200 }],
    4: [{ inHalf: 1, inMinute: 0, outHalf: 1, outMinute: 1200, duration: 1200 }, { inHalf: 2, inMinute: 0, outHalf: 2, outMinute: 300, duration: 300 }],
    7: [{ inHalf: 1, inMinute: 0, outHalf: 1, outMinute: 720, duration: 720 }, { inHalf: 2, inMinute: 960, outHalf: 2, outMinute: 1200, duration: 240 }],
    9: [{ inHalf: 1, inMinute: 0, outHalf: 1, outMinute: 720, duration: 720 }, { inHalf: 2, inMinute: 960, outHalf: 2, outMinute: 1200, duration: 240 }],
    11: [{ inHalf: 1, inMinute: 0, outHalf: 1, outMinute: 1200, duration: 1200 }, { inHalf: 2, inMinute: 0, outHalf: 2, outMinute: 960, duration: 960 }],
    8: [{ inHalf: 1, inMinute: 720, outHalf: 1, outMinute: 1200, duration: 480 }, { inHalf: 2, inMinute: 0, outHalf: 2, outMinute: 960, duration: 960 }],
    10: [{ inHalf: 1, inMinute: 720, outHalf: 1, outMinute: 1200, duration: 480 }, { inHalf: 2, inMinute: 0, outHalf: 2, outMinute: 1200, duration: 1200 }],
    5: [{ inHalf: 2, inMinute: 300, outHalf: 2, outMinute: 1200, duration: 900 }],
    3: [],
    12: [],
  };
  const statsByNum = {
    1: { scored: 0, assists: 0, goalsFor: 3, goalsAgainst: 2, foulsCommitted: 0, yellowCards: 0, redCards: 0 },
    4: { scored: 0, assists: 0, goalsFor: 1, goalsAgainst: 1, foulsCommitted: 1, yellowCards: 1, redCards: 0 },
    7: { scored: 1, assists: 1, goalsFor: 2, goalsAgainst: 0, foulsCommitted: 0, yellowCards: 0, redCards: 0 },
    9: { scored: 1, assists: 0, goalsFor: 2, goalsAgainst: 0, foulsCommitted: 0, yellowCards: 0, redCards: 0 },
    11: { scored: 0, assists: 0, goalsFor: 2, goalsAgainst: 2, foulsCommitted: 0, yellowCards: 0, redCards: 0 },
    8: { scored: 0, assists: 0, goalsFor: 1, goalsAgainst: 2, foulsCommitted: 0, yellowCards: 0, redCards: 0 },
    10: { scored: 1, assists: 0, goalsFor: 2, goalsAgainst: 2, foulsCommitted: 0, yellowCards: 0, redCards: 0 },
    5: { scored: 0, assists: 1, goalsFor: 2, goalsAgainst: 1, foulsCommitted: 1, yellowCards: 1, redCards: 0 },
    3: { scored: 0, assists: 0, goalsFor: 0, goalsAgainst: 0, foulsCommitted: 0, yellowCards: 0, redCards: 0 },
    12: { scored: 0, assists: 0, goalsFor: 0, goalsAgainst: 0, foulsCommitted: 0, yellowCards: 0, redCards: 0 },
  };
  const players = athletes.map((a) => {
    const stints = stintsByNum[a.number] || [];
    const totalTime = stints.reduce((s, x) => s + (x.duration || 0), 0);
    return {
      id: a.id, number: a.number, name: a.name, position: a.position,
      totalTime, sentOff: false, stints,
      ...statsByNum[a.number],
    };
  });
  const subs = [
    { half: 1, minute: 720, out: { id: p(7).id, number: 7, name: p(7).name }, in: { id: p(10).id, number: 10, name: p(10).name } },
    { half: 1, minute: 720, out: { id: p(9).id, number: 9, name: p(9).name }, in: { id: p(8).id, number: 8, name: p(8).name } },
    { half: 2, minute: 300, out: { id: p(4).id, number: 4, name: p(4).name }, in: { id: p(5).id, number: 5, name: p(5).name } },
    { half: 2, minute: 960, out: { id: p(11).id, number: 11, name: p(11).name }, in: { id: p(7).id, number: 7, name: p(7).name } },
    { half: 2, minute: 960, out: { id: p(8).id, number: 8, name: p(8).name }, in: { id: p(9).id, number: 9, name: p(9).name } },
  ];
  const goals = [
    { id: 'g1', half: 1, minute: 300, type: 'home', scorerId: p(9).id, scorerNumber: 9, scorerName: p(9).name, assistId: p(7).id, assistNumber: 7, assistName: p(7).name },
    { id: 'g2', half: 1, minute: 1020, type: 'away' },
    { id: 'g3', half: 2, minute: 480, type: 'home', scorerId: p(10).id, scorerNumber: 10, scorerName: p(10).name },
    { id: 'g4', half: 2, minute: 840, type: 'away' },
    { id: 'g5', half: 2, minute: 1080, type: 'home', scorerId: p(7).id, scorerNumber: 7, scorerName: p(7).name, assistId: p(5).id, assistNumber: 5, assistName: p(5).name },
  ];
  const fouls = [
    { id: 'f1', half: 1, minute: 420, type: 'committed', playerId: p(4).id, playerNumber: 4, playerName: p(4).name },
    { id: 'f2', half: 2, minute: 660, type: 'committed', playerId: p(5).id, playerNumber: 5, playerName: p(5).name },
    { id: 'f3', half: 1, minute: 540, type: 'suffered', playerId: p(9).id, playerNumber: 9, playerName: p(9).name },
    { id: 'f4', half: 2, minute: 720, type: 'suffered' },
    { id: 'f5', half: 2, minute: 1020, type: 'suffered', playerId: p(7).id, playerNumber: 7, playerName: p(7).name },
  ];
  const cards = [
    { id: 'c1', half: 1, minute: 900, type: 'yellow', playerId: p(4).id, playerNumber: 4, playerName: p(4).name },
    { id: 'c2', half: 2, minute: 660, type: 'yellow', playerId: p(5).id, playerNumber: 5, playerName: p(5).name },
  ];
  const today = new Date();
  return {
    opponent: 'RIVAL FC',
    competition: 'Liga Local',
    matchday: '1',
    venue: 'Pavilhão Municipal',
    date: today.toISOString().slice(0, 10),
    team_name: teamName,
    home_score: 3, away_score: 2,
    fouls_committed: 2, fouls_suffered: 3,
    yellow_cards: 2, red_cards: 0,
    total_duration: 2400, half_reached: 2,
    players, subs, goals, fouls, cards,
  };
};

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
      const created = [];
      for (const a of SAMPLE_ATHLETES) {
        const r = await apiAddAthlete(a);
        if (r.ok) created.push(r.athlete);
      }
      if (created.length === SAMPLE_ATHLETES.length) {
        const payload = buildSampleMatch(created, name.trim());
        await apiSaveMatch(payload);
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
                <div className="text-sm font-semibold">Adicionar 10 atletas + 1 jogo de teste</div>
                <div className="text-xs text-white/50 mt-1">
                  Cria um plantel completo e um jogo já gravado (3-2, com golos, faltas e cartões) para explorares Estatísticas e Exportação imediatamente. Podes editar/remover depois.
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
