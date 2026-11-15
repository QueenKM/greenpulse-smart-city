import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, ChevronDown, CircleHelp, Database, Filter, MapPin, Search, ShieldCheck, Thermometer, TrafficCone, X } from "lucide-react";
import { INCIDENT_OWNERS } from "../incidents.mjs";
import "./AlertCenterPanel.css";

const icons = { traffic: TrafficCone, heat: Thermometer, data: Database };
const statusOptions = [
  ["open", "Open alerts"],
  ["all", "All statuses"],
  ["new", "New"],
  ["acknowledged", "Acknowledged"],
  ["in_progress", "In progress"],
  ["paused", "Paused"],
  ["measuring", "Measuring outcome"],
  ["awaiting_review", "Awaiting review"],
  ["resolved", "Closed after review"],
];

export default function AlertCenterPanel({ alerts = [], onOpen, onAcknowledge, onAssign, onResolve }) {
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("open");
  const [search, setSearch] = useState("");
  const [reviewId, setReviewId] = useState(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const reviewButtons = useRef({});
  const id = useId();
  const openCount = alerts.filter((alert) => alert.status !== "resolved").length;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return alerts.filter((alert) => {
      if (severity !== "all" && alert.severity !== severity) return false;
      if (status === "open" && alert.status === "resolved") return false;
      if (!["open", "all"].includes(status) && alert.status !== status) return false;
      return !query || [alert.id, alert.title, alert.place, alert.sourceId, alert.owner, alert.statusLabel].filter(Boolean).join(" ").toLowerCase().includes(query);
    });
  }, [alerts, severity, status, search]);

  useEffect(() => {
    if (reviewId && !alerts.some((alert) => alert.id === reviewId && alert.status !== "resolved")) setReviewId(null);
  }, [alerts, reviewId]);

  const startReview = (alert) => {
    setReviewId(alert.id);
    setReviewConfirmed(false);
    setReviewNote("");
  };
  const cancelReview = () => {
    const trigger = reviewButtons.current[reviewId];
    setReviewId(null);
    trigger?.focus();
  };
  const clearFilters = () => {
    setSeverity("all");
    setStatus("open");
    setSearch("");
  };

  return (
    <section className="gp-alert-center" aria-label="Operational alert queue">
      <div className="gp-alert-summary">
        <div><span className="gp-alert-eyebrow">PRIORITY QUEUE</span><p>Each exception has an owner. Every closure has a human review.</p></div>
        <span className="gp-alert-count"><strong>{openCount}</strong> open <i />{alerts.length - openCount} closed</span>
      </div>
      <div className="gp-alert-filters" role="search" aria-label="Filter operational alerts">
        <label className="gp-alert-search"><Search size={15} /><span className="gp-alert-sr-only">Search alerts</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search incident, source or owner…" /></label>
        <label className="gp-alert-select"><Filter size={13} /><span className="gp-alert-sr-only">Severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="all">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option></select><ChevronDown size={12} /></label>
        <label className="gp-alert-select"><span className="gp-alert-sr-only">Alert status</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={12} /></label>
        <span className="gp-alert-filter-count" role="status">{filtered.length} shown</span>
      </div>
      <div className="gp-alert-items">
        {filtered.map((alert, index) => {
          const Icon = icons[alert.kind] || TrafficCone;
          const resolved = alert.status === "resolved";
          const reviewOpen = reviewId === alert.id;
          const reasonId = `${id}-${alert.id}-reason`;
          return (
            <article className={`gp-alert-item ${alert.tone} ${resolved ? "is-resolved" : ""}`} key={alert.id}>
              <div className="gp-alert-rank" aria-hidden="true">{String(index + 1).padStart(2, "0")}<i /></div>
              <div className="gp-alert-domain-icon"><Icon size={22} strokeWidth={1.5} /></div>
              <div className="gp-alert-body">
                <div className="gp-alert-meta"><span className={`gp-alert-severity ${alert.tone}`}><i />{alert.level}</span><span className={`gp-alert-status status-${alert.status}`}>{resolved && <Check size={11} />}{alert.statusLabel}</span><span className="gp-alert-id">{alert.id}</span><time>{alert.time}</time></div>
                <h2><button className="gp-alert-title-button" onClick={() => onOpen?.({ page: alert.page, alertId: alert.id, sourceId: alert.sourceId })}>{alert.title}</button></h2>
                <p className="gp-alert-place"><MapPin size={12} />{alert.place}</p>
                <p className="gp-alert-description">{alert.detail}</p>
                <div className="gp-alert-controls">
                  <label className="gp-alert-assignment"><span>PROPOSED OWNER</span><select aria-label={`Owner for ${alert.id}`} value={alert.owner} disabled={resolved} onChange={(event) => onAssign?.(alert.id, event.target.value)}>{INCIDENT_OWNERS.map((owner) => <option key={owner} value={owner}>{owner}</option>)}</select><ChevronDown size={11} /></label>
                  {!resolved ? <div className="gp-alert-action-buttons">
                    <button className={`gp-alert-acknowledge ${alert.acknowledged ? "is-acknowledged" : ""}`} disabled={alert.acknowledged} title={alert.acknowledgedBy ? `Acknowledged by ${alert.acknowledgedBy}` : undefined} onClick={() => onAcknowledge?.(alert.id)}>{alert.acknowledged ? <CheckCircle2 size={13} /> : <Check size={13} />}{alert.acknowledged ? "Acknowledged" : "Acknowledge"}</button>
                    <button className="gp-alert-review" ref={(button) => { reviewButtons.current[alert.id] = button; }} disabled={!alert.canResolve} aria-describedby={!alert.canResolve ? reasonId : undefined} title={!alert.canResolve ? alert.resolutionDisabledReason : undefined} onClick={() => startReview(alert)}>Review & resolve<ArrowRight size={13} /></button>
                  </div> : <span className="gp-alert-closure"><CheckCircle2 size={13} />{alert.kind === "heat" ? "Advisory closed after operator review" : "Closed after operator review"}</span>}
                  <button className="gp-alert-open" onClick={() => onOpen?.({ page: alert.page, alertId: alert.id, sourceId: alert.sourceId })}>{alert.action}<ArrowRight size={13} /></button>
                </div>
                {!resolved && !alert.canResolve && <p id={reasonId} className="gp-alert-resolution-reason"><CircleHelp size={12} />{alert.resolutionDisabledReason}</p>}
                {resolved && <p className="gp-alert-resolution-record">Reviewed by {alert.resolvedBy || "the recorded operator"}{alert.reviewNote ? ` · ${alert.reviewNote}` : ""}. {alert.kind === "heat" ? "No heat activation or measured outcome is implied." : "Synthetic demonstration record."}</p>}
                {reviewOpen && !resolved && <div className="gp-alert-resolution-review" role="region" aria-label={`Resolution review for ${alert.id}`}>
                  <div className="gp-alert-review-heading"><ShieldCheck size={18} /><div><span className="gp-alert-eyebrow">EXPLICIT OPERATOR REVIEW</span><h3>{alert.kind === "heat" ? "Close advisory after review" : "Review evidence before resolution"}</h3></div><button aria-label="Cancel resolution review" onClick={cancelReview}><X size={16} /></button></div>
                  <p>{alert.resolutionHelp}</p>
                  {!alert.canResolve && <p className="gp-alert-review-blocked">{alert.resolutionDisabledReason}</p>}
                  <label className="gp-alert-review-note"><span>Review note <small>(optional)</small></span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} maxLength={1000} rows={2} placeholder="Evidence reviewed, closure reason, or follow-up…" /></label>
                  <label className="gp-alert-confirmation"><input type="checkbox" checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} /><span>I reviewed the evidence and accept responsibility for closing this {alert.kind === "heat" ? "advisory" : "alert"}.</span></label>
                  <div className="gp-alert-review-footer"><span>In-memory prototype record · no municipal action</span><button onClick={cancelReview}>Cancel</button><button className="gp-alert-confirm-resolution" disabled={!reviewConfirmed || !alert.canResolve} onClick={() => { if (reviewConfirmed && alert.canResolve) onResolve?.(alert.id, { humanReviewed: true, reviewNote: reviewNote.trim() }); }}>{alert.resolutionLabel || "Confirm resolution"}<Check size={13} /></button></div>
                </div>}
              </div>
            </article>
          );
        })}
        {!filtered.length && <div className="gp-alert-empty"><Filter size={25} /><h2>No alerts match this view.</h2><p>{openCount ? "Adjust the filters or search to return to your operational queue." : "All current synthetic alerts have been explicitly closed after review. Use All statuses to inspect the records."}</p><button onClick={clearFilters}>Reset filters</button>{!openCount && <button onClick={() => setStatus("all")}>View closed records<ArrowRight size={13} /></button>}</div>}
      </div>
      <div className="gp-alert-footnote"><ShieldCheck size={14} /><p>Acknowledgement and assignment do not activate an intervention. AI remains advisory.</p><span>SYNTHETIC DEMONSTRATION EVENTS</span></div>
    </section>
  );
}
