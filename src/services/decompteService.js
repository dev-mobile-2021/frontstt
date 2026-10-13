import http from "./http";
import { gql } from "./gql";

const LIST_FIELDS = `
  id code contrat_id statut type date_debut date_fin
  montant_ht montant_ttc motif_rejet created_at updated_at
  contrat { id code objet soustraitant { id raison_sociale } chantier { id code designation } }
`;

const DETAIL_FIELDS = `
  id code contrat_id statut type motif_rejet
  date_debut date_fin postes
  montant_ht montant_tva montant_ttc
  created_by updated_by created_at updated_at
  validations { id profil_code libelle action motif validated_at user { id nom prenom } }
  contrat {
    id code objet montant_initial montant_actuel
    taux_rg taux_revision_prix taux_avance taux_remboursement_avance taux_tva
    soustraitant { id raison_sociale }
    chantier { id code designation }
    avenants { id statut montant }
  }
`;

export const decompteService = {
  async list({ page = 1, count = 15, code, contrat_id, statut, soustraitant_id, chantier_id } = {}) {
    const data = await gql(
      `query ListDecomptes($page: Int, $count: Int, $code: String, $contrat_id: Int, $statut: String, $soustraitant_id: Int, $chantier_id: Int) {
        decomptesPaginated(page: $page, count: $count, code: $code, contrat_id: $contrat_id, statut: $statut, soustraitant_id: $soustraitant_id, chantier_id: $chantier_id) {
          data { ${LIST_FIELDS} }
          metadata { total current_page per_page last_page }
        }
      }`,
      { page, count, code: code || null, contrat_id: contrat_id || null, statut: statut || null, soustraitant_id: soustraitant_id || null, chantier_id: chantier_id || null }
    );
    return data.decomptesPaginated;
  },

  async getById(id) {
    const { data } = await http.get(`/decompte/${id}`);
    return data.data ?? null;
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
