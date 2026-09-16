import http from "./http";
import { gql } from "./gql";

const LIST_FIELDS = `
  id code type contrat_id decompte_id chantier_id soustraitant_id
  numero_facture_externe objet date_facture date_echeance
  montant_ht taux_tva montant_tva montant_ttc
  statut date_paiement reference_paiement motif_annulation
  created_at updated_at
  contrat { id code objet }
  decompte { id code }
  chantier { id code designation }
  soustraitant { id raison_sociale }
`;

const DETAIL_FIELDS = `
  id code type contrat_id decompte_id chantier_id soustraitant_id
  numero_facture_externe objet date_facture date_echeance
  montant_ht taux_tva montant_tva montant_ttc
  statut date_paiement reference_paiement motif_annulation observations
  created_by updated_by created_at updated_at
  contrat { id code objet }
  decompte { id code }
  chantier { id code designation }
  soustraitant { id raison_sociale }
`;

export const factureService = {
  async list({ page = 1, count = 15, code, type, statut, contrat_id, soustraitant_id } = {}) {
    const data = await gql(
      `query ListFactures($page: Int, $count: Int, $code: String, $type: String, $statut: String, $contrat_id: Int, $soustraitant_id: Int) {
        facturesPaginated(page: $page, count: $count, code: $code, type: $type, statut: $statut, contrat_id: $contrat_id, soustraitant_id: $soustraitant_id) {
          data { ${LIST_FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      {
        page,
        count,
        code: code || null,
        type: type || null,
        statut: statut || null,
        contrat_id: contrat_id || null,
        soustraitant_id: soustraitant_id || null,
      }
    );
    return data.facturesPaginated;
  },

  async getById(id) {
    const data = await gql(
      `query GetFacture($id: ID) {
        facturesPaginated(id: $id) {
          data { ${DETAIL_FIELDS} }
        }
      }`,
      { id: parseInt(id, 10) }
    );
    return data.facturesPaginated.data[0] ?? null;
  },

  async save(payload) {
    const { data } = await http.post("/facture", payload);
    return data;
  },

  async setStatut(id, statut, extra = {}) {
    const { data } = await http.post("/facture/statut", { id, statut, ...extra });
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/facture/delete/${id}`);
    return data;
  },
};
