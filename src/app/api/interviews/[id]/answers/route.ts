import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalcScore } from "@/lib/recalcScore";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { questionId, rating } = await req.json();

  await prisma.answer.upsert({
    where: { interviewId_questionId: { interviewId: id, questionId } },
    create: { interviewId: id, questionId, rating: rating ?? null },
    update: { rating: rating ?? null },
  });

  const score = await recalcScore(id);
  await prisma.interview.update({ where: { id }, data: { finalScore: score } });

  return NextResponse.json({ score });
}
