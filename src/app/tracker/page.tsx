"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { NavBar } from "@/components/NavBar";
import { useAuth } from "@/components/AuthProvider";

interface Application {
  id: string;
  company: string;
  role: string;
  jd: string | null;
  score: number | null;
  stage: string;
  scan_id: string | null;
  created_at: string;
  updated_at: string;
}

const STAGES = ["saved", "applied", "interview", "offer", "rejected"] as const;
const STAGE_LABELS: Record<string, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};
const STAGE_COLORS: Record<string, string> = {
  saved: "bg-slate-100 border-slate-300 text-slate-600",
  applied: "bg-blue-50 border-blue-300 text-blue-700",
  interview: "bg-amber-50 border-amber-300 text-amber-700",
  offer: "bg-green-50 border-green-300 text-green-700",
  rejected: "bg-red-50 border-red-300 text-red-700",
};

function Column({ stage, applications, onAdd }: {
  stage: string;
  applications: Application[];
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] flex-col gap-3 rounded-2xl border-2 p-4 transition ${
        isOver ? "border-brand bg-brand/5" : STAGE_COLORS[stage]
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold">{STAGE_LABELS[stage]}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-400">
          {applications.length}
        </span>
      </div>

      {applications.map((app) => (
        <DraggableCard key={app.id} app={app} />
      ))}

      {applications.length === 0 && (
        <p className="mt-4 text-center text-[11px] text-slate-400">
          {stage === "saved" ? "Yahan kuch nahi hai" : "Kuch nahi"}
        </p>
      )}

      <button
        onClick={onAdd}
        className="mt-auto rounded-xl border-2 border-dashed border-slate-300 py-2 text-xs font-medium text-slate-400 transition hover:border-brand hover:text-brand"
      >
        + Add
      </button>
    </div>
  );
}

function DraggableCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { app },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`cursor-grab rounded-xl border bg-white p-3 shadow-sm transition active:cursor-grabbing ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <div className="text-sm font-semibold text-slate-900">{app.role}</div>
      <div className="text-xs text-slate-500">{app.company}</div>
      {app.score !== null && (
        <div className="mt-1.5">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
              app.score >= 75
                ? "bg-green-100 text-green-700"
                : app.score >= 45
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            Score: {app.score}
          </span>
        </div>
      )}
    </div>
  );
}

function AddModal({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: { company: string; role: string; jd?: string; stage?: string }) => void;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jd, setJd] = useState("");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    onSave({ company: company.trim(), role: role.trim(), jd: jd.trim() || undefined });
    setCompany("");
    setRole("");
    setJd("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-extrabold text-slate-900">
          Naya application
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500">Company *</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-brand focus:outline-none"
              placeholder="Google"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Role *</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm focus:border-brand focus:outline-none"
              placeholder="SDE 2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">JD (optional)</label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="mt-1 h-20 w-full resize-y rounded-xl border border-slate-200 p-2.5 text-sm focus:border-brand focus:outline-none"
              placeholder="Paste JD here..."
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Add karo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TrackerPage() {
  const { user, session } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [activeApp, setActiveApp] = useState<Application | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch("/api/applications", {
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setApplications(data.applications ?? []);
        setLoading(false);
      })
      .catch(() => { setError("Load nahi ho paya."); setLoading(false); });
  }, [user, session]);

  const appsByStage = Object.fromEntries(
    STAGES.map((s) => [s, applications.filter((a) => a.stage === s)])
  ) as Record<string, Application[]>;

  async function handleSave(data: { company: string; role: string; jd?: string; stage?: string }) {
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ ...data, stage: data.stage ?? "saved" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setApplications((prev) => [result.application, ...prev]);
      setShowAdd(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add nahi ho paya.");
    }
  }

  const handleDragStart = useCallback((event: any) => {
    const app = event.active.data.current?.app as Application | undefined;
    if (app) setActiveApp(app);
  }, []);

  async function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || !active) return;
    const appId = active.id as string;
    const targetStage = over.id as string;
    if (!STAGES.includes(targetStage as any)) return;

    const app = applications.find((a) => a.id === appId);
    if (!app || app.stage === targetStage) return;

    // Optimistic update
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, stage: targetStage } : a))
    );
    setActiveApp(null);

    try {
      await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ stage: targetStage }),
      });
    } catch {
      // Revert on failure
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, stage: app.stage } : a))
      );
    }
  }

  if (!user) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4">
        <NavBar />
        <section className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900">Login karo, boss!</h1>
          <p className="mt-2 text-sm text-slate-500">Job tracker sirf logged-in users ke liye.</p>
          <Link href="/login" className="mt-6 rounded-xl bg-brand px-8 py-3 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark">Login karo</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4">
      <NavBar />
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-slate-900">Job Tracker</h1>
            <p className="mt-1 text-sm text-slate-500">Track karo — kahan apply kiya, kya hua.</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
          >
            + New Application
          </button>
        </div>

        {loading ? (
          <p className="mt-12 text-center text-sm text-slate-400">Load ho raha hai…</p>
        ) : applications.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="text-5xl">📋</div>
            <h2 className="mt-4 font-display text-xl font-extrabold text-slate-900">
              Abhi tak koi job track nahi ki
            </h2>
            <p className="mt-1 text-sm text-slate-500">Pehli application daal!</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-6 rounded-xl bg-brand px-8 py-3 font-display font-semibold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark"
            >
              Add karo
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Kanban */}
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="mt-6 hidden gap-4 md:grid md:grid-cols-5">
                {STAGES.map((stage) => (
                  <Column
                    key={stage}
                    stage={stage}
                    applications={appsByStage[stage]}
                    onAdd={() => setShowAdd(true)}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeApp ? (
                  <div className="rounded-xl border bg-white p-3 shadow-lg">
                    <div className="text-sm font-semibold text-slate-900">{activeApp.role}</div>
                    <div className="text-xs text-slate-500">{activeApp.company}</div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>

            {/* Mobile list */}
            <div className="mt-6 space-y-3 md:hidden">
              {applications.map((app) => (
                <div key={app.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display font-semibold text-slate-900">{app.role}</div>
                      <div className="text-xs text-slate-500">{app.company}</div>
                    </div>
                    {app.score !== null && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${app.score >= 75 ? "bg-green-100 text-green-700" : app.score >= 45 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {app.score}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${STAGE_COLORS[app.stage].split(" ")[0]} ${STAGE_COLORS[app.stage].split(" ")[1]}`}>
                      {STAGE_LABELS[app.stage]}
                    </span>
                    <select
                      value={app.stage}
                      onChange={async (e) => {
                        const newStage = e.target.value;
                        setApplications((prev) =>
                          prev.map((a) => (a.id === app.id ? { ...a, stage: newStage } : a))
                        );
                        await fetch(`/api/applications/${app.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
                          body: JSON.stringify({ stage: newStage }),
                        }).catch(() => {});
                      }}
                      className="rounded-lg border border-slate-200 p-1 text-xs focus:outline-none"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete kar doon?")) return;
                        await fetch(`/api/applications/${app.id}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
                        });
                        setApplications((prev) => prev.filter((a) => a.id !== app.id));
                      }}
                      className="text-xs text-slate-300 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{error}</p>
        )}
      </section>

      <AddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleSave}
      />
    </main>
  );
}
