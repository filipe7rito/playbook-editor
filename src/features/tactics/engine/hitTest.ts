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
        if (pointDist(p, { x: el.x, y: el.y }) <= el.r + 6) return el.id;
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
