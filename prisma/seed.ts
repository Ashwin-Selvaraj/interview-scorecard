import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AI_ML_ROLE = {
  name: "AI/ML Junior Engineer",
  description:
    "For candidates applying to junior AI/ML engineering roles. Covers core ML concepts, data handling, NLP/LLM, product scenarios, deployment, and a live coding task.",
  rounds: [
    {
      title: "Round 1 — Core ML Fundamentals",
      questions: [
        { text: "What is the difference between supervised, unsupervised, and reinforcement learning? Give an example of each." },
        { text: "What is overfitting and how do you prevent it?" },
        { text: "Explain the purpose of train, validation, and test splits. Why do we need all three?" },
        { text: "What is precision, recall, and F1 score? When would you prioritize precision over recall?" },
        { text: "Walk me through a confusion matrix. What does each cell represent?" },
        { text: "Have you used an LLM API (e.g., OpenAI, Anthropic, Gemini)? Describe a project or experiment you did with it.", metaTag: "TheMemeTV — top priority" },
        { text: "How would you reduce the cost of calling an AI API in a production app? Name at least 2 strategies." },
      ],
    },
    {
      title: "Round 2 — Data Handling & Practical ML",
      questions: [
        { text: "How do you handle missing data in a dataset? What are the trade-offs between different strategies?" },
        { text: "When is accuracy a misleading metric? What would you use instead and why?" },
        { text: "Your training data has noisy labels (some are mislabeled). How do you detect and handle this?" },
      ],
    },
    {
      title: "Round 3 — NLP & LLM / Prompt Engineering",
      questions: [
        { text: "What is prompt engineering? Give me an example of a bad prompt and how you'd improve it." },
        { text: "You're building an AI feature that generates live commentary on financial charts. How would you prompt the model to produce concise, non-repetitive, context-aware text?", metaTag: "TheMemeTV — top priority" },
        { text: "How do you prevent an LLM from repeating itself across multiple chart commentary calls in the same session?" },
        { text: "What happens if the model receives incomplete or missing data fields? How do you make the prompt degrade gracefully?" },
        { text: "How would you use an LLM or ML model to detect toxic or spam content in user-generated posts?" },
        { text: "How would you extract structured information (e.g., issue category, location, severity) from free-text complaints submitted by users?" },
      ],
    },
    {
      title: "Round 4A — Product Scenario: Chart Commentary Engine",
      questions: [
        { text: "Design a system that generates AI commentary for 20 different charts on a financial dashboard. How do you structure the prompts and manage context?", metaTag: "TheMemeTV" },
        { text: "How do you ensure the commentary for one chart doesn't contradict another on the same dashboard?" },
        { text: "The chart data updates every 30 seconds. How do you decide when to re-trigger AI commentary vs. cache the old one?" },
        { text: "A chart has no significant movement (flat line). How does your system handle this gracefully in commentary?" },
      ],
    },
    {
      title: "Round 4B — Product Scenario: Civic Issue Classification",
      questions: [
        { text: "You're building a system that reads citizen complaint texts and assigns them to the correct city department. How would you design this pipeline?" },
        { text: "What model/approach would you use: a fine-tuned classifier, an LLM with few-shot prompting, or a rules-based system? Justify your choice." },
        { text: "How do you handle ambiguous complaints that could belong to multiple departments?" },
        { text: "How do you evaluate the performance of this classification system in production?" },
      ],
    },
    {
      title: "Round 4C — Product Scenario: Personalized Insights & Privacy",
      questions: [
        { text: "You want to generate personalized AI insights for each user based on their activity data. What data would you feed into the model, and how?" },
        { text: "How do you handle user privacy when sending personal data to an LLM API?" },
        { text: "A user's data is sparse (new user with little history). How do you still generate meaningful insights?" },
        { text: "How would you A/B test whether the AI-generated insights actually improve user engagement?" },
      ],
    },
    {
      title: "Round 4D — Product Scenario: Social & Quest Intelligence",
      questions: [
        { text: "Design an AI feature that recommends 'quests' or challenges to users based on their social graph and past activity." },
        { text: "How would you handle the cold-start problem for a brand new user with no social connections?" },
        { text: "How do you prevent the recommendation engine from creating filter bubbles or echo chambers?" },
      ],
    },
    {
      title: "Round 4E — Product Scenario: Prediction & Engagement",
      questions: [
        { text: "You want to predict which users are likely to churn in the next 7 days. What features would you use and what model would you build?" },
        { text: "How do you turn a churn prediction into an actionable intervention? Walk me through the full pipeline." },
        { text: "Your churn model has 90% accuracy but the business says it's not useful. What's likely wrong, and how do you fix it?" },
      ],
    },
    {
      title: "Round 4F — Product Scenario: On-Device / WebGPU AI",
      questions: [
        { text: "What are the trade-offs of running an AI model on-device (in the browser via WebGPU/WASM) vs. calling a cloud API?" },
        { text: "What types of ML tasks are well-suited to on-device inference, and which are not?" },
        { text: "How would you handle model updates and versioning when the model is bundled with a client-side web app?" },
      ],
    },
    {
      title: "Round 5 — Deployment & MLOps",
      questions: [
        { text: "How do you monitor an ML model in production? What signals would tell you the model is degrading?" },
        { text: "Explain the difference between model retraining and model fine-tuning. When would you do each?" },
      ],
    },
    {
      title: "Live Coding Task",
      questions: [
        { text: "Given a list of product reviews (strings), write a function that calls an LLM API to classify each review as Positive, Neutral, or Negative, and returns the results as a structured list. Optimize for cost and latency.", metaTag: "Live coding — 20 min" },
      ],
    },
  ],
};

async function main() {
  const existing = await prisma.role.findUnique({ where: { name: AI_ML_ROLE.name } });
  if (existing) {
    console.log("Seed data already present, skipping.");
    return;
  }

  await prisma.role.create({
    data: {
      name: AI_ML_ROLE.name,
      description: AI_ML_ROLE.description,
      rounds: {
        create: AI_ML_ROLE.rounds.map((round, rIdx) => ({
          title: round.title,
          orderIndex: rIdx,
          questions: {
            create: round.questions.map((q, qIdx) => ({
              text: q.text,
              metaTag: (q as { text: string; metaTag?: string }).metaTag ?? null,
              orderIndex: qIdx,
            })),
          },
        })),
      },
    },
  });

  console.log("Seeded AI/ML Junior Engineer role.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
