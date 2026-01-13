"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Drill } from "../engine/types";

export function Library({
  query,
  setQuery,
  drills,
  onLoad,
}: {
  query: string;
  setQuery: (v: string) => void;
  drills: Drill[];
  onLoad: (d: Drill) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Biblioteca</div>

      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar..." />

      <div className="space-y-2">
        {drills.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            Sem exercícios guardados.
          </div>
        ) : (
          drills.map((d) => (
            <Button
              key={d.id}
              variant="secondary"
              className="w-full justify-start"
              onClick={() => onLoad(d)}
            >
              {d.title}
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
