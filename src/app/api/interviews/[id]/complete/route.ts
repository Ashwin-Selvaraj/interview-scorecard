import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcScore } from "@/lib/scoring";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const answers = await prisma.answer.findMany({ where: { interviewId: id } });
  const score = calcScore(answers.map((a) => a.rating));

  const interview = await prisma.interview.update({
    where: { id },
    data: { status: "completed", completedAt: new Date(), finalScore: score },
  });
  return NextResponse.json(interview);
}
