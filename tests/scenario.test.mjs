import test from "node:test";
import assert from "node:assert/strict";
import {
  FORECAST_MINUTES,
  SCORE_WEIGHTS,
  calculateDecisionScore,
  getForecast,
  getForecastAt,
} from "../src/scenario.mjs";

test("forecast horizons preserve one common observed starting state for every intervention", () => {
  assert.deepEqual(FORECAST_MINUTES, [0, 15, 30, 60]);
  const current = { congestion: 72, pm: 27, travel: 28, speed: 19 };
  for (const scenario of ["A", "B", "C"])
    assert.deepEqual(getForecast(0, scenario), current);
  assert.deepEqual(getForecastAt(30, "A"), getForecast(30, "A"));
});

test("the no-action forecast respects the displayed observation and future thresholds", () => {
  for (const [minute, congestion] of [
    [0, 72],
    [15, 76],
    [30, 80],
    [38, 82],
    [60, 87],
  ])
    assert.equal(getForecast(minute, "A").congestion, congestion);
  for (let minute = 1; minute <= 60; minute++)
    assert.ok(
      getForecast(minute, "A").congestion >=
        getForecast(minute - 1, "A").congestion,
    );
  assert.deepEqual(getForecast(-15, "A"), getForecast(0, "A"));
  assert.deepEqual(getForecast(120, "A"), getForecast(60, "A"));
});

test("intervention outcomes compare against the same future no-action city", () => {
  const passive = getForecast(60, "A"),
    signals = getForecast(60, "B"),
    diversion = getForecast(60, "C");
  assert.equal(signals.congestion, 66);
  assert.equal(diversion.congestion, 61);
  assert.equal(signals.pm, 29);
  assert.equal(diversion.pm, 28);
  assert.equal(signals.travel, 25);
  assert.equal(diversion.travel, 23);
  assert.equal(passive.congestion - signals.congestion, 21);
  assert.equal(passive.congestion - diversion.congestion, 26);
  for (const minute of [15, 30, 60])
    for (const scenario of ["B", "C"]) {
      const candidate = getForecast(minute, scenario),
        baseline = getForecast(minute, "A");
      assert.ok(candidate.congestion < baseline.congestion);
      assert.ok(candidate.pm < baseline.pm);
      assert.ok(candidate.travel < baseline.travel);
    }
});

test("transparent positive weights reproduce the recommended eighty-eight score by rounding", () => {
  assert.equal(
    SCORE_WEIGHTS.reduce((sum, criterion) => sum + criterion.weight, 0),
    100,
  );
  assert.ok(SCORE_WEIGHTS.every((criterion) => criterion.weight > 0));
  assert.equal(SCORE_WEIGHTS.at(-1).label, "Implementation feasibility");
  const criteriaB = [91, 88, 94, 100, 63];
  const raw = criteriaB.reduce(
    (sum, score, index) => sum + (score * SCORE_WEIGHTS[index].weight) / 100,
    0,
  );
  assert.ok(Math.abs(raw - 87.55) < 1e-9);
  assert.equal(calculateDecisionScore(criteriaB), 88);
  assert.equal(calculateDecisionScore([12, 10, 50, 100, 100]), 41);
  assert.equal(calculateDecisionScore([94, 93, 67, 88, 49]), 81);
  assert.ok(
    calculateDecisionScore([91, 88, 94, 100, 100]) >
      calculateDecisionScore(criteriaB),
  );
});
