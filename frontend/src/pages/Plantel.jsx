import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Users, Search } from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { getRoster, addAthlete, removeAthlete, getTeam, POSITIONS } from '../lib/storage';
import { toast } from 'sonner';

export default function Plantel() {
  const navigate = useNavigate();
  const team = getTeam();
  const [roster, setRosterState] = useState(getRoster());
  const [form, setForm] = useState({ number: '', name: '', position: 'ALA' });
  const [query, setQuery] = useState('');

  if (!team) {
    navigate('/team-setup');
    return null;
  }

  const refresh = () => setRosterState(getRoster());

  const handleAdd = (e) => {
    e.preventDefault();
    const num = parseInt(form.number, 10);
    if (!num || num < 1 || num > 99) {
      toast.error('NÚMERO INVÁLIDO (1-99)');
      return;
    }
    if (!form.name.trim()) {
      toast.error('INSERE O NOME');
      return;
    }
    if (roster.some((a) => a.number === num)) {
      toast.error(`NÚMERO ${num} JÁ EM USO`);
      return;
    }
    addAthlete({ number: num, name: form.name.trim(), position: form.position });
    setForm({ number: '', name: '', position: 'ALA' });
    refresh();
    toast.success('ATLETA ADICIONADO');
  };

  const handleRemove = (id, name) => {
    if (!window.confirm(`Remover ${name} do plantel?`)) return;
    removeAthlete(id);
    refresh();
    toast.success('ATLETA REMOVIDO');
  };

  const filtered = roster
    .filter((a) =>
      query
        ? a.name.toLowerCase().includes(query.toLowerCase()) ||
          String(a.number).includes(query)
        : true
    )
    .sort((a, b) => a.number - b.number);

  const byPosition = POSITIONS.reduce((acc, p) => {
    acc[p] = roster.filter((a) => a.position === p).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="border-b border-white/10 px-5 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-20">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden md:block border-l border-white/10 pl-6">
            <div className="text-[10px] tracking-label uppercase text-white/50">Plantel</div>
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
          <div className="text-neon text-[11px] tracking-label uppercase mb-2">Gestão</div>
          <h1 className="font-display text-4xl lg:text-5xl uppercase leading-none">
            Plantel <span className="text-neon">·</span> {roster.length}{' '}
            <span className="text-white/40 text-2xl">
              {roster.length === 1 ? 'atleta' : 'atletas'}
            </span>
          </h1>
          <div className="flex gap-5 mt-4 text-xs uppercase tracking-label text-white/55">
            {POSITIONS.map((p) => (
              <span key={p}>
                {p} · <span className="text-neon">{byPosition[p]}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-5">
          {/* Add form */}
          <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-5 h-fit">
            <div className="text-[10px] tracking-label uppercase text-neon mb-3">
              Adicionar Atleta
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-[100px_1fr] gap-3">
                <div>
                  <label className="block text-[10px] tracking-label uppercase text-white/55 mb-1.5">
                    Número
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className="w-full bg-[#141414] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-neon rounded-sm text-center font-mono"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-label uppercase text-white/55 mb-1.5">
                    Posição
                  </label>
                  <select
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    className="w-full bg-[#141414] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-neon rounded-sm"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-label uppercase text-white/55 mb-1.5">
                  Nome
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#141414] border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-neon rounded-sm"
                  placeholder="Nome do atleta"
                  maxLength={40}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-neon text-black font-display text-base uppercase tracking-wider py-2.5 rounded-sm hover:bg-[#bbdc0d] transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Adicionar
              </button>
            </form>
          </div>

          {/* Roster list */}
          <div>
            <div className="relative mb-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar por nome ou número..."
                className="w-full bg-[#0f0f0f] border border-white/10 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-neon rounded-sm"
              />
            </div>

            {filtered.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-sm p-10 text-center">
                <Users size={32} className="mx-auto text-white/30 mb-3" />
                <div className="text-sm text-white/50">
                  {roster.length === 0
                    ? 'Plantel vazio. Adiciona o primeiro atleta.'
                    : 'Nenhum atleta encontrado.'}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((a) => (
                  <div
                    key={a.id}
                    className="border border-white/10 bg-[#0f0f0f] rounded-sm p-3 flex items-center gap-3 hover:border-white/25 transition-colors"
                  >
                    <div className="w-11 h-11 bg-neon text-black font-display text-xl flex items-center justify-center rounded-sm tabular-nums">
                      {a.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm uppercase tracking-wide truncate">
                        {a.name}
                      </div>
                      <div className="text-[10px] tracking-label uppercase text-white/50 mt-0.5">
                        {a.position}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(a.id, a.name)}
                      className="text-white/40 hover:text-red-400 transition-colors p-2"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
