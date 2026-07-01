import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { title, questions = [], weight = 1.0 } = await req.json();

  const incoming = questions as { id?: string; text: string; purpose?: string; metaTag?: string }[];
  const incomingIds = incoming.filter((q) => q.id).map((q) => q.id as string);

  // Find questions being removed
  const toRemove = await prisma.question.findMany({
    where: {
      roundId: id,
      isArchived: false,
      ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
    },
    include: { answers: { take: 1 } },
  });

  for (const q of toRemove) {
    if (q.answers.length > 0) {
      // Has historical answers — soft-archive so scores remain valid
      await prisma.question.update({ where: { id: q.id }, data: { isArchived: true } });
    } else {
      await prisma.question.delete({ where: { id: q.id } });
    }
  }

  await prisma.round.update({ where: { id }, data: { title, weight: Math.max(0, Number(weight) || 1.0) } });

  for (let i = 0; i < incoming.length; i++) {
    const q = incoming[i];
    if (q.id) {
      await prisma.question.update({
        where: { id: q.id },
        data: { text: q.text, purpose: q.purpose ?? null, metaTag: q.metaTag ?? null, orderIndex: i, isArchived: false },
      });
    } else {
      await prisma.question.create({
        data: { roundId: id, text: q.text, purpose: q.purpose ?? null, metaTag: q.metaTag ?? null, orderIndex: i },
      });
    }
  }

  const updated = await prisma.round.findUnique({
    where: { id },
    include: { questions: { where: { isArchived: false }, orderBy: { orderIndex: "asc" } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Cascade: delete answers → questions → round (Answer has no onDelete:Cascade in schema)
  const questions = await prisma.question.findMany({ where: { roundId: id }, select: { id: true } });
  const qIds = questions.map((q) => q.id);

  await prisma.answer.deleteMany({ where: { questionId: { in: qIds } } });
  await prisma.question.deleteMany({ where: { roundId: id } });
  await prisma.round.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
