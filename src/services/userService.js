import http from "./http";
import { gql } from "./gql";

const FIELDS = `id login email nom prenom role_id etat role { id designation }`;

export const userService = {
  async list({ page = 1, count = 50 } = {}) {
    const data = await gql(`query($page:Int,$count:Int){
      usersPaginated(page:$page,count:$count){
        data { ${FIELDS} } metadata { total current_page per_page last_page }
      }}`, { page, count });
    return data.usersPaginated;
  },
  async save(payload) { const { data } = await http.post(payload.id ? "/user/save" : "/user", payload); return data; },
  async delete(id) { const { data } = await http.delete(`/user/delete/${id}`); return data; },
};
