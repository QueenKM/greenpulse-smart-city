import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir(new URL("../work/", import.meta.url), { recursive: true });
await build({
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
});
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
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
const { render, screen, fireEvent, waitFor, cleanup, within } = await import(
  "@testing-library/react"
);
const { default: App } = await import("../work/App.test.mjs");
const button = (name) => screen.getByRole("button", { name, exact: true });
const click = (name) => fireEvent.click(button(name));

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
    assert.notEqual(geographyCamera.getAttribute("transform"), originalCamera);
    click("Reset map view");
    assert.equal(geographyCamera.getAttribute("transform"), originalCamera);
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
      assert.ok(screen.getAllByRole("heading", { name, exact: true }).length);
    }
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
    click("Compare scenarios");
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
    click("Approve & Activate");
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
    assert.ok(screen.getByText("MEASURING OUTCOME"));
    assert.equal(screen.queryByText("−10.8%"), null);
    await waitFor(() => assert.ok(screen.getByText("−10.8%")), {
      timeout: 7000,
    });
    assert.ok(screen.getByText("MEASURED · SYNTHETIC OUTCOME"));
    click("Decision Log");
    assert.ok(screen.getByText("Approved & activated · Scenario B"));
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
    click("Presentation Demo Follow the decision journey");
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
    click("Approve & Activate");
    assert.ok(screen.getByText("Signal Plan H03"));
    click("Next Step");
    assert.ok(screen.getByText("MEASURING OUTCOME"));
    assert.equal(screen.queryByText("−10.8%"), null);
    await waitFor(() => assert.ok(screen.getByText("−10.8%")), {
      timeout: 7000,
    });
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
    assert.ok(button("Compare scenarios"));
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
    assert.match(
      document.querySelector(".gp-incident-forecast-value").textContent,
      /^76%/,
    );
    click("Traffic & Emissions");
    assert.equal(
      button("Show forecast in 15 minutes").getAttribute("aria-pressed"),
      "true",
    );
    assert.match(document.querySelector(".forecast-big").textContent, /^76/);
    click("Show forecast in 30 minutes");
    assert.match(document.querySelector(".forecast-big").textContent, /^80/);
    click("Digital Twin");
    await waitFor(() => assert.equal(cameraTransforms().length, 2));
    assert.equal(
      button("Show forecast in 30 minutes").getAttribute("aria-pressed"),
      "true",
    );
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
    click("Presentation Demo Follow the decision journey");
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
    assert.equal(currentStep(), "Prediction");
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
    click("Approve & Activate");
    assert.equal(currentStep(), "Intervention");
    assert.ok(screen.getByText("Signal Plan H03"));
    click("Exit full screen");
    assert.equal(document.fullscreenElement, null);
    assert.equal(currentStep(), "Intervention");
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
    click("Presentation Demo Follow the decision journey");
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
      click("Presentation Demo Follow the decision journey");
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
  "pending impact explains its synthetic KPI arithmetic without activating or measuring an intervention",
  { timeout: 10000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    click("KPI & Impact");
    assert.ok(screen.getByText("OUTCOME NOT YET MEASURED"));
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);

    const explanation = button("KPI calculation & assumptions");
    explanation.focus();
    fireEvent.click(explanation);
    const dialog = screen.getByRole("dialog", {
      name: "How impact is calculated",
    });
    const congestionExample = within(dialog)
      .getByRole("heading", { name: "Congestion index", exact: true })
      .closest("article");
    assert.ok(congestionExample);
    assert.ok(within(congestionExample).getByText("72", { selector: "dd" }));
    assert.ok(
      within(congestionExample).getByText("64.224", { selector: "dd" }),
    );
    assert.ok(within(congestionExample).getByText("10.8%"));
    assert.ok(within(dialog).getByText("10.8% relative reduction"));
    assert.ok(
      within(dialog).getByRole("heading", {
        name: "Scenario comparison ≠ measurement benchmark",
      }),
    );
    assert.ok(
      within(dialog).getByText(
        "These are separate synthetic fixtures, not outputs from one calibrated simulation and not measured municipal data. The 60-minute scenario values must not be used to derive the example impact percentages.",
      ),
    );
    assert.equal(screen.queryByText("Signal Plan H03"), null);
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      assert.equal(
        screen.queryByRole("dialog", { name: "How impact is calculated" }),
        null,
      ),
    );
    assert.equal(document.activeElement, explanation);
    assert.ok(screen.getByText("OUTCOME NOT YET MEASURED"));
    assert.equal(screen.queryByText("MEASURED · SYNTHETIC OUTCOME"), null);
    click("Overview");
    assert.equal(screen.queryByText("Signal Plan H03"), null);
  },
);

test(
  "the MVP roadmap exposes proposed ownership and an acceptance gate with accessible disclosure controls",
  { timeout: 10000 },
  async (t) => {
    t.after(() => {
      cleanup();
      fullscreenElement = null;
    });
    render(React.createElement(App));
    click("Implementation Roadmap");
    const mvpPhase = screen
      .getByRole("heading", { name: "MVP", exact: true })
      .closest("button.maturity-phase");
    assert.ok(mvpPhase);
    fireEvent.click(mvpPhase);

    const governance = screen.getByRole("region", {
      name: "MVP · decision ownership & stage gate",
    });
    assert.ok(
      within(governance).getByText(
        "Proposed governance · validate against municipal inventory",
      ),
    );
    assert.ok(within(governance).getByText("Mobility Operations (proposed)"));
    assert.ok(within(governance).getByText("Proposed acceptance gate"));
    assert.ok(
      within(governance).getByText(
        "Baseline agreed; feed-quality thresholds and source owners approved; human approval, rollback and audit trail tested.",
      ),
    );
    assert.ok(
      within(governance).getByText(
        "Roles and gates are proposals, not a verified Leuven organisational structure. City geography provides context only.",
      ),
    );

    const disclosure = within(governance).getByRole("button");
    assert.equal(disclosure.getAttribute("aria-expanded"), "true");
    assert.equal(mvpPhase.getAttribute("aria-expanded"), "true");
    const detailsId = disclosure.getAttribute("aria-controls");
    assert.ok(document.getElementById(detailsId));
    fireEvent.click(disclosure);
    assert.equal(disclosure.getAttribute("aria-expanded"), "false");
    assert.equal(mvpPhase.getAttribute("aria-expanded"), "false");
    assert.equal(document.getElementById(detailsId), null);
    assert.equal(
      within(governance).queryByText("Mobility Operations (proposed)"),
      null,
    );
    fireEvent.click(disclosure);
    assert.equal(disclosure.getAttribute("aria-expanded"), "true");
    assert.equal(mvpPhase.getAttribute("aria-expanded"), "true");
    assert.ok(document.getElementById(detailsId));
    assert.ok(within(governance).getByText("Mobility Operations (proposed)"));
  },
);
