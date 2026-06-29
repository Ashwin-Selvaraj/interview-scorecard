# Interview Scorecard

A full-stack structured interview tool. Define custom roles with questionnaires, run live interviews with Excellent/Good/Average/Bad ratings, and get an auto-calculated score (out of 10) with hire recommendations.

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM

## Quick Start

### 1. Start PostgreSQL

**Option A — Docker (recommended):**
```bash
docker compose up -d
```

**Option B — Homebrew (macOS, already running):**
```bash
psql -d postgres -U <your-pg-superuser> -c "CREATE USER scorecard WITH PASSWORD 'scorecard' CREATEDB;"
psql -d postgres -U <your-pg-superuser> -c "CREATE DATABASE interview_scorecard OWNER scorecard;"
```

### 2. Install & migrate

```bash
npm install
npx prisma migrate dev --name init
npm run db:seed
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

`.env` is pre-configured for Docker Compose:
```
DATABASE_URL="postgresql://scorecard:scorecard@localhost:5432/interview_scorecard"
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed default AI/ML Junior Engineer role |
| `npm run db:setup` | Migrate + seed in one command |

## Features

- **Role Management** — Create/edit/duplicate roles with custom rounds and questions; soft-delete archived questions to preserve history
- **Interview Screen** — Live scoring per question; auto-save; collapsible rounds; live score pill + recommendation banner
- **History Dashboard** — All interviews sortable by date/score, filterable by role, avg score and hire-rate stats per role, candidate search
- **Scoring** — Excellent=10, Good=7.5, Average=5, Bad=2.5; unrated questions excluded from average

## Scoring Config

Thresholds and point values live in [`src/lib/scoring.ts`](src/lib/scoring.ts).

| Score | Recommendation |
|-------|---------------|
| ≥ 8.3 | Hire immediately |
| ≥ 7.0 | Strong junior |
| ≥ 5.8 | Trainable, needs mentorship |
| < 5.8 | Not ready for current roadmap |

## Seed Data

`npm run db:seed` creates the **AI/ML Junior Engineer** role with 11 rounds and 40 questions:
Core ML · Data Handling · NLP/LLM/Prompt Engineering · 6 Product Scenarios · Deployment/MLOps · Live Coding Task
