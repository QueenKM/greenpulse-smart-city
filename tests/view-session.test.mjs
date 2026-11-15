import test from "node:test";
import assert from "node:assert/strict";
import {
  VIEW_SESSION_KEY,
  readViewSession,
  saveViewSession,
} from "../src/view-session.mjs";

function installStorage(t, storage) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage,
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else delete globalThis.sessionStorage;
  });
}

function memoryStorage(t) {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  installStorage(t, storage);
  return values;
}

const defaultMap = () => ({
  camera: { zoom: 1, x: 0, y: 0 },
  viewMode: "3d",
  entity: null,
});
const defaultTwin = () => ({
  scenario: "B",
  divider: 50,
  camera: { zoom: 1, x: 0, y: 0 },
  viewMode: "3d",
  panMode: false,
});
const defaultSession = () => ({
  overview: defaultMap(),
  heat: defaultMap(),
  twin: defaultTwin(),
  sourceId: "traffic",
});

test("view choices survive a session round trip without retaining operational authority", (t) => {
  const values = memoryStorage(t);
  saveViewSession({
    overview: {
      camera: { zoom: 1.8, x: 120, y: -80 },
      viewMode: "2d",
      entity: {
        id: "AQ-07", type: "incident", synthetic: false,
        title: "Air-quality station AQ-07", coordinates: [4.7, 50.88],
        approved: true, operator: "Injected operator",
      },
      lifecycle: "active", approval: { humanApproved: true },
    },
    heat: { camera: { zoom: 1.3, x: -20, y: 40 }, viewMode: "3d" },
    twin: {
      scenario: "C", divider: 73,
      camera: { zoom: 2.1, x: 210, y: -95 },
      viewMode: "2d", panMode: true,
      lifecycle: "measured", measurement: { completed: true },
    },
    sourceId: "AQ-07",
    approval: { humanApproved: true }, lifecycle: "active",
    operator: "Injected operator", measurement: { completed: true },
  });
  const stored = JSON.parse(values.get(VIEW_SESSION_KEY));
  assert.deepEqual(Object.keys(stored).sort(), ["heat", "overview", "sourceId", "twin", "version"]);
  assert.deepEqual(Object.keys(stored.overview).sort(), ["camera", "entity", "viewMode"]);
  assert.deepEqual(Object.keys(stored.twin).sort(), ["camera", "divider", "panMode", "scenario", "viewMode"]);
  assert.equal(stored.version, 1);
  assert.equal(JSON.stringify(stored).includes("Injected operator"), false);
  assert.equal(JSON.stringify(stored).includes("humanApproved"), false);
  assert.equal(JSON.stringify(stored).includes("measured"), false);

  const restored = readViewSession();
  assert.deepEqual(restored.overview.camera, { zoom: 1.8, x: 120, y: -80 });
  assert.equal(restored.overview.viewMode, "2d");
  assert.deepEqual(restored.overview.entity, {
    id: "AQ-07", type: "offline", synthetic: true,
    title: "Air-quality station AQ-07", coordinates: [4.7, 50.88],
  });
  assert.deepEqual(restored.twin, {
    scenario: "C", divider: 73,
    camera: { zoom: 2.1, x: 210, y: -95 },
    viewMode: "2d", panMode: true,
  });
  assert.equal(restored.sourceId, "AQ-07");
  assert.equal(Object.hasOwn(restored, "approval"), false);
  assert.equal(Object.hasOwn(restored, "lifecycle"), false);
  assert.equal(Object.hasOwn(restored, "operator"), false);
  assert.equal(Object.hasOwn(restored, "measurement"), false);
});

test("injected operational state in browser storage is never restored as part of a view", (t) => {
  const values = memoryStorage(t);
  values.set(VIEW_SESSION_KEY, JSON.stringify({
    version: 1,
    ...defaultSession(),
    approval: { humanApproved: true }, operator: "Operator #99",
    lifecycle: "measured", remaining: 3000,
    logs: [{ event: "Approved & activated" }],
    overview: { ...defaultMap(), lifecycle: "active", owner: "Injected" },
    twin: { ...defaultTwin(), measurement: { completed: true } },
  }));
  assert.deepEqual(readViewSession(), defaultSession());
});

test("malformed view values are normalized to safe camera and selection bounds", (t) => {
  memoryStorage(t);
  saveViewSession({
    overview: {
      camera: { zoom: 99, x: -9000, y: Infinity },
      viewMode: "invalid", entity: { id: "unknown-source" },
    },
    twin: {
      scenario: "unknown-scenario", divider: -7,
      camera: { zoom: NaN, x: 9000, y: -9000 },
      viewMode: "2d", panMode: "true",
    },
    sourceId: "unrecognised-feed",
  });
  const restored = readViewSession();
  assert.deepEqual(restored.overview, {
    camera: { zoom: 3.4, x: -5600, y: 0 }, viewMode: "3d", entity: null,
  });
  assert.deepEqual(restored.twin, {
    scenario: "B", divider: 0,
    camera: { zoom: 1, x: 5600, y: -3600 },
    viewMode: "2d", panMode: false,
  });
  assert.deepEqual(restored.heat, defaultMap());
  assert.equal(restored.sourceId, "traffic");
});

test("missing, corrupt and unsupported storage recover to fresh independent defaults", (t) => {
  const values = memoryStorage(t);
  assert.deepEqual(readViewSession(), defaultSession());
  for (const raw of ["{invalid-json", "null", "false", "[]", JSON.stringify({ version: 2, twin: { scenario: "C" } })]) {
    values.set(VIEW_SESSION_KEY, raw);
    assert.deepEqual(readViewSession(), defaultSession());
  }
  const first = readViewSession();
  first.overview.camera.zoom = 3;
  first.twin.scenario = "A";
  assert.deepEqual(readViewSession(), defaultSession());
});

test("only recognised data-source selections are restored", (t) => {
  const values = memoryStorage(t);
  for (const sourceId of ["traffic", "AQ-04", "AQ-07", "visitor", "parking", "AVL", "weather", "reference"]) {
    values.set(VIEW_SESSION_KEY, JSON.stringify({ version: 1, sourceId }));
    assert.equal(readViewSession().sourceId, sourceId);
  }
  for (const sourceId of [null, 7, "constructor", "__proto__", "AQ-99"]) {
    values.set(VIEW_SESSION_KEY, JSON.stringify({ version: 1, sourceId }));
    assert.equal(readViewSession().sourceId, "traffic");
  }
});

test("unavailable, blocked or full session storage cannot interrupt application use", (t) => {
  installStorage(t, undefined);
  assert.deepEqual(readViewSession(), defaultSession());
  assert.doesNotThrow(() => saveViewSession(defaultSession()));
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem() { throw new Error("Storage denied"); },
      setItem() { throw new Error("Quota exceeded"); },
    },
  });
  assert.deepEqual(readViewSession(), defaultSession());
  assert.doesNotThrow(() => saveViewSession(defaultSession()));
});
