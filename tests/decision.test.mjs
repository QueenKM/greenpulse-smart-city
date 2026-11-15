import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PLAN, planFingerprint, createPlanReview, isReviewCurrent } from "../src/decision.mjs";

const readiness = { canApprove: true, status: "ready", key: "quality-policy-v1:healthy" };
const reviewedAt = "2026-11-14T08:01:00.000Z";
const review = (plan = DEFAULT_PLAN, options = {}) => createPlanReview(plan, {
  version: 1, qualityKey: readiness.key, reviewedAt, ...options,
});
const copy = (value) => JSON.parse(JSON.stringify(value));

test("a plan fingerprint includes the operating choices and excludes operator notes", () => {
  assert.equal(planFingerprint(DEFAULT_PLAN), planFingerprint({ ...DEFAULT_PLAN, note: "Preserve pedestrian access." }));
  const keys = [30, 60, 90].flatMap((duration) => [true, false].map((routeGuidance) => planFingerprint({ duration, routeGuidance })));
  assert.equal(new Set(keys).size, 6);
  for (const plan of [null, undefined, [], {}, { duration: 0, routeGuidance: true }, { duration: "60", routeGuidance: true }, { duration: 60, routeGuidance: "true" }]) {
    assert.equal(planFingerprint(plan), null);
  }
});

test("the unchanged 60-minute plan retains a clearly scoped reference projection", () => {
  const snapshot = review();
  assert.equal(snapshot.forecast.status, "reference");
  assert.equal(snapshot.forecast.score, 88);
  assert.deepEqual(snapshot.forecast.values, { congestion: 66, pm: 29, travel: 25, speed: 23 });
  assert.match(snapshot.forecast.label, /Reference projection/);
  assert.match(snapshot.forecast.label, /60-minute/);
  assert.equal(snapshot.forecast.reference.duration, 60);
  assert.equal(snapshot.forecast.reference.routeGuidance, true);
  assert.notEqual(snapshot.forecast.values, snapshot.forecast.reference.values);
});

test("every modified plan has unestimated benefits and preserves the original reference separately", () => {
  for (const duration of [30, 60, 90]) {
    for (const routeGuidance of [true, false]) {
      if (duration === 60 && routeGuidance) continue;
      const snapshot = review({ duration, routeGuidance });
      assert.equal(snapshot.forecast.status, "unestimated");
      assert.equal(snapshot.forecast.score, null);
      assert.equal(snapshot.forecast.values, null);
      assert.match(snapshot.forecast.label, /not estimated/);
      assert.equal(snapshot.forecast.reference.score, 88);
      assert.equal(snapshot.forecast.reference.values.congestion, 66);
      assert.equal(snapshot.forecast.reference.duration, 60);
      assert.equal(snapshot.forecast.reference.routeGuidance, true);
      assert.equal(isReviewCurrent(snapshot, { duration, routeGuidance }, readiness), true);
    }
  }
});

test("reviews are deterministic serializable snapshots with explicit versions and timestamps", () => {
  const snapshot = review(DEFAULT_PLAN, { version: 3 });
  assert.deepEqual(copy(snapshot), snapshot);
  assert.equal(snapshot.version, 3);
  assert.equal(snapshot.reviewedAt, reviewedAt);
  assert.equal(snapshot.id, review(DEFAULT_PLAN, { version: 3 }).id);
  assert.notEqual(snapshot.id, review(DEFAULT_PLAN, { version: 4 }).id);
  assert.match(snapshot.id, /H03-REVIEW-v3-/);
  assert.equal(isReviewCurrent(copy(snapshot), DEFAULT_PLAN, readiness), true);
});

test("duration, route-guidance or evidence changes invalidate a prior review", () => {
  const snapshot = review();
  assert.equal(isReviewCurrent(snapshot, DEFAULT_PLAN, readiness), true);
  assert.equal(isReviewCurrent(snapshot, { ...DEFAULT_PLAN, note: "Changed context only." }, readiness), true);
  assert.equal(isReviewCurrent(snapshot, { ...DEFAULT_PLAN, duration: 30 }, readiness), false);
  assert.equal(isReviewCurrent(snapshot, { ...DEFAULT_PLAN, routeGuidance: false }, readiness), false);
  assert.equal(isReviewCurrent(snapshot, DEFAULT_PLAN, { ...readiness, key: "quality-policy-v1:changed" }), false);
  assert.equal(isReviewCurrent(snapshot, DEFAULT_PLAN, { ...readiness, canApprove: false }), false);
  assert.equal(isReviewCurrent(snapshot, DEFAULT_PLAN, { ...readiness, status: "blocked" }), false);
  assert.equal(isReviewCurrent(snapshot, DEFAULT_PLAN, undefined), false);
});

test("malformed, unsupported or altered snapshot fields cannot pass the review guard", () => {
  const snapshot = review();
  for (const invalid of [null, [], {}, { ...snapshot, id: "another-review" }, { ...snapshot, version: 0 }, { ...snapshot, version: "1" }, { ...snapshot, version: 1.5 }, { ...snapshot, reviewedAt: 0 }, { ...snapshot, plan: undefined }, { ...snapshot, planKey: "changed" }]) {
    assert.equal(isReviewCurrent(invalid, DEFAULT_PLAN, readiness), false);
  }
  const changedScore = copy(snapshot);
  changedScore.forecast.score = 100;
  assert.equal(isReviewCurrent(changedScore, DEFAULT_PLAN, readiness), false);
  const changedReference = copy(snapshot);
  changedReference.forecast.reference.values.pm = 10;
  assert.equal(isReviewCurrent(changedReference, DEFAULT_PLAN, readiness), false);
  const modifiedPlan = { duration: 30, routeGuidance: false };
  const inventedBenefits = copy(review(modifiedPlan));
  inventedBenefits.forecast.values = { congestion: 55, pm: 20, travel: 15, speed: 30 };
  assert.equal(isReviewCurrent(inventedBenefits, modifiedPlan, readiness), false);
});

test("creating a review rejects invalid plan choices, versions, evidence keys and dates", () => {
  assert.throws(() => review({ duration: 10, routeGuidance: true }), TypeError);
  assert.throws(() => review(DEFAULT_PLAN, { version: 0 }), TypeError);
  assert.throws(() => review(DEFAULT_PLAN, { version: "1" }), TypeError);
  assert.throws(() => review(DEFAULT_PLAN, { qualityKey: "" }), TypeError);
  assert.throws(() => review(DEFAULT_PLAN, { qualityKey: null }), TypeError);
  assert.throws(() => review(DEFAULT_PLAN, { reviewedAt: "invalid" }), TypeError);
});
