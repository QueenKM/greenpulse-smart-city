import { getSourceStatus } from "./quality.mjs";
import { formatCityTime } from "./time.mjs";

export const INCIDENT_IDS = Object.freeze({
  traffic: "INC-2026-1109-H03",
  heat: "ADV-2026-1109-U02",
  airQuality: "DATA-AQ07-M01",
});

export const INCIDENT_OWNERS = Object.freeze([
  "Mobility Department",
  "Environment / Urban Planning",
  "Civil Protection",
  "Data Steward",
]);

const definitions = Object.freeze([
  {
    id: INCIDENT_IDS.traffic,
    kind: "traffic",
    sourceId: null,
    page: "Overview",
    severity: "critical",
    tone: "red",
    level: "CRITICAL",
    title: "Recurring queue at a monitored location",
    place: "Historic Centre H-03",
    detail: "SYNTHETIC: selected monitoring-point counts and queue patterns support a time-limited traffic review. K1 travel time remains conditional on timestamp linkage.",
    action: "Review incident",
    defaultOwner: "Mobility Department",
    ageMinutes: 0,
  },
  {
    id: INCIDENT_IDS.heat,
    kind: "heat",
    sourceId: null,
    page: "Heat Preparedness",
    severity: "warning",
    tone: "amber",
    level: "WARNING",
    title: "Heatwave Preparedness Advisory",
    place: "South Market / Riverside",
    detail: "SYNTHETIC forecast advisory: Civil Protection reviews indicative priority areas. Local heat exposure and validated cooling-point reach: No data.",
    action: "Review preparedness",
    defaultOwner: "Civil Protection",
    ageMinutes: 12,
  },
  {
    id: INCIDENT_IDS.airQuality,
    kind: "data",
    sourceId: "AQ-07",
    page: "Data Health",
    severity: "warning",
    tone: "amber",
    level: "SOURCE OFFLINE",
    title: "AQ-07 Scheduled Maintenance",
    place: "TARGET · synthetic source replay",
    detail: "SYNTHETIC AQ-07 is offline in the target-state replay. No municipal air-quality station or ARPA feed is connected.",
    action: "Inspect data health",
    defaultOwner: "Data Steward",
    ageMinutes: 30,
  },
]);

export function createInitialIncidentState() {
  return Object.fromEntries(
    definitions.map(({ id, defaultOwner }) => [
      id,
      {
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        owner: defaultOwner,
        assignedBy: null,
        assignedAt: null,
        resolved: false,
        resolvedBy: null,
        resolvedAt: null,
        reviewNote: "",
        resolutionType: null,
        resolutionHistory: [],
        reopenedAt: null,
      },
    ]),
  );
}

export const initialIncidentState = createInitialIncidentState;

function getLifecycleStatus(lifecycle) {
  return typeof lifecycle === "string" ? lifecycle : lifecycle?.status || "idle";
}

function resolutionBlock(definition, record, context = {}) {
  if (record.resolved) return "This alert has already been closed after operator review.";
  if (!record.acknowledged) return "Acknowledge this alert before reviewing its resolution.";
  if (definition.kind === "traffic") {
    const lifecycle = getLifecycleStatus(context?.lifecycle);
    if (lifecycle === "measuring") return "Outcome measurement is still running. Review the completed outcome before resolving.";
    if (lifecycle !== "measured") return "Complete the human-approved intervention and outcome measurement before resolving this incident.";
  }
  if (definition.kind === "data" && getSourceStatus(context?.qualityState, definition.sourceId) !== "healthy") {
    return "AQ-07 must be restored to Healthy in Data Health before this source alert can be resolved.";
  }
  return "";
}

function derivedStatus(definition, record, lifecycle) {
  if (record.resolved) return "resolved";
  if (definition.kind === "traffic") {
    const status = getLifecycleStatus(lifecycle);
    if (status === "active") return "in_progress";
    if (status === "paused") return "paused";
    if (status === "measuring") return "measuring";
    if (status === "measured") return "awaiting_review";
  }
  return record.acknowledged ? "acknowledged" : "new";
}

const statusLabels = Object.freeze({
  new: "New",
  acknowledged: "Acknowledged",
  in_progress: "In progress",
  paused: "Paused",
  measuring: "Measuring outcome",
  awaiting_review: "Awaiting outcome review",
  resolved: "Resolved after review",
});

export function getAlertQueue(incidentState, { lifecycle = "idle", qualityState, anchor = new Date() } = {}) {
  const initial = createInitialIncidentState();
  const anchorDate = new Date(anchor);
  const anchorTime = Number.isFinite(anchorDate.getTime()) ? anchorDate.getTime() : Date.now();
  return definitions.map((definition) => {
    const record = incidentState?.[definition.id] || initial[definition.id];
    const status = derivedStatus(definition, record, lifecycle);
    const resolutionDisabledReason = resolutionBlock(definition, record, { lifecycle, qualityState });
    const sourceHealthy = definition.kind === "data" && getSourceStatus(qualityState, definition.sourceId) === "healthy";
    return {
      ...definition,
      owner: INCIDENT_OWNERS.includes(record.owner) ? record.owner : definition.defaultOwner,
      acknowledged: record.acknowledged === true,
      acknowledgedBy: record.acknowledgedBy,
      acknowledgedAt: record.acknowledgedAt,
      assignedBy: record.assignedBy,
      assignedAt: record.assignedAt,
      resolvedBy: record.resolvedBy,
      resolvedAt: record.resolvedAt,
      reviewNote: record.reviewNote,
      resolutionType: record.resolutionType,
      resolutionHistory: record.resolutionHistory || [],
      reopenedAt: record.reopenedAt || null,
      status,
      statusLabel: status === "resolved" && definition.kind === "heat" ? "Advisory closed" : statusLabels[status],
      canResolve: !resolutionDisabledReason,
      resolutionDisabledReason,
      resolutionLabel: definition.kind === "heat" ? "Confirm advisory closure" : "Confirm resolution",
      resolutionHelp: definition.kind === "heat"
        ? "Close this advisory only after operator review. Closure does not activate cooling points or establish a measured heat outcome."
        : definition.kind === "data"
          ? "Confirm that the restored synthetic source has been reviewed. Closing this alert does not change source quality."
          : "Review the completed synthetic outcome before resolving the incident. A measured outcome does not automatically close the alert.",
      time: formatCityTime(new Date(anchorTime - definition.ageMinutes * 60_000), { seconds: false }),
      ...(sourceHealthy ? {
        level: "SOURCE RESTORED",
        detail: "AQ-07 is Healthy in the synthetic source state. Operator acknowledgement and review are required to close this maintenance alert.",
      } : {}),
    };
  });
}

function operatorName(action) {
  return typeof action.operator === "string" && action.operator.trim()
    ? action.operator.trim().slice(0, 120)
    : "Control Room Operator #02";
}

function eventTime(action) {
  return action.time || new Date().toISOString();
}

export function incidentReducer(state = createInitialIncidentState(), action = {}) {
  if (action.type === "RESET") return createInitialIncidentState();
  const definition = definitions.find(({ id }) => id === action.id);
  if (!definition || !Object.hasOwn(state, action.id)) return state;
  const record = state[action.id];
  if (action.type === "SOURCE_STATE_CHANGED") {
    if (definition.kind !== "data" || !record.resolved || getSourceStatus(action.context?.qualityState, definition.sourceId) === "healthy") return state;
    return {
      ...state,
      [action.id]: {
        ...record,
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        resolved: false,
        resolvedBy: null,
        resolvedAt: null,
        reviewNote: "",
        resolutionType: null,
        reopenedAt: eventTime(action),
        resolutionHistory: [
          ...(record.resolutionHistory || []),
          {
            owner: record.owner,
            acknowledgedBy: record.acknowledgedBy,
            acknowledgedAt: record.acknowledgedAt,
            resolvedBy: record.resolvedBy,
            resolvedAt: record.resolvedAt,
            reviewNote: record.reviewNote,
            resolutionType: record.resolutionType,
          },
        ],
      },
    };
  }
  if (record.resolved) return state;
  switch (action.type) {
    case "ACKNOWLEDGE":
      if (record.acknowledged) return state;
      return {
        ...state,
        [action.id]: {
          ...record,
          acknowledged: true,
          acknowledgedBy: operatorName(action),
          acknowledgedAt: eventTime(action),
        },
      };
    case "ASSIGN":
      if (!INCIDENT_OWNERS.includes(action.owner) || action.owner === record.owner) return state;
      return {
        ...state,
        [action.id]: {
          ...record,
          owner: action.owner,
          assignedBy: operatorName(action),
          assignedAt: eventTime(action),
        },
      };
    case "RESOLVE":
      if (action.humanReviewed !== true || resolutionBlock(definition, record, action.context)) return state;
      return {
        ...state,
        [action.id]: {
          ...record,
          resolved: true,
          resolvedBy: operatorName(action),
          resolvedAt: eventTime(action),
          reviewNote: typeof action.reviewNote === "string" ? action.reviewNote.trim().slice(0, 1000) : "",
          resolutionType: definition.kind === "heat" ? "advisory_closed" : definition.kind === "data" ? "source_restored_reviewed" : "measured_outcome_reviewed",
        },
      };
    default:
      return state;
  }
}
