import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PLAN, MODEL_VERSION, planFingerprint, createPlanReview, isReviewCurrent, evaluateTrafficContext } from "../src/decision.mjs";
import { createTrafficUseCaseContext } from "../src/use-case-spec.mjs";

const readiness = { canApprove: true, status: "ready", key: "document-policy:signals:healthy" };
const reviewedAt = "2026-11-14T08:01:00.000Z";
const readyContext = (patch = {}) => ({
  ...createTrafficUseCaseContext(),
  checks: { pedestrian: true, bus: true, residential: true, heritage: true, rollback: true },
  thresholdAgreed: true,
  aggregateReviewConfirmed: true,
  ...patch,
});
const context = readyContext();
const review = (plan = DEFAULT_PLAN, options = {}, basis = context) => createPlanReview(plan, {
  version: 1, qualityKey: readiness.key, contextKey: evaluateTrafficContext(basis, plan.action || "signals").key, reviewedAt, ...options,
});
const current = (snapshot, plan = DEFAULT_PLAN, evidence = readiness, basis = context) => isReviewCurrent(snapshot, plan, evidence, basis);
const copy = (value) => JSON.parse(JSON.stringify(value));

test("a plan fingerprint includes action, duration and guidance but excludes operator notes", () => {
  assert.equal(planFingerprint(DEFAULT_PLAN), planFingerprint({ ...DEFAULT_PLAN, note: "Preserve pedestrian access." }));
  const keys = ["signals", "guidance", "ztl"].flatMap((action) => [30, 60, 90].flatMap((duration) => [true, false].map((routeGuidance) => planFingerprint({ action, duration, routeGuidance }))));
  assert.equal(new Set(keys).size, 18);
  for (const plan of [null, undefined, [], {}, { duration: 0, routeGuidance: true }, { duration: "60", routeGuidance: true }, { duration: 60, routeGuidance: "true" }, { ...DEFAULT_PLAN, action: "policy" }]) assert.equal(planFingerprint(plan), null);
});

test("the unchanged reviewed signal plan retains the supplied eighteen-to-sixteen-point-two-minute reference", () => {
  const snapshot = review();
  assert.equal(snapshot.forecast.status, "reference");
  assert.equal(snapshot.forecast.score, 88);
  assert.deepEqual(snapshot.forecast.values, { congestion: 66, pm: 29, travel: 16.2, speed: 23 });
  assert.deepEqual(snapshot.forecast.reference.k1, { baselineMinutes: 18, predictedMinutes: 16.2, predictedChangePercent: -10, unit: "min/vehicle", source: "CURRENT FINAL presentation · illustrative KPI calculation" });
  assert.match(snapshot.forecast.label, /MODELLED illustration/);
  assert.equal(snapshot.modelVersion, MODEL_VERSION);
  assert.notEqual(snapshot.forecast.values, snapshot.forecast.reference.values);
});

test("modified timing, guidance and other action types do not inherit reference benefits", () => {
  for (const action of ["signals", "guidance", "ztl"]) for (const duration of [30, 60, 90]) for (const routeGuidance of [true, false]) {
    if (action === "signals" && duration === 60 && routeGuidance) continue;
    const plan = { action, duration, routeGuidance };
    const snapshot = review(plan);
    assert.equal(snapshot.forecast.status, "unestimated");
    assert.equal(snapshot.forecast.score, null);
    assert.equal(snapshot.forecast.values, null);
    assert.equal(snapshot.forecast.reference.k1.predictedMinutes, 16.2);
    assert.equal(current(snapshot, plan), true);
  }
});

test("event and roadworks contexts remove the reference numerical forecast rather than recalculating it", () => {
  for (const basis of [readyContext({ eventLoad: "event" }), readyContext({ roadworks: true })]) {
    const snapshot = review(DEFAULT_PLAN, {}, basis);
    assert.equal(snapshot.forecast.status, "unestimated");
    assert.equal(snapshot.forecast.values, null);
    assert.equal(current(snapshot, DEFAULT_PLAN, readiness, basis), true);
    assert.equal(current(snapshot), false);
  }
});

test("reviews are deterministic serializable snapshots with separate model and review versions", () => {
  const snapshot = review(DEFAULT_PLAN, { version: 3 });
  assert.deepEqual(copy(snapshot), snapshot);
  assert.equal(snapshot.reviewedAt, reviewedAt);
  assert.equal(snapshot.id, review(DEFAULT_PLAN, { version: 3 }).id);
  assert.notEqual(snapshot.id, review(DEFAULT_PLAN, { version: 4 }).id);
  assert.match(snapshot.id, /H03-REVIEW-v3-/);
  assert.equal(current(copy(snapshot)), true);
});

test("operating choices, evidence, safety checks and protected-access changes invalidate a prior review", () => {
  const snapshot = review();
  assert.equal(current(snapshot), true);
  assert.equal(current(snapshot, { ...DEFAULT_PLAN, note: "A context note." }), true);
  assert.equal(current(snapshot, { ...DEFAULT_PLAN, duration: 30 }), false);
  assert.equal(current(snapshot, { ...DEFAULT_PLAN, routeGuidance: false }), false);
  assert.equal(current(snapshot, DEFAULT_PLAN, { ...readiness, key: "changed" }), false);
  assert.equal(current(snapshot, DEFAULT_PLAN, { ...readiness, canApprove: false }), false);
  assert.equal(current(snapshot, DEFAULT_PLAN, { ...readiness, status: "blocked" }), false);
  assert.equal(isReviewCurrent(snapshot, DEFAULT_PLAN, readiness), false);
  for (const check of ["pedestrian", "bus", "residential", "heritage", "rollback"]) assert.equal(current(snapshot, DEFAULT_PLAN, readiness, readyContext({ checks: { ...context.checks, [check]: false } })), false);
  for (const access of ["residents", "emergency", "disabled", "deliveries", "transit"]) assert.equal(current(snapshot, DEFAULT_PLAN, readiness, readyContext({ protectedAccess: { ...context.protectedAccess, [access]: false } })), false);
  assert.equal(current(snapshot, DEFAULT_PLAN, readiness, readyContext({ thresholdAgreed: false })), false);
});

test("traffic authorities and evidence confirmations are action-specific and unavailable context fails closed", () => {
  assert.equal(evaluateTrafficContext(context, "signals").authority, "Mobility Department");
  assert.equal(evaluateTrafficContext(context, "guidance").authority, "Mobility Department");
  assert.equal(evaluateTrafficContext(context, "ztl").authority, "Municipal Police");
  assert.equal(evaluateTrafficContext(context, "ztl").requiresPolice, true);
  assert.equal(evaluateTrafficContext(readyContext({ aggregateReviewConfirmed: false }), "ztl").canApprove, false);
  assert.equal(evaluateTrafficContext(readyContext({ thresholdAgreed: false }), "guidance").canApprove, true);
  assert.equal(evaluateTrafficContext(undefined).canApprove, false);
  assert.equal(evaluateTrafficContext(createTrafficUseCaseContext()).canApprove, false);
  assert.equal(evaluateTrafficContext(context, "transit").canApprove, false);
  assert.equal(evaluateTrafficContext(context, "policy").canApprove, false);
});

test("malformed or altered snapshots cannot pass the model review guard", () => {
  const snapshot = review();
  for (const invalid of [null, [], {}, { ...snapshot, id: "other" }, { ...snapshot, version: 0 }, { ...snapshot, version: "1" }, { ...snapshot, reviewedAt: 0 }, { ...snapshot, plan: undefined }, { ...snapshot, planKey: "changed" }, { ...snapshot, contextKey: "changed" }, { ...snapshot, modelVersion: "changed" }]) assert.equal(current(invalid), false);
  const changed = copy(snapshot); changed.forecast.score = 100; assert.equal(current(changed), false);
  const changedReference = copy(snapshot); changedReference.forecast.reference.values.pm = 10; assert.equal(current(changedReference), false);
  const plan = { ...DEFAULT_PLAN, duration: 30, routeGuidance: false };
  const invented = copy(review(plan)); invented.forecast.values = { travel: 10 }; assert.equal(current(invented, plan), false);
});

test("creating a review rejects invalid choices, versions, evidence keys, context and dates", () => {
  assert.throws(() => review({ duration: 10, routeGuidance: true }), TypeError);
  for (const options of [{ version: 0 }, { version: "1" }, { qualityKey: "" }, { qualityKey: null }, { contextKey: "" }, { contextKey: null }, { reviewedAt: "invalid" }]) assert.throws(() => review(DEFAULT_PLAN, options), TypeError);
});


test("guidance uses monitored queue evidence and Mobility approval without an invented parking threshold", () => {
  for (const parkingOccupancy of [undefined, null, 0, 90, 93]) {
    const evaluation = evaluateTrafficContext(readyContext({ parkingOccupancy }), "guidance");
    assert.equal(evaluation.canApprove, true);
    assert.equal(evaluation.authority, "Mobility Department");
  }
});
