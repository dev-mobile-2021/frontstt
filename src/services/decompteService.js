import http from "./http";
import { gql } from "./gql";

const LIST_FIELDS = `
  id code contrat_id etat_cession_id statut
  montant_brut montant_ht montant_ttc montant_retenue_garantie
  taux_retenue_garantie taux_tva montant_avances_deduites montant_penalites
  date_echeance motif_rejet created_at updated_at
  contrat { id code objet soustraitant { id raison_sociale } chantier { id code designation } }
  etat_cession { id code }
`;

const DETAIL_FIELDS = `
  id code contrat_id etat_cession_id statut motif_rejet observations date_echeance
  montant_brut taux_retenue_garantie montant_retenue_garantie
  montant_avances_deduites montant_penalites montant_ht taux_tva montant_tva montant_ttc
  created_by updated_by created_at updated_at
  validations { id profil_code libelle action motif validated_at user { id nom prenom } }
  contrat { id code objet soustraitant { id raison_sociale } chantier { id code designation } }
  etat_cession { id code montant_total }
`;

export const decompteService = {
  async list({ page = 1, count = 15, code, contrat_id, statut } = {}) {
    const data = await gql(
      `query ListDecomptes($page: Int, $count: Int, $code: String, $contrat_id: Int, $statut: String) {
        decomptesPaginated(page: $page, count: $count, code: $code, contrat_id: $contrat_id, statut: $statut) {
          data { ${LIST_FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      { page, count, code: code || null, contrat_id: contrat_id || null, statut: statut || null }
    );
    return data.decomptesPaginated;
  },

  async getById(id) {
    const data = await gql(
      `query GetDecompte($id: ID) {
        decomptesPaginated(id: $id) {
          data { ${DETAIL_FIELDS} }
        }
      }`,
      { id: parseInt(id, 10) }
    );
    return data.decomptesPaginated.data[0] ?? null;
  },

  async save(payload) {
    const { data } = await http.post("/decompte", payload);
    return data;
  },

  async valider(id) {
    const { data } = await http.post("/decompte/valider", { id });
    return data;
  },

  async rejeter(id, motif) {
    const { data } = await http.post("/decompte/rejeter", { id, motif });
    return data;
  },

  async payer(id) {
    const { data } = await http.post("/decompte/payer", { id });
    return data;
  },

  async delete(id) {
    const { data } = await http.delete(`/decompte/delete/${id}`);
    return data;
  },

  async getCircuit() {
    const { data } = await http.get("/decompte/circuit");
    return data.data ?? [];
  },
};
