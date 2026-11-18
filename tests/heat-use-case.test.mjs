import test from "node:test";
import assert from "node:assert/strict";
import { createInitialHeatState, deriveHeatMetrics, evaluateHeatReadiness, heatReducer, HEAT_APPROVAL_AUTHORITIES, HEAT_ZONES, HEAT_COOLING_POINTS } from "../src/heat-use-case.mjs";

import { decisionRecords } from "../src/document-workflow.mjs";
import { calculateK7 } from "../src/kpi-framework.mjs";

const START = Date.parse("2026-11-18T10:00:00Z");
const update = (state, patch) => heatReducer(state, { type: "UPDATE_DRAFT", patch, timestamp: START });
function reviewedState() {
  return update(createInitialHeatState(START), { authority: "Civil Protection", operator: "Civil Protection Officer #02", officialForecastReviewed: true, territorialInformationReviewed: true, outreachReviewed: true, accessibilityChecked: true, safetyChecked: true });
}
const approve = (state, extra = {}) => heatReducer(state, { type: "APPROVE", humanApproved: true, maturity: "TARGET", authority: "Civil Protection", operator: "Civil Protection Officer #02", timestamp: START + 1000, ...extra });

test("heat municipal KPIs start with No data and no local sensing or cooling inventory claim", () => {
  const state = createInitialHeatState(START);
  const metrics = deriveHeatMetrics(state);
  assert.equal(state.status, "idle");
  assert.equal(state.approvedDecision, null);
  assert.equal(state.data.observedAirC, null);
  assert.equal(state.data.observedRhPercent, null);
  assert.equal(metrics.exposure.value, null);
  assert.equal(metrics.exposure.provenance, "NO DATA");
  assert.equal(metrics.exposure.readiness, "TARGET");
  assert.equal(metrics.cooling.value, null);
  assert.equal(metrics.cooling.readiness, "PILOT");
  assert.equal(metrics.municipalObserved, false);
  assert.equal(evaluateHeatReadiness(state).ready, false);
  assert.equal(approve(state), state);
});

test("Civil Protection alone approves/activates preparedness after explicit human validation", () => {
  const state = reviewedState();
  assert.deepEqual(HEAT_APPROVAL_AUTHORITIES, ["Civil Protection"]);
  assert.equal(evaluateHeatReadiness(state, "TARGET").ready, true);
  for (const extra of [{ humanApproved: false }, { maturity: "CURRENT" }, { maturity: undefined }, { authority: "Mobility Department" }, { authority: "Public Health" }, { authority: "Environment / Urban Planning" }, { authority: "AI" }, { operator: "" }, { timestamp: NaN }]) assert.equal(approve(state, extra), state);
  const active = approve(state);
  assert.equal(active.status, "active");
  assert.equal(active.approvedDecision.authority, "Civil Protection");
  assert.equal(active.approvedDecision.owner, "Civil Protection");
  assert.equal(active.approvedDecision.environmentalInterpretation, "Environment / Urban Planning");
  assert.equal(active.approvedDecision.outreach, "Social Services");
  assert.equal(active.logs.length, 1);
  assert.equal(active.logs[0].humanDecision, true);
  assert.equal(active.logs[0].useCase, "heat");
  assert.ok(Object.isFrozen(active.approvedDecision));
  assert.ok(Object.isFrozen(active.approvedDecision.data.zones));
  assert.equal(approve(state, { maturity: "MVP" }).status, "active", "manual preparedness pilot does not require a local heat sensor network");
});

test("official forecast and territorial/outreach reviews gate preparedness, not invented sensing or cooling", () => {
  for (const flag of ["officialForecastReviewed", "territorialInformationReviewed", "outreachReviewed", "accessibilityChecked", "safetyChecked"]) {
    const state = update(reviewedState(), { [flag]: false });
    assert.equal(approve(state), state, flag);
  }
  const state = reviewedState();
  assert.equal(state.draft.validatedAir, false);
  assert.equal(state.draft.thresholdC, null);
  assert.equal(state.draft.reachMinutes, null);
  assert.deepEqual(state.draft.coolingIds, []);
  assert.equal(approve(state).status, "active");
  assert.equal(approve(update(state, { shade: false, water: false, notifications: false, reschedule: false })).status, "idle");
});

test("retained target calculations stay separate from municipal KPI readiness", () => {
  let state = update(reviewedState(), { thresholdC: 35, reachMinutes: 10, coolingIds: ["C01", "C02", "C03"] });
  state = update(state, { validatedAir: true, thresholdConfirmed: true, reachConfirmed: true });
  const metrics = deriveHeatMetrics(state);
  assert.equal(metrics.exposure.value, null);
  assert.equal(metrics.cooling.value, null);
  assert.equal(metrics.demonstration.cooling.servedVulnerable, 350);
  assert.equal(metrics.demonstration.cooling.totalVulnerable, 2720);
  const expected = metrics.series.filter(slot => slot.temperatureC > 35).reduce((sum, slot) => sum + slot.people * slot.hours, 0);
  assert.equal(metrics.demonstration.exposure.value, expected);
  assert.equal(metrics.demonstration.exposure.reductionPercent, null);
  assert.equal(metrics.demonstration.cooling.assignments.reduce((sum, assignment) => sum + assignment.people, 0), 350);
  const modified = update(state, { shade: false, water: false, notifications: false, reschedule: false, horizonHours: 48 });
  assert.equal(deriveHeatMetrics(modified).series.length, HEAT_ZONES.length * 48);
  assert.equal(deriveHeatMetrics(modified).exposure.value, null);
});

test("synthetic cooling capacity and opening restrictions never imply verified municipal access", () => {
  let state = update(reviewedState(), { reachMinutes: 10, coolingIds: ["C01", "C02", "C03"], serviceHour: 8 });
  state = update(state, { reachConfirmed: true });
  const metrics = deriveHeatMetrics(state);
  assert.deepEqual(metrics.demonstration.cooling.eligibleIds, ["C01"]);
  assert.equal(metrics.cooling.valid, false);
  assert.match(metrics.cooling.reason, /No validated cooling-point inventory/);
});

test("unapproved heat plans cannot pause, close or complete, and unsafe draft injections are ignored", () => {
  const state = reviewedState();
  for (const type of ["PAUSE", "RESUME", "CLOSE", "MEASUREMENT_COMPLETE", "UNKNOWN"]) assert.equal(heatReducer(state, { type, timestamp: START + 10_000 }), state);
  assert.equal(heatReducer(state, null), state);
  assert.equal(heatReducer(state, []), state);
  const injected = update(state, { status: "active", data: { temperatureKind: "surface" }, approvedDecision: { authority: "AI" }, coolingIds: ["C01", "made-up"] });
  assert.equal(injected.status, "idle");
  assert.equal(injected.approvedDecision, null);
  assert.equal(injected.data, state.data);
  assert.deepEqual(injected.draft.coolingIds, ["C01"]);
});

test("post-event review never turns synthetic planning assumptions into measured outcomes", () => {
  const active = approve(reviewedState());
  assert.equal(heatReducer(active, { type: "MEASUREMENT_COMPLETE", timestamp: START + 10_000 }), active);
  assert.equal(update(active, { thresholdC: 40 }), active);
  const paused = heatReducer(active, { type: "PAUSE", timestamp: START + 2000 });
  const resumed = heatReducer(paused, { type: "RESUME", timestamp: START + 3000 });
  const measuring = heatReducer(resumed, { type: "CLOSE", timestamp: START + 10_000 });
  assert.equal(paused.status, "paused");
  assert.equal(resumed.status, "active");
  assert.equal(measuring.status, "measuring");
  assert.equal(measuring.approvedDecision.result, undefined);
  assert.equal(heatReducer(measuring, { type: "MEASUREMENT_COMPLETE", timestamp: START + 14_999 }), measuring);
  const completed = heatReducer(measuring, { type: "MEASUREMENT_COMPLETE", timestamp: START + 15_000 });
  assert.equal(completed.status, "measured");
  assert.equal(completed.approvedDecision.result.municipalObserved, false);
  assert.equal(completed.approvedDecision.result.effectivenessMeasured, false);
  assert.match(completed.approvedDecision.result.note, /No real municipal observation/);
  assert.equal(deriveHeatMetrics(completed).exposure.value, null);
  assert.equal(deriveHeatMetrics(completed).cooling.value, null);
  assert.equal(completed.logs.length, 5);
});

test("Civil Protection rejections and reviewed modifications each create immutable decision records", () => {
  for (const type of ["REJECT", "MODIFY"]) {
    const state = reviewedState();
    const action = { type, timestamp: START + 1000, humanReviewed: true, authority: "Civil Protection", operator: "CP Officer #02", reason: "Review outreach arrangements before proceeding", patch: { notifications: false } };
    for (const extra of [{ humanReviewed: false }, { authority: "AI" }, { authority: "Public Health" }, { operator: "" }, { reason: "" }]) assert.equal(heatReducer(state, { ...action, ...extra }), state);
    const next = heatReducer(state, action);
    assert.equal(next.status, "idle");
    assert.equal(next.logs.length, 1);
    assert.equal(next.logs[0].humanDecision, true);
    assert.equal(next.logs[0].useCase, "heat");
    assert.equal(next.overrides.length, 1);
    assert.ok(Object.isFrozen(next.overrides[0]));
    assert.equal(next.overrides[0].decision.approvedOrOverride, type === "REJECT" ? "rejected" : "modified");
    if (type === "MODIFY") assert.equal(next.draft.notifications, false);
  }
});

test("invalid synthetic models cannot be approved or treated as official forecasts", () => {
  for (const mutate of [state => { state.data.temperatureKind = "surface"; }, state => { state.data.zones[0].vulnerable = -10; }, state => { state.data.zones[0].temperatureOffsetC = Infinity; }, state => { state.data.coolingPoints[0].capacity = Infinity; }]) {
    const state = reviewedState(); mutate(state);
    assert.equal(evaluateHeatReadiness(state, "TARGET").ready, false);
    assert.equal(approve(state), state);
  }
});

test("heat reset creates independent drafts without inherited operational authority", () => {
  const active = approve(reviewedState());
  const reset = heatReducer(active, { type: "RESET", timestamp: START + 20_000 });
  assert.equal(reset.status, "idle");
  assert.equal(reset.alertAt, START + 20_000);
  assert.equal(reset.approvedDecision, null);
  assert.deepEqual(reset.logs, []);
  assert.deepEqual(reset.overrides, []);
  assert.equal(reset.draft.thresholdC, null);
  assert.equal(reset.draft.reachMinutes, null);
  assert.notEqual(reset.data.zones, active.data.zones);
  assert.ok(Object.isFrozen(HEAT_ZONES));
  assert.ok(Object.isFrozen(HEAT_COOLING_POINTS));
});

test("heat rejection and modification are included in the shared completeness denominator", () => {
  let state = reviewedState();
  for (const [offset, type] of ["MODIFY", "REJECT"].entries()) state = heatReducer(state, { type, humanReviewed: true, authority: "Civil Protection", operator: "Civil Protection Officer #02", reason: "Reviewed the synthetic preparedness evidence; no municipal action occurs.", timestamp: START + 2000 + offset });
  const records = decisionRecords(null, state);
  assert.equal(records.length, 2);
  assert.equal(calculateK7(records).percent, 100);
  assert.ok(records.every(record => record.result.status === "inconclusive"));
  assert.equal(state.status, "idle");
});
