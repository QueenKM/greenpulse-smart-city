import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialQualityState,
  DEFAULT_QUALITY_STATE,
  evaluateDataReadiness,
  getQualitySummary,
  getSourceStatus,
} from "../src/quality.mjs";

const withStatus = (id, status, state = createInitialQualityState()) => ({
  ...state,
  overrides: { ...state.overrides, [id]: status },
});

test("default synthetic inventory explains fourteen of seventeen operational feeds", () => {
  const summary = getQualitySummary();
  assert.equal(summary.operational, 14);
  assert.equal(summary.total, 17);
  assert.equal(summary.excludedCount, 3);
  assert.equal(summary.sourceGroupCount, 6);
  assert.equal(summary.degradedCount, 1);
  assert.equal(summary.qualityPercent, 96);
  assert.equal(getSourceStatus(undefined, "traffic"), "healthy");
  assert.equal(getSourceStatus(undefined, "AQ-04"), "healthy");
  assert.equal(getSourceStatus(undefined, "AQ-07"), "offline");
  assert.equal(getSourceStatus(undefined, "visitor"), "delayed");
  assert.equal(getSourceStatus(undefined, "reference"), "reference");
});

test("default optional outages are visible but do not block the H-03 decision", () => {
  const readiness = evaluateDataReadiness();
  assert.equal(readiness.canApprove, true);
  assert.equal(readiness.status, "ready");
  assert.deepEqual(readiness.missing, []);
  assert.deepEqual(readiness.reasons, []);
  assert.deepEqual(
    readiness.checks.filter((check) => check.required).map((check) => check.id),
    ["traffic", "AQ-04"],
  );
  for (const id of ["AQ-07", "visitor"])
    assert.equal(
      readiness.checks.find((check) => check.id === id).required,
      false,
    );
});

test("a whole traffic-group outage removes six current feeds and blocks mobility evidence", () => {
  const state = withStatus("traffic", "offline");
  const readiness = evaluateDataReadiness(state);
  assert.equal(readiness.canApprove, false);
  assert.equal(readiness.status, "blocked");
  assert.deepEqual(readiness.missing, ["traffic"]);
  assert.match(
    readiness.reasons[0],
    /Current speed, congestion and mobility forecast/,
  );
  assert.equal(getQualitySummary(state).operational, 8);
  assert.equal(getQualitySummary(state).qualityPercent, null);
});

test("primary air-quality failure blocks approval even if the optional backup is restored", () => {
  const state = withStatus("AQ-04", "offline", withStatus("AQ-07", "healthy"));
  const readiness = evaluateDataReadiness(state);
  assert.equal(readiness.canApprove, false);
  assert.deepEqual(readiness.missing, ["AQ-04"]);
  assert.match(readiness.reasons[0], /PM2.5 and NO₂/);
  assert.equal(getQualitySummary(state).operational, 14);
});

test("restoring required evidence re-enables eligibility without executing an action", () => {
  const state = withStatus(
    "AQ-04",
    "healthy",
    withStatus(
      "traffic",
      "healthy",
      withStatus("AQ-04", "offline", withStatus("traffic", "offline")),
    ),
  );
  assert.equal(evaluateDataReadiness(state).canApprove, true);
  assert.equal(getQualitySummary(state).operational, 14);
  assert.equal(getQualitySummary(state).qualityPercent, 96);
  assert.equal(Object.hasOwn(state, "intervention"), false);
});

test("optional source recovery changes coverage while T18 remains excluded", () => {
  const backupRestored = withStatus("AQ-07", "healthy");
  const allOptionalRestored = withStatus("visitor", "healthy", backupRestored);
  assert.equal(getQualitySummary(backupRestored).operational, 15);
  assert.equal(getQualitySummary(allOptionalRestored).operational, 16);
  assert.equal(getQualitySummary(allOptionalRestored).excludedCount, 1);
  assert.equal(getQualitySummary(allOptionalRestored).degradedCount, 0);
  assert.equal(evaluateDataReadiness(allOptionalRestored).canApprove, true);
  assert.equal(getQualitySummary(allOptionalRestored).qualityPercent, 96);
});

test("optional outages do not fabricate a confidence or quality penalty", () => {
  const visitorOffline = withStatus("visitor", "offline");
  const parkingOffline = withStatus("parking", "offline", visitorOffline);
  assert.equal(evaluateDataReadiness(parkingOffline).canApprove, true);
  assert.equal(getQualitySummary(parkingOffline).operational, 10);
  assert.equal(getQualitySummary(parkingOffline).qualityPercent, 96);
  assert.equal(
    Object.hasOwn(evaluateDataReadiness(parkingOffline), "confidence"),
    false,
  );
});

test("delayed or invalid required statuses fail closed", () => {
  for (const status of ["delayed", "maintenance", "unexpected", null]) {
    const state = withStatus("AQ-04", status);
    assert.equal(evaluateDataReadiness(state).canApprove, false);
    assert.deepEqual(evaluateDataReadiness(state).missing, ["AQ-04"]);
  }
  assert.equal(
    getSourceStatus(withStatus("AQ-04", "unexpected"), "AQ-04"),
    "unknown",
  );
  assert.equal(getSourceStatus(undefined, "not-a-source"), "unknown");
});

test("source-policy fingerprint is deterministic and changes with evidence state", () => {
  const a = {
    version: 1,
    overrides: { visitor: "healthy", "AQ-07": "healthy" },
  };
  const b = {
    version: 1,
    overrides: { "AQ-07": "healthy", visitor: "healthy" },
  };
  assert.equal(evaluateDataReadiness(a).key, evaluateDataReadiness(b).key);
  assert.notEqual(evaluateDataReadiness(a).key, evaluateDataReadiness().key);
  assert.notEqual(
    evaluateDataReadiness(withStatus("traffic", "offline")).key,
    evaluateDataReadiness().key,
  );
  assert.equal(
    evaluateDataReadiness(withStatus("unrelated", "offline")).key,
    evaluateDataReadiness().key,
  );
});

test("quality state is serializable, independent and never mutated by policy evaluation", () => {
  const first = createInitialQualityState();
  const second = createInitialQualityState();
  assert.notEqual(first.overrides, second.overrides);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  const before = JSON.stringify(DEFAULT_QUALITY_STATE);
  evaluateDataReadiness(DEFAULT_QUALITY_STATE);
  getQualitySummary(DEFAULT_QUALITY_STATE);
  assert.equal(JSON.stringify(DEFAULT_QUALITY_STATE), before);
  assert.deepEqual(second, { version: 1, overrides: {} });
});
