import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const roles = await prisma.role.findMany({ select: { id: true, name: true } });

  const stats = await Promise.all(
    roles.map(async (role) => {
      const interviews = await prisma.interview.findMany({
        where: { roleId: role.id, status: "completed" },
        select: { finalScore: true },
      });
      const scores = interviews.map((i) => i.finalScore).filter((s): s is number => s !== null);
      const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
      const hireCount = scores.filter((s) => s >= 8.3).length;
      const hireRate = scores.length > 0 ? Math.round((hireCount / scores.length) * 100) : null;
      return { roleId: role.id, roleName: role.name, totalInterviews: interviews.length, avgScore: avg, hireRate };
    })
  );

  const totalInterviews = await prisma.interview.count();

  return NextResponse.json({ totalInterviews, stats });
}
