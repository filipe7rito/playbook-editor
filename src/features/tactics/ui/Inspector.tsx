"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteElement } from "../engine/commands";
import type { Scene, ShapeElement } from "../engine/types";

export function Inspector({
  scene,
  selected,
  applyScene,
  clearSelection,
}: {
  scene: Scene;
  selected?: ShapeElement;
  applyScene: (next: Scene) => void;
  clearSelection: () => void;
}) {
  if (!selected) {
    return (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        Nada selecionado. Clica num elemento para editar.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Inspector</div>

      <div className="rounded-xl border p-3 space-y-3">
        <div className="text-sm">
          <div className="text-muted-foreground">Tipo</div>
          <div className="font-medium">
            {selected.kind === "token" ? selected.tokenType : selected.kind}
          </div>
        </div>

        {selected.kind === "token" ? (
          <>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Etiqueta</div>
              <Input
                value={selected.label ?? ""}
                onChange={(e) =>
                  applyScene({
                    ...scene,
                    elements: scene.elements.map((el) =>
                      el.id === selected.id ? ({ ...el, label: e.target.value } as any) : el
                    ),
                  })
                }
              />
            </div>
          </>
        ) : null}

        {selected.kind === "text" ? (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Texto</div>
            <Input
              value={selected.text}
              onChange={(e) =>
                applyScene({
                  ...scene,
                  elements: scene.elements.map((el) =>
                    el.id === selected.id ? ({ ...el, text: e.target.value } as any) : el
                  ),
                })
              }
            />
          </div>
        ) : null}

        <Button
          variant="destructive"
          onClick={() => {
            applyScene(deleteElement(scene, selected.id));
            clearSelection();
          }}
        >
          Apagar
        </Button>
      </div>
    </div>
  );
}
