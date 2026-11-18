import test from "node:test";
import assert from "node:assert/strict";
import {
  KPI_DEFINITIONS, DOCUMENT_TRAFFIC_EXAMPLE,
  calculateK1 as calculateK1Raw, calculateK2 as calculateK2Raw, calculateK3, calculateK4,
  calculateK5, calculateK6, calculateK7,
} from "../src/kpi-framework.mjs";

const calculateK1 = (options = {}) => calculateK1Raw(options && typeof options === "object" ? { baselineMinutes: 18, predictedMinutes: 16.2, vehiclesPerHour: 1000, timestampLinkageValidated: true, ...options } : options);
const calculateK2 = (options = {}) => calculateK2Raw(options && typeof options === "object" ? { validatedK1: true, emissionFactorsApproved: true, ...options } : options);

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} should equal ${expected}`);

test("the uploaded framework exposes exactly seven sourced indicators and its declared illustration", () => {
  assert.deepEqual(KPI_DEFINITIONS.map(item => item.id), ["K1", "K2", "K3", "K4", "K5", "K6", "K7"]);
  for (const definition of KPI_DEFINITIONS) {
    for (const field of ["title", "unit", "group", "owner", "formula", "baseline", "target", "frequency", "source"])
      assert.equal(typeof definition[field], "string", `${definition.id}.${field}`);
    assert.ok(definition.inputs.length && definition.limits.length);
  }
  assert.equal(DOCUMENT_TRAFFIC_EXAMPLE.baselineMinutes, 18);
  assert.equal(DOCUMENT_TRAFFIC_EXAMPLE.predictedMinutes, 16.2);
  assert.match(DOCUMENT_TRAFFIC_EXAMPLE.label, /not a calibrated forecast or measured result/);
});

test("K1 keeps prediction, observations, free-flow delay and forecast error distinct", () => {
  const illustration = calculateK1();
  assert.equal(illustration.predictedChangePercent, -10);
  assert.equal(illustration.vehicleHoursSavedPerHour, 30);
  assert.equal(illustration.observedMinutes, null);
  assert.equal(illustration.forecastErrorPercent, null);
  assert.equal(illustration.travelTimeIndex, null);
  const result = calculateK1({ trips: [15.9, 16.5, 17.1], freeFlowMinutes: 9 });
  assert.equal(result.status, "available");
  assert.equal(result.sampleCount, 3);
  assert.equal(result.observedMinutes, 16.5);
  assert.equal(result.delayMinutes, 7.5);
  close(result.travelTimeIndex, 16.5 / 9);
  close(result.actualChangePercent, (16.5 - 18) / 18 * 100);
  close(result.forecastErrorPercent, Math.abs(16.2 - 16.5) / 16.5 * 100);
  const noFlow = calculateK1({ trips: [16.5] });
  assert.equal(noFlow.observedMinutes, 16.5);
  assert.equal(noFlow.delayMinutes, null);
  assert.equal(noFlow.travelTimeIndex, null);
  const noPrediction = calculateK1({ trips: [16.5], freeFlowMinutes: 9, predictedMinutes: null });
  assert.equal(noPrediction.forecastErrorPercent, null);
  assert.equal(noPrediction.predictedChangePercent, null);
});

test("K1 rejects invalid trips, zero reference denominators and overflowing arithmetic", () => {
  for (const inputs of [null, { trips: [-1] }, { trips: [NaN] }, { trips: [0] }, { trips: "18" }, { freeFlowMinutes: 0 }, { baselineMinutes: 0 }, { vehiclesPerHour: -1 }, { baselineMinutes: Number.MIN_VALUE, predictedMinutes: 18 }]) {
    assert.equal(calculateK1(inputs).status, "invalid");
  }
});

test("K2 calculates explicit fleet categories and preserves estimated emissions increases", () => {
  assert.equal(calculateK2().avoidedKg, null);
  assert.equal(calculateK2({ categories: [{ vehicleKm: 1000, baselineFactor: null, interventionFactor: 0.18 }] }).status, "unavailable");
  const categories = [
    { vehicleKm: 1000, baselineFactor: 0.2, interventionFactor: 0.18 },
    { vehicleKm: 100, baselineFactor: 0.9, interventionFactor: 0.8 },
  ];
  const result = calculateK2({ categories });
  assert.equal(result.baselineKg, 290);
  assert.equal(result.interventionKg, 260);
  assert.equal(result.avoidedKg, 30);
  assert.match(result.reason, /Estimated.*not measured/);
  assert.equal(calculateK2({ categories: [{ vehicleKm: 100, baselineFactor: 0.1, interventionFactor: 0.2 }] }).avoidedKg, -10);
  assert.equal(calculateK2({ categories: [{ vehicleKm: -1, baselineFactor: 0.2, interventionFactor: 0.1 }] }).status, "invalid");
});

test("K2 aggregate episodes cannot silently double-count supplied identifiers or overlapping input modes", () => {
  const episode = { id: "E1", categories: [{ vehicleKm: 100, baselineFactor: 0.2, interventionFactor: 0.1 }] };
  assert.equal(calculateK2({ episodes: [episode, { ...episode, id: "E2" }] }).avoidedKg, 20);
  assert.equal(calculateK2({ episodes: [episode, episode] }).status, "invalid");
  assert.equal(calculateK2({ categories: episode.categories, episodes: [episode] }).status, "invalid");
});

test("K3 needs both hourly datasets and explicit comparable conditions", () => {
  const input = { activated: [24, 26], matched: [28, 32], conditionsConfirmed: true };
  const result = calculateK3(input);
  assert.equal(result.activatedMean, 25);
  assert.equal(result.matchedMean, 30);
  assert.equal(result.difference, -5);
  close(result.changePercent, -100 / 6);
  assert.equal(calculateK3({ ...input, conditionsConfirmed: false }).activatedMean, null);
  assert.equal(calculateK3({ activated: [], matched: [30], conditionsConfirmed: true }).status, "unavailable");
  assert.equal(calculateK3({ activated: [-1], matched: [30], conditionsConfirmed: true }).status, "invalid");
  const zero = calculateK3({ activated: [1], matched: [0], conditionsConfirmed: true });
  assert.equal(zero.changePercent, null);
  assert.equal(zero.difference, 1);
  assert.match(result.reason, /does not establish causality or annual legal compliance/);
});

test("K4 measures recorded human-decision latency and applies strictly under ten minutes", () => {
  const alert = Date.parse("2026-11-17T10:00:00Z");
  assert.equal(calculateK4(alert, alert + 9 * 60_000).minutes, 9);
  assert.equal(calculateK4(alert, alert + 9 * 60_000).withinTarget, true);
  assert.equal(calculateK4(alert, alert + 10 * 60_000).withinTarget, false);
  assert.equal(calculateK4(alert, alert).minutes, 0);
  assert.equal(calculateK4(null, alert).minutes, null);
  assert.equal(calculateK4(alert, alert - 1).status, "invalid");
  assert.equal(calculateK4("10:00:00", "10:01:00").status, "invalid");
  assert.equal(calculateK4("2026-11-17T12:00:00+02:00", "2026-11-17T10:01:00Z").minutes, 1);
});

test("K5 sums person-hours strictly above a declared air threshold without substituting land-surface temperature", () => {
  const input = {
    zones: [
      { people: 100, hours: 2, temperatureC: 36, humidityPercent: 40 },
      { people: 100, hours: 1, temperatureC: 35, humidityPercent: 45 },
      { people: 50, hours: 2, temperatureC: 34, humidityPercent: 50 },
    ],
    thresholdC: 35, thresholdConfirmed: true, temperatureKind: "air", validatedAir: true,
  };
  assert.equal(calculateK5(input).personHours, 200);
  assert.equal(calculateK5({ ...input, thresholdConfirmed: false }).personHours, null);
  assert.equal(calculateK5({ ...input, validatedAir: false }).status, "unavailable");
  assert.equal(calculateK5({ ...input, temperatureKind: "surface" }).status, "invalid");
  assert.equal(calculateK5({ ...input, zones: [] }).personHours, null);
  assert.equal(calculateK5({ ...input, zones: [{ ...input.zones[0], people: -1 }] }).status, "invalid");
  assert.equal(calculateK5({ ...input, zones: [{ ...input.zones[0], humidityPercent: 101 }] }).status, "invalid");
  assert.equal(calculateK5({ ...input, zones: [{ people: 10, hours: 1, temperatureC: 36 }] }).status, "unavailable");
});

test("K6 uses vulnerable residents and a confirmed reach definition with an explicit denominator", () => {
  const input = { reachableVulnerable: 100, totalVulnerable: 500, reachMinutes: 10, definitionConfirmed: true };
  assert.equal(calculateK6(input).percent, 20);
  assert.equal(calculateK6({ ...input, reachableVulnerable: 0 }).percent, 0);
  assert.equal(calculateK6({ ...input, definitionConfirmed: false }).percent, null);
  assert.equal(calculateK6({ ...input, totalVulnerable: 0, reachableVulnerable: 0 }).status, "unavailable");
  assert.equal(calculateK6({ ...input, reachableVulnerable: 501 }).status, "invalid");
  assert.equal(calculateK6({ ...input, reachMinutes: -1 }).status, "invalid");
});

const completeRecord = (id = "D1") => ({
  id, data: { source: "Synthetic traffic observations" }, modelVersion: "model-v1", recommendation: "Time-limited signal trial",
  decision: { actor: "Mobility department", time: "2026-11-17T10:00:00Z", approvedOrOverride: "approved" },
  result: { status: "inconclusive", summary: "Observation window completed; no pilot outcome dataset exists." },
});

test("K7 excludes pending and incomplete results while allowing documented inconclusive outcomes", () => {
  assert.equal(calculateK7([]).percent, null);
  const pending = { ...completeRecord("D2"), result: { status: "pending", summary: "Awaiting a completed observation window" } };
  assert.equal(calculateK7([completeRecord(), pending]).percent, 50);
  assert.equal(calculateK7([completeRecord()]).percent, 100);
  const missing = { ...completeRecord(), modelVersion: "", reviewVersion: 3 };
  assert.deepEqual(calculateK7([missing]).missingById.D1, ["modelVersion"]);
  assert.equal(calculateK7([{ ...completeRecord(), decision: { actor: "AI", time: "10:00:00", approvedOrOverride: false } }]).complete, 0);
  assert.equal(calculateK7([{ ...completeRecord(), result: { status: "measured", summary: "" } }]).complete, 0);
  assert.equal(calculateK7([completeRecord(), completeRecord()]).status, "invalid");
});

test("K7 handles reserved IDs and cyclic missing evidence without prototype changes or recursion", () => {
  const data = {}; data.self = data;
  const record = { ...completeRecord("__proto__"), data };
  const result = calculateK7([record]);
  assert.equal(Object.getPrototypeOf(result.missingById), Object.prototype);
  assert.equal(Object.hasOwn(result.missingById, "__proto__"), true);
  assert.deepEqual(result.missingById.__proto__, ["data"]);
  assert.equal(result.percent, 0);
});


test("the final presentation defines exactly seven KPI readiness states and evidence types", () => {
  assert.deepEqual(KPI_DEFINITIONS.map(item => item.readiness), ["PILOT", "TARGET", "TARGET", "PILOT-READY", "TARGET", "PILOT", "PILOT-READY"]);
  assert.equal(KPI_DEFINITIONS[1].provenance, "ESTIMATED");
  assert.equal(KPI_DEFINITIONS[2].provenance, "MEASURED");
  assert.match(KPI_DEFINITIONS[0].readinessNote, /timestamp linkage/);
  assert.match(KPI_DEFINITIONS[3].target, /illustrative pilot target/);
  assert.match(KPI_DEFINITIONS[5].readinessNote, /walking-time or network-distance threshold/);
  assert.equal(KPI_DEFINITIONS[6].target, "100% complete decision logging.");
  assert.match(KPI_DEFINITIONS[6].readinessNote, /does not measure decision quality/);
  assert.equal(DOCUMENT_TRAFFIC_EXAMPLE.note, "Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation.");
});

test("missing K1 and K2 inputs remain No data until their validation gates are explicit", () => {
  assert.equal(calculateK1Raw().predictedChangePercent, null);
  assert.equal(calculateK1Raw().observedMinutes, null);
  assert.equal(calculateK1Raw({ trips: [18, 16.2], freeFlowMinutes: 10 }).observedMinutes, null);
  const categories = [{ vehicleKm: 1000, baselineFactor: 0.2, interventionFactor: 0.18 }];
  assert.equal(calculateK2Raw({ categories }).avoidedKg, null);
  assert.equal(calculateK2Raw({ categories, validatedK1: true }).avoidedKg, null);
  assert.equal(calculateK2Raw({ categories, emissionFactorsApproved: true }).avoidedKg, null);
  assert.equal(calculateK2Raw({ categories, validatedK1: true, emissionFactorsApproved: true }).avoidedKg, 20);
});
