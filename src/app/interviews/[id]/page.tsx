"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { calcScoreFromRounds, getRecommendation, RATING_POINTS } from "@/lib/scoring";
import { SkeletonRound } from "@/components/Skeleton";
import Spinner from "@/components/Spinner";

function ScoringModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div
        className="bg-[#161b22] border border-[#21262d] rounded-xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-base">Scoring Formula</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="space-y-4 text-sm text-[#c9d1d9]">
          <div>
            <p className="text-[#8b949e] font-medium uppercase text-xs tracking-wider mb-1">Rating Points</p>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(RATING_POINTS).map(([r, pts]) => (
                <div key={r} className="flex justify-between bg-[#0d1117] rounded px-2 py-1">
                  <span className="capitalize">{r}</span>
                  <span className="text-amber-300 font-mono">{pts} pts</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[#8b949e] font-medium uppercase text-xs tracking-wider mb-1">Per-Round Score</p>
            <p className="text-[#8b949e]">Average points of rated questions in that round</p>
          </div>
          <div>
            <p className="text-[#8b949e] font-medium uppercase text-xs tracking-wider mb-1">Weighted Score</p>
            <p className="font-mono text-xs bg-[#0d1117] rounded px-2 py-2 leading-relaxed">
              Σ(round_mean × weight) / Σ(weights)
            </p>
            <p className="text-[#8b949e] mt-1">Rounds with higher weight influence the score more.</p>
          </div>
          <div>
            <p className="text-[#8b949e] font-medium uppercase text-xs tracking-wider mb-1">Completion Penalty</p>
            <p className="font-mono text-xs bg-[#0d1117] rounded px-2 py-2 leading-relaxed">
              factor = min(1, rated / total / 0.5)
            </p>
            <p className="text-[#8b949e] mt-1">
              Below 50% completion → score is scaled down linearly.
              At ≥50% answered → no penalty.
            </p>
          </div>
          <div className="border-t border-[#21262d] pt-3">
            <p className="font-mono text-xs bg-[#0d1117] rounded px-2 py-2">
              final = weighted_score × completion_factor
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type Rating = "excellent" | "good" | "average" | "bad" | null;

interface Question {
  id: string;
  text: string;
  purpose: string | null;
  metaTag: string | null;
  orderIndex: number;
}

interface Round {
  id: string;
  title: string;
  orderIndex: number;
  weight: number;
  questions: Question[];
}

interface Interview {
  id: string;
  status: string;
  candidate: { name: string };
  role: { id: string; name: string; rounds: Round[] };
  answers: { questionId: string; rating: Rating }[];
  finalScore: number | null;
  commonRounds: Round[];
  questionUsage: Record<string, number>;
}

const RATING_CONFIG = {
  excellent: { label: "Excellent", color: "bg-emerald-600 border-emerald-500 text-white", inactive: "border-emerald-800 text-emerald-400 hover:bg-emerald-900/30" },
  good:      { label: "Good",      color: "bg-blue-600 border-blue-500 text-white",    inactive: "border-blue-800 text-blue-400 hover:bg-blue-900/30" },
  average:   { label: "Average",   color: "bg-amber-600 border-amber-500 text-white",  inactive: "border-amber-800 text-amber-400 hover:bg-amber-900/30" },
  bad:       { label: "Bad",       color: "bg-red-700 border-red-600 text-white",      inactive: "border-red-900 text-red-400 hover:bg-red-900/30" },
} as const;

const SCORE_COLOR: Record<string, string> = {
  emerald: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  blue:    "bg-blue-900/50 text-blue-300 border-blue-700",
  amber:   "bg-amber-900/50 text-amber-300 border-amber-700",
  red:     "bg-red-900/50 text-red-300 border-red-700",
};

function RoundBlock({
  round,
  ratings,
  collapsedRounds,
  toggleRound,
  handleRating,
  questionUsage,
}: {
  round: Round;
  ratings: Record<string, Rating>;
  collapsedRounds: Set<string>;
  toggleRound: (id: string) => void;
  handleRating: (questionId: string, rating: keyof typeof RATING_CONFIG) => void;
  questionUsage: Record<string, number>;
}) {
  const collapsed = collapsedRounds.has(round.id);
  const roundRated = round.questions.filter((q) => ratings[q.id] != null).length;
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
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
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {q.metaTag && (
                      <span className="text-xs bg-[#21262d] text-amber-300 border border-amber-800 rounded-full px-2 py-0.5">
                        {q.metaTag}
                      </span>
                    )}
                    {q.purpose && (
                      <span className="text-xs bg-[#21262d] text-purple-300 border border-purple-900 rounded-full px-2 py-0.5">
                        {q.purpose}
                      </span>
                    )}
                    {(questionUsage[q.id] ?? 0) > 0 && (
                      <span className="text-xs bg-[#21262d] text-[#8b949e] border border-[#30363d] rounded-full px-2 py-0.5">
                        asked {questionUsage[q.id]}×
                      </span>
                    )}
                  </div>
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
}

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [collapsedRounds, setCollapsedRounds] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);
  const [savingQueue, setSavingQueue] = useState<Set<string>>(new Set());
  const [showFormula, setShowFormula] = useState(false);

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

  const allRoundsForScoring = interview
    ? [...interview.role.rounds, ...interview.commonRounds].map((r) => ({
        weight: r.weight,
        questionIds: r.questions.map((q) => q.id),
      }))
    : [];
  const currentScore = calcScoreFromRounds(allRoundsForScoring, ratings);
  const rec = getRecommendation(currentScore);

  const allQuestions = [
    ...(interview?.role.rounds.flatMap((r) => r.questions) ?? []),
    ...(interview?.commonRounds.flatMap((r) => r.questions) ?? []),
  ];
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
      <div className="max-w-4xl mx-auto px-4 pb-20 pt-6">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonRound key={i} />)}
        </div>
      </div>
    );
  }

  const progressPct = totalCount > 0 ? (ratedCount / totalCount) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {showFormula && <ScoringModal onClose={() => setShowFormula(false)} />}
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
              <div className="flex items-center gap-1">
                <div className={`px-3 py-1.5 rounded-full border text-sm font-bold ${rec ? SCORE_COLOR[rec.color] : ""}`}>
                  {currentScore.toFixed(1)} / 10
                </div>
                <button
                  onClick={() => setShowFormula(true)}
                  title="How is this score calculated?"
                  className="text-[#484f58] hover:text-[#8b949e] text-base leading-none px-1 transition-colors"
                >
                  ⓘ
                </button>
              </div>
            )}
            <button
              onClick={handleComplete}
              disabled={completing}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2"
            >
              {completing ? <><Spinner size={14} /> Finishing…</> : "Finish & Save"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-[#8b949e] whitespace-nowrap">{ratedCount}/{totalCount} rated</span>
        </div>

        {rec && currentScore !== null && (
          <div className={`mt-3 px-3 py-2 rounded-lg border text-sm font-medium ${SCORE_COLOR[rec.color]}`}>
            {rec.label}
          </div>
        )}
      </div>

      {/* Role-specific rounds */}
      <div className="space-y-4">
        {interview.role.rounds.map((round) => (
          <RoundBlock
            key={round.id}
            round={round}
            ratings={ratings}
            collapsedRounds={collapsedRounds}
            toggleRound={toggleRound}
            handleRating={handleRating}
            questionUsage={interview.questionUsage}
          />
        ))}
      </div>

      {/* Common rounds divider */}
      {interview.commonRounds.length > 0 && (
        <>
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-[#21262d]" />
            <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-widest px-2">
              Common Rounds
            </span>
            <div className="flex-1 h-px bg-[#21262d]" />
          </div>

          <div className="space-y-4">
            {interview.commonRounds.map((round, idx) => {
              const isLast = idx === interview.commonRounds.length - 1;
              return (
                <div key={round.id}>
                  <RoundBlock
                    round={round}
                    ratings={ratings}
                    collapsedRounds={collapsedRounds}
                    toggleRound={toggleRound}
                    handleRating={handleRating}
                    questionUsage={interview.questionUsage}
                  />
                  {isLast && (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleComplete}
                        disabled={completing}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-10 py-3 rounded-xl transition-colors flex items-center gap-2"
                      >
                        {completing ? <><Spinner size={16} /> Finishing…</> : "Finish Interview & Save →"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Finish button when no common rounds */}
      {interview.commonRounds.length === 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleComplete}
            disabled={completing}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-10 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            {completing ? <><Spinner size={16} /> Finishing…</> : "Finish Interview & Save →"}
          </button>
        </div>
      )}
    </div>
  );
}
