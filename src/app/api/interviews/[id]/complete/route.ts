import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recalcScore } from "@/lib/recalcScore";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const score = await recalcScore(id);

  const interview = await prisma.interview.update({
    where: { id },
    data: { status: "completed", completedAt: new Date(), finalScore: score },
  });
  return NextResponse.json(interview);
}
