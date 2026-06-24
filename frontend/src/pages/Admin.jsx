import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Users, CheckCircle2, XCircle, Clock, Trash2, Search, LogOut,
  UserCheck, UserX, Mail, Calendar, AlertTriangle, RefreshCcw, Database,
  ChevronDown, ChevronUp, KeyRound, ShieldCheck,
} from 'lucide-react';
import Logo from '../components/Logo';
import Footer from '../components/Footer';
import {
  getUser, clearUser, getUsers, updateUser, deleteUser,
  getTeam, getRoster, getMatches, getActiveMatch,
  clearTeam, setRoster, clearActiveMatch,
} from '../lib/storage';
import { formatTimeLong } from '../lib/time';
import { toast } from 'sonner';

export default function Admin() {
  const navigate = useNavigate();
  const sessionUser = getUser();

  const [tab, setTab] = useState('users');
  const [users, setUsersState] = useState(getUsers());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);

  // Stats
  const stats = useMemo(() => {
    const pending = users.filter((u) => u.status === 'pending').length;
    const approved = users.filter((u) => u.status === 'approved').length;
    const rejected = users.filter((u) => u.status === 'rejected').length;
    const admins = users.filter((u) => u.isAdmin).length;
    return { total: users.length, pending, approved, rejected, admins };
  }, [users]);

  // Filtering
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
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [users, query, statusFilter]);

  // Guard (AFTER hooks)
  if (!sessionUser || !sessionUser.isAdmin) {
    navigate('/');
    return null;
  }

  const refresh = () => setUsersState(getUsers());

  // Local team/data summary (this browser instance)
  const team = getTeam();
  const roster = getRoster();
  const matches = getMatches();
  const activeMatch = getActiveMatch();

  // Actions
  const approveUser = (id) => {
    updateUser(id, { status: 'approved' });
    refresh();
    toast.success('UTILIZADOR APROVADO');
  };
  const rejectUser = (id) => {
    if (!window.confirm('Rejeitar este utilizador?')) return;
    updateUser(id, { status: 'rejected' });
    refresh();
    toast.message('UTILIZADOR REJEITADO');
  };
  const reactivateUser = (id) => {
    updateUser(id, { status: 'approved' });
    refresh();
    toast.success('UTILIZADOR REATIVADO');
  };
  const removeUser = (id, isAdmin) => {
    if (isAdmin) {
      toast.error('NÃO PODES ELIMINAR ADMIN');
      return;
    }
    if (!window.confirm('Eliminar este utilizador definitivamente?')) return;
    deleteUser(id);
    refresh();
    toast.success('UTILIZADOR ELIMINADO');
  };
  const toggleAdmin = (id, currentlyAdmin) => {
    if (currentlyAdmin && id === sessionUser.id) {
      toast.error('NÃO PODES REMOVER O TEU PRÓPRIO ADMIN');
      return;
    }
    if (!window.confirm(currentlyAdmin ? 'Remover permissões de admin?' : 'Promover a administrador?')) return;
    updateUser(id, { isAdmin: !currentlyAdmin });
    refresh();
    toast.success(currentlyAdmin ? 'ADMIN REMOVIDO' : 'PROMOVIDO A ADMIN');
  };
  const resetPassword = (id, name) => {
    const newPwd = window.prompt(`Nova password para ${name} (mínimo 6 caracteres):`);
    if (!newPwd) return;
    if (newPwd.length < 6) {
      toast.error('MÍNIMO 6 CARACTERES');
      return;
    }
    updateUser(id, { password: newPwd });
    refresh();
    toast.success('PASSWORD ATUALIZADA');
  };

  const handleLogout = () => {
    clearUser();
    navigate('/');
  };

  const handleWipeLocalData = () => {
    if (!window.confirm('Apagar dados desta sessão (equipa, plantel, jogos, jogo em curso)? Os utilizadores registados NÃO são apagados.')) return;
    clearTeam();
    setRoster([]);
    clearActiveMatch();
    localStorage.removeItem('flh_matches');
    toast.success('DADOS LOCAIS LIMPOS');
    window.location.reload();
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
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs uppercase tracking-label text-white/60 hover:text-neon transition-colors"
        >
          <LogOut size={14} /> Sair
        </button>
      </header>

      <main className="flex-1 px-6 lg:px-10 py-8 max-w-7xl mx-auto w-full">
        {/* Hero */}
        <div className="mb-8 fade-up">
          <div className="text-neon text-[11px] tracking-label uppercase mb-3">
            Administração · {new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <h1 className="font-display text-5xl lg:text-6xl uppercase leading-none">
            Painel <span className="text-neon">Admin</span>
          </h1>
          <p className="text-sm text-white/55 mt-3 max-w-2xl">
            Gere utilizadores, valida registos pendentes e supervisiona dados da aplicação.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <StatTile icon={Users} label="Total" value={stats.total} />
          <StatTile icon={Clock} label="Pendentes" value={stats.pending} accent={stats.pending > 0 ? 'orange' : null} />
          <StatTile icon={CheckCircle2} label="Aprovados" value={stats.approved} accent="neon" />
          <StatTile icon={XCircle} label="Rejeitados" value={stats.rejected} accent={stats.rejected > 0 ? 'red' : null} />
          <StatTile icon={ShieldCheck} label="Admins" value={stats.admins} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 border-b border-white/10">
          {[
            { id: 'users', label: 'Utilizadores', icon: Users },
            { id: 'data', label: 'Dados da Sessão', icon: Database },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 font-display text-sm uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                  active
                    ? 'text-neon border-neon'
                    : 'text-white/50 border-transparent hover:text-white'
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'users' && (
          <section className="fade-up">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
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
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1.5 text-[10px] tracking-label uppercase rounded-sm transition-colors ${
                      statusFilter === f.id
                        ? 'bg-neon text-black font-semibold'
                        : 'text-white/55 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                onClick={refresh}
                className="px-3 py-2 border border-white/10 bg-[#0f0f0f] rounded-sm text-white/55 hover:text-neon hover:border-neon/30 flex items-center gap-2 text-[10px] tracking-label uppercase"
              >
                <RefreshCcw size={14} /> Atualizar
              </button>
            </div>

            {/* Users list */}
            {filteredUsers.length === 0 ? (
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
                    <div
                      key={u.id}
                      className={`border rounded-sm transition-colors ${
                        u.status === 'pending' ? 'border-orange-400/30 bg-orange-400/5' :
                        u.status === 'rejected' ? 'border-red-500/30 bg-red-500/5' :
                        'border-white/10 bg-[#0f0f0f]'
                      }`}
                    >
                      <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-11 h-11 rounded-sm flex items-center justify-center font-display text-lg shrink-0 ${
                            u.isAdmin ? 'bg-neon text-black' : 'bg-white/10 text-white'
                          }`}>
                            {u.isAdmin ? <ShieldCheck size={18} /> : u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold uppercase truncate flex items-center gap-2">
                              {u.name}
                              {isSelf && (
                                <span className="text-[9px] tracking-label uppercase text-neon bg-neon/15 px-1.5 py-0.5 rounded-sm">
                                  Tu
                                </span>
                              )}
                              {u.isAdmin && (
                                <span className="text-[9px] tracking-label uppercase text-neon bg-neon/15 px-1.5 py-0.5 rounded-sm">
                                  Admin
                                </span>
                              )}
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
                            {new Date(u.createdAt).toLocaleDateString('pt-PT')}
                          </div>
                          <button
                            onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                            className="text-white/40 hover:text-white p-1"
                          >
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
                          {u.status === 'approved' && !u.isAdmin && (
                            <ActionBtn icon={XCircle} label="Suspender" color="red" onClick={() => rejectUser(u.id)} />
                          )}
                          <ActionBtn
                            icon={ShieldCheck}
                            label={u.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                            color={u.isAdmin ? 'orange' : 'neon'}
                            onClick={() => toggleAdmin(u.id, u.isAdmin)}
                            disabled={isSelf && u.isAdmin}
                          />
                          <ActionBtn
                            icon={KeyRound}
                            label="Repor Password"
                            color="blue"
                            onClick={() => resetPassword(u.id, u.name)}
                          />
                          <ActionBtn
                            icon={Trash2}
                            label="Eliminar"
                            color="red"
                            onClick={() => removeUser(u.id, u.isAdmin)}
                            disabled={u.isAdmin}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'data' && (
          <section className="fade-up space-y-5">
            <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-neon/15 text-neon rounded-sm flex items-center justify-center">
                  <Database size={18} />
                </div>
                <div>
                  <h2 className="font-display text-xl uppercase">Dados desta Sessão</h2>
                  <div className="text-[10px] tracking-label uppercase text-white/40">
                    Equipa, plantel e histórico armazenados localmente (browser).
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <DataTile label="Equipa" value={team ? team.name : '—'} sub={team ? `criada em ${new Date(team.createdAt).toLocaleDateString('pt-PT')}` : 'Sem equipa'} />
                <DataTile label="Plantel" value={roster.length} sub={roster.length === 1 ? 'atleta' : 'atletas'} />
                <DataTile label="Jogos" value={matches.length} sub="no histórico" />
                <DataTile
                  label="Tempo Total"
                  value={formatTimeLong(matches.reduce((s, m) => s + (m.totalDuration || 0), 0))}
                  sub="minutos gravados"
                />
              </div>

              {activeMatch && (
                <div className="mt-4 border border-neon/30 bg-[#161b05] rounded-sm p-3 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 live-dot" />
                  <div className="flex-1">
                    <div className="text-[10px] tracking-label uppercase text-neon">Jogo em curso</div>
                    <div className="font-display text-sm uppercase">
                      vs {activeMatch.opponent} · {activeMatch.half}.ª parte
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent matches */}
            <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-5">
              <h2 className="font-display text-xl uppercase mb-4">Jogos Registados</h2>
              {matches.length === 0 ? (
                <div className="text-sm text-white/50 italic">Sem jogos registados nesta sessão.</div>
              ) : (
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {matches.slice(0, 50).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm border border-white/5 rounded-sm px-3 py-2 hover:bg-white/5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-[10px] tracking-label uppercase text-white/45 w-24 shrink-0">
                          {new Date(m.date).toLocaleDateString('pt-PT')}
                        </span>
                        <span className="font-display uppercase truncate">
                          {m.teamName || team?.name} <span className="text-white/40">vs</span> {m.opponent}
                        </span>
                      </div>
                      {(typeof m.homeScore === 'number') && (
                        <span className="font-mono text-sm tabular-nums shrink-0">
                          <span className={m.homeScore > m.awayScore ? 'text-neon' : 'text-white/70'}>{m.homeScore}</span>
                          <span className="text-white/30 mx-1.5">·</span>
                          <span className={m.awayScore > m.homeScore ? 'text-red-400' : 'text-white/70'}>{m.awayScore}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="border border-red-500/30 bg-red-500/5 rounded-sm p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/15 text-red-400 rounded-sm flex items-center justify-center">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h3 className="font-display text-base uppercase">Limpar Dados Locais</h3>
                    <div className="text-[10px] tracking-label uppercase text-white/50 mt-0.5">
                      Apaga equipa, plantel, jogos e jogo em curso desta sessão. Utilizadores registados mantêm-se.
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleWipeLocalData}
                  className="text-xs uppercase tracking-label bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 flex items-center gap-2 px-4 py-2 rounded-sm transition-colors font-semibold"
                >
                  <Trash2 size={12} /> Limpar
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent }) {
  const colors = {
    neon: 'text-neon',
    orange: 'text-orange-400',
    red: 'text-red-400',
  };
  return (
    <div className="border border-white/10 bg-[#0f0f0f] rounded-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-white/5 text-white/70 rounded-sm flex items-center justify-center">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-[10px] tracking-label uppercase text-white/50">{label}</div>
        <div className={`font-display text-2xl tabular-nums ${accent ? colors[accent] : 'text-white'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-label uppercase bg-orange-400/15 text-orange-300 px-2 py-1 rounded-sm font-semibold">
        <Clock size={11} /> Pendente
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] tracking-label uppercase bg-neon/15 text-neon px-2 py-1 rounded-sm font-semibold">
        <CheckCircle2 size={11} /> Aprovado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] tracking-label uppercase bg-red-500/15 text-red-400 px-2 py-1 rounded-sm font-semibold">
      <XCircle size={11} /> Rejeitado
    </span>
  );
}

function ActionBtn({ icon: Icon, label, color, onClick, disabled }) {
  const palette = {
    neon: 'bg-neon/15 border-neon/40 text-neon hover:bg-neon/25',
    red: 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25',
    orange: 'bg-orange-400/15 border-orange-400/40 text-orange-300 hover:bg-orange-400/25',
    blue: 'bg-blue-400/15 border-blue-400/40 text-blue-300 hover:bg-blue-400/25',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 border text-[10px] tracking-label uppercase font-semibold px-3 py-2 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${palette[color] || palette.neon}`}
    >
      <Icon size={12} /> {label}
    </button>
  );
}

function DataTile({ label, value, sub }) {
  return (
    <div className="bg-black/40 border border-white/5 rounded-sm p-3">
      <div className="text-[10px] tracking-label uppercase text-white/50">{label}</div>
      <div className="font-display text-xl text-white tabular-nums mt-1 truncate">{value}</div>
      <div className="text-[10px] tracking-label uppercase text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}
