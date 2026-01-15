'use client'

import {
  addToken,
  beginArrow,
  beginGoal,
  beginLine,
  beginPath,
  beginText,
  beginZone,
  clampRectToFieldBounds,
  resizeGoalFromCorner,
  resizeGoalFromDrag,
  resizeGoalFromEdge,
  resizeZoneFromCorner,
  resizeZoneFromDrag,
  resizeZoneFromEdge,
  simplifyPath,
  updateElement,
} from '../engine/commands'
import { hitTest, hitTestHandle } from '../engine/hitTest'
import type { LayerId, Point, Scene, Tool } from '../engine/types'
import type { Viewport } from '../engine/viewport'
import {
  calculateViewport,
  canvasToField,
  clampToFieldBounds,
  getFieldDimensions,
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
    const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
    return calculateViewport(rect.width, rect.height, fieldType, 'horizontal')
  }

  const screenToField = (
    wrap: HTMLDivElement,
    e: React.PointerEvent,
  ): Point => {
    const r = wrap.getBoundingClientRect()
    const canvasPoint = { x: e.clientX - r.left, y: e.clientY - r.top }
    const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
    const viewport = calculateViewport(
      r.width,
      r.height,
      fieldType,
      'horizontal',
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
        if (handleHit.handle === 'middle') {
          // Move entire line
          setDrag({
            id: handleHit.id,
            start: p,
            origin: { x: el.from.x, y: el.from.y },
            type: 'move',
            baseScene: scene,
          })
        } else {
          // Resize line endpoint
          setDrag({
            id: handleHit.id,
            start: p,
            type: 'resizeLine',
            handle: handleHit.handle,
            baseScene: scene,
          })
        }
        return
      }

      if (el.kind === 'path') {
        if (handleHit.handle === 'middle') {
          // Moving a middle point - need to find which point index
          // For now, treat as moving entire path
          setDrag({
            id: handleHit.id,
            start: p,
            type: 'move',
            baseScene: scene,
          })
        } else {
          // Resizing endpoint
          setDrag({
            id: handleHit.id,
            start: p,
            type: 'resizePath',
            handle: handleHit.handle,
            baseScene: scene,
          })
        }
        return
      }

      if (
        el.kind === 'zone' &&
        handleHit.handle !== 'from' &&
        handleHit.handle !== 'to' &&
        handleHit.handle !== 'corner' &&
        handleHit.handle !== 'none'
      ) {
        setDrag({
          id: handleHit.id,
          start: p,
          type: 'resizeZone',
          handle: handleHit.handle,
          baseScene: scene,
        })
        return
      }

      if (
        el.kind === 'goal' &&
        handleHit.handle !== 'from' &&
        handleHit.handle !== 'to' &&
        handleHit.handle !== 'corner' &&
        handleHit.handle !== 'none'
      ) {
        setDrag({
          id: handleHit.id,
          start: p,
          type: 'resizeGoal',
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

      if (el.kind === 'goal') {
        // Goal movement is handled by hitTestHandle above
        // If we get here, it means we're clicking on the goal but not on a corner
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

    // Items use full field dimensions regardless of pitch type
    // (items stay in same position, only pitch lines change)
    const viewport = getViewport()
    const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
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
    if (tool === 'flag') {
      const res = addToken(scene, activeLayer, 'flag', constrainedP)
      applyScene(res.scene)
      setSelectedId(res.createdId)
      return
    }
    if (tool === 'disc') {
      const res = addToken(scene, activeLayer, 'disc', constrainedP)
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
      // constrainedP is already clamped above
      const res = beginZone(scene, activeLayer, constrainedP)
      replaceScene(res.scene)
      setSelectedId(res.createdId)
      setDrag({
        id: res.createdId,
        start: constrainedP,
        type: 'draw',
        drawKind: 'zone',
        baseScene: scene,
      })
      return
    }

    if (tool === 'goal') {
      // constrainedP is already clamped above
      const res = beginGoal(scene, activeLayer, constrainedP)
      replaceScene(res.scene)
      setSelectedId(res.createdId)
      setDrag({
        id: res.createdId,
        start: constrainedP,
        type: 'draw',
        drawKind: 'goal',
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
        replaceScene(updateElement(scene, el.id, { to: p } as any))
        return
      }
      if (el.kind === 'zone') {
        // resizeZoneFromDrag already enforces minimum 20x20
        const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
        const resized = resizeZoneFromDrag(drag.start, p, fieldType)
        replaceScene(updateElement(scene, el.id, resized as any))
        return
      }
      if (el.kind === 'goal') {
        // resizeGoalFromDrag already enforces minimum 8x5
        const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
        const resized = resizeGoalFromDrag(drag.start, p, fieldType)
        replaceScene(updateElement(scene, el.id, resized as any))
        return
      }
      if (el.kind === 'path') {
        // If path has only 1 point, always add the second point
        if (el.points.length === 1) {
          replaceScene(
            updateElement(scene, el.id, { points: [...el.points, p] } as any),
          )
          return
        }

        const last = el.points[el.points.length - 1]
        const dist = last ? Math.hypot(last.x - p.x, last.y - p.y) : 999
        // While drawing, add points very frequently for maximum smoothness
        // Add point on every mouse move for ultra-smooth lines
        if (dist > 0.5) {
          // Add new point on every movement (extremely low threshold)
          replaceScene(
            updateElement(scene, el.id, { points: [...el.points, p] } as any),
          )
        } else {
          // Update last point when barely moving for precision
          const newPoints = [...el.points]
          newPoints[newPoints.length - 1] = p
          replaceScene(
            updateElement(scene, el.id, { points: newPoints } as any),
          )
        }
        return
      }
      return
    }

    // Handle resize for arrows/lines
    if (
      (el.kind === 'arrow' || el.kind === 'line') &&
      drag.type === 'resizeLine'
    ) {
      if (drag.handle === 'from') {
        replaceScene(updateElement(scene, el.id, { from: p } as any))
      } else if (drag.handle === 'to') {
        replaceScene(updateElement(scene, el.id, { to: p } as any))
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
      } else if (drag.handle === 'middle') {
        // Moving a middle point - find the closest point to update
        const newPoints = [...el.points]
        let closestIdx = 0
        let minDist = Infinity
        for (let i = 1; i < newPoints.length - 1; i++) {
          const dist = Math.hypot(
            newPoints[i].x - drag.start.x,
            newPoints[i].y - drag.start.y,
          )
          if (dist < minDist) {
            minDist = dist
            closestIdx = i
          }
        }
        newPoints[closestIdx] = p
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
      // Items use full field dimensions regardless of pitch type
      // (items stay in same position, only pitch lines change)
      const viewport = getViewport()
      const constrainedPos = clampToFieldBounds(newPos, viewport, 'full')
      replaceScene(updateElement(scene, el.id, constrainedPos as any))
      return
    }

    if (el.kind === 'zone') {
      const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
      
      if (drag.type === 'resizeZone' && drag.handle) {
        // Check if it's an edge handle or corner handle
        if (
          drag.handle === 'top' ||
          drag.handle === 'bottom' ||
          drag.handle === 'left' ||
          drag.handle === 'right'
        ) {
          // Resize from edge (one-directional)
          const resized = resizeZoneFromEdge(
            { x: el.x, y: el.y, w: el.w, h: el.h },
            drag.handle as 'top' | 'bottom' | 'left' | 'right',
            p,
            fieldType,
          )
          replaceScene(updateElement(scene, el.id, resized as any))
        } else {
          // Resize from corner
          const resized = resizeZoneFromCorner(
            { x: el.x, y: el.y, w: el.w, h: el.h },
            drag.handle as
              | 'topLeft'
              | 'topRight'
              | 'bottomLeft'
              | 'bottomRight',
            p,
            fieldType,
          )
          replaceScene(updateElement(scene, el.id, resized as any))
        }
      } else if (drag.type === 'draw') {
        // Drawing a new zone
        const resized = resizeZoneFromDrag(drag.start, p, fieldType)
        replaceScene(updateElement(scene, el.id, resized as any))
      } else {
        // Moving the zone - clamp to keep within bounds
        const origin = drag.origin!
        const dx = p.x - drag.start.x
        const dy = p.y - drag.start.y
        const newRect = clampRectToFieldBounds(
          { x: origin.x + dx, y: origin.y + dy, w: el.w, h: el.h },
          fieldType,
        )
        replaceScene(
          updateElement(scene, el.id, {
            x: newRect.x,
            y: newRect.y,
          } as any),
        )
      }
      return
    }

    if (el.kind === 'goal') {
      const fieldType = scene.pitch.type === 'free' ? 'full' : scene.pitch.type
      
      if (drag.type === 'resizeGoal' && drag.handle) {
        // Check if it's an edge handle or corner handle
        if (
          drag.handle === 'top' ||
          drag.handle === 'bottom' ||
          drag.handle === 'left' ||
          drag.handle === 'right'
        ) {
          // Resize from edge (one-directional)
          const resized = resizeGoalFromEdge(
            { x: el.x, y: el.y, w: el.w, h: el.h },
            drag.handle as 'top' | 'bottom' | 'left' | 'right',
            p,
            fieldType,
          )
          replaceScene(updateElement(scene, el.id, resized as any))
        } else {
          // Resize from corner
          const resized = resizeGoalFromCorner(
            { x: el.x, y: el.y, w: el.w, h: el.h },
            drag.handle as
              | 'topLeft'
              | 'topRight'
              | 'bottomLeft'
              | 'bottomRight',
            p,
            fieldType,
          )
          replaceScene(updateElement(scene, el.id, resized as any))
        }
      } else if (drag.type === 'draw') {
        // Drawing a new goal
        const resized = resizeGoalFromDrag(drag.start, p, fieldType)
        replaceScene(updateElement(scene, el.id, resized as any))
      } else {
        // Moving the goal - clamp to keep within bounds
        const origin = drag.origin!
        const dx = p.x - drag.start.x
        const dy = p.y - drag.start.y
        const newRect = clampRectToFieldBounds(
          { x: origin.x + dx, y: origin.y + dy, w: el.w, h: el.h },
          fieldType,
        )
        replaceScene(
          updateElement(scene, el.id, {
            x: newRect.x,
            y: newRect.y,
          } as any),
        )
      }
      return
    }

    if (el.kind === 'text' && drag.type === 'move') {
      const origin = drag.origin!
      const dx = p.x - drag.start.x
      const dy = p.y - drag.start.y
      const newPos = {
        x: origin.x + dx,
        y: origin.y + dy,
      }
      // Items use full field dimensions regardless of pitch type
      // (items stay in same position, only pitch lines change)
      const viewport = getViewport()
      const constrainedPos = clampToFieldBounds(newPos, viewport, 'full')
      replaceScene(
        updateElement(scene, el.id, {
          x: constrainedPos.x,
          y: constrainedPos.y,
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
    if (drag?.baseScene) {
      // Simplify path when finishing drawing (less aggressive to preserve smoothness)
      if (drag.type === 'draw' && drag.drawKind === 'path') {
        const el = scene.elements.find((x) => x.id === drag.id)
        if (el && el.kind === 'path' && el.points.length > 2) {
          // Use lower minDistance to preserve more points for smoother paths
          const simplified = simplifyPath(el.points, 8)
          if (simplified.length < el.points.length) {
            replaceScene(
              updateElement(scene, el.id, { points: simplified } as any),
            )
          }
        }
      }
      // Enforce minimum size for zones when finishing drawing
      if (drag.type === 'draw' && drag.drawKind === 'zone') {
        const el = scene.elements.find((x) => x.id === drag.id)
        if (el && el.kind === 'zone' && (el.w < 20 || el.h < 20)) {
          // Always use full field dimensions for clamping
          // Coordinate system is always full field, regardless of pitch type
          const fieldDims = getFieldDimensions('full')
          const minSize = { w: Math.max(el.w, 20), h: Math.max(el.h, 20) }
          // Ensure it still fits within bounds
          let x = Math.max(0, el.x)
          let y = Math.max(0, el.y)
          if (x + minSize.w > fieldDims.width) x = Math.max(0, fieldDims.width - minSize.w)
          if (y + minSize.h > fieldDims.height) y = Math.max(0, fieldDims.height - minSize.h)
          replaceScene(updateElement(scene, el.id, { x, y, w: minSize.w, h: minSize.h } as any))
        }
      }
      // Enforce minimum size for goals when finishing drawing
      if (drag.type === 'draw' && drag.drawKind === 'goal') {
        const el = scene.elements.find((x) => x.id === drag.id)
        if (el && el.kind === 'goal') {
          // Always use full field dimensions for clamping
          // Coordinate system is always full field, regardless of pitch type
          const fieldDims = getFieldDimensions('full')
          // Use bigger default size: 20x18 if goal is too small
          const MIN_W = 8
          const MIN_H = 5
          const DEFAULT_W = 20
          const DEFAULT_H = 18
          // If goal is too small (especially if it's zero or very small), use default size
          const minSize = { 
            w: el.w < MIN_W ? DEFAULT_W : Math.max(el.w, MIN_W), 
            h: el.h < MIN_H ? DEFAULT_H : Math.max(el.h, MIN_H) 
          }
          // Ensure it still fits within bounds
          let x = Math.max(0, el.x)
          let y = Math.max(0, el.y)
          if (x + minSize.w > fieldDims.width) x = Math.max(0, fieldDims.width - minSize.w)
          if (y + minSize.h > fieldDims.height) y = Math.max(0, fieldDims.height - minSize.h)
          replaceScene(updateElement(scene, el.id, { x, y, w: minSize.w, h: minSize.h } as any))
        }
      }
      commitFrom(drag.baseScene)
    }
    setDrag(undefined)
  }
  return { onPointerDown, onPointerMove, onPointerUp }
}
