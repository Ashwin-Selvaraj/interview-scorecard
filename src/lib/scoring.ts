export const RATING_POINTS: Record<string, number> = {
  excellent: 10,
  good: 7.5,
  average: 5,
  bad: 2.5,
};

export const RECOMMENDATION_THRESHOLDS = [
  { min: 8.3, label: "Hire immediately",          color: "emerald" },
  { min: 7.0, label: "Strong junior",             color: "blue"    },
  { min: 5.8, label: "Trainable, needs mentorship", color: "amber" },
  { min: 0,   label: "Not ready for current roadmap", color: "red" },
] as const;

// ─── Core scoring types ───────────────────────────────────────────────────────

export interface RoundForScoring {
  weight: number;
  questionIds: string[];
}

/**
 * Weighted, completion-aware scoring engine.
 *
 * Algorithm:
 *   1. For each round that has ≥1 rated question:
 *        round_mean = average RATING_POINTS of its rated questions
 *        weighted_sum += round_mean × round.weight
 *        weight_sum  += round.weight
 *
 *   2. raw_score = weighted_sum / weight_sum  (0–10)
 *
 *   3. Completion penalty (below 50% overall → linear dampening):
 *        completion_factor = min(1, total_rated / total_questions / 0.5)
 *
 *   4. final_score = raw_score × completion_factor
 *
 * Properties:
 *   - New rounds added later automatically participate (no code change needed).
 *   - Skipping a round doesn't hurt the weighted average but reduces completion.
 *   - Doing < 50% of all questions caps the score proportionally.
 *   - Weight = 0 effectively disables a round from scoring.
 */
export function calcScoreFromRounds(
  rounds: RoundForScoring[],
  ratings: Record<string, string | null>
): number | null {
  const totalQuestions = rounds.reduce((s, r) => s + r.questionIds.length, 0);
  if (totalQuestions === 0) return null;

  const totalRated = rounds.reduce(
    (s, r) => s + r.questionIds.filter((id) => ratings[id] != null).length,
    0
  );
  if (totalRated === 0) return null;

  let weightedSum = 0;
  let weightSum = 0;

  for (const round of rounds) {
    const w = Math.max(0, Number(round.weight) || 1.0); // guard undefined/NaN
    if (w <= 0) continue;

    const ratedPoints = round.questionIds
      .map((id) => ratings[id])
      .filter((r): r is string => r != null && r in RATING_POINTS)
      .map((r) => RATING_POINTS[r]);

    if (ratedPoints.length === 0) continue;

    const roundMean = ratedPoints.reduce((s, p) => s + p, 0) / ratedPoints.length;
    weightedSum += roundMean * w;
    weightSum   += w;
  }

  if (weightSum === 0) return null;

  const rawScore = weightedSum / weightSum;

  // Completion penalty: linear ramp — 0% done → 0×, 50%+ done → 1×
  const overallCompletion = totalRated / totalQuestions;
  const completionFactor  = Math.min(1, overallCompletion / 0.5);

  return Math.round(rawScore * completionFactor * 10) / 10;
}

/**
 * Convenience wrapper for the legacy flat-ratings call sites that don't have
 * round structure (e.g., the client-side live display before round data loads).
 * Treats all ratings as belonging to one virtual round with weight 1.
 * Does NOT apply round weights or completion penalty — use calcScoreFromRounds
 * for accurate scoring.
 */
export function calcScore(ratings: (string | null)[]): number | null {
  const rated = ratings.filter((r) => r != null && r in RATING_POINTS);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, r) => acc + RATING_POINTS[r!], 0);
  return Math.round((sum / rated.length) * 10) / 10;
}

export function getRecommendation(score: number | null) {
  if (score === null) return null;
  return (
    RECOMMENDATION_THRESHOLDS.find((t) => score >= t.min) ??
    RECOMMENDATION_THRESHOLDS[RECOMMENDATION_THRESHOLDS.length - 1]
  );
}
