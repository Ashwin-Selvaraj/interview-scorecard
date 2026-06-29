"use client";

import { useState, useEffect } from "react";
import { getRecommendation } from "@/lib/scoring";
import Spinner from "@/components/Spinner";
import { SkeletonRow, SkeletonStatCard, Skeleton } from "@/components/Skeleton";

interface Interview {
  id: string;
  status: string;
  startedAt: string;
  finalScore: number | null;
  candidate: { name: string };
  role: { id: string; name: string };
  answers: { rating: string | null }[];
}

interface DashStats {
  totalInterviews: number;
  stats: {
    roleId: string;
    roleName: string;
    totalInterviews: number;
    avgScore: number | null;
    hireRate: number | null;
  }[];
}

const SCORE_COLOR: Record<string, string> = {
  emerald: "text-emerald-400",
  blue: "text-blue-400",
  amber: "text-amber-400",
  red: "text-red-400",
};

type SortKey = "date" | "score";

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [dash, setDash] = useState<DashStats | null>(null);
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [loadingDash, setLoadingDash] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/roles").then((r) => r.json()).then(setRoles);
    loadData();
  }, []);

  function loadData() {
    setLoadingInterviews(true);
    setLoadingDash(true);
    fetch("/api/interviews")
      .then((r) => r.json())
      .then((data) => { setInterviews(data); setLoadingInterviews(false); });
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => { setDash(data); setLoadingDash(false); });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this interview? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/interviews/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadData();
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  const filtered = interviews
    .filter((iv) => !roleFilter || iv.role.id === roleFilter)
    .filter((iv) => !search || iv.candidate.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let v = 0;
      if (sortKey === "date") v = new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      else v = (b.finalScore ?? -1) - (a.finalScore ?? -1);
      return sortAsc ? -v : v;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Interview History</h1>
        <a href="/" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + New Interview
        </a>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {loadingDash ? (
            <SkeletonStatCard />
          ) : (
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5">
              <div className="text-3xl font-bold text-white">{dash?.totalInterviews ?? 0}</div>
              <div className="text-sm text-[#8b949e] mt-1">Total Interviews</div>
            </div>
          )}
        </div>

        {loadingDash ? (
          <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 space-y-3">
            <Skeleton className="h-4 w-24 mb-4" />
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-t border-[#21262d]">
                <Skeleton className="h-3 w-40" />
                <div className="flex gap-6">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : dash && dash.stats.filter((s) => s.totalInterviews > 0).length > 0 ? (
          <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#21262d]">
              <h2 className="font-semibold text-white text-sm">Stats by Role</h2>
            </div>
            <div className="divide-y divide-[#21262d]">
              {dash.stats.filter((s) => s.totalInterviews > 0).map((s) => (
                <div key={s.roleId} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-[#c9d1d9]">{s.roleName}</span>
                  <div className="flex items-center gap-6 text-sm">
                    <span className="text-[#8b949e]">{s.totalInterviews} interviews</span>
                    <span className="text-white font-medium">{s.avgScore?.toFixed(1) ?? "—"} avg</span>
                    <span className="text-emerald-400">{s.hireRate !== null ? `${s.hireRate}%` : "—"} hire rate</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search candidates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#161b22] border border-[#21262d] rounded-lg px-3 py-2 text-sm text-white placeholder-[#484f58] focus:outline-none focus:border-blue-500 w-48"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-[#161b22] border border-[#21262d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All roles</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#21262d]">
              <th className="text-left px-5 py-3 text-[#8b949e] font-medium">Candidate</th>
              <th className="text-left px-5 py-3 text-[#8b949e] font-medium">Role</th>
              <th className="text-left px-5 py-3 text-[#8b949e] font-medium cursor-pointer hover:text-white select-none" onClick={() => handleSort("score")}>
                Score {sortKey === "score" ? (sortAsc ? "↑" : "↓") : ""}
              </th>
              <th className="text-left px-5 py-3 text-[#8b949e] font-medium">Recommendation</th>
              <th className="text-left px-5 py-3 text-[#8b949e] font-medium">Status</th>
              <th className="text-left px-5 py-3 text-[#8b949e] font-medium cursor-pointer hover:text-white select-none" onClick={() => handleSort("date")}>
                Date {sortKey === "date" ? (sortAsc ? "↑" : "↓") : ""}
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {loadingInterviews ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[#8b949e]">No interviews found.</td>
              </tr>
            ) : filtered.map((iv) => {
              const rec = getRecommendation(iv.finalScore);
              return (
                <tr
                  key={iv.id}
                  className="hover:bg-[#1c2128] transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/interviews/${iv.id}`}
                >
                  <td className="px-5 py-3.5 text-white font-medium">{iv.candidate.name}</td>
                  <td className="px-5 py-3.5 text-[#8b949e]">{iv.role.name}</td>
                  <td className="px-5 py-3.5">
                    {iv.finalScore !== null ? (
                      <span className={`font-bold ${rec ? SCORE_COLOR[rec.color] : "text-white"}`}>
                        {iv.finalScore.toFixed(1)}
                      </span>
                    ) : <span className="text-[#484f58]">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-[#8b949e] text-xs">{rec?.label ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${iv.status === "completed" ? "bg-emerald-900/50 text-emerald-300 border-emerald-800" : "bg-blue-900/50 text-blue-300 border-blue-800"}`}>
                      {iv.status === "completed" ? "Completed" : "In Progress"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#8b949e]">{new Date(iv.startedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(iv.id)}
                      disabled={deleting === iv.id}
                      className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50 flex items-center gap-1"
                    >
                      {deleting === iv.id ? <><Spinner size={12} /> Deleting</> : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
