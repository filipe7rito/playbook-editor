'use client'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DrawerProvider,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer'
import { useMemo, useRef, useState, useEffect } from 'react'
import { useCanvasRenderer } from '../editor/useCanvasRenderer'
import { useEditorState } from '../editor/useEditorState'
import { usePointerHandlers } from '../editor/usePointerHandlers'
import { defaultScene } from '../engine/defaultScene'
import { deepClone, downloadDataUrl, downloadText } from '../engine/utils'
import { Inspector } from './Inspector'
import { Library } from './Library'
import { Toolbar } from './Toolbar'
import { SaveDialog } from './SaveDialog'
import { Menu, X, ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'

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
      editor.tool === 'path'
    )
      return 'crosshair'

    if (
      editor.tool === 'player' ||
      editor.tool === 'opponent' ||
      editor.tool === 'cone' ||
      editor.tool === 'ball'
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
            <SaveDialog scene={editor.scene} editingId={editingId} onSave={() => navigate({ to: '/' })} />
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
          <div className="hidden md:block min-h-0 w-[360px] rounded-2xl border p-3">
            <Tabs
              value={editor.panel}
              onValueChange={(v) => editor.setPanel(v as any)}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="inspector">Inspector</TabsTrigger>
                <TabsTrigger value="library">Biblioteca</TabsTrigger>
              </TabsList>

              <TabsContent value="inspector" className="mt-3">
                <Inspector
                  scene={editor.scene}
                  selected={editor.selected}
                  applyScene={editor.applyScene}
                  clearSelection={() => editor.setSelectedId(undefined)}
                />
              </TabsContent>

              <TabsContent value="library" className="mt-3">
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
                    <Inspector
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

        {/* Bottom Toolbar */}
        <div className="rounded-2xl border p-3">
          <Toolbar tool={editor.tool} setTool={editor.setTool} />
        </div>
      </div>
    </div>
  )
}
