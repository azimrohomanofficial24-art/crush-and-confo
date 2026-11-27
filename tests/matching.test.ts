import { describe, expect, it } from 'vitest';
import { ageFromDob, computeMatchScore, SCORE_NOTE } from '../apps/worker/src/matching/score';

// These tests import the REAL implementation in apps/worker/src/matching/score.ts
// (Agent B). The algorithm, per that module:
//   interests   = min(40, sharedInterests * 10)
//   location    = sameCity ? 25 : sameCountry ? 12 : 0
//   age         = diff <= 2 ? 20 : diff <= 5 ? 15 : diff <= 10 ? 8 : 0
//   intentions  = intentionsMatch ? 15 : 0
//   total       = sum (max 100). The score is NOT scientifically validated.

describe('computeMatchScore', () => {
  it('gives 100 for a perfect match', () => {
    expect(
      computeMatchScore({ sharedInterests: 4, sameCity: true, ageDiff: 0, intentionsMatch: true }),
    ).toEqual({ total: 100, breakdown: { interests: 40, location: 25, ageProximity: 20, intentions: 15 } });
  });

  it('gives 0 when nothing matches', () => {
    expect(
      computeMatchScore({ sharedInterests: 0, ageDiff: 30 }),
    ).toEqual({ total: 0, breakdown: { interests: 0, location: 0, ageProximity: 0, intentions: 0 } });
  });

  it('scores shared interests at 10 points each, capped at 40', () => {
    expect(computeMatchScore({ sharedInterests: 1, ageDiff: 99 }).breakdown.interests).toBe(10);
    expect(computeMatchScore({ sharedInterests: 3, ageDiff: 99 }).breakdown.interests).toBe(30);
    expect(computeMatchScore({ sharedInterests: 9, ageDiff: 99 }).breakdown.interests).toBe(40);
  });

  it('scores location: 25 for same city, 12 for same country only', () => {
    expect(computeMatchScore({ sharedInterests: 0, sameCity: true, ageDiff: 99 }).breakdown.location).toBe(25);
    expect(computeMatchScore({ sharedInterests: 0, sameCountry: true, ageDiff: 99 }).breakdown.location).toBe(12);
    expect(computeMatchScore({ sharedInterests: 0, ageDiff: 99 }).breakdown.location).toBe(0);
  });

  it('scores age proximity in bands: <=2y 20, <=5y 15, <=10y 8, else 0', () => {
    const age = (d: number | null) => computeMatchScore({ sharedInterests: 0, ageDiff: d }).breakdown.ageProximity;
    expect(age(0)).toBe(20);
    expect(age(2)).toBe(20);
    expect(age(3)).toBe(15);
    expect(age(5)).toBe(15);
    expect(age(6)).toBe(8);
    expect(age(10)).toBe(8);
    expect(age(11)).toBe(0);
    expect(age(null)).toBe(0); // unknown age scores 0, never crashes
  });

  it('awards 15 points for matching intentions, 0 otherwise', () => {
    expect(computeMatchScore({ sharedInterests: 0, ageDiff: 99, intentionsMatch: true }).breakdown.intentions).toBe(15);
    expect(computeMatchScore({ sharedInterests: 0, ageDiff: 99 }).breakdown.intentions).toBe(0);
  });

  it('never exceeds 100', () => {
    const r = computeMatchScore({ sharedInterests: 100, sameCity: true, sameCountry: true, ageDiff: 0, intentionsMatch: true });
    expect(r.total).toBeLessThanOrEqual(100);
  });

  it('matches a realistic example: 3 shared interests, same city, 3 years apart, same intention', () => {
    expect(
      computeMatchScore({ sharedInterests: 3, sameCity: true, ageDiff: 3, intentionsMatch: true }),
    ).toEqual({ total: 85, breakdown: { interests: 30, location: 25, ageProximity: 15, intentions: 15 } });
  });

  it('labels the score as not scientifically validated', () => {
    expect(SCORE_NOTE).toContain('not scientifically validated');
  });
});

describe('ageFromDob (worker implementation)', () => {
  it('computes age correctly around birthdays', () => {
    const now = new Date('2026-11-27');
    expect(ageFromDob('2008-11-27', now)).toBe(18);
    expect(ageFromDob('2008-11-28', now)).toBe(17); // birthday tomorrow
    expect(ageFromDob('2008-11-26', now)).toBe(18);
    expect(ageFromDob('not-a-date', now)).toBeNull();
  });
});
