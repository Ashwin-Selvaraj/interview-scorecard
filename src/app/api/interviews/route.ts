import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roleId = searchParams.get("roleId");

  const interviews = await prisma.interview.findMany({
    where: roleId ? { roleId } : undefined,
    orderBy: { startedAt: "desc" },
    include: {
      candidate: true,
      role: { select: { id: true, name: true } },
      answers: { select: { rating: true } },
    },
  });
  return NextResponse.json(interviews);
}

export async function POST(req: NextRequest) {
  const { candidateName, roleId } = await req.json();

  const [role, commonRounds] = await Promise.all([
    prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rounds: {
          orderBy: { orderIndex: "asc" },
          include: { questions: { where: { isArchived: false }, orderBy: { orderIndex: "asc" } } },
        },
      },
    }),
    prisma.round.findMany({
      where: { isCommon: true },
      orderBy: { orderIndex: "asc" },
      include: { questions: { where: { isArchived: false }, orderBy: { orderIndex: "asc" } } },
    }),
  ]);
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const candidate = await prisma.candidate.create({ data: { name: candidateName, roleId } });

  const allQuestions = [
    ...role.rounds.flatMap((r) => r.questions),
    ...commonRounds.flatMap((r) => r.questions),
  ];
  const interview = await prisma.interview.create({
    data: {
      candidateId: candidate.id,
      roleId,
      answers: {
        create: allQuestions.map((q) => ({ questionId: q.id })),
      },
    },
  });

  return NextResponse.json({ interviewId: interview.id }, { status: 201 });
}
