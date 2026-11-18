import { useCallback, useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, Fingerprint, Info, MapPin, Pause, Play, ShieldCheck, Sun, TriangleAlert, Users, Wind } from "lucide-react";
import CityMap from "./CityMap";
import { Drawer } from "./Dialogs";
import { deriveHeatMetrics, evaluateHeatReadiness } from "../heat-use-case.mjs";
import "./HeatWorkspace.css";

const CHECKS = [
  ["officialForecastReviewed", "Official forecast source, issue time and coverage reviewed"],
  ["territorialInformationReviewed", "Aggregated territorial information and indicative priority areas reviewed"],
  ["outreachReviewed", "Social Services outreach and support arrangements reviewed"],
  ["accessibilityChecked", "Accessibility and protected access reviewed"],
  ["safetyChecked", "Civil Protection safety and escalation procedures reviewed"],
];
const RESPONSES = [
  ["shade", "Review shade and public-space arrangements", Sun],
  ["water", "Prepare drinking-water provision", MapPin],
  ["notifications", "Coordinate accessible outreach with Social Services", Users],
  ["reschedule", "Review outdoor work and event operations", Clock3],
];
const PATH = ["Official forecast", "Validation", "Indicative priority areas", "Civil Protection review and approval", "Preparedness actions", "Post-event review"];
const number = value => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("en-GB", { maximumFractionDigits: 1 }) : "No data";
function CheckField({ checked, onChange, children, disabled = false }) {
  return <label className="heatw-check"><input type="checkbox" checked={checked === true} disabled={disabled} onChange={event => onChange(event.target.checked)} /><span>{children}</span></label>;
}
function Status({ state }) {
  const states = { idle: ["amber", "PILOT · PREPAREDNESS REVIEW"], active: ["green", "SYNTHETIC · HUMAN APPROVED"], paused: ["amber", "SYNTHETIC · PAUSED"], measuring: ["purple", "SYNTHETIC · POST-EVENT REVIEW"], measured: ["cyan", "SYNTHETIC · REVIEW RECORDED"] };
  const [tone, label] = states[state.status] || states.idle;
  return <span className={`heatw-status ${tone}`}><i />{label}</span>;
}

export default function HeatWorkspace({ state, dispatch, maturity = "TARGET", viewContext, onViewContextChange, onOpenKpi, mapEnabled = true }) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const metrics = useMemo(() => deriveHeatMetrics(state), [state]);
  const plan = state.approvedDecision?.recommendation.plan || state.draft;
  const idle = state.status === "idle";
  const readiness = useMemo(() => evaluateHeatReadiness(state, maturity, plan.authority, plan.operator), [state, maturity, plan.authority, plan.operator]);
  const patch = value => dispatch({ type: "UPDATE_DRAFT", patch: value });
  const updateCamera = useCallback(camera => onViewContextChange?.(value => ({ ...value, camera: typeof camera === "function" ? camera(value.camera) : camera })), [onViewContextChange]);
  const updateViewMode = useCallback(viewMode => onViewContextChange?.(value => ({ ...value, viewMode })), [onViewContextChange]);
  const updateEntity = useCallback(entity => onViewContextChange?.(value => ({ ...value, entity })), [onViewContextChange]);
  const humanIdentityValid = plan.authority === "Civil Protection" && plan.operator.trim().length >= 3;
  const approve = () => {
    if (!idle || !confirmed || !readiness.ready) return;
    dispatch({ type: "APPROVE", humanApproved: true, maturity, authority: plan.authority, operator: plan.operator });
    setReviewOpen(false);
  };
  const disposition = type => {
    if (!humanIdentityValid || reason.trim().length < 3) return;
    dispatch({ type, humanReviewed: true, authority: plan.authority, operator: plan.operator, reason });
    setReviewOpen(false);
    setReason("");
  };
  return <div className="heatw-workspace">
    <header className="heatw-intro"><div><span className="heatw-eyebrow">WORKFLOW 03 / ONE SHARED MUNICIPAL DECISION CAPABILITY</span><h2>Heatwave Preparedness</h2><p>Use official forecasts and territorial information to coordinate preparedness.</p></div><Status state={state} /></header>
    <div className="heatw-phase-note"><Info size={18} /><p><strong>CURRENT evidence · no municipal systems connected.</strong> Official external weather forecasts, demographic registry, municipal GIS, partial tree and green-space inventory, and civil-protection plans.</p></div>
    <div className="heatw-composition heatw-preparedness-composition">
      <section className="heatw-city-area" aria-label="Indicative heat preparedness context">
        <div className="heatw-map heat-map">
          {mapEnabled ? <CityMap mode="heat" maturity={maturity} layers={{ heat: maturity === "TARGET", heritage: true, sensors: false, traffic: false, air: false }} camera={viewContext?.camera} onCameraChange={onViewContextChange ? updateCamera : undefined} viewMode={viewContext?.viewMode} onViewModeChange={onViewContextChange ? updateViewMode : undefined} selectedEntity={viewContext?.entity} onSelectedEntityChange={onViewContextChange ? updateEntity : undefined} /> : <div className="heatw-map-fallback" role="status"><MapPin size={28} /><strong>Text-only preparedness context</strong><p>The indicative geography is unavailable. Review the evidence, responsibilities and preparedness path below.</p><small>LEUVEN URBAN MODEL · Synthetic demonstration data</small></div>}
          <div className="heatw-map-heading"><span className="heatw-eyebrow">MODELLED · SYNTHETIC · INDICATIVE PRIORITY AREAS</span><h3>Leuven territorial context</h3><p>Illustrative operational scenario. Green-space distribution does not prove cooling.</p></div>
          <div className="heatw-map-readings"><span><Wind size={15} /><strong>No data</strong><small>Official forecast feed not connected</small></span><span><Sun size={15} /><strong>No data</strong><small>Validated local temperature / humidity</small></span></div>
        </div>
        <section className="heatw-path" aria-label="Heat preparedness decision path"><span className="heatw-eyebrow">DECISION PATH</span><ol>{PATH.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol></section>
        <div className="heatw-claims"><section><h3>What GreenPulse can claim</h3><p>Coordinate a human-reviewed preparedness workflow and show indicative priority areas from validated official forecasts and territorial information when available.</p></section><section><h3>What GreenPulse cannot claim yet</h3><p>Measured local heat exposure, verified cooling access, real-time health outcomes, proven cooling from green space, or quantified health benefits.</p></section></div>
      </section>
      <aside className="heatw-planner" aria-label="Heat preparedness plan">
        <div className="heatw-planner-heading"><span className="heatw-eyebrow">HUMAN AUTHORITY</span><h3>Civil Protection leads</h3></div>
        <div className="heatw-plan-scroll">
          <section className="heatw-plan-section"><h3 className="heatw-small-heading">Actors</h3><div className="heatw-actor-list"><p><strong>Civil Protection</strong>Response lead, review, approval and activation</p><p><strong>Environment / Urban Planning</strong>Environmental interpretation</p><p><strong>Social Services</strong>Outreach and support for vulnerable residents</p><p><strong>IT / Data Office</strong>Source access, integration and validation</p></div></section>
          <section className="heatw-plan-section"><h3 className="heatw-small-heading">Data gaps</h3><ul className="heatw-gap-list"><li>No documented local temperature / humidity sensor network</li><li>No validated cooling-point inventory</li><li>No real-time health-outcome or heat-exposure feed</li><li>Local priority areas are indicative / modelled</li></ul></section>
          <section className="heatw-plan-section"><h3 className="heatw-small-heading">Preparedness actions</h3>{RESPONSES.map(([key, label, Icon]) => <CheckField key={key} checked={plan[key]} disabled={!idle} onChange={checked => patch({ [key]: checked })}><span className="heatw-response-title"><Icon size={14} />{label}</span></CheckField>)}<p>SYNTHETIC rehearsal only. No messages are sent, cooling sites activated, or physical operations changed by this prototype.</p></section>
        </div>
        <div className="heatw-plan-actions">{idle ? <><span className="heatw-readiness-count"><Info size={13} />{readiness.issues.length ? `${readiness.issues.length} review requirements pending` : "Human review requirements recorded"}</span><button type="button" className="heatw-primary" onClick={() => { setConfirmed(false); setReviewOpen(true); }} disabled={maturity === "CURRENT"}>Review preparedness response <ArrowRight size={15} /></button>{maturity === "CURRENT" && <span className="heatw-small-note">PILOT workflow available in MVP / TARGET.</span>}</> : <><div className="heatw-approved-owner"><Fingerprint size={17} /><span><strong>{state.approvedDecision?.operator}</strong><small>Civil Protection · accountable approval and activation</small></span></div>{["active", "paused"].includes(state.status) && <div className="heatw-active-buttons"><button type="button" onClick={() => dispatch({ type: state.status === "paused" ? "RESUME" : "PAUSE" })}>{state.status === "paused" ? <Play size={14} /> : <Pause size={14} />}{state.status === "paused" ? "Resume preparedness" : "Pause preparedness"}</button><button type="button" onClick={() => dispatch({ type: "CLOSE" })}>Close for post-event review <ArrowRight size={14} /></button></div>}{state.status === "measuring" && <p role="status">SYNTHETIC post-event review window in progress. No measured outcome is inferred.</p>}{state.status === "measured" && <p role="status">Post-event review recorded. K5 and K6 remain No data until their inputs are validated.</p>}</>}</div>
      </aside>
    </div>
    <div className="heatw-impact-ribbon" aria-label="Heat KPI impact"><button type="button" onClick={() => onOpenKpi?.("K5")}><span>K5 · TARGET · HEAT EXPOSURE</span><strong>No data</strong><p>Requires validated local heat sensing</p></button><button type="button" onClick={() => onOpenKpi?.("K6")}><span>K6 · PILOT · COOLING REACH</span><strong>No data</strong><p>Inventory and pilot-defined walking-time or network-distance threshold required</p></button><button type="button" onClick={() => onOpenKpi?.("K4")}><span>K4 / K7 · PILOT-READY</span><strong>Decision evidence</strong><p>Human decision timing and complete logging</p></button><div className="heatw-calculation-note"><Info size={17} /><p><strong>SYNTHETIC / MODELLED</strong>Preparedness approval does not validate an exposure model or prove a cooling effect.</p></div></div>
    <details className="heatw-method-explorer"><summary>Target method reference · synthetic assumptions</summary><p>Retained method demonstration only. These assumptions do not establish municipal K5 / K6 readiness and are not used to approve current preparedness.</p><div className="heatw-method-fields"><label className="heatw-input">Demonstration air-temperature threshold (°C)<input type="number" value={plan.thresholdC ?? ""} disabled={!idle} onChange={event => patch({ thresholdC: event.target.value === "" ? null : Number(event.target.value) })} /></label><label className="heatw-input">Pilot-defined walking-time threshold (minutes)<input type="number" value={plan.reachMinutes ?? ""} disabled={!idle} onChange={event => patch({ reachMinutes: event.target.value === "" ? null : Number(event.target.value) })} /></label></div><p>MODELLED / SYNTHETIC temperature example: {number(state.data.modelledAirC)}°C. No local sensing is documented. Cooling locations in the retained method are hypothetical deployments, not a validated inventory.</p><p>Person-hours = population × hours above a declared air-temperature threshold. Cooling reach = vulnerable residents within the pilot-defined threshold / all vulnerable residents × 100. Green-space coverage is not a substitute.</p></details>
    <Drawer open={reviewOpen} onClose={() => setReviewOpen(false)} title="Review heat preparedness" label="CIVIL PROTECTION / HUMAN APPROVAL" className="heatw-approval-drawer" footer={<><button type="button" onClick={() => setReviewOpen(false)}>Cancel</button><button type="button" className="primary-button" disabled={!readiness.ready || !confirmed} onClick={approve}><Check size={15} />Approve & activate preparedness</button></>}>
      <h2 className="heatw-drawer-title">Civil Protection approves the response.</h2><p className="heatw-drawer-copy">PILOT · Synthetic workflow rehearsal. AI may recommend; it cannot approve or activate. Official-forecast validation supports preparedness, while local heat-exposure and cooling-access KPIs remain unavailable.</p>
      <label className="heatw-input">Approval authority<select value={plan.authority} disabled={!idle} onChange={event => patch({ authority: event.target.value })}><option value="">Select authority</option><option value="Civil Protection">Civil Protection</option></select></label>
      <label className="heatw-input">Accountable Civil Protection approver<input value={plan.operator} disabled={!idle} placeholder="Name or accountable operator ID" onChange={event => patch({ operator: event.target.value })} /></label>
      <section className="heatw-protective-checks"><h3><ShieldCheck size={17} />Preparedness validation</h3>{CHECKS.map(([key, label]) => <CheckField key={key} checked={plan[key]} onChange={checked => patch({ [key]: checked })}>{label}</CheckField>)}</section>
      {!!readiness.issues.length && <section className="heatw-missing-evidence" role="status"><h3><TriangleAlert size={16} />Review requirements</h3><ul>{readiness.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></section>}
      <CheckField checked={confirmed} onChange={setConfirmed}>I am the accountable Civil Protection approver and authorise this synthetic preparedness response.</CheckField>
      <section className="heatw-disposition"><label className="heatw-input">Reason for rejection or reviewed modification<textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} /></label><div className="heatw-active-buttons"><button type="button" disabled={!humanIdentityValid || reason.trim().length < 3} onClick={() => disposition("REJECT")}>Reject & record</button><button type="button" disabled={!humanIdentityValid || reason.trim().length < 3} onClick={() => disposition("MODIFY")}>Record reviewed modifications</button></div></section>
      <p className="heatw-approval-boundary"><ShieldCheck size={15} />Approvals, rejections, reviewed modifications and lifecycle actions are written to the Decision Log.</p>
    </Drawer>
  </div>;
}
