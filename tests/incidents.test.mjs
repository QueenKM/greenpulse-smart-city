import test from "node:test";
import assert from "node:assert/strict";
import {
  INCIDENT_IDS,
  INCIDENT_OWNERS,
  createInitialIncidentState,
  initialIncidentState,
  incidentReducer,
  getAlertQueue,
} from "../src/incidents.mjs";
import { createInitialQualityState } from "../src/quality.mjs";

const operator = "Control Room Operator #03";
const anchor = Date.UTC(2026, 10, 14, 10, 0, 0);
const get = (state, id, context = {}) => getAlertQueue(state, { anchor, ...context }).find((alert) => alert.id === id);
const acknowledge = (state, id) => incidentReducer(state, { type: "ACKNOWLEDGE", id, operator, time: "10:01:00" });
const restoreAQ = () => ({ ...createInitialQualityState(), overrides: { "AQ-07": "healthy" } });

test("initial incidents are independent records and preserve contextual destinations", () => {
  const state = createInitialIncidentState();
  const another = initialIncidentState();
  assert.deepEqual(state, another);
  assert.notEqual(state, another);
  assert.notEqual(state[INCIDENT_IDS.traffic], another[INCIDENT_IDS.traffic]);
  const queue = getAlertQueue(state, { anchor });
  assert.equal(queue.length, 3);
  assert.equal(queue.filter((alert) => alert.status !== "resolved").length, 3);
  assert.ok(queue.every((alert) => alert.status === "new" && !alert.acknowledged));
  assert.equal(get(state, INCIDENT_IDS.airQuality).sourceId, "AQ-07");
  assert.equal(get(state, INCIDENT_IDS.airQuality).page, "Data Health");
  assert.equal(get(state, INCIDENT_IDS.traffic).page, "Overview");
  assert.equal(get(state, INCIDENT_IDS.heat).page, "Heat Preparedness");
});

test("acknowledgement records its operator without activating or resolving an incident", () => {
  const state = createInitialIncidentState();
  const next = acknowledge(state, INCIDENT_IDS.traffic);
  assert.equal(state[INCIDENT_IDS.traffic].acknowledged, false);
  assert.equal(next[INCIDENT_IDS.traffic].acknowledgedBy, operator);
  assert.equal(next[INCIDENT_IDS.traffic].acknowledgedAt, "10:01:00");
  assert.equal(get(next, INCIDENT_IDS.traffic).status, "acknowledged");
  assert.equal(next[INCIDENT_IDS.traffic].resolved, false);
  assert.equal(incidentReducer(next, { type: "ACKNOWLEDGE", id: INCIDENT_IDS.traffic, operator: "Another operator" }), next);
});

test("traffic status follows the shared intervention lifecycle and measurement never auto-resolves", () => {
  const state = createInitialIncidentState();
  for (const [lifecycle, expected] of [["idle", "new"], ["active", "in_progress"], ["paused", "paused"], ["measuring", "measuring"], ["measured", "awaiting_review"]]) {
    assert.equal(get(state, INCIDENT_IDS.traffic, { lifecycle }).status, expected);
    assert.equal(get(state, INCIDENT_IDS.traffic, { lifecycle: { status: lifecycle } }).status, expected);
  }
  const ack = acknowledge(state, INCIDENT_IDS.traffic);
  const measured = get(ack, INCIDENT_IDS.traffic, { lifecycle: { status: "measured" } });
  assert.equal(measured.status, "awaiting_review");
  assert.equal(measured.canResolve, true);
  assert.equal(ack[INCIDENT_IDS.traffic].resolved, false);
});

test("traffic resolution is reducer-gated by acknowledgement, explicit human review and measured context", () => {
  const state = createInitialIncidentState();
  const action = { type: "RESOLVE", id: INCIDENT_IDS.traffic, operator, humanReviewed: true, context: { lifecycle: "measured" } };
  assert.equal(incidentReducer(state, action), state);
  const ack = acknowledge(state, INCIDENT_IDS.traffic);
  assert.equal(incidentReducer(ack, { ...action, context: null }), ack);
  for (const lifecycle of [undefined, "idle", "active", "paused", "measuring"]) {
    assert.equal(incidentReducer(ack, { ...action, context: { lifecycle } }), ack);
    assert.equal(get(ack, INCIDENT_IDS.traffic, { lifecycle }).canResolve, false);
  }
  for (const humanReviewed of [undefined, false, "true", 1]) {
    assert.equal(incidentReducer(ack, { ...action, humanReviewed }), ack);
  }
  const resolved = incidentReducer(ack, { ...action, context: { lifecycle: { status: "measured" } }, time: "10:07:00", reviewNote: "  Reviewed synthetic outcome.  " });
  assert.equal(get(resolved, INCIDENT_IDS.traffic, { lifecycle: "measured" }).status, "resolved");
  assert.equal(resolved[INCIDENT_IDS.traffic].resolvedBy, operator);
  assert.equal(resolved[INCIDENT_IDS.traffic].resolvedAt, "10:07:00");
  assert.equal(resolved[INCIDENT_IDS.traffic].reviewNote, "Reviewed synthetic outcome.");
  assert.equal(resolved[INCIDENT_IDS.traffic].resolutionType, "measured_outcome_reviewed");
  assert.equal(incidentReducer(resolved, action), resolved);
});

test("AQ-07 can only resolve after restoration, acknowledgement and explicit review", () => {
  const state = createInitialIncidentState();
  const id = INCIDENT_IDS.airQuality;
  const action = { type: "RESOLVE", id, humanReviewed: true, context: { qualityState: restoreAQ() } };
  assert.equal(incidentReducer(state, action), state);
  const ack = acknowledge(state, id);
  for (const qualityState of [undefined, createInitialQualityState(), { overrides: { "AQ-07": "offline" } }, { overrides: { "AQ-07": "unknown" } }, { overrides: { "AQ-07": "invalid-status" } }]) {
    assert.equal(incidentReducer(ack, { ...action, context: { qualityState } }), ack);
    assert.equal(get(ack, id, { qualityState }).canResolve, false);
  }
  assert.equal(incidentReducer(ack, { ...action, humanReviewed: false }), ack);
  assert.equal(get(ack, id, { qualityState: restoreAQ() }).canResolve, true);
  const resolved = incidentReducer(ack, action);
  assert.equal(resolved[id].resolutionType, "source_restored_reviewed");
  assert.equal(get(resolved, id, { qualityState: restoreAQ() }).status, "resolved");
});

test("heat advisory closure requires acknowledgement and review without implying activation or measurement", () => {
  const id = INCIDENT_IDS.heat;
  const state = createInitialIncidentState();
  const action = { type: "RESOLVE", id, humanReviewed: true, operator };
  assert.equal(incidentReducer(state, action), state);
  const ack = acknowledge(state, id);
  assert.equal(get(ack, id).canResolve, true);
  assert.equal(incidentReducer(ack, { ...action, humanReviewed: undefined }), ack);
  const resolved = incidentReducer(ack, action);
  const alert = get(resolved, id);
  assert.equal(alert.status, "resolved");
  assert.equal(alert.statusLabel, "Advisory closed");
  assert.equal(resolved[id].resolutionType, "advisory_closed");
  assert.match(alert.resolutionHelp, /does not activate cooling points/);
  assert.match(alert.resolutionHelp, /measured heat outcome/);
  assert.equal(Object.hasOwn(resolved[id], "active"), false);
  assert.equal(Object.hasOwn(resolved[id], "measured"), false);
});

test("assignment accepts proposed known owners and cannot overwrite incident severity or bypass resolution", () => {
  const id = INCIDENT_IDS.traffic;
  const state = createInitialIncidentState();
  assert.equal(INCIDENT_OWNERS.includes("Environment / Urban Planning"), true);
  for (const owner of ["Unknown department", "", undefined, "Mobility Operations (confirmed Leuven owner)"]) {
    assert.equal(incidentReducer(state, { type: "ASSIGN", id, owner, operator }), state);
  }
  const next = incidentReducer(state, { type: "ASSIGN", id, owner: "Environment / Urban Planning", operator, time: "10:03:00", severity: "warning", resolved: true, acknowledged: true });
  const alert = get(next, id);
  assert.equal(alert.owner, "Environment / Urban Planning");
  assert.equal(next[id].assignedBy, operator);
  assert.equal(next[id].assignedAt, "10:03:00");
  assert.equal(alert.severity, "critical");
  assert.equal(alert.level, "CRITICAL");
  assert.equal(alert.status, "new");
  assert.equal(alert.acknowledged, false);
  assert.equal(next[id].resolved, false);
});

test("unknown actions and incident IDs cannot alter state; Reset returns a clean cycle", () => {
  const state = createInitialIncidentState();
  for (const action of [{ type: "ACKNOWLEDGE", id: "__proto__" }, { type: "ASSIGN", id: "not-an-incident", owner: "Environment / Urban Planning" }, { type: "ACTIVATE", id: INCIDENT_IDS.traffic }]) {
    assert.equal(incidentReducer(state, action), state);
  }
  const changed = acknowledge(state, INCIDENT_IDS.heat);
  assert.deepEqual(incidentReducer(changed, { type: "RESET" }), createInitialIncidentState());
});


test("a recurring AQ-07 fault reopens a fresh alert while retaining the reviewed closure", () => {
  const id = INCIDENT_IDS.airQuality;
  const healthy = restoreAQ();
  const offline = createInitialQualityState();
  const assigned = incidentReducer(createInitialIncidentState(), { type: "ASSIGN", id, owner: "Environment / Urban Planning", operator });
  const ack = acknowledge(assigned, id);
  const resolve = { type: "RESOLVE", id, humanReviewed: true, operator, time: "10:07:00", reviewNote: "Synthetic restoration reviewed.", context: { qualityState: healthy } };
  const closed = incidentReducer(ack, resolve);
  assert.equal(incidentReducer(closed, { type: "SOURCE_STATE_CHANGED", id, context: { qualityState: healthy } }), closed);
  const reopened = incidentReducer(closed, { type: "SOURCE_STATE_CHANGED", id, time: "10:09:00", context: { qualityState: offline } });
  assert.equal(closed[id].resolved, true);
  assert.deepEqual(closed[id].resolutionHistory, []);
  assert.equal(get(reopened, id, { qualityState: offline }).status, "new");
  assert.equal(reopened[id].owner, "Environment / Urban Planning");
  assert.equal(reopened[id].acknowledged, false);
  assert.equal(reopened[id].acknowledgedBy, null);
  assert.equal(reopened[id].resolved, false);
  assert.equal(reopened[id].resolvedBy, null);
  assert.equal(reopened[id].resolvedAt, null);
  assert.equal(reopened[id].reviewNote, "");
  assert.equal(reopened[id].reopenedAt, "10:09:00");
  assert.deepEqual(reopened[id].resolutionHistory, [{
    owner: "Environment / Urban Planning",
    acknowledgedBy: operator,
    acknowledgedAt: "10:01:00",
    resolvedBy: operator,
    resolvedAt: "10:07:00",
    reviewNote: "Synthetic restoration reviewed.",
    resolutionType: "source_restored_reviewed",
  }]);
  assert.equal(incidentReducer(reopened, resolve), reopened, "previous acknowledgement cannot resolve the new fault");
  const acknowledgedAgain = acknowledge(reopened, id);
  assert.equal(incidentReducer(acknowledgedAgain, { ...resolve, context: { qualityState: offline } }), acknowledgedAgain);
  assert.equal(incidentReducer(acknowledgedAgain, { ...resolve, humanReviewed: false }), acknowledgedAgain);
  const reviewedAgain = incidentReducer(acknowledgedAgain, resolve);
  assert.equal(get(reviewedAgain, id, { qualityState: healthy }).status, "resolved");
  assert.equal(reviewedAgain[id].resolutionHistory.length, 1);
  const secondRecurrence = incidentReducer(reviewedAgain, { type: "SOURCE_STATE_CHANGED", id, context: { qualityState: offline } });
  assert.equal(secondRecurrence[id].resolutionHistory.length, 2);
  assert.equal(incidentReducer(reopened, { type: "SOURCE_STATE_CHANGED", id, context: { qualityState: offline } }), reopened);
});
