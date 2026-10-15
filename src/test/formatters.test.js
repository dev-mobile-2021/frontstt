import { describe, it, expect } from 'vitest';
import { fmtNum, formatMontant, formatMontantCourt } from '../utils/formatters';

describe('fmtNum', () => {
  it('returns "—" for null', () => {
    expect(fmtNum(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(fmtNum(undefined)).toBe('—');
  });

  it('returns "—" for NaN', () => {
    expect(fmtNum(NaN)).toBe('—');
  });

  it('returns "0" for 0', () => {
    expect(fmtNum(0)).toBe('0');
  });

  it('formats 1000 — contains "1" and "000"', () => {
    const result = fmtNum(1000);
    expect(result).toContain('1');
    expect(result).toContain('000');
  });

  it('formats 1500000 — contains "1", "500", "000"', () => {
    const result = fmtNum(1500000);
    expect(result).toContain('1');
    expect(result).toContain('500');
    expect(result).toContain('000');
  });

  it('formats negative number -5', () => {
    const result = fmtNum(-5);
    // fr-FR uses minus sign (−) or hyphen-minus (-), both acceptable
    expect(result).toMatch(/[−-]5/);
  });
});

describe('formatMontant', () => {
  it('contains "FCFA" for 0', () => {
    expect(formatMontant(0)).toContain('FCFA');
  });

  it('contains "1" and "FCFA" for 1000', () => {
    const result = formatMontant(1000);
    expect(result).toContain('1');
    expect(result).toContain('FCFA');
  });
});

describe('formatMontantCourt', () => {
  it('uses "M FCFA" for millions', () => {
    const result = formatMontantCourt(1_500_000);
    expect(result).toContain('M FCFA');
  });

  it('uses "Md FCFA" for milliards', () => {
    const result = formatMontantCourt(2_000_000_000);
    expect(result).toContain('Md FCFA');
  });
});
