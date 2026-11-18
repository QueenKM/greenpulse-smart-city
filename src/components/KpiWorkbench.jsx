import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowRight, BookOpen, Check, ChevronRight, Clock3,
  Database, FileCheck2, Filter, FlaskConical, Info, Leaf, Plus, Route,
  ShieldCheck, ThermometerSun, Trash2, UsersRound, Wind,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  KPI_DEFINITIONS, DOCUMENT_TRAFFIC_EXAMPLE,
  calculateK1, calculateK2, calculateK3, calculateK4, calculateK7,
} from "../kpi-framework.mjs";
import { formatCityTime } from "../time.mjs";
import "./KpiWorkbench.css";

const ICONS = { K1: Route, K2: Leaf, K3: Wind, K4: Clock3, K5: ThermometerSun, K6: UsersRound, K7: FileCheck2 };
const COLORS = { baseline: "#526e80", predicted: "#a78bfa", input: "#38bdf8", measured: "#34d399", target: "#fbbf24" };
const numeric = (value) => value == null || (typeof value === "string" && !value.trim()) ? null : Number(value);
const samples = (value) => String(value ?? "").trim() ? String(value).trim().split(/[\s,;]+/).map(Number) : [];
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const fmt = (value, digits = 1) => finite(value) ? new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(value) : "No data";
const signed = (value) => finite(value) ? `${value > 0 ? "+" : value < 0 ? "−" : ""}${fmt(Math.abs(value))}%` : "No data";
const copy = (value) => Array.isArray(value) ? value.join(" · ") : value == null ? "Not specified" : typeof value === "object" ? Object.values(value).join(" · ") : String(value);
const defaultFleetRow = () => ({ vehicleClass: "", vehicleKm: "", beforeFactor: "", afterFactor: "" });

function Badge({ tone = "muted", children }) {
  return <span className={`kw-badge kw-tone-${tone}`}><i />{children}</span>;
}

function Plot({ data, unit, target, label }) {
  const plotted = data.filter(({ value }) => finite(value));
  if (!plotted.length) return <div className="kw-empty-chart"><Database size={26} strokeWidth={1.2} /><strong>No data</strong><span>Missing inputs never become zero.</span></div>;
  return <div className="kw-plot" role="img" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={plotted} margin={{ top: 20, right: 18, bottom: 0, left: 0 }} barCategoryGap="28%" accessibilityLayer>
        <CartesianGrid vertical={false} stroke="#294353" strokeOpacity={0.6} strokeDasharray="2 6" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8da6b7", fontSize: 11 }} interval={0} height={36} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6a879a", fontSize: 11 }} width={42} domain={[0, "auto"]} />
        <Tooltip cursor={{ fill: "#52758c0b" }} contentStyle={{ background: "#0b202b", border: "1px solid #38576b", borderRadius: 5, fontSize: 12, color: "#d8e8f0" }} formatter={(value) => [`${fmt(value, 2)} ${unit}`, "Value"]} />
        {finite(target) && <ReferenceLine y={target} stroke={COLORS.target} strokeDasharray="4 5" label={{ value: `Target ${target} ${unit}`, fill: "#beaa73", fontSize: 10, position: "insideTopRight" }} />}
        <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={64} isAnimationActive={false}>
          {plotted.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color || COLORS.input} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

function ResultNote({ children, warning = false }) {
  return <p className={`kw-result-note${warning ? " kw-warning" : ""}`}><Info size={14} /><span>{children}</span></p>;
}

function ObservationGate({ measured }) {
  if (measured) return <p className="kw-input-provenance"><span /> User-entered synthetic demo observations · no municipal data connection</p>;
  return <ResultNote>Observation inputs unlock after the traffic intervention is closed and its explicit measurement window is completed. No actual result is generated automatically.</ResultNote>;
}

function Input({ label, value, onChange, disabled = false, hint, step = "any", min = 0 }) {
  return <label className="kw-input"><span>{label}</span><input type="number" min={min} step={step} value={value ?? ""} onChange={(event) => onChange(event.target.value)} disabled={disabled} placeholder="Not entered" />{hint && <small>{hint}</small>}</label>;
}

function TrafficView({ lifecycle, values, update }) {
  const measured = lifecycle.status === "measured";
  const modified = lifecycle.approvedDecision?.snapshot?.forecast?.status === "unestimated";
  const baseline = DOCUMENT_TRAFFIC_EXAMPLE.baselineMinutes ?? DOCUMENT_TRAFFIC_EXAMPLE.baseline ?? 18;
  const predicted = DOCUMENT_TRAFFIC_EXAMPLE.predictedMinutes ?? DOCUMENT_TRAFFIC_EXAMPLE.predicted ?? 16.2;
  const flow = numeric(values.vehiclesPerHour) ?? 1000;
  const result = calculateK1({ trips: measured ? samples(values.tripDurations) : [], freeFlowMinutes: numeric(values.freeFlowMinutes), baselineMinutes: baseline, predictedMinutes: modified ? null : predicted, vehiclesPerHour: flow, timestampLinkageValidated: values.timestampLinkageValidated === true });
  const observed = measured && values.timestampLinkageValidated === true && finite(result.observedMinutes);
  const plot = modified ? [] : [
    { name: "Illustrative baseline", value: baseline, color: COLORS.baseline },
    { name: "Modelled scenario", value: predicted, color: COLORS.predicted },
  ];
  if (observed) plot.push({ name: "Entered mean", value: result.observedMinutes, color: COLORS.measured });
  return <>
    <div className="kw-result-composition">
      <div className="kw-primary-result">
        <Badge tone={modified ? "amber" : "purple"}>{modified ? "PLAN FORECAST UNAVAILABLE" : "MODELLED · SYNTHETIC EXAMPLE"}</Badge>
        <span className="kw-result-caption">{modified ? "Modified plan benefit" : "Illustrative travel-time improvement"}</span>
        <strong className={`kw-result-number${modified ? " kw-result-words" : ""}`}>{modified ? "No data" : `${fmt(Math.abs(result.predictedChangePercent))}%`}</strong>
        {!modified && <div className="kw-baseline-journey"><span>{baseline.toFixed(1)} <small>min · SYNTHETIC baseline</small></span><ArrowRight size={20} /><b>{predicted.toFixed(1)} <small>min · MODELLED</small></b></div>}
        <p>{modified ? "The approved modification has no numerical forecast. Its benefits cannot inherit the original reference example." : DOCUMENT_TRAFFIC_EXAMPLE.note}</p>
        <div className="kw-actual-summary"><span>{observed ? "SYNTHETIC · ENTERED OBSERVATION MEAN" : "NO DATA · MUNICIPAL TRAVEL TIME"}</span><strong>{observed ? `${fmt(result.observedMinutes, 2)} min` : "No data"}</strong>{observed && <small>{result.sampleCount} synthetic trips · completed demo measurement window</small>}</div>
      </div>
      <div className="kw-visual-area"><div className="kw-chart-heading"><span>MEAN TRAVEL TIME</span><small>Minutes per trip</small></div><Plot data={plot} unit="min" label="Travel time: baseline, document prediction and user-entered observation mean, when available" /><div className="kw-chart-key">{!modified && <><span><i style={{ background: COLORS.baseline }} />SYNTHETIC baseline</span><span><i style={{ background: COLORS.predicted }} />MODELLED scenario</span></>}{observed && <span><i style={{ background: COLORS.measured }} />SYNTHETIC entered observation</span>}</div></div>
    </div>
    <ResultNote warning>K1 is PILOT and conditional. Camera/OCR timestamp linkage between selected monitoring points must be validated. Until then, the operational workflow shows counts and queue patterns only; network-wide congestion is not claimed.</ResultNote>
    <section className="kw-input-section" aria-label="Travel-time observations">
      <div className="kw-section-heading"><h3>Declare assumptions. Enter observations.</h3><Badge tone={observed ? "green" : "cyan"}>{observed ? "SYNTHETIC · USER INPUT" : "PILOT · INPUTS REQUIRED"}</Badge></div>
      <ObservationGate measured={measured} />
      <label className="kw-checkbox"><input type="checkbox" checked={values.timestampLinkageValidated === true} onChange={event => update({ timestampLinkageValidated: event.target.checked })} disabled={!measured} /><span>I have reviewed the selected monitoring-point timestamp linkage for this synthetic pilot exercise. This does not validate a municipal connection.</span></label>
      <div className="kw-input-grid kw-input-grid-3">
        <label className="kw-input"><span>Observed trip durations (minutes)</span><textarea rows={2} value={values.tripDurations ?? ""} onChange={(event) => update({ tripDurations: event.target.value })} placeholder="Enter comma-separated trip times" disabled={!measured || values.timestampLinkageValidated !== true} /><small>Blank by default. One duration per synthetic observed trip.</small></label>
        <Input label="Declared free-flow time (minutes)" value={values.freeFlowMinutes} onChange={(value) => update({ freeFlowMinutes: value })} hint="Optional assumption. Delay and TTI stay unavailable until declared." />
        <Input label="Illustrative vehicles per hour" value={values.vehiclesPerHour} onChange={(value) => update({ vehiclesPerHour: value })} hint="Blank uses the document example of 1,000 vehicles/hour; no observed flow is implied." />
      </div>
      <div className="kw-derived-results"><div><span>Forecast error · |predicted − observed| / observed</span><strong>{!modified && observed ? `${fmt(result.forecastErrorPercent, 2)}%` : "No data"}</strong></div><div><span>Mean delay · observed − declared free flow</span><strong>{observed && finite(result.delayMinutes) ? `${fmt(result.delayMinutes, 2)} min` : "No data"}</strong></div><div><span>Travel-time index · observed / free flow</span><strong>{observed && finite(result.travelTimeIndex) ? fmt(result.travelTimeIndex, 2) : "No data"}</strong></div>{!modified && <div><span>Entered mean vs document baseline</span><strong>{observed ? signed(result.actualChangePercent) : "No data"}</strong></div>}</div>
      {result.reason && <ResultNote>{result.reason}</ResultNote>}
    </section>
    {modified && <details className="kw-reference-example"><summary><BookOpen size={15} /> Separate reference example · not attributed to this plan</summary><p>Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation. The 18.0 → 16.2 minute scenario illustrates 10% improvement; it is not attributed to this modified plan.</p></details>}
  </>;
}

function EmissionsView({ values, update }) {
  const rows = Array.isArray(values.rows) && values.rows.length ? values.rows : [defaultFleetRow()];
  const categories = rows.filter((row) => [row.vehicleKm, row.beforeFactor, row.afterFactor].some((value) => value !== "" && value != null)).map((row) => ({ vehicleKm: numeric(row.vehicleKm), baselineFactor: numeric(row.beforeFactor), interventionFactor: numeric(row.afterFactor) }));
  const result = calculateK2({ categories, episodes: [], validatedK1: values.validatedK1 === true, emissionFactorsApproved: values.emissionFactorsApproved === true });
  const changeRow = (index, patch) => update({ rows: rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) });
  const before = result.baselineKg ?? result.beforeKg;
  const after = result.interventionKg ?? result.afterKg;
  const avoided = result.avoidedKg;
  return <>
    <div className="kw-result-composition"><div className="kw-primary-result"><Badge tone="purple">ESTIMATED · ACTIVITY × FACTOR</Badge><span className="kw-result-caption">Estimated tailpipe CO₂ avoided</span><strong className="kw-result-number kw-result-words">{finite(avoided) ? `${fmt(avoided, 2)} kg CO₂` : "No data"}</strong><p>{finite(avoided) && avoided < 0 ? "A negative avoided value means the entered intervention factors increase estimated emissions. The increase is retained rather than clamped to zero." : "Vehicle activity and fleet-specific factors are required. A traffic-speed change alone cannot establish kilograms of emissions saved."}</p></div><div className="kw-visual-area"><div className="kw-chart-heading"><span>EMISSIONS ESTIMATE</span><small>kg CO₂ · same activity boundary</small></div><Plot data={[{ name: "Baseline estimate", value: before, color: COLORS.baseline }, { name: "Intervention estimate", value: after, color: COLORS.predicted }]} unit="kg CO₂" label="Estimated baseline and intervention emissions, available only after activity and factor inputs" /></div></div>
    <section className="kw-input-section" aria-label="Emissions calculator"><div className="kw-section-heading"><h3>Fleet activity and factors</h3><Badge tone="cyan">USER-ENTERED ASSUMPTIONS</Badge></div><p className="kw-section-description">Use a consistent distance, pollutant and operating boundary. All numerical inputs start blank. These confirmations apply to a synthetic calculation exercise; municipal K2 remains TARGET.</p><label className="kw-checkbox"><input type="checkbox" checked={values.validatedK1 === true} onChange={event => update({ validatedK1: event.target.checked })} /><span>Validated K1/activity inputs reviewed for this synthetic calculation</span></label><label className="kw-checkbox"><input type="checkbox" checked={values.emissionFactorsApproved === true} onChange={event => update({ emissionFactorsApproved: event.target.checked })} /><span>Applicable emission factors explicitly approved for this synthetic calculation</span></label><div className="kw-fleet-heading" aria-hidden="true"><span>Vehicle category</span><span>Vehicle-km</span><span>Before · kg/km</span><span>After · kg/km</span><span /></div>{rows.map((row, index) => <div className="kw-fleet-row" key={index}><label className="kw-input"><span>Vehicle category {index + 1}</span><input type="text" value={row.vehicleClass ?? ""} placeholder="e.g. passenger cars" onChange={(event) => changeRow(index, { vehicleClass: event.target.value })} /></label><Input label={`Vehicle-km, row ${index + 1}`} value={row.vehicleKm} onChange={(value) => changeRow(index, { vehicleKm: value })} /><Input label={`Before kg/km, row ${index + 1}`} value={row.beforeFactor} onChange={(value) => changeRow(index, { beforeFactor: value })} /><Input label={`After kg/km, row ${index + 1}`} value={row.afterFactor} onChange={(value) => changeRow(index, { afterFactor: value })} /><button type="button" className="kw-icon-button" aria-label={`Remove fleet row ${index + 1}`} disabled={rows.length === 1} onClick={() => update({ rows: rows.filter((_, rowIndex) => rowIndex !== index) })}><Trash2 size={14} /></button></div>)}<button type="button" className="kw-text-button" onClick={() => update({ rows: [...rows, defaultFleetRow()] })}><Plus size={14} /> Add vehicle category</button>{result.reason && <ResultNote>{result.reason}</ResultNote>}</section>
    <ResultNote warning>These outputs are estimates, including after a demonstration measurement window. They are never labelled measured emissions. No ARPA or municipal emissions feed is connected.</ResultNote>
  </>;
}

function AirView({ lifecycle, values, update }) {
  const measured = lifecycle.status === "measured";
  const confirmed = measured && values.conditionsConfirmed === true;
  const pm = calculateK3({ matched: measured ? samples(values.pmBefore) : [], activated: measured ? samples(values.pmAfter) : [], conditionsConfirmed: confirmed });
  const no2 = calculateK3({ matched: measured ? samples(values.no2Before) : [], activated: measured ? samples(values.no2After) : [], conditionsConfirmed: confirmed });
  const valid = (result) => measured && result.status === "available";
  const chart = [{ name: "PM2.5 reference", value: valid(pm) ? pm.matchedMean : null, color: COLORS.baseline }, { name: "PM2.5 entered", value: valid(pm) ? pm.activatedMean : null, color: COLORS.measured }, { name: "NO₂ reference", value: valid(no2) ? no2.matchedMean : null, color: COLORS.baseline }, { name: "NO₂ entered", value: valid(no2) ? no2.activatedMean : null, color: COLORS.measured }];
  return <>
    <div className="kw-result-composition"><div className="kw-primary-result"><Badge tone={valid(pm) || valid(no2) ? "green" : "cyan"}>{valid(pm) || valid(no2) ? "SYNTHETIC · MATCHED INPUTS" : "NO DATA · MEASURED INPUTS REQUIRED"}</Badge><span className="kw-result-caption">Measured NO₂ / PM2.5 evidence type</span><strong className="kw-result-number kw-result-words">{valid(pm) || valid(no2) ? "Matched hourly means" : "No data"}</strong><div className="kw-pollutant-results"><div><span>PM2.5</span><strong>{valid(pm) ? signed(pm.changePercent) : "No data"}</strong></div><div><span>NO₂</span><strong>{valid(no2) ? signed(no2.changePercent) : "No data"}</strong></div></div><p>Air concentration is measured separately. No pollutant reduction is inferred from the traffic intervention.</p></div><div className="kw-visual-area"><div className="kw-chart-heading"><span>MATCHED HOURLY CONCENTRATIONS</span><small>µg/m³</small></div><Plot data={chart} unit="µg/m³" label="Matched reference and user-entered hourly air pollutant means" /></div></div>
    <section className="kw-input-section" aria-label="Air-quality observations"><div className="kw-section-heading"><h3>Declare comparable hourly windows</h3><Badge tone="cyan">SYNTHETIC INPUT</Badge></div><ObservationGate measured={measured} /><div className="kw-input-grid kw-input-grid-2">{[["pmBefore", "PM2.5 matched-reference hourly values"], ["pmAfter", "PM2.5 intervention hourly values"], ["no2Before", "NO₂ matched-reference hourly values"], ["no2After", "NO₂ intervention hourly values"]].map(([key, label]) => <label className="kw-input" key={key}><span>{label} (µg/m³)</span><textarea rows={2} value={values[key] ?? ""} onChange={(event) => update({ [key]: event.target.value })} placeholder="Comma-separated hourly observations" disabled={!measured} /></label>)}</div><label className="kw-checkbox"><input type="checkbox" checked={values.conditionsConfirmed === true} onChange={(event) => update({ conditionsConfirmed: event.target.checked })} disabled={!measured} /><span>I confirm the windows are matched for location, hour and relevant conditions.</span></label><ResultNote>{(!valid(pm) && pm.reason) || (!valid(no2) && no2.reason) || "A matched comparison describes entered demo observations; it does not establish causal attribution."}</ResultNote></section>
    <aside className="kw-guideline-context"><Wind size={19} /><div><span>2030 ANNUAL CONTEXT</span><p>PM2.5 <strong>10 µg/m³</strong> · NO₂ <strong>20 µg/m³</strong></p><small>Annual-average context only. This hourly comparison does not demonstrate annual compliance.</small></div></aside>
  </>;
}

function DecisionLatencyView({ lifecycle, alertAt, heatState }) {
  const [useCase, setUseCase] = useState("traffic");
  const recordedTimes = (state, domain, fallback = []) => [
    ...(state.logs || []).filter(log => {
      const logDomain = log.domain || log.useCase || (log.action === "ztl" ? "ztl" : domain);
      return logDomain === domain && (log.humanDecision === true || /approv|reject|declin|modif|override/i.test(log.event || ""));
    }).map(log => log.timestamp),
    ...fallback,
  ].filter(value => value != null && Number.isFinite(new Date(value).getTime())).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
  const isZtl = (lifecycle.approvedDecision?.snapshot?.plan?.action || lifecycle.action) === "ztl";
  const trafficFallback = [!isZtl ? lifecycle.approvedDecision?.approvedAt : null, ...(lifecycle.overrides || []).filter(record => record.action !== "ztl").map(record => record.decision?.time), ...(lifecycle.requests || []).filter(record => record.action !== "ztl").map(record => record.decision?.time)];
  const records = [
    { id: "traffic", name: "Daily Traffic", alertAt, decisionAt: recordedTimes(lifecycle, "traffic", trafficFallback) },
    { id: "ztl", name: "ZTL Access", alertAt, decisionAt: recordedTimes(lifecycle, "ztl", [isZtl ? lifecycle.approvedDecision?.approvedAt : null]) },
    { id: "heat", name: "Heat Preparedness", alertAt: heatState?.alertAt, decisionAt: recordedTimes(heatState || {}, "heat", [heatState?.approvedDecision?.approvedAt]) },
  ];
  const selected = records.find(record => record.id === useCase);
  const result = calculateK4(selected.alertAt, selected.decisionAt);
  const available = result.status === "available" && finite(result.minutes);
  const stamp = value => value != null && Number.isFinite(new Date(value).getTime()) ? formatCityTime(new Date(value)) : "No data";
  return <>
    <div className="kw-latency-cases" role="group" aria-label="Decision timing use case">{records.map(record => <button type="button" key={record.id} aria-pressed={record.id === useCase} onClick={() => setUseCase(record.id)}>{record.name}</button>)}</div>
    <div className="kw-result-composition"><div className="kw-primary-result"><Badge tone="cyan">SYNTHETIC · RECORDED LOG</Badge><span className="kw-result-caption">{selected.name} · alert → human decision</span><strong className="kw-result-number">{available ? fmt(result.minutes, 2) : "No data"}<small>{available ? " min" : ""}</small></strong><p>{available ? result.withinTarget ? "The recorded demo decision is within the illustrative pilot target." : "The recorded demo decision is outside the illustrative pilot target." : "A recorded alert timestamp and a recorded human decision timestamp are required."}</p><div className="kw-actual-summary"><span>ILLUSTRATIVE PILOT TARGET</span><strong>&lt; 10 minutes</strong><small>Under 10 minutes · illustrative pilot target</small></div></div><div className="kw-visual-area"><div className="kw-chart-heading"><span>HUMAN RESPONSE LATENCY</span><small>Minutes</small></div><Plot data={records.map(record => ({ name: record.name, value: calculateK4(record.alertAt, record.decisionAt).minutes, color: record.id === useCase ? COLORS.input : COLORS.baseline }))} unit="min" target={10} label="Synthetic alert-to-human-decision latency; illustrative pilot target under ten minutes" /></div></div>
    <div className="kw-event-timeline"><div><span className="kw-event-dot" /><span>Alert recorded</span><strong>{stamp(selected.alertAt)}</strong></div><ChevronRight size={17} /><div><span className="kw-event-dot kw-purple-dot" /><span>Human decision recorded</span><strong>{stamp(selected.decisionAt)}</strong></div></div><ResultNote>{result.reason || "Approvals, rejections and modifications are human decisions. Execution latency and environmental impact are separate measures."}</ResultNote>
  </>;
}

function HeatMetricView({ metricId, heatState, onNavigate }) {
  const exposure = metricId === "K5";
  const metric = exposure ? heatState?.metrics?.exposure : heatState?.metrics?.cooling;
  const valid = metric?.valid === true && finite(metric.value);
  const unit = exposure ? metric?.unit || "person-hours" : "%";
  const baseline = typeof metric?.baseline === "object" ? metric.baseline?.value : metric?.baseline;
  const planned = typeof metric?.planned === "object" ? metric.planned?.value : metric?.planned;
  return <><div className="kw-result-composition"><div className="kw-primary-result"><Badge tone="amber">NO DATA · VALIDATION REQUIRED</Badge><span className="kw-result-caption">{exposure ? "Zone heat exposure" : "Vulnerable population within declared reach"}</span><strong className={`kw-result-number${valid ? "" : " kw-result-words"}`}>{valid ? fmt(metric.value) : "No data"}<small>{valid ? ` ${unit}` : ""}</small></strong><p>{exposure ? "TARGET: person-hours require validated local air-temperature/humidity sensing, aggregated population and a declared threshold. No local sensing network is documented." : "PILOT: this share requires a validated cooling-point inventory and an agreed pilot-defined walking-time or network-distance threshold."}</p>{!exposure && valid && <div className="kw-actual-summary"><span>DECLARED POPULATION</span><strong>{fmt(metric.servedVulnerable, 0)} / {fmt(metric.totalVulnerable, 0)}</strong><small>{finite(metric.reachMinutes) ? `${fmt(metric.reachMinutes)}-minute walking reach` : "Walking reach must be declared"}</small></div>}</div><div className="kw-visual-area"><div className="kw-chart-heading"><span>{exposure ? "MODELLED EXPOSURE" : "DECLARED COOLING ACCESS"}</span><small>{unit}</small></div><Plot data={[{ name: "Baseline model", value: valid && finite(baseline) ? baseline : null, color: COLORS.baseline }, { name: "Declared model", value: valid ? metric.value : null, color: COLORS.predicted }, { name: "Planned model", value: valid && finite(planned) && planned !== metric.value ? planned : null, color: COLORS.target }]} unit={unit} label={exposure ? "Declared synthetic zone heat exposure model" : "Declared synthetic vulnerable-population cooling reach"} /></div></div><div className="kw-heat-definition"><ThermometerSun size={23} /><div><h3>{valid ? "Definition and review recorded in Heat Preparedness" : "Validate the required evidence before calculating a value"}</h3><p>{metric?.reason || (exposure ? "Set the air-temperature threshold, matching time window and zone population assumptions. Land-surface temperature is not substituted for air temperature." : "Declare the walking reach and vulnerable-population denominator. Generic map coverage is not the same as vulnerable-population access.")}</p>{onNavigate && <button type="button" className="kw-text-button" onClick={() => onNavigate("Heat Preparedness")}>Open Heat Preparedness evidence <ArrowRight size={14} /></button>}</div></div><ResultNote warning>No real-time health-outcome or heat-exposure feed is available. A modelled priority-area map is not observed exposure, verified cooling access or measured municipal benefit.</ResultNote></>;
}

function AuditCoverageView({ records }) {
  const result = calculateK7(records);
  const total = result.total ?? records.length;
  const complete = result.complete ?? 0;
  const coverage = result.percent;
  const recommendationText = (record) => {
    if (typeof record.recommendation === "string") return record.recommendation;
    const value = record.recommendation;
    if (typeof value?.label === "string") return value.label;
    if (typeof value?.summary === "string") return value.summary;
    if (Array.isArray(value?.bundle)) return value.bundle.filter((item) => typeof item === "string").join(" · ");
    return "Recommendation not recorded";
  };
  return <>
    <div className="kw-result-composition">
      <div className="kw-primary-result">
        <Badge tone="cyan">GOVERNANCE · RECORD COMPLETENESS</Badge>
        <span className="kw-result-caption">Complete decision records</span>
        <strong className="kw-result-number">{finite(coverage) ? fmt(coverage) : "No data"}<small>{finite(coverage) ? "%" : ""}</small></strong>
        <div className="kw-baseline-journey"><span>{fmt(complete, 0)} <small>complete</small></span><span className="kw-muted">/</span><b>{fmt(total, 0)} <small>recorded</small></b></div>
        <p>Data, model version, recommendation, accountable decision and a documented result must all be present. Pending outcomes remain incomplete. Target: 100% complete decision logging. K7 measures logging completeness, not decision quality.</p>
      </div>
      <div className="kw-visual-area">
        <div className="kw-chart-heading"><span>AUDIT COMPLETENESS</span><small>Decision records</small></div>
        <Plot data={[{ name: "Complete", value: total ? complete : null, color: COLORS.input }, { name: "Incomplete", value: total ? Math.max(0, total - complete) : null, color: COLORS.baseline }]} unit="records" label="Complete and incomplete demonstration decision records" />
      </div>
    </div>
    <section className="kw-audit-records" aria-label="Decision record coverage">
      <div className="kw-section-heading"><h3>Record evidence</h3><span>{total} records</span></div>
      {records.length ? records.map((record, index) => {
        const id = typeof record.id === "string" && record.id.trim() ? record.id : `record-${index + 1}`;
        const missing = result.missingById?.[id] || [];
        return <div className="kw-audit-row" key={id}>
          <FileCheck2 size={17} />
          <div>
            <strong>{id}</strong>
            <span>{recommendationText(record)}</span>
            <small>Model version: {typeof record.modelVersion === "string" && record.modelVersion ? record.modelVersion : "not recorded"}</small>
            {missing.length > 0 && <small className="kw-audit-missing">Missing: {missing.join(" · ")}</small>}
          </div>
          <Badge tone={record.result?.status === "pending" || !record.result ? "amber" : "cyan"}>{record.result?.status || "RESULT MISSING"}</Badge>
        </div>;
      }) : <p className="kw-section-description">No decisions have been recorded. No data: an empty log does not equal 100%.</p>}
    </section>
    <ResultNote>{result.reason || "A documented inconclusive result can complete an audit record. Log existence and completeness do not establish decision correctness, causal impact or positive outcomes."}</ResultNote>
  </>;
}

function Method({ definition }) {
  return <section className="kw-method" aria-label="KPI definition and method"><div className="kw-section-heading"><h3><BookOpen size={15} /> Definition &amp; method</h3><span>{definition.id} · {definition.unit}</span></div><div className="kw-formula"><span>FORMULA</span><p>{copy(definition.formula)}</p></div><dl className="kw-method-grid"><div><dt>Baseline</dt><dd>{copy(definition.baseline)}</dd></div><div><dt>Target</dt><dd>{copy(definition.target)}</dd></div><div><dt>Frequency</dt><dd>{copy(definition.frequency)}</dd></div><div><dt>Accountable owner</dt><dd>{copy(definition.owner)}</dd></div></dl><div className="kw-method-bottom"><div><span>REQUIRED INPUTS</span><ul>{(definition.inputs || []).map((input, index) => <li key={index}>{copy(input)}</li>)}</ul></div><div><span>LIMITS &amp; INTERPRETATION</span><ul>{(definition.limits || []).map((limit, index) => <li key={index}>{copy(limit)}</li>)}</ul></div></div><p className="kw-source"><Database size={13} /><span><strong>Source / provenance</strong> {copy(definition.source)}</span></p></section>;
}

export default function KpiWorkbench({
  initialKpiId = "K1",
  trafficLifecycle = {}, heatState, alertAt,
  observations = {}, onObservationsChange,
  decisionRecords = [], onNavigate,
}) {
  const [selected, setSelected] = useState(() => KPI_DEFINITIONS.some(item => item.id === initialKpiId) ? initialKpiId : "K1");
  useEffect(() => { if (KPI_DEFINITIONS.some(item => item.id === initialKpiId)) setSelected(initialKpiId); }, [initialKpiId]);
  const [group, setGroup] = useState("All");
  const [useCase, setUseCase] = useState("All");
  const groups = useMemo(() => ["All", ...new Set(KPI_DEFINITIONS.map((item) => item.group))], []);
  const filtered = useMemo(() => KPI_DEFINITIONS.filter((item) => (group === "All" || item.group === group) && (useCase === "All" || item.useCase === useCase || item.useCase === "Both")), [group, useCase]);
  useEffect(() => {
    if (filtered.length && !filtered.some((item) => item.id === selected)) setSelected(filtered[0].id);
  }, [filtered, selected]);
  const definition = KPI_DEFINITIONS.find((item) => item.id === selected) || KPI_DEFINITIONS[0];
  const update = (key, patch) => onObservationsChange?.((current) => ({ ...current, [key]: { ...current?.[key], ...patch } }));
  const values = (key) => observations[key] || {};
  const Icon = ICONS[definition.id] || ShieldCheck;
  return <div className="kpi-workbench">
    <header className="kw-intro"><div><span className="kw-overline">KPI FRAMEWORK / PROGRESSIVE READINESS</span><h2>Seven indicators. Explicit evidence.</h2><p>One shared municipal decision capability. Seven indicators with explicit readiness and evidence boundaries.</p></div><Badge tone="amber">SYNTHETIC</Badge></header>
    <div className="kw-layout"><aside className="kw-index"><div className="kw-filter-label"><Filter size={13} />INDICATOR LIBRARY<span>07</span></div><label className="kw-filter"><span>Group</span><select value={group} onChange={(event) => setGroup(event.target.value)}>{groups.map((value) => <option value={value} key={value}>{value === "All" ? "All groups" : value}</option>)}</select></label><label className="kw-filter"><span>Use case</span><select value={useCase} onChange={(event) => setUseCase(event.target.value)}><option value="All">All use cases</option><option value="Traffic">Daily Traffic / ZTL</option><option value="Heat">Heat Preparedness</option></select></label><nav className="kw-selector" aria-label="KPI selector">{filtered.map((item) => { const ItemIcon = ICONS[item.id] || FileCheck2; return <button type="button" key={item.id} className={item.id === definition.id ? "is-selected" : ""} aria-pressed={item.id === definition.id} onClick={() => setSelected(item.id)}><span className="kw-indicator-number">{item.id}</span><ItemIcon size={16} /><span className="kw-indicator-title">{item.title}<small>{item.readiness} · {item.provenance}</small></span><ChevronRight size={13} /></button>; })}</nav>{!filtered.length && <p className="kw-no-matches">No indicators match these filters. Choose another group or use case.</p>}<p className="kw-index-note"><ShieldCheck size={14} /><span>A measurement window never supplies its own observation data.</span></p></aside>
      <article className="kw-detail" aria-label={`${definition.id} ${definition.title}`}><div className="kw-detail-heading"><span className="kw-detail-icon"><Icon size={22} strokeWidth={1.4} /></span><div><span className="kw-overline">{definition.id} / {definition.group.toUpperCase()}</span><h2>{definition.title}</h2></div><span className="kw-unit">{definition.unit}</span></div>
        <section className="kw-readiness" aria-label={`${definition.id} readiness and provenance`}><div><Badge tone={definition.readiness === "TARGET" ? "purple" : "cyan"}>{definition.readiness}</Badge><Badge tone={definition.provenance === "MEASURED" ? "green" : definition.provenance === "ESTIMATED" ? "amber" : "purple"}>{definition.provenance}</Badge><span>Evidence type / demonstration provenance</span></div><p>{definition.readinessNote}</p></section>
        {(definition.id === "K5" || definition.id === "K6" ? heatState?.status : trafficLifecycle.status) === "measuring" && <p className="kw-window-status" role="status">MEASURING OUTCOME · Demonstration window in progress; no observations are inferred.</p>}
        {(definition.id === "K5" || definition.id === "K6" ? heatState?.status : trafficLifecycle.status) === "measured" && <p className="kw-window-status" role="status">MEASUREMENT WINDOW COMPLETE · Numerical outcomes require explicit evidence; completion is not proof of success.</p>}
        {definition.id === "K1" && <TrafficView lifecycle={trafficLifecycle} values={values("k1")} update={(patch) => update("k1", patch)} />}
        {definition.id === "K2" && <EmissionsView values={values("k2")} update={(patch) => update("k2", patch)} />}
        {definition.id === "K3" && <AirView lifecycle={trafficLifecycle} values={values("k3")} update={(patch) => update("k3", patch)} />}
        {definition.id === "K4" && <DecisionLatencyView lifecycle={trafficLifecycle} alertAt={alertAt} heatState={heatState} />}
        {(definition.id === "K5" || definition.id === "K6") && <HeatMetricView metricId={definition.id} heatState={heatState} onNavigate={onNavigate} />}
        {definition.id === "K7" && <AuditCoverageView records={decisionRecords} />}
        <Method definition={definition} />
        <footer className="kw-provenance"><FlaskConical size={15} /><p>TARGET-STATE PROTOTYPE · Synthetic demonstration data. Leuven geography provides spatial context only. No municipal system or ARPA feed is connected; modelled results are not observed outcomes.</p></footer>
      </article>
    </div>
  </div>;
}
