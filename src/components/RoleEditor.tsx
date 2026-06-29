"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface QuestionDraft {
  id?: string;
  text: string;
  purpose: string;
  metaTag: string;
}

interface RoundDraft {
  id?: string;
  title: string;
  questions: QuestionDraft[];
}

interface RoleEditorProps {
  initialName?: string;
  initialDescription?: string;
  initialRounds?: RoundDraft[];
  roleId?: string;
}

const BLANK_QUESTION: QuestionDraft = { text: "", purpose: "", metaTag: "" };

// ── Import helpers ────────────────────────────────────────────────────────────

function parseCSV(text: string): { round: string; question: string; purpose: string; metaTag: string }[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map((line) => {
    const cols: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; continue; }
      if (line[i] === "," && !inQ) { cols.push(cur); cur = ""; continue; }
      cur += line[i];
    }
    cols.push(cur);
    const get = (key: string) => cols[header.indexOf(key)]?.trim() ?? "";
    return { round: get("round"), question: get("question"), purpose: get("purpose"), metaTag: get("metatag") };
  }).filter((r) => r.question);
}

function rowsToRounds(rows: { round: string; question: string; purpose: string; metaTag: string }[]): RoundDraft[] {
  const map = new Map<string, RoundDraft>();
  for (const row of rows) {
    const title = row.round || "General";
    if (!map.has(title)) map.set(title, { title, questions: [] });
    map.get(title)!.questions.push({ text: row.question, purpose: row.purpose, metaTag: row.metaTag });
  }
  return [...map.values()];
}

const TEMPLATE_JSON = JSON.stringify([
  { round: "Round 1 — Technical", question: "Explain X concept.", purpose: "Tests core theoretical knowledge", metaTag: "" },
  { round: "Round 1 — Technical", question: "How would you handle Y?", purpose: "Assesses practical experience", metaTag: "top priority" },
  { round: "Round 2 — System Design", question: "Design a system for Z.", purpose: "Product thinking & architecture", metaTag: "" },
], null, 2);

const TEMPLATE_CSV = `round,question,purpose,metaTag
"Round 1 — Technical","Explain X concept.","Tests core theoretical knowledge",""
"Round 1 — Technical","How would you handle Y?","Assesses practical experience","top priority"
"Round 2 — System Design","Design a system for Z.","Product thinking & architecture",""`;

// ─────────────────────────────────────────────────────────────────────────────

export default function RoleEditor({ initialName = "", initialDescription = "", initialRounds = [], roleId }: RoleEditorProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [rounds, setRounds] = useState<RoundDraft[]>(
    initialRounds.length > 0 ? initialRounds : [{ title: "", questions: [{ ...BLANK_QUESTION }] }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importError, setImportError] = useState("");
  const [importMode, setImportMode] = useState<"replace" | "append">("append");
  const [showTemplates, setShowTemplates] = useState(false);

  // ── Round / Question mutations ────────────────────────────────────────────

  function addRound() {
    setRounds((p) => [...p, { title: "", questions: [{ ...BLANK_QUESTION }] }]);
  }
  function removeRound(ri: number) {
    setRounds((p) => p.filter((_, i) => i !== ri));
  }
  function moveRound(ri: number, dir: -1 | 1) {
    setRounds((p) => {
      const next = [...p]; const t = ri + dir;
      if (t < 0 || t >= next.length) return p;
      [next[ri], next[t]] = [next[t], next[ri]]; return next;
    });
  }
  function updateRoundTitle(ri: number, title: string) {
    setRounds((p) => p.map((r, i) => i === ri ? { ...r, title } : r));
  }
  function addQuestion(ri: number) {
    setRounds((p) => p.map((r, i) => i === ri ? { ...r, questions: [...r.questions, { ...BLANK_QUESTION }] } : r));
  }
  function removeQuestion(ri: number, qi: number) {
    setRounds((p) => p.map((r, i) => i === ri ? { ...r, questions: r.questions.filter((_, j) => j !== qi) } : r));
  }
  function moveQuestion(ri: number, qi: number, dir: -1 | 1) {
    setRounds((p) => p.map((r, i) => {
      if (i !== ri) return r;
      const qs = [...r.questions]; const t = qi + dir;
      if (t < 0 || t >= qs.length) return r;
      [qs[qi], qs[t]] = [qs[t], qs[qi]]; return { ...r, questions: qs };
    }));
  }
  function updateQuestion(ri: number, qi: number, field: keyof QuestionDraft, value: string) {
    setRounds((p) => p.map((r, i) =>
      i === ri ? { ...r, questions: r.questions.map((q, j) => j === qi ? { ...q, [field]: value } : q) } : r
    ));
  }

  // ── File import ───────────────────────────────────────────────────────────

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError("");
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let imported: RoundDraft[] = [];
    try {
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("JSON must be an array of objects.");
        imported = rowsToRounds(parsed.map((r: Record<string, string>) => ({
          round: r.round ?? r.Round ?? "",
          question: r.question ?? r.Question ?? r.text ?? "",
          purpose: r.purpose ?? r.Purpose ?? "",
          metaTag: r.metaTag ?? r.metatag ?? r.meta_tag ?? "",
        })));
      } else if (file.name.endsWith(".csv")) {
        imported = rowsToRounds(parseCSV(text));
      } else {
        throw new Error("Only .json and .csv files are supported.");
      }
      if (imported.length === 0 || imported.every((r) => r.questions.length === 0)) {
        throw new Error("No valid questions found. Check the format and column names.");
      }
      setRounds(importMode === "replace" ? imported : [...rounds, ...imported]);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : "Failed to parse file.");
    }
    e.target.value = "";
  }

  function downloadTemplate(fmt: "json" | "csv") {
    const content = fmt === "json" ? TEMPLATE_JSON : TEMPLATE_CSV;
    const mime = fmt === "json" ? "application/json" : "text/csv";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: mime }));
    a.download = `scorecard-template.${fmt}`;
    a.click();
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim()) { setError("Role name is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        rounds: rounds.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          title: r.title,
          questions: r.questions
            .filter((q) => q.text.trim())
            .map((q) => ({
              ...(q.id ? { id: q.id } : {}),
              text: q.text.trim(),
              purpose: q.purpose.trim() || null,
              metaTag: q.metaTag.trim() || null,
            })),
        })),
      };
      const res = await fetch(roleId ? `/api/roles/${roleId}` : "/api/roles", {
        method: roleId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      router.push("/roles");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const totalQuestions = rounds.reduce((n, r) => n + r.questions.filter((q) => q.text.trim()).length, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <a href="/roles" className="text-[#8b949e] hover:text-white text-sm transition-colors">← Roles</a>
        <span className="text-[#21262d]">/</span>
        <h1 className="text-xl font-bold text-white">{roleId ? "Edit Role" : "New Role"}</h1>
      </div>

      <div className="space-y-6">
        {/* Basic info */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#c9d1d9] mb-1.5">Role Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Backend Engineer"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#c9d1d9] mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description…"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Import panel */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Import from file</h2>
              <p className="text-xs text-[#8b949e] mt-0.5">
                Upload a <span className="text-white">.json</span> or <span className="text-white">.csv</span> file — rounds and questions are populated automatically.
              </p>
            </div>
            <button onClick={() => setShowTemplates((s) => !s)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap ml-4">
              {showTemplates ? "Hide" : "↓ Template"}
            </button>
          </div>

          {showTemplates && (
            <div className="mb-4 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
              <p className="text-xs text-[#8b949e] mb-2">Required columns: <span className="text-white font-mono">round, question, purpose, metaTag</span></p>
              <div className="flex gap-2">
                <button onClick={() => downloadTemplate("json")} className="text-xs border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#8b949e] px-3 py-1.5 rounded-lg transition-colors">
                  ↓ template.json
                </button>
                <button onClick={() => downloadTemplate("csv")} className="text-xs border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#8b949e] px-3 py-1.5 rounded-lg transition-colors">
                  ↓ template.csv
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-lg overflow-hidden border border-[#30363d] text-xs">
              {(["append", "replace"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setImportMode(m)}
                  className={`px-3 py-1.5 transition-colors ${importMode === m ? "bg-blue-600 text-white" : "text-[#8b949e] hover:text-white"}`}
                >
                  {m === "append" ? "Add to existing" : "Replace all"}
                </button>
              ))}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-4 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white text-xs font-medium rounded-lg transition-colors"
            >
              Choose file…
            </button>
            <input ref={fileRef} type="file" accept=".json,.csv" onChange={handleFileImport} className="hidden" />
          </div>
          {importError && <p className="text-red-400 text-xs mt-2">{importError}</p>}
        </div>

        {/* Rounds */}
        {rounds.map((round, ri) => (
          <div key={ri} className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[#21262d] bg-[#1c2128]">
              <span className="text-xs text-[#8b949e] font-mono w-6 shrink-0">R{ri + 1}</span>
              <input
                type="text"
                value={round.title}
                onChange={(e) => updateRoundTitle(ri, e.target.value)}
                placeholder="Round title…"
                className="flex-1 bg-transparent text-white font-semibold text-sm placeholder-[#484f58] focus:outline-none"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveRound(ri, -1)} disabled={ri === 0} className="text-[#8b949e] hover:text-white disabled:opacity-30 text-xs px-1">▲</button>
                <button onClick={() => moveRound(ri, 1)} disabled={ri === rounds.length - 1} className="text-[#8b949e] hover:text-white disabled:opacity-30 text-xs px-1">▼</button>
                <button onClick={() => removeRound(ri)} className="text-red-400 hover:text-red-300 text-xs ml-2">✕</button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              {round.questions.map((q, qi) => (
                <div key={qi} className="border border-[#21262d] rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#484f58] font-mono shrink-0">Q{qi + 1}</span>
                    <div className="flex items-center gap-1 ml-auto shrink-0">
                      <button onClick={() => moveQuestion(ri, qi, -1)} disabled={qi === 0} className="text-[#8b949e] hover:text-white disabled:opacity-30 text-xs">▲</button>
                      <button onClick={() => moveQuestion(ri, qi, 1)} disabled={qi === round.questions.length - 1} className="text-[#8b949e] hover:text-white disabled:opacity-30 text-xs">▼</button>
                      <button onClick={() => removeQuestion(ri, qi)} className="text-red-400 hover:text-red-300 text-xs ml-1">✕</button>
                    </div>
                  </div>
                  <textarea
                    value={q.text}
                    onChange={(e) => updateQuestion(ri, qi, "text", e.target.value)}
                    placeholder="Question text…"
                    rows={2}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[#8b949e] mb-1 uppercase tracking-wide">Why we ask this</label>
                      <input
                        type="text"
                        value={q.purpose}
                        onChange={(e) => updateQuestion(ri, qi, "purpose", e.target.value)}
                        placeholder="e.g. Tests theoretical knowledge"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-purple-300 placeholder-[#484f58] focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#8b949e] mb-1 uppercase tracking-wide">Meta tag</label>
                      <input
                        type="text"
                        value={q.metaTag}
                        onChange={(e) => updateQuestion(ri, qi, "metaTag", e.target.value)}
                        placeholder="e.g. top priority"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-amber-300 placeholder-[#484f58] focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => addQuestion(ri)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                + Add Question
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={addRound}
          className="w-full border border-dashed border-[#30363d] hover:border-blue-600 text-[#8b949e] hover:text-blue-400 rounded-xl py-3 text-sm transition-colors"
        >
          + Add Round
        </button>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#484f58]">{rounds.length} rounds · {totalQuestions} questions</span>
          <div className="flex gap-3">
            <a href="/roles" className="px-5 py-2.5 border border-[#30363d] text-[#8b949e] hover:text-white rounded-lg text-sm transition-colors">
              Cancel
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {saving ? "Saving…" : roleId ? "Save Changes" : "Create Role"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
