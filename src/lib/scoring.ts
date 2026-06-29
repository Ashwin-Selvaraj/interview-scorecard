export const RATING_POINTS: Record<string, number> = {
  excellent: 10,
  good: 7.5,
  average: 5,
  bad: 2.5,
};

export const RECOMMENDATION_THRESHOLDS = [
  { min: 8.3, label: "Hire immediately", color: "emerald" },
  { min: 7.0, label: "Strong junior", color: "blue" },
  { min: 5.8, label: "Trainable, needs mentorship", color: "amber" },
  { min: 0, label: "Not ready for current roadmap", color: "red" },
] as const;

export function calcScore(ratings: (string | null)[]): number | null {
  const rated = ratings.filter((r) => r != null && r in RATING_POINTS);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, r) => acc + RATING_POINTS[r!], 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

export function getRecommendation(score: number | null) {
  if (score === null) return null;
  return RECOMMENDATION_THRESHOLDS.find((t) => score >= t.min) ?? RECOMMENDATION_THRESHOLDS[RECOMMENDATION_THRESHOLDS.length - 1];
}
