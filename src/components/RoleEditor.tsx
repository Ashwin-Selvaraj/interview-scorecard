"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface QuestionDraft {
  id?: string;
  text: string;
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

export default function RoleEditor({ initialName = "", initialDescription = "", initialRounds = [], roleId }: RoleEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [rounds, setRounds] = useState<RoundDraft[]>(
    initialRounds.length > 0 ? initialRounds : [{ title: "", questions: [{ text: "", metaTag: "" }] }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addRound() {
    setRounds((prev) => [...prev, { title: "", questions: [{ text: "", metaTag: "" }] }]);
  }

  function removeRound(ri: number) {
    setRounds((prev) => prev.filter((_, i) => i !== ri));
  }

  function moveRound(ri: number, dir: -1 | 1) {
    setRounds((prev) => {
      const next = [...prev];
      const target = ri + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[ri], next[target]] = [next[target], next[ri]];
      return next;
    });
  }

  function updateRoundTitle(ri: number, title: string) {
    setRounds((prev) => prev.map((r, i) => (i === ri ? { ...r, title } : r)));
  }

  function addQuestion(ri: number) {
    setRounds((prev) =>
      prev.map((r, i) => (i === ri ? { ...r, questions: [...r.questions, { text: "", metaTag: "" }] } : r))
    );
  }

  function removeQuestion(ri: number, qi: number) {
    setRounds((prev) =>
      prev.map((r, i) => (i === ri ? { ...r, questions: r.questions.filter((_, j) => j !== qi) } : r))
    );
  }

  function moveQuestion(ri: number, qi: number, dir: -1 | 1) {
    setRounds((prev) =>
      prev.map((r, i) => {
        if (i !== ri) return r;
        const qs = [...r.questions];
        const target = qi + dir;
        if (target < 0 || target >= qs.length) return r;
        [qs[qi], qs[target]] = [qs[target], qs[qi]];
        return { ...r, questions: qs };
      })
    );
  }

  function updateQuestion(ri: number, qi: number, field: "text" | "metaTag", value: string) {
    setRounds((prev) =>
      prev.map((r, i) =>
        i === ri
          ? { ...r, questions: r.questions.map((q, j) => (j === qi ? { ...q, [field]: value } : q)) }
          : r
      )
    );
  }

  async function handleSave() {
    if (!name.trim()) { setError("Role name is required."); return; }
    setSaving(true);
    setError("");
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
              placeholder="Optional description of this role…"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Rounds */}
        {rounds.map((round, ri) => (
          <div key={ri} className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[#21262d] bg-[#1c2128]">
              <span className="text-xs text-[#8b949e] font-mono w-6">R{ri + 1}</span>
              <input
                type="text"
                value={round.title}
                onChange={(e) => updateRoundTitle(ri, e.target.value)}
                placeholder="Round title…"
                className="flex-1 bg-transparent text-white font-semibold text-sm placeholder-[#484f58] focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <button onClick={() => moveRound(ri, -1)} disabled={ri === 0} className="text-[#8b949e] hover:text-white disabled:opacity-30 text-xs px-1">▲</button>
                <button onClick={() => moveRound(ri, 1)} disabled={ri === rounds.length - 1} className="text-[#8b949e] hover:text-white disabled:opacity-30 text-xs px-1">▼</button>
                <button onClick={() => removeRound(ri)} className="text-red-400 hover:text-red-300 text-xs ml-2">✕</button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              {round.questions.map((q, qi) => (
                <div key={qi} className="flex gap-2 items-start group">
                  <span className="text-xs text-[#484f58] font-mono mt-2.5 w-6 shrink-0">Q{qi + 1}</span>
                  <div className="flex-1 space-y-1.5">
                    <textarea
                      value={q.text}
                      onChange={(e) => updateQuestion(ri, qi, "text", e.target.value)}
                      placeholder="Question text…"
                      rows={2}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 resize-none"
                    />
                    <input
                      type="text"
                      value={q.metaTag}
                      onChange={(e) => updateQuestion(ri, qi, "metaTag", e.target.value)}
                      placeholder="Meta tag (optional, e.g. 'top priority')"
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-amber-300 placeholder-[#484f58] focus:outline-none focus:border-amber-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 mt-1">
                    <button onClick={() => moveQuestion(ri, qi, -1)} disabled={qi === 0} className="text-[#8b949e] hover:text-white disabled:opacity-30 text-xs">▲</button>
                    <button onClick={() => moveQuestion(ri, qi, 1)} disabled={qi === round.questions.length - 1} className="text-[#8b949e] hover:text-white disabled:opacity-30 text-xs">▼</button>
                    <button onClick={() => removeQuestion(ri, qi)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => addQuestion(ri)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors mt-1"
              >
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

        <div className="flex gap-3 justify-end">
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
  );
}
