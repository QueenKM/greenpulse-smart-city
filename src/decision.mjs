import { calculateDecisionScore, getForecastAt } from "./scenario.mjs";

export const MODEL_VERSION = "greenpulse-document-example-2026.11";
export const DEFAULT_PLAN = Object.freeze({ duration: 60, routeGuidance: true, action: "signals" });
const ALLOWED_DURATIONS = [30, 60, 90];
const ACTIONS = ["signals", "guidance", "ztl"];
const AUTHORITIES = {
  signals: "Mobility Department",
  guidance: "Mobility Department",
  ztl: "Municipal Police",
};

export function evaluateTrafficContext(context, action = "signals") {
  const source = context && typeof context === "object" && !Array.isArray(context) ? context : null;
  const reasons = [];
  if (!ACTIONS.includes(action)) reasons.push("This action is a departmental request or policy proposal, not an activatable traffic plan.");
  if (!source) reasons.push("Review the traffic use-case context before approving a trial.");
  const protections = Object.fromEntries(["residents", "emergency", "disabled", "deliveries", "transit"].map(key => [key, source?.protectedAccess?.[key] === true]));
  const checks = Object.fromEntries(["pedestrian", "bus", "residential", "heritage", "rollback"].map(key => [key, source?.checks?.[key] === true]));
  for (const [key, checked] of Object.entries(protections)) if (!checked) reasons.push(`Protected access must be retained: ${key}.`);
  const checkLabels = { pedestrian: "Pedestrian safety and crossing delay", bus: "Bus punctuality", residential: "No residential congestion displacement", heritage: "Heritage compatibility", rollback: "A time-limited trial and rollback plan" };
  for (const [key, checked] of Object.entries(checks)) if (!checked) reasons.push(`${checkLabels[key]} requires explicit review.`);
  if (action === "signals" && source?.thresholdAgreed !== true) reasons.push("Confirm the synthetic queue-pattern trigger; the municipal operating threshold remains to be agreed.");
  if (action === "ztl" && source?.aggregateReviewConfirmed !== true) reasons.push("Review aggregate entries by gate and period. Recorded entries are not automatically violations; permit and exemption linkage remains unvalidated.");
  const basis = { action, eventLoad: source?.eventLoad === "event" ? "event" : "normal", roadworks: source?.roadworks === true, protectedAccess: protections, checks, thresholdAgreed: source?.thresholdAgreed === true, aggregateReviewConfirmed: source?.aggregateReviewConfirmed === true, parkingOccupancy: Number.isFinite(source?.parkingOccupancy) ? source.parkingOccupancy : null };
  return { canApprove: reasons.length === 0, key: `traffic-context-v2|${canonical(basis)}`, reasons, authority: AUTHORITIES[action] || "Departmental decision owner", requiresPolice: action === "ztl", actionLabel: { signals: "Adaptive signal timing", guidance: "Targeted route guidance and parking redirection", ztl: "ZTL access-arrangement review" }[action] || "Departmental proposal" };
}

// Notes carry operator context; they do not change the intervention being reviewed.
export function planFingerprint(plan) {
  if (
    !plan ||
    typeof plan !== "object" ||
    Array.isArray(plan) ||
    !ALLOWED_DURATIONS.includes(plan.duration) ||
    typeof plan.routeGuidance !== "boolean" ||
    !ACTIONS.includes(plan.action || "signals")
  ) return null;
  return `action=${plan.action || "signals"};duration=${plan.duration};routeGuidance=${plan.routeGuidance ? 1 : 0}`;
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function reviewId(value) {
  // A stable display identifier, not a signature or a claim of tamper-proof storage.
  let hash = 2166136261;
  for (const character of canonical(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `H03-REVIEW-v${value.version}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function referenceForecast() {
  return {
    scenario: "B",
    duration: 60,
    routeGuidance: true,
    horizonMinutes: 60,
    label: "Reference Scenario B · 60 minutes + targeted route guidance",
    score: calculateDecisionScore([91, 88, 94, 100, 63]),
    values: getForecastAt(60, "B"),
    k1: { baselineMinutes: 18, predictedMinutes: 16.2, predictedChangePercent: -10, unit: "min/vehicle", source: "CURRENT FINAL presentation · illustrative KPI calculation" },
  };
}

export function createPlanReview(
  plan = DEFAULT_PLAN,
  { version = 1, qualityKey, contextKey, reviewedAt = Date.now() } = {},
) {
  const planKey = planFingerprint(plan);
  if (!planKey) throw new TypeError("A review requires a valid 30, 60 or 90-minute plan and a boolean route-guidance choice.");
  if (!Number.isSafeInteger(version) || version < 1) throw new TypeError("A review version must be a positive integer.");
  if (typeof qualityKey !== "string" || !qualityKey.trim()) throw new TypeError("A review requires the current data-readiness key.");
  if (typeof contextKey !== "string" || !contextKey.startsWith("traffic-context-v2|")) throw new TypeError("A review requires the current traffic-context key.");
  if ((typeof reviewedAt !== "number" && typeof reviewedAt !== "string") || !Number.isFinite(new Date(reviewedAt).getTime())) {
    throw new TypeError("A review requires a valid review timestamp.");
  }

  const reference = referenceForecast();
  let referenceContext = false;
  try { const basis = JSON.parse(contextKey.split("|").slice(1).join("|")); referenceContext = basis.action === "signals" && basis.eventLoad === "normal" && basis.roadworks === false; } catch { /* Unknown contexts carry no numerical forecast. */ }
  const isReference = planKey === planFingerprint(DEFAULT_PLAN) && referenceContext;
  const snapshot = {
    version,
    planKey,
    plan: { duration: plan.duration, routeGuidance: plan.routeGuidance, action: plan.action || "signals" },
    qualityKey,
    contextKey,
    modelVersion: MODEL_VERSION,
    reviewedAt: new Date(reviewedAt).toISOString(),
    forecast: {
      status: isReference ? "reference" : "unestimated",
      label: isReference
        ? "MODELLED illustration · 18.0 → 16.2 minutes; no achieved result"
        : "Modified plan reviewed · numerical outcome not estimated",
      score: isReference ? reference.score : null,
      values: isReference ? { ...reference.values } : null,
      reference,
    },
  };
  return { id: reviewId(snapshot), ...snapshot };
}

export function isReviewCurrent(snapshot, plan, readiness, trafficContext) {
  const context = evaluateTrafficContext(trafficContext, plan?.action || "signals");
  if (
    !snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
    readiness?.canApprove !== true || readiness.status !== "ready" ||
    typeof readiness.key !== "string" || !readiness.key ||
    snapshot.qualityKey !== readiness.key ||
    context.canApprove !== true || snapshot.contextKey !== context.key || snapshot.modelVersion !== MODEL_VERSION ||
    snapshot.planKey !== planFingerprint(plan) ||
    snapshot.planKey !== planFingerprint(snapshot.plan) ||
    typeof snapshot.reviewedAt !== "string"
  ) return false;

  try {
    const expected = createPlanReview(snapshot.plan, {
      version: snapshot.version,
      qualityKey: snapshot.qualityKey,
      contextKey: snapshot.contextKey,
      reviewedAt: snapshot.reviewedAt,
    });
    return snapshot.id === expected.id &&
      snapshot.reviewedAt === expected.reviewedAt &&
      canonical(snapshot.forecast) === canonical(expected.forecast);
  } catch {
    return false;
  }
}
