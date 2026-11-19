import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir(new URL("../work/", import.meta.url), { recursive: true });
const appBuildOptions = {
  entryPoints: [new URL("../src/App.jsx", import.meta.url).pathname],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  jsx: "automatic",
  loader: { ".css": "empty" },
  plugins: [
    {
      name: "motion-test-adapter",
      setup(b) {
        b.onResolve({ filter: /^framer-motion$/ }, () => ({
          path: "motion-test",
          namespace: "motion-test",
        }));
        b.onLoad({ filter: /.*/, namespace: "motion-test" }, () => ({
          contents: `import React from 'react';export const AnimatePresence=({children})=>children;const cache={};export const motion=new Proxy({},{get:(_,tag)=>cache[tag]||(cache[tag]=React.forwardRef(function Motion({initial,animate,exit,transition,layout,whileHover,whileTap,...props},ref){return React.createElement(tag,{...props,ref});}))});`,
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
  outfile: new URL("../work/App.test.mjs", import.meta.url).pathname,
};
await build(appBuildOptions);
await build({
  ...appBuildOptions,
  plugins: [
    ...appBuildOptions.plugins,
    {
      name: "controlled-geography-failure",
      setup(b) {
        b.onResolve({ filter: /\/CityMap$/ }, () => ({ path: "controlled-map", namespace: "fault-map" }));
        b.onLoad({ filter: /.*/, namespace: "fault-map" }, () => ({
          contents: `import React from 'react';
            export const preloadCityModel=()=>globalThis.__greenpulseTestMap.request('preload');
            export const retryGeographicModel=()=>globalThis.__greenpulseTestMap.request('retry');
            export default function TestMap(){return React.createElement('div',{'data-testid':'controlled-city-map'},'Test geography');}`,
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
  outfile: new URL("../work/App.fault.test.mjs", import.meta.url).pathname,
});
await build({
  ...appBuildOptions,
  entryPoints: [new URL("../src/components/CityMap.jsx", import.meta.url).pathname],
  plugins: [
    ...appBuildOptions.plugins,
    {
      name: "recoverable-geographic-renderer",
      setup(b) {
        b.onResolve({ filter: /\/GeographicCityMap$/ }, () => ({ path: "recoverable-geography", namespace: "retry-map" }));
        b.onLoad({ filter: /.*/, namespace: "retry-map" }, () => ({
          contents: `import React from 'react';
            export const warmGeographyViews=()=>({views:2});
            export default function TestGeography(props){
              if(globalThis.__greenpulseRendererFails) throw new Error('Expected geographic renderer failure');
              return React.createElement('div',{'data-testid':'recovered-geography','data-camera':JSON.stringify(props.camera),'data-view-mode':props.viewMode,'data-entity':props.selectedEntity?.id},'Recovered test geography');
            }`,
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
  outfile: new URL("../work/CityMap.retry.test.mjs", import.meta.url).pathname,
});
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
globalThis.sessionStorage = dom.window.sessionStorage;
beforeEach(() => globalThis.sessionStorage.clear());
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "SVGElement",
  "Element",
  "Node",
  "MutationObserver",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
])
  globalThis[key] =
    typeof dom.window[key] === "function" &&
    [
      "getComputedStyle",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ].includes(key)
      ? dom.window[key].bind(dom.window)
      : dom.window[key];
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// jsdom does not implement PointerEvent. Preserve real pointer modality in
// interaction tests so a touch hover cannot accidentally act like a mouse.
if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends window.MouseEvent {
    constructor(type, options = {}) {
      super(type, options);
      Object.defineProperty(this, "pointerType", {
        value: options.pointerType || "mouse",
      });
      Object.defineProperty(this, "pointerId", {
        value: options.pointerId ?? 1,
      });
    }
  };
}
// The DOM runner has no native window manager. This adapter verifies the app's
// fullscreen requests and change-event handling; it does not verify browser chrome.
let fullscreenElement = null;
let fullscreenRequests = 0;
Object.defineProperty(document, "fullscreenElement", {
  configurable: true,
  get: () => fullscreenElement,
});
HTMLElement.prototype.requestFullscreen = function () {
  fullscreenElement = this;
  fullscreenRequests += 1;
  document.dispatchEvent(new window.Event("fullscreenchange"));
  return Promise.resolve();
};
document.exitFullscreen = () => {
  fullscreenElement = null;
  document.dispatchEvent(new window.Event("fullscreenchange"));
  return Promise.resolve();
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { render, screen, fireEvent, waitFor, cleanup, within, act } = await import(
  "@testing-library/react"
);
const { default: App } = await import("../work/App.test.mjs");
const { default: FaultApp } = await import("../work/App.fault.test.mjs");
const { default: RetryCityMap } = await import("../work/CityMap.retry.test.mjs");
const pageName = (name) => ({
  "Traffic & Emissions": "Daily Traffic",
  "Urban Heat": "Heat Preparedness",
  "KPI & Impact": "KPI Framework",
  "Implementation Roadmap": "Governance & Roadmap",
}[name] || name);
const button = (name) => screen.getByRole("button", { name: pageName(name), exact: true });
const click = (name) => {
  const direct = screen.queryByRole("button", { name: pageName(name), exact: true });
  if (direct) return fireEvent.click(direct);
  const destinations = { "City Map": "City map", "Digital Twin": "Selective Digital Twin · TARGET", "Selective Digital Twin": "Selective Digital Twin · TARGET", "Alert Center": "Alert Center", "Data Health": "Data Health" };
  if (destinations[name]) {
    fireEvent.click(button("City Control Room workspace menu"));
    return fireEvent.click(screen.getByRole("menuitem", { name: destinations[name], exact: true }));
  }
  return fireEvent.click(button(name));
};

// Exercise every human review control rather than calling the reducer or
// silently bypassing disabled approval buttons in positive-path tests.
const checkIfNeeded = (name, scope = screen) => {
  const checkbox = scope.getByRole("checkbox", { name, exact: true });
  if (!checkbox.checked) fireEvent.click(checkbox);
  assert.equal(checkbox.checked, true);
};
const reviewCurrentPlan = ({ authority = "Mobility Department" } = {}) => {
  const dialog = screen.getByRole("dialog", { name: "Approve intervention" });
  const scope = within(dialog);
  for (const name of [
    "Pedestrian safety and crossing delay reviewed",
    "Bus punctuality and access reviewed",
    "Residential congestion displacement reviewed",
    "Historic-centre compatibility reviewed",
    "Time-limited trial and rollback plan reviewed",
  ]) checkIfNeeded(name, scope);
  for (const name of [
    "Synthetic queue-pattern trigger reviewed; municipal operating threshold remains to be agreed",
    "Aggregate entries reviewed by gate and period; entries are not automatically violations",
    "I understand this action-specific or modified plan has no numerical forecast",
  ]) {
    const box = scope.queryByRole("checkbox", { name, exact: true });
    if (box && !box.checked) fireEvent.click(box);
  }
  const record = scope.queryByRole("button", { name: "Record plan review", exact: true });
  if (record) {
    assert.equal(record.disabled, false, "review requires all safety checks and evidence");
    fireEvent.click(record);
  }
  fireEvent.change(scope.getByLabelText("Acting as the proposed approving authority"), { target: { value: authority } });
  checkIfNeeded("I confirm this synthetic decision as the proposed approving authority", scope);
  for (const name of [
    "Municipal Police operational review confirmed for this synthetic ZTL decision",
    "Established legal procedure reviewed; no automatic ZTL rule changes",
    "Authorised privacy review confirmed; no identifiable licence-plate records",
  ]) {
    const checkbox = scope.queryByRole("checkbox", { name, exact: true });
    if (checkbox && !checkbox.checked) fireEvent.click(checkbox);
  }
  assert.equal(button("Approve intervention").disabled, false);
  return dialog;
};
const executeApprovedPlan = () => {
  assert.equal(screen.queryByText("MONITORING"), null, "approval alone cannot execute the intervention");
  click("Review authorised execution");
  const scope = within(screen.getByRole("dialog", { name: "Authorised execution" }));
  fireEvent.change(scope.getByLabelText("Execution operator"), { target: { value: "Authorised Operator #02" } });
  checkIfNeeded("I confirm the authorised operator role and approved plan", scope);
  const legal = scope.queryByRole("checkbox", { name: "Municipal Police confirms the established legal process and protected exemptions", exact: true });
  if (legal && !legal.checked) fireEvent.click(legal);
  assert.equal(button("Execute approved prototype plan").disabled, false);
  click("Execute approved prototype plan");
};
const approveCurrentPlan = (options) => {
  reviewCurrentPlan(options);
  click("Approve intervention");
  executeApprovedPlan();
};
const selectKpi = (id) => fireEvent.click(within(screen.getByRole("navigation", { name: "KPI selector" })).getByRole("button", { name: new RegExp(`^${id}\\b`) }));
const expectBlankActual = () => {
  assert.equal(document.querySelector(".kw-actual-summary strong")?.textContent, "No data");
  assert.equal(screen.getByLabelText(/^Observed trip durations \(minutes\)/).value, "");
};
const completePilotWindow = async () => {
  const linkage = screen.getByRole("checkbox", { name: "I have reviewed the selected monitoring-point timestamp linkage for this synthetic pilot exercise. This does not validate a municipal connection.", exact: true });
  await waitFor(() => assert.equal(linkage.disabled, false), { timeout: 7000 });
  assert.equal(screen.getByLabelText(/^Observed trip durations \(minutes\)/).disabled, true, "measurement completion does not validate timestamp linkage");
  fireEvent.click(linkage);
  assert.equal(screen.getByLabelText(/^Observed trip durations \(minutes\)/).disabled, false);
};

test(
  "all navigation and decision controls preserve the approval and measurement gates",
  { timeout: 20000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    assert.ok(screen.getByText("TARGET-STATE PROTOTYPE"));
    await waitFor(() => assert.ok(document.querySelector(".geo-camera")), {
      timeout: 3000,
    });
    assert.ok(screen.getByText("LEUVEN URBAN MODEL"));
    assert.ok(screen.getByText("Illustrative operational scenario"));
    const geographyCamera = document.querySelector(".geo-camera");
    const originalCamera = geographyCamera.getAttribute("transform");
    click("Zoom in");
    const zoomedCamera = geographyCamera.getAttribute("transform");
    assert.notEqual(zoomedCamera, originalCamera);
    // A late mount effect must not overwrite the operator's first camera action.
    await act(async () => { await Promise.resolve(); });
    assert.equal(geographyCamera.getAttribute("transform"), zoomedCamera);
    click("Reset map view");
    assert.equal(geographyCamera.getAttribute("transform"), originalCamera);
    // TARGET starts with mapped-height 3D; operators can still inspect 2D.
    click("Show 2D map");
    click("Show mapped 3D building heights");
    assert.ok(screen.getByRole("button", { name: "Show 2D map" }));
    click("Show 2D map");
    click("Map data sources");
    assert.ok(screen.getByRole("region", { name: "Map data provenance" }));
    assert.ok(screen.getByText("9,119"));
    click("Close map data sources");
    click("Scenario air-quality station AQ-04");
    assert.ok(
      screen.getByText(
        "Synthetic demonstration data · no physical device is represented.",
      ),
    );
    click("Close sensor details");
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    for (const name of [
      "Alert Center",
      "City Map",
      "Data Health",
      "Traffic & Emissions",
      "Urban Heat",
      "Digital Twin",
      "Decision Log",
      "KPI & Impact",
      "Implementation Roadmap",
      "Overview",
    ]) {
      click(name);
      assert.ok(screen.getAllByRole("heading", { name: pageName(name), exact: true }).length);
    }
    click("Layers");
    for (const name of [
      "Traffic",
      "Air Quality",
      "Urban Heat",
      "Heritage",
      "Sensors",
    ]) {
      const b = screen
        .getAllByRole("button", { name, exact: true })
        .find((x) => x.hasAttribute("aria-pressed"));
      const before = b.getAttribute("aria-pressed");
      fireEvent.click(b);
      assert.notEqual(b.getAttribute("aria-pressed"), before);
      fireEvent.click(b);
    }
    fireEvent.keyDown(document, { key: "Escape" });
    click("Explore target scenarios");
    const slider = screen.getByRole("slider", {
      name: "Drag to compare before and after",
    });
    fireEvent.change(slider, { target: { value: "70" } });
    assert.equal(slider.value, "70");
    click("Review & approve");
    assert.ok(screen.getByRole("dialog", { name: "Approve intervention" }));
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    click("Cancel");
    await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
    click("Review & approve");
    approveCurrentPlan();
    assert.ok(screen.getByText("Signal Plan H03"));
    assert.ok(screen.getByText("MONITORING"));
    click("Pause");
    assert.ok(screen.getByText("OPERATOR PAUSED"));
    click("Resume");
    assert.ok(screen.getByText("MONITORING"));
    click("Handover");
    assert.ok(screen.getByRole("dialog", { name: /handover/i }));
    const confirm = screen
      .getAllByRole("button")
      .find((x) => /Confirm handover/i.test(x.textContent));
    assert.ok(confirm);
    fireEvent.click(confirm);
    assert.ok(
      screen.getByText("Control Room Operator #03", { selector: "dd" }),
    );
    click("Close Intervention");
    click("Close & measure");
    assert.ok(screen.getByText(/^MEASURING OUTCOME/));
    assert.equal(screen.queryByText("−10.8%"), null);
    const observedTrips = screen.getByLabelText(/^Observed trip durations \(minutes\)/);
    assert.equal(observedTrips.disabled, true);
    await completePilotWindow();
    expectBlankActual();
    fireEvent.change(observedTrips, { target: { value: "16, 17" } });
    assert.equal(document.querySelector(".kw-actual-summary strong").textContent, "16.5 min");
    assert.ok(screen.getByText("1.82%"));
    assert.equal(screen.queryByText("−10.8%"), null);
    click("Decision Log");
    assert.ok(screen.getByText(/^Human approval recorded/));
    assert.ok(screen.getByText("Authorised operator execution recorded · synthetic trial started"));
    cleanup();
  },
);

test(
  "presentation navigation cannot execute an intervention without the approval button",
  { timeout: 25000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    click("Presentation Demo");
    await waitFor(() => assert.ok(screen.getByText("City ready")), {
      timeout: 5000,
    });
    click("Next Step");
    assert.ok(screen.getByRole("dialog", { name: "Evidence → design" }));
    click("Next Step");
    click("Next Step");
    click("Next Step");
    assert.ok(screen.getByRole("dialog", { name: "Approve intervention" }));
    click("Cancel");
    await waitFor(() => assert.equal(screen.queryByRole("dialog"), null));
    click("Next Step");
    assert.ok(screen.getByRole("dialog", { name: "Approve intervention" }));
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    reviewCurrentPlan();
    click("Approve intervention");
    assert.equal(screen.queryByText("MONITORING"), null);
    assert.equal(currentStep(), "Authorised execution");
    click("Next Step");
    assert.equal(currentStep(), "Authorised execution", "presentation navigation cannot substitute for authorised execution");
    assert.equal(screen.queryByText("MONITORING"), null);
    executeApprovedPlan();
    assert.ok(screen.getByText("Signal Plan H03"));
    click("Next Step");
    assert.ok(screen.getByText(/^MEASURING OUTCOME/));
    assert.equal(screen.queryByText("−10.8%"), null);
    await completePilotWindow();
    expectBlankActual();
    click("Reset Demo");
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("−10.8%"), null);
    cleanup();
  },
);

const currentStep = () =>
  document.querySelector(".presentation-current-step strong")?.textContent;
const cameraTransforms = () =>
  [...document.querySelectorAll(".twin-map-stage .geo-camera")].map((node) =>
    node.getAttribute("transform"),
  );

test(
  "incident focus and a shared forecast horizon remain consistent across city, traffic and Twin",
  { timeout: 15000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    await waitFor(() => assert.ok(document.querySelector(".geo-camera")), {
      timeout: 3000,
    });
    const map = document.querySelector(".geo-map");
    const camera = map.querySelector(".geo-camera");
    assert.equal(map.dataset.focused, "false");
    click("Select Leuven Historic Centre H-03 scenario");
    assert.equal(map.dataset.focused, "true");
    assert.match(camera.getAttribute("transform"), /scale\(1\.55\)/);
    assert.ok(screen.getByLabelText("Affected incident corridors"));
    click("Show whole city");
    assert.equal(map.dataset.focused, "false");
    assert.equal(camera.getAttribute("transform"), "translate(0 0) scale(1)");
    assert.equal(
      screen.queryByRole("button", { name: "Show whole city" }),
      null,
    );

    const details = document.querySelector(".gp-incident-details");
    assert.equal(details.open, false);
    assert.ok(button("Explore target scenarios"));
    fireEvent.click(
      screen.getByText("Evidence & model details", { selector: "summary" }),
    );
    assert.equal(details.open, true);
    assert.ok(screen.getByText(/not Leuven operational observations/));
    fireEvent.click(
      screen.getByText("Evidence & model details", { selector: "summary" }),
    );
    assert.equal(details.open, false);

    click("Show forecast in 15 minutes");
    assert.equal(map.dataset.forecastMinute, "15");
    assert.equal(document.querySelector(".gp-incident-forecast-value").textContent, "No data", "target exploration never fabricates a current network-wide congestion forecast");
    click("Daily Traffic");
    click("Counts & queue patterns");
    assert.ok(screen.getByRole("heading", { name: "Counts and queue patterns" }));
    assert.match(document.querySelector(".traffic-screen").textContent, /No data/);
    click("Digital Twin");
    await waitFor(() => assert.equal(cameraTransforms().length, 2));
    assert.equal(
      button("Show forecast in 15 minutes").getAttribute("aria-pressed"),
      "true",
    );
    click("Show forecast in 30 minutes");
    assert.ok(
      [...document.querySelectorAll(".twin-map-stage .geo-map")].every(
        (node) => node.dataset.forecastMinute === "30",
      ),
    );
    click("Show forecast in 60 minutes");
    assert.ok(
      [...document.querySelectorAll(".twin-map-stage .geo-map")].every(
        (node) => node.dataset.forecastMinute === "60",
      ),
    );
    click("Show current conditions");
    assert.ok(
      [...document.querySelectorAll(".twin-map-stage .geo-map")].every(
        (node) => node.dataset.forecastMinute === "0",
      ),
    );
    click("Overview");
    assert.equal(
      button("Show current conditions").getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      document.querySelector(".geo-map").dataset.forecastMinute,
      "0",
    );
  },
);

test(
  "Twin camera controls keep both halves aligned and explain the weighted score without approval",
  { timeout: 15000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    click("Digital Twin");
    await waitFor(() => assert.equal(cameraTransforms().length, 2));
    const original = cameraTransforms();
    assert.equal(original[0], original[1]);
    click("Zoom in comparison maps");
    const zoomed = cameraTransforms();
    assert.equal(zoomed[0], zoomed[1]);
    assert.notEqual(zoomed[0], original[0]);
    click("Show comparison in 2D");
    assert.ok(button("Show comparison in 3D"));
    assert.equal(
      document.querySelectorAll(".twin-map-stage .geo-building-heights").length,
      0,
    );
    click("Show comparison in 3D");
    assert.equal(
      document.querySelectorAll(".twin-map-stage .geo-building-heights").length,
      2,
    );
    click("Pan both maps");
    const pan = screen.getByRole("application", {
      name: "Pan both comparison maps",
    });
    fireEvent.keyDown(pan, { key: "ArrowRight" });
    const panned = cameraTransforms();
    assert.equal(panned[0], panned[1]);
    assert.notEqual(panned[0], zoomed[0]);
    click("Reset comparison view");
    assert.deepEqual(cameraTransforms(), original);
    click("Drag comparison");
    const slider = screen.getByRole("slider", {
      name: "Drag to compare before and after",
    });
    fireEvent.change(slider, { target: { value: "0" } });
    assert.equal(slider.value, "0");
    fireEvent.change(slider, { target: { value: "100" } });
    assert.equal(slider.value, "100");
    click("How is this calculated?");
    const explanation = screen.getByRole("dialog", {
      name: "How is this calculated?",
    });
    assert.match(
      explanation.querySelector(".twin-score-equation strong").textContent,
      /87\.55.*88/,
    );
    for (const weight of ["30%", "25%", "20%", "10%", "15%"])
      assert.ok(within(explanation).getByText(weight));
    assert.match(explanation.textContent, /higher score means easier delivery/);
    assert.match(
      explanation.textContent,
      /not calibrated, validated or approved for real Leuven operations/,
    );
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    fireEvent.keyDown(explanation, { key: "Escape" });
    assert.equal(
      screen.queryByRole("dialog", { name: "How is this calculated?" }),
      null,
    );
    assert.ok(button("Review & approve"));
  },
);

test(
  "fullscreen presentation keyboard navigation respects map, input and human approval boundaries",
  { timeout: 20000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    const requestsBefore = fullscreenRequests;
    click("Presentation Demo");
    await waitFor(() => assert.ok(screen.getByText("City ready")), {
      timeout: 5000,
    });
    assert.equal(fullscreenRequests, requestsBefore + 1);
    assert.equal(
      document.fullscreenElement,
      document.querySelector(".app-shell"),
    );
    assert.equal(currentStep(), "Alert");
    fireEvent.keyDown(document, { key: "ArrowRight" });
    assert.equal(currentStep(), "Evidence");
    assert.ok(screen.getByRole("dialog", { name: "Evidence → design" }));
    fireEvent.keyDown(document, { key: "ArrowRight" });
    assert.equal(currentStep(), "Operational options");
    fireEvent.keyDown(document, { key: "ArrowRight" });
    assert.equal(currentStep(), "Scenarios");
    await waitFor(() => assert.equal(cameraTransforms().length, 2));
    const slider = screen.getByRole("slider", {
      name: "Drag to compare before and after",
    });
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    assert.equal(currentStep(), "Scenarios");
    click("Pan both maps");
    const beforePan = cameraTransforms();
    fireEvent.keyDown(
      screen.getByRole("application", { name: "Pan both comparison maps" }),
      { key: "ArrowRight" },
    );
    assert.equal(currentStep(), "Scenarios");
    assert.notEqual(cameraTransforms()[0], beforePan[0]);
    assert.equal(cameraTransforms()[0], cameraTransforms()[1]);
    click("How is this calculated?");
    const scoreDialog = screen.getByRole("dialog", {
      name: "How is this calculated?",
    });
    fireEvent.keyDown(scoreDialog, { key: "ArrowRight" });
    assert.equal(currentStep(), "Scenarios");
    fireEvent.keyDown(scoreDialog, { key: "Escape" });
    assert.equal(currentStep(), "Scenarios");
    assert.equal(
      document.fullscreenElement,
      document.querySelector(".app-shell"),
    );
    fireEvent.keyDown(document, { key: "ArrowRight" });
    assert.equal(currentStep(), "Human approval");
    assert.ok(screen.getByRole("dialog", { name: "Approve intervention" }));
    fireEvent.keyDown(document, { key: "ArrowRight" });
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    click("Cancel");
    fireEvent.keyDown(document, { key: "ArrowRight" });
    assert.ok(screen.getByRole("dialog", { name: "Approve intervention" }));
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    approveCurrentPlan();
    assert.equal(currentStep(), "Authorised execution");
    assert.ok(screen.getByText("Signal Plan H03"));
    click("Exit full screen");
    assert.equal(document.fullscreenElement, null);
    assert.equal(currentStep(), "Authorised execution");
    click("Enter full screen");
    assert.equal(
      document.fullscreenElement,
      document.querySelector(".app-shell"),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    assert.equal(document.fullscreenElement, null);
    assert.equal(document.querySelector(".presentation-current-step"), null);
    assert.ok(screen.getByText("Signal Plan H03"));
  },
);

test(
  "a rejected fullscreen request retains a usable prepared presentation",
  { timeout: 10000 },
  async (t) => {
    const requestFullscreen = HTMLElement.prototype.requestFullscreen;
    t.after(() => {
      cleanup();
      fullscreenElement = null;
      HTMLElement.prototype.requestFullscreen = requestFullscreen;
    });
    HTMLElement.prototype.requestFullscreen = () =>
      Promise.reject(new Error("Fullscreen denied by browser"));
    render(React.createElement(App));
    click("Presentation Demo");
    await waitFor(() => assert.ok(screen.getByText("City ready")), {
      timeout: 5000,
    });
    await waitFor(() =>
      assert.ok(
        screen.getByText(
          "Fullscreen was unavailable. You can continue in presentation mode.",
        ),
      ),
    );
    assert.equal(document.fullscreenElement, null);
    assert.equal(currentStep(), "Alert");
    assert.ok(button("Enter full screen"));
    fireEvent.keyDown(document, { key: "ArrowRight" });
    assert.equal(currentStep(), "Evidence");
    assert.equal(screen.queryByText("Signal Plan H03"), null);
  },
);

test(
  "Escape exits presentation from focused comparison and timeline controls while arrows stay local",
  { timeout: 15000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    for (const controlType of ["comparison", "timeline"]) {
      render(React.createElement(App));
      click("Presentation Demo");
      await waitFor(() => assert.ok(screen.getByText("City ready")), {
        timeout: 5000,
      });
      fireEvent.keyDown(document, { key: "ArrowRight" });
      fireEvent.keyDown(document, { key: "ArrowRight" });
      fireEvent.keyDown(document, { key: "ArrowRight" });
      assert.equal(currentStep(), "Scenarios");
      const control =
        controlType === "comparison"
          ? screen.getByRole("slider", {
              name: "Drag to compare before and after",
            })
          : button("Show forecast in 15 minutes");
      control.focus();
      assert.equal(document.activeElement, control);
      fireEvent.keyDown(control, { key: "ArrowRight" });
      assert.equal(currentStep(), "Scenarios");
      fireEvent.keyDown(control, { key: "Escape" });
      assert.equal(document.fullscreenElement, null);
      assert.equal(document.querySelector(".presentation-current-step"), null);
      assert.equal(screen.queryByText("Signal Plan H03"), null);
      cleanup();
    }
  },
);

test(
  "the seven final-presentation KPIs preserve provenance, readiness and missing inputs",
  { timeout: 10000 },
  async (t) => {
    t.after(() => { cleanup(); fullscreenElement = null; });
    render(React.createElement(App));
    click("KPI Framework");
    const selector = screen.getByRole("navigation", { name: "KPI selector" });
    assert.equal(within(selector).getAllByRole("button").length, 7);
    assert.ok(screen.getByRole("region", { name: "KPI definition and method" }));
    assert.match(document.querySelector(".kw-detail").textContent, /PILOT/);
    assert.ok(screen.getByText("Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation."));
    assert.match(document.querySelector(".kw-baseline-journey").textContent, /18.*16\.2/);
    assert.match(document.querySelector(".kw-primary-result").textContent, /MODELLED/);
    expectBlankActual();
    assert.equal(screen.getByLabelText(/^Observed trip durations \(minutes\)/).disabled, true);
    selectKpi("K2");
    assert.match(document.querySelector(".kw-detail").textContent, /TARGET/);
    assert.match(document.querySelector(".kw-primary-result").textContent, /ESTIMATED/);
    assert.ok(within(document.querySelector(".kw-primary-result")).getByText("No data"));
    assert.equal(screen.getByLabelText("Vehicle-km, row 1").value, "");
    assert.equal(screen.getByLabelText("Before kg/km, row 1").value, "");
    selectKpi("K3");
    assert.match(document.querySelector(".kw-detail").textContent, /TARGET/);
    assert.match(document.querySelector(".kw-primary-result").textContent, /MEASURED/);
    assert.ok(within(document.querySelector(".kw-primary-result")).getAllByText("No data").length);
    assert.equal(screen.getByLabelText("PM2.5 matched-reference hourly values (µg/m³)").disabled, true);
    assert.ok(screen.getByText("Annual-average context only. This hourly comparison does not demonstrate annual compliance."));
    selectKpi("K4");
    assert.match(document.querySelector(".kw-detail").textContent, /PILOT-READY/);
    assert.match(document.querySelector(".kw-detail").textContent, /illustrative pilot target/i);
    for (const [id, readiness] of [["K5", "TARGET"], ["K6", "PILOT"], ["K7", "PILOT-READY"]]) {
      selectKpi(id);
      assert.match(document.querySelector(".kw-detail").textContent, new RegExp(readiness));
      assert.ok(within(document.querySelector(".kw-primary-result")).getAllByText("No data").length);
      assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
    }
    assert.match(document.querySelector(".kw-detail").textContent, /100%/);
    assert.match(document.querySelector(".kw-detail").textContent, /completeness.*not.*quality/i);
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    click("Overview");
    assert.equal(screen.queryByText("Signal Plan H03"), null);
  },
);

test(
  "final roadmap exposes three progressive phases without claiming operational readiness",
  { timeout: 10000 },
  async (t) => {
    t.after(() => { cleanup(); fullscreenElement = null; });
    render(React.createElement(App));
    click("Governance & Roadmap");
    for (const name of ["Discover & Prepare", "Integrate & Pilot", "Extend Selectively"]) assert.ok(screen.getAllByText(name, { exact: false }).length);
    assert.match(document.querySelector(".main-shell").textContent, /0[––-]6 months/i);
    assert.match(document.querySelector(".main-shell").textContent, /6[––-]18 months/i);
    assert.match(document.querySelector(".main-shell").textContent, /18[––-]36 months/i);
    assert.equal(screen.queryByText("How the two use cases were prioritised"), null);
    assert.equal(screen.queryByRole("table", { name: "Document use-case prioritisation" }), null);
    assert.match(document.querySelector(".main-shell").textContent, /Mobility Department/);
    assert.match(document.querySelector(".main-shell").textContent, /Municipal Police/);
    assert.match(document.querySelector(".main-shell").textContent, /Civil Protection/);
    assert.equal(screen.queryByText("Signal Plan H03"), null);
  },
);

test("the target-state architecture has exactly five progressively implemented layers", async (t) => {
  t.after(() => { cleanup(); fullscreenElement = null; });
  render(React.createElement(App));
  click("Architecture");
  assert.ok(screen.getByText("Target-state architecture, implemented progressively after data validation."));
  for (const layer of ["Sources", "Integration", "Urban Data Hub", "Analytics / Selective Digital Twin", "Action & Evidence"]) assert.ok(screen.getAllByText(layer, { exact: true }).length);
  assert.equal(screen.queryByText("Signal Plan H03"), null);
});

test(
  "the workspace dropdown navigates every destination and starts the guided presentation",
  { timeout: 15000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    const trigger = button("City Control Room workspace menu");
    assert.equal(trigger.getAttribute("aria-haspopup"), "menu");
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(screen.queryByRole("menu"), null);
    for (const [destination, page] of [
      ["City map", "City Map"],
      ["Selective Digital Twin · TARGET", "Digital Twin"],
      ["Governance & Roadmap", "Governance & Roadmap"],
      ["City overview", "Overview"],
    ]) {
      fireEvent.click(trigger);
      assert.equal(trigger.getAttribute("aria-expanded"), "true");
      const menu = screen.getByRole("menu", {
        name: "City Control Room workspace menu",
      });
      assert.equal(within(menu).getAllByRole("menuitem").length, 7);
      fireEvent.click(within(menu).getByRole("menuitem", { name: destination }));
      assert.equal(screen.queryByRole("menu"), null);
      assert.equal(document.querySelector(".page-heading h1").textContent, page);
      await waitFor(() =>
        assert.ok(document.activeElement === document.querySelector(".page-heading h1"), "navigation focuses the new page heading"),
      );
      assert.equal(screen.queryByText("Signal Plan H03"), null);
      assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
    }
    click("CURRENT");
    await waitFor(() => assert.equal(document.querySelector(".geo-map")?.dataset.maturity, "CURRENT"));
    const requestsBefore = fullscreenRequests;
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("menuitem", { name: "Presentation Demo" }));
    await waitFor(() => assert.ok(screen.getByText("City ready")), { timeout: 5000 });
    assert.equal(screen.queryByRole("menu"), null);
    assert.equal(currentStep(), "Alert");
    assert.ok(fullscreenRequests > requestsBefore);
    assert.equal(button("TARGET").getAttribute("aria-pressed"), "true");
    assert.equal(document.querySelector(".geo-map").dataset.maturity, "TARGET");
    assert.ok(document.querySelector(".geo-building-heights"));
    assert.ok(document.querySelector(".geo-traffic-overlay.visible"));
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
  },
);

test(
  "maturity selection changes actual map geometry and capability coverage without executing a decision",
  { timeout: 15000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    await waitFor(() => assert.equal(document.querySelector(".geo-map")?.dataset.maturity, "TARGET"));
    let map = document.querySelector(".geo-map");
    assert.ok(map.querySelector(".geo-building-heights"));
    assert.equal(map.querySelectorAll(".geo-synthetic-sensors .geo-sensor").length, 5);

    click("CURRENT");
    await waitFor(() => assert.equal(document.querySelector(".geo-map")?.dataset.maturity, "CURRENT"));
    map = document.querySelector(".geo-map");
    assert.equal(document.querySelector(".maturity-popover"), null);
    assert.ok(within(map).getByRole("status", { name: "CURRENT map capability view" }));
    assert.ok(map.querySelector(".geo-street-foundation path").getAttribute("d").length > 100);
    const flatFootprint = map.querySelector(".geo-building-footprints path").getAttribute("d");
    for (const forbidden of [".geo-building-heights", ".geo-air", ".geo-heat-overlay", ".geo-traffic-overlay", ".geo-synthetic-sensors", ".geo-incident"]) {
      assert.equal(map.querySelector(forbidden) === null, true, `CURRENT must not render ${forbidden}`);
    }
    assert.ok(map.querySelector(".geo-heritage"));
    click("Layers");
    let group = screen.getByRole("group", { name: "Map layers" });
    for (const name of ["Traffic", "Air Quality", "Urban Heat", "Sensors"]) {
      assert.equal(within(group).getByRole("button", { name, exact: true }).disabled, true);
    }
    assert.equal(within(group).getByRole("button", { name: "Heritage", exact: true }).disabled, false);
    fireEvent.keyDown(document, { key: "Escape" });

    click("MVP");
    await waitFor(() => assert.equal(document.querySelector(".geo-map")?.dataset.maturity, "MVP"));
    map = document.querySelector(".geo-map");
    assert.equal(map.querySelector(".geo-building-heights"), null);
    assert.equal(map.querySelector(".geo-building-footprints path").getAttribute("d"), flatFootprint);
    assert.ok(map.querySelector(".geo-mvp-coverage"));
    assert.ok(map.querySelector(".geo-traffic-overlay.visible"));
    assert.equal(map.querySelector(".geo-air.visible"), null, "environmental sensing is TARGET, not a current pilot source");
    assert.equal(map.querySelector(".geo-heat-overlay.visible"), null);
    assert.equal(map.querySelectorAll(".geo-synthetic-sensors .geo-sensor").length, 2);
    assert.deepEqual([...map.querySelectorAll(".geo-sensor-id")].map((node) => node.textContent).sort(), ["T12", "T14"]);
    assert.equal(map.querySelectorAll(".geo-sensor-parking,.geo-sensor-cooling").length, 0);
    const mvpTrafficLength = [...map.querySelectorAll(".geo-traffic-line")].reduce((sum, node) => sum + node.getAttribute("d").length, 0);
    click("Layers");
    group = screen.getByRole("group", { name: "Map layers" });
    assert.equal(within(group).getByRole("button", { name: "Urban Heat", exact: true }).disabled, true);
    assert.equal(within(group).getByRole("button", { name: "Air Quality", exact: true }).disabled, true);
    for (const name of ["Traffic", "Heritage", "Sensors"]) {
      assert.equal(within(group).getByRole("button", { name, exact: true }).disabled, false);
    }
    fireEvent.keyDown(document, { key: "Escape" });

    click("TARGET");
    await waitFor(() => assert.equal(document.querySelector(".geo-map")?.dataset.maturity, "TARGET"));
    map = document.querySelector(".geo-map");
    assert.ok(map.querySelector(".geo-building-heights"));
    assert.notEqual(map.querySelector(".geo-building-footprints path").getAttribute("d"), flatFootprint);
    assert.equal(map.querySelectorAll(".geo-synthetic-sensors .geo-sensor").length, 5);
    assert.ok(map.querySelector(".geo-sensor-parking"));
    const targetTrafficLength = [...map.querySelectorAll(".geo-traffic-line")].reduce((sum, node) => sum + node.getAttribute("d").length, 0);
    assert.ok(targetTrafficLength > mvpTrafficLength, "TARGET renders a broader traffic network than MVP");
    click("Layers");
    group = screen.getByRole("group", { name: "Map layers" });
    assert.equal(within(group).getAllByRole("button").filter((node) => node.disabled).length, 0);
    const heat = within(group).getByRole("button", { name: "Urban Heat", exact: true });
    assert.equal(heat.getAttribute("aria-pressed"), "false");
    fireEvent.click(heat);
    assert.ok(map.querySelector(".geo-heat-overlay.visible"));
    assert.equal(map.querySelectorAll(".geo-synthetic-sensors .geo-sensor").length, 8);
    fireEvent.keyDown(document, { key: "Escape" });
    click("Show 2D map");
    assert.equal(map.querySelector(".geo-building-heights"), null);
    assert.equal(map.dataset.maturity, "TARGET");
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
    click("KPI & Impact");
    expectBlankActual();
  },
);

test(
  "Digital Twin and Urban Heat retain the global maturity restrictions across navigation",
  { timeout: 15000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    click("CURRENT");
    click("Digital Twin");
    await waitFor(() => assert.equal(document.querySelectorAll(".twin-map-stage .geo-map[data-maturity='CURRENT']").length, 2));
    assert.equal(document.querySelectorAll(".twin-map-stage .geo-building-heights,.twin-map-stage .geo-synthetic-sensors,.twin-map-stage .geo-traffic-overlay").length, 0);
    click("MVP");
    await waitFor(() => assert.equal(document.querySelectorAll(".twin-map-stage .geo-map[data-maturity='MVP']").length, 2));
    assert.equal(document.querySelectorAll(".twin-map-stage .geo-building-heights").length, 0);
    // Twin deliberately hides point markers in both comparison halves; MVP
    // still renders only its permitted priority corridor traffic coverage.
    assert.equal(document.querySelectorAll(".twin-map-stage .geo-synthetic-sensors .geo-sensor").length, 0);
    assert.equal(document.querySelectorAll(".twin-map-stage .geo-traffic-overlay.visible").length, 2);
    assert.equal(document.querySelectorAll(".twin-map-stage .geo-mvp-coverage").length, 2);
    click("TARGET");
    await waitFor(() => assert.equal(document.querySelectorAll(".twin-map-stage .geo-map[data-maturity='TARGET']").length, 2));
    assert.equal(document.querySelectorAll(".twin-map-stage .geo-building-heights").length, 2);
    click("Urban Heat");
    await waitFor(() => assert.ok(document.querySelector(".heat-map .geo-map[data-maturity='TARGET']")));
    assert.ok(document.querySelector(".heat-map .geo-heat-overlay.visible"));
    assert.equal(document.querySelectorAll(".heat-map .geo-sensor-cooling").length, 0);
    click("MVP");
    assert.equal(document.querySelector(".heat-map .geo-map").dataset.maturity, "MVP");
    assert.equal(document.querySelector(".heat-map .geo-heat-overlay.visible"), null);
    assert.equal(document.querySelectorAll(".heat-map .geo-sensor-cooling").length, 0);
    click("CURRENT");
    assert.equal(document.querySelector(".heat-map .geo-map").dataset.maturity, "CURRENT");
    assert.equal(document.querySelector(".heat-map .geo-synthetic-sensors"), null);
    assert.equal(document.querySelector(".heat-map .geo-building-heights"), null);
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
  },
);

test(
  "workspace keyboard navigation, Escape, outside pointers and focus departure dismiss the menu",
  { timeout: 10000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    const trigger = button("City Control Room workspace menu");
    act(() => trigger.focus());
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const overview = screen.getByRole("menuitem", { name: "City overview" });
    await waitFor(() => assert.ok(document.activeElement === overview, "ArrowDown initially focuses City overview"));
    fireEvent.keyDown(overview, { key: "ArrowDown" });
    assert.ok(document.activeElement === screen.getByRole("menuitem", { name: "City map" }), "ArrowDown advances to City map");
    fireEvent.keyDown(document.activeElement, { key: "End" });
    assert.ok(document.activeElement === screen.getByRole("menuitem", { name: "Presentation Demo" }), "End focuses the final menu item");
    fireEvent.keyDown(document.activeElement, { key: "ArrowDown" });
    assert.ok(document.activeElement === overview, "ArrowDown wraps to first item");
    fireEvent.keyDown(overview, { key: "ArrowUp" });
    assert.ok(document.activeElement === screen.getByRole("menuitem", { name: "Presentation Demo" }), "ArrowUp wraps to final item");
    fireEvent.keyDown(document.activeElement, { key: "Home" });
    assert.ok(document.activeElement === overview, "Home focuses the first menu item");
    fireEvent.keyDown(overview, { key: "Escape" });
    assert.equal(screen.queryByRole("menu"), null);
    assert.ok(document.activeElement === trigger, "Escape restores workspace trigger focus");

    fireEvent.keyDown(trigger, { key: "ArrowUp" });
    await waitFor(() => assert.ok(document.activeElement === screen.getByRole("menuitem", { name: "Presentation Demo" }), "ArrowUp from trigger opens at final item"));
    fireEvent.pointerDown(document.body);
    assert.equal(screen.queryByRole("menu"), null);
    assert.equal(trigger.getAttribute("aria-expanded"), "false");

    fireEvent.click(trigger);
    await waitFor(() => assert.ok(document.activeElement === screen.getByRole("menuitem", { name: "City overview" }), "click opens at first item"));
    act(() => button("Evidence").focus());
    await waitFor(() => assert.ok(screen.queryByRole("menu") === null, "focus departure closes workspace menu"));
    assert.ok(document.activeElement === button("Evidence"), "focus departure is not trapped");
    assert.equal(screen.queryByText("Signal Plan H03"), null);
  },
);

test(
  "the Layers disclosure supports persistent multi-selection and closes on Escape or an outside pointer",
  { timeout: 10000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    const trigger = button("Layers");
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.equal(screen.queryByRole("group", { name: "Map layers" }), null);
    fireEvent.click(trigger);
    const group = screen.getByRole("group", { name: "Map layers" });
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.equal(document.getElementById(trigger.getAttribute("aria-controls")), group);
    assert.equal(within(group).getAllByRole("button").length, 5);
    const traffic = within(group).getByRole("button", { name: "Traffic", exact: true });
    const heat = within(group).getByRole("button", { name: "Urban Heat", exact: true });
    const air = within(group).getByRole("button", { name: "Air Quality", exact: true });
    assert.equal(traffic.getAttribute("aria-pressed"), "true");
    assert.equal(heat.getAttribute("aria-pressed"), "false");
    fireEvent.click(traffic);
    fireEvent.click(heat);
    assert.equal(traffic.getAttribute("aria-pressed"), "false");
    assert.equal(heat.getAttribute("aria-pressed"), "true");
    assert.equal(air.getAttribute("aria-pressed"), "true");
    assert.equal(trigger.getAttribute("aria-expanded"), "true");

    act(() => heat.focus());
    fireEvent.keyDown(heat, { key: "Escape" });
    assert.equal(screen.queryByRole("group", { name: "Map layers" }), null);
    assert.ok(document.activeElement === trigger, "Escape restores Layers trigger focus");
    fireEvent.click(trigger);
    const reopened = screen.getByRole("group", { name: "Map layers" });
    assert.equal(within(reopened).getByRole("button", { name: "Traffic", exact: true }).getAttribute("aria-pressed"), "false");
    assert.equal(within(reopened).getByRole("button", { name: "Urban Heat", exact: true }).getAttribute("aria-pressed"), "true");
    const outsideControl = button("Evidence");
    fireEvent.pointerDown(outsideControl);
    act(() => outsideControl.focus());
    assert.equal(screen.queryByRole("group", { name: "Map layers" }), null);
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
    assert.ok(document.activeElement === outsideControl, "outside dismissal preserves the clicked control's focus");
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
  },
);

test(
  "maturity help consumes Escape before presentation exit and restores its trigger focus",
  { timeout: 10000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    click("Presentation Demo");
    await waitFor(() => assert.ok(screen.getByText("City ready")), {
      timeout: 5000,
    });
    const maturityGroup = screen.getByRole("group", {
      name: "Operating model maturity",
    });
    const help = within(maturityGroup).getByRole("button", {
      name: "Explain maturity stages",
    });
    act(() => help.focus());
    fireEvent.click(help);
    assert.equal(help.getAttribute("aria-expanded"), "true");
    assert.ok(document.getElementById(help.getAttribute("aria-controls")));
    assert.equal(currentStep(), "Alert");
    fireEvent.keyDown(help, { key: "ArrowRight" });
    assert.equal(currentStep(), "Alert");

    fireEvent.keyDown(document, { key: "Escape" });
    assert.equal(document.querySelector(".maturity-popover"), null);
    assert.equal(help.getAttribute("aria-expanded"), "false");
    assert.ok(document.activeElement === help, "Escape returns focus to maturity help");
    assert.equal(currentStep(), "Alert");
    assert.ok(document.fullscreenElement === document.querySelector(".app-shell"), "dismissing help retains fullscreen presentation");
    fireEvent.keyDown(help, { key: "Escape" });
    assert.equal(document.querySelector(".presentation-current-step"), null);
    assert.equal(document.fullscreenElement, null);
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
  },
);

test(
  "the desktop sidebar starts as an icon rail and follows mouse hover without touch hover or mouse focus pinning it open",
  { timeout: 10000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    await waitFor(() => assert.ok(document.querySelector(".geo-camera")));
    const sidebar = document.querySelector(".sidebar.auto-hide-sidebar");
    assert.ok(sidebar);
    assert.equal(sidebar.dataset.expanded, "false");
    assert.equal(sidebar.classList.contains("is-expanded"), false);
    assert.ok(button("Overview"));

    fireEvent.pointerEnter(sidebar, { pointerType: "touch" });
    assert.equal(sidebar.dataset.expanded, "false");
    fireEvent.pointerLeave(sidebar, { pointerType: "touch" });
    assert.equal(sidebar.dataset.expanded, "false");
    fireEvent.pointerEnter(sidebar, { pointerType: "mouse" });
    assert.equal(sidebar.dataset.expanded, "true");
    assert.equal(sidebar.classList.contains("is-expanded"), true);
    fireEvent.pointerLeave(sidebar, { pointerType: "touch" });
    assert.equal(sidebar.dataset.expanded, "true", "touch hover events do not cancel mouse hover");
    fireEvent.pointerDown(button("Overview"), { pointerType: "mouse" });
    act(() => button("Overview").focus());
    assert.ok(document.activeElement === button("Overview"));
    fireEvent.pointerLeave(sidebar, {
      pointerType: "mouse",
      relatedTarget: document.querySelector(".main-shell"),
    });
    assert.equal(sidebar.dataset.expanded, "false");
    assert.equal(sidebar.classList.contains("is-expanded"), false);
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
  },
);

test(
  "keyboard focus keeps the sidebar expanded until focus leaves the navigation",
  { timeout: 10000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    const sidebar = document.querySelector(".sidebar.auto-hide-sidebar");
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => button("Overview").focus());
    assert.equal(sidebar.dataset.expanded, "true");
    fireEvent.pointerLeave(sidebar, { pointerType: "mouse" });
    assert.equal(sidebar.dataset.expanded, "true");
    act(() => button("Architecture").focus());
    assert.equal(sidebar.dataset.expanded, "true");
    act(() => button("Evidence").focus());
    assert.ok(document.activeElement === button("Evidence"));
    assert.equal(sidebar.dataset.expanded, "false");
    assert.equal(sidebar.classList.contains("is-expanded"), false);
  },
);

test(
  "pointer movement within the workspace menu retains the expanded sidebar and leaving the sidebar dismisses the menu",
  { timeout: 10000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    const sidebar = document.querySelector(".sidebar.auto-hide-sidebar");
    fireEvent.pointerEnter(sidebar, { pointerType: "mouse" });
    const trigger = button("City Control Room workspace menu");
    fireEvent.pointerDown(trigger, { pointerType: "mouse" });
    fireEvent.click(trigger);
    const menu = screen.getByRole("menu", {
      name: "City Control Room workspace menu",
    });
    await waitFor(() =>
      assert.ok(document.activeElement === within(menu).getByRole("menuitem", { name: "City overview" })),
    );
    fireEvent.pointerOut(sidebar, { pointerType: "mouse", relatedTarget: menu });
    fireEvent.pointerOver(menu, { pointerType: "mouse", relatedTarget: sidebar });
    assert.equal(sidebar.dataset.expanded, "true");
    assert.equal(trigger.getAttribute("aria-expanded"), "true");
    assert.ok(screen.queryByRole("menu"));

    fireEvent.pointerLeave(sidebar, {
      pointerType: "mouse",
      relatedTarget: document.querySelector(".main-shell"),
    });
    assert.equal(sidebar.dataset.expanded, "false");
    await waitFor(() => assert.ok(screen.queryByRole("menu") === null));
    assert.equal(trigger.getAttribute("aria-expanded"), "false");
  },
);

test(
  "touch navigation still uses its drawer and presentation keeps the sidebar collapsed",
  { timeout: 15000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    const sidebar = document.querySelector(".sidebar.auto-hide-sidebar");
    const open = button("Open navigation");
    fireEvent.pointerDown(open, { pointerType: "touch" });
    fireEvent.click(open);
    assert.equal(sidebar.classList.contains("open"), true);
    assert.equal(sidebar.dataset.expanded, "true");
    assert.ok(button("Close navigation"));
    fireEvent.pointerLeave(sidebar, { pointerType: "touch" });
    assert.equal(sidebar.classList.contains("open"), true);
    fireEvent.pointerDown(button("Architecture"), { pointerType: "touch" });
    fireEvent.click(button("Architecture"));
    assert.equal(document.querySelector(".page-heading h1").textContent, "Architecture");
    assert.equal(sidebar.classList.contains("open"), false);
    assert.equal(screen.queryByRole("button", { name: "Close navigation" }), null);

    fireEvent.pointerDown(open, { pointerType: "touch" });
    fireEvent.click(open);
    fireEvent.pointerDown(button("Close navigation"), { pointerType: "touch" });
    fireEvent.click(button("Close navigation"));
    assert.equal(sidebar.classList.contains("open"), false);
    fireEvent.pointerEnter(sidebar, { pointerType: "mouse" });
    assert.equal(sidebar.dataset.expanded, "true");
    click("Presentation Demo");
    await waitFor(() => assert.ok(screen.getByText("City ready")), { timeout: 5000 });
    assert.equal(document.querySelector(".app-shell").classList.contains("is-presenting"), true);
    assert.equal(sidebar.dataset.expanded, "false");
    assert.equal(sidebar.classList.contains("open"), false);
    fireEvent.pointerEnter(sidebar, { pointerType: "mouse" });
    assert.equal(sidebar.dataset.expanded, "false");
    assert.equal(currentStep(), "Alert");
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
    click("Exit presentation");
    assert.equal(sidebar.dataset.expanded, "false");
    fireEvent.pointerEnter(sidebar, { pointerType: "mouse" });
    assert.equal(sidebar.dataset.expanded, "true");
  },
);

const endUiCase = (t) => t.after(() => {
  cleanup();
  fullscreenElement = null;
  delete globalThis.__greenpulseTestMap;
});
const alertArticle = (title) => screen.getByRole("button", { name: title, exact: true }).closest("article");
const assertNoOperationalAuthority = () => {
  for (const title of ["Signal Plan H03", "ZTL Plan H03", "Route Guidance H03"]) assert.ok(screen.queryByText(title) === null, "no intervention is active without human approval");
  assert.ok(screen.queryByText("MEASURED · SYNTHETIC OUTCOME") === null, "no measured outcome exists before measurement");
};

test("modified plans require a new acknowledged review and do not inherit the reference impact", { timeout: 15000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("Digital Twin");
  click("Review & approve");
  const dialog = screen.getByRole("dialog", { name: "Approve intervention" });
  assert.equal(button("Approve intervention").disabled, true);
  reviewCurrentPlan();
  assert.ok(within(dialog).getByText("K1 · PILOT / CONDITIONAL · CORRIDOR TRAVEL TIME"));
  const oldVersion = Number(within(dialog).getByText(/^V\d+$/).textContent.slice(1));
  click("Modify");
  fireEvent.change(within(dialog).getByLabelText("Operating window"), { target: { value: "30" } });
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Include targeted route guidance" }));
  assert.equal(button("Approve intervention").disabled, true);
  assert.equal(within(dialog).queryByText("K1 · PILOT / CONDITIONAL · CORRIDOR TRAVEL TIME"), null);
  assert.ok(within(dialog).getByRole("heading", { name: "Forecast requires review" }));
  assert.ok(within(dialog).getByText("No updated numerical benefit estimate"));
  assert.equal(button("Record plan review").disabled, true);
  fireEvent.click(button("Approve intervention"));
  assertNoOperationalAuthority();
  reviewCurrentPlan();
  const version = Number(within(dialog).getByText(/^V\d+$/).textContent.slice(1));
  assert.equal(version, oldVersion + 1);
  fireEvent.change(within(dialog).getByLabelText(/Operator note/), { target: { value: "Thirty-minute plan, signal timing only." } });
  assert.equal(button("Approve intervention").disabled, false, "a note does not change the reviewed intervention");
  click("Approve intervention");
  executeApprovedPlan();
  assert.ok(screen.getByText("Signal Plan H03"));
  assert.ok(screen.getByText(`Approved plan v${version}`));
  click("Decision Log");
  assert.ok(screen.getByText(/Operating window: 30 minutes · Route guidance: excluded/));
  assert.ok(screen.getByText(new RegExp(`Review v${version} · Model`)));
  assert.equal(screen.getAllByText("Human modification recorded · approval required").length, 2, "each reviewed plan modification is logged");
  click("Digital Twin");
  assert.ok(screen.getByText("These reference numbers do not describe the approved modified plan."));
  assert.equal(button("Modified plan approved · unestimated").disabled, true);
  click("Overview");
  click("Close Intervention");
  click("Close & measure");
  assert.ok(screen.getByText(/^MEASURING OUTCOME/));
  const trips = screen.getByLabelText(/^Observed trip durations \(minutes\)/);
  assert.equal(trips.disabled, true);
  await completePilotWindow();
  assert.ok(screen.getAllByText("No data").length);
  expectBlankActual();
  fireEvent.change(trips, { target: { value: "16, 17" } });
  assert.equal(document.querySelector(".kw-actual-summary strong").textContent, "16.5 min");
  assert.equal(screen.queryByText("1.82%"), null, "reference forecast error is not attributed to a modified plan");
  assert.equal(screen.queryByText("−10.8%"), null);
  assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
});

test("traffic source failure blocks the traffic pilot without making AQ a ZTL approval prerequisite", { timeout: 15000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("Data Health");
  click("Inspect Traffic T12–T18, Healthy");
  click("Simulate outage");
  assert.ok(screen.getByText("H-03 BLOCKED"));
  click("Digital Twin");
  click("Review & approve");
  let dialog = screen.getByRole("dialog", { name: "Approve intervention" });
  assert.equal(button("Approve intervention").disabled, true);
  assert.ok(within(dialog).getByRole("heading", { name: "Required data unavailable" }));
  fireEvent.click(button("Approve intervention"));
  assertNoOperationalAuthority();
  click("Inspect data health");
  click("Restore source");
  assert.ok(screen.getByText("H-03 READY"));
  click("Inspect AQ-04, Healthy");
  click("Simulate outage");
  assert.ok(screen.getByText("H-03 READY"));
  click("Digital Twin");
  click("Review & approve");
  reviewCurrentPlan();
  assert.equal(button("Approve intervention").disabled, false);
  click("Cancel");
  click("ZTL Access");
  click("Review ZTL proposal");
  dialog = screen.getByRole("dialog", { name: "Approve intervention" });
  assert.equal(within(dialog).queryByRole("checkbox", { name: /air-quality evidence/ }), null);
  assert.match(dialog.textContent, /Aggregate entries/);
  click("Cancel");
  assertNoOperationalAuthority();
});

test("the optional AQ-07 outage changes coverage without blocking required H-03 evidence", { timeout: 10000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("Data Health");
  click("Inspect AQ-07, Offline");
  assert.ok(screen.getByText("Does not block H-03 approval"));
  click("Restore source");
  assert.match(document.querySelector(".quality-coverage").textContent, /^15/);
  click("Simulate outage");
  assert.match(document.querySelector(".quality-coverage").textContent, /^14/);
  assert.ok(screen.getByText("H-03 READY"));
  assert.ok(screen.getByText("Does not block H-03 approval"));
  click("Digital Twin");
  click("Review & approve");
  assert.equal(button("Approve intervention").disabled, true);
  reviewCurrentPlan();
  assert.ok(screen.getByText("K1 · PILOT / CONDITIONAL · CORRIDOR TRAVEL TIME"));
  click("Cancel");
  assertNoOperationalAuthority();
});

test("alert acknowledgement, assignment, filters and AQ-07 navigation share source state and explicit closure", { timeout: 15000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("Alert Center");
  let traffic = alertArticle("Recurring queue at a monitored location");
  assert.equal(within(traffic).getByRole("button", { name: "Review & resolve" }).disabled, true);
  fireEvent.click(within(traffic).getByRole("button", { name: "Acknowledge", exact: true }));
  fireEvent.change(within(traffic).getByLabelText("Owner for INC-2026-1109-H03"), { target: { value: "Environment / Urban Planning" } });
  assert.equal(within(traffic).getByLabelText("Owner for INC-2026-1109-H03").value, "Environment / Urban Planning");
  assert.ok(within(traffic).getByRole("button", { name: "Acknowledged", exact: true }).disabled);
  assertNoOperationalAuthority();
  fireEvent.change(screen.getByLabelText("Search alerts"), { target: { value: "AQ-07" } });
  assert.ok(screen.getByText("1 shown"));
  let sourceAlert = alertArticle("AQ-07 Scheduled Maintenance");
  fireEvent.click(within(sourceAlert).getByRole("button", { name: "Inspect data health" }));
  assert.ok(within(document.querySelector(".quality-inspector")).getByRole("heading", { name: "AQ-07", exact: true }));
  assert.equal(button("Inspect AQ-07, Offline").getAttribute("aria-pressed"), "true");
  click("Restore source");
  click("Alert Center");
  sourceAlert = alertArticle("AQ-07 Scheduled Maintenance");
  assert.ok(within(sourceAlert).getByText("SOURCE RESTORED"));
  assert.equal(within(sourceAlert).getByRole("button", { name: "Review & resolve" }).disabled, true);
  fireEvent.click(within(sourceAlert).getByRole("button", { name: "Acknowledge", exact: true }));
  fireEvent.click(within(sourceAlert).getByRole("button", { name: "Review & resolve" }));
  const review = within(sourceAlert).getByRole("region", { name: "Resolution review for DATA-AQ07-M01" });
  assert.equal(within(review).getByRole("button", { name: "Confirm resolution" }).disabled, true);
  fireEvent.change(within(review).getByLabelText(/Review note/), { target: { value: "Restored backup source reviewed." } });
  fireEvent.click(within(review).getByRole("checkbox", { name: /I reviewed the evidence/ }));
  fireEvent.click(within(review).getByRole("button", { name: "Confirm resolution" }));
  assert.equal(screen.queryByRole("button", { name: "AQ-07 Scheduled Maintenance", exact: true }), null);
  assert.match(document.querySelector(".gp-alert-count").textContent, /2 open.*1 closed/);
  assert.equal(document.querySelector(".nav-count"), null, "secondary alert tools do not add an unrequested main navigation section");
  fireEvent.change(screen.getByLabelText("Alert status"), { target: { value: "all" } });
  sourceAlert = alertArticle("AQ-07 Scheduled Maintenance");
  assert.ok(within(sourceAlert).getByText("Resolved after review"));
  assert.match(sourceAlert.textContent, /Restored backup source reviewed/);
  fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "critical" } });
  assert.ok(screen.getByText("1 shown"));
  assert.ok(alertArticle("Recurring queue at a monitored location"));
  click("Data Health");
  click("Inspect AQ-07, Healthy");
  click("Simulate outage");
  click("Alert Center");
  sourceAlert = alertArticle("AQ-07 Scheduled Maintenance");
  assert.ok(within(sourceAlert).getByText("New"));
  assert.equal(document.querySelector(".nav-count"), null);
  assert.match(document.querySelector(".gp-alert-count").textContent, /3 open/);
  assert.equal(within(sourceAlert).getByRole("button", { name: "Acknowledge", exact: true }).disabled, false);
  assert.equal(within(sourceAlert).getByRole("button", { name: "Review & resolve" }).disabled, true);
  fireEvent.click(within(sourceAlert).getByRole("button", { name: "Acknowledge", exact: true }));
  assert.equal(within(sourceAlert).getByRole("button", { name: "Review & resolve" }).disabled, true, "acknowledgement alone does not restore the unavailable source");
  fireEvent.click(within(sourceAlert).getByRole("button", { name: "Inspect data health" }));
  click("Restore source");
  click("Alert Center");
  sourceAlert = alertArticle("AQ-07 Scheduled Maintenance");
  assert.ok(within(sourceAlert).getByRole("button", { name: "Acknowledged", exact: true }).disabled);
  assert.equal(within(sourceAlert).getByRole("button", { name: "Review & resolve" }).disabled, false);
  assertNoOperationalAuthority();
});

test("the traffic alert follows intervention and measurement but requires a separate human outcome closure", { timeout: 20000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("Alert Center");
  let alert = alertArticle("Recurring queue at a monitored location");
  fireEvent.click(within(alert).getByRole("button", { name: "Acknowledge", exact: true }));
  fireEvent.click(within(alert).getByRole("button", { name: "Review incident" }));
  click("Explore target scenarios");
  click("Review & approve");
  approveCurrentPlan();
  click("Alert Center");
  alert = alertArticle("Recurring queue at a monitored location");
  assert.ok(within(alert).getByText("In progress"));
  assert.equal(within(alert).getByRole("button", { name: "Review & resolve" }).disabled, true);
  click("Overview");
  click("Pause");
  click("Alert Center");
  assert.ok(within(alertArticle("Recurring queue at a monitored location")).getByText("Paused"));
  click("Overview");
  click("Resume");
  click("Close Intervention");
  click("Close & measure");
  click("Alert Center");
  alert = alertArticle("Recurring queue at a monitored location");
  assert.ok(within(alert).getByText("Measuring outcome"));
  assert.equal(within(alert).getByRole("button", { name: "Review & resolve" }).disabled, true);
  await waitFor(() => assert.ok(within(alertArticle("Recurring queue at a monitored location")).getByText("Awaiting outcome review")), { timeout: 7000 });
  assert.match(document.querySelector(".gp-alert-count").textContent, /3 open.*0 closed/);
  alert = alertArticle("Recurring queue at a monitored location");
  fireEvent.click(within(alert).getByRole("button", { name: "Review & resolve" }));
  const review = within(alert).getByRole("region", { name: "Resolution review for INC-2026-1109-H03" });
  assert.equal(within(review).getByRole("button", { name: "Confirm resolution" }).disabled, true);
  fireEvent.click(within(review).getByRole("checkbox", { name: /I reviewed the evidence/ }));
  fireEvent.click(within(review).getByRole("button", { name: "Confirm resolution" }));
  assert.equal(screen.queryByRole("button", { name: "Recurring queue at a monitored location", exact: true }), null);
  assert.equal(document.querySelector(".nav-count"), null, "secondary alert tools do not add an unrequested main navigation section");
  click("Overview");
  assert.equal(document.querySelector(".alert-stat strong").textContent, "2");
});

test("map and scenario view choices survive navigation and reload without restoring approval authority", { timeout: 15000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  await waitFor(() => assert.ok(document.querySelector(".geo-camera")));
  click("Select Leuven Historic Centre H-03 scenario");
  click("Zoom in");
  const focusedCamera = document.querySelector(".geo-camera").getAttribute("transform");
  click("Data Health");
  click("Overview");
  await waitFor(() => assert.ok(document.querySelector(".geo-camera")));
  assert.equal(document.querySelector(".geo-camera").getAttribute("transform"), focusedCamera, "returning to a focused incident preserves the operator's zoom");
  click("Show whole city");
  click("Show 2D map");
  click("Zoom in");
  click("Scenario air-quality station AQ-04");
  const overviewCamera = document.querySelector(".geo-camera").getAttribute("transform");
  assert.equal(document.querySelector(".geo-sensor-air").getAttribute("aria-pressed"), "true");
  click("Data Health");
  click("Inspect AQ-07, Offline");
  click("City Map");
  await waitFor(() => assert.ok(document.querySelector(".geo-camera")));
  assert.equal(document.querySelector(".geo-camera").getAttribute("transform"), overviewCamera);
  assert.equal(document.querySelector(".geo-building-heights"), null);
  assert.equal(document.querySelector(".geo-sensor-air").getAttribute("aria-pressed"), "true");
  assert.ok(button("Close sensor details"));
  click("Digital Twin");
  await waitFor(() => assert.equal(cameraTransforms().length, 2));
  fireEvent.click(screen.getByRole("button", { name: /^Scenario C,/ }));
  const slider = screen.getByRole("slider", { name: "Drag to compare before and after" });
  fireEvent.change(slider, { target: { value: "67" } });
  click("Zoom in comparison maps");
  click("Show comparison in 2D");
  click("Pan both maps");
  fireEvent.keyDown(screen.getByRole("application", { name: "Pan both comparison maps" }), { key: "ArrowRight" });
  const twinCamera = cameraTransforms();
  click("Overview");
  await waitFor(() => assert.ok(document.querySelector(".geo-camera")));
  assert.equal(document.querySelector(".geo-camera").getAttribute("transform"), overviewCamera);
  assert.equal(document.querySelector(".geo-sensor-air").getAttribute("aria-pressed"), "true");
  click("Digital Twin");
  await waitFor(() => assert.equal(cameraTransforms().length, 2));
  assert.equal(screen.getByRole("button", { name: /^Scenario C,/ }).getAttribute("aria-pressed"), "true");
  assert.equal(document.querySelector(".twin-comparison-input").value, "67");
  assert.equal(document.querySelector(".twin-comparison-input").hidden, true);
  assert.deepEqual(cameraTransforms(), twinCamera);
  assert.equal(button("Drag comparison").getAttribute("aria-pressed"), "true");
  assert.equal(document.querySelectorAll(".twin-map-stage .geo-building-heights").length, 0);
  click("View recommended scenario");
  // Selecting another scenario intentionally recentres the divider. Retain a
  // new explicit user choice before checking the subsequent session restore.
  click("Drag comparison");
  fireEvent.change(screen.getByRole("slider", { name: "Drag to compare before and after" }), { target: { value: "67" } });
  click("Pan both maps");
  click("Review & approve");
  approveCurrentPlan();
  assert.ok(screen.getByText("Signal Plan H03"));
  cleanup();
  render(React.createElement(App));
  await waitFor(() => assert.ok(document.querySelector(".geo-camera")));
  assert.equal(document.querySelector(".geo-camera").getAttribute("transform"), overviewCamera);
  assert.equal(document.querySelector(".geo-sensor-air").getAttribute("aria-pressed"), "true");
  assertNoOperationalAuthority();
  click("Data Health");
  assert.equal(button("Inspect AQ-07, Offline").getAttribute("aria-pressed"), "true");
  click("Digital Twin");
  await waitFor(() => assert.equal(cameraTransforms().length, 2));
  assert.deepEqual(cameraTransforms(), twinCamera);
  assert.equal(document.querySelector(".twin-comparison-input").value, "67");
  assert.equal(button("Drag comparison").getAttribute("aria-pressed"), "true");
  click("Drag comparison");
  assert.equal(screen.getByRole("slider", { name: "Drag to compare before and after" }).value, "67");
  assert.equal(button("Review & approve").disabled, false);
  click("KPI & Impact");
  expectBlankActual();
});

const controlledGeography = () => {
  const requests = [];
  globalThis.__greenpulseTestMap = {
    request(kind) {
      return new Promise((resolve, reject) => requests.push({ kind, resolve, reject }));
    },
  };
  return requests;
};

test("failed presentation preparation blocks progression until a successful explicit retry", { timeout: 10000 }, async (t) => {
  endUiCase(t);
  const requests = controlledGeography();
  render(React.createElement(FaultApp));
  click("Presentation Demo");
  assert.equal(button("Next Step").disabled, true);
  assert.equal(requests[0].kind, "preload");
  await act(async () => requests[0].reject(new Error("Synthetic map load failure")));
  assert.ok(screen.getByText("Model unavailable"));
  assert.equal(button("Next Step").disabled, true);
  fireEvent.keyDown(document, { key: "ArrowRight" });
  assert.equal(currentStep(), "Alert");
  click("Retry preparation");
  assert.equal(requests[1].kind, "retry");
  assert.equal(button("Next Step").disabled, true);
  await act(async () => requests[1].resolve({ views: 2 }));
  assert.ok(screen.getByText("City ready"));
  assert.equal(button("Next Step").disabled, false);
  assert.equal(currentStep(), "Alert");
  assertNoOperationalAuthority();
  click("Next Step");
  assert.ok(screen.getByRole("dialog", { name: "Evidence → design" }));
});

test("text-only recovery keeps human approval mandatory and later map retries preserve the approved decision", { timeout: 15000 }, async (t) => {
  endUiCase(t);
  const requests = controlledGeography();
  render(React.createElement(FaultApp));
  click("Presentation Demo");
  await act(async () => requests[0].reject(new Error("Synthetic offline map")));
  click("Continue without map");
  assert.ok(screen.getByText("Text-only demo"));
  assert.ok(screen.getByText("Geographic view unavailable"));
  assert.equal(screen.queryByTestId("controlled-city-map"), null);
  click("Next Step");
  click("Next Step");
  click("Next Step");
  assert.equal(currentStep(), "Scenarios");
  assert.ok(screen.getByRole("region", { name: "Text-only scenario comparison" }));
  click("Next Step");
  assert.ok(screen.getByRole("dialog", { name: "Approve intervention" }));
  click("Cancel");
  click("Next Step");
  assertNoOperationalAuthority();
  approveCurrentPlan();
  assert.equal(currentStep(), "Authorised execution");
  assert.ok(screen.getByText("Signal Plan H03"));
  click("Retry preparation");
  assert.equal(button("Next Step").disabled, true);
  await act(async () => requests[1].reject(new Error("Synthetic retry failure")));
  assert.ok(screen.getByText("Signal Plan H03"));
  assert.equal(currentStep(), "Authorised execution");
  click("Retry preparation");
  await act(async () => requests[2].resolve({ views: 2 }));
  assert.ok(screen.getByText("City ready"));
  assert.ok(screen.getByText("Signal Plan H03"));
  assert.ok(screen.getByText("MONITORING"));
  assert.equal(currentStep(), "Authorised execution");
  assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
  click("Decision Log");
  assert.equal(screen.getAllByText(/^Human approval recorded/).length, 1);
});

test("the actual map error boundary retries locally while preserving its parent view context", { timeout: 10000 }, async (t) => {
  endUiCase(t);
  const originalError = console.error;
  const expectedErrors = [];
  console.error = (...args) => expectedErrors.push(args);
  t.after(() => {
    console.error = originalError;
    delete globalThis.__greenpulseRendererFails;
  });
  globalThis.__greenpulseRendererFails = true;
  const camera = { zoom: 1.9, x: -140, y: 80 };
  render(React.createElement(RetryCityMap, {
    camera,
    viewMode: "2d",
    selectedEntity: { id: "AQ-04" },
    viewResetToken: 4,
  }));
  await waitFor(() => assert.ok(document.querySelector(".geo-loading-failed")));
  assert.ok(button("Retry geographic model"));
  globalThis.__greenpulseRendererFails = false;
  click("Retry geographic model");
  await waitFor(() => assert.ok(screen.getByTestId("recovered-geography")));
  const recovered = screen.getByTestId("recovered-geography");
  assert.deepEqual(JSON.parse(recovered.dataset.camera), camera);
  assert.equal(recovered.dataset.viewMode, "2d");
  assert.equal(recovered.dataset.entity, "AQ-04");
  assert.equal(document.querySelector(".geo-loading-failed"), null);
  assert.ok(expectedErrors.some(args => args.some(value => String(value).includes("Expected geographic renderer failure"))));
  assertNoOperationalAuthority();
});


test("ZTL actions require Police, legal and privacy approval before separate human execution", { timeout: 12000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("ZTL Access");
  assert.match(document.querySelector(".main-shell").textContent, /Recorded entries are not automatically violations/);
  assert.match(document.querySelector(".main-shell").textContent, /permit.*exemption/i);
  click("Review ZTL proposal");
  const dialog = screen.getByRole("dialog", { name: "Approve intervention" });
  const scope = within(dialog);
  assert.equal(button("Approve intervention").disabled, true);
  for (const name of ["Residents", "Emergency vehicles", "People with disabilities", "Deliveries", "Public transport"]) assert.equal(scope.getByRole("checkbox", { name, exact: true }).checked, true);
  for (const name of ["Pedestrian safety and crossing delay reviewed", "Bus punctuality and access reviewed", "Residential congestion displacement reviewed", "Historic-centre compatibility reviewed", "Time-limited trial and rollback plan reviewed", "Aggregate entries reviewed by gate and period; entries are not automatically violations", "I understand this action-specific or modified plan has no numerical forecast"]) checkIfNeeded(name, scope);
  click("Record plan review");
  fireEvent.change(scope.getByLabelText("Acting as the proposed approving authority"), { target: { value: "Mobility Department" } });
  assert.equal(button("Approve intervention").disabled, true, "Mobility alone cannot approve Police legal action");
  fireEvent.change(scope.getByLabelText("Acting as the proposed approving authority"), { target: { value: "Municipal Police" } });
  checkIfNeeded("I confirm this synthetic decision as the proposed approving authority", scope);
  assert.equal(button("Approve intervention").disabled, true);
  checkIfNeeded("Municipal Police operational review confirmed for this synthetic ZTL decision", scope);
  checkIfNeeded("Established legal procedure reviewed; no automatic ZTL rule changes", scope);
  assert.equal(button("Approve intervention").disabled, true, "legal acknowledgement alone does not complete privacy review");
  checkIfNeeded("Authorised privacy review confirmed; no identifiable licence-plate records", scope);
  assert.equal(button("Approve intervention").disabled, false);
  click("Approve intervention");
  assert.equal(screen.queryByText("MONITORING"), null);
  executeApprovedPlan();
  assert.ok(screen.getByText("MONITORING"));
  click("Handover");
  const handover = within(screen.getByRole("dialog", { name: "Handover intervention" }));
  assert.ok(handover.getByText("ZTL ACCESS REVIEW H03", { exact: true }));
  assert.match(handover.getByLabelText("Handover note").value, /aggregate gate entries.*legal procedure/);
  assert.doesNotMatch(handover.getByLabelText("Handover note").value, /NO₂|signal plan/i);
  assert.match(handover.getByText(/Receiving role:/).textContent, /Municipal Police/);
  fireEvent.click(handover.getByRole("button", { name: "Confirm handover", exact: true }));
  click("Decision Log");
  assert.match(document.querySelector(".decision-log-screen").textContent, /Municipal Police/);
  assert.ok(screen.getByText("Human legal-process execution recorded · synthetic only"));
});

test("K7 distinguishes a pending result from a documented inconclusive window without claiming measured benefit", { timeout: 12000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("Digital Twin");
  click("Review & approve");
  approveCurrentPlan();
  click("KPI & Impact");
  selectKpi("K7");
  assert.match(document.querySelector(".kw-primary-result").textContent, /0%.*0.*complete.*1.*recorded/);
  assert.match(screen.getByRole("region", { name: "Decision record coverage" }).textContent, /Missing: result\.status/);
  selectKpi("K4");
  assert.ok(screen.getByText("The recorded demo decision is within the illustrative pilot target."));
  click("Overview");
  click("Close Intervention");
  click("Close & measure");
  await completePilotWindow();
  expectBlankActual();
  selectKpi("K7");
  assert.match(document.querySelector(".kw-primary-result").textContent, /100%.*1.*complete.*1.*recorded/);
  assert.ok(within(screen.getByRole("region", { name: "Decision record coverage" })).getByText("inconclusive"));
  assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
});

test("heat preparedness requires Civil Protection and records human actions without inventing local exposure", { timeout: 18000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("Heat Preparedness");
  assert.match(document.querySelector(".main-shell").textContent, /No documented local temperature \/ humidity sensor network/);
  assert.match(document.querySelector(".main-shell").textContent, /No validated cooling-point inventory/);
  click("CURRENT");
  assert.equal(button("Review preparedness response").disabled, true);
  click("MVP");
  assert.equal(button("Review preparedness response").disabled, false, "manual preparedness can be piloted without pretending local sensors exist");
  click("Review preparedness response");
  const scope = within(screen.getByRole("dialog", { name: "Review heat preparedness" }));
  assert.equal(button("Approve & activate preparedness").disabled, true);
  fireEvent.change(scope.getByLabelText("Approval authority"), { target: { value: "Civil Protection" } });
  fireEvent.change(scope.getByLabelText("Accountable Civil Protection approver"), { target: { value: "Civil Protection Duty Officer #01" } });
  for (const name of ["Official forecast source, issue time and coverage reviewed", "Aggregated territorial information and indicative priority areas reviewed", "Social Services outreach and support arrangements reviewed", "Accessibility and protected access reviewed", "Civil Protection safety and escalation procedures reviewed"]) checkIfNeeded(name, scope);
  assert.equal(button("Approve & activate preparedness").disabled, true);
  fireEvent.click(button("Approve & activate preparedness"));
  assert.equal(screen.queryByRole("button", { name: "Pause preparedness", exact: true }), null);
  checkIfNeeded("I am the accountable Civil Protection approver and authorise this synthetic preparedness response.", scope);
  assert.equal(button("Approve & activate preparedness").disabled, false);
  click("Approve & activate preparedness");
  assert.ok(button("Pause preparedness"));
  click("Pause preparedness");
  assert.ok(button("Resume preparedness"));
  click("Resume preparedness");
  click("Close for post-event review");
  assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
  click("KPI Framework");
  selectKpi("K5");
  assert.ok(within(document.querySelector(".kw-primary-result")).getAllByText("No data").length);
  assert.match(document.querySelector(".kw-detail").textContent, /TARGET/);
  selectKpi("K6");
  assert.ok(within(document.querySelector(".kw-primary-result")).getAllByText("No data").length);
  click("Decision Log");
  assert.match(document.querySelector(".decision-log-screen").textContent, /Civil Protection/);
});

test("CURRENT inventory cannot activate a target-state traffic plan even with reviewed synthetic safeguards", { timeout: 10000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("CURRENT");
  click("Digital Twin");
  click("Review & approve");
  const dialog = screen.getByRole("dialog", { name: "Approve intervention" });
  const scope = within(dialog);
  for (const name of ["Pedestrian safety and crossing delay reviewed", "Bus punctuality and access reviewed", "Residential congestion displacement reviewed", "Historic-centre compatibility reviewed", "Time-limited trial and rollback plan reviewed", "Synthetic queue-pattern trigger reviewed; municipal operating threshold remains to be agreed"]) checkIfNeeded(name, scope);
  fireEvent.change(scope.getByLabelText("Acting as the proposed approving authority"), { target: { value: "Mobility Department" } });
  checkIfNeeded("I confirm this synthetic decision as the proposed approving authority", scope);
  assert.equal(button("Record plan review").disabled, true);
  assert.equal(button("Approve intervention").disabled, true);
  fireEvent.click(button("Approve intervention"));
  assertNoOperationalAuthority();
  click("Cancel");
  click("TARGET");
  click("Review & approve");
  assert.equal(button("Approve intervention").disabled, true, "maturity change does not confer authority confirmation");
  reviewCurrentPlan();
  assertNoOperationalAuthority();
});

test("a declined recommendation records the human reason without activating an intervention", { timeout: 10000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  click("Digital Twin");
  click("Review & approve");
  click("Record override");
  assert.equal(button("Record override decision").disabled, true);
  fireEvent.change(screen.getByLabelText("Override reason"), { target: { value: "Defer until the pedestrian crossing review is independently verified." } });
  click("Record override decision");
  assert.equal(screen.queryByRole("dialog", { name: "Approve intervention" }), null);
  assertNoOperationalAuthority();
  click("Decision Log");
  assert.ok(screen.getByText("Recommendation rejected · human decision recorded"));
  assert.ok(screen.getByText("Defer until the pedestrian crossing review is independently verified."));
  click("KPI & Impact");
  selectKpi("K7");
  assert.match(document.querySelector(".kw-primary-result").textContent, /100%.*1.*complete.*1.*recorded/);
  assertNoOperationalAuthority();
});

test("Daily Traffic KPI impact links open the requested indicator", { timeout: 12000 }, async (t) => {
  endUiCase(t);
  render(React.createElement(App));
  const titles = { K1: "Pilot corridor travel time and delay", K2: "Estimated tailpipe CO₂ avoided", K4: "Alert-to-decision time", K7: "Decisions fully recorded" };
  for (const [id, title] of Object.entries(titles)) {
    fireEvent.click(within(screen.getByRole("navigation", { name: "Main navigation" })).getByRole("button", { name: "Daily Traffic", exact: true }));
    const kpis = within(document.querySelector(".ucb-kpis"));
    fireEvent.click(kpis.getByRole("button", { name: id, exact: true }));
    assert.equal(document.querySelector(".page-heading h1").textContent, "KPI Framework");
    assert.equal(document.querySelector(".kw-detail-heading h2").textContent, title);
    assert.match(document.querySelector(".kw-detail-heading .kw-overline").textContent, new RegExp(`^${id} /`));
  }
  assertNoOperationalAuthority();
});
