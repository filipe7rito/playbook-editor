import type { LayerId, Point, Scene, ShapeElement } from "./types";
import { clamp, uid } from "./utils";

export function addToken(scene: Scene, layer: LayerId, tokenType: "player" | "opponent" | "cone" | "ball", p: Point) {
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: "token",
    tokenType,
    x: p.x,
    y: p.y,
    r: tokenType === "cone" ? 9 : tokenType === "ball" ? 8 : 14,
  };
  return { scene: { ...scene, elements: [...scene.elements, el] }, createdId: el.id };
}

export function beginArrow(scene: Scene, layer: LayerId, p: Point) {
  const el: ShapeElement = { id: uid(), layer, kind: "arrow", from: p, to: p, dashed: false, label: "" };
  return { scene: { ...scene, elements: [...scene.elements, el] }, createdId: el.id };
}

export function beginLine(scene: Scene, layer: LayerId, p: Point) {
  const el: ShapeElement = { id: uid(), layer, kind: "line", from: p, to: p, dashed: true };
  return { scene: { ...scene, elements: [...scene.elements, el] }, createdId: el.id };
}

export function beginPath(scene: Scene, layer: LayerId, p: Point) {
  const el: ShapeElement = { id: uid(), layer, kind: "path", points: [p], dashed: false, label: "" };
  return { scene: { ...scene, elements: [...scene.elements, el] }, createdId: el.id };
}

export function beginZone(scene: Scene, layer: LayerId, p: Point) {
  const el: ShapeElement = {
    id: uid(),
    layer,
    kind: "zone",
    x: p.x,
    y: p.y,
    w: 1,
    h: 1,
    fill: "custom",
    opacity: 1,
    label: "",
  };
  return { scene: { ...scene, elements: [...scene.elements, el] }, createdId: el.id };
}

export function beginText(scene: Scene, layer: LayerId, p: Point, text: string) {
  const el: ShapeElement = { id: uid(), layer, kind: "text", x: p.x, y: p.y, text };
  return { scene: { ...scene, elements: [...scene.elements, el] }, createdId: el.id };
}

export function updateElement(scene: Scene, id: string, patch: Partial<ShapeElement>) {
  return { ...scene, elements: scene.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as ShapeElement) : e)) };
}

export function deleteElement(scene: Scene, id: string) {
  return { ...scene, elements: scene.elements.filter((e) => e.id !== id) };
}

export function resizeZoneFromDrag(start: Point, current: Point) {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const w = Math.abs(current.x - start.x);
  const h = Math.abs(current.y - start.y);
  return { x, y, w: clamp(w, 8, 4000), h: clamp(h, 8, 4000) };
}
