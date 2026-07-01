import { prisma } from "@/lib/prisma";
import { RATING_POINTS } from "@/lib/scoring";

/**
 * Score an interview using the actual Question→Round relationships at the time
 * of scoring, not the current role structure. This means questions from rounds
 * that were moved/renamed/detached still score correctly via their round's weight.
 */
export async function recalcScore(interviewId: string): Promise<number | null> {
  const answers = await prisma.answer.findMany({
    where: { interviewId },
    include: {
      question: {
        include: { round: { select: { weight: true } } },
      },
    },
  });

  if (answers.length === 0) return null;

  const totalQuestions = answers.length;
  const ratedAnswers = answers.filter((a) => a.rating != null);
  if (ratedAnswers.length === 0) return null;

  const byRound = new Map<string, { weight: number; points: number[] }>();
  for (const a of ratedAnswers) {
    const roundId = a.question.roundId;
    const weight = Math.max(0, a.question.round?.weight ?? 1.0);
    const pts = RATING_POINTS[a.rating as string];
    if (pts == null) continue;
    if (!byRound.has(roundId)) byRound.set(roundId, { weight, points: [] });
    byRound.get(roundId)!.points.push(pts);
  }

  let weightedSum = 0;
  let weightSum = 0;
  for (const { weight, points } of byRound.values()) {
    if (weight <= 0 || points.length === 0) continue;
    const roundMean = points.reduce((s, p) => s + p, 0) / points.length;
    weightedSum += roundMean * weight;
    weightSum += weight;
  }

  if (weightSum === 0) return null;

  const rawScore = weightedSum / weightSum;
  const completionFactor = Math.min(1, (ratedAnswers.length / totalQuestions) / 0.5);

  return Math.round(rawScore * completionFactor * 10) / 10;
}
