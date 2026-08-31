import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { UserProvider } from "./context/UserContext";
import { DecomptesProvider } from "./context/DecomptesContext";
import { ContratsProvider } from "./context/ContratsContext";
import { BonsCommandeProvider } from "./context/BonsCommandeContext";
import { RelevesProvider } from "./context/RelevesContext";
import { FacturesProvider } from "./context/FacturesContext";
import { ParametresProvider } from "./context/ParametresContext";
import { EtatsCessionProvider } from "./context/EtatsCessionContext";
import { AttachementsProvider } from "./context/AttachementsContext";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
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
import ParametragePage from "./pages/ParametragePage";
import RelevesListPage from "./pages/RelevesListPage";
import ReleveDetailPage from "./pages/ReleveDetailPage";
import FacturesListPage from "./pages/FacturesListPage";
import FactureDetailPage from "./pages/FactureDetailPage";
import EtatsCessionListPage from "./pages/EtatsCessionListPage";
import EtatCessionDetailPage from "./pages/EtatCessionDetailPage";
import AttachementsListPage from "./pages/AttachementsListPage";
import AttachementDetailPage from "./pages/AttachementDetailPage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    <ToastProvider>
      <UserProvider>
      <ParametresProvider>
      <ContratsProvider>
      <DecomptesProvider>
      <BonsCommandeProvider>
      <RelevesProvider>
      <FacturesProvider>
      <EtatsCessionProvider>
      <AttachementsProvider>
      <BrowserRouter basename="/sous-traitance">
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />

          {/* App — layout with sidebar + header */}
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Contrats */}
            <Route path="/contrats" element={<ContratsListPage />} />
            <Route path="/contrats/nouveau" element={<ContratFormPage />} />
            <Route path="/contrats/:id" element={<ContratFormPage />} />

            {/* Décomptes */}
            <Route path="/decomptes" element={<DecomptesListPage />} />
            <Route path="/decomptes/nouveau" element={<DecompteFormPage />} />
            <Route path="/decomptes/:id" element={<DecompteFormPage />} />

            {/* Sous-traitants */}
            <Route path="/sous-traitants" element={<SousTraitantsListPage />} />
            <Route path="/sous-traitants/:id" element={<SousTraitantFormPage />} />

            {/* Chantiers */}
            <Route path="/chantiers" element={<ChantiersListPage />} />
            <Route path="/chantiers/:id" element={<ChantierFormPage />} />

            {/* Rapports */}
            <Route path="/rapports" element={<RapportsPage />} />

            {/* Relevés de compte */}
            <Route path="/releves" element={<RelevesListPage />} />
            <Route path="/releves/:id" element={<ReleveDetailPage />} />

            {/* Factures */}
            <Route path="/factures" element={<FacturesListPage />} />
            <Route path="/factures/:id" element={<FactureDetailPage />} />

            {/* États de cession */}
            <Route path="/etats-cession" element={<EtatsCessionListPage />} />
            <Route path="/etats-cession/nouveau" element={<EtatCessionDetailPage />} />
            <Route path="/etats-cession/:id" element={<EtatCessionDetailPage />} />

            {/* Attachements */}
            <Route path="/attachements" element={<AttachementsListPage />} />
            <Route path="/attachements/:id" element={<AttachementDetailPage />} />

            {/* Paramétrage */}
            <Route path="/parametrage" element={<ParametragePage />} />

            {/* 404 dans le layout */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Fallback hors layout */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </AttachementsProvider>
      </EtatsCessionProvider>
      </FacturesProvider>
      </RelevesProvider>
      </BonsCommandeProvider>
      </DecomptesProvider>
      </ContratsProvider>
      </ParametresProvider>
      </UserProvider>
    </ToastProvider>
  );
}
