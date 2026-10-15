import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the query string passed to gql
let capturedQuery = '';

vi.mock('../services/gql', () => ({
  gql: vi.fn((query) => {
    capturedQuery = query;
    return Promise.resolve({
      soustraitantsPaginated: { data: [], metadata: { total: 0, current_page: 1, per_page: 15, last_page: 1 } }
    });
  })
}));

import { soustraitantService } from '../services/soustraitantService';

describe('soustraitantService GraphQL FIELDS', () => {
  beforeEach(() => {
    capturedQuery = '';
  });

  it('includes montant_realise', async () => {
    await soustraitantService.list();
    expect(capturedQuery).toContain('montant_realise');
  });

  it('includes montant_a_realiser', async () => {
    await soustraitantService.list();
    expect(capturedQuery).toContain('montant_a_realiser');
  });

  it('includes nets_a_payer', async () => {
    await soustraitantService.list();
    expect(capturedQuery).toContain('nets_a_payer');
  });

  it('includes payes', async () => {
    await soustraitantService.list();
    expect(capturedQuery).toContain('payes');
  });

  it('includes restant_a_payer', async () => {
    await soustraitantService.list();
    expect(capturedQuery).toContain('restant_a_payer');
  });
});
