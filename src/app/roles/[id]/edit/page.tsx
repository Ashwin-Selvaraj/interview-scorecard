"use client";

import { useEffect, useState, use } from "react";
import RoleEditor from "@/components/RoleEditor";

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
  questions: Question[];
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  rounds: Round[];
}

export default function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    fetch(`/api/roles/${id}`).then((r) => r.json()).then(setRole);
  }, [id]);

  if (!role) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-56px)] text-[#8b949e]">Loading…</div>;
  }

  return (
    <RoleEditor
      roleId={id}
      initialName={role.name}
      initialDescription={role.description ?? ""}
      initialRounds={role.rounds.map((r) => ({
        id: r.id,
        title: r.title,
        questions: r.questions.map((q) => ({
          id: q.id,
          text: q.text,
          purpose: q.purpose ?? "",
          metaTag: q.metaTag ?? "",
        })),
      }))}
    />
  );
}
