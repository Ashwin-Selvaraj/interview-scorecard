import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rounds = await prisma.round.findMany({
    where: { isCommon: true },
    orderBy: { orderIndex: "asc" },
    include: { questions: { where: { isArchived: false }, orderBy: { orderIndex: "asc" } } },
  });
  return NextResponse.json(rounds);
}

export async function POST(req: NextRequest) {
  const { title, questions = [], weight = 1.0 } = await req.json();
  const maxOrder = await prisma.round.aggregate({ where: { isCommon: true }, _max: { orderIndex: true } });
  const round = await prisma.round.create({
    data: {
      title,
      isCommon: true,
      weight,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      questions: {
        create: (questions as { text: string; purpose?: string; metaTag?: string }[]).map((q, i) => ({
          text: q.text,
          purpose: q.purpose ?? null,
          metaTag: q.metaTag ?? null,
          orderIndex: i,
        })),
      },
    },
    include: { questions: { orderBy: { orderIndex: "asc" } } },
  });
  return NextResponse.json(round, { status: 201 });
}
