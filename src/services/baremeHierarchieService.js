import http from "./http";

/** Barème hiérarchique : général -> chantier -> contrat. */
export const baremeHierarchieService = {
  // ── Barème général
  async listGeneral() {
    const { data } = await http.get("/bareme-general");
    return data.data;
  },
  async addGeneral(payload) {
    const { data } = await http.post("/bareme-general", payload);
    return data;
  },
  async setPrixGeneral(id, payload) {
    const { data } = await http.post(`/bareme-general/${id}/prix`, payload);
    return data;
  },
  async historiqueGeneral(id) {
    const { data } = await http.get(`/bareme-general/${id}/historique`);
    return data.data;
  },
  async removeGeneral(id) {
    const { data } = await http.delete(`/bareme-general/${id}`);
    return data;
  },

  async importGeneral(payload) {
    const { data } = await http.post("/bareme-general/import", payload);
    return data.data;
  },

  // ── Chantier
  async importChantier(chantierId, payload) {
    const { data } = await http.post(`/chantier/${chantierId}/baremes/import`, payload);
    return data.data;
  },
  async listChantier(chantierId) {
    const { data } = await http.get(`/chantier/${chantierId}/baremes`);
    return data.data;
  },
  async setPrixChantier(chantierId, baremeId, payload) {
    const { data } = await http.put(`/chantier/${chantierId}/bareme/${baremeId}/prix`, payload);
    return data;
  },
  async resetChantier(chantierId, baremeId) {
    const { data } = await http.delete(`/chantier/${chantierId}/bareme/${baremeId}/prix`);
    return data;
  },
  async validerChantier(chantierId, baremeId) {
    const { data } = await http.post(`/chantier/${chantierId}/bareme/${baremeId}/valider`);
    return data;
  },

  async addContrat(contratId, payload) {
    const { data } = await http.post(`/contrat/${contratId}/bareme`, payload);
    return data;
  },

  // ── Contrat
  async listContrat(contratId) {
    const { data } = await http.get(`/contrat/${contratId}/baremes/effectifs`);
    return data.data;
  },
  async setPrixContrat(contratId, baremeId, payload) {
    const { data } = await http.put(`/contrat/${contratId}/bareme/${baremeId}/prix`, payload);
    return data;
  },
  async resetContrat(contratId, baremeId) {
    const { data } = await http.delete(`/contrat/${contratId}/bareme/${baremeId}/prix`);
    return data;
  },
  async importContrat(contratId, payload) {
    const { data } = await http.post(`/contrat/${contratId}/baremes/import`, payload);
    return data.data;
  },
  async validerContrat(contratBaremeId) {
    const { data } = await http.post(`/contrat/bareme/${contratBaremeId}/valider-prix`);
    return data;
  },
};
