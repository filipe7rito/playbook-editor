import type { LayerId, Point, Scene } from "./types";

export function pointDist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function withinRect(p: Point, x: number, y: number, w: number, h: number) {
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
}

function distToSegment(p: Point, a: Point, b: Point) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
  const t = c1 / c2;
  const proj = { x: a.x + t * vx, y: a.y + t * vy };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

const HANDLE_RADIUS = 8;

export function hitTest(scene: Scene, p: Point): string | undefined {
  const layerOrder: LayerId[] = ["tactics", "drills", "base"];

  for (const layerId of layerOrder) {
    const layer = scene.layers[layerId];
    if (!layer.visible) continue;

    const els = scene.elements
      .filter((e) => e.layer === layerId && !e.hidden)
      .slice()
      .reverse();

    for (const el of els) {
      if (el.locked) continue;

      if (el.kind === "token") {
        // el.r is in pixels, but p is in field coordinates
        // Convert pixel radius to field coordinates: approximate 1 pixel ≈ 0.15 field units
        // This gives a reasonable hit area that matches the visual size
        const hitRadius = (el.r + 6) * 0.15
        if (pointDist(p, { x: el.x, y: el.y }) <= hitRadius) return el.id;
      }
      if (el.kind === "zone") {
        if (withinRect(p, el.x, el.y, el.w, el.h)) return el.id;
      }
      if (el.kind === "text") {
        if (withinRect(p, el.x - 4, el.y - 16, 240, 22)) return el.id;
      }
      if (el.kind === "arrow" || el.kind === "line") {
        if (distToSegment(p, el.from, el.to) <= 8) return el.id;
      }
      if (el.kind === "path") {
        for (let i = 0; i < el.points.length - 1; i++) {
          if (distToSegment(p, el.points[i], el.points[i + 1]) <= 8) return el.id;
        }
      }
    }
  }

  return undefined;
}

export function hitTestHandle(
  scene: Scene,
  p: Point,
  selectedId?: string,
): { id: string; handle: "from" | "to" | "corner" | "none" } | undefined {
  if (!selectedId) return undefined;

  const el = scene.elements.find((e) => e.id === selectedId);
  if (!el || el.locked) return undefined;

  if (el.kind === "arrow" || el.kind === "line") {
    const fromDist = pointDist(p, el.from);
    const toDist = pointDist(p, el.to);
    if (fromDist <= HANDLE_RADIUS) {
      return { id: el.id, handle: "from" };
    }
    if (toDist <= HANDLE_RADIUS) {
      return { id: el.id, handle: "to" };
    }
  }

  if (el.kind === "path" && el.points.length > 0) {
    const firstDist = pointDist(p, el.points[0]);
    const lastDist = pointDist(p, el.points[el.points.length - 1]);
    if (firstDist <= HANDLE_RADIUS) {
      return { id: el.id, handle: "from" };
    }
    if (lastDist <= HANDLE_RADIUS) {
      return { id: el.id, handle: "to" };
    }
  }

  if (el.kind === "zone") {
    const corners = [
      { x: el.x, y: el.y, handle: "topLeft" as const },
      { x: el.x + el.w, y: el.y, handle: "topRight" as const },
      { x: el.x, y: el.y + el.h, handle: "bottomLeft" as const },
      { x: el.x + el.w, y: el.y + el.h, handle: "bottomRight" as const },
    ];
    for (const corner of corners) {
      if (pointDist(p, corner) <= HANDLE_RADIUS) {
        return { id: el.id, handle: corner.handle };
      }
    }
  }

  return undefined;
}
