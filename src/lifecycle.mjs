import { formatCityTime, formatCityDate } from "./time.mjs";
import { DEFAULT_PLAN, createPlanReview, isReviewCurrent } from "./decision.mjs";
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
  const timestamp = action.timestamp ?? Date.now();
  const recordedAt = new Date(timestamp);
  const log = (event, next) => ({
    ...state,
    ...next,
    logs: [
      ...state.logs,
      {
        event,
        time: action.time || formatCityTime(recordedAt),
        date: formatCityDate(recordedAt),
        timestamp,
        operator: action.type === "APPROVE" ? state.operator : action.operator || state.operator,
        detail:
          action.type === "APPROVE"
            ? `Operating window: ${next.duration} minutes · Route guidance: ${next.routeGuidance ? "included" : "excluded"}${action.note ? " · " + action.note : ""} · Review v${next.approvedDecision.snapshot.version} · Forecast scope: ${next.approvedDecision.snapshot.forecast.label}`
            : action.note || "",
        ...(action.type === "APPROVE" ? {
          reviewId: next.approvedDecision.snapshot.id,
          reviewVersion: next.approvedDecision.snapshot.version,
          forecastScope: next.approvedDecision.snapshot.forecast.status,
        } : {}),
      },
    ],
  });
  switch (action.type) {
    case "APPROVE": {
      const plan = {
        duration: action.duration === undefined ? DEFAULT_PLAN.duration : action.duration,
        routeGuidance: action.routeGuidance === undefined ? DEFAULT_PLAN.routeGuidance : action.routeGuidance,
      };
      const readiness = evaluateDataReadiness(action.qualityState);
      if (state.status !== "idle" || action.humanApproved !== true ||
          !isReviewCurrent(action.reviewSnapshot, plan, readiness)) return state;

      // Reconstruct the known serializable schema, then freeze a private copy.
      // Later edits, handovers or UI references cannot alter the approved record.
      const approvedDecision = immutable({
        snapshot: createPlanReview(plan, action.reviewSnapshot),
        approvedAt: recordedAt.toISOString(),
        operator: state.operator,
      });
      return log("Approved & activated · Scenario B", {
            status: "active",
            remaining:
              plan.duration !== 60
                ? plan.duration * 60
                : 2852,
            duration: plan.duration,
            routeGuidance: plan.routeGuidance,
            note: action.note || "",
            nextReviewAt: timestamp + 5 * 60 * 1000,
            approvedDecision,
          });
    }
    case "PAUSE":
      return state.status === "active"
        ? log("Intervention paused by operator", { status: "paused" })
        : state;
    case "RESUME":
      return state.status === "paused" && state.remaining > 0
        ? log("Intervention resumed by operator", { status: "active" })
        : state;
    case "HANDOVER":
      return ["active", "paused"].includes(state.status) && action.operator
        ? log("Accountability handed over", { operator: action.operator })
        : state;
    case "TICK":
      return state.status === "active"
        ? state.remaining <= 1
          ? log("Operating window elapsed · paused for human review", {
              status: "paused",
              remaining: 0,
            })
          : { ...state, remaining: state.remaining - 1 }
        : state;
    case "CLOSE":
      return ["active", "paused"].includes(state.status)
        ? log("Intervention closed · outcome measurement started", {
            status: "measuring",
          })
        : state;
    case "MEASUREMENT_COMPLETE":
      return state.status === "measuring"
        ? log("Measurement window completed · outcomes available", {
            status: "measured",
          })
        : state;
    case "RESET":
      return { ...initialLifecycle, logs: [] };
    default:
      return state;
  }
}
