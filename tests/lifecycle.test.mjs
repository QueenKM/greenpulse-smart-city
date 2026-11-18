import test from "node:test";
import assert from "node:assert/strict";
import { initialLifecycle, lifecycleReducer } from "../src/lifecycle.mjs";
import { DEFAULT_PLAN, createPlanReview, evaluateTrafficContext } from "../src/decision.mjs";
import { createTrafficUseCaseContext } from "../src/use-case-spec.mjs";
import { evaluateDataReadiness } from "../src/quality.mjs";
import { decisionRecords } from "../src/document-workflow.mjs";
import { calculateK7 } from "../src/kpi-framework.mjs";

const at = Date.parse("2026-11-14T08:02:00.000Z");
const fresh = () => ({ ...initialLifecycle, logs: [], overrides: [], modifications: [] });
const readyContext = (patch = {}) => ({
  ...createTrafficUseCaseContext(),
  checks: { pedestrian: true, bus: true, residential: true, heritage: true, rollback: true },
  thresholdAgreed: true,
  aggregateReviewConfirmed: true,
  parkingOccupancy: 93,
  ...patch,
});
const approvalAction = (options = {}) => {
  const plan = {
    action: options.action || "signals",
    duration: options.duration === undefined ? DEFAULT_PLAN.duration : options.duration,
    routeGuidance: options.routeGuidance === undefined ? DEFAULT_PLAN.routeGuidance : options.routeGuidance,
  };
  const trafficContext = options.trafficContext || readyContext({ action: plan.action });
  const context = evaluateTrafficContext(trafficContext, plan.action);
  return {
    type: "APPROVE", humanApproved: true, maturity: "TARGET", timestamp: at,
    ...plan, trafficContext, authority: context.authority,
    authorityConfirmed: true, policeReviewed: plan.action === "ztl",
    legalProcessConfirmed: plan.action === "ztl", privacyReviewed: plan.action === "ztl",
    ...options,
    reviewSnapshot: createPlanReview(plan, {
      qualityKey: evaluateDataReadiness(options.qualityState, plan.action).key,
      contextKey: context.key,
      reviewedAt: "2026-11-14T08:01:00.000Z",
    }),
  };
};
const approve = (options) => lifecycleReducer(fresh(), approvalAction(options));
const execution = (action = "signals", options = {}) => ({ type: "EXECUTE", humanExecuted: true, operator: "Authorised Operator #02", operatorRole: action === "ztl" ? "Municipal Police" : "Authorised traffic-signal operator", legalProcessConfirmed: action === "ztl", timestamp: at + 1000, ...options });
const activate = (options = {}) => lifecycleReducer(approve(options), execution(options.action));
const close = state => lifecycleReducer(state, { type: "CLOSE", timestamp: at + 2000 });
const complete = state => lifecycleReducer(state, { type: "MEASUREMENT_COMPLETE", timestamp: at + 7000 });

test("Mobility approval is a recorded human decision and does not execute traffic", () => {
  const state = approve();
  assert.equal(state.status, "approved");
  assert.equal(state.approvedDecision.authority, "Mobility Department");
  assert.equal(state.approvedDecision.execution, undefined);
  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0].humanDecision, true);
  assert.equal(state.logs[0].useCase, "traffic");
  assert.equal(state.logs[0].timestamp, at);
  assert.match(state.logs[0].detail, /Approved by Mobility Department/);
  assert.match(state.logs[0].detail, /Authorised operator execution still required/);
  assert.equal(lifecycleReducer(state, { type: "TICK" }), state);
});

test("traffic cannot execute without Mobility approval and separate authorised operator execution", () => {
  const state = fresh();
  assert.equal(lifecycleReducer(state, execution()), state);
  for (const humanApproved of [undefined, false, "true", 1]) assert.equal(lifecycleReducer(state, approvalAction({ humanApproved })), state);
  for (const authority of ["Control Room Operator", "Municipal Police", "Authorised traffic-signal operator", ""]) assert.equal(lifecycleReducer(state, approvalAction({ authority })), state);
  for (const authorityConfirmed of [false, undefined, "true"]) assert.equal(lifecycleReducer(state, approvalAction({ authorityConfirmed })), state);
  const approved = approve();
  for (const patch of [{ humanExecuted: false }, { humanExecuted: "true" }, { operatorRole: "AI" }, { operatorRole: "Mobility Department" }, { operator: "" }, { operator: "x" }]) assert.equal(lifecycleReducer(approved, execution("signals", patch)), approved);
  const active = lifecycleReducer(approved, execution());
  assert.equal(active.status, "active");
  assert.equal(active.logs.length, 2);
  assert.equal(active.approvedDecision.execution.role, "Authorised traffic-signal operator");
  assert.equal(active.logs[1].humanDecision, false);
  assert.match(active.logs[1].detail, /No municipal controller/);
});

test("guidance also requires Mobility approval and never delegated operator self-approval", () => {
  const state = fresh();
  assert.equal(lifecycleReducer(state, approvalAction({ action: "guidance", authority: "Control Room Operator" })), state);
  assert.equal(approve({ action: "guidance" }).status, "approved");
  assert.equal(activate({ action: "guidance" }).status, "active");
});

test("ZTL changes cannot be automatic and require Police, legal and privacy review", () => {
  const state = fresh();
  const action = approvalAction({ action: "ztl" });
  for (const patch of [{ authority: "Mobility Department" }, { policeReviewed: false }, { legalProcessConfirmed: false }, { privacyReviewed: false }]) assert.equal(lifecycleReducer(state, { ...action, ...patch }), state);
  const approved = lifecycleReducer(state, action);
  assert.equal(approved.status, "approved");
  assert.equal(approved.approvedDecision.authority, "Municipal Police");
  assert.equal(approved.logs[0].useCase, "ztl");
  assert.equal(lifecycleReducer(approved, { type: "AI_EXECUTE" }), approved);
  assert.equal(lifecycleReducer(approved, execution("ztl", { legalProcessConfirmed: false })), approved);
  assert.equal(lifecycleReducer(approved, execution("signals")), approved);
  const active = lifecycleReducer(approved, execution("ztl"));
  assert.equal(active.status, "active");
  assert.match(active.logs.at(-1).event, /Human legal-process execution recorded/);
  assert.match(active.logs.at(-1).detail, /No municipal controller, access gate or enforcement system is connected/);
});

test("ZTL aggregate review does not depend on an invented AQ network", () => {
  const qualityState = { version: 1, overrides: { "AQ-04": "offline", weather: "offline" } };
  assert.equal(approve({ action: "ztl", qualityState }).status, "approved");
  const state = fresh();
  assert.equal(lifecycleReducer(state, approvalAction({ action: "ztl", qualityState: { overrides: { ztl: "offline" } } })), state);
  assert.equal(lifecycleReducer(state, approvalAction({ action: "ztl", trafficContext: readyContext({ aggregateReviewConfirmed: false }) })), state);
});

test("unapproved and unexecuted plans cannot be paused, handed over, closed or measured", () => {
  for (const state of [fresh(), approve()]) for (const action of [{ type: "PAUSE" }, { type: "RESUME" }, { type: "CLOSE" }, { type: "HANDOVER", operator: "Operator #03" }, { type: "MEASUREMENT_COMPLETE" }]) assert.equal(lifecycleReducer(state, action), state);
});

test("close starts an outcome window and completion never invents measured observations", () => {
  const active = activate();
  assert.equal(lifecycleReducer(active, { type: "MEASUREMENT_COMPLETE" }), active);
  const closing = close(active);
  assert.equal(closing.status, "measuring");
  assert.equal(lifecycleReducer(closing, { type: "MEASUREMENT_COMPLETE", timestamp: at + 6999 }), closing);
  const measured = complete(closing);
  assert.equal(measured.status, "measured");
  assert.match(measured.logs.at(-1).event, /No data until observations are validated/);
  assert.equal(measured.approvedDecision.result, undefined);
  assert.equal(lifecycleReducer(measured, { type: "MEASUREMENT_COMPLETE" }), measured);
});

test("pause, resume and handover retain approval and append accountable records", () => {
  const active = activate();
  const paused = lifecycleReducer(active, { type: "PAUSE" });
  assert.equal(paused.status, "paused");
  assert.equal(paused.remaining, active.remaining);
  assert.equal(lifecycleReducer(paused, { type: "PAUSE" }), paused);
  const handed = lifecycleReducer(paused, { type: "HANDOVER", operator: "Operator #03", note: "Review queue counts." });
  assert.equal(handed.operator, "Operator #03");
  assert.equal(handed.approvedDecision, active.approvedDecision);
  assert.equal(handed.logs.at(-1).detail, "Review queue counts.");
  assert.equal(handed.logs[0].operator, "Control Room Operator #02");
  assert.equal(lifecycleReducer(handed, { type: "RESUME" }).status, "active");
  assert.equal(close(handed).status, "measuring");
});

test("countdown runs only while active and pauses on expiry for human review", () => {
  const active = activate();
  const ticked = lifecycleReducer(active, { type: "TICK" });
  assert.equal(ticked.remaining, active.remaining - 1);
  assert.equal(ticked.logs, active.logs);
  for (const status of ["idle", "approved", "paused", "measuring", "measured"]) {
    const state = { ...active, status };
    assert.equal(lifecycleReducer(state, { type: "TICK" }), state);
  }
  for (const remaining of [0, 1]) {
    const expired = lifecycleReducer({ ...active, remaining }, { type: "TICK" });
    assert.equal(expired.remaining, 0);
    assert.equal(expired.status, "paused");
    assert.match(expired.logs.at(-1).event, /human review/);
    assert.equal(lifecycleReducer(expired, { type: "RESUME" }), expired);
  }
});

test("existing approvals and completed outcomes cannot be overwritten or restarted", () => {
  for (const status of ["approved", "active", "paused", "measuring", "measured"]) {
    const state = { ...approve(), status };
    assert.equal(lifecycleReducer(state, approvalAction()), state);
    assert.equal(lifecycleReducer(state, { type: "AI_EXECUTE" }), state);
  }
  const measured = complete(close(activate()));
  for (const type of ["PAUSE", "RESUME", "CLOSE", "HANDOVER", "EXECUTE"]) assert.equal(lifecycleReducer(measured, { ...execution(), type }), measured);
});

test("human modifications and rejections always create records without execution", () => {
  for (const type of ["MODIFY", "OVERRIDE"]) {
    const state = fresh();
    assert.equal(lifecycleReducer(state, { type, reason: "Safety review" }), state);
    assert.equal(lifecycleReducer(state, { type, humanReviewed: true, reason: "" }), state);
    const next = lifecycleReducer(state, { type, humanReviewed: true, reason: "Retain pedestrian access; request revised timing.", timestamp: at, action: "ztl" });
    assert.equal(next.status, "idle");
    assert.equal(next.approvedDecision, null);
    assert.equal(next.logs.length, 1);
    assert.equal(next.logs[0].humanDecision, true);
    assert.equal(next.logs[0].useCase, "ztl");
    assert.equal(next[type === "MODIFY" ? "modifications" : "overrides"].length, 1);
    assert.equal(calculateK7(decisionRecords(next, null)).percent, 100);
  }
});

test("modified duration and guidance persist, but never inherit reference benefits", () => {
  const state = approve({ duration: 30, routeGuidance: false, note: "Thirty-minute trial only." });
  assert.equal(state.status, "approved");
  assert.equal(state.remaining, 1800);
  assert.equal(state.routeGuidance, false);
  assert.match(state.logs[0].detail, /Operating window: 30 minutes/);
  assert.match(state.logs[0].detail, /Route guidance: excluded/);
  assert.match(state.logs[0].detail, /Thirty-minute trial only/);
  assert.equal(state.approvedDecision.snapshot.forecast.status, "unestimated");
  assert.equal(state.approvedDecision.snapshot.forecast.values, null);
  const measured = complete(close(lifecycleReducer(state, execution())));
  assert.equal(measured.duration, 30);
  assert.equal(measured.routeGuidance, false);
  assert.equal(measured.note, state.note);
});

test("review integrity rejects edited timing, context, forecast or required-source outages", () => {
  const state = fresh();
  const original = approvalAction();
  for (const patch of [{ duration: 30 }, { routeGuidance: false }, { duration: "60" }, { reviewSnapshot: null }, { trafficContext: undefined }, { authorityConfirmed: false }]) assert.equal(lifecycleReducer(state, { ...original, ...patch }), state);
  for (const key of ["pedestrian", "bus", "residential", "heritage", "rollback"]) assert.equal(lifecycleReducer(state, { ...original, trafficContext: readyContext({ checks: { ...readyContext().checks, [key]: false } }) }), state);
  for (const key of ["residents", "emergency", "disabled", "deliveries", "transit"]) assert.equal(lifecycleReducer(state, { ...original, trafficContext: readyContext({ protectedAccess: { ...readyContext().protectedAccess, [key]: false } }) }), state);
  const forged = approvalAction(); forged.reviewSnapshot.forecast.score = 100;
  assert.equal(lifecycleReducer(state, forged), state);
  const qualityState = { overrides: { traffic: "offline" } };
  assert.equal(lifecycleReducer(state, { ...original, qualityState }), state);
  assert.equal(lifecycleReducer(state, approvalAction({ qualityState })), state);
  assert.equal(lifecycleReducer(state, { ...original, note: "Context-only note" }).status, "approved");
});

test("source changes invalidate a prior snapshot and need a fresh review", () => {
  const original = approvalAction();
  const qualityState = { overrides: { visitor: "healthy" } };
  const state = fresh();
  assert.equal(lifecycleReducer(state, { ...original, qualityState }), state);
  assert.equal(lifecycleReducer(state, approvalAction({ qualityState })).status, "approved");
});

test("CURRENT inventory cannot approve a pilot; MVP and TARGET remain synthetic role exercises", () => {
  const state = fresh();
  for (const maturity of ["CURRENT", null, "unknown"]) assert.equal(lifecycleReducer(state, approvalAction({ maturity })), state);
  for (const maturity of ["MVP", "TARGET"]) assert.equal(approve({ maturity }).status, "approved");
});

test("approval and execution snapshots are immutable and preserve distinct actors", () => {
  const action = approvalAction();
  const approved = lifecycleReducer(fresh(), action);
  assert.equal(Object.isFrozen(approved.approvedDecision), true);
  action.reviewSnapshot.plan.duration = 90;
  assert.equal(approved.approvedDecision.snapshot.plan.duration, 60);
  assert.throws(() => { approved.approvedDecision.snapshot.plan.duration = 90; }, TypeError);
  const active = lifecycleReducer(approved, execution());
  assert.equal(approved.approvedDecision.execution, undefined);
  assert.equal(active.approvedDecision.authority, "Mobility Department");
  assert.equal(active.approvedDecision.operator, "Control Room Operator #02");
  assert.equal(active.approvedDecision.execution.operator, "Authorised Operator #02");
  assert.equal(Object.isFrozen(active.approvedDecision.execution), true);
});

test("reset and reducer operations do not mutate previous state or reuse log arrays", () => {
  const state = fresh(); Object.freeze(state.logs); Object.freeze(state);
  const approved = lifecycleReducer(state, approvalAction());
  assert.equal(state.status, "idle"); assert.deepEqual(state.logs, []);
  const reset = lifecycleReducer(approved, { type: "RESET" });
  assert.deepEqual(reset, initialLifecycle);
  assert.notEqual(reset.logs, initialLifecycle.logs);
  assert.notEqual(reset.overrides, initialLifecycle.overrides);
  assert.notEqual(reset.modifications, initialLifecycle.modifications);
  assert.equal(approved.logs.length, 1);
});

test("invalid timestamps and unknown automated actions have no effect", () => {
  const state = fresh();
  for (const timestamp of [NaN, Infinity, "2026-11-14", null]) assert.equal(lifecycleReducer(state, { type: "OVERRIDE", humanReviewed: true, reason: "Review", timestamp }), state);
  for (const type of ["AI_EXECUTE", "DEMO_NEXT", "UNKNOWN"]) assert.equal(lifecycleReducer(state, { type }), state);
});

test("a pending decision is incomplete until outcome evidence is explicitly recorded", () => {
  const state = approve();
  const records = decisionRecords(state, null);
  assert.equal(records[0].decision.approvedOrOverride, "approved");
  assert.equal(records[0].result.status, "pending");
  assert.equal(calculateK7(records).complete, 0);
  const completed = decisionRecords(complete(close(activate())), null);
  assert.equal(completed[0].result.status, "inconclusive");
  assert.equal(calculateK7(completed).percent, 100);
  assert.match(completed[0].result.summary, /No municipal outcome or numerical observation dataset is inferred/);
});
