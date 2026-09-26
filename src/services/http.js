import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE + "/api",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

// Injecte le token à chaque requête
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("stt_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → vide le storage et redirige vers login
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginCall = err.config?.url?.includes("/user/connexion");
    if (err.response?.status === 401 && !isLoginCall) {
      localStorage.removeItem("stt_token");
      localStorage.removeItem("stt_user");
      window.location.href = "/sous-traitance/login";
    }
    return Promise.reject(err);
  }
);

export default http;
