'use client'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMemo, useRef } from 'react'
import { useCanvasRenderer } from '../editor/useCanvasRenderer'
import { useEditorState } from '../editor/useEditorState'
import { usePointerHandlers } from '../editor/usePointerHandlers'
import { defaultScene } from '../engine/defaultScene'
import { deepClone, downloadDataUrl, downloadText } from '../engine/utils'
import { Inspector } from './Inspector'
import { Library } from './Library'
import { Toolbar } from './Toolbar'

export function TacticsEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const editor = useEditorState()

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
          </div>
        </div>

        {/* Content */}
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 md:grid-cols-[320px_1fr_360px]">
          {/* Left */}
          <div className="min-h-0 rounded-2xl border p-3">
            <Toolbar tool={editor.tool} setTool={editor.setTool} />
          </div>

          {/* Center */}
          <div className="relative min-h-0 overflow-hidden rounded-2xl border">
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

          {/* Right */}
          <div className="min-h-0 rounded-2xl border p-3">
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
        </div>
      </div>
    </div>
  )
}
