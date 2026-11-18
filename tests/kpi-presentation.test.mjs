import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';

await mkdir(new URL('../work/', import.meta.url), { recursive: true });
const built = new URL('../work/KpiWorkbench.presentation.test.mjs', import.meta.url);
await build({ entryPoints: [new URL('../src/components/KpiWorkbench.jsx', import.meta.url).pathname], outfile: built.pathname, bundle: true, format: 'esm', platform: 'node', packages: 'external', jsx: 'automatic', loader: { '.css': 'empty' } });
const { default: KpiWorkbench } = await import(built.href);
const documentFor = (initialKpiId, props = {}) => new JSDOM(renderToStaticMarkup(React.createElement(KpiWorkbench, { initialKpiId, ...props }))).window.document;

test('all seven KPI views show explicit readiness, provenance and No data for missing observations', () => {
  for (const id of ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7']) {
    const doc = documentFor(id);
    const detail = doc.querySelector('.kw-detail');
    assert.ok(detail.querySelector('.kw-readiness'), `${id} readiness`);
    assert.match(detail.textContent, /No data/, `${id} missing value`);
    assert.equal(detail.querySelectorAll('.kw-readiness .kw-badge').length, 2);
  }
});

test('the traffic example is visibly illustrative/modelled and never an achieved municipal measurement', () => {
  const doc = documentFor('K1');
  const main = doc.querySelector('.kw-primary-result');
  assert.match(main.textContent, /MODELLED · SYNTHETIC EXAMPLE/);
  assert.match(main.textContent, /18\.0/);
  assert.match(main.textContent, /16\.2/);
  assert.match(main.textContent, /10%/);
  assert.match(main.textContent, /Illustrative values used to demonstrate the KPI calculation\. The real baseline will be established during pilot preparation\./);
  assert.doesNotMatch(main.querySelector('.kw-badge').textContent, /MEASURED/);
  assert.equal(main.querySelector('.kw-actual-summary strong').textContent, 'No data');
  assert.match(doc.querySelector('.kw-readiness').textContent, /PILOT/);
  assert.match(doc.querySelector('.kw-readiness').textContent, /timestamp linkage/);
});

test('CO2 remains ESTIMATED and requires validated K1 and approved factors for its calculation exercise', () => {
  const rows = [{ vehicleClass: 'Cars', vehicleKm: 1000, beforeFactor: 0.2, afterFactor: 0.18 }];
  const missing = documentFor('K2', { observations: { k2: { rows } } });
  assert.equal(missing.querySelector('.kw-primary-result .kw-result-number').textContent, 'No data');
  assert.match(missing.querySelector('.kw-readiness').textContent, /TARGET.*ESTIMATED/);
  const declared = documentFor('K2', { observations: { k2: { rows, validatedK1: true, emissionFactorsApproved: true } } });
  assert.equal(declared.querySelector('.kw-primary-result .kw-result-number').textContent, '20 kg CO₂');
  assert.match(declared.querySelector('.kw-primary-result .kw-badge').textContent, /^ESTIMATED/);
});

test('K3 requires MEASURED evidence and K5 remains TARGET without local sensing', () => {
  assert.match(documentFor('K3').querySelector('.kw-readiness').textContent, /TARGET.*MEASURED/);
  const heat = documentFor('K5', { heatState: { metrics: { exposure: { valid: false, value: null, reason: 'No local sensor network documented' } } } });
  assert.match(heat.querySelector('.kw-readiness').textContent, /TARGET/);
  assert.equal(heat.querySelector('.kw-primary-result .kw-result-number').textContent, 'No data');
});

test('K4 counts an identified human modification, not a later execution, against an illustrative pilot target', () => {
  const alertAt = Date.parse('2026-11-18T10:00:00Z');
  const doc = documentFor('K4', { alertAt, trafficLifecycle: { logs: [
    { domain: 'traffic', humanDecision: true, event: 'Plan modified', timestamp: alertAt + 3 * 60000 },
    { domain: 'traffic', event: 'Authorised execution', timestamp: alertAt + 5 * 60000 },
  ] } });
  assert.equal(doc.querySelector('.kw-primary-result .kw-result-number').textContent, '3 min');
  assert.match(doc.querySelector('.kw-actual-summary').textContent, /ILLUSTRATIVE PILOT TARGET/);
});

test('K7 states 100% logging target without describing completeness as decision quality', () => {
  const doc = documentFor('K7');
  assert.match(doc.querySelector('.kw-primary-result').textContent, /100% complete decision logging/);
  assert.match(doc.querySelector('.kw-primary-result').textContent, /not decision quality/);
  assert.equal(doc.querySelector('.kw-primary-result .kw-result-number').textContent, 'No data');
});
