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
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { render, screen, fireEvent, waitFor, cleanup } = await import(
  "@testing-library/react"
);
const { default: App } = await import("../work/App.test.mjs");
const button = (name) => screen.getByRole("button", { name, exact: true });
const click = (name) => fireEvent.click(button(name));

test(
  "all navigation and decision controls preserve the approval and measurement gates",
  { timeout: 20000 },
  async (t) => {
    t.after(cleanup);
    render(React.createElement(App));
    assert.ok(screen.getByText("TARGET-STATE PROTOTYPE"));
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
    t.after(cleanup);
    render(React.createElement(App));
    click("Presentation Demo Follow the decision journey");
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
