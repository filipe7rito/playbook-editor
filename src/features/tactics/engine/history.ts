import type { HistoryState } from "./types";

export function pushHistory<T>(history: HistoryState<T>, next: T): HistoryState<T> {
  return { past: [...history.past, history.present].slice(-80), present: next, future: [] };
}
export function undoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (!history.past.length) return history;
  const prev = history.past[history.past.length - 1];
  return { past: history.past.slice(0, -1), present: prev, future: [history.present, ...history.future] };
}
export function redoHistory<T>(history: HistoryState<T>): HistoryState<T> {
  if (!history.future.length) return history;
  const next = history.future[0];
  return { past: [...history.past, history.present], present: next, future: history.future.slice(1) };
}
