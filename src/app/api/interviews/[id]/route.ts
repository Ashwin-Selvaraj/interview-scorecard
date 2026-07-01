import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [interview, commonRounds] = await Promise.all([
    prisma.interview.findUnique({
      where: { id },
      include: {
        candidate: true,
        role: {
          include: {
            rounds: {
              orderBy: { orderIndex: "asc" },
              include: {
                questions: { where: { isArchived: false }, orderBy: { orderIndex: "asc" } },
              },
            },
          },
        },
        answers: true,
      },
    }),
    prisma.round.findMany({
      where: { isCommon: true },
      orderBy: { orderIndex: "asc" },
      include: { questions: { where: { isArchived: false }, orderBy: { orderIndex: "asc" } } },
    }),
  ]);
  if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Count how many times each question has been rated (across all interviews)
  const allQuestionIds = [
    ...interview.role.rounds.flatMap((r) => r.questions.map((q) => q.id)),
    ...commonRounds.flatMap((r) => r.questions.map((q) => q.id)),
  ];
  const usageCounts = await prisma.answer.groupBy({
    by: ["questionId"],
    where: { questionId: { in: allQuestionIds }, rating: { not: null } },
    _count: { questionId: true },
  });
  const questionUsage: Record<string, number> = Object.fromEntries(
    usageCounts.map((u) => [u.questionId, u._count.questionId])
  );

  return NextResponse.json({ ...interview, commonRounds, questionUsage });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.interview.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
