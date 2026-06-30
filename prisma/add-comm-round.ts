import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMM_ROUND = {
  title: "Communication & Behaviour",
  questions: [
    { text: "Walk me through a time you had to explain a complex technical concept to a non-technical stakeholder. How did you approach it and what was the outcome?", purpose: "Tests communication clarity and audience awareness" },
    { text: "Describe a situation where you disagreed with a teammate or manager on a technical decision. How did you handle it?", purpose: "Tests conflict resolution and professional maturity" },
    { text: "Tell me about a project or task that didn't go as planned. What happened and what did you learn?", purpose: "Tests self-awareness, accountability, and growth mindset" },
    { text: "How do you prioritise when you have multiple deadlines competing for your attention?", purpose: "Tests time management and communication under pressure" },
    { text: "Give an example of when you proactively took ownership of something outside your immediate responsibility. What drove you to do that?", purpose: "Tests initiative and ownership mentality" },
    { text: "How do you stay updated with fast-moving fields like AI/ML? Can you walk me through something new you learned in the last month?", purpose: "Tests curiosity, self-learning, and genuine interest in the field" },
    { text: "Describe how you usually communicate progress on a task — especially when things are blocked or delayed.", purpose: "Tests transparency and proactive communication habits" },
  ],
};

async function main() {
  const role = await prisma.role.findFirst({ where: { name: { contains: "AI/ML" } } });
  if (!role) { console.log("Role not found."); return; }

  const existing = await prisma.round.findFirst({ where: { roleId: role.id, title: COMM_ROUND.title } });
  if (existing) { console.log("Communication & Behaviour round already exists, skipping."); return; }

  const maxOrder = await prisma.round.aggregate({ where: { roleId: role.id }, _max: { orderIndex: true } });
  const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

  const round = await prisma.round.create({
    data: {
      roleId: role.id,
      title: COMM_ROUND.title,
      orderIndex: nextOrder,
      questions: {
        create: COMM_ROUND.questions.map((q, i) => ({
          text: q.text,
          purpose: q.purpose,
          orderIndex: i,
        })),
      },
    },
  });

  console.log(`Created round "${round.title}" with ${COMM_ROUND.questions.length} questions (orderIndex ${nextOrder}).`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
