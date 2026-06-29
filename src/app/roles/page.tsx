"use client";

import { useState, useEffect } from "react";
import Spinner from "@/components/Spinner";
import { SkeletonRoleCard } from "@/components/Skeleton";

interface Role {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  _count: { rounds: number };
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadRoles(); }, []);

  async function loadRoles() {
    setIsLoading(true);
    const data = await fetch("/api/roles").then((r) => r.json());
    setRoles(data);
    setIsLoading(false);
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    await fetch(`/api/roles/${id}/duplicate`, { method: "POST" });
    setDuplicating(null);
    loadRoles();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete role "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    await fetch(`/api/roles/${id}`, { method: "DELETE" });
    setDeleting(null);
    loadRoles();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Manage Roles</h1>
        <a href="/roles/new" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + New Role
        </a>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonRoleCard key={i} />)}
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-20 text-[#8b949e]">
          <p className="mb-4">No roles yet.</p>
          <a href="/roles/new" className="text-blue-400 hover:text-blue-300">Create your first role →</a>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div key={role.id} className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-white">{role.name}</h2>
                {role.description && <p className="text-sm text-[#8b949e] mt-0.5">{role.description}</p>}
                <p className="text-xs text-[#484f58] mt-2">{role._count.rounds} rounds · Created {new Date(role.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={`/roles/${role.id}/edit`} className="text-xs text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#8b949e] px-3 py-1.5 rounded-lg transition-colors">
                  Edit
                </a>
                <button
                  onClick={() => handleDuplicate(role.id)}
                  disabled={duplicating === role.id}
                  className="text-xs text-[#8b949e] hover:text-white border border-[#30363d] hover:border-[#8b949e] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {duplicating === role.id ? <><Spinner size={12} className="inline" /> Duplicating</> : "Duplicate"}
                </button>
                <button
                  onClick={() => handleDelete(role.id, role.name)}
                  disabled={deleting === role.id}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting === role.id ? <><Spinner size={12} className="inline" /> Deleting</> : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
