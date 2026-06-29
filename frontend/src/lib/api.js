// API client for Futsal Time Hub
import axios from 'axios';

const API = "https://futsaltimehub.onrender.com/api";

const TOKEN_KEY = 'flh_token';
const USER_KEY = 'flh_user';

// Axios instance
const client = axios.create({
  baseURL: API,
});

// Attach token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handler — clear session and redirect to login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (window.location.pathname !== '/' && window.location.pathname !== '/register') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Token & session helpers
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getSessionUser = () => {
  try {
    const v = localStorage.getItem(USER_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};
export const setSessionUser = (u) => localStorage.setItem(USER_KEY, JSON.stringify(u));
export const clearSessionUser = () => localStorage.removeItem(USER_KEY);

// Error helper
const extractError = (e) => {
  return e?.response?.data?.detail || e?.message || 'Erro de rede';
};

// ============ AUTH ============
export const apiRegister = async ({ name, email, password }) => {
  try {
    const { data } = await client.post('/auth/register', { name, email, password });
    return { ok: true, user: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiLogin = async ({ email, password }) => {
  try {
    const { data } = await client.post('/auth/login', { email, password });
    setToken(data.access_token);
    setSessionUser(data.user);
    return { ok: true, user: data.user, token: data.access_token };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiMe = async () => {
  try {
    const { data } = await client.get('/auth/me');
    setSessionUser(data);
    return { ok: true, user: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiLogout = () => {
  clearToken();
  clearSessionUser();
};

// ============ ADMIN ============
export const apiListUsers = async () => {
  try {
    const { data } = await client.get('/admin/users');
    return { ok: true, users: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiPatchUser = async (id, patch) => {
  try {
    const { data } = await client.patch(`/admin/users/${id}`, patch);
    return { ok: true, user: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiDeleteUser = async (id) => {
  try {
    await client.delete(`/admin/users/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiResetPassword = async (id, password) => {
  try {
    await client.post(`/admin/users/${id}/password`, { password });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

// ============ TEAM ============
export const apiGetTeam = async () => {
  try {
    const { data } = await client.get('/team');
    return { ok: true, team: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiCreateTeam = async ({ name, coach, color }) => {
  try {
    const { data } = await client.post('/team', { name, coach, color });
    return { ok: true, team: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiDeleteTeam = async () => {
  try {
    await client.delete('/team');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

// ============ ATHLETES ============
export const apiListAthletes = async () => {
  try {
    const { data } = await client.get('/athletes');
    return { ok: true, athletes: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiAddAthlete = async ({ number, name, position }) => {
  try {
    const { data } = await client.post('/athletes', { number, name, position });
    return { ok: true, athlete: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiDeleteAthlete = async (id) => {
  try {
    await client.delete(`/athletes/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

// ============ MATCHES ============
export const apiListMatches = async () => {
  try {
    const { data } = await client.get('/matches');
    return { ok: true, matches: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiSaveMatch = async (match) => {
  try {
    const { data } = await client.post('/matches', match);
    return { ok: true, match: data };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

export const apiDeleteMatch = async (id) => {
  try {
    await client.delete(`/matches/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: extractError(e) };
  }
};

// ============ LOCAL (active match stays in localStorage) ============
const ACTIVE_KEY = 'flh_active_match';
export const getActiveMatch = () => {
  try {
    const v = localStorage.getItem(ACTIVE_KEY);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
};
export const setActiveMatch = (m) => localStorage.setItem(ACTIVE_KEY, JSON.stringify(m));
export const clearActiveMatch = () => localStorage.removeItem(ACTIVE_KEY);

export const POSITIONS = ['GR', 'FIXO', 'ALA', 'PIVOT'];
export const HALF_DURATION = 20 * 60; // 20 minutes in seconds
