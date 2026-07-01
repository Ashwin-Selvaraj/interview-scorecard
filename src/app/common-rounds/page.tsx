"use client";

import { useState, useEffect, useRef } from "react";
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
  weight: number;
  questions: Question[];
}

// ── JSON template users can download ─────────────────────────────────────────
const TEMPLATE_JSON = JSON.stringify(
  [
    { question: "Walk me through a conflict you had with a teammate and how you resolved it.", purpose: "Tests conflict resolution", metaTag: "" },
    { question: "Describe a time you had to learn something quickly under pressure.", purpose: "Tests adaptability", metaTag: "" },
  ],
  null,
  2
);

// ── Parse an uploaded JSON file → array of Question drafts ───────────────────
function parseImportedJSON(text: string): Question[] {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("JSON must be an array of objects.");
  const qs: Question[] = [];
  for (const row of parsed) {
    const text =
      (row.question ?? row.Question ?? row.text ?? row.Text ?? "").trim();
    if (!text) continue;
    qs.push({
      text,
      purpose: (row.purpose ?? row.Purpose ?? "").trim(),
      metaTag: (row.metaTag ?? row.metatag ?? row.meta_tag ?? "").trim(),
    });
  }
  if (qs.length === 0) throw new Error("No valid questions found. Make sure each object has a 'question' or 'text' field.");
  return qs;
}

// ── Single question row editor ────────────────────────────────────────────────
function QuestionRow({
  q,
  idx,
  isNew,
  onChange,
  onRemove,
}: {
  q: Question;
  idx: number;
  isNew?: boolean;
  onChange: (f: Partial<Question>) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`border rounded-lg p-4 space-y-2 bg-[#0d1117] ${isNew ? "border-blue-700" : "border-[#30363d]"}`}>
      <div className="flex items-start gap-2">
        <span className="text-xs text-[#484f58] mt-2.5 shrink-0">Q{idx + 1}</span>
        {isNew && <span className="text-xs text-blue-400 mt-2.5 shrink-0">new</span>}
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

// ── Per-round editor with import panel ───────────────────────────────────────
function RoundEditor({
  round,
  allRounds,
  onSaved,
  onDeleted,
}: {
  round: Round;
  allRounds: Round[];
  onSaved: (r: Round) => void;
  onDeleted: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(round.title);
  const [weight, setWeight] = useState(round.weight ?? 1.0);
  const [questions, setQuestions] = useState<Question[]>(
    round.questions.map((q) => ({ ...q, purpose: q.purpose ?? "", metaTag: q.metaTag ?? "" }))
  );
  // track which question indices were just added by import so we can highlight them
  const [newIdxs, setNewIdxs] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [importError, setImportError] = useState("");
  const [importTarget, setImportTarget] = useState<"this" | string>("this"); // "this" | round.id
  const [lastImportCount, setLastImportCount] = useState<{ added: number; skipped: number } | null>(null);

  function updateQ(i: number, f: Partial<Question>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...f } : q)));
  }

  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/common-rounds/${round.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, weight: Math.max(0, Number(weight) || 1.0), questions }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const updated = await res.json();
      setNewIdxs(new Set());
      onSaved(updated);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete round "${title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/common-rounds/${round.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      onDeleted(round.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed. Please try again.");
      setDeleting(false);
    }
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError("");
    setLastImportCount(null);
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const text = await file.text();

    let incoming: Question[];
    try {
      if (!file.name.endsWith(".json")) throw new Error("Only .json files are supported here. Use the template below.");
      incoming = parseImportedJSON(text);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to parse file.");
      return;
    }

    if (importTarget === "this") {
      // Dedup against existing questions in THIS round (by normalised text)
      const existing = new Set(questions.map((q) => q.text.trim().toLowerCase()));
      const toAdd = incoming.filter((q) => !existing.has(q.text.trim().toLowerCase()));
      const skipped = incoming.length - toAdd.length;
      const startIdx = questions.length;
      setQuestions((qs) => [...qs, ...toAdd]);
      setNewIdxs(new Set(toAdd.map((_, i) => startIdx + i)));
      setLastImportCount({ added: toAdd.length, skipped });
      if (!open) setOpen(true);
    } else {
      // Adding to a different round — we need the parent to handle it
      // We call the API directly: PUT the target round with merged questions
      const targetRound = allRounds.find((r) => r.id === importTarget);
      if (!targetRound) return;
      const existing = new Set(targetRound.questions.map((q) => q.text.trim().toLowerCase()));
      const toAdd = incoming.filter((q) => !existing.has(q.text.trim().toLowerCase()));
      const skipped = incoming.length - toAdd.length;

      const merged = [
        ...targetRound.questions.map((q) => ({ ...q, purpose: q.purpose ?? "", metaTag: q.metaTag ?? "" })),
        ...toAdd,
      ];
      const res = await fetch(`/api/common-rounds/${targetRound.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: targetRound.title, questions: merged }),
      });
      const updated = await res.json();
      onSaved(updated);
      setLastImportCount({ added: toAdd.length, skipped });
    }
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_JSON], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "common-round-template.json";
    a.click();
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
          {/* Title + weight */}
          <div className="pt-4 flex gap-3 items-center">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Round title"
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm font-semibold text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-[#484f58]">weight</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-16 bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-2 text-xs text-amber-300 text-center focus:outline-none focus:border-amber-500"
                title="Scoring weight for this round (higher = matters more)"
              />
            </div>
          </div>

          {/* Import panel */}
          <div className="bg-[#1c2128] border border-[#30363d] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white">Import from JSON</h3>
              <button onClick={downloadTemplate} className="text-xs text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#8b949e] px-2 py-1 rounded-lg transition-colors">
                ↓ template.json
              </button>
            </div>

            <p className="text-xs text-[#8b949e]">
              Upload a <span className="text-white">.json</span> array. Each object needs a{" "}
              <code className="text-blue-300">question</code> field. Duplicate questions are automatically skipped.
            </p>

            {/* Target round selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8b949e] shrink-0">Add to:</span>
              <select
                value={importTarget}
                onChange={(e) => setImportTarget(e.target.value)}
                className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="this">This round — {title || "Untitled"}</option>
                {allRounds.filter((r) => r.id !== round.id).map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Choose file…
              </button>
              {lastImportCount && (
                <span className="text-xs text-emerald-400">
                  +{lastImportCount.added} added{lastImportCount.skipped > 0 ? `, ${lastImportCount.skipped} duplicate${lastImportCount.skipped > 1 ? "s" : ""} skipped` : ""}
                </span>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".json" onChange={handleFileImport} className="hidden" />
            {importError && <p className="text-red-400 text-xs">{importError}</p>}
          </div>

          {/* Questions list */}
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionRow
                key={q.id ?? `new-${i}`}
                q={q}
                idx={i}
                isNew={newIdxs.has(i)}
                onChange={(f) => updateQ(i, f)}
                onRemove={() => {
                  setQuestions((qs) => qs.filter((_, idx) => idx !== i));
                  setNewIdxs((s) => {
                    const next = new Set<number>();
                    s.forEach((n) => { if (n < i) next.add(n); else if (n > i) next.add(n - 1); });
                    return next;
                  });
                }}
              />
            ))}
          </div>

          <button
            onClick={() => setQuestions((qs) => [...qs, { text: "", purpose: "", metaTag: "" }])}
            className="text-xs text-blue-400 hover:text-blue-300 border border-dashed border-blue-800 hover:border-blue-600 rounded-lg px-4 py-2 w-full transition-colors"
          >
            + Add Question
          </button>

          {saveError && <p className="text-red-400 text-xs">{saveError}</p>}
          <div className="flex items-center justify-between pt-2 border-t border-[#21262d]">
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50"
            >
              {deleting ? <><Spinner size={12} /> Deleting…</> : "Delete round"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || deleting}
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

// ── Page ──────────────────────────────────────────────────────────────────────
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

  function handleSaved(updated: Round) {
    setRounds((rs) => rs.map((r) => r.id === updated.id ? updated : r));
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
          <p className="text-sm text-[#8b949e] mt-1">
            Automatically added to every interview, regardless of role.
          </p>
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
              allRounds={rounds}
              onSaved={handleSaved}
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
          <li>Changes here apply to <span className="text-white">future interviews only</span></li>
        </ul>
      </div>
    </div>
  );
}
