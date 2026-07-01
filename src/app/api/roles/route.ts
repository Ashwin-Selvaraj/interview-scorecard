import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { rounds: true } },
    },
  });
  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, rounds } = body;

  const role = await prisma.role.create({
    data: {
      name,
      description: description ?? null,
      rounds: {
        create: (rounds ?? []).map(
          (r: { title: string; weight?: number; questions: { text: string; metaTag?: string; purpose?: string }[] }, rIdx: number) => ({
            title: r.title,
            weight: r.weight ?? 1.0,
            orderIndex: rIdx,
            questions: {
              create: r.questions.map((q, qIdx) => ({
                text: q.text,
                purpose: q.purpose ?? null,
                metaTag: q.metaTag ?? null,
                orderIndex: qIdx,
              })),
            },
          })
        ),
      },
    },
    include: {
      rounds: { include: { questions: { orderBy: { orderIndex: "asc" } } }, orderBy: { orderIndex: "asc" } },
    },
  });

  return NextResponse.json(role, { status: 201 });
}
