import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import HubHeader from "@/components/HubHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import { createGroup, listGroups, relTime } from "@/features/hub/api";

export default function Groups() {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useQuery({ queryKey: ["groups"], queryFn: listGroups });

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try { const g = await createGroup(title); navigate(`/groups/${g.slug}`); }
    catch (err) { toast.error((err as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="studio-theme min-h-screen bg-background pb-20 text-foreground md:pb-0">
      <HubHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <form onSubmit={create} className="flex gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New hub for a niche, e.g. Horror" maxLength={100} />
          <Button type="submit" disabled={busy || !title.trim()}>Create</Button>
        </form>

        {isLoading ? <p className="mt-10 text-sm text-muted-foreground">Loading…</p> : groups.length === 0 ? (
          <div className="mt-16 max-w-md text-sm text-muted-foreground">
            <p>Create a hub for each niche (Horror, Finance…). A hub holds skills, a reusable library and a style guide; inside it, each project is one video.</p>
            <p className="mt-2">Give a project's agent link to any AI — it reads everything and saves its work back.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => {
              const counts: Record<string, number> = {};
              g.assets.forEach((a) => (counts[a.kind] = (counts[a.kind] || 0) + 1));
              return (
                <Link key={g.id} to={`/groups/${g.slug}`} className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-medium">{g.title}</h2>
                    <span className="shrink-0 text-xs text-muted-foreground">{relTime(g.updated_at)}</span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{g.slug}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {Object.keys(counts).length ? Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(" · ") : "empty"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
}
