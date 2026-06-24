import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CheckCircle2, XCircle, Clock, Trash2, Search, LogOut,
  UserCheck, UserX, Mail, Calendar, RefreshCcw,
  ChevronDown, ChevronUp, KeyRound, ShieldCheck, Loader2,
} from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import {
  apiListUsers, apiPatchUser, apiDeleteUser, apiResetPassword,
  apiLogout, getSessionUser,
} from '../lib/api';
import { toast } from 'sonner';

export default function Admin() {
  const navigate = useNavigate();
  const sessionUser = getSessionUser();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    if (!sessionUser || !sessionUser.is_admin) {
      navigate('/');
      return;
    }
    refresh();
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => {
    setLoading(true);
    const res = await apiListUsers();
    if (res.ok) setUsers(res.users);
    else toast.error(res.error.toUpperCase());
    setLoading(false);
  };

  const stats = useMemo(() => {
    const pending = users.filter((u) => u.status === 'pending').length;
    const approved = users.filter((u) => u.status === 'approved').length;
    const rejected = users.filter((u) => u.status === 'rejected').length;
    const admins = users.filter((u) => u.is_admin).length;
    return { total: users.length, pending, approved, rejected, admins };
  }, [users]);

  const filteredUsers = useMemo(() => {
    let arr = [...users];
    if (statusFilter !== 'all') arr = arr.filter((u) => u.status === statusFilter);
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q));
    }
    return arr.sort((a, b) => {
      if (a.status !== b.status) {
        const order = { pending: 0, approved: 1, rejected: 2 };
        return (order[a.status] ?? 3) - (order[b.status] ?? 3);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [users, query, statusFilter]);

  if (!sessionUser) return null;

  const approveUser = async (id) => {
    const r = await apiPatchUser(id, { status: 'approved' });
    if (!r.ok) { toast.error(r.error.toUpperCase()); return; }
    await refresh();
    toast.success('UTILIZADOR APROVADO');
  };
  const rejectUser = async (id) => {
    if (!window.confirm('Rejeitar este utilizador?')) return;
    const r = await apiPatchUser(id, { status: 'rejected' });
    if (!r.ok) { toast.error(r.error.toUpperCase()); return; }
    await refresh();
    toast.message('UTILIZADOR REJEITADO');
  };
  const reactivateUser = async (id) => {
    const r = await apiPatchUser(id, { status: 'approved' });
    if (!r.ok) { toast.error(r.error.toUpperCase()); return; }
    await refresh();
    toast.success('UTILIZADOR REATIVADO');
  };
  const removeUser = async (id, isAdmin) => {
    if (isAdmin) { toast.error('NÃO PODES ELIMINAR ADMIN'); return; }
    if (!window.confirm('Eliminar este utilizador definitivamente? Todos os seus dados serão apagados.')) return;
    const r = await apiDeleteUser(id);
    if (!r.ok) { toast.error(r.error.toUpperCase()); return; }
    await refresh();
    toast.success('UTILIZADOR ELIMINADO');
  };
  const toggleAdmin = async (id, currentlyAdmin) => {
    if (currentlyAdmin && id === sessionUser.id) {
      toast.error('NÃO PODES REMOVER O TEU PRÓPRIO ADMIN');
      return;
    }
    if (!window.confirm(currentlyAdmin ? 'Remover permissões de admin?' : 'Promover a administrador?')) return;
    const r = await apiPatchUser(id, { is_admin: !currentlyAdmin });
    if (!r.ok) { toast.error(r.error.toUpperCase()); return; }
    await refresh();
    toast.success(currentlyAdmin ? 'ADMIN REMOVIDO' : 'PROMOVIDO A ADMIN');
  };
  const resetPassword = async (id, name) => {
    const newPwd = window.prompt(`Nova password para ${name} (mínimo 6 caracteres):`);
    if (!newPwd) return;
    if (newPwd.length < 6) { toast.error('MÍNIMO 6 CARACTERES'); return; }
    const r = await apiResetPassword(id, newPwd);
    if (!r.ok) { toast.error(r.error.toUpperCase()); return; }
    toast.success('PASSWORD ATUALIZADA');
  };

  const handleLogout = () => {
    apiLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="border-b border-white/10 px-6 lg:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-6">
            <div className="w-8 h-8 bg-neon text-black rounded-sm flex items-center justify-center">
              <ShieldCheck size={16} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[10px] tracking-label uppercase text-neon">Painel Administrador</div>
              <div className="font-display text-base uppercase">{sessionUser.name}</div>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-xs uppercase tracking-label text-white/60 hover:text-neon transition-colors">
          <LogOut size={14} /> Sair
        </button>
      </header>

      <main className="flex-1 px-6 lg:px-10 py-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 fade-up">
          <div className="text-neon text-[11px] tracking-label uppercase mb-3">
            Administração · {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <h1 className="font-display text-5xl lg:text-6xl uppercase leading-none">
            Painel <span className="text-neon">Admin</span>
          </h1>
          <p className="text-sm text-white/55 mt-3 max-w-2xl">
            Gere utilizadores, valida registos pendentes e supervisiona acessos.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <StatTile icon={Users} label="Total" value={stats.total} />
          <StatTile icon={Clock} label="Pendentes" value={stats.pending} accent={stats.pending > 0 ? 'orange' : null} />
          <StatTile icon={CheckCircle2} label="Aprovados" value={stats.approved} accent="neon" />
          <StatTile icon={XCircle} label="Rejeitados" value={stats.rejected} accent={stats.rejected > 0 ? 'red' : null} />
          <StatTile icon={ShieldCheck} label="Admins" value={stats.admins} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Procurar por email ou nome..."
              className="w-full bg-[#0f0f0f] border border-white/10 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-neon rounded-sm"
            />
          </div>
          <div className="flex gap-1 border border-white/10 rounded-sm bg-[#0f0f0f] p-1">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'approved', label: 'Aprovados' },
              { id: 'rejected', label: 'Rejeitados' },
            ].map((f) => (
              <button key={f.id} onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 text-[10px] tracking-label uppercase rounded-sm transition-colors ${
                  statusFilter === f.id ? 'bg-neon text-black font-semibold' : 'text-white/55 hover:text-white'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={refresh} disabled={loading}
            className="px-3 py-2 border border-white/10 bg-[#0f0f0f] rounded-sm text-white/55 hover:text-neon hover:border-neon/30 flex items-center gap-2 text-[10px] tracking-label uppercase disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />} Atualizar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={32} className="animate-spin text-neon" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-sm p-12 text-center">
            <Users size={40} className="mx-auto text-white/30 mb-3" />
            <div className="text-sm text-white/50">
              {users.length === 0 ? 'Sem utilizadores registados.' : 'Nenhum resultado para os filtros.'}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((u) => {
              const isExpanded = expandedUser === u.id;
              const isSelf = u.id === sessionUser.id;
              return (
                <div key={u.id} className={`border rounded-sm transition-colors ${
                  u.status === 'pending' ? 'border-orange-400/30 bg-orange-400/5' :
                  u.status === 'rejected' ? 'border-red-500/30 bg-red-500/5' :
                  'border-white/10 bg-[#0f0f0f]'
                }`}>
                  <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-11 h-11 rounded-sm flex items-center justify-center font-display text-lg shrink-0 ${
                        u.is_admin ? 'bg-neon text-black' : 'bg-white/10 text-white'
                      }`}>
                        {u.is_admin ? <ShieldCheck size={18} /> : u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold uppercase truncate flex items-center gap-2">
                          {u.name}
                          {isSelf && <span className="text-[9px] tracking-label uppercase text-neon bg-neon/15 px-1.5 py-0.5 rounded-sm">Tu</span>}
                          {u.is_admin && <span className="text-[9px] tracking-label uppercase text-neon bg-neon/15 px-1.5 py-0.5 rounded-sm">Admin</span>}
                        </div>
                        <div className="text-xs text-white/55 truncate flex items-center gap-2 mt-0.5">
                          <Mail size={11} /> {u.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={u.status} />
                      <div className="text-[10px] tracking-label uppercase text-white/40 hidden lg:flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(u.created_at).toLocaleDateString('pt-PT')}
                      </div>
                      <button onClick={() => setExpandedUser(isExpanded ? null : u.id)} className="text-white/40 hover:text-white p-1">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/10 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {u.status === 'pending' && (
                        <>
                          <ActionBtn icon={UserCheck} label="Aprovar" color="neon" onClick={() => approveUser(u.id)} />
                          <ActionBtn icon={UserX} label="Rejeitar" color="red" onClick={() => rejectUser(u.id)} />
                        </>
                      )}
                      {u.status === 'rejected' && (
                        <ActionBtn icon={UserCheck} label="Reativar" color="neon" onClick={() => reactivateUser(u.id)} />
                      )}
                      {u.status === 'approved' && !u.is_admin && (
                        <ActionBtn icon={XCircle} label="Suspender" color="red" onClick={() => rejectUser(u.id)} />
                      )}
                      <ActionBtn icon={ShieldCheck} label={u.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                        color={u.is_admin ? 'orange' : 'neon'} onClick={() => toggleAdmin(u.id, u.is_admin)}
                        disabled={isSelf && u.is_admin} />
                      <ActionBtn icon={KeyRound} label="Repor Password" color="blue" onClick={() => resetPassword(u.id, u.name)} />
                      <ActionBtn icon={Trash2} label="Eliminar" color="red" onClick={() => removeUser(u.id, u.is_admin)} disabled={u.is_admin} />
                    </div>
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

function StatTile({ icon: Icon, label, value, accent }) {
  const colors = { neon: 'text-neon', orange: 'text-orange-400', red: 'text-red-400' };
  return (
    <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-white/5 text-white/70 rounded-sm flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-[10px] tracking-label uppercase text-white/50">{label}</div>
        <div className={`font-display text-2xl tabular-nums ${accent ? colors[accent] : 'text-white'}`}>{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'pending') return <span className="inline-flex items-center gap-1.5 text-[10px] tracking-label uppercase bg-orange-400/15 text-orange-300 px-2 py-1 rounded-sm font-semibold"><Clock size={11} /> Pendente</span>;
  if (status === 'approved') return <span className="inline-flex items-center gap-1.5 text-[10px] tracking-label uppercase bg-neon/15 text-neon px-2 py-1 rounded-sm font-semibold"><CheckCircle2 size={11} /> Aprovado</span>;
  return <span className="inline-flex items-center gap-1.5 text-[10px] tracking-label uppercase bg-red-500/15 text-red-400 px-2 py-1 rounded-sm font-semibold"><XCircle size={11} /> Rejeitado</span>;
}

function ActionBtn({ icon: Icon, label, color, onClick, disabled }) {
  const palette = {
    neon: 'bg-neon/15 border-neon/40 text-neon hover:bg-neon/25',
    red: 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25',
    orange: 'bg-orange-400/15 border-orange-400/40 text-orange-300 hover:bg-orange-400/25',
    blue: 'bg-blue-400/15 border-blue-400/40 text-blue-300 hover:bg-blue-400/25',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 border text-[10px] tracking-label uppercase font-semibold px-3 py-2 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${palette[color] || palette.neon}`}>
      <Icon size={12} /> {label}
    </button>
  );
}
