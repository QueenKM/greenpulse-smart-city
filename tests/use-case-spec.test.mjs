import test from "node:test";
import assert from "node:assert/strict";
import {
  createTrafficUseCaseContext, PROTECTED_ACCESS, REFERENCE_ASSETS,
  TRAFFIC_ACTIONS, TRAFFIC_CHECKS, TRAFFIC_PILOT_EXAMPLE,
  TRAFFIC_WORKFLOW, ZTL_WORKFLOW, HEAT_WORKFLOW, USE_CASE_PROVENANCE, USE_CASES,
} from "../src/use-case-spec.mjs";

test("the final presentation defines exactly three workflows sharing one decision capability", () => {
  assert.deepEqual(Object.keys(USE_CASES), ["traffic", "ztl", "heat"]);
  assert.deepEqual(Object.values(USE_CASES).map(item => item.title), [
    "Daily Traffic Management", "ZTL / Historic-Centre Access Management", "Heatwave Preparedness",
  ]);
  assert.equal(USE_CASE_PROVENANCE.primary.id, "current-final-presentation");
  for (const useCase of Object.values(USE_CASES)) {
    assert.equal(useCase.sourceId, USE_CASE_PROVENANCE.primary.id);
    for (const field of ["objective", "owner", "approval", "kpiNote"]) assert.ok(useCase[field]);
    for (const field of ["evidence", "gaps", "actors", "workflow", "kpis", "claims", "cannotClaim"]) assert.ok(useCase[field].length, `${useCase.id}.${field}`);
  }
  assert.match(USE_CASE_PROVENANCE.boundary, /not connected to municipal systems/);
});

test("current evidence preserves supplied asset counts without pretending Leuven systems are connected", () => {
  assert.deepEqual(Object.fromEntries(REFERENCE_ASSETS.map(({ id, count }) => [id, count])), {
    "traffic-cameras": 18, "vehicle-loops": 4, "signal-controllers": 4,
    "its-panels": 21, "ztl-gates": 10, "ocr-cameras": 16, "parking-sensors": 5,
  });
  assert.ok(REFERENCE_ASSETS.every(asset => asset.sourceId === "current-final-presentation" && asset.connected === false && asset.verifiedForLeuven === false));
  assert.ok(USE_CASES.traffic.evidence.includes("Municipal GIS"));
  assert.ok(USE_CASES.ztl.evidence.some(item => /lawful and technically validated access/.test(item)));
});

test("daily traffic keeps pilot corridor linkage conditional and operational evidence local", () => {
  assert.equal(USE_CASES.traffic.owner, "Mobility Department");
  assert.deepEqual(TRAFFIC_WORKFLOW, ["Review data", "Validate freshness & coverage", "Compare operational options", "Mobility approval", "Authorised execution", "Monitor", "Record outcome"]);
  assert.ok(USE_CASES.traffic.inputs.some(item => /Counts and queue patterns at monitored locations/.test(item)));
  assert.ok(USE_CASES.traffic.gaps.some(item => /timestamp linkage between selected monitoring points/.test(item)));
  assert.ok(USE_CASES.traffic.cannotClaim.some(item => /Network-wide congestion coverage/.test(item)));
  assert.ok(USE_CASES.traffic.cannotClaim.some(item => /Measured emissions or causal CO₂ reductions/.test(item)));
  for (const id of ["signals", "guidance"]) {
    assert.equal(TRAFFIC_ACTIONS[id].authority, "Mobility Department");
    assert.match(TRAFFIC_ACTIONS[id].implementedScope, /authorised/);
    assert.ok(!TRAFFIC_ACTIONS[id].requiredInputs.includes("AQ-04"));
  }
});

test("ZTL reviews aggregate patterns without classifying every entry as a violation", () => {
  assert.equal(USE_CASES.ztl.owner, "Municipal Police");
  assert.equal(ZTL_WORKFLOW.length, 5);
  assert.match(ZTL_WORKFLOW[3], /Human \/ legal approval/);
  assert.match(TRAFFIC_ACTIONS.ztl.authority, /Municipal Police/);
  assert.ok(!TRAFFIC_ACTIONS.ztl.requiredInputs.includes("AQ-04"));
  assert.match(TRAFFIC_ACTIONS.ztl.implementedScope, /not an enforcement command/);
  assert.match(TRAFFIC_ACTIONS.ztl.implementedScope, /No ZTL rule is changed automatically/);
  assert.ok(USE_CASES.ztl.gaps.some(item => /permits and exemptions/.test(item)));
  assert.ok(USE_CASES.ztl.cannotClaim.some(item => /Identifiable licence-plate records/.test(item)));
});

test("heat preparedness uses official forecasts and admits all local evidence gaps", () => {
  assert.equal(USE_CASES.heat.owner, "Civil Protection");
  assert.equal(HEAT_WORKFLOW.length, 6);
  assert.equal(HEAT_WORKFLOW[0], "Official forecast");
  assert.match(HEAT_WORKFLOW[3], /Civil Protection approval/);
  for (const pattern of [/temperature\/humidity sensor network/, /validated cooling-point inventory/, /real-time health-outcome or heat-exposure feed/, /Green-space distribution does not prove cooling/]) assert.ok(USE_CASES.heat.gaps.some(gap => pattern.test(gap)));
  assert.ok(USE_CASES.heat.actors.includes("Social Services"));
  assert.match(USE_CASES.heat.kpiNote, /K5 is TARGET/);
  assert.match(USE_CASES.heat.kpiNote, /walking-time or network-distance threshold/);
});

test("new traffic contexts do not pre-validate linkage, thresholds or legal safeguards", () => {
  const first = createTrafficUseCaseContext(), second = createTrafficUseCaseContext();
  for (const key of ["timestampLinkageValidated", "thresholdAgreed", "permitLinkageValidated", "legalProcessConfirmed", "privacyReviewed"]) assert.equal(first[key], false, key);
  assert.ok(PROTECTED_ACCESS.every(({ id }) => first.protectedAccess[id] === true));
  assert.ok(TRAFFIC_CHECKS.every(({ id }) => first.checks[id] === false));
  first.checks.pedestrian = true;
  first.protectedAccess.disabled = false;
  assert.equal(second.checks.pedestrian, false);
  assert.equal(second.protectedAccess.disabled, true);
});

test("the 18-to-16.2 traffic example is explicitly illustrative and mathematically reproducible", () => {
  assert.equal(TRAFFIC_PILOT_EXAMPLE.baselineMinutes, 18);
  assert.equal(TRAFFIC_PILOT_EXAMPLE.scenarioMinutes, 16.2);
  assert.ok(Math.abs((16.2 - 18) / 18 * 100 - TRAFFIC_PILOT_EXAMPLE.relativeChangePercent) < 1e-10);
  assert.equal(TRAFFIC_PILOT_EXAMPLE.boundary, "Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation.");
});


test("final inventory distinguishes installed parking hardware from data access and corridor coverage", () => {
  const loops = REFERENCE_ASSETS.find(asset => asset.id === "vehicle-loops");
  assert.equal(loops.count, 4);
  assert.equal(loops.publicParkingAreas, 3);
  assert.match(loops.caveat, /not documented corridor counters/);
  const parking = REFERENCE_ASSETS.find(asset => asset.id === "parking-sensors");
  assert.equal(parking.count, 5);
  assert.equal(parking.accessStatus, "supplier-contract-pending");
  assert.match(parking.availability, /NO DATA/);
  assert.match(parking.caveat, /Data is unavailable until the supplier contract is finalised/);
  assert.equal(parking.connected, false);
  assert.equal(parking.verifiedForLeuven, false);
  assert.ok(USE_CASES.traffic.gaps.some(gap => /three public parking areas/.test(gap)));
  assert.ok(USE_CASES.ztl.evidence.some(evidence => /traffic-fine.*subject to lawful and technically validated access/.test(evidence)));
});
