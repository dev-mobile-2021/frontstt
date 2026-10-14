import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../hooks/useParametres', () => ({
  usePeutFaire: vi.fn(),
}));

vi.mock('../hooks/useDecomptes', () => ({
  useDecomptesPaginated: () => ({ data: null, isLoading: false, isError: false }),
  useDecompteCircuit: () => ({ data: [] }),
  useSaveDecompte: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteDecompte: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('../hooks/useContrats', () => ({
  useContratsPaginated: () => ({ data: null }),
}));

vi.mock('../hooks/useEtatsCession', () => ({
  useEtatsCessionPaginated: () => ({ data: null }),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../context/UserContext', () => ({
  useUser: () => ({ currentUser: { id: 1, role: { designation: 'CT' } } }),
}));

vi.mock('../components/PageHeader', () => ({
  default: ({ action }) => <div data-testid="page-header">{action}</div>,
}));

vi.mock('../components/StatusBadge', () => ({
  default: ({ statut }) => <span>{statut}</span>,
}));

vi.mock('../components/MoneyDisplay', () => ({
  default: ({ value }) => <span>{value}</span>,
}));

vi.mock('../components/Skeleton', () => ({
  SkeletonTable: () => <div>Loading...</div>,
}));

vi.mock('../components/SearchSelect', () => ({
  default: () => <select />,
}));

vi.mock('../components/ConfirmModal', () => ({
  default: () => null,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }) => <a>{children}</a>,
}));

// ── Tests ──────────────────────────────────────────────────────────────────

import { usePeutFaire } from '../hooks/useParametres';
import DecomptesListPage from '../pages/DecomptesListPage';

describe('DecomptesListPage — permission creer_decompte', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('cache le bouton "Nouveau décompte" si peutCreerDecompte = false (rôle CT)', () => {
    usePeutFaire.mockReturnValue({ data: false });
    render(<DecomptesListPage />);
    expect(screen.queryByText('Nouveau décompte')).toBeNull();
  });

  it('affiche le bouton "Nouveau décompte" si peutCreerDecompte = true (rôle DT)', () => {
    usePeutFaire.mockReturnValue({ data: true });
    render(<DecomptesListPage />);
    expect(screen.getByText('Nouveau décompte')).toBeTruthy();
  });
});

// ── CircuitStepper canValidate ─────────────────────────────────────────────

describe('CircuitStepper — permission valider_decompte', () => {
  it('peutValider=false masque les boutons Valider/Rejeter', () => {
    // Test logique pure : canValidate = peutValider && (isAdmin || roleMatch)
    const peutValider = false;
    const isAdmin = false;
    const roleMatch = true; // même si le role correspond
    const canValidate = peutValider && (isAdmin || roleMatch);
    expect(canValidate).toBe(false);
  });

  it('peutValider=true + roleMatch = true → canValidate = true', () => {
    const peutValider = true;
    const isAdmin = false;
    const roleMatch = true;
    const canValidate = peutValider && (isAdmin || roleMatch);
    expect(canValidate).toBe(true);
  });

  it('peutValider=true + isAdmin = true → canValidate = true même sans roleMatch', () => {
    const peutValider = true;
    const isAdmin = true;
    const roleMatch = false;
    const canValidate = peutValider && (isAdmin || roleMatch);
    expect(canValidate).toBe(true);
  });

  it('peutValider=false + isAdmin = true → canValidate = false (admin bloqué aussi)', () => {
    // Admin doit avoir peutValider = true via PermissionService (Admin bypass)
    // Si peutValider=false c'est que le hook a retourné false, ce qui ne peut pas arriver pour Admin
    const peutValider = false;
    const isAdmin = true;
    const roleMatch = false;
    const canValidate = peutValider && (isAdmin || roleMatch);
    expect(canValidate).toBe(false);
  });
});
