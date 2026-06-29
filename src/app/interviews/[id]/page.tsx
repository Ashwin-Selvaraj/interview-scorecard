"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { calcScore, getRecommendation, RATING_POINTS } from "@/lib/scoring";

type Rating = "excellent" | "good" | "average" | "bad" | null;

interface Question {
  id: string;
  text: string;
  metaTag: string | null;
  orderIndex: number;
}

interface Round {
  id: string;
  title: string;
  orderIndex: number;
  questions: Question[];
}

interface Interview {
  id: string;
  status: string;
  candidate: { name: string };
  role: { id: string; name: string; rounds: Round[] };
  answers: { questionId: string; rating: Rating }[];
  finalScore: number | null;
}

const RATING_CONFIG = {
  excellent: { label: "Excellent", color: "bg-emerald-600 border-emerald-500 text-white", inactive: "border-emerald-800 text-emerald-400 hover:bg-emerald-900/30" },
  good: { label: "Good", color: "bg-blue-600 border-blue-500 text-white", inactive: "border-blue-800 text-blue-400 hover:bg-blue-900/30" },
  average: { label: "Average", color: "bg-amber-600 border-amber-500 text-white", inactive: "border-amber-800 text-amber-400 hover:bg-amber-900/30" },
  bad: { label: "Bad", color: "bg-red-700 border-red-600 text-white", inactive: "border-red-900 text-red-400 hover:bg-red-900/30" },
} as const;

const SCORE_COLOR: Record<string, string> = {
  emerald: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  blue: "bg-blue-900/50 text-blue-300 border-blue-700",
  amber: "bg-amber-900/50 text-amber-300 border-amber-700",
  red: "bg-red-900/50 text-red-300 border-red-700",
};

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [savingQueue, setSavingQueue] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/interviews/${id}`)
      .then((r) => r.json())
      .then((data: Interview) => {
        setInterview(data);
        const r: Record<string, Rating> = {};
        for (const a of data.answers) r[a.questionId] = a.rating;
        setRatings(r);
      });
  }, [id]);

  const currentScore = calcScore(Object.values(ratings));
  const rec = getRecommendation(currentScore);

  const allQuestions = interview?.role.rounds.flatMap((r) => r.questions) ?? [];
  const ratedCount = Object.values(ratings).filter((r) => r !== null && r !== undefined).length;
  const totalCount = allQuestions.length;

  const saveRating = useCallback(
    async (questionId: string, rating: Rating) => {
      setSavingQueue((q) => new Set([...q, questionId]));
      await fetch(`/api/interviews/${id}/answers`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, rating }),
      });
      setSavingQueue((q) => {
        const next = new Set(q);
        next.delete(questionId);
        return next;
      });
    },
    [id]
  );

  function handleRating(questionId: string, rating: keyof typeof RATING_CONFIG) {
    const newRating = ratings[questionId] === rating ? null : rating;
    setRatings((prev) => ({ ...prev, [questionId]: newRating }));
    saveRating(questionId, newRating);
  }

  async function handleComplete() {
    setCompleting(true);
    await fetch(`/api/interviews/${id}/complete`, { method: "POST" });
    router.push("/interviews");
  }

  function toggleRound(roundId: string) {
    setCollapsedRounds((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  }

  if (!interview) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="text-[#8b949e]">Loading interview…</div>
      </div>
    );
  }

  const progressPct = totalCount > 0 ? (ratedCount / totalCount) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {/* Sticky header */}
      <div className="sticky top-14 z-40 bg-[#0d1117] border-b border-[#21262d] pt-4 pb-3 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h1 className="text-xl font-bold text-white">{interview.candidate.name}</h1>
            <p className="text-sm text-[#8b949e]">{interview.role.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {savingQueue.size > 0 && <span className="text-xs text-[#8b949e]">Saving…</span>}
            {currentScore !== null && (
              <div className={`px-3 py-1.5 rounded-full border text-sm font-bold ${rec ? SCORE_COLOR[rec.color] : ""}`}>
                {currentScore.toFixed(1)} / 10
              </div>
            )}
            <button
              onClick={handleComplete}
              disabled={completing}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              {completing ? "Finishing…" : "Finish & Save"}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-[#8b949e] whitespace-nowrap">{ratedCount}/{totalCount} rated</span>
        </div>

        {/* Recommendation banner */}
        {rec && currentScore !== null && (
          <div className={`mt-3 px-3 py-2 rounded-lg border text-sm font-medium ${SCORE_COLOR[rec.color]}`}>
            {rec.label}
          </div>
        )}
      </div>

      {/* Rounds */}
      <div className="space-y-4">
        {interview.role.rounds.map((round) => {
          const collapsed = collapsedRounds.has(round.id);
          const roundRated = round.questions.filter((q) => ratings[q.id] != null).length;
          return (
            <div key={round.id} className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
              <button
                onClick={() => toggleRound(round.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1c2128] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white text-left">{round.title}</span>
                  <span className="text-xs text-[#8b949e]">{roundRated}/{round.questions.length}</span>
                </div>
                <span className="text-[#8b949e] text-lg">{collapsed ? "▸" : "▾"}</span>
              </button>

              {!collapsed && (
                <div className="px-5 pb-5 space-y-4">
                  {round.questions.map((q, qi) => (
                    <div key={q.id} className="border-t border-[#21262d] pt-4">
                      <div className="flex items-start gap-2 mb-3">
                        <span className="text-xs text-[#484f58] mt-0.5 shrink-0">Q{qi + 1}</span>
                        <div className="flex-1">
                          <p className="text-[#c9d1d9] text-sm leading-relaxed">{q.text}</p>
                          {q.metaTag && (
                            <span className="mt-1.5 inline-block text-xs bg-[#21262d] text-amber-300 border border-amber-800 rounded-full px-2 py-0.5">
                              {q.metaTag}
                            </span>
                          )}
                        </div>
                        {ratings[q.id] && (
                          <span className="text-xs text-[#484f58] shrink-0">
                            {RATING_POINTS[ratings[q.id]!]}pts
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(RATING_CONFIG) as Array<keyof typeof RATING_CONFIG>).map((r) => {
                          const active = ratings[q.id] === r;
                          return (
                            <button
                              key={r}
                              onClick={() => handleRating(q.id, r)}
                              className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                                active ? RATING_CONFIG[r].color : `bg-transparent ${RATING_CONFIG[r].inactive}`
                              }`}
                            >
                              {RATING_CONFIG[r].label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom finish button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleComplete}
          disabled={completing}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
        >
          {completing ? "Finishing…" : "Finish Interview & Save →"}
        </button>
      </div>
    </div>
  );
}
