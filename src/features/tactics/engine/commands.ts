import type { LayerId, Point, Scene, ShapeElement } from './types'
import { clamp, uid } from './utils'

// Minimum distance for lines/arrows
const MIN_LINE_LENGTH = 20

export function addToken(
  scene: Scene,
  layer: LayerId,
  tokenType: 'player' | 'opponent' | 'cone' | 'ball',
  p: Point,
) {
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'token',
    tokenType,
    x: p.x,
    y: p.y,
    r: tokenType === 'cone' ? 9 : tokenType === 'ball' ? 8 : 14,
  }
  return {
    scene: { ...scene, elements: [...scene.elements, el] },
    createdId: el.id,
  }
}

export function beginArrow(scene: Scene, layer: LayerId, p: Point) {
  const minTo = { x: p.x + MIN_LINE_LENGTH, y: p.y }
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'arrow',
    from: p,
    to: minTo,
    dashed: false,
    label: '',
  }
  return {
    scene: { ...scene, elements: [...scene.elements, el] },
    createdId: el.id,
  }
}

export function beginLine(scene: Scene, layer: LayerId, p: Point) {
  const minTo = { x: p.x + MIN_LINE_LENGTH, y: p.y }
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'line',
    from: p,
    to: minTo,
    dashed: true,
  }
  return {
    scene: { ...scene, elements: [...scene.elements, el] },
    createdId: el.id,
  }
}

export function beginPath(scene: Scene, layer: LayerId, p: Point) {
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'path',
    points: [p],
    dashed: false,
    label: '',
  }
  return {
    scene: { ...scene, elements: [...scene.elements, el] },
    createdId: el.id,
  }
}

export function beginZone(scene: Scene, layer: LayerId, p: Point) {
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'zone',
    x: p.x,
    y: p.y,
    w: 20, // Start with minimum size
    h: 20,
    fill: 'custom',
    opacity: 1,
    label: '',
  }
  return {
    scene: { ...scene, elements: [...scene.elements, el] },
    createdId: el.id,
  }
}

export function beginText(
  scene: Scene,
  layer: LayerId,
  p: Point,
  text: string,
) {
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'text',
    x: p.x,
    y: p.y,
    text,
  }
  return {
    scene: { ...scene, elements: [...scene.elements, el] },
    createdId: el.id,
  }
}

export function updateElement(
  scene: Scene,
  id: string,
  patch: Partial<ShapeElement>,
) {
  return {
    ...scene,
    elements: scene.elements.map((e) =>
      e.id === id ? ({ ...e, ...patch } as ShapeElement) : e,
    ),
  }
}

export function deleteElement(scene: Scene, id: string) {
  return { ...scene, elements: scene.elements.filter((e) => e.id !== id) }
}

export function resizeZoneFromDrag(start: Point, current: Point) {
  const x = Math.min(start.x, current.x)
  const y = Math.min(start.y, current.y)
  const w = Math.abs(current.x - start.x)
  const h = Math.abs(current.y - start.y)
  // Minimum size: 20x20 for better usability
  return { x, y, w: clamp(w, 20, 4000), h: clamp(h, 20, 4000) }
}

export function resizeZoneFromCorner(
  zone: { x: number; y: number; w: number; h: number },
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  current: Point,
) {
  const MIN_SIZE = 20
  let x = zone.x
  let y = zone.y
  let w = zone.w
  let h = zone.h

  switch (corner) {
    case 'topLeft':
      x = Math.min(current.x, zone.x + zone.w - MIN_SIZE)
      y = Math.min(current.y, zone.y + zone.h - MIN_SIZE)
      w = zone.x + zone.w - x
      h = zone.y + zone.h - y
      break
    case 'topRight':
      y = Math.min(current.y, zone.y + zone.h - MIN_SIZE)
      w = Math.max(MIN_SIZE, current.x - zone.x)
      h = zone.y + zone.h - y
      break
    case 'bottomLeft':
      x = Math.min(current.x, zone.x + zone.w - MIN_SIZE)
      w = zone.x + zone.w - x
      h = Math.max(MIN_SIZE, current.y - zone.y)
      break
    case 'bottomRight':
      w = Math.max(MIN_SIZE, current.x - zone.x)
      h = Math.max(MIN_SIZE, current.y - zone.y)
      break
  }

  return { x, y, w: clamp(w, MIN_SIZE, 4000), h: clamp(h, MIN_SIZE, 4000) }
}

export function ensureMinLineLength(
  from: Point,
  to: Point,
): { from: Point; to: Point } {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist < MIN_LINE_LENGTH) {
    if (dist === 0) {
      // If points are the same, create a horizontal line
      return { from, to: { x: from.x + MIN_LINE_LENGTH, y: from.y } }
    }
    // Scale to minimum length
    const scale = MIN_LINE_LENGTH / dist
    return {
      from,
      to: { x: from.x + dx * scale, y: from.y + dy * scale },
    }
  }
  return { from, to }
}
