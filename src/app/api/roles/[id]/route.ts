import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      rounds: {
        orderBy: { orderIndex: "asc" },
        include: {
          questions: { where: { isArchived: false }, orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });
  if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(role);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, description, rounds } = body;

  // Get existing question IDs that have answers (must not hard-delete)
  const answeredQuestionIds = new Set(
    (
      await prisma.answer.findMany({
        where: { question: { round: { roleId: id } } },
        select: { questionId: true },
      })
    ).map((a) => a.questionId)
  );

  // Archive old questions that are answered but not in the new set
  const incomingQuestionIds = new Set(
    (rounds ?? []).flatMap((r: { questions: { id?: string }[] }) =>
      r.questions.filter((q: { id?: string }) => q.id).map((q: { id?: string }) => q.id!)
    )
  );

  // Archive answered questions not in incoming set
  const toArchive = [...answeredQuestionIds].filter((qId) => !incomingQuestionIds.has(qId));
  if (toArchive.length > 0) {
    await prisma.question.updateMany({ where: { id: { in: toArchive } }, data: { isArchived: true } });
  }

  // Delete non-answered questions not in incoming set (cleanup)
  await prisma.question.deleteMany({
    where: { round: { roleId: id }, id: { notIn: [...incomingQuestionIds] as string[] }, isArchived: false, answers: { none: {} } },
  });

  // Delete rounds not in incoming set (they cascade-delete their non-answered questions)
  const incomingRoundIds = new Set(
    (rounds ?? []).filter((r: { id?: string }) => r.id).map((r: { id?: string }) => r.id!)
  );
  await prisma.round.deleteMany({ where: { roleId: id, id: { notIn: [...incomingRoundIds] as string[] } } });

  // Upsert rounds and questions
  for (let rIdx = 0; rIdx < (rounds ?? []).length; rIdx++) {
    const r = rounds[rIdx];
    let round;
    if (r.id) {
      round = await prisma.round.update({ where: { id: r.id }, data: { title: r.title, orderIndex: rIdx } });
    } else {
      round = await prisma.round.create({ data: { roleId: id, title: r.title, orderIndex: rIdx } });
    }
    for (let qIdx = 0; qIdx < (r.questions ?? []).length; qIdx++) {
      const q = r.questions[qIdx];
      if (q.id) {
        await prisma.question.update({
          where: { id: q.id },
          data: { text: q.text, metaTag: q.metaTag ?? null, orderIndex: qIdx, isArchived: false },
        });
      } else {
        await prisma.question.create({
          data: { roundId: round.id, text: q.text, metaTag: q.metaTag ?? null, orderIndex: qIdx },
        });
      }
    }
  }

  const updated = await prisma.role.update({
    where: { id },
    data: { name, description: description ?? null },
    include: {
      rounds: {
        orderBy: { orderIndex: "asc" },
        include: { questions: { where: { isArchived: false }, orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.role.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
