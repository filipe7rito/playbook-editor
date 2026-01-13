'use client'

import {
  addToken,
  beginArrow,
  beginLine,
  beginPath,
  beginText,
  beginZone,
  resizeZoneFromDrag,
  updateElement,
} from '../engine/commands'
import { hitTest, pointDist } from '../engine/hitTest'
import type { LayerId, Point, Scene, Tool } from '../engine/types'

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
  } = args

  const screenToCanvas = (
    wrap: HTMLDivElement,
    e: React.PointerEvent,
  ): Point => {
    const r = wrap.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onPointerDown = (wrap: HTMLDivElement) => (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const p = screenToCanvas(wrap, e)

    // 1) selecionar sempre se clicou num elemento
    const id = hitTest(scene, p)
    if (id) {
      setSelectedId(id)
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
        const corner = { x: el.x + el.w, y: el.y + el.h }
        if (pointDist(p, corner) < 16) {
          setDrag({
            id,
            start: p,
            type: 'resizeZone',
            baseScene: scene,
          })
        } else {
          setDrag({
            id,
            start: p,
            origin: { x: el.x, y: el.y },
            type: 'move',
            baseScene: scene,
          })
        }
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

    if (tool === 'player') {
      const res = addToken(scene, activeLayer, 'player', p)
      applyScene(res.scene)
      setSelectedId(res.createdId)
      return
    }
    if (tool === 'opponent') {
      const res = addToken(scene, activeLayer, 'opponent', p)
      applyScene(res.scene)
      setSelectedId(res.createdId)
      return
    }
    if (tool === 'cone') {
      const res = addToken(scene, activeLayer, 'cone', p)
      applyScene(res.scene)
      setSelectedId(res.createdId)
      return
    }
    if (tool === 'ball') {
      const res = addToken(scene, activeLayer, 'ball', p)
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
    const p = screenToCanvas(wrap, e)

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
        replaceScene(
          updateElement(scene, el.id, resizeZoneFromDrag(drag.start, p) as any),
        )
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

    if (el.kind === 'token' && drag.type === 'move') {
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

    if (el.kind === 'zone') {
      if (drag.type === 'resizeZone') {
        replaceScene(
          updateElement(scene, el.id, {
            w: Math.max(8, p.x - el.x),
            h: Math.max(8, p.y - el.y),
          } as any),
        )
      } else {
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
