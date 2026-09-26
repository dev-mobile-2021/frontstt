import http from "./http";

export const contratBaremeService = {
  async list(contratId) {
    const { data } = await http.get(`/contrat/${contratId}/baremes`);
    return data.data ?? [];
  },
  async add(contratId, payload) {
    const { data } = await http.post(`/contrat/${contratId}/bareme`, payload);
    return data;
  },
  async updatePrix(id, prix_contrat) {
    const { data } = await http.put(`/contrat/bareme/${id}`, { prix_contrat });
    return data;
  },
  async validerPrix(id) {
    const { data } = await http.post(`/contrat/bareme/${id}/valider-prix`);
    return data;
  },
  async remove(id) {
    const { data } = await http.delete(`/contrat/bareme/${id}`);
    return data;
  },
};
