import { formatCityTime, formatCityDate } from "./time.mjs";
import { DEFAULT_PLAN, MODEL_VERSION, createPlanReview, evaluateTrafficContext, isReviewCurrent } from "./decision.mjs";
import { evaluateDataReadiness } from "./quality.mjs";

export const initialLifecycle = {
  status: "idle",
  operator: "Control Room Operator #02",
  remaining: 2852,
  duration: 60,
  routeGuidance: true,
  note: "",
  nextReviewAt: null,
  approvedDecision: null,
  measurementStartedAt: null,
  overrides: [],
  modifications: [],
  action: "signals",
  logs: [],
};

function immutable(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(immutable);
    Object.freeze(value);
  }
  return value;
}

export function lifecycleReducer(state, action) {
  const timestamp = action.timestamp === undefined ? Date.now() : action.timestamp;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) return state;
  const recordedAt = new Date(timestamp);
  const log = (event, next, detail = action.note || "") => ({
    ...state,
    ...next,
    logs: [...state.logs, {
      event,
      time: action.time || formatCityTime(recordedAt),
      date: formatCityDate(recordedAt),
      timestamp,
      operator: action.operator || state.operator,
      owner: (next.action || state.action) === "ztl" ? "Municipal Police" : "Mobility Department",
      authority: action.type === "APPROVE" ? action.authority : next.approvedDecision?.authority || state.approvedDecision?.authority || action.authority || null,
      detail,
      modelVersion: MODEL_VERSION,
      action: next.action || action.action || state.action,
      useCase: (next.action || action.action || state.action) === "ztl" ? "ztl" : "traffic",
      domain: (next.action || action.action || state.action) === "ztl" ? "ztl" : "traffic",
      humanDecision: ["APPROVE", "OVERRIDE", "MODIFY"].includes(action.type),
      ...(action.type === "APPROVE" ? {
        reviewId: next.approvedDecision.snapshot.id,
        reviewVersion: next.approvedDecision.snapshot.version,
        forecastScope: next.approvedDecision.snapshot.forecast.status,
      } : {}),
    }],
  });
  switch (action.type) {
    case "APPROVE": {
      const plan = {
        action: action.action || DEFAULT_PLAN.action,
        duration: action.duration === undefined ? DEFAULT_PLAN.duration : action.duration,
        routeGuidance: action.routeGuidance === undefined ? DEFAULT_PLAN.routeGuidance : action.routeGuidance,
      };
      const readiness = evaluateDataReadiness(action.qualityState, plan.action);
      const context = evaluateTrafficContext(action.trafficContext, plan.action);
      if (state.status !== "idle" || action.humanApproved !== true || !["MVP", "TARGET"].includes(action.maturity) ||
          action.authorityConfirmed !== true || action.authority !== context.authority ||
          (context.requiresPolice && (action.policeReviewed !== true || action.legalProcessConfirmed !== true || action.privacyReviewed !== true)) ||
          !isReviewCurrent(action.reviewSnapshot, plan, readiness, action.trafficContext)) return state;

      const approvedDecision = immutable({
        snapshot: createPlanReview(plan, action.reviewSnapshot),
        approvedAt: recordedAt.toISOString(),
        operator: state.operator,
        authority: action.authority,
        policeReviewed: action.policeReviewed === true,
        legalProcessConfirmed: action.legalProcessConfirmed === true,
        privacyReviewed: action.privacyReviewed === true,
        data: readiness.checks.map(({ id, status, required }) => ({ id, status, required })),
        trafficContext: JSON.parse(JSON.stringify(action.trafficContext)),
      });
      const detail = `Approved by ${action.authority} · Operating window: ${plan.duration} minutes · Route guidance: ${plan.routeGuidance ? "included" : "excluded"}${action.note ? " · " + action.note : ""} · Review v${approvedDecision.snapshot.version} · Model ${MODEL_VERSION} · ${context.requiresPolice ? "Police, legal procedure and privacy review confirmed" : "Authorised operator execution still required"} · SYNTHETIC prototype only`;
      return log(`Human approval recorded · ${context.actionLabel}`, {
        status: "approved", remaining: plan.duration * 60,
        duration: plan.duration, routeGuidance: plan.routeGuidance,
        note: action.note || "", nextReviewAt: null,
        approvedDecision, action: plan.action,
      }, detail);
    }
    case "EXECUTE": {
      const role = state.action === "ztl" ? "Municipal Police" : "Authorised traffic-signal operator";
      if (state.status !== "approved" || !state.approvedDecision || action.humanExecuted !== true ||
          (action.operatorRole || action.authority) !== role || typeof action.operator !== "string" || action.operator.trim().length < 3 ||
          (state.action === "ztl" && (action.legalProcessConfirmed !== true || !state.approvedDecision.legalProcessConfirmed || !state.approvedDecision.privacyReviewed))) return state;
      const execution = immutable({ executedAt: recordedAt.toISOString(), operator: action.operator.trim(), role, synthetic: true, legalProcessConfirmed: state.action === "ztl" });
      return log(state.action === "ztl" ? "Human legal-process execution recorded · synthetic only" : "Authorised operator execution recorded · synthetic trial started", {
        status: "active", operator: execution.operator, nextReviewAt: timestamp + 5 * 60_000,
        approvedDecision: immutable({ ...state.approvedDecision, execution }),
      }, `Approved by ${state.approvedDecision.authority} · Executed by ${execution.operator} (${role}) · No municipal controller, access gate or enforcement system is connected.`);
    }
    case "MODIFY":
    case "OVERRIDE": {
      if (state.status !== "idle" || action.humanReviewed !== true || typeof action.reason !== "string" || action.reason.trim().length < 3) return state;
      const readiness = evaluateDataReadiness(action.qualityState, action.action || "signals");
      const modification = action.type === "MODIFY";
      const record = immutable({
        id: `H03-${modification ? "MODIFY" : "OVERRIDE"}-${timestamp}`,
        action: action.action || "signals", useCase: action.action === "ztl" ? "ztl" : "traffic",
        data: readiness.checks.map(({ id, status }) => ({ id, status })),
        modelVersion: MODEL_VERSION,
        recommendation: modification ? "Modification requested before any execution" : "Review the proposed traffic intervention",
        decision: { actor: action.operator || state.operator, time: recordedAt.toISOString(), approvedOrOverride: modification ? "modified" : "override" },
        result: { status: "inconclusive", summary: action.reason.trim() },
      });
      const key = modification ? "modifications" : "overrides";
      return log(modification ? "Human modification recorded · approval required" : "Recommendation rejected · human decision recorded", { [key]: [...(state[key] || []), record] }, action.reason.trim());
    }
    case "PAUSE":
      return state.status === "active" ? log("Intervention paused by operator", { status: "paused" }) : state;
    case "RESUME":
      return state.status === "paused" && state.remaining > 0 ? log("Intervention resumed by operator", { status: "active" }) : state;
    case "HANDOVER":
      return ["active", "paused"].includes(state.status) && typeof action.operator === "string" && action.operator.trim().length >= 3
        ? log("Accountability handed over", { operator: action.operator.trim() }) : state;
    case "TICK":
      return state.status === "active" ? state.remaining <= 1
        ? log("Operating window elapsed · paused for human review", { status: "paused", remaining: 0 })
        : { ...state, remaining: state.remaining - 1 } : state;
    case "CLOSE":
      return ["active", "paused"].includes(state.status)
        ? log("Intervention closed · outcome review started", { status: "measuring", measurementStartedAt: timestamp }) : state;
    case "MEASUREMENT_COMPLETE":
      return state.status === "measuring" && Number.isFinite(state.measurementStartedAt) && timestamp >= state.measurementStartedAt + 5000
        ? log("Review window completed · No data until observations are validated", { status: "measured" }) : state;
    case "RESET":
      return { ...initialLifecycle, logs: [], overrides: [], modifications: [] };
    default:
      return state;
  }
}
