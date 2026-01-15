import type { LayerId, Point, Scene, ShapeElement } from './types'
import { clamp, uid } from './utils'
import { getFieldDimensions } from './viewport'

// Minimum distance for lines/arrows
const MIN_LINE_LENGTH = 20

export function addToken(
  scene: Scene,
  layer: LayerId,
  tokenType: 'player' | 'opponent' | 'cone' | 'ball' | 'flag' | 'disc',
  p: Point,
) {
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'token',
    tokenType,
    x: p.x,
    y: p.y,
    r:
      tokenType === 'cone'
        ? 8
        : tokenType === 'ball'
          ? 7
          : tokenType === 'flag'
            ? 9
            : tokenType === 'disc'
              ? 10
              : 12,
  }
  return {
    scene: { ...scene, elements: [...scene.elements, el] },
    createdId: el.id,
  }
}

export function beginArrow(scene: Scene, layer: LayerId, p: Point) {
  // Start with same point, will be updated on first move
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'arrow',
    from: p,
    to: p,
    dashed: false,
    label: '',
  }
  return {
    scene: { ...scene, elements: [...scene.elements, el] },
    createdId: el.id,
  }
}

export function beginLine(scene: Scene, layer: LayerId, p: Point) {
  // Start with same point, will be updated on first move
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'line',
    from: p,
    to: p,
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
    w: 0, // Start with zero size, will be set by drag
    h: 0,
    fill: 'custom',
    opacity: 1,
    label: '',
  }
  return {
    scene: { ...scene, elements: [...scene.elements, el] },
    createdId: el.id,
  }
}

export function beginGoal(scene: Scene, layer: LayerId, p: Point) {
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: 'goal',
    x: p.x,
    y: p.y,
    w: 0, // Start with zero size, will be set by drag
    h: 0,
    rotation: 0,
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

export function resizeZoneFromDrag(
  start: Point,
  current: Point,
  fieldType: 'full' | 'half' | 'quarter' | 'free' = 'full',
) {
  // Always use full field dimensions for clamping
  // Coordinate system is always full field, regardless of pitch type
  const fieldDims = getFieldDimensions('full')

  let x = Math.min(start.x, current.x)
  let y = Math.min(start.y, current.y)
  let w = Math.abs(current.x - start.x)
  let h = Math.abs(current.y - start.y)

  // Allow zones to start small and grow naturally
  // Only enforce minimum size when the zone is finished being drawn
  // For now, allow any size during drawing

  // Clamp to field bounds
  x = Math.max(0, Math.min(x, fieldDims.width))
  y = Math.max(0, Math.min(y, fieldDims.height))

  // Ensure element stays within bounds
  if (x + w > fieldDims.width) w = fieldDims.width - x
  if (y + h > fieldDims.height) h = fieldDims.height - y

  // Don't clamp to minimum during drawing - allow any size
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    w: Math.max(0, Math.min(w, fieldDims.width)),
    h: Math.max(0, Math.min(h, fieldDims.height)),
  }
}

export function resizeZoneFromCorner(
  zone: { x: number; y: number; w: number; h: number },
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  current: Point,
  fieldType: 'full' | 'half' | 'quarter' | 'free' = 'full',
) {
  const MIN_SIZE = 20
  // Always use full field dimensions for clamping
  // Coordinate system is always full field, regardless of pitch type
  const fieldDims = getFieldDimensions('full')

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

  // Clamp to field bounds
  x = Math.max(0, Math.min(x, fieldDims.width))
  y = Math.max(0, Math.min(y, fieldDims.height))

  // Ensure element stays within bounds
  if (x + w > fieldDims.width) w = fieldDims.width - x
  if (y + h > fieldDims.height) h = fieldDims.height - y

  return {
    x,
    y,
    w: clamp(w, MIN_SIZE, fieldDims.width),
    h: clamp(h, MIN_SIZE, fieldDims.height),
  }
}

export function resizeZoneFromEdge(
  zone: { x: number; y: number; w: number; h: number },
  edge: 'top' | 'bottom' | 'left' | 'right',
  current: Point,
  fieldType: 'full' | 'half' | 'quarter' | 'free' = 'full',
) {
  const MIN_SIZE = 20
  // Always use full field dimensions for clamping
  // Coordinate system is always full field, regardless of pitch type
  const fieldDims = getFieldDimensions('full')

  let x = zone.x
  let y = zone.y
  let w = zone.w
  let h = zone.h

  switch (edge) {
    case 'top':
      y = Math.min(current.y, zone.y + zone.h - MIN_SIZE)
      h = zone.y + zone.h - y
      break
    case 'bottom':
      h = Math.max(MIN_SIZE, current.y - zone.y)
      break
    case 'left':
      x = Math.min(current.x, zone.x + zone.w - MIN_SIZE)
      w = zone.x + zone.w - x
      break
    case 'right':
      w = Math.max(MIN_SIZE, current.x - zone.x)
      break
  }

  // Clamp to field bounds
  x = Math.max(0, Math.min(x, fieldDims.width))
  y = Math.max(0, Math.min(y, fieldDims.height))

  // Ensure element stays within bounds
  if (x + w > fieldDims.width) w = fieldDims.width - x
  if (y + h > fieldDims.height) h = fieldDims.height - y

  return {
    x,
    y,
    w: clamp(w, MIN_SIZE, fieldDims.width),
    h: clamp(h, MIN_SIZE, fieldDims.height),
  }
}

// Clamp rectangle to stay within field bounds
// threshold: allows elements to extend slightly beyond bounds (useful for placing on pitch lines)
export function clampRectToFieldBounds(
  rect: { x: number; y: number; w: number; h: number },
  fieldType: 'full' | 'half' | 'quarter' | 'free' = 'full',
  threshold: number = 5, // Allow 5 units beyond boundaries for pitch line alignment
): { x: number; y: number; w: number; h: number } {
  // Always use full field dimensions for clamping
  // Coordinate system is always full field, regardless of pitch type
  const fieldDims = getFieldDimensions('full')

  let { x, y, w, h } = rect

  // Ensure width and height don't exceed field dimensions (with threshold)
  w = Math.min(w, fieldDims.width + threshold * 2)
  h = Math.min(h, fieldDims.height + threshold * 2)

  // Clamp position to keep rectangle within bounds (with threshold for pitch line alignment)
  // Allow negative positions and positions beyond bounds by threshold amount
  x = Math.max(-threshold, Math.min(x, fieldDims.width - w + threshold))
  y = Math.max(-threshold, Math.min(y, fieldDims.height - h + threshold))

  return { x, y, w, h }
}

// Goal resize functions (same logic as zones, but with smaller minimum size)
export function resizeGoalFromDrag(
  start: Point,
  current: Point,
  fieldType: 'full' | 'half' | 'quarter' | 'free' = 'full',
) {
  // Always use full field dimensions for clamping
  // Coordinate system is always full field, regardless of pitch type
  const fieldDims = getFieldDimensions('full')

  let x = Math.min(start.x, current.x)
  let y = Math.min(start.y, current.y)
  let w = Math.abs(current.x - start.x)
  let h = Math.abs(current.y - start.y)

  // Allow goals to start small and grow naturally
  // Only enforce minimum size when the goal is finished being drawn
  // For now, allow any size during drawing

  // Clamp to field bounds
  x = Math.max(0, Math.min(x, fieldDims.width))
  y = Math.max(0, Math.min(y, fieldDims.height))

  // Ensure element stays within bounds
  if (x + w > fieldDims.width) w = fieldDims.width - x
  if (y + h > fieldDims.height) h = fieldDims.height - y

  // Don't clamp to minimum during drawing - allow any size
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    w: Math.max(0, Math.min(w, fieldDims.width)),
    h: Math.max(0, Math.min(h, fieldDims.height)),
  }
}

export function resizeGoalFromCorner(
  goal: { x: number; y: number; w: number; h: number },
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
  current: Point,
  fieldType: 'full' | 'half' | 'quarter' | 'free' = 'full',
) {
  const MIN_W = 8
  const MIN_H = 5
  // Always use full field dimensions for clamping
  // Coordinate system is always full field, regardless of pitch type
  const fieldDims = getFieldDimensions('full')

  let x = goal.x
  let y = goal.y
  let w = goal.w
  let h = goal.h

  switch (corner) {
    case 'topLeft':
      x = Math.min(current.x, goal.x + goal.w - MIN_W)
      y = Math.min(current.y, goal.y + goal.h - MIN_H)
      w = goal.x + goal.w - x
      h = goal.y + goal.h - y
      break
    case 'topRight':
      y = Math.min(current.y, goal.y + goal.h - MIN_H)
      w = Math.max(MIN_W, current.x - goal.x)
      h = goal.y + goal.h - y
      break
    case 'bottomLeft':
      x = Math.min(current.x, goal.x + goal.w - MIN_W)
      w = goal.x + goal.w - x
      h = Math.max(MIN_H, current.y - goal.y)
      break
    case 'bottomRight':
      w = Math.max(MIN_W, current.x - goal.x)
      h = Math.max(MIN_H, current.y - goal.y)
      break
  }

  // Clamp to field bounds
  x = Math.max(0, Math.min(x, fieldDims.width))
  y = Math.max(0, Math.min(y, fieldDims.height))

  // Ensure element stays within bounds
  if (x + w > fieldDims.width) w = fieldDims.width - x
  if (y + h > fieldDims.height) h = fieldDims.height - y

  return {
    x,
    y,
    w: clamp(w, MIN_W, fieldDims.width),
    h: clamp(h, MIN_H, fieldDims.height),
  }
}

export function resizeGoalFromEdge(
  goal: { x: number; y: number; w: number; h: number },
  edge: 'top' | 'bottom' | 'left' | 'right',
  current: Point,
  fieldType: 'full' | 'half' | 'quarter' | 'free' = 'full',
) {
  const MIN_W = 8
  const MIN_H = 5
  // Always use full field dimensions for clamping
  // Coordinate system is always full field, regardless of pitch type
  const fieldDims = getFieldDimensions('full')

  let x = goal.x
  let y = goal.y
  let w = goal.w
  let h = goal.h

  switch (edge) {
    case 'top':
      y = Math.min(current.y, goal.y + goal.h - MIN_H)
      h = goal.y + goal.h - y
      break
    case 'bottom':
      h = Math.max(MIN_H, current.y - goal.y)
      break
    case 'left':
      x = Math.min(current.x, goal.x + goal.w - MIN_W)
      w = goal.x + goal.w - x
      break
    case 'right':
      w = Math.max(MIN_W, current.x - goal.x)
      break
  }

  // Clamp to field bounds
  x = Math.max(0, Math.min(x, fieldDims.width))
  y = Math.max(0, Math.min(y, fieldDims.height))

  // Ensure element stays within bounds
  if (x + w > fieldDims.width) w = fieldDims.width - x
  if (y + h > fieldDims.height) h = fieldDims.height - y

  return {
    x,
    y,
    w: clamp(w, MIN_W, fieldDims.width),
    h: clamp(h, MIN_H, fieldDims.height),
  }
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

// Simplify path by removing points that are too close or colinear
export function simplifyPath(
  points: Point[],
  minDistance: number = 20,
): Point[] {
  if (points.length <= 2) return points

  const simplified: Point[] = [points[0]]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = simplified[simplified.length - 1]
    const curr = points[i]
    const next = points[i + 1]

    // Calculate distance from previous point
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y)

    // Calculate angle change (if point is colinear, we can skip it)
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x)
    const angleDiff = Math.abs(angle1 - angle2)
    const isColinear = angleDiff < 0.1 || angleDiff > Math.PI - 0.1

    // Keep point if it's far enough or creates a significant angle change
    if (dist > minDistance || !isColinear) {
      simplified.push(curr)
    }
  }

  // Always keep the last point
  simplified.push(points[points.length - 1])

  return simplified
}
