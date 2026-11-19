// Source-led KPI dictionary and arithmetic only. These helpers do not calibrate a
// model, validate municipal data, authorise an action, or turn a simulation into
// a measured result. Lifecycle and provenance labels remain the caller's duty.
const KPI_SOURCE = 'CURRENT FINAL version-3.pptx · slide 12; readiness and illustrative example: slides 11–13';

export const KPI_DEFINITIONS = Object.freeze([
  { id: 'K1', title: 'Pilot corridor travel time and delay', readiness: 'PILOT', provenance: 'MODELLED', readinessNote: 'Conditional on validated camera/OCR timestamp linkage between selected monitoring points. Until validated, use counts and queue patterns only.', unit: 'min', group: 'Public Value', useCase: 'Traffic', owner: 'Mobility Department', formula: 'Mean corridor travel time = Σ validated completed-trip times / completed trips. Delay = corridor travel time − agreed free-flow travel time.', baseline: 'Establish the real corridor baseline during pilot preparation; use a matched corridor, time period and demand context.', target: 'Pilot-defined improvement after timestamp-linkage validation. The 18.0 → 16.2 minute example illustrates a 10% improvement only.', frequency: "Every 15 minutes, after source freshness, coverage and camera/OCR timestamp linkage have been validated.", inputs: ['Validated timestamp linkage between selected camera/OCR monitoring points', 'Selected-corridor completed-trip observations and an agreed free-flow reference', '18 monitoring cameras support counts and queues; 4 loops count vehicles at three public parking areas. Neither establishes network-wide corridor travel times'], limits: ['18.0 minutes is an illustrative baseline, not currently measured municipal data.', '16.2 minutes is a modelled scenario, never an achieved result.', 'No network-wide congestion coverage is claimed.', 'Counts or queue patterns alone cannot establish corridor travel time.'], source: KPI_SOURCE },
  { id: 'K2', title: 'Estimated tailpipe CO₂ avoided', readiness: 'TARGET', provenance: 'ESTIMATED', readinessNote: 'Depends on validated K1/activity data and approved emission factors. No measured emissions or causal CO₂ reduction is claimed.', unit: 'kg CO₂', group: 'Environmental', useCase: 'Traffic', owner: "Environment / Climate Office + Mobility", formula: 'Estimated avoided tailpipe CO₂ = Σ vehicle-km × (baseline emission factor − intervention emission factor), using approved fleet and activity boundaries.', baseline: 'A declared no-action estimate for the same corridor and episode.', target: "Report the estimate for each plan run and yearly. No guaranteed numerical or causal CO₂ reduction is established.", frequency: "Each time the plan runs; validated episode estimates are also reported yearly.", inputs: ['Validated K1 and activity data', 'Vehicle-km and fleet categories', 'Approved, applicable baseline and scenario emission factors'], limits: ['CO₂ is ESTIMATED, not measured.', 'Travel-time improvement does not prove a causal CO₂ reduction.', 'A negative avoided value is an estimated increase, not zero.', 'Do not infer kilograms from saved travel time alone.'], source: KPI_SOURCE },
  { id: 'K3', title: 'Measured NO₂ and PM2.5', readiness: 'TARGET', provenance: 'MEASURED', readinessNote: 'Requires ARPA integration and/or new validated sensors. No municipal air-quality data source is connected to this prototype.', unit: 'µg/m³', group: 'Environmental', useCase: 'Traffic', owner: "Environment / Climate Office", formula: 'Compare measured hourly NO₂ and PM2.5 separately against a matched baseline: same location, period and comparable weather. Difference = intervention mean − matched mean.', baseline: 'A validated matched station baseline; agency access and representativeness require validation.', target: "Aim for lower concentrations than on comparable days; no guaranteed decrease or causal effect is established.", frequency: "Hourly, when validated agency or sensor aggregates are available.", inputs: ['ARPA integration and/or new validated sensors', 'Named representative monitoring stations', 'Matched weekday, hours and weather context'], limits: ['MEASURED describes the required evidence type; current municipal values are No data.', 'NO₂ and PM2.5 are measured separately from estimated CO₂.', 'Traffic improvement does not automatically prove air-quality improvement.', 'Annual reference values are not hourly alert limits or proof of legal compliance.'], source: KPI_SOURCE },
  { id: 'K4', title: 'Alert-to-decision time', readiness: 'PILOT-READY', provenance: 'SYNTHETIC', readinessNote: 'Available through the GreenPulse decision log. Under 10 minutes is an illustrative pilot target.', unit: 'min', group: 'Operational', useCase: 'Both', owner: "Control Room Manager", formula: '(Recorded human-decision timestamp − alert timestamp) / 60,000, for epoch milliseconds.', baseline: 'The first recorded pilot decisions.', target: 'Under 10 minutes — illustrative pilot target, not a municipal service commitment.', frequency: "Every event, using the first recorded human decision.", inputs: ['A recorded alert timestamp', 'The first recorded human decision timestamp with aligned timezone'], limits: ['The endpoint is the human decision, not autonomous AI execution or physical controller activation.', 'Missing or invalid timestamps return No data, never zero.', 'The prototype log uses synthetic demonstration workflows.'], source: KPI_SOURCE },
  { id: 'K5', title: 'Heat exposure in person-hours', readiness: 'TARGET', provenance: 'MODELLED', readinessNote: 'Requires validated local heat sensing. No local temperature/humidity sensor network or real-time heat-exposure feed is documented.', unit: 'person-hours', group: 'Environmental', useCase: 'Heat', owner: "Environment / Climate Office", formula: 'Σ zone population × hours above an explicitly declared air-temperature threshold, using validated local observations.', baseline: 'The first validated local monitored summer.', target: "Aim for lower exposure in zones with shade or greening; validate the effect with local sensing. No numerical or causal benefit is assumed.", frequency: "Every 10–15 minutes, after validated local sensing and population aggregation are available.", inputs: ['Validated local air-temperature and humidity observations', 'Privacy-safe aggregated exposed population', 'A declared threshold and time interval'], limits: ['Official forecasts support preparedness, not measured local exposure.', 'Green-space distribution does not prove cooling.', 'Land-surface temperature does not substitute for air temperature.', 'Any local heat-risk map is indicative/modelled; no real-time health outcome is claimed.'], source: KPI_SOURCE },
  { id: 'K6', title: 'Vulnerable residents within reach of cooling points', readiness: 'PILOT', provenance: 'MODELLED', readinessNote: 'Conditional on a validated cooling-point inventory and an agreed pilot-defined walking-time or network-distance threshold.', unit: '%', group: 'Public Value', useCase: 'Heat', owner: "Civil Protection + Social Services", formula: 'Unique vulnerable residents within the agreed reach of validated cooling points / all vulnerable residents × 100.', baseline: 'Establish after validating cooling points and accessible routes; no validated inventory is currently documented.', target: "Increase access each season, using the agreed pilot-defined walking-time or network-distance threshold.", frequency: "Daily in summer, after cooling inventory, accessibility and opening hours are validated.", inputs: ['Validated cooling-point inventory with opening hours and accessibility', 'Aggregated vulnerable-resident denominator', 'Pilot-defined walking-time or network-distance threshold'], limits: ['Within reach means a pilot-defined walking-time or network-distance threshold.', 'A map radius is not validated network accessibility.', 'No validated cooling-point inventory is documented today.', 'Do not double-count residents or display identifiable vulnerability records.'], source: KPI_SOURCE },
  { id: 'K7', title: 'Decisions fully recorded', readiness: 'PILOT-READY', provenance: 'SYNTHETIC', readinessNote: 'Available through the GreenPulse decision log. Target: 100% complete decision logging. Completeness does not measure decision quality.', unit: '%', group: 'Governance', useCase: 'Both', owner: "Data Lead", formula: 'Complete decision records / all decisions × 100. Completeness includes data provenance, model version, recommendation, accountable human decision and recorded result.', baseline: 'The first pilot decision records.', target: '100% complete decision logging.', frequency: "Record every decision; review logging completeness monthly.", inputs: ['All approvals, rejections, modifications and executions', 'Data provenance, model version and recommendation', 'Accountable human decision and documented result'], limits: ['K7 measures logging completeness, not decision quality.', 'An empty log returns No data, never 100%.', 'Pending results remain incomplete; a documented inconclusive result can complete the audit without asserting success.'], source: KPI_SOURCE },
].map(definition => Object.freeze({ ...definition, inputs: Object.freeze(definition.inputs), limits: Object.freeze(definition.limits) })));

export const DOCUMENT_TRAFFIC_EXAMPLE = Object.freeze({
  baselineMinutes: 18,
  predictedMinutes: 16.2,
  vehiclesPerHour: 1000,
  kind: 'presentation-illustration',
  label: 'Illustrative example — not a calibrated forecast or measured result',
  note: 'Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation.',
});

const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
const isMissing = value => value === null || value === undefined;
const rounded = value => isNumber(value) ? Number(value.toFixed(6)) : null;
const mean = values => values.reduce((average, value, index) => average + (value - average) / (index + 1), 0);
const unavailable = (values, reason) => ({ ...values, status: 'unavailable', reason });
const invalid = (values, reason) => ({ ...values, status: 'invalid', reason });
const available = (values, reason) => ({ ...values, status: 'available', reason });

const EMPTY_K1 = Object.freeze({ observedMinutes: null, delayMinutes: null, travelTimeIndex: null, predictedChangePercent: null, actualChangePercent: null, forecastErrorPercent: null, vehicleHoursSavedPerHour: null, sampleCount: 0 });

// vehicleHoursSavedPerHour uses the supplied prediction, not an observed effect.
export function calculateK1(options = {}) {
  if (!isObject(options)) return invalid(EMPTY_K1, 'K1 requires a structured input object.');
  const { trips = [], freeFlowMinutes = null, baselineMinutes = null, predictedMinutes = null, vehiclesPerHour = null, timestampLinkageValidated = false } = options;
  if (!Array.isArray(trips) || trips.some(value => !isNumber(value) || value <= 0)) return invalid(EMPTY_K1, 'Trip durations must be finite positive minutes; invalid observations are not silently discarded.');
  for (const [label, value] of [['Free-flow time', freeFlowMinutes], ['Baseline time', baselineMinutes], ['Predicted time', predictedMinutes]]) {
    if (!isMissing(value) && (!isNumber(value) || value <= 0)) return invalid(EMPTY_K1, `${label} must be finite positive minutes or explicitly unavailable.`);
  }
  if (!isMissing(vehiclesPerHour) && (!isNumber(vehiclesPerHour) || vehiclesPerHour < 0)) return invalid(EMPTY_K1, 'Vehicles per hour must be a finite non-negative count or explicitly unavailable.');
  const observed = trips.length && timestampLinkageValidated === true ? mean(trips) : null;
  const arithmetic = [
    observed,
    observed !== null && freeFlowMinutes !== null ? observed - freeFlowMinutes : null,
    observed !== null && freeFlowMinutes !== null ? observed / freeFlowMinutes : null,
    baselineMinutes !== null && predictedMinutes !== null ? (predictedMinutes - baselineMinutes) / baselineMinutes * 100 : null,
    observed !== null && baselineMinutes !== null ? (observed - baselineMinutes) / baselineMinutes * 100 : null,
    observed !== null && predictedMinutes !== null ? Math.abs(predictedMinutes - observed) / observed * 100 : null,
    baselineMinutes !== null && predictedMinutes !== null && vehiclesPerHour !== null ? vehiclesPerHour * (baselineMinutes - predictedMinutes) / 60 : null,
  ];
  if (arithmetic.some(value => value !== null && !isNumber(value))) return invalid(EMPTY_K1, 'The supplied magnitudes exceed a finite arithmetic range.');
  const values = {
    observedMinutes: rounded(observed),
    delayMinutes: observed !== null && freeFlowMinutes !== null ? rounded(observed - freeFlowMinutes) : null,
    travelTimeIndex: observed !== null && freeFlowMinutes !== null ? rounded(observed / freeFlowMinutes) : null,
    predictedChangePercent: baselineMinutes !== null && predictedMinutes !== null ? rounded((predictedMinutes - baselineMinutes) / baselineMinutes * 100) : null,
    actualChangePercent: observed !== null && baselineMinutes !== null ? rounded((observed - baselineMinutes) / baselineMinutes * 100) : null,
    forecastErrorPercent: observed !== null && predictedMinutes !== null ? rounded(Math.abs(predictedMinutes - observed) / observed * 100) : null,
    vehicleHoursSavedPerHour: baselineMinutes !== null && predictedMinutes !== null && vehiclesPerHour !== null ? rounded(vehiclesPerHour * (baselineMinutes - predictedMinutes) / 60) : null,
    sampleCount: trips.length,
  };
  if (observed === null) return unavailable(values, 'No data: no validated completed-trip observations are supplied. Counts and queue patterns do not establish corridor travel time.');
  if (freeFlowMinutes === null) return unavailable(values, 'Observed travel time is available, but the declared free-flow reference is missing; delay and travel-time index are unavailable.');
  if (baselineMinutes === null) return unavailable(values, 'Observed travel time and delay are available, but a matched baseline is missing; actual change is unavailable.');
  return available(values, predictedMinutes === null ? 'Observed K1 arithmetic is available; no numerical prediction is attributed to this plan.' : 'Arithmetic from the supplied trip observations and declared references. Predicted and actual change remain separate; source validation is still required.');
}

const EMPTY_K2 = Object.freeze({ baselineKg: null, interventionKg: null, avoidedKg: null });
export function calculateK2(options = {}) {
  if (!isObject(options)) return invalid(EMPTY_K2, 'K2 requires a structured input object.');
  const { categories = [], episodes = [], validatedK1 = false, emissionFactorsApproved = false } = options;
  if (!Array.isArray(categories) || !Array.isArray(episodes)) return invalid(EMPTY_K2, 'Categories and episodes must be arrays.');
  if (categories.length && episodes.length) return invalid(EMPTY_K2, 'Supply one episode’s categories or a set of episodes, not both; this prevents double-counting.');
  if (validatedK1 !== true || emissionFactorsApproved !== true) return unavailable(EMPTY_K2, 'No data: validated K1/activity data and approved emission factors are required.');
  if (!categories.length && !episodes.length) return unavailable(EMPTY_K2, 'Vehicle-km, fleet categories and justified baseline/intervention emission factors are required; kilograms cannot be inferred from travel-time savings.');
  const batches = episodes.length ? episodes : [{ categories }];
  const episodeIds = new Set();
  let baselineKg = 0;
  let interventionKg = 0;
  for (const episode of batches) {
    if (!isObject(episode) || !Array.isArray(episode.categories) || !episode.categories.length) return invalid(EMPTY_K2, 'Every supplied episode requires a non-empty categories array.');
    if (episode.id !== undefined) {
      if (typeof episode.id !== 'string' || !episode.id.trim() || episodeIds.has(episode.id.trim())) return invalid(EMPTY_K2, 'Episode identifiers must be non-empty and unique to avoid double-counting.');
      episodeIds.add(episode.id.trim());
    }
    for (const category of episode.categories) {
      if (!isObject(category)) return invalid(EMPTY_K2, 'Every category requires vehicle-km and two explicit emission factors.');
      const inputs = [category.vehicleKm, category.baselineFactor, category.interventionFactor];
      if (inputs.some(isMissing)) return unavailable(EMPTY_K2, 'A category is missing vehicle-km or an emission factor; no default factor is assumed.');
      if (inputs.some(value => !isNumber(value) || value < 0)) return invalid(EMPTY_K2, 'Vehicle-km and emission factors must be finite non-negative numbers.');
      baselineKg += category.vehicleKm * category.baselineFactor;
      interventionKg += category.vehicleKm * category.interventionFactor;
    }
  }
  const avoidedKg = baselineKg - interventionKg;
  if (![baselineKg, interventionKg, avoidedKg].every(isNumber)) return invalid(EMPTY_K2, 'The supplied magnitudes exceed a finite emissions arithmetic range.');
  return available({ baselineKg: rounded(baselineKg), interventionKg: rounded(interventionKg), avoidedKg: rounded(avoidedKg) }, episodes.length ? `Estimated tailpipe CO₂ across ${episodes.length} supplied episode datasets. Annual coverage is not inferred; the caller must prevent episode overlap.` : 'Estimated tailpipe CO₂, not measured air quality. Supplied vehicle-km is held constant while emission factors change.');
}

export function calculateK3(options = {}) {
  const empty = { activatedMean: null, matchedMean: null, difference: null, changePercent: null, sampleCounts: { activated: 0, matched: 0 } };
  if (!isObject(options)) return invalid(empty, 'K3 requires a structured comparison input.');
  const { activated = [], matched = [], conditionsConfirmed = false } = options;
  if (!Array.isArray(activated) || !Array.isArray(matched)) return invalid(empty, 'Activated and matched observations must be arrays of hourly concentrations.');
  if ([...activated, ...matched].some(value => !isNumber(value) || value < 0)) return invalid(empty, 'Hourly concentration aggregates must be finite non-negative numbers for one pollutant at a time.');
  const sampleCounts = { activated: activated.length, matched: matched.length };
  if (!activated.length || !matched.length) return unavailable({ ...empty, sampleCounts }, 'Both activated-hour and matched non-activation-hour observations are required.');
  if (conditionsConfirmed !== true) return unavailable({ ...empty, sampleCounts }, 'Confirm the same weekday, hour window and comparable weather. Numeric arrays alone cannot establish a valid matched-day comparison.');
  const activatedMean = mean(activated);
  const matchedMean = mean(matched);
  const difference = activatedMean - matchedMean;
  if (![activatedMean, matchedMean, difference].every(isNumber)) return invalid(empty, 'The supplied magnitudes exceed a finite concentration arithmetic range.');
  const values = { activatedMean: rounded(activatedMean), matchedMean: rounded(matchedMean), difference: rounded(difference), changePercent: matchedMean > 0 ? rounded(difference / matchedMean * 100) : null, sampleCounts };
  if (matchedMean === 0) return unavailable(values, 'The matched concentration mean is zero; means and difference are available, but a relative percentage change is undefined.');
  if (!isNumber(difference / matchedMean * 100)) return invalid(empty, 'The supplied magnitudes exceed a finite percentage arithmetic range.');
  return available(values, 'Hourly concentration comparison under caller-confirmed matched conditions. It does not establish causality or annual legal compliance.');
}

function timestamp(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (isNumber(value)) return Number.isFinite(new Date(value).getTime()) ? value : null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value.trim())) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateK4(alertAt, decisionAt) {
  const empty = { minutes: null, withinTarget: null };
  if (isMissing(alertAt) || isMissing(decisionAt)) return unavailable(empty, 'Both the alert and recorded human-decision timestamps are required.');
  const alertTime = timestamp(alertAt);
  const decisionTime = timestamp(decisionAt);
  if (alertTime === null || decisionTime === null) return invalid(empty, 'Use valid dates, epoch milliseconds, or ISO timestamps with an explicit timezone; a clock-only display string is insufficient.');
  if (decisionTime < alertTime) return invalid(empty, 'The human decision cannot precede its alert.');
  const minutes = (decisionTime - alertTime) / 60_000;
  return available({ minutes, withinTarget: minutes < 10 }, 'Alert-to-recorded-human-decision latency. Physical activation time is not this KPI’s endpoint.');
}

export function calculateK5(options = {}) {
  const empty = { personHours: null };
  if (!isObject(options)) return invalid(empty, 'K5 requires structured zone observations.');
  const { zones = [], thresholdC, thresholdConfirmed = false, temperatureKind = 'air', validatedAir = false } = options;
  if (temperatureKind !== 'air') return invalid(empty, 'Satellite land-surface temperature cannot substitute for validated air temperature.');
  if (thresholdConfirmed !== true || isMissing(thresholdC)) return unavailable(empty, 'Review and explicitly confirm an air-temperature exposure threshold before calculating person-hours.');
  if (!isNumber(thresholdC)) return invalid(empty, 'The confirmed air-temperature threshold must be finite degrees Celsius.');
  if (validatedAir !== true) return unavailable(empty, 'Validated air-temperature and humidity observations are required; the reference-city sensor network is not established.');
  if (!Array.isArray(zones)) return invalid(empty, 'Zones must be an array of population and time-slot observations.');
  if (!zones.length) return unavailable(empty, 'No exposed-population/time observations are supplied; missing exposure is not zero exposure.');
  let personHours = 0;
  for (const zone of zones) {
    if (!isObject(zone)) return invalid(empty, 'Every zone needs people, hours, air temperature and humidity.');
    const fields = [zone.people, zone.hours, zone.temperatureC, zone.humidityPercent];
    if (fields.some(isMissing)) return unavailable(empty, 'A zone lacks population, interval length, air temperature or humidity.');
    if (!fields.every(isNumber) || zone.people < 0 || zone.hours <= 0 || zone.humidityPercent < 0 || zone.humidityPercent > 100) return invalid(empty, 'Zone observations must be finite: non-negative people, positive hours, and humidity from 0 to 100%.');
    if (zone.temperatureC > thresholdC) personHours += zone.people * zone.hours;
  }
  if (!isNumber(personHours)) return invalid(empty, 'The supplied population/time magnitudes exceed a finite arithmetic range.');
  return available({ personHours: rounded(personHours) }, 'Person-hours above the caller-confirmed air-temperature threshold. Avoid overlapping zone counts; this is not a clinical health-risk prediction.');
}

export function calculateK6(options = {}) {
  const empty = { percent: null };
  if (!isObject(options)) return invalid(empty, 'K6 requires a structured vulnerable-population denominator and reach definition.');
  const { reachableVulnerable, totalVulnerable, reachMinutes, definitionConfirmed = false } = options;
  if (definitionConfirmed !== true || isMissing(reachMinutes)) return unavailable(empty, 'Explicitly review and confirm the walking-time reach definition; no default reach threshold is assumed.');
  if (!isNumber(reachMinutes) || reachMinutes <= 0) return invalid(empty, 'The confirmed reach must be positive finite walking minutes.');
  if (isMissing(reachableVulnerable) || isMissing(totalVulnerable)) return unavailable(empty, 'Both reachable and total vulnerable-population counts are required.');
  if (!isNumber(reachableVulnerable) || !isNumber(totalVulnerable) || reachableVulnerable < 0 || totalVulnerable < 0 || reachableVulnerable > totalVulnerable) return invalid(empty, 'Counts must be finite and satisfy 0 ≤ reachable vulnerable residents ≤ all vulnerable residents.');
  if (totalVulnerable === 0) return unavailable(empty, 'The vulnerable-population denominator is zero, so coverage is undefined rather than 0% or 100%.');
  return available({ percent: rounded(reachableVulnerable / totalVulnerable * 100) }, 'Arithmetic on unique vulnerable residents under the declared reach definition. The caller must validate network routes, opening, accessibility and capacity; a marker radius is insufficient.');
}

function hasContent(value, visited = new WeakSet()) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (value && typeof value === 'object') {
    if (visited.has(value)) return false;
    visited.add(value);
  }
  if (Array.isArray(value)) return value.length > 0 && value.some(item => hasContent(item, visited));
  if (isObject(value)) return Object.values(value).some(item => hasContent(item, visited) || isNumber(item));
  return false;
}
const TERMINAL_RESULT_STATUSES = new Set(['measured', 'completed', 'evaluated', 'inconclusive', 'failed', 'not-achieved', 'no-action']);
const HUMAN_DECISIONS = new Set([true, 'approved', 'override', 'overridden', 'rejected', 'modified', 'executed']);

export function calculateK7(records = []) {
  const empty = { percent: null, complete: 0, total: 0, missingById: {} };
  if (!Array.isArray(records)) return invalid(empty, 'K7 requires an array of identified decision records.');
  if (!records.length) return unavailable(empty, 'No decisions are in scope; a percentage denominator does not yet exist.');
  if (records.some(record => !isObject(record))) return invalid({ ...empty, total: records.length }, 'Every decision must be a structured record; malformed entries cannot establish audit coverage.');
  const knownIds = new Set();
  const missingById = {};
  let complete = 0;
  for (const [index, record] of records.entries()) {
    const id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `record-${index + 1}`;
    if (knownIds.has(id)) return invalid({ ...empty, total: records.length }, 'Duplicate decision IDs make the denominator ambiguous; deduplicate the decision inventory first.');
    knownIds.add(id);
    const missing = [];
    if (typeof record.id !== 'string' || !record.id.trim()) missing.push('id');
    if (!hasContent(record.data)) missing.push('data');
    if (typeof record.modelVersion !== 'string' || !record.modelVersion.trim()) missing.push('modelVersion');
    if (!hasContent(record.recommendation)) missing.push('recommendation');
    if (!isObject(record.decision) || typeof record.decision.actor !== 'string' || !record.decision.actor.trim()) missing.push('decision.actor');
    if (!isObject(record.decision) || timestamp(record.decision.time) === null) missing.push('decision.time');
    if (!isObject(record.decision) || !HUMAN_DECISIONS.has(record.decision.approvedOrOverride)) missing.push('decision.approvedOrOverride');
    if (!isObject(record.result) || !TERMINAL_RESULT_STATUSES.has(record.result.status)) missing.push('result.status');
    if (!isObject(record.result) || typeof record.result.summary !== 'string' || !record.result.summary.trim()) missing.push('result.summary');
    if (missing.length) Object.defineProperty(missingById, id, { value: missing, enumerable: true, configurable: true, writable: true });
    else complete++;
  }
  return available({ percent: rounded(complete / records.length * 100), complete, total: records.length, missingById }, 'Completeness of the supplied decision inventory, not proof of decision correctness or a positive outcome. A documented inconclusive result may complete the audit record.');
}
