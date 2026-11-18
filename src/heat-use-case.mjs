import { calculateK5, calculateK6 } from "./kpi-framework.mjs";

export const HEAT_MODEL_VERSION = "heat-preparedness-demo-v2.0";
export const HEAT_APPROVAL_AUTHORITIES = Object.freeze(["Civil Protection"]);
export const HEAT_ZONES = [
  { id: "H-C", name: "Historic core", people: 4800, vulnerable: 960, publicAreaM2: 180000, shadedAreaM2: 43200, additionalShadeM2: 18000, temperatureOffsetC: .8, humidityOffset: -2, walks: { C01: 9, C02: 14, C03: 5 } },
  { id: "H-U", name: "Campus quarter", people: 5600, vulnerable: 560, publicAreaM2: 240000, shadedAreaM2: 96000, additionalShadeM2: 22000, temperatureOffsetC: .2, humidityOffset: 0, walks: { C01: 12, C02: 18, C03: 7 } },
  { id: "H-R", name: "Dijle corridor", people: 8000, vulnerable: 1200, publicAreaM2: 300000, shadedAreaM2: 135000, additionalShadeM2: 20000, temperatureOffsetC: -.4, humidityOffset: 3, walks: { C01: 6, C02: 8, C03: 14 } },
];
export const HEAT_COOLING_POINTS = [
  { id: "C01", name: "Sint-Donatuspark deployment", capacity: 120, openHours: [8, 20], stepFree: true, operationalReady: true },
  { id: "C02", name: "Kruidtuin deployment", capacity: 80, openHours: [10, 20], stepFree: true, operationalReady: true },
  { id: "C03", name: "University library deployment", capacity: 150, openHours: [9, 18], stepFree: true, operationalReady: true },
];
const AIR_CYCLE = [27.2, 26.7, 26.3, 26, 26.1, 26.8, 28.3, 30.2, 32.5, 34.1, 35.5, 36.4, 37.1, 37.6, 37.2, 36.5, 35.8, 34.9, 33.5, 31.7, 30.2, 29.2, 28.5, 27.9];
const RH_CYCLE = [74, 77, 79, 80, 78, 73, 66, 60, 53, 47, 41, 38, 35, 34, 36, 39, 43, 49, 55, 62, 66, 70, 72, 74];
const CHECK_FIELDS = ["validatedAir", "thresholdConfirmed", "reachConfirmed", "heritageChecked", "accessibilityChecked", "maintenanceChecked", "safetyChecked", "officialForecastReviewed", "territorialInformationReviewed", "outreachReviewed"];
const BUNDLE_FIELDS = ["shade", "water", "notifications", "reschedule"];
const clone = value => JSON.parse(JSON.stringify(value));
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
function freeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
freeze(HEAT_ZONES);
freeze(HEAT_COOLING_POINTS);

const validTime = value => typeof value === "number" && Number.isFinite(value) && Number.isFinite(new Date(value).getTime());
const validData = data => data?.synthetic === true && data.temperatureKind === "air" &&
  Number.isInteger(data.scenarioStartHour) && data.scenarioStartHour >= 0 && data.scenarioStartHour <= 23 &&
  Array.isArray(data.zones) && data.zones.length > 0 && data.zones.every(zone =>
    typeof zone.id === "string" && Number.isFinite(zone.people) && zone.people >= 0 &&
    Number.isFinite(zone.vulnerable) && zone.vulnerable >= 0 && zone.vulnerable <= zone.people &&
    Number.isFinite(zone.temperatureOffsetC) && Math.abs(zone.temperatureOffsetC) <= 20 &&
    Number.isFinite(zone.humidityOffset) && Math.abs(zone.humidityOffset) <= 100 &&
    Number.isFinite(zone.publicAreaM2) && zone.publicAreaM2 > 0 &&
    Number.isFinite(zone.shadedAreaM2) && zone.shadedAreaM2 >= 0 && zone.shadedAreaM2 <= zone.publicAreaM2 &&
    Number.isFinite(zone.additionalShadeM2) && zone.additionalShadeM2 >= 0 &&
    zone.walks && typeof zone.walks === "object" && Object.values(zone.walks).every(minutes => Number.isFinite(minutes) && minutes >= 0)) &&
  new Set(data.zones.map(zone => zone.id)).size === data.zones.length &&
  Array.isArray(data.coolingPoints) && data.coolingPoints.length > 0 && data.coolingPoints.every(point =>
    typeof point.id === "string" && Number.isFinite(point.capacity) && point.capacity >= 0 &&
    Array.isArray(point.openHours) && point.openHours.length === 2 && point.openHours.every(hour => Number.isFinite(hour) && hour >= 0 && hour <= 24) && point.openHours[0] < point.openHours[1]) &&
  new Set(data.coolingPoints.map(point => point.id)).size === data.coolingPoints.length;

export function createInitialHeatState(timestamp = Date.now()) {
  if (!validTime(timestamp)) timestamp = Date.now();
  return {
    status: "idle", alertAt: timestamp,
    draft: { coolingIds: [], shade: true, water: true, notifications: true, reschedule: true, thresholdC: null, reachMinutes: null, thresholdConfirmed: false, reachConfirmed: false, validatedAir: false, heritageChecked: false, accessibilityChecked: false, maintenanceChecked: false, safetyChecked: false, horizonHours: 24, serviceHour: 14, officialForecastReviewed: false, territorialInformationReviewed: false, outreachReviewed: false, authority: "", operator: "" },
    data: { modelVersion: HEAT_MODEL_VERSION, synthetic: true, temperatureKind: "air", observedAirC: null, observedRhPercent: null, modelledAirC: 33.7, modelledRhPercent: 42, scenarioStartHour: 8, zones: clone(HEAT_ZONES), coolingPoints: clone(HEAT_COOLING_POINTS), assumptions: ["Disjoint aggregate zones; no person-level records.", "Walking minutes are declared scenario network assumptions, not circular-distance access or verified routes.", "Refuge capacities, opening hours, step-free access and operability are synthetic planning assumptions, not a Leuven facility inventory.", "K6 describes unique vulnerable people that could be assigned an available place at the selected service hour; it is not attendance.", "Shade, water, notification and work-schedule measures have no invented air-temperature or exposure reduction coefficient."] },
    approvedDecision: null, measurementStartedAt: null, overrides: [], logs: [],
  };
}

export function heatForecastSeries(data, horizonHours = 24) {
  const hours = horizonHours === 48 ? 48 : 24;
  return (data.zones || []).flatMap(zone => Array.from({ length: hours }, (_, hour) => {
    const cycleHour = (Number(data.scenarioStartHour) + hour) % 24;
    return { zoneId: zone.id, zoneName: zone.name, people: zone.people, vulnerable: zone.vulnerable, hour, hours: 1, temperatureC: round(AIR_CYCLE[cycleHour] + zone.temperatureOffsetC + Math.floor(hour / 24) * .6), humidityPercent: Math.max(0, Math.min(100, RH_CYCLE[cycleHour] + zone.humidityOffset)) };
  }));
}

function planBasis(state) {
  if (state.status !== "idle" && state.approvedDecision) return { draft: state.approvedDecision.recommendation.plan, data: state.approvedDecision.data };
  return { draft: state.draft, data: state.data };
}

// Aggregate bipartite max flow prevents overlapping walking catchments from
// counting a vulnerable resident more than once, while respecting refuge places.
function allocateReach(data, draft) {
  const zones = data.zones || [], points = data.coolingPoints || [];
  const chosen = new Set(draft.coolingIds || []);
  const eligible = points.filter(point => chosen.has(point.id) && point.stepFree === true && point.operationalReady === true && Number.isFinite(point.capacity) && point.capacity > 0 && draft.serviceHour >= point.openHours[0] && draft.serviceHour < point.openHours[1]);
  const graph = new Map();
  const edge = (a, b, capacity) => { if (!graph.has(a)) graph.set(a, new Map()); if (!graph.has(b)) graph.set(b, new Map()); graph.get(a).set(b, capacity); graph.get(b).set(a, 0); };
  for (const zone of zones) { edge("source", `z:${zone.id}`, zone.vulnerable); for (const point of eligible) if (Number.isFinite(zone.walks?.[point.id]) && zone.walks[point.id] <= draft.reachMinutes) edge(`z:${zone.id}`, `p:${point.id}`, zone.vulnerable); }
  for (const point of eligible) edge(`p:${point.id}`, "sink", point.capacity);
  let served = 0;
  while (graph.has("source")) {
    const parent = new Map([["source", null]]), queue = ["source"];
    for (let i = 0; i < queue.length && !parent.has("sink"); i++) for (const [to, capacity] of graph.get(queue[i]) || []) if (capacity > 0 && !parent.has(to)) { parent.set(to, queue[i]); queue.push(to); }
    if (!parent.has("sink")) break;
    let amount = Infinity;
    for (let node = "sink"; parent.get(node) !== null; node = parent.get(node)) amount = Math.min(amount, graph.get(parent.get(node)).get(node));
    for (let node = "sink"; parent.get(node) !== null; node = parent.get(node)) { const from = parent.get(node); graph.get(from).set(node, graph.get(from).get(node) - amount); graph.get(node).set(from, graph.get(node).get(from) + amount); }
    served += amount;
  }
  const assignments = [];
  for (const zone of zones) for (const point of eligible) { const people = graph.get(`p:${point.id}`)?.get(`z:${zone.id}`) || 0; if (people > 0) assignments.push({ zoneId: zone.id, pointId: point.id, people, walkMinutes: zone.walks[point.id] }); }
  return { served, assignments, eligibleIds: eligible.map(point => point.id), selectedCapacity: eligible.reduce((sum, point) => sum + point.capacity, 0), totalVulnerable: zones.reduce((sum, zone) => sum + zone.vulnerable, 0) };
}

export function deriveHeatMetrics(state) {
  const { data, draft } = planBasis(state);
  const series = heatForecastSeries(data, draft.horizonHours);
  const exposureCalculation = calculateK5({ zones: series, thresholdC: draft.thresholdC, thresholdConfirmed: draft.thresholdConfirmed, temperatureKind: data.temperatureKind, validatedAir: draft.validatedAir === true && data.synthetic === true });
  const allocation = allocateReach(data, draft);
  const coolingCalculation = calculateK6({ reachableVulnerable: allocation.served, totalVulnerable: allocation.totalVulnerable, reachMinutes: draft.reachMinutes, definitionConfirmed: draft.reachConfirmed });
  const exposureValue = exposureCalculation.status === "available" ? exposureCalculation.personHours : null;
  const coolingValue = coolingCalculation.status === "available" ? coolingCalculation.percent : null;
  const publicAreaM2 = data.zones.reduce((sum, zone) => sum + zone.publicAreaM2, 0);
  const shadedAreaM2 = data.zones.reduce((sum, zone) => sum + Math.min(zone.publicAreaM2, zone.shadedAreaM2 + (draft.shade ? zone.additionalShadeM2 : 0)), 0);
  const baseShadedAreaM2 = data.zones.reduce((sum, zone) => sum + zone.shadedAreaM2, 0);
  const method = "Calculated from declared synthetic assumptions; not a municipal observation.";
  const demonstration = {
    exposure: { kpi: "K5", valid: exposureValue !== null, value: exposureValue, personHours: exposureValue, unit: "person-hours", thresholdC: draft.thresholdC, horizonHours: draft.horizonHours, temperatureKind: "air", status: exposureCalculation.status, reason: exposureCalculation.reason || "", baseline: exposureValue, planned: exposureValue, reductionPercent: null, methodology: "Σ zone population × forecast hours with air temperature strictly above the declared threshold. Relative humidity must be present and reviewed. LST is excluded. No response-effectiveness coefficient is invented.", source: method },
    cooling: { kpi: "K6", valid: coolingValue !== null, value: coolingValue, percent: coolingValue, unit: "%", servedVulnerable: allocation.served, reachableVulnerable: allocation.served, totalVulnerable: allocation.totalVulnerable, unservedVulnerable: allocation.totalVulnerable - allocation.served, reachMinutes: draft.reachMinutes, serviceHour: draft.serviceHour, selectedCapacity: allocation.selectedCapacity, assignments: allocation.assignments, eligibleIds: allocation.eligibleIds, status: coolingCalculation.status, reason: coolingCalculation.reason || "", baseline: null, planned: coolingValue, methodology: "Capacity-limited assignment of unique vulnerable people across disjoint aggregate zones to selected, open, step-free, operationally assumed refuges within declared walking minutes. Not a radius buffer, attendance or verified municipal coverage.", source: method },
    shadedAreaPercent: publicAreaM2 > 0 ? round(shadedAreaM2 / publicAreaM2 * 100) : null,
    baselineShadedAreaPercent: publicAreaM2 > 0 ? round(baseShadedAreaM2 / publicAreaM2 * 100) : null,
    publicAreaM2, shadedAreaM2, totalPopulation: data.zones.reduce((sum, zone) => sum + zone.people, 0),
    forecastPeakAirC: Math.max(...series.map(point => point.temperatureC)), humidityRange: [Math.min(...series.map(point => point.humidityPercent)), Math.max(...series.map(point => point.humidityPercent))],
    zones: data.zones.map(zone => ({ ...zone, exposurePersonHours: exposureValue === null ? null : series.filter(point => point.zoneId === zone.id && point.temperatureC > draft.thresholdC).reduce((sum, point) => sum + point.people * point.hours, 0), servedVulnerable: allocation.assignments.filter(item => item.zoneId === zone.id).reduce((sum, item) => sum + item.people, 0) })),
    series, calculationLabel: "MODELLED · SYNTHETIC", municipalObserved: false,
  };
  return {
    ...demonstration,
    demonstration,
    exposure: { ...demonstration.exposure, valid: false, value: null, personHours: null, baseline: null, planned: null, status: "unavailable", provenance: "NO DATA", readiness: "TARGET", reason: "No validated local temperature/humidity sensing or real-time exposure feed is documented. Synthetic assumptions do not establish K5 readiness." },
    cooling: { ...demonstration.cooling, valid: false, value: null, percent: null, servedVulnerable: null, totalVulnerable: null, reachableVulnerable: null, baseline: null, planned: null, status: "unavailable", provenance: "NO DATA", readiness: "PILOT", reason: "No validated cooling-point inventory is documented. K6 needs that inventory and a pilot-defined walking-time or network-distance threshold." },
  };
}

export function evaluateHeatReadiness(state, maturity = "TARGET", authority, operator) {
  const { draft, data } = planBasis(state);
  const metrics = deriveHeatMetrics(state);
  const issues = [];
  if (!["MVP", "TARGET"].includes(maturity)) issues.push("CURRENT shows available evidence only. Preparedness workflow is a PILOT capability.");
  if (!validData(data)) issues.push("The indicative synthetic demonstration model is incomplete or invalid.");
  if (draft.officialForecastReviewed !== true) issues.push("Validate the official external forecast source, issue time, warning period and coverage.");
  if (draft.territorialInformationReviewed !== true) issues.push("Review aggregated demographic, GIS and civil-protection information; priority areas remain indicative.");
  if (draft.outreachReviewed !== true) issues.push("Social Services must review accessible outreach and support for vulnerable residents.");
  if (draft.accessibilityChecked !== true) issues.push("Review accessibility and protected access for preparedness actions.");
  if (draft.safetyChecked !== true) issues.push("Review civil-protection safety and escalation procedures.");
  if (!BUNDLE_FIELDS.some(key => draft[key] === true)) issues.push("Select at least one preparedness action.");
  if (!HEAT_APPROVAL_AUTHORITIES.includes(authority ?? draft.authority)) issues.push("Civil Protection must approve and activate the preparedness response.");
  if (typeof (operator ?? draft.operator) !== "string" || (operator ?? draft.operator).trim().length < 3) issues.push("Identify the accountable Civil Protection approver.");
  return { ready: issues.length === 0, issues, metrics };
}

function patchDraft(draft, patch) {
  const next = { ...draft };
  for (const key of [...CHECK_FIELDS, ...BUNDLE_FIELDS]) if (typeof patch?.[key] === "boolean") next[key] = patch[key];
  for (const key of ["thresholdC", "reachMinutes"]) if (patch && Object.hasOwn(patch, key)) next[key] = Number.isFinite(patch[key]) ? patch[key] : null;
  if ([24, 48].includes(patch?.horizonHours)) next.horizonHours = patch.horizonHours;
  if (Number.isInteger(patch?.serviceHour) && patch.serviceHour >= 0 && patch.serviceHour <= 23) next.serviceHour = patch.serviceHour;
  if (Array.isArray(patch?.coolingIds)) next.coolingIds = [...new Set(patch.coolingIds.filter(id => HEAT_COOLING_POINTS.some(point => point.id === id)))];
  for (const key of ["authority", "operator"]) if (typeof patch?.[key] === "string") next[key] = patch[key].trim().slice(0, 100);
  // Changing a metric definition invalidates its earlier confirmation.
  if (Object.hasOwn(patch || {}, "thresholdC") && patch.thresholdC !== draft.thresholdC) next.thresholdConfirmed = false;
  if (Object.hasOwn(patch || {}, "reachMinutes") && patch.reachMinutes !== draft.reachMinutes) next.reachConfirmed = false;
  return next;
}

export function heatReducer(state = createInitialHeatState(), action = {}) {
  if (!action || typeof action !== "object" || Array.isArray(action)) return state;
  const timestamp = action.timestamp ?? Date.now();
  if (!validTime(timestamp)) return state;
  const log = (event, next) => ({ ...state, ...next, logs: [...state.logs, { timestamp, event, useCase: "heat", humanDecision: ["APPROVE", "REJECT", "MODIFY"].includes(action.type), owner: "Civil Protection", operator: state.approvedDecision?.operator || action.operator || state.draft.operator || "Operator review", authority: state.approvedDecision?.authority || action.authority || state.draft.authority || null }] });
  switch (action.type) {
    case "UPDATE_DRAFT": return state.status === "idle" ? { ...state, draft: patchDraft(state.draft, action.patch) } : state;
    case "APPROVE": {
      if (state.status !== "idle" || action.humanApproved !== true || !["MVP", "TARGET"].includes(action.maturity)) return state;
      const authority = action.authority ?? state.draft.authority, operator = action.operator ?? state.draft.operator;
      if (!evaluateHeatReadiness(state, action.maturity, authority, operator).ready) return state;
      const plan = { ...clone(state.draft), authority, operator: operator.trim() };
      const data = clone(state.data); const metrics = deriveHeatMetrics(state);
      const approvedDecision = freeze({ approvedAt: timestamp, operator: operator.trim(), authority, owner: "Civil Protection", environmentalInterpretation: "Environment / Urban Planning", outreach: "Social Services", reviewAt: timestamp + 30 * 60_000, modelVersion: HEAT_MODEL_VERSION, data, recommendation: { plan, bundle: BUNDLE_FIELDS.filter(key => plan[key]), definitions: { thresholdC: plan.thresholdC, reachMinutes: plan.reachMinutes, horizonHours: plan.horizonHours, serviceHour: plan.serviceHour }, projectedMetrics: { exposure: metrics.exposure, cooling: metrics.cooling, shadedAreaPercent: metrics.shadedAreaPercent } } });
      return log("Heat preparedness approved and activated by Civil Protection", { status: "active", approvedDecision });
    }
    case "REJECT":
    case "MODIFY": {
      if (state.status !== "idle" || action.humanReviewed !== true || action.authority !== "Civil Protection" || typeof action.operator !== "string" || action.operator.trim().length < 3 || typeof action.reason !== "string" || action.reason.trim().length < 3) return state;
      const disposition = action.type === "REJECT" ? "rejection" : "modification";
      const record = freeze({ id: `HEAT-${action.type}-${timestamp}`, data: { sourceStatus: "SYNTHETIC preparedness review; no municipal forecast, local heat sensing or cooling inventory is connected.", officialForecastReviewed: state.draft.officialForecastReviewed, territorialInformationReviewed: state.draft.territorialInformationReviewed, synthetic: true }, modelVersion: HEAT_MODEL_VERSION, recommendation: "Review heatwave preparedness actions", decision: { actor: `${action.operator.trim()} · Civil Protection`, time: new Date(timestamp).toISOString(), approvedOrOverride: action.type === "REJECT" ? "rejected" : "modified" }, result: { status: "inconclusive", summary: action.reason.trim() } });
      return log(`Heat preparedness ${disposition} recorded`, { overrides: [...state.overrides, record], ...(action.type === "MODIFY" ? { draft: patchDraft(state.draft, action.patch) } : {}) });
    }
    case "PAUSE": return state.status === "active" ? log("Heat response paused by protective authority", { status: "paused" }) : state;
    case "RESUME": return state.status === "paused" ? log("Heat response resumed by protective authority", { status: "active" }) : state;
    case "CLOSE": return ["active", "paused"].includes(state.status) ? log("Heat preparedness closed; post-event review window started", { status: "measuring", measurementStartedAt: timestamp }) : state;
    case "MEASUREMENT_COMPLETE": {
      if (state.status !== "measuring" || !state.approvedDecision || !validTime(state.measurementStartedAt) || timestamp < state.measurementStartedAt + 5000) return state;
      const metrics = deriveHeatMetrics(state);
      const result = { completedAt: timestamp, kind: "synthetic post-event review", municipalObserved: false, exposure: metrics.exposure, cooling: metrics.cooling, shadedAreaPercent: metrics.shadedAreaPercent, effectivenessMeasured: false, note: "The post-event review window completed. No real municipal observation, health benefit or successful intervention is claimed. K5 and K6 remain No data until their inputs are validated." };
      return log("Heat post-event review recorded; no municipal outcome claimed", { status: "measured", approvedDecision: freeze({ ...state.approvedDecision, result }) });
    }
    case "RESET": return createInitialHeatState(timestamp);
    default: return state;
  }
}
