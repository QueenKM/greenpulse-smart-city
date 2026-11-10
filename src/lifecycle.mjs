export const initialLifecycle = {
  status: "idle",
  operator: "Control Room Operator #02",
  remaining: 2852,
  duration: 60,
  routeGuidance: true,
  note: "",
  logs: [],
};

export function lifecycleReducer(state, action) {
  const log = (event, next) => ({
    ...state,
    ...next,
    logs: [
      ...state.logs,
      {
        event,
        time: action.time || "10:01:42",
        operator: action.operator || state.operator,
        detail:
          action.type === "APPROVE"
            ? `Operating window: ${action.duration || 60} minutes · Route guidance: ${action.routeGuidance === false ? "excluded" : "included"}${action.note ? " · " + action.note : ""}`
            : action.note || "",
      },
    ],
  });
  switch (action.type) {
    case "APPROVE":
      return state.status === "idle" && action.humanApproved === true
        ? log("Approved & activated · Scenario B", {
            status: "active",
            remaining:
              action.duration && action.duration !== 60
                ? action.duration * 60
                : 2852,
            duration: action.duration || 60,
            routeGuidance: action.routeGuidance !== false,
            note: action.note || "",
          })
        : state;
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
