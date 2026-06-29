import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await prisma.role.findUnique({
    where: { id },
    include: {
      rounds: {
        orderBy: { orderIndex: "asc" },
        include: { questions: { where: { isArchived: false }, orderBy: { orderIndex: "asc" } } },
      },
    },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await prisma.role.create({
    data: {
      name: `${source.name} (copy)`,
      description: source.description,
      rounds: {
        create: source.rounds.map((r) => ({
          title: r.title,
          orderIndex: r.orderIndex,
          questions: {
            create: r.questions.map((q) => ({
              text: q.text,
              purpose: q.purpose,
              metaTag: q.metaTag,
              orderIndex: q.orderIndex,
            })),
          },
        })),
      },
    },
  });

  return NextResponse.json(copy, { status: 201 });
}
