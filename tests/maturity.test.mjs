import test from "node:test";
import assert from "node:assert/strict";
import { MATURITY_MAP_STAGES, resolveMapLayers } from "../src/maturity.mjs";

const allLayers = {
  traffic: true,
  air: true,
  heat: true,
  heritage: true,
  sensors: true,
};

test("current inventory forbids operational layers even when they are requested", () => {
  assert.deepEqual(resolveMapLayers(allLayers, "CURRENT"), {
    traffic: false,
    air: false,
    heat: false,
    heritage: true,
    sensors: false,
  });
  assert.deepEqual(resolveMapLayers({ ...allLayers, heritage: false }, "CURRENT"), {
    traffic: false,
    air: false,
    heat: false,
    heritage: false,
    sensors: false,
  });
  assert.equal(MATURITY_MAP_STAGES.CURRENT.viewMode, "2d");
});

test("MVP permits its priority layers but cannot enable the target heat capability", () => {
  assert.deepEqual(resolveMapLayers(allLayers, "MVP"), {
    traffic: true,
    air: true,
    heat: false,
    heritage: true,
    sensors: true,
  });
  assert.equal(resolveMapLayers({ traffic: false, sensors: false }, "MVP").traffic, false);
  assert.equal(resolveMapLayers({ traffic: false, sensors: false }, "MVP").sensors, false);
  assert.equal(MATURITY_MAP_STAGES.MVP.viewMode, "2d");
});

test("target supports every layer while heat remains opt-in and caller settings stay unchanged", () => {
  const requested = Object.freeze({ ...allLayers, air: false });
  assert.deepEqual(resolveMapLayers(requested, "TARGET"), { ...allLayers, air: false });
  assert.deepEqual(requested, { ...allLayers, air: false });
  assert.equal(resolveMapLayers({}, "TARGET").heat, false);
  assert.equal(MATURITY_MAP_STAGES.TARGET.viewMode, "3d");
});

test("unknown or malformed maturity identifiers safely use the declared target fallback", () => {
  for (const invalid of [undefined, null, "UNKNOWN", "", 42, {}, "constructor", "__proto__"]) {
    assert.deepEqual(resolveMapLayers(allLayers, invalid), allLayers);
  }
});
