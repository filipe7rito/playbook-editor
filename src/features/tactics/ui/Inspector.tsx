'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { deleteElement } from '../engine/commands'
import type { Scene, ShapeElement } from '../engine/types'

export function Inspector({
  scene,
  selected,
  applyScene,
  clearSelection,
}: {
  scene: Scene
  selected?: ShapeElement
  applyScene: (next: Scene) => void
  clearSelection: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Inspector</div>

      {/* Field Settings - Always visible */}
      <div className="rounded-xl border p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            Campo
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Full Field Icon */}
          <button
            onClick={() =>
              applyScene({
                ...scene,
                pitch: { ...scene.pitch, type: 'full' },
              })
            }
            className={`p-2 rounded border transition-colors ${
              scene.pitch.type === 'full'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-accent'
            }`}
            title="Campo Completo"
          >
            <svg
              width="24"
              height="16"
              viewBox="0 0 24 16"
              fill="none"
              className="stroke-current"
              strokeWidth="1.5"
            >
              <rect x="1" y="1" width="22" height="14" rx="1" />
              <line x1="12" y1="1" x2="12" y2="15" />
              <circle cx="12" cy="8" r="2.5" />
              <rect x="1" y="4" width="4" height="8" />
              <rect x="1" y="6" width="1.5" height="4" />
              <rect x="19" y="4" width="4" height="8" />
              <rect x="21.5" y="6" width="1.5" height="4" />
              <path d="M 5 8 Q 8 6 8 4" strokeLinecap="round" />
              <path d="M 5 8 Q 8 10 8 12" strokeLinecap="round" />
              <path d="M 19 8 Q 16 6 16 4" strokeLinecap="round" />
              <path d="M 19 8 Q 16 10 16 12" strokeLinecap="round" />
            </svg>
          </button>

          {/* Half Field Icon */}
          <button
            onClick={() =>
              applyScene({
                ...scene,
                pitch: { ...scene.pitch, type: 'half' },
              })
            }
            className={`p-2 rounded border transition-colors ${
              scene.pitch.type === 'half'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-accent'
            }`}
            title="Meio Campo"
          >
            <svg
              width="24"
              height="16"
              viewBox="0 0 24 16"
              fill="none"
              className="stroke-current"
              strokeWidth="1.5"
            >
              <rect x="1" y="1" width="22" height="14" rx="1" />
              <rect x="1" y="4" width="4" height="8" />
              <rect x="1" y="6" width="1.5" height="4" />
              <path d="M 5 8 Q 8 6 8 4" strokeLinecap="round" />
              <path d="M 5 8 Q 8 10 8 12" strokeLinecap="round" />
              <ellipse cx="12" cy="15" rx="3" ry="2" />
            </svg>
          </button>

          {/* Free Field Icon - no lines, just green area */}
          <button
            onClick={() =>
              applyScene({
                ...scene,
                pitch: { ...scene.pitch, type: 'free' },
              })
            }
            className={`p-2 rounded border transition-colors ${
              scene.pitch.type === 'free'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-accent'
            }`}
            title="Campo Livre"
          >
            <svg
              width="24"
              height="16"
              viewBox="0 0 24 16"
              fill="none"
              className="stroke-current"
              strokeWidth="1.5"
            >
              <rect x="1" y="1" width="22" height="14" rx="1" />
            </svg>
          </button>
        </div>

        {/* Offensive/Defensive toggle - Only show when half field is selected */}
        {scene.pitch.type === 'half' && (
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase">
              Lado
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  applyScene({
                    ...scene,
                    pitch: { ...scene.pitch, halfSide: 'offensive' },
                  })
                }
                className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                  (scene.pitch.halfSide || 'offensive') === 'offensive'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-accent'
                }`}
                title="Ofensivo"
              >
                Ofensivo
              </button>
              <button
                onClick={() =>
                  applyScene({
                    ...scene,
                    pitch: { ...scene.pitch, halfSide: 'defensive' },
                  })
                }
                className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                  scene.pitch.halfSide === 'defensive'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-accent'
                }`}
                title="Defensivo"
              >
                Defensivo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Element Inspector - Only when element is selected */}
      {selected ? (
        <>
          <Separator />
          <div className="rounded-xl border p-3 space-y-3">
            <div className="text-sm">
              <div className="text-muted-foreground">Tipo</div>
              <div className="font-medium">
                {selected.kind === 'token' ? selected.tokenType : selected.kind}
              </div>
            </div>

            {selected.kind === 'token' ? (
              <>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Etiqueta</div>
                  <Input
                    value={selected.label ?? ''}
                    onChange={(e) =>
                      applyScene({
                        ...scene,
                        elements: scene.elements.map((el) =>
                          el.id === selected.id
                            ? ({ ...el, label: e.target.value } as any)
                            : el,
                        ),
                      })
                    }
                  />
                </div>
              </>
            ) : null}

            {selected.kind === 'goal' ? (
              <>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Etiqueta</div>
                  <Input
                    value={selected.label ?? ''}
                    onChange={(e) =>
                      applyScene({
                        ...scene,
                        elements: scene.elements.map((el) =>
                          el.id === selected.id
                            ? ({ ...el, label: e.target.value } as any)
                            : el,
                        ),
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Rotação (graus)</div>
                  <Input
                    type="number"
                    value={selected.rotation ?? 0}
                    onChange={(e) =>
                      applyScene({
                        ...scene,
                        elements: scene.elements.map((el) =>
                          el.id === selected.id
                            ? ({ ...el, rotation: Number(e.target.value) } as any)
                            : el,
                        ),
                      })
                    }
                  />
                </div>
              </>
            ) : null}

            {selected.kind === 'text' ? (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Texto</div>
                <Input
                  value={selected.text}
                  onChange={(e) =>
                    applyScene({
                      ...scene,
                      elements: scene.elements.map((el) =>
                        el.id === selected.id
                          ? ({ ...el, text: e.target.value } as any)
                          : el,
                      ),
                    })
                  }
                />
              </div>
            ) : null}

            <Button
              variant="destructive"
              onClick={() => {
                applyScene(deleteElement(scene, selected.id))
                clearSelection()
              }}
            >
              Apagar
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Nada selecionado. Clica num elemento para editar.
        </div>
      )}
    </div>
  )
}
