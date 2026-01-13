import type { Scene } from "./types";

export const defaultScene: Scene = {
  version: 1,
  pitch: { type: "full", orientation: "horizontal", showGrid: false },
  layers: {
    base: { name: "Base", visible: true, locked: true },
    drills: { name: "Drills", visible: true, locked: false },
    tactics: { name: "Tactics", visible: true, locked: false },
  },
  elements: [],
};
