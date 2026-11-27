// Transparent match score — NOT scientifically validated.
// Weights: shared interests 40, location 25, age proximity 20, intentions 15 = 100.
// Breakdown is returned with every discover result so the score is explainable.
export interface ScoreInput {
  sharedInterests: number; totalInterests?: number;
  sameCity?: boolean; sameCountry?: boolean;
  ageDiff?: number | null; intentionsMatch?: boolean;
}
export interface ScoreResult { total: number; breakdown: { interests: number; location: number; ageProximity: number; intentions: number } }
export const SCORE_NOTE = 'Match score is a transparent heuristic (shared interests + location + age proximity + intentions) and is not scientifically validated.' as const;
export function computeMatchScore(input: ScoreInput): ScoreResult {
  const interests = Math.min(40, (input.sharedInterests ?? 0) * 10);
  const location = input.sameCity ? 25 : input.sameCountry ? 12 : 0;
  const diff = input.ageDiff ?? 99;
  const ageProximity = diff <= 2 ? 20 : diff <= 5 ? 15 : diff <= 10 ? 8 : 0;
  const intentions = input.intentionsMatch ? 15 : 0;
  return { total: interests + location + ageProximity + intentions, breakdown: { interests, location, ageProximity, intentions } };
}
export function ageFromDob(dob: string, now = new Date()): number | null {
  const d = new Date(dob); if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}
