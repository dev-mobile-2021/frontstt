import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Default mock data ──────────────────────────────────────────────────────
const STT_ROW = {
  id: 1,
  raison_sociale: 'Test STT',
  statut: 'actif',
  forme_juridique: 'SARL',
  nb_contrats: 2,
  nb_contrats_en_cours: 1,
  total_ht_contrats: 500000,
  total_contrats_avenants: 600000,
  montant_realise: 100000,
  montant_a_realiser: 500000,
  nets_a_payer: 100000,
  payes: 50000,
  restant_a_payer: 50000,
  total_decomptes_payes: 50000,
  total_decomptes_en_attente: 20000,
  total_decomptes_en_cours: 30000,
};

const ZERO_ROW = {
  id: 2,
  raison_sociale: 'Zero STT',
  statut: 'actif',
  forme_juridique: '',
  nb_contrats: 0,
  nb_contrats_en_cours: 0,
  total_ht_contrats: 0,
  total_contrats_avenants: 0,
  montant_realise: 0,
  montant_a_realiser: 0,
  nets_a_payer: 0,
  payes: 0,
  restant_a_payer: 0,
};

// Use a vi.fn() so individual tests can override with mockReturnValueOnce
const mockUseSousTraitantsPaginated = vi.fn();

vi.mock('../hooks/useSousTraitants', () => ({
  useSousTraitantsPaginated: (...args) => mockUseSousTraitantsPaginated(...args),
}));

vi.mock('../hooks/useX3Sync', () => ({
  useAjouterDepuisX3: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));
vi.mock('../components/PageHeader', () => ({
  default: ({ title }) => <div>{title}</div>,
}));
vi.mock('../components/StatusBadge', () => ({
  default: ({ statut }) => <span>{statut}</span>,
}));
vi.mock('../components/Skeleton', () => ({
  SkeletonTable: () => <div>loading</div>,
}));
vi.mock('../components/SyncBadge', () => ({
  default: () => null,
}));
vi.mock('../components/SearchSelect', () => ({
  default: ({ children, ...p }) => <select {...p}>{children}</select>,
}));
vi.mock('../components/AjouterX3Modal', () => ({
  default: () => null,
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

import SousTraitantsListPage from '../pages/SousTraitantsListPage';

function makeHookResult(rows) {
  return {
    data: {
      data: rows,
      metadata: { total: rows.length, current_page: 1, last_page: 1 },
    },
    isLoading: false,
    isError: false,
  };
}

describe('SousTraitantsListPage', () => {
  it('renders all 11 column headers', () => {
    mockUseSousTraitantsPaginated.mockReturnValue(makeHookResult([STT_ROW]));
    render(<SousTraitantsListPage />);

    const expectedHeaders = [
      'Raison sociale',
      'Statut',
      'Contrat',
      'Contrat en cours',
      'Total HT CT (contrats)',
      'Total (contrats + avenants)',
      'Montant réalisé',
      'Montant à réaliser',
      'Nets à payer',
      'Payés',
      'Restant à payer',
    ];
    for (const header of expectedHeaders) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
  });

  it('renders the sous-traitant name "Test STT"', () => {
    mockUseSousTraitantsPaginated.mockReturnValue(makeHookResult([STT_ROW]));
    render(<SousTraitantsListPage />);
    expect(screen.getByText('Test STT')).toBeInTheDocument();
  });

  it('renders the 5 new amount fields without crashing', () => {
    mockUseSousTraitantsPaginated.mockReturnValue(makeHookResult([STT_ROW]));
    render(<SousTraitantsListPage />);
    const allText = document.body.textContent;
    // montant_realise = 100 000
    expect(allText).toMatch(/100[\s  ]*000/);
    // montant_a_realiser = 500 000
    expect(allText).toMatch(/500[\s  ]*000/);
    // payes = 50 000
    expect(allText).toMatch(/50[\s  ]*000/);
  });

  it('shows "0" when amount values are 0', () => {
    mockUseSousTraitantsPaginated.mockReturnValue(makeHookResult([ZERO_ROW]));
    render(<SousTraitantsListPage />);
    // All monetary fields are 0 → Montant renders fmtNum(0) = "0"
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
  });
});
