import http from "./http";
import { gql } from "./gql";

const FIELDS = `id cle valeur type label description groupe`;

export const parametreService = {
  async list({ groupe, page = 1, count = 100 } = {}) {
    const data = await gql(`query($groupe:String,$page:Int,$count:Int){
      parametresPaginated(groupe:$groupe,page:$page,count:$count){
        data { ${FIELDS} } metadata { total current_page per_page last_page }
      }}`, { groupe: groupe || null, page, count });
    return data.parametresPaginated;
  },
  async update(cle, valeur) { const { data } = await http.post("/parametre", { cle, valeur }); return data; },
};
