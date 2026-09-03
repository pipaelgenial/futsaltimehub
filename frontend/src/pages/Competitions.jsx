import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, Trophy, Check, X } from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import {
  apiListCompetitions,
  apiCreateCompetition,
  apiUpdateCompetition,
  apiDeleteCompetition,
  getSessionUser,
} from '../lib/api';

const COLORS = [
  '#d4ff1a', '#ef4444', '#3b82f6', '#10b981', '#f97316',
  '#a855f7', '#eab308', '#06b6d4', '#f43f5e', '#f5f5f5',
];

export default function Competitions() {
  const navigate = useNavigate();
  const sessionUser = getSessionUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLORS[0]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sessionUser) {
      navigate('/');
      return;
    }
    (async () => {
      const r = await apiListCompetitions();
      if (r.ok) setItems(r.competitions);
      setLoading(false);
    })();
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('INSERE O NOME DA COMPETIÇÃO');
      return;
    }
    setBusy(true);
    const r = await apiCreateCompetition({ name: newName.trim(), color: newColor });
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error.toUpperCase());
      return;
    }
    setItems((prev) => [...prev, r.competition].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName('');
    setNewColor(COLORS[0]);
    toast.success('COMPETIÇÃO CRIADA');
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditColor(c.color || COLORS[0]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    const r = await apiUpdateCompetition(editingId, { name: editName.trim(), color: editColor });
    if (!r.ok) {
      toast.error(r.error.toUpperCase());
      return;
    }
    setItems((prev) =>
      prev.map((c) => (c.id === editingId ? r.competition : c)).sort((a, b) => a.name.localeCompare(b.name))
    );
    cancelEdit();
    toast.success('COMPETIÇÃO ATUALIZADA');
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Eliminar "${c.name}"? Os jogos que a usam mantêm o nome guardado.`)) return;
    const r = await apiDeleteCompetition(c.id);
    if (!r.ok) {
      toast.error(r.error.toUpperCase());
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== c.id));
    toast.success('COMPETIÇÃO ELIMINADA');
  };

  if (!sessionUser) return null;

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="border-b border-white/10 px-5 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-20">
        <div className="flex items-center gap-6">
          <Logo size="sm" />
          <div className="hidden md:block border-l border-white/10 pl-6">
            <div className="text-[10px] tracking-label uppercase text-white/50">Competições</div>
            <div className="font-display text-base uppercase">Gestão</div>
          </div>
        </div>
        <Link
          to="/dashboard"
          className="text-xs uppercase tracking-label text-white/55 hover:text-neon flex items-center gap-2"
          data-testid="competitions-back"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </header>

      <main className="flex-1 px-5 lg:px-8 py-8 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <div className="text-neon text-[11px] tracking-label uppercase mb-2">Configuração</div>
          <h1 className="font-display text-4xl lg:text-5xl uppercase leading-none">
            Competições <span className="text-neon">·</span> {items.length}
          </h1>
          <p className="text-sm text-white/55 mt-3">
            Cria e organiza as competições onde a tua equipa joga. Vão aparecer como opção no menu
            de criação de jogo e nos filtros de estatísticas.
          </p>
        </div>

        {/* Add form */}
        <form
          onSubmit={handleAdd}
          className="mb-8 border border-white/10 bg-[#0f0f0f] rounded-sm p-4 lg:p-5"
        >
          <div className="text-[10px] tracking-label uppercase text-neon mb-3">Nova Competição</div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              data-testid="new-competition-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-[#141414] border border-white/10 px-4 py-2.5 text-sm outline-none focus:border-neon focus:bg-[#181818] rounded-sm uppercase tracking-wide"
              placeholder="LIGA PLACARD"
              maxLength={48}
            />
            <div className="flex gap-1.5 flex-wrap items-center">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-sm border-2 transition-all ${
                    newColor === c ? 'border-white scale-110' : 'border-white/15 hover:border-white/40'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={busy}
              data-testid="add-competition-btn"
              className="bg-neon text-black font-display text-sm uppercase tracking-wider px-4 py-2.5 rounded-sm hover:bg-[#bbdc0d] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Adicionar
            </button>
          </div>
        </form>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-neon" size={24} />
          </div>
        ) : items.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-sm p-10 text-center">
            <Trophy size={32} className="mx-auto text-white/30 mb-3" />
            <div className="font-display text-xl uppercase mb-1">Sem competições</div>
            <div className="text-sm text-white/50">
              Adiciona a tua primeira competição acima.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => {
              const isEditing = editingId === c.id;
              return (
                <div
                  key={c.id}
                  data-testid={`competition-row-${c.id}`}
                  className="border border-white/10 bg-[#0f0f0f] rounded-sm p-3 lg:p-4 flex items-center gap-3"
                >
                  {isEditing ? (
                    <>
                      <div className="flex gap-1 flex-wrap">
                        {COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => setEditColor(col)}
                            className={`w-5 h-5 rounded-sm border-2 ${
                              editColor === col ? 'border-white' : 'border-white/15'
                            }`}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-[#141414] border border-white/10 px-3 py-2 text-sm outline-none focus:border-neon rounded-sm uppercase"
                        maxLength={48}
                        autoFocus
                      />
                      <button
                        onClick={saveEdit}
                        className="text-neon hover:text-[#bbdc0d] p-1.5"
                        title="Gravar"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-white/50 hover:text-white p-1.5"
                        title="Cancelar"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className="w-3 h-8 rounded-sm shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <div className="flex-1 font-display text-lg uppercase tracking-wide truncate">
                        {c.name}
                      </div>
                      <button
                        onClick={() => startEdit(c)}
                        className="text-white/50 hover:text-neon p-1.5"
                        title="Editar"
                        data-testid={`edit-competition-${c.id}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-white/50 hover:text-red-400 p-1.5"
                        title="Eliminar"
                        data-testid={`delete-competition-${c.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
