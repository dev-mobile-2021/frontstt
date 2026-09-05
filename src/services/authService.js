import http from "./http";

export const authService = {
  async login(login, password) {
    const { data } = await http.post("/user/connexion", { login, password });
    // Réponse : { utilisateur, token }
    localStorage.setItem("stt_token", data.token);
    localStorage.setItem("stt_user", JSON.stringify(data.utilisateur));
    return data;
  },

  logout() {
    localStorage.removeItem("stt_token");
    localStorage.removeItem("stt_user");
  },

  getStoredUser() {
    try {
      const raw = localStorage.getItem("stt_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem("stt_token");
  },

  isAuthenticated() {
    return !!localStorage.getItem("stt_token");
  },
};
