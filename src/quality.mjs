// Explicit demonstration policy: coverage and evidence eligibility are separate.
// No quality or model-confidence score is inferred from an outage.
const POLICY_VERSION = "final-presentation-quality-v3";
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
    usedBy: "Synthetic monitored counts and queue patterns · traffic review",
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
    required: false,
    usedBy: "TARGET K3 · synthetic hourly PM2.5 / NO₂ example; no ARPA or validated municipal sensor connected",
    fallback:
      "No measured municipal K3 values are available. This synthetic example never gates aggregate ZTL review and does not establish an air-quality effect.",
    note: "SYNTHETIC environmental example; TARGET municipal integration",
    icon: "air",
  }),
  Object.freeze({
    id: "ztl",
    label: "ZTL aggregate demonstration",
    detail: "Synthetic gate / period entry counts; no licence plates",
    group: "ZTL access",
    defaultStatus: "healthy",
    totalFeeds: 0,
    healthyFeeds: 0,
    freshness: "SYNTHETIC replay",
    quality: null,
    required: false,
    usedBy: "Aggregate gate and period comparison; Police review",
    fallback: "No real gate, OCR, police or permit system is connected. Recorded entries do not establish a violation.",
    note: "Separate synthetic replay; excluded from the 17-feed denominator. Legal and privacy approval remain mandatory.",
    icon: "traffic",
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
      "Parking is required for parking redirection; it is supporting context for the signal-timing pilot.",
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
      "Transit requests require AVL evidence. Bus punctuality is also a signal-pilot guardrail requiring explicit operator review.",
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
      "Official external forecasts support heat preparedness after validation. No local temperature/humidity sensor network is documented; synthetic weather does not validate K5.",
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
      "TARGET synthetic air-quality redundancy only. Daily Traffic and ZTL approval do not depend on AQ-04; no ARPA feed or municipal sensor is connected.",
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

export function evaluateDataReadiness(state = DEFAULT_QUALITY_STATE, action = "signals") {
  const requiredByAction = {
    signals: ["traffic"],
    guidance: ["traffic"],
    ztl: ["ztl", "reference"],
    transit: ["traffic", "AVL"],
    policy: ["reference"],
  };
  const validAction = Object.hasOwn(requiredByAction, action);
  const required = validAction ? requiredByAction[action] : ["traffic"];
  const checks = QUALITY_SOURCES.map((source) => ({
    id: source.id,
    label: source.label,
    required: required.includes(source.id),
    status: getSourceStatus(state, source.id),
    usedBy: source.usedBy,
    fallback: source.fallback,
  }));
  const unavailable = checks.filter(
    (check) => check.required && !["healthy", "reference"].includes(check.status),
  );
  const reasons = unavailable.map((check) =>
    check.id === "traffic"
      ? `Traffic T12–T18 is ${check.status}. The mobility review requires usable monitored counts and queue patterns. K1 additionally requires validated timestamp linkage.`
      : `${check.label} is ${check.status}. This source is required for the selected ${action} decision.`,
  );
  if (!validAction) reasons.push("Select a documented use-case action before reviewing source readiness.");
  return {
    canApprove: validAction && unavailable.length === 0,
    status: validAction && unavailable.length === 0 ? "ready" : "blocked",
    key: `${POLICY_VERSION};action=${action};T18=maintenance|${checks.map((check) => `${check.id}=${check.status}`).join("|")}`,
    missing: unavailable.map((check) => check.id),
    reasons,
    checks,
    label:
      validAction && unavailable.length === 0
        ? "Selected use-case evidence ready"
        : "Approval blocked · required evidence unavailable",
    airQualityAvailable: getSourceStatus(state, "AQ-04") === "healthy" && getSourceStatus(state, "weather") === "healthy",
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
