"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/Spinner";
import { SkeletonRoleCard } from "@/components/Skeleton";

interface Question {
  id?: string;
  text: string;
  purpose: string;
  metaTag: string;
}

interface Round {
  id: string;
  title: string;
  orderIndex: number;
  questions: Question[];
}

function QuestionRow({
  q,
  idx,
  onChange,
  onRemove,
}: {
  q: Question;
  idx: number;
  onChange: (f: Partial<Question>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-[#30363d] rounded-lg p-4 space-y-2 bg-[#0d1117]">
      <div className="flex items-start gap-2">
        <span className="text-xs text-[#484f58] mt-2.5 shrink-0">Q{idx + 1}</span>
        <textarea
          value={q.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Question text"
          rows={2}
          className="flex-1 bg-transparent border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 resize-none"
        />
        <button onClick={onRemove} className="text-[#484f58] hover:text-red-400 mt-1 text-lg leading-none">×</button>
      </div>
      <div className="flex gap-2 pl-6">
        <input
          value={q.purpose}
          onChange={(e) => onChange({ purpose: e.target.value })}
          placeholder="Why we ask this (optional)"
          className="flex-1 bg-transparent border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-purple-300 placeholder-[#484f58] focus:outline-none focus:border-purple-500"
        />
        <input
          value={q.metaTag}
          onChange={(e) => onChange({ metaTag: e.target.value })}
          placeholder="Tag (optional)"
          className="w-36 bg-transparent border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-amber-300 placeholder-[#484f58] focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  );
}

function RoundEditor({
  round,
  onSaved,
  onDeleted,
}: {
  round: Round;
  onSaved: (r: Round) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(round.title);
  const [questions, setQuestions] = useState<Question[]>(round.questions.map((q) => ({ ...q, purpose: q.purpose ?? "", metaTag: q.metaTag ?? "" })));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  function updateQ(i: number, f: Partial<Question>) {
    setQuestions((qs) => qs.map((q, idx) => idx === i ? { ...q, ...f } : q));
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/common-rounds/${round.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, questions }),
    });
    const updated = await res.json();
    setSaving(false);
    onSaved(updated);
  }

  async function handleDelete() {
    if (!confirm(`Delete round "${title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/common-rounds/${round.id}`, { method: "DELETE" });
    onDeleted(round.id);
  }

  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#1c2128] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white">{title || "Untitled round"}</span>
          <span className="text-xs text-[#8b949e]">{questions.length} questions</span>
        </div>
        <span className="text-[#8b949e] text-lg">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-[#21262d]">
          <div className="pt-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Round title"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm font-semibold text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionRow
                key={q.id ?? i}
                q={q}
                idx={i}
                onChange={(f) => updateQ(i, f)}
                onRemove={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>

          <button
            onClick={() => setQuestions((qs) => [...qs, { text: "", purpose: "", metaTag: "" }])}
            className="text-xs text-blue-400 hover:text-blue-300 border border-dashed border-blue-800 hover:border-blue-600 rounded-lg px-4 py-2 w-full transition-colors"
          >
            + Add Question
          </button>

          <div className="flex items-center justify-between pt-2 border-t border-[#21262d]">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50"
            >
              {deleting ? <><Spinner size={12} /> Deleting…</> : "Delete round"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              {saving ? <><Spinner size={14} /> Saving…</> : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommonRoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => { load(); }, []);

  function load() {
    setIsLoading(true);
    fetch("/api/common-rounds")
      .then((r) => r.json())
      .then((data) => { setRounds(data); setIsLoading(false); });
  }

  async function handleAddRound() {
    setAdding(true);
    const res = await fetch("/api/common-rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New common round", questions: [] }),
    });
    const newRound = await res.json();
    setRounds((rs) => [...rs, newRound]);
    setAdding(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Common Rounds</h1>
          <p className="text-sm text-[#8b949e] mt-1">These rounds are automatically added to every interview, regardless of role.</p>
        </div>
        <button
          onClick={handleAddRound}
          disabled={adding}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
        >
          {adding ? <><Spinner size={14} /> Adding…</> : "+ New Round"}
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => <SkeletonRoleCard key={i} />)
        ) : rounds.length === 0 ? (
          <div className="text-center py-16 text-[#8b949e]">
            <p className="mb-4">No common rounds yet.</p>
            <button onClick={handleAddRound} className="text-blue-400 hover:text-blue-300">
              Create your first common round →
            </button>
          </div>
        ) : (
          rounds.map((round) => (
            <RoundEditor
              key={round.id}
              round={round}
              onSaved={(updated) => setRounds((rs) => rs.map((r) => r.id === updated.id ? updated : r))}
              onDeleted={(id) => setRounds((rs) => rs.filter((r) => r.id !== id))}
            />
          ))
        )}
      </div>

      <div className="mt-8 p-4 bg-[#161b22] border border-[#21262d] rounded-xl text-sm text-[#8b949e]">
        <p className="font-medium text-white mb-1">How common rounds work</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Added to <span className="text-white">every new interview</span>, after the role-specific rounds</li>
          <li>Shown with a "Common Rounds" divider on the interview screen</li>
          <li>Scored together with role questions — affects the overall score</li>
          <li>Changes here apply to <span className="text-white">future interviews only</span>; existing interviews keep the questions they were created with</li>
        </ul>
      </div>
    </div>
  );
}
