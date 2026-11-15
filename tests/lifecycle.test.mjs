import test from "node:test";
import assert from "node:assert/strict";
import { initialLifecycle, lifecycleReducer } from "../src/lifecycle.mjs";
import { DEFAULT_PLAN, createPlanReview } from "../src/decision.mjs";
import { evaluateDataReadiness } from "../src/quality.mjs";

const fresh = () => ({ ...initialLifecycle, logs: [] });
const approvalAction = (options = {}) => {
  const plan = {
    duration: options.duration === undefined ? DEFAULT_PLAN.duration : options.duration,
    routeGuidance: options.routeGuidance === undefined ? DEFAULT_PLAN.routeGuidance : options.routeGuidance,
  };
  return {
    type: "APPROVE",
    humanApproved: true,
    time: "10:02:00",
    ...options,
    reviewSnapshot: createPlanReview(plan, {
      qualityKey: evaluateDataReadiness(options.qualityState).key,
      reviewedAt: "2026-11-14T08:01:00.000Z",
    }),
  };
};
const approve = (state, options) => lifecycleReducer(state, approvalAction(options));

test("activation requires an explicit human approval", () => {
  for (const humanApproved of [undefined, false, "true", 1]) {
    const state = fresh();
    assert.equal(
      lifecycleReducer(state, approvalAction({ humanApproved })),
      state,
    );
    assert.equal(state.status, "idle");
    assert.deepEqual(state.logs, []);
  }
  const activated = approve(fresh());
  assert.equal(activated.status, "active");
  assert.equal(activated.logs.length, 1);
  assert.equal(activated.logs[0].operator, "Control Room Operator #02");
  assert.equal(activated.logs[0].time, "10:02:00");
});

test("an unapproved intervention cannot be paused, handed over, closed, or measured", () => {
  const state = fresh();
  for (const action of [
    { type: "PAUSE" },
    { type: "RESUME" },
    { type: "CLOSE" },
    { type: "HANDOVER", operator: "Control Room Operator #03" },
    { type: "MEASUREMENT_COMPLETE" },
  ])
    assert.equal(lifecycleReducer(state, action), state);
});

test("outcome measurement is gated by closing an approved intervention", () => {
  const active = approve(fresh());
  assert.equal(
    lifecycleReducer(active, { type: "MEASUREMENT_COMPLETE" }),
    active,
  );
  const closing = lifecycleReducer(active, { type: "CLOSE" });
  assert.equal(closing.status, "measuring");
  assert.notEqual(closing.status, "measured");
  assert.match(closing.logs.at(-1).event, /measurement started/);
  const measured = lifecycleReducer(closing, { type: "MEASUREMENT_COMPLETE" });
  assert.equal(measured.status, "measured");
  assert.equal(measured.logs.length, 3);
  assert.match(measured.logs.at(-1).event, /outcomes available/);
});

test("pause and resume preserve approval and create an accountability trail", () => {
  const active = approve(fresh());
  const paused = lifecycleReducer(active, { type: "PAUSE" });
  assert.equal(paused.status, "paused");
  assert.equal(paused.operator, active.operator);
  assert.equal(paused.remaining, active.remaining);
  assert.equal(lifecycleReducer(paused, { type: "PAUSE" }), paused);
  const resumed = lifecycleReducer(paused, { type: "RESUME" });
  assert.equal(resumed.status, "active");
  assert.equal(resumed.logs.length, 3);
  assert.equal(lifecycleReducer(resumed, { type: "RESUME" }), resumed);
});

test("a paused approved intervention can be closed, but results still await measurement", () => {
  const paused = lifecycleReducer(approve(fresh()), { type: "PAUSE" });
  const closing = lifecycleReducer(paused, { type: "CLOSE" });
  assert.equal(closing.status, "measuring");
  assert.equal(lifecycleReducer(closing, { type: "CLOSE" }), closing);
});

test("handover transfers the accountable operator only after confirmation", () => {
  const active = approve(fresh());
  assert.equal(lifecycleReducer(active, { type: "HANDOVER" }), active);
  const handed = lifecycleReducer(active, {
    type: "HANDOVER",
    operator: "Control Room Operator #03",
    time: "10:04:00",
  });
  assert.equal(handed.status, "active");
  assert.equal(handed.operator, "Control Room Operator #03");
  assert.equal(handed.logs[0].operator, "Control Room Operator #02");
  assert.equal(handed.logs.at(-1).operator, "Control Room Operator #03");
  assert.equal(handed.logs.at(-1).time, "10:04:00");
  const paused = lifecycleReducer(handed, { type: "PAUSE" });
  const handedWhilePaused = lifecycleReducer(paused, {
    type: "HANDOVER",
    operator: "Control Room Operator #04",
  });
  assert.equal(handedWhilePaused.status, "paused");
  assert.equal(handedWhilePaused.operator, "Control Room Operator #04");
});

test("countdown advances only while an intervention is active", () => {
  const active = approve(fresh());
  const ticked = lifecycleReducer(active, { type: "TICK" });
  assert.equal(ticked.remaining, active.remaining - 1);
  assert.equal(ticked.logs, active.logs);
  for (const status of ["idle", "paused", "measuring", "measured"]) {
    const state = { ...active, status };
    assert.equal(lifecycleReducer(state, { type: "TICK" }), state);
  }
  assert.equal(
    lifecycleReducer({ ...active, remaining: 0 }, { type: "TICK" }).remaining,
    0,
  );
});

test("approval cannot overwrite an existing or completed intervention", () => {
  for (const status of ["active", "paused", "measuring", "measured"]) {
    const state = { ...approve(fresh()), status };
    assert.equal(approve(state), state);
  }
});

test("completed measurement cannot repeat or restart operational controls", () => {
  const closing = lifecycleReducer(approve(fresh()), { type: "CLOSE" });
  const measured = lifecycleReducer(closing, { type: "MEASUREMENT_COMPLETE" });
  for (const action of [
    { type: "MEASUREMENT_COMPLETE" },
    { type: "PAUSE" },
    { type: "RESUME" },
    { type: "CLOSE" },
    { type: "HANDOVER", operator: "Control Room Operator #03" },
  ])
    assert.equal(lifecycleReducer(measured, action), measured);
});

test("reset returns a clean demonstration without reusing log arrays", () => {
  const activated = approve(fresh());
  const firstReset = lifecycleReducer(activated, { type: "RESET" });
  const secondReset = lifecycleReducer(firstReset, { type: "RESET" });
  assert.deepEqual(firstReset, initialLifecycle);
  assert.notEqual(firstReset.logs, initialLifecycle.logs);
  assert.notEqual(firstReset.logs, secondReset.logs);
  assert.equal(activated.logs.length, 1);
  assert.equal(activated.status, "active");
});

test("reducer leaves prior snapshots untouched", () => {
  const state = fresh();
  Object.freeze(state.logs);
  Object.freeze(state);
  const activated = approve(state);
  assert.equal(state.status, "idle");
  assert.deepEqual(state.logs, []);
  assert.notEqual(activated, state);
  assert.notEqual(activated.logs, state.logs);
});

test("unknown actions have no operational effect", () => {
  const state = fresh();
  assert.equal(lifecycleReducer(state, { type: "AI_EXECUTE" }), state);
  assert.equal(lifecycleReducer(state, { type: "DEMO_NEXT" }), state);
});

test("approved modifications persist with the activation and its audit record", () => {
  const options = {
    type: "APPROVE",
    humanApproved: true,
    duration: 30,
    routeGuidance: false,
    note: "Keep pedestrian access unchanged; review after thirty minutes.",
    time: "10:03:18",
  };
  const activated = lifecycleReducer(fresh(), approvalAction(options));
  assert.equal(activated.status, "active");
  assert.equal(activated.duration, 30);
  assert.equal(activated.remaining, 30 * 60);
  assert.equal(activated.routeGuidance, false);
  assert.equal(activated.note, options.note);
  assert.match(activated.logs[0].detail, /Operating window: 30 minutes/);
  assert.match(activated.logs[0].detail, /Route guidance: excluded/);
  assert.ok(activated.logs[0].detail.includes(options.note));
  assert.equal(activated.logs[0].time, options.time);
});

test("a longer approved window and included route guidance persist after measurement", () => {
  const activated = lifecycleReducer(fresh(), approvalAction({
    type: "APPROVE", humanApproved: true, duration: 90,
    routeGuidance: true, note: "Coordinate with Environment.",
  }));
  assert.equal(activated.duration, 90);
  assert.equal(activated.remaining, 90 * 60);
  assert.equal(activated.routeGuidance, true);
  assert.match(activated.logs[0].detail, /Operating window: 90 minutes/);
  assert.match(activated.logs[0].detail, /Route guidance: included/);
  const paused = lifecycleReducer(activated, { type: "PAUSE" });
  const closed = lifecycleReducer(paused, { type: "CLOSE" });
  const measured = lifecycleReducer(closed, { type: "MEASUREMENT_COMPLETE" });
  assert.equal(measured.duration, activated.duration);
  assert.equal(measured.routeGuidance, activated.routeGuidance);
  assert.equal(measured.note, activated.note);
  assert.deepEqual(measured.logs[0], activated.logs[0]);
});

test("unapproved modifications cannot change operational settings", () => {
  const state = fresh();
  assert.equal(lifecycleReducer(state, {
    type: "APPROVE", duration: 90, routeGuidance: false,
    note: "A proposed change is not approval.",
  }), state);
  assert.equal(state.duration, 60);
  assert.equal(state.routeGuidance, true);
  assert.equal(state.note, "");
});

test("the operating window pauses at expiry and waits for human review", () => {
  const active = { ...approve(fresh()), remaining: 1 };
  const expired = lifecycleReducer(active, { type: "TICK", time: "11:02:00" });
  assert.equal(expired.remaining, 0);
  assert.equal(expired.status, "paused");
  assert.equal(expired.operator, active.operator);
  assert.equal(expired.logs.length, active.logs.length + 1);
  assert.match(expired.logs.at(-1).event, /Operating window elapsed/);
  assert.match(expired.logs.at(-1).event, /human review/);
  assert.equal(expired.logs.at(-1).time, "11:02:00");
  assert.equal(lifecycleReducer(expired, { type: "TICK" }), expired);
  assert.equal(lifecycleReducer(expired, { type: "MEASUREMENT_COMPLETE" }), expired);
});

test("an already elapsed active window also pauses without a negative countdown", () => {
  const active = { ...approve(fresh()), remaining: 0 };
  const expired = lifecycleReducer(active, { type: "TICK" });
  assert.equal(expired.remaining, 0);
  assert.equal(expired.status, "paused");
  assert.equal(expired.logs.length, 2);
});

test("the receiving operator and handover note remain in the decision trail", () => {
  const state = approve(fresh());
  const handed = lifecycleReducer(state, {
    type: "HANDOVER", operator: "Control Room Operator #04",
    note: "Watch the NO₂ escalation threshold.",
  });
  assert.equal(handed.operator, "Control Room Operator #04");
  assert.equal(handed.logs.at(-1).operator, "Control Room Operator #04");
  assert.equal(handed.logs.at(-1).detail, "Watch the NO₂ escalation threshold.");
  assert.equal(handed.logs[0].operator, "Control Room Operator #02");
});

test("human approval alone cannot activate a plan without its reviewed snapshot", () => {
  const state = fresh();
  for (const reviewSnapshot of [undefined, null, {}, { version: 1 }]) {
    assert.equal(lifecycleReducer(state, {
      type: "APPROVE", humanApproved: true, reviewSnapshot,
    }), state);
  }
  assert.equal(state.approvedDecision, null);
  assert.deepEqual(state.logs, []);
});

test("an edit to duration or route guidance invalidates the previous approval review", () => {
  const state = fresh();
  const original = approvalAction();
  assert.equal(lifecycleReducer(state, { ...original, duration: 30 }), state);
  assert.equal(lifecycleReducer(state, { ...original, routeGuidance: false }), state);
  assert.equal(lifecycleReducer(state, { ...original, duration: "60" }), state);
  assert.equal(lifecycleReducer(state, { ...original, routeGuidance: "false" }), state);
  assert.equal(lifecycleReducer(state, { ...original, note: "A context note does not change the plan." }).status, "active");
});

test("explicit review permits a modified plan without claiming reference benefits for it", () => {
  const options = { duration: 30, routeGuidance: false };
  const action = approvalAction(options);
  action.reviewSnapshot = createPlanReview(options, {
    version: 4,
    qualityKey: evaluateDataReadiness().key,
    reviewedAt: "2026-11-14T08:04:00.000Z",
  });
  const active = lifecycleReducer(fresh(), action);
  assert.equal(active.status, "active");
  assert.equal(active.approvedDecision.snapshot.version, 4);
  assert.equal(active.approvedDecision.snapshot.forecast.status, "unestimated");
  assert.equal(active.approvedDecision.snapshot.forecast.score, null);
  assert.equal(active.approvedDecision.snapshot.forecast.values, null);
  assert.equal(active.approvedDecision.snapshot.forecast.reference.score, 88);
  assert.match(active.logs[0].event, /^Approved & activated · Scenario B$/);
  assert.match(active.logs[0].detail, /Review v4/);
  assert.match(active.logs[0].detail, /numerical outcome not estimated/);
  assert.equal(active.logs[0].reviewVersion, 4);
  assert.equal(active.logs[0].forecastScope, "unestimated");
});

test("approval stores an immutable independent decision record and reset removes it", () => {
  const action = approvalAction({ timestamp: Date.parse("2026-11-14T08:02:00.000Z") });
  const active = lifecycleReducer(fresh(), action);
  const approved = active.approvedDecision;
  assert.equal(approved.approvedAt, "2026-11-14T08:02:00.000Z");
  assert.equal(approved.operator, "Control Room Operator #02");
  assert.notEqual(approved.snapshot, action.reviewSnapshot);
  assert.notEqual(approved.snapshot.plan, action.reviewSnapshot.plan);
  assert.equal(Object.isFrozen(approved), true);
  assert.equal(Object.isFrozen(approved.snapshot.forecast.reference.values), true);
  action.reviewSnapshot.plan.duration = 90;
  action.reviewSnapshot.forecast.reference.values.congestion = 10;
  assert.equal(approved.snapshot.plan.duration, 60);
  assert.equal(approved.snapshot.forecast.reference.values.congestion, 66);
  assert.throws(() => { approved.snapshot.plan.duration = 90; }, TypeError);
  const handed = lifecycleReducer(active, { type: "HANDOVER", operator: "Control Room Operator #03" });
  assert.equal(handed.approvedDecision, approved);
  assert.equal(handed.approvedDecision.operator, "Control Room Operator #02");
  assert.equal(lifecycleReducer(handed, { type: "RESET" }).approvedDecision, null);
});

test("altered forecast claims are rejected by the reducer rather than relying on UI guards", () => {
  const state = fresh();
  const action = approvalAction({ duration: 90, routeGuidance: false });
  action.reviewSnapshot.forecast.score = 99;
  action.reviewSnapshot.forecast.values = { congestion: 40, pm: 10 };
  assert.equal(lifecycleReducer(state, action), state);
});

test("missing required evidence blocks activation even with a fresh review and explicit approval", () => {
  const required = evaluateDataReadiness().checks.filter((check) => check.required);
  assert.ok(required.length > 0);
  for (const source of required) {
    const qualityState = { version: 1, overrides: { [source.id]: "offline" } };
    assert.equal(evaluateDataReadiness(qualityState).canApprove, false);
    const state = fresh();
    assert.equal(lifecycleReducer(state, { ...approvalAction(), qualityState }), state);
    assert.equal(lifecycleReducer(state, approvalAction({ qualityState })), state);
    assert.equal(state.approvedDecision, null);
  }
});

test("a changed advisory-source condition invalidates old reviews but can be explicitly reviewed again", () => {
  const advisory = evaluateDataReadiness().checks.find((check) => !check.required && check.status !== "healthy");
  assert.ok(advisory);
  const qualityState = { version: 1, overrides: { [advisory.id]: "healthy" } };
  const readiness = evaluateDataReadiness(qualityState);
  assert.equal(readiness.canApprove, true);
  assert.notEqual(readiness.key, evaluateDataReadiness().key);
  const state = fresh();
  assert.equal(lifecycleReducer(state, { ...approvalAction(), qualityState }), state);
  const renewed = lifecycleReducer(state, approvalAction({ qualityState }));
  assert.equal(renewed.status, "active");
  assert.equal(renewed.approvedDecision.snapshot.qualityKey, readiness.key);
});
