'use client'

import {
  addToken,
  beginArrow,
  beginLine,
  beginPath,
  beginText,
  beginZone,
  ensureMinLineLength,
  resizeZoneFromCorner,
  resizeZoneFromDrag,
  updateElement,
} from '../engine/commands'
import { hitTest, hitTestHandle, pointDist } from '../engine/hitTest'
import type { LayerId, Point, Scene, Tool } from '../engine/types'
import type { Viewport } from '../engine/viewport'
import {
  canvasToField,
  calculateViewport,
  clampToFieldBounds,
} from '../engine/viewport'

export function usePointerHandlers(args: {
  scene: Scene
  tool: Tool
  activeLayer: LayerId
  selectedId?: string
  setSelectedId: (id: string | undefined) => void
  setHoverId: (id: string | undefined) => void
  drag: any
  setDrag: (d: any) => void
  applyScene: (next: Scene) => void
  replaceScene: (next: Scene) => void
  commitFrom: (base: Scene) => void
  setTool: (tool: Tool) => void
  wrapRef: React.RefObject<HTMLDivElement | null>
}) {
  const {
    scene,
    tool,
    activeLayer,
    setSelectedId,
    setHoverId,
    drag,
    setDrag,
    applyScene,
    replaceScene,
    commitFrom,
    setTool,
    wrapRef,
  } = args

  const getViewport = (): Viewport => {
    const wrap = wrapRef.current
    if (!wrap) {
      return calculateViewport(800, 600, 'full', 'horizontal')
    }
    const rect = wrap.getBoundingClientRect()
    return calculateViewport(
      rect.width,
      rect.height,
      scene.pitch.type === 'smallSided' ? 'quarter' : scene.pitch.type,
      scene.pitch.orientation,
    )
  }

  const screenToField = (
    wrap: HTMLDivElement,
    e: React.PointerEvent,
  ): Point => {
    const r = wrap.getBoundingClientRect()
    const canvasPoint = { x: e.clientX - r.left, y: e.clientY - r.top }
    const fieldType = scene.pitch.type === 'smallSided' ? 'quarter' : scene.pitch.type
    const viewport = calculateViewport(
      r.width,
      r.height,
      fieldType,
      scene.pitch.orientation,
    )
    return canvasToField(canvasPoint, viewport, fieldType)
  }

  const onPointerDown = (wrap: HTMLDivElement) => (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const p = screenToField(wrap, e)

    // Check for handle hits first (when element is selected)
    const handleHit = hitTestHandle(scene, p, args.selectedId)
    if (handleHit) {
      const el = scene.elements.find((x) => x.id === handleHit.id)
      if (!el || el.locked) return

      setSelectedId(handleHit.id)
      setTool('select') // Auto-switch to select tool

      if (el.kind === 'arrow' || el.kind === 'line') {
        setDrag({
          id: handleHit.id,
          start: p,
          type: 'resizeLine',
          handle: handleHit.handle,
          baseScene: scene,
        })
        return
      }

      if (el.kind === 'path') {
        setDrag({
          id: handleHit.id,
          start: p,
          type: 'resizePath',
          handle: handleHit.handle,
          baseScene: scene,
        })
        return
      }

      if (el.kind === 'zone' && (handleHit.handle === 'topLeft' || handleHit.handle === 'topRight' || handleHit.handle === 'bottomLeft' || handleHit.handle === 'bottomRight')) {
        setDrag({
          id: handleHit.id,
          start: p,
          type: 'resizeZone',
          handle: handleHit.handle,
          baseScene: scene,
        })
        return
      }
    }

    // 1) selecionar sempre se clicou num elemento
    const id = hitTest(scene, p)
    if (id) {
      setSelectedId(id)
      setTool('select') // Auto-switch to select tool when clicking an element
      const el = scene.elements.find((x) => x.id === id)
      if (!el || el.locked) return

      if (el.kind === 'token') {
        setDrag({
          id,
          start: p,
          origin: { x: el.x, y: el.y },
          type: 'move',
          baseScene: scene,
        })
        return
      }

      if (el.kind === 'zone') {
        // Zone movement is handled by hitTestHandle above
        // If we get here, it means we're clicking on the zone but not on a corner
        setDrag({
          id,
          start: p,
          origin: { x: el.x, y: el.y },
          type: 'move',
          baseScene: scene,
        })
        return
      }

      if (el.kind === 'text') {
        setDrag({
          id,
          start: p,
          origin: { x: el.x, y: el.y },
          type: 'move',
          baseScene: scene,
        })
        return
      }

      if (el.kind === 'arrow' || el.kind === 'line' || el.kind === 'path') {
        setDrag({
          id,
          start: p,
          type: 'move',
          baseScene: scene,
        })
        return
      }

      return
    }

    // 2) vazio: criar/desenhar
    setSelectedId(undefined)

    // se layer locked, não cria
    if (scene.layers[activeLayer].locked) return

    // Constrain point to field bounds
    const viewport = getViewport()
    const fieldType =
      scene.pitch.type === 'smallSided' ? 'quarter' : scene.pitch.type
    const constrainedP = clampToFieldBounds(p, viewport, fieldType)

    if (tool === 'player') {
      const res = addToken(scene, activeLayer, 'player', constrainedP)
      applyScene(res.scene)
      setSelectedId(res.createdId)
      return
    }
    if (tool === 'opponent') {
      const res = addToken(scene, activeLayer, 'opponent', constrainedP)
      applyScene(res.scene)
      setSelectedId(res.createdId)
      return
    }
    if (tool === 'cone') {
      const res = addToken(scene, activeLayer, 'cone', constrainedP)
      applyScene(res.scene)
      setSelectedId(res.createdId)
      return
    }
    if (tool === 'ball') {
      const res = addToken(scene, activeLayer, 'ball', constrainedP)
      applyScene(res.scene)
      setSelectedId(res.createdId)
      return
    }

    if (tool === 'arrow') {
      const res = beginArrow(scene, activeLayer, p)
      replaceScene(res.scene)
      setSelectedId(res.createdId)
      setDrag({
        id: res.createdId,
        start: p,
        type: 'draw',
        drawKind: 'arrow',
        baseScene: scene,
      })
      return
    }

    if (tool === 'line') {
      const res = beginLine(scene, activeLayer, p)
      replaceScene(res.scene)
      setSelectedId(res.createdId)
      setDrag({
        id: res.createdId,
        start: p,
        type: 'draw',
        drawKind: 'line',
        baseScene: scene,
      })
      return
    }

    if (tool === 'path') {
      const res = beginPath(scene, activeLayer, p)
      replaceScene(res.scene)
      setSelectedId(res.createdId)
      setDrag({
        id: res.createdId,
        start: p,
        type: 'draw',
        drawKind: 'path',
        baseScene: scene,
      })
      return
    }

    if (tool === 'zone') {
      const res = beginZone(scene, activeLayer, p)
      replaceScene(res.scene)
      setSelectedId(res.createdId)
      setDrag({
        id: res.createdId,
        start: p,
        type: 'draw',
        drawKind: 'zone',
        baseScene: scene,
      })
      return
    }

    if (tool === 'text') {
      const text = prompt('Texto:', 'Nota') ?? ''
      if (!text.trim()) return
      const res = beginText(scene, activeLayer, p, text.trim())
      applyScene(res.scene)
      setSelectedId(res.createdId)
    }
  }

  const onPointerMove = (wrap: HTMLDivElement) => (e: React.PointerEvent) => {
    const p = screenToField(wrap, e)

    if (!drag && tool === 'select') setHoverId(hitTest(scene, p))
    if (!drag) return

    const el = scene.elements.find((x) => x.id === drag.id)
    if (!el) return

    if (drag.type === 'draw') {
      if (el.kind === 'arrow' || el.kind === 'line') {
        const { from, to } = ensureMinLineLength(el.from, p)
        replaceScene(updateElement(scene, el.id, { to } as any))
        return
      }
      if (el.kind === 'zone') {
        // resizeZoneFromDrag already enforces minimum 20x20
        const resized = resizeZoneFromDrag(drag.start, p)
        replaceScene(updateElement(scene, el.id, resized as any))
        return
      }
      if (el.kind === 'path') {
        const last = el.points[el.points.length - 1]
        const dist = last ? Math.hypot(last.x - p.x, last.y - p.y) : 999
        if (dist > 10) {
          replaceScene(
            updateElement(scene, el.id, { points: [...el.points, p] } as any),
          )
        }
        return
      }
      return
    }

    // Handle resize for arrows/lines
    if ((el.kind === 'arrow' || el.kind === 'line') && drag.type === 'resizeLine') {
      if (drag.handle === 'from') {
        const { from, to } = ensureMinLineLength(p, el.to)
        replaceScene(updateElement(scene, el.id, { from } as any))
      } else if (drag.handle === 'to') {
        const { from, to } = ensureMinLineLength(el.from, p)
        replaceScene(updateElement(scene, el.id, { to } as any))
      }
      return
    }

    // Handle resize for paths
    if (el.kind === 'path' && drag.type === 'resizePath') {
      if (drag.handle === 'from' && el.points.length > 0) {
        const newPoints = [...el.points]
        newPoints[0] = p
        replaceScene(updateElement(scene, el.id, { points: newPoints } as any))
      } else if (drag.handle === 'to' && el.points.length > 0) {
        const newPoints = [...el.points]
        newPoints[newPoints.length - 1] = p
        replaceScene(updateElement(scene, el.id, { points: newPoints } as any))
      }
      return
    }

    if (el.kind === 'token' && drag.type === 'move') {
      const origin = drag.origin!
      const dx = p.x - drag.start.x
      const dy = p.y - drag.start.y
      const newPos = {
        x: origin.x + dx,
        y: origin.y + dy,
      }
      // Constrain to field bounds
      const viewport = getViewport()
      const fieldType =
        scene.pitch.type === 'smallSided' ? 'quarter' : scene.pitch.type
      const constrainedPos = clampToFieldBounds(newPos, viewport, fieldType)
      replaceScene(updateElement(scene, el.id, constrainedPos as any))
      return
    }

    if (el.kind === 'zone') {
      if (drag.type === 'resizeZone' && drag.handle) {
        // Resize from the specific corner
        const resized = resizeZoneFromCorner(
          { x: el.x, y: el.y, w: el.w, h: el.h },
          drag.handle as "topLeft" | "topRight" | "bottomLeft" | "bottomRight",
          p,
        )
        replaceScene(updateElement(scene, el.id, resized as any))
      } else if (drag.type === 'draw') {
        // Drawing a new zone
        const resized = resizeZoneFromDrag(drag.start, p)
        replaceScene(updateElement(scene, el.id, resized as any))
      } else {
        // Moving the zone
        const origin = drag.origin!
        const dx = p.x - drag.start.x
        const dy = p.y - drag.start.y
        replaceScene(
          updateElement(scene, el.id, {
            x: origin.x + dx,
            y: origin.y + dy,
          } as any),
        )
      }
      return
    }

    if (el.kind === 'text' && drag.type === 'move') {
      const origin = drag.origin!
      const dx = p.x - drag.start.x
      const dy = p.y - drag.start.y
      replaceScene(
        updateElement(scene, el.id, {
          x: origin.x + dx,
          y: origin.y + dy,
        } as any),
      )
      return
    }

    if ((el.kind === 'arrow' || el.kind === 'line') && drag.type === 'move') {
      const dx = p.x - drag.start.x
      const dy = p.y - drag.start.y
      setDrag({ ...drag, start: p })
      replaceScene(
        updateElement(scene, el.id, {
          from: { x: el.from.x + dx, y: el.from.y + dy },
          to: { x: el.to.x + dx, y: el.to.y + dy },
        } as any),
      )
      return
    }

    if (el.kind === 'path' && drag.type === 'move') {
      const dx = p.x - drag.start.x
      const dy = p.y - drag.start.y
      setDrag({ ...drag, start: p })
      replaceScene(
        updateElement(scene, el.id, {
          points: el.points.map((pt: any) => ({ x: pt.x + dx, y: pt.y + dy })),
        } as any),
      )
      return
    }
  }

  const onPointerUp = () => () => {
    if (drag?.baseScene) commitFrom(drag.baseScene)
    setDrag(undefined)
  }
  return { onPointerDown, onPointerMove, onPointerUp }
}
