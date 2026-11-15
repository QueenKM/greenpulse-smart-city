// Explicit demonstration policy: coverage and evidence eligibility are separate.
// No quality or model-confidence score is inferred from an outage.
const POLICY_VERSION = "h03-quality-v1";
const OVERRIDE_STATUSES = new Set([
  "healthy",
  "offline",
  "delayed",
  "maintenance",
]);

export const QUALITY_SOURCES = Object.freeze([
  Object.freeze({
    id: "traffic",
    label: "Traffic T12–T18",
    detail: "7 roadside traffic sensors",
    group: "Traffic",
    defaultStatus: "healthy",
    totalFeeds: 7,
    healthyFeeds: 6,
    freshness: "18 sec",
    quality: 98,
    required: true,
    usedBy: "Traffic speed · congestion · mobility forecast · H-03 approval",
    fallback:
      "T12–T17 provide the required group input; T18 remains in maintenance. A whole-group outage has no approved substitute.",
    note: "T12–T17 streaming · T18 in maintenance",
    icon: "traffic",
  }),
  Object.freeze({
    id: "AQ-04",
    label: "AQ-04",
    detail: "Historic centre air quality",
    group: "Air quality",
    defaultStatus: "healthy",
    totalFeeds: 1,
    healthyFeeds: 1,
    freshness: "52 sec",
    quality: 98,
    required: true,
    usedBy: "PM2.5 · NO₂ · air-quality evidence · H-03 approval",
    fallback:
      "AQ-07 is an optional backup, not an automatically approved substitute. AQ-04 must be restored before H-03 approval.",
    note: "Primary evidence for the combined traffic and air-quality decision",
    icon: "air",
  }),
  Object.freeze({
    id: "parking",
    label: "Parking P1–P4",
    detail: "4 occupancy feeds",
    group: "Parking",
    defaultStatus: "healthy",
    totalFeeds: 4,
    healthyFeeds: 4,
    freshness: "27 sec",
    quality: 97,
    required: false,
    usedBy: "Parking occupancy · route-guidance context",
    fallback:
      "Parking context is optional to the H-03 evidence gate; traffic and AQ-04 remain the required inputs.",
    note: "Off-street parking capacity",
    icon: "parking",
  }),
  Object.freeze({
    id: "AVL",
    label: "Public Transport AVL",
    detail: "2 vehicle & service feeds",
    group: "Public transport",
    defaultStatus: "healthy",
    totalFeeds: 2,
    healthyFeeds: 2,
    freshness: "14 sec",
    quality: 96,
    required: false,
    usedBy: "Vehicle positions · service headways · transport context",
    fallback:
      "Public transport context is advisory for this H-03 use case; it does not replace the required traffic group.",
    note: "Two feeds: vehicle positions and service headways",
    icon: "transit",
  }),
  Object.freeze({
    id: "weather",
    label: "Weather W-01",
    detail: "Local weather station",
    group: "Weather",
    defaultStatus: "healthy",
    totalFeeds: 1,
    healthyFeeds: 1,
    freshness: "2 min",
    quality: 99,
    required: false,
    usedBy: "Temperature · wind · heat and dispersion context",
    fallback:
      "Weather is contextual to this mobility decision. The H-03 approval policy still requires traffic and AQ-04.",
    note: "Temperature, wind and humidity",
    icon: "weather",
  }),
  Object.freeze({
    id: "AQ-07",
    label: "AQ-07",
    detail: "Air-quality backup station",
    group: "Air quality",
    defaultStatus: "offline",
    totalFeeds: 1,
    healthyFeeds: 1,
    freshness: "49 sec",
    quality: 98,
    required: false,
    usedBy: "Optional air-quality redundancy; excluded while offline",
    fallback:
      "AQ-04 remains the primary required station. Losing AQ-07 does not block H-03 when AQ-04 is healthy.",
    note: "Scheduled maintenance · excluded from operational feeds",
    icon: "air",
  }),
  Object.freeze({
    id: "visitor",
    label: "Visitor Flow",
    detail: "Aggregated pedestrian counts",
    group: "Visitor flow",
    defaultStatus: "delayed",
    totalFeeds: 1,
    healthyFeeds: 1,
    freshness: "34 sec",
    quality: 96,
    required: false,
    usedBy: "Optional pedestrian context; delayed observations excluded",
    fallback:
      "The traffic and AQ-04 inputs remain available. Visitor counts are not used as current evidence while delayed.",
    note: "11-minute delay · excluded from current operational feeds",
    icon: "visitor",
  }),
  Object.freeze({
    id: "reference",
    label: "Historic GIS",
    detail: "OpenStreetMap · Leuven geometry",
    group: "Reference",
    defaultStatus: "reference",
    totalFeeds: 0,
    healthyFeeds: 0,
    freshness: "Reference dataset",
    quality: null,
    required: false,
    usedBy: "Street geometry · heritage and access constraints",
    fallback:
      "A bundled reference snapshot, not an operational feed. No live-source health claim is made.",
    note: "Bundled OSM snapshot · excluded from the 17-feed denominator",
    icon: "reference",
  }),
]);

const SOURCE_BY_ID = new Map(
  QUALITY_SOURCES.map((source) => [source.id, source]),
);
export const DEFAULT_QUALITY_STATE = Object.freeze({
  version: 1,
  overrides: Object.freeze({}),
});

export function createInitialQualityState() {
  return { version: 1, overrides: {} };
}

export function getSourceStatus(state = DEFAULT_QUALITY_STATE, id) {
  const source = SOURCE_BY_ID.get(id);
  if (!source) return "unknown";
  if (id === "reference") return "reference";
  const overrides = state?.overrides;
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, id)) {
    return OVERRIDE_STATUSES.has(overrides[id]) ? overrides[id] : "unknown";
  }
  return source.defaultStatus;
}

export function evaluateDataReadiness(state = DEFAULT_QUALITY_STATE) {
  const checks = QUALITY_SOURCES.map((source) => ({
    id: source.id,
    label: source.label,
    required: source.required,
    status: getSourceStatus(state, source.id),
    usedBy: source.usedBy,
    fallback: source.fallback,
  }));
  const unavailable = checks.filter(
    (check) => check.required && check.status !== "healthy",
  );
  const reasons = unavailable.map((check) =>
    check.id === "traffic"
      ? `Traffic T12–T18 is ${check.status}. Current speed, congestion and mobility forecast require the traffic group before H-03 approval.`
      : `AQ-04 is ${check.status}. PM2.5 and NO₂ evidence from the primary station is required before H-03 approval.`,
  );
  return {
    canApprove: unavailable.length === 0,
    status: unavailable.length === 0 ? "ready" : "blocked",
    key: `${POLICY_VERSION};T18=maintenance|${checks.map((check) => `${check.id}=${check.status}`).join("|")}`,
    missing: unavailable.map((check) => check.id),
    reasons,
    checks,
    label:
      unavailable.length === 0
        ? "H-03 evidence ready"
        : "Approval blocked · required evidence unavailable",
  };
}

export function getQualitySummary(state = DEFAULT_QUALITY_STATE) {
  const operational = QUALITY_SOURCES.reduce(
    (sum, source) =>
      sum +
      (getSourceStatus(state, source.id) === "healthy"
        ? source.healthyFeeds
        : 0),
    0,
  );
  const total = QUALITY_SOURCES.reduce(
    (sum, source) => sum + source.totalFeeds,
    0,
  );
  const canApprove = evaluateDataReadiness(state).canApprove;
  return {
    operational,
    total,
    qualityPercent: canApprove ? 96 : null,
    degradedCount: QUALITY_SOURCES.filter(
      (source) => getSourceStatus(state, source.id) === "delayed",
    ).length,
    sourceGroupCount: 6,
    offlineCount: QUALITY_SOURCES.filter((source) =>
      ["offline", "unknown"].includes(getSourceStatus(state, source.id)),
    ).length,
    excludedCount: total - operational,
    label: canApprove
      ? "Illustrative quality of available required evidence"
      : "Required evidence unavailable · quality not asserted",
  };
}
