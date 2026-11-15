import { calculateDecisionScore, getForecastAt } from "./scenario.mjs";

export const DEFAULT_PLAN = Object.freeze({ duration: 60, routeGuidance: true });
const ALLOWED_DURATIONS = [30, 60, 90];

// Notes carry operator context; they do not change the intervention being reviewed.
export function planFingerprint(plan) {
  if (
    !plan ||
    typeof plan !== "object" ||
    Array.isArray(plan) ||
    !ALLOWED_DURATIONS.includes(plan.duration) ||
    typeof plan.routeGuidance !== "boolean"
  ) return null;
  return `duration=${plan.duration};routeGuidance=${plan.routeGuidance ? 1 : 0}`;
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
  };
}

export function createPlanReview(
  plan = DEFAULT_PLAN,
  { version = 1, qualityKey, reviewedAt = Date.now() } = {},
) {
  const planKey = planFingerprint(plan);
  if (!planKey) throw new TypeError("A review requires a valid 30, 60 or 90-minute plan and a boolean route-guidance choice.");
  if (!Number.isSafeInteger(version) || version < 1) throw new TypeError("A review version must be a positive integer.");
  if (typeof qualityKey !== "string" || !qualityKey.trim()) throw new TypeError("A review requires the current data-readiness key.");
  if ((typeof reviewedAt !== "number" && typeof reviewedAt !== "string") || !Number.isFinite(new Date(reviewedAt).getTime())) {
    throw new TypeError("A review requires a valid review timestamp.");
  }

  const reference = referenceForecast();
  const isReference = planKey === planFingerprint(DEFAULT_PLAN);
  const snapshot = {
    version,
    planKey,
    plan: { duration: plan.duration, routeGuidance: plan.routeGuidance },
    qualityKey,
    reviewedAt: new Date(reviewedAt).toISOString(),
    forecast: {
      status: isReference ? "reference" : "unestimated",
      label: isReference
        ? "Reference projection · 60-minute Scenario B with route guidance"
        : "Modified plan reviewed · numerical outcome not estimated",
      score: isReference ? reference.score : null,
      values: isReference ? { ...reference.values } : null,
      reference,
    },
  };
  return { id: reviewId(snapshot), ...snapshot };
}

export function isReviewCurrent(snapshot, plan, readiness) {
  if (
    !snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) ||
    readiness?.canApprove !== true || readiness.status !== "ready" ||
    typeof readiness.key !== "string" || !readiness.key ||
    snapshot.qualityKey !== readiness.key ||
    snapshot.planKey !== planFingerprint(plan) ||
    snapshot.planKey !== planFingerprint(snapshot.plan) ||
    typeof snapshot.reviewedAt !== "string"
  ) return false;

  try {
    const expected = createPlanReview(snapshot.plan, {
      version: snapshot.version,
      qualityKey: snapshot.qualityKey,
      reviewedAt: snapshot.reviewedAt,
    });
    return snapshot.id === expected.id &&
      snapshot.reviewedAt === expected.reviewedAt &&
      canonical(snapshot.forecast) === canonical(expected.forecast);
  } catch {
    return false;
  }
}
