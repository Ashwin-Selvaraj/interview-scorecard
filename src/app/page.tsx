"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

interface Role {
  id: string;
  name: string;
  description?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [candidateName, setCandidateName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/roles")
      .then((r) => r.json())
      .then((data) => { setRoles(data); setRolesLoading(false); });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateName.trim() || !roleId) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName: candidateName.trim(), roleId }),
      });
      if (!res.ok) throw new Error("Failed to create interview");
      const { interviewId } = await res.json();
      router.push(`/interviews/${interviewId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4 text-blue-400">◈</div>
          <h1 className="text-3xl font-bold text-white mb-2">Start New Interview</h1>
          <p className="text-[#8b949e]">Select a role and enter the candidate&apos;s name to begin.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#c9d1d9] mb-1.5">Candidate Name</label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="e.g. Jane Smith"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#c9d1d9] mb-1.5">Role</label>
            <div className="relative">
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={rolesLoading}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-60 appearance-none"
                required
              >
                <option value="">{rolesLoading ? "Loading roles…" : "Select a role…"}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {rolesLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e]">
                  <Spinner size={14} />
                </div>
              )}
            </div>
            <a href="/roles/new" className="text-xs text-blue-400 hover:text-blue-300 mt-1.5 inline-block">
              + Create new role
            </a>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || rolesLoading || !candidateName.trim() || !roleId}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Spinner size={16} /> Starting…</>
            ) : (
              "Start Interview →"
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm text-[#8b949e]">
          <a href="/interviews" className="hover:text-white transition-colors">View History</a>
          <span>·</span>
          <a href="/roles" className="hover:text-white transition-colors">Manage Roles</a>
        </div>
      </div>
    </div>
  );
}
