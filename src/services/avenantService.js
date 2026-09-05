import http from "./http";

export const avenantService = {
  async list(contratId) {
    const { data } = await http.get("/avenant", { params: { contrat_id: contratId } });
    return data.data ?? [];
  },

  async save(payload) {
    const { data } = await http.post("/avenant", payload);
    return data;
  },

  async valider(id) {
    const { data } = await http.post(`/avenant/valider/${id}`);
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/avenant/delete/${id}`);
    return data;
  },
};
