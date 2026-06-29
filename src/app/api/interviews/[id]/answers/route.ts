import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/scoring";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { questionId, rating } = await req.json();

  await prisma.answer.upsert({
    where: { interviewId_questionId: { interviewId: id, questionId } },
    create: { interviewId: id, questionId, rating: rating ?? null },
    update: { rating: rating ?? null },
  });

  // Recalculate score
  const answers = await prisma.answer.findMany({ where: { interviewId: id } });
  const score = calcScore(answers.map((a) => a.rating));

  await prisma.interview.update({ where: { id }, data: { finalScore: score } });

  return NextResponse.json({ score });
}
