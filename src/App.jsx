import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./config/queryClient";
import { ToastProvider } from "./context/ToastContext";
import { UserProvider } from "./context/UserContext";
import MainLayout from "./layouts/MainLayout";

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
import RelevesListPage from "./pages/RelevesListPage";
import ReleveDetailPage from "./pages/ReleveDetailPage";
import FacturesListPage from "./pages/FacturesListPage";
import FactureDetailPage from "./pages/FactureDetailPage";
import EtatsCessionListPage from "./pages/EtatsCessionListPage";
import EtatCessionDetailPage from "./pages/EtatCessionDetailPage";
import EtatCessionFormPage from "./pages/EtatCessionFormPage";
import ConsultationEtatsCessionPage from "./pages/ConsultationEtatsCessionPage";
import AttachementsListPage from "./pages/AttachementsListPage";
import AttachementDetailPage from "./pages/AttachementDetailPage";

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
                <Route path="/chantiers" element={<ChantiersListPage />} />
                <Route path="/chantiers/nouveau" element={<ChantierFormPage />} />
                <Route path="/chantiers/:id" element={<ChantierFormPage />} />

                {/* Sous-traitants */}
                <Route path="/sous-traitants" element={<SousTraitantsListPage />} />
                <Route path="/sous-traitants/nouveau" element={<SousTraitantFormPage />} />
                <Route path="/sous-traitants/:id" element={<SousTraitantFormPage />} />

                {/* Contrats */}
                <Route path="/contrats" element={<ContratsListPage />} />
                <Route path="/contrats/nouveau" element={<ContratFormPage />} />
                <Route path="/contrats/:id" element={<ContratFormPage />} />

                {/* États de cession */}
                <Route path="/etats-cession" element={<EtatsCessionListPage />} />
                <Route path="/etats-cession/consultation" element={<ConsultationEtatsCessionPage />} />
                <Route path="/etats-cession/nouveau" element={<EtatCessionFormPage />} />
                <Route path="/etats-cession/:id/modifier" element={<EtatCessionFormPage />} />
                <Route path="/etats-cession/:id" element={<EtatCessionFormPage />} />

                {/* Décomptes */}
                <Route path="/decomptes" element={<DecomptesListPage />} />
                <Route path="/decomptes/nouveau" element={<DecompteFormPage />} />
                <Route path="/decomptes/:id" element={<DecompteFormPage />} />

                {/* Factures */}
                <Route path="/factures" element={<FacturesListPage />} />
                <Route path="/factures/:id" element={<FactureDetailPage />} />

                {/* Relevés */}
                <Route path="/releves" element={<RelevesListPage />} />
                <Route path="/releves/:id" element={<ReleveDetailPage />} />

                {/* Rapports */}
                <Route path="/rapports" element={<RapportsPage />} />
                <Route path="/rapports/:rapportId" element={<RapportDetailPage />} />

                {/* Attachements */}
                <Route path="/attachements" element={<AttachementsListPage />} />
                <Route path="/attachements/:id" element={<AttachementDetailPage />} />

                {/* Paramétrage */}
                <Route path="/parametrage" element={<ParametragePage />} />

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
