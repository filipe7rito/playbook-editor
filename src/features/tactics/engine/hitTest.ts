import type { LayerId, Point, Scene } from './types'

export function pointDist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function withinRect(
  p: Point,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h
}

function distToSegment(p: Point, a: Point, b: Point) {
  const vx = b.x - a.x
  const vy = b.y - a.y
  const wx = p.x - a.x
  const wy = p.y - a.y
  const c1 = vx * wx + vy * wy
  if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const c2 = vx * vx + vy * vy
  if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y)
  const t = c1 / c2
  const proj = { x: a.x + t * vx, y: a.y + t * vy }
  return Math.hypot(p.x - proj.x, p.y - proj.y)
}

const HANDLE_RADIUS = 8

export function hitTest(scene: Scene, p: Point): string | undefined {
  const layerOrder: LayerId[] = ['tactics', 'drills', 'base']

  for (const layerId of layerOrder) {
    const layer = scene.layers[layerId]
    if (!layer.visible) continue

    const els = scene.elements
      .filter((e) => e.layer === layerId && !e.hidden)
      .slice()
      .reverse()

    for (const el of els) {
      if (el.locked) continue

      if (el.kind === 'token') {
        // el.r is in pixels, but p is in field coordinates
        // Convert pixel radius to field coordinates: approximate 1 pixel ≈ 0.15 field units
        // This gives a reasonable hit area that matches the visual size
        const hitRadius = (el.r + 6) * 0.15
        if (pointDist(p, { x: el.x, y: el.y }) <= hitRadius) return el.id
      }
      if (el.kind === 'zone') {
        if (withinRect(p, el.x, el.y, el.w, el.h)) return el.id
      }
      if (el.kind === 'goal') {
        if (withinRect(p, el.x, el.y, el.w, el.h)) return el.id
      }
      if (el.kind === 'text') {
        if (withinRect(p, el.x - 4, el.y - 16, 240, 22)) return el.id
      }
      if (el.kind === 'arrow' || el.kind === 'line') {
        // Use a very small threshold for precise selection
        // Target approximately 4-5 pixels hit area
        // With typical viewport scales (4-8px per field unit), 0.8-1.0 gives good precision
        if (distToSegment(p, el.from, el.to) <= 0.8) return el.id
      }
      if (el.kind === 'path') {
        for (let i = 0; i < el.points.length - 1; i++) {
          if (distToSegment(p, el.points[i], el.points[i + 1]) <= 0.8)
            return el.id
        }
      }
    }
  }

  return undefined
}

export function hitTestHandle(
  scene: Scene,
  p: Point,
  selectedId?: string,
):
  | {
      id: string
      handle:
        | 'from'
        | 'to'
        | 'middle'
        | 'topLeft'
        | 'topRight'
        | 'bottomLeft'
        | 'bottomRight'
        | 'top'
        | 'bottom'
        | 'left'
        | 'right'
        | 'corner'
        | 'none'
    }
  | undefined {
  if (!selectedId) return undefined

  const el = scene.elements.find((e) => e.id === selectedId)
  if (!el || el.locked) return undefined

  if (el.kind === 'arrow' || el.kind === 'line') {
    const fromDist = pointDist(p, el.from)
    const toDist = pointDist(p, el.to)
    if (fromDist <= HANDLE_RADIUS) {
      return { id: el.id, handle: 'from' }
    }
    if (toDist <= HANDLE_RADIUS) {
      return { id: el.id, handle: 'to' }
    }
  }

  if (el.kind === 'path' && el.points.length > 0) {
    // Check all points for editing
    for (let i = 0; i < el.points.length; i++) {
      const dist = pointDist(p, el.points[i])
      if (dist <= HANDLE_RADIUS) {
        return {
          id: el.id,
          handle:
            i === 0 ? 'from' : i === el.points.length - 1 ? 'to' : 'middle',
        }
      }
    }
  }

  if (el.kind === 'zone') {
    // Check corners first (higher priority)
    const corners = [
      { x: el.x, y: el.y, handle: 'topLeft' as const },
      { x: el.x + el.w, y: el.y, handle: 'topRight' as const },
      { x: el.x, y: el.y + el.h, handle: 'bottomLeft' as const },
      { x: el.x + el.w, y: el.y + el.h, handle: 'bottomRight' as const },
    ]
    for (const corner of corners) {
      if (pointDist(p, corner) <= HANDLE_RADIUS) {
        return { id: el.id, handle: corner.handle }
      }
    }

    // Check edges for one-directional resize
    const edgeHandles = [
      { x: el.x + el.w / 2, y: el.y, handle: 'top' as const },
      { x: el.x + el.w / 2, y: el.y + el.h, handle: 'bottom' as const },
      { x: el.x, y: el.y + el.h / 2, handle: 'left' as const },
      { x: el.x + el.w, y: el.y + el.h / 2, handle: 'right' as const },
    ]
    for (const edge of edgeHandles) {
      if (pointDist(p, edge) <= HANDLE_RADIUS) {
        return { id: el.id, handle: edge.handle }
      }
    }
  }

  if (el.kind === 'goal') {
    // For small goals, prioritize moving over resizing
    // Check if click is in the center region (avoid handles for easier moving)
    const centerMargin = Math.min(el.w * 0.3, el.h * 0.3, 5) // At least 30% margin, but at least 5 units
    const isInCenter = 
      p.x >= el.x + centerMargin && 
      p.x <= el.x + el.w - centerMargin &&
      p.y >= el.y + centerMargin && 
      p.y <= el.y + el.h - centerMargin
    
    // If in center, don't return a handle (allows move instead)
    if (isInCenter) {
      return { id: el.id, handle: 'none' as const }
    }
    
    // For edges/corners, use a smaller handle radius for goals to avoid accidental resizing
    const goalHandleRadius = Math.min(HANDLE_RADIUS, Math.min(el.w, el.h) * 0.4)
    
    // Check corners first (higher priority)
    const corners = [
      { x: el.x, y: el.y, handle: 'topLeft' as const },
      { x: el.x + el.w, y: el.y, handle: 'topRight' as const },
      { x: el.x, y: el.y + el.h, handle: 'bottomLeft' as const },
      { x: el.x + el.w, y: el.y + el.h, handle: 'bottomRight' as const },
    ]
    for (const corner of corners) {
      if (pointDist(p, corner) <= goalHandleRadius) {
        return { id: el.id, handle: corner.handle }
      }
    }

    // Check edges for one-directional resize
    const edgeHandles = [
      { x: el.x + el.w / 2, y: el.y, handle: 'top' as const },
      { x: el.x + el.w / 2, y: el.y + el.h, handle: 'bottom' as const },
      { x: el.x, y: el.y + el.h / 2, handle: 'left' as const },
      { x: el.x + el.w, y: el.y + el.h / 2, handle: 'right' as const },
    ]
    for (const edge of edgeHandles) {
      if (pointDist(p, edge) <= goalHandleRadius) {
        return { id: el.id, handle: edge.handle }
      }
    }
    
    // If we reach here, click was outside center but not on a handle
    return { id: el.id, handle: 'none' as const }
  }

  return undefined
}
