import test from "node:test";
import assert from "node:assert/strict";
import { initialLifecycle, lifecycleReducer } from "../src/lifecycle.mjs";

const fresh = () => ({ ...initialLifecycle, logs: [] });
const approve = (state) =>
  lifecycleReducer(state, {
    type: "APPROVE",
    humanApproved: true,
    time: "10:02:00",
  });

test("activation requires an explicit human approval", () => {
  for (const humanApproved of [undefined, false, "true", 1]) {
    const state = fresh();
    assert.equal(
      lifecycleReducer(state, { type: "APPROVE", humanApproved }),
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
  const activated = lifecycleReducer(fresh(), options);
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
  const activated = lifecycleReducer(fresh(), {
    type: "APPROVE", humanApproved: true, duration: 90,
    routeGuidance: true, note: "Coordinate with Environment.",
  });
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
