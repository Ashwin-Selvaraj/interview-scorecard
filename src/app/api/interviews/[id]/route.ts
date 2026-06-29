import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const interview = await prisma.interview.findUnique({
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
  });
  if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(interview);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.interview.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
