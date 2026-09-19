import http from "./http";

const API = import.meta.env.VITE_API_BASE + "/api";

export const pieceJointeService = {
  async list(contrat_id) {
    const { data } = await http.get("/pieces-jointes", { params: { contrat_id } });
    return data.data;
  },

  async upload(contrat_id, categorie, fichier) {
    const fd = new FormData();
    fd.append("contrat_id", contrat_id);
    fd.append("categorie", categorie);
    fd.append("fichier", fichier);
    const { data } = await http.post("/pieces-jointes/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },

  downloadUrl(id) {
    return `${API}/pieces-jointes/${id}/download`;
  },

  async delete(id) {
    await http.delete(`/pieces-jointes/${id}`);
  },
};
