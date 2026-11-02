import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./config/queryClient";
import { ToastProvider } from "./context/ToastContext";
import { UserProvider } from "./context/UserContext";
import MainLayout from "./layouts/MainLayout";
import { usePeutFaire } from "./hooks/useParametres";

// Garde de route : redirige vers /dashboard si la permission est refusée.
// Attend la réponse API avant de décider (évite le flash de redirection).
function RequirePermission({ perm }) {
  const { data: allowed, isLoading } = usePeutFaire(perm);
  if (isLoading) return null;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Pages publiques
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

// Pages protégées
import DashboardPage from "./pages/DashboardPage";
import ContratsListPage from "./pages/ContratsListPage";
import ContratFormPage from "./pages/ContratFormPage";
import DecomptesListPage from "./pages/DecomptesListPage";
import DecompteFormPage from "./pages/DecompteFormPage";
import SousTraitantsListPage from "./pages/SousTraitantsListPage";
import SousTraitantFormPage from "./pages/SousTraitantFormPage";
import ChantiersListPage from "./pages/ChantiersListPage";
import ChantierFormPage from "./pages/ChantierFormPage";
import RapportsPage from "./pages/RapportsPage";
import RapportDetailPage from "./pages/RapportDetailPage";
import ParametragePage from "./pages/ParametragePage";
import CircuitPage from "./pages/parametrage/CircuitPage";
import ParametresPage from "./pages/parametrage/ParametresPage";
import UtilisateursPage from "./pages/parametrage/UtilisateursPage";
import RolesPage from "./pages/parametrage/RolesPage";
import PermissionsPage from "./pages/parametrage/PermissionsPage";
import BaremesPage from "./pages/parametrage/BaremesPage";
import ArticlesX3Page from "./pages/parametrage/ArticlesX3Page";
import MtxPage from "./pages/parametrage/MtxPage";
import BtDocumentsPage from "./pages/parametrage/BtDocumentsPage";
import RelevesListPage from "./pages/RelevesListPage";
import ReleveDetailPage from "./pages/ReleveDetailPage";
import FacturesListPage from "./pages/FacturesListPage";
import FactureDetailPage from "./pages/FactureDetailPage";
import EtatsCessionListPage from "./pages/EtatsCessionListPage";
import EtatCessionDetailPage from "./pages/EtatCessionDetailPage";
import EtatCessionFormPage from "./pages/EtatCessionFormPage";
import ConsultationEtatsCessionPage from "./pages/ConsultationEtatsCessionPage";
import NoteDevisListPage from "./pages/NoteDevisListPage";
import NoteDevisDetailPage from "./pages/NoteDevisDetailPage";
import AttachementsListPage from "./pages/AttachementsListPage";
import AttachementDetailPage from "./pages/AttachementDetailPage";
import AttachementNewPage from "./pages/AttachementNewPage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <UserProvider>
          <BrowserRouter basename={import.meta.env.VITE_APP_BASENAME ?? "/sous-traitance"}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protégé — layout avec sidebar + header */}
              <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Chantiers */}
                <Route element={<RequirePermission perm="menu_chantiers" />}>
                  <Route path="/chantiers" element={<ChantiersListPage />} />
                  <Route path="/chantiers/nouveau" element={<ChantierFormPage />} />
                  <Route path="/chantiers/:id" element={<ChantierFormPage />} />
                </Route>

                {/* Sous-traitants */}
                <Route element={<RequirePermission perm="menu_sous_traitants" />}>
                  <Route path="/sous-traitants" element={<SousTraitantsListPage />} />
                  <Route path="/sous-traitants/nouveau" element={<SousTraitantFormPage />} />
                  <Route path="/sous-traitants/:id" element={<SousTraitantFormPage />} />
                </Route>

                {/* Contrats */}
                <Route element={<RequirePermission perm="menu_contrats" />}>
                  <Route path="/contrats" element={<ContratsListPage />} />
                  <Route path="/contrats/nouveau" element={<ContratFormPage />} />
                  <Route path="/contrats/:id" element={<ContratFormPage />} />
                </Route>

                {/* États de cession */}
                <Route element={<RequirePermission perm="menu_etats_cession" />}>
                  <Route path="/etats-cession" element={<EtatsCessionListPage />} />
                  <Route path="/etats-cession/consultation" element={<ConsultationEtatsCessionPage />} />
                  <Route path="/consultation" element={<ConsultationEtatsCessionPage />} />
                  <Route path="/etats-cession/nouveau" element={<EtatCessionFormPage />} />
                  <Route path="/etats-cession/:id/modifier" element={<EtatCessionFormPage />} />
                  <Route path="/etats-cession/:id" element={<EtatCessionFormPage />} />
                </Route>

                {/* Notes de débit */}
                <Route element={<RequirePermission perm="menu_releves" />}>
                  <Route path="/notes-debit" element={<NoteDevisListPage />} />
                  <Route path="/notes-debit/:id" element={<NoteDevisDetailPage />} />
                </Route>

                {/* Décomptes */}
                <Route element={<RequirePermission perm="menu_decomptes" />}>
                  <Route path="/decomptes" element={<DecomptesListPage />} />
                  <Route path="/decomptes/nouveau" element={<DecompteFormPage />} />
                  <Route path="/decomptes/:id" element={<DecompteFormPage />} />
                </Route>

                {/* Factures */}
                <Route element={<RequirePermission perm="menu_factures" />}>
                  <Route path="/factures" element={<FacturesListPage />} />
                  <Route path="/factures/:id" element={<FactureDetailPage />} />
                </Route>

                {/* Relevés */}
                <Route element={<RequirePermission perm="menu_releves" />}>
                  <Route path="/releves" element={<RelevesListPage />} />
                  <Route path="/releves/:id" element={<ReleveDetailPage />} />
                </Route>

                {/* Rapports */}
                <Route element={<RequirePermission perm="menu_rapports" />}>
                  <Route path="/rapports" element={<RapportsPage />} />
                  <Route path="/rapports/:rapportId" element={<RapportDetailPage />} />
                </Route>

                {/* Attachements */}
                <Route element={<RequirePermission perm="menu_attachements" />}>
                  <Route path="/attachements" element={<AttachementsListPage />} />
                  <Route path="/attachements/nouveau" element={<AttachementNewPage />} />
                  <Route path="/attachements/:id" element={<AttachementDetailPage />} />
                </Route>

                {/* Paramétrage — réservé aux rôles ayant menu_parametrage */}
                <Route element={<RequirePermission perm="menu_parametrage" />}>
                  <Route path="/parametrage" element={<Navigate to="/parametrage/circuit" replace />} />
                  <Route path="/parametrage/circuit" element={<CircuitPage />} />
                  <Route path="/parametrage/parametres" element={<ParametresPage />} />
                  <Route path="/parametrage/utilisateurs" element={<UtilisateursPage />} />
                  <Route path="/parametrage/roles" element={<RolesPage />} />
                  <Route path="/parametrage/permissions" element={<PermissionsPage />} />
                  <Route path="/parametrage/baremes" element={<BaremesPage />} />
                  <Route path="/parametrage/articles" element={<ArticlesX3Page />} />
                  <Route path="/parametrage/mtx" element={<MtxPage />} />
                  <Route path="/parametrage/bt" element={<BtDocumentsPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </UserProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
