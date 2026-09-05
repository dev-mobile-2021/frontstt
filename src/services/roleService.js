import http from "./http";
import { gql } from "./gql";

const FIELDS = `id designation description`;

export const roleService = {
  async list({ page = 1, count = 50 } = {}) {
    const data = await gql(`query($page:Int,$count:Int){
      rolespaginated(page:$page,count:$count){
        data { ${FIELDS} } metadata { total current_page per_page last_page }
      }}`, { page, count });
    return data.rolespaginated;
  },
  async save(payload) { const { data } = await http.post("/role", payload); return data; },
  async delete(id) { const { data } = await http.delete(`/role/delete/${id}`); return data; },
};
