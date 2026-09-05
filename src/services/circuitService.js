import http from "./http";
import { gql } from "./gql";

const FIELDS = `id module ordre role_id profil_code libelle statut_avant statut_apres actif created_at
  role { id designation }`;

export const circuitService = {
  async list({ module, actif, page = 1, count = 50 } = {}) {
    const data = await gql(`query($module:String,$actif:Boolean,$page:Int,$count:Int){
      circuitEtapesPaginated(module:$module,actif:$actif,page:$page,count:$count){
        data { ${FIELDS} } metadata { total current_page per_page last_page }
      }}`, { module: module || null, actif: actif ?? null, page, count });
    return data.circuitEtapesPaginated;
  },
  async save(payload) { const { data } = await http.post("/circuit/etape", payload); return data; },
  async reorder(ids) { const { data } = await http.post("/circuit/reorder", { ids }); return data; },
  async delete(id) { const { data } = await http.delete(`/circuit/etape/delete/${id}`); return data; },
};
