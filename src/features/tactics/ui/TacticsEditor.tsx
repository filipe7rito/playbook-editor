'use client'

import { Button } from '@/components/ui/button'
import {
  DrawerClose,
  DrawerContent,
  DrawerProvider,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  Menu,
  RotateCcwSquare,
  RotateCwSquare,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useCanvasRenderer } from '../editor/useCanvasRenderer'
import { useEditorState } from '../editor/useEditorState'
import { usePointerHandlers } from '../editor/usePointerHandlers'
import { deleteElement } from '../engine/commands'
import { defaultScene } from '../engine/defaultScene'
import type { Scene, ShapeElement } from '../engine/types'
import { deepClone, downloadDataUrl, downloadText } from '../engine/utils'
import { Library } from './Library'
import { SaveDialog } from './SaveDialog'
import { Toolbar } from './Toolbar'

export function TacticsEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const editingId = (params as any).id || null

  const editor = useEditorState()

  // Load scene if editing an existing item (only once when editingId changes)
  const hasLoadedRef = useRef<string | null>(null)
  useEffect(() => {
    if (editingId && hasLoadedRef.current !== editingId) {
      hasLoadedRef.current = editingId
      import('../engine/storage').then(({ getSavedItems }) => {
        const items = getSavedItems()
        const item = items.find((i: any) => i.id === editingId)
        if (item) {
          editor.applyScene(deepClone(item.scene))
          editor.setSelectedId(undefined)
        }
      })
    } else if (!editingId) {
      hasLoadedRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]) // Only depend on editingId, not editor

  useCanvasRenderer({
    canvasRef,
    wrapRef,
    scene: editor.scene,
    selectedId: editor.selectedId,
    hoverId: editor.hoverId,
  })

  const handlers = usePointerHandlers({
    scene: editor.scene,
    tool: editor.tool,
    activeLayer: editor.activeLayer,
    selectedId: editor.selectedId,
    setSelectedId: editor.setSelectedId,
    setHoverId: editor.setHoverId,
    drag: editor.drag,
    setDrag: editor.setDrag,
    applyScene: editor.applyScene,
    replaceScene: editor.replaceScene,
    commitFrom: editor.commitFrom,
    setTool: editor.setTool,
    wrapRef,
  })
  const cursor = useMemo(() => {
    if (editor.drag) return 'grabbing'
    if (editor.hoverId) return 'grab' // prioridade: algo selecionável/movível

    if (editor.tool === 'text') return 'text'
    if (
      editor.tool === 'arrow' ||
      editor.tool === 'line' ||
      editor.tool === 'zone' ||
      editor.tool === 'goal' ||
      editor.tool === 'path'
    )
      return 'crosshair'

    if (
      editor.tool === 'player' ||
      editor.tool === 'opponent' ||
      editor.tool === 'cone' ||
      editor.tool === 'ball' ||
      editor.tool === 'flag' ||
      editor.tool === 'disc'
    )
      return 'copy'

    return 'default'
  }, [editor.drag, editor.hoverId, editor.tool])

  const exportJson = () =>
    downloadText(
      `scene_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(editor.scene, null, 2),
    )
  const exportPng = () => {
    const c = canvasRef.current
    if (!c) return
    downloadDataUrl(
      `tactics_${new Date().toISOString().slice(0, 10)}.png`,
      c.toDataURL('image/png'),
    )
  }

  return (
    <div className="h-screen min-h-0 w-full">
      <div className="mx-auto flex h-full min-h-0 max-w-[1600px] flex-col gap-3 p-3 md:p-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3">
          <div>
            <div className="text-base font-semibold">
              Tactics / Training Editor (POC)
            </div>
            <div className="text-sm text-muted-foreground">
              Canvas editor isolado para integrar no produto principal.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                editor.undo()
                editor.setSelectedId(undefined)
              }}
              disabled={!editor.history.past.length}
            >
              Undo
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                editor.redo()
                editor.setSelectedId(undefined)
              }}
              disabled={!editor.history.future.length}
            >
              Redo
            </Button>
            <Button
              variant="secondary"
              onClick={() => editor.applyScene(deepClone(defaultScene))}
            >
              Reset
            </Button>
            <Button variant="secondary" onClick={exportJson}>
              Export JSON
            </Button>
            <Button variant="secondary" onClick={exportPng}>
              Export PNG
            </Button>
            <SaveDialog
              scene={editor.scene}
              editingId={editingId}
              onSave={() => navigate({ to: '/' })}
            />
            <Link to="/">
              <Button variant="secondary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex flex-1 min-h-0 gap-3">
          {/* Center */}
          <div className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border">
            <div ref={wrapRef} className="relative h-full min-h-0 w-full">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full touch-none"
                style={{ cursor }}
                onPointerDown={handlers.onPointerDown(wrapRef.current!)}
                onPointerMove={handlers.onPointerMove(wrapRef.current!)}
                onPointerUp={handlers.onPointerUp()}
                onPointerLeave={() => editor.setHoverId(undefined)}
              />
            </div>
          </div>

          {/* Right Panel - Desktop */}
          <div className="hidden md:flex flex-col min-h-0 w-[360px] gap-3">
            {/* Field Settings - Separate from element inspector */}
            <div className="rounded-2xl border p-3">
              <FieldSettings
                scene={editor.scene}
                applyScene={editor.applyScene}
              />
            </div>

            {/* Element Inspector / Library */}
            <div className="flex-1 min-h-0 rounded-2xl border p-3">
              <Tabs
                value={editor.panel}
                onValueChange={(v) => editor.setPanel(v as any)}
                className="flex h-full flex-col"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="inspector">Inspector</TabsTrigger>
                  <TabsTrigger value="library">Biblioteca</TabsTrigger>
                </TabsList>

                <TabsContent
                  value="inspector"
                  className="mt-3 flex-1 overflow-y-auto min-h-0"
                >
                  <ElementInspector
                    scene={editor.scene}
                    selected={editor.selected}
                    applyScene={editor.applyScene}
                    clearSelection={() => editor.setSelectedId(undefined)}
                  />
                </TabsContent>

                <TabsContent
                  value="library"
                  className="mt-3 flex-1 overflow-y-auto min-h-0"
                >
                  <Library
                    query={editor.query}
                    setQuery={editor.setQuery}
                    drills={editor.filteredDrills}
                    onLoad={(d) => {
                      editor.applyScene(deepClone(d.sceneSnapshot))
                      editor.setSelectedId(undefined)
                      editor.setPanel('inspector')
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Mobile Drawer Button */}
          <DrawerProvider open={drawerOpen} onOpenChange={setDrawerOpen}>
            <div className="md:hidden fixed bottom-20 right-4 z-30">
              <DrawerTrigger asChild>
                <Button
                  size="icon"
                  className="rounded-full shadow-lg"
                  aria-label="Abrir painel"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
            </div>

            {/* Mobile Drawer */}
            <DrawerContent side="right" className="md:hidden">
              <div className="flex h-full flex-col p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Painel</h2>
                  <DrawerClose asChild>
                    <Button variant="ghost" size="icon" aria-label="Fechar">
                      <X className="h-5 w-5" />
                    </Button>
                  </DrawerClose>
                </div>

                <div className="mb-4 rounded-xl border p-3">
                  <FieldSettings
                    scene={editor.scene}
                    applyScene={editor.applyScene}
                  />
                </div>

                <Tabs
                  value={editor.panel}
                  onValueChange={(v) => editor.setPanel(v as any)}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="inspector">Inspector</TabsTrigger>
                    <TabsTrigger value="library">Biblioteca</TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="inspector"
                    className="mt-3 flex-1 overflow-y-auto"
                  >
                    <ElementInspector
                      scene={editor.scene}
                      selected={editor.selected}
                      applyScene={editor.applyScene}
                      clearSelection={() => editor.setSelectedId(undefined)}
                    />
                  </TabsContent>

                  <TabsContent
                    value="library"
                    className="mt-3 flex-1 overflow-y-auto"
                  >
                    <Library
                      query={editor.query}
                      setQuery={editor.setQuery}
                      drills={editor.filteredDrills}
                      onLoad={(d) => {
                        editor.applyScene(deepClone(d.sceneSnapshot))
                        editor.setSelectedId(undefined)
                        editor.setPanel('inspector')
                        setDrawerOpen(false)
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </DrawerContent>
          </DrawerProvider>
        </div>

        {/* Bottom Toolbar - Full width */}
        <div className="rounded-2xl border p-3">
          <Toolbar tool={editor.tool} setTool={editor.setTool} />
        </div>
      </div>
    </div>
  )
}

// Field Settings Component - Separated from element inspector
function FieldSettings({
  scene,
  applyScene,
}: {
  scene: Scene
  applyScene: (next: Scene) => void
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase">
        Campo
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
  )
}

// Element Inspector Component - Only for selected elements
function ElementInspector({
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

      {selected ? (
        <>
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
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Orientação
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        const currentRotation = selected.rotation ?? 0
                        // Rotate 90 degrees counter-clockwise (left)
                        const newRotation = (currentRotation - 90 + 360) % 360
                        applyScene({
                          ...scene,
                          elements: scene.elements.map((el) =>
                            el.id === selected.id
                              ? ({ ...el, rotation: newRotation } as any)
                              : el,
                          ),
                        })
                      }}
                      title="Rodar 90° para a esquerda"
                    >
                      <RotateCcwSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        const currentRotation = selected.rotation ?? 0
                        // Rotate 90 degrees clockwise (right)
                        const newRotation = (currentRotation + 90) % 360
                        applyScene({
                          ...scene,
                          elements: scene.elements.map((el) =>
                            el.id === selected.id
                              ? ({ ...el, rotation: newRotation } as any)
                              : el,
                          ),
                        })
                      }}
                      title="Rodar 90° para a direita"
                    >
                      <RotateCwSquare className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Rotação (graus)
                    </div>
                    <Input
                      type="number"
                      value={selected.rotation ?? 0}
                      onChange={(e) =>
                        applyScene({
                          ...scene,
                          elements: scene.elements.map((el) =>
                            el.id === selected.id
                              ? ({
                                  ...el,
                                  rotation: Number(e.target.value),
                                } as any)
                              : el,
                          ),
                        })
                      }
                    />
                  </div>
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
