// LocalStorage helpers for Futsal Time Hub
// Keys
const K = {
  USER: 'flh_user',
  TEAM: 'flh_team',
  ROSTER: 'flh_roster',
  MATCHES: 'flh_matches',
  ACTIVE: 'flh_active_match',
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

// User
export const getUser = () => read(K.USER, null);
export const setUser = (u) => write(K.USER, u);
export const clearUser = () => clear(K.USER);

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
