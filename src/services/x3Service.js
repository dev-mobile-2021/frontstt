import http from "./http";

export const x3Service = {
  async getCessionsMtx({ chantier_code, periode_debut, periode_fin }) {
    const { data } = await http.get("/x3/mtx", {
      params: { chantier_code, periode_debut, periode_fin },
    });
    return data.data ?? [];
  },
};
