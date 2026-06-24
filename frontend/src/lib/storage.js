// LocalStorage helpers for Futsal Time Hub
// Keys
const K = {
  USER: 'flh_user',
  TEAM: 'flh_team',
  ROSTER: 'flh_roster',
  MATCHES: 'flh_matches',
  ACTIVE: 'flh_active_match',
  USERS: 'flh_users',
  USER_DATA: 'flh_user_data', // per-user team/roster/matches store
};

const read = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const clear = (k) => localStorage.removeItem(k);

// User (session)
export const getUser = () => read(K.USER, null);
export const setUser = (u) => write(K.USER, u);
export const clearUser = () => clear(K.USER);

// Registered users
export const DEFAULT_ADMIN = {
  email: 'pedrompsantos84@gmail.com',
  password: 'Amarense',
  name: 'Pedro Santos',
};

export const getUsers = () => read(K.USERS, []);
export const setUsers = (arr) => write(K.USERS, arr);

export const initDefaultAdmin = () => {
  const users = getUsers();
  if (users.length === 0) {
    const adminUser = {
      id: 1,
      email: DEFAULT_ADMIN.email,
      password: DEFAULT_ADMIN.password,
      name: DEFAULT_ADMIN.name,
      status: 'approved',
      isAdmin: true,
      createdAt: new Date().toISOString(),
    };
    setUsers([adminUser]);
  }
};

export const findUserByEmail = (email) =>
  getUsers().find((u) => u.email.toLowerCase() === (email || '').toLowerCase());

export const registerUser = ({ name, email, password }) => {
  const users = getUsers();
  if (findUserByEmail(email)) {
    return { ok: false, error: 'Email já registado' };
  }
  const newUser = {
    id: users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1,
    email: email.toLowerCase(),
    password,
    name,
    status: 'pending', // pending | approved | rejected
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
  setUsers([...users, newUser]);
  return { ok: true, user: newUser };
};

export const updateUser = (id, patch) => {
  setUsers(getUsers().map((u) => (u.id === id ? { ...u, ...patch } : u)));
};

export const deleteUser = (id) => {
  setUsers(getUsers().filter((u) => u.id !== id));
};

export const authenticate = (email, password) => {
  const user = findUserByEmail(email);
  if (!user) return { ok: false, error: 'Email não registado' };
  if (user.password !== password) return { ok: false, error: 'Password incorreta' };
  if (user.status === 'pending') return { ok: false, error: 'Conta aguarda aprovação de um administrador' };
  if (user.status === 'rejected') return { ok: false, error: 'Conta rejeitada. Contacta o administrador.' };
  return { ok: true, user };
};

// Team
export const getTeam = () => read(K.TEAM, null);
export const setTeam = (t) => write(K.TEAM, t);
export const clearTeam = () => clear(K.TEAM);

// Roster (athletes)
export const getRoster = () => read(K.ROSTER, []);
export const setRoster = (r) => write(K.ROSTER, r);
export const addAthlete = (a) => {
  const r = getRoster();
  const newId = r.length ? Math.max(...r.map((x) => x.id)) + 1 : 1;
  const athlete = { id: newId, ...a };
  setRoster([...r, athlete]);
  return athlete;
};
export const removeAthlete = (id) => {
  setRoster(getRoster().filter((a) => a.id !== id));
};
export const updateAthlete = (id, patch) => {
  setRoster(getRoster().map((a) => (a.id === id ? { ...a, ...patch } : a)));
};

// Matches (history)
export const getMatches = () => read(K.MATCHES, []);
export const saveMatch = (match) => {
  const arr = getMatches();
  arr.unshift({ ...match, id: match.id || Date.now() });
  write(K.MATCHES, arr);
  return arr[0];
};
export const deleteMatch = (id) => {
  write(K.MATCHES, getMatches().filter((m) => m.id !== id));
};

// Active match (current ongoing)
export const getActiveMatch = () => read(K.ACTIVE, null);
export const setActiveMatch = (m) => write(K.ACTIVE, m);
export const clearActiveMatch = () => clear(K.ACTIVE);

export const POSITIONS = ['GR', 'FIXO', 'ALA', 'PIVOT'];

export const HALF_DURATION = 20 * 60; // 20 minutes in seconds
