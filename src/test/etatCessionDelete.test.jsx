import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockAddToast = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('../hooks/useEtatsCession', () => ({
  useEtatsCessionPaginated: vi.fn(),
  useSaveEtatCession: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteEtatCession: () => ({ mutateAsync: mockDeleteMutate, isPending: false }),
  useVisaEtatCession: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('../hooks/useContrats', () => ({
  useContratsPaginated: () => ({ data: null }),
}));

vi.mock('../hooks/useSousTraitants', () => ({
  useSousTraitantsPaginated: () => ({ data: null }),
}));

vi.mock('../hooks/useChantiers', () => ({
  useChantiersPaginated: () => ({ data: null }),
}));

vi.mock('../hooks/useParametres', () => ({
  usePeutFaire: () => ({ data: true }),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../context/UserContext', () => ({
  useUser: () => ({ currentUser: { id: 1, role: { designation: 'Admin' } } }),
}));

vi.mock('../components/PageHeader', () => ({
  default: ({ action }) => <div>{action}</div>,
}));
vi.mock('../components/StatusBadge', () => ({
  default: ({ statut }) => <span data-testid="statut">{statut}</span>,
}));
vi.mock('../components/MoneyDisplay', () => ({
  default: ({ amount }) => <span>{amount}</span>,
}));
vi.mock('../components/Skeleton', () => ({
  SkeletonTable: () => <div>Loading...</div>,
}));
vi.mock('../components/SearchSelect', () => ({
  default: ({ children, ...props }) => <select {...props}>{children}</select>,
}));
vi.mock('../components/ConfirmModal', () => ({
  default: () => null,
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

import { useEtatsCessionPaginated } from '../hooks/useEtatsCession';
import EtatsCessionListPage from '../pages/EtatsCessionListPage';

function makeEC(overrides = {}) {
  return {
    id: 1, code: 'EC-001', statut: 'brouillon',
    montant_total: 100000, created_at: '2026-10-01',
    contrat: { id: 1, code: 'CTR-001', objet: 'Test', soustraitant: { raison_sociale: 'STT' }, chantier: { designation: 'Ch' } },
    ...overrides,
  };
}

const META = { total: 1, current_page: 1, per_page: 15, last_page: 1 };

describe('EtatsCessionListPage — bouton supprimer', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('affiche le bouton supprimer pour un EC en brouillon', () => {
    useEtatsCessionPaginated.mockReturnValue({ data: { data: [makeEC()], metadata: META }, isLoading: false, isError: false });
    render(<EtatsCessionListPage />);
    expect(screen.getByTitle('Supprimer')).toBeTruthy();
  });

  it('cache le bouton supprimer pour un EC validé', () => {
    useEtatsCessionPaginated.mockReturnValue({ data: { data: [makeEC({ statut: 'valide' })], metadata: META }, isLoading: false, isError: false });
    render(<EtatsCessionListPage />);
    expect(screen.queryByTitle('Supprimer')).toBeNull();
  });

  it('cache le bouton supprimer pour un EC soumis', () => {
    useEtatsCessionPaginated.mockReturnValue({ data: { data: [makeEC({ statut: 'soumis' })], metadata: META }, isLoading: false, isError: false });
    render(<EtatsCessionListPage />);
    expect(screen.queryByTitle('Supprimer')).toBeNull();
  });

  it('affiche la confirmation de suppression au clic', () => {
    useEtatsCessionPaginated.mockReturnValue({ data: { data: [makeEC()], metadata: META }, isLoading: false, isError: false });
    render(<EtatsCessionListPage />);
    fireEvent.click(screen.getByTitle('Supprimer'));
    expect(screen.getByText(/Supprimer EC-001/)).toBeTruthy();
  });

  it('affiche un toast erreur si l\'API retourne que l\'EC est lié à un décompte', async () => {
    useEtatsCessionPaginated.mockReturnValue({ data: { data: [makeEC()], metadata: META }, isLoading: false, isError: false });
    mockDeleteMutate.mockRejectedValueOnce({
      response: { data: { errors: ['Cet état de cession est lié au décompte DEC-001 et ne peut pas être supprimé.'] } },
    });

    render(<EtatsCessionListPage />);
    fireEvent.click(screen.getByTitle('Supprimer'));
    fireEvent.click(screen.getByText('Supprimer'));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.stringContaining('DEC-001'),
        'error'
      );
    });
  });

  it('affiche un toast succès après suppression réussie', async () => {
    useEtatsCessionPaginated.mockReturnValue({ data: { data: [makeEC()], metadata: META }, isLoading: false, isError: false });
    mockDeleteMutate.mockResolvedValueOnce({});

    render(<EtatsCessionListPage />);
    fireEvent.click(screen.getByTitle('Supprimer'));
    fireEvent.click(screen.getByText('Supprimer'));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.stringContaining('EC-001'),
        'success'
      );
    });
  });
});
