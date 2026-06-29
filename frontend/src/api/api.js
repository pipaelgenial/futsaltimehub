import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// LOGIN
export const login = (email, password) =>
  api.post("/auth/login", { email, password });

// REGISTER
export const register = (name, email, password) =>
  api.post("/auth/register", { name, email, password });

// GET CURRENT USER
export const getMe = (token) =>
  api.get("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export default api;
