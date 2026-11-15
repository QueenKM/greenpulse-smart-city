import {
  createDefaultMapContext,
  createDefaultTwinContext,
  normalizeMapContext,
  normalizeTwinContext,
} from "./view-context.mjs";

export const VIEW_SESSION_KEY = "greenpulse:view-context:v1";
const sources = ["traffic", "AQ-04", "AQ-07", "visitor", "parking", "AVL", "weather", "reference"];

export function readViewSession() {
  const defaults = () => ({
    overview: createDefaultMapContext(),
    heat: createDefaultMapContext(),
    twin: createDefaultTwinContext(),
    sourceId: "traffic",
  });
  try {
    const value = JSON.parse(globalThis.sessionStorage?.getItem(VIEW_SESSION_KEY) || "null");
    if (!value || value.version !== 1) return defaults();
    return {
      overview: normalizeMapContext(value.overview),
      heat: normalizeMapContext(value.heat),
      twin: normalizeTwinContext(value.twin),
      sourceId: sources.includes(value.sourceId) ? value.sourceId : "traffic",
    };
  } catch {
    return defaults();
  }
}

// Only geographic/UI context is retained. Approval, ownership, incident
// lifecycle and measurement are deliberately never restored from browser storage.
export function saveViewSession(value) {
  try {
    globalThis.sessionStorage?.setItem(VIEW_SESSION_KEY, JSON.stringify({
      version: 1,
      overview: normalizeMapContext(value.overview),
      heat: normalizeMapContext(value.heat),
      twin: normalizeTwinContext(value.twin),
      sourceId: sources.includes(value.sourceId) ? value.sourceId : "traffic",
    }));
  } catch {
    // Blocked or full browser storage must not interrupt the decision workflow.
  }
}
