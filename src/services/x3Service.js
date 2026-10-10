import http from "./http";

export const x3Service = {
  async getCessionsMtx({ chantier_code, periode_debut, periode_fin }) {
    const { data } = await http.get("/x3/mtx", {
      params: { chantier_code, periode_debut, periode_fin },
    });
    return data.data ?? [];
  },

  /** Référentiel articles X3 (synchronisé localement). */
  async articles({ search, classe, limit = 50 } = {}) {
    const { data } = await http.get("/x3/articles", { params: { search: search || undefined, classe: classe || undefined, limit } });
    return data.data ?? [];
  },

  /** BC X3 déjà liés à un contrat. */
  async bonsCommandeContrat(contratId) {
    const { data } = await http.get(`/contrat/${contratId}/bons-commande`);
    return data.data ?? [];
  },

  /** Interroge X3 (chantier + STT du contrat) sans rien enregistrer. */
  async rechercherBonsCommande(contratId) {
    const { data } = await http.get(`/contrat/${contratId}/bons-commande/x3`);
    return data.data ?? [];
  },

  async lierBonsCommande(contratId, numeros) {
    const { data } = await http.post(`/contrat/${contratId}/bons-commande`, { numeros });
    return data;
  },

  async delierBonCommande(id) {
    const { data } = await http.delete(`/bon-commande/${id}/lien`);
    return data;
  },

  /** Ajoute un chantier / un sous-traitant existant dans X3 (remplace la création libre). */
  async ajouterChantier(codeX3) {
    const { data } = await http.post("/chantier/x3", { code_x3: codeX3 });
    return data.data;
  },

  async ajouterSoustraitant(codeX3) {
    const { data } = await http.post("/soustraitant/x3", { code_x3: codeX3 });
    return data.data;
  },

  /** Synchronise uniquement ce chantier (désignation, pays). */
  async synchroniserChantier(id) {
    const { data } = await http.post(`/chantier/${id}/x3-sync`);
    return data.data;
  },

  /** Synchronisation descendante X3 -> STT. module : chantiers | soustraitants | articles */
  async sync(module, params = {}) {
    const { data } = await http.post(`/x3/sync/${module}`, params);
    return data.data;
  },

  async syncStatus() {
    const { data } = await http.get("/x3/sync/status");
    return data.data ?? {};
  },
};
