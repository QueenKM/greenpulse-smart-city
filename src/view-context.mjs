// View preferences only. Approval, intervention and measurement state must never
// be restored from a saved view context.
const ENTITY_TYPES = Object.freeze({
  H03: "incident",
  T14: "traffic",
  T12: "traffic",
  "AQ-04": "air",
  "AQ-07": "offline",
  P3: "parking",
  C01: "cooling",
  C02: "cooling",
  C03: "cooling",
});

const isRecord = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const own = (value, key) =>
  isRecord(value) && Object.hasOwn(value, key) ? value[key] : undefined;
const finite = (value, fallback, min, max) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
const isTargetStage = (maturity) => maturity !== "CURRENT" && maturity !== "MVP";
const defaultViewMode = (maturity) => isTargetStage(maturity) ? "3d" : "2d";
const normalizeViewMode = (value, maturity) =>
  isTargetStage(maturity) && (value === "2d" || value === "3d")
    ? value
    : defaultViewMode(maturity);

function normalizeCamera(value) {
  return {
    zoom: finite(own(value, "zoom"), 1, 0.8, 3.4),
    x: finite(own(value, "x"), 0, -5600, 5600),
    y: finite(own(value, "y"), 0, -3600, 3600),
  };
}

function normalizePoint(value) {
  return Array.isArray(value) && value.length === 2 &&
    value.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate)) &&
    Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90
    ? [value[0], value[1]]
    : null;
}

function normalizeEntity(value) {
  const id = own(value, "id");
  if (typeof id !== "string" || !Object.hasOwn(ENTITY_TYPES, id)) return null;
  const entity = { id, type: ENTITY_TYPES[id], synthetic: true };
  for (const [key, limit] of [["title", 160], ["value", 240], ["note", 360]]) {
    const text = own(value, key);
    if (typeof text === "string") entity[key] = text.slice(0, limit);
  }
  for (const key of ["point", "coordinates"]) {
    const point = normalizePoint(own(value, key));
    if (point) entity[key] = point;
  }
  return entity;
}

export function createDefaultMapContext(maturity = "TARGET") {
  return {
    camera: { zoom: 1, x: 0, y: 0 },
    viewMode: defaultViewMode(maturity),
    entity: null,
  };
}

export function createDefaultTwinContext(maturity = "TARGET") {
  return {
    scenario: "B",
    divider: 50,
    camera: { zoom: 1, x: 0, y: 0 },
    viewMode: defaultViewMode(maturity),
    panMode: false,
  };
}

export function normalizeMapContext(value, maturity = "TARGET") {
  return {
    camera: normalizeCamera(own(value, "camera")),
    viewMode: normalizeViewMode(own(value, "viewMode"), maturity),
    entity: normalizeEntity(own(value, "entity")),
  };
}

export function normalizeTwinContext(value, maturity = "TARGET") {
  const scenario = own(value, "scenario");
  return {
    scenario: ["A", "B", "C"].includes(scenario) ? scenario : "B",
    divider: finite(own(value, "divider"), 50, 0, 100),
    camera: normalizeCamera(own(value, "camera")),
    viewMode: normalizeViewMode(own(value, "viewMode"), maturity),
    panMode: own(value, "panMode") === true,
  };
}
