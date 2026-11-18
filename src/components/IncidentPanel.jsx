import React, { useId } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Clock3,
  GitBranch,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import "./IncidentPanel.css";

const ID = "INC-2026-1109-H03";

export default function IncidentPanel({
  onCompare,
  selected = false,
  onEvidence,
  forecastOffset = 0,
  forecast = null,
  readiness,
  onInspectDataHealth,
}) {
  const titleId = useId();

  return (
    <section
      className={`incident-panel incident-v2 ${selected ? "focused" : ""}`}
      aria-label="Historic Centre incident"
      aria-labelledby={titleId}
    >
      <div className="gp-incident-top">
        <span className="gp-incident-id">{ID}</span>
        <span className="gp-incident-badge is-critical">
          <i />
          SYNTHETIC ALERT
        </span>
      </div>
      <h2 className="gp-incident-title" id={titleId}>
        Recurring queue
        <br />
        at a monitored location
      </h2>
      <div className="gp-incident-location-row">
        <p className="gp-incident-location">
          <MapPin size={12} />
          <span>Leuven · Historic Centre</span>
        </p>
        <div className="gp-incident-status">
          <Clock3 size={13} />
          <span>AWAITING APPROVAL</span>
          <i />
        </div>
      </div>

      <div className="gp-incident-readings">
        <div className="gp-incident-observations">
          <div className="gp-incident-section-label">
            <span className="gp-incident-badge is-live">
              <i />
              SYNTHETIC
            </span>
            <span>Synthetic</span>
          </div>
          <dl className="gp-incident-metrics">
            <div>
              <dt>Selected-point count</dt>
              <dd>
                167<small> vehicles / 30 min</small>
              </dd>
            </div>
            <div>
              <dt>Indicative queue</dt>
              <dd>
                5<small> vehicles</small>
              </dd>
            </div>
            <div>
              <dt>Corridor travel time</dt>
              <dd>
                <small>No data · PILOT</small>
              </dd>
            </div>
          </dl>
        </div>

        <div className="gp-incident-forecast" aria-live="polite">
          <div><span className="gp-incident-badge is-modelled">PILOT · CONDITIONAL</span><p><span className="gp-incident-forecast-description">K1 timestamp linkage</span><strong>Validation required</strong></p></div>
          <strong className="gp-incident-forecast-value gp-no-data">No data</strong>
        </div>
      </div>

      <div className="gp-incident-recommendation">
        <span className="gp-incident-recommendation-label">
          <GitBranch size={13} />
          AI-SUPPORTED OPTION · TARGET
        </span>
        <h3>
          Review a time-limited signal plan<span>Mobility approval → authorised execution</span>
        </h3>
        <p className="gp-incident-expected">
          <span>K1 illustration</span>
          <b>
            −10% <small>travel time</small>
          </b>
          <b>
            18.0 → 16.2 <small>min · MODELLED</small>
          </b>
        </p>
        <p className="gp-illustration-note">Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation.</p>
      </div>
      {readiness && !readiness.canApprove && (
        <div className="workflow-readiness" role="status">
          <strong>Critical evidence unavailable</strong>
          <span>Reference assumptions remain visible. Approval is blocked.</span>
          <button type="button" onClick={onInspectDataHealth}>Inspect data health <ArrowRight size={12} /></button>
        </div>
      )}
      <button
        className="button primary gp-incident-compare"
        onClick={onCompare}
      >
        Explore target scenarios
        <ArrowRight size={16} />
      </button>

      <details className="gp-incident-details">
        <summary>
          Evidence & model details
          <ChevronDown size={13} />
        </summary>
        <div className="gp-incident-detail-body">
          <dl>
            <div>
              <dt>Traffic T12–T18</dt>
              <dd>18 sec freshness</dd>
            </div>
            <div>
              <dt>NO₂ / PM2.5 · TARGET</dt>
              <dd>No data · integration required</dd>
            </div>
            <div>
              <dt>Forecast horizon</dt>
              <dd>+60 minutes</dd>
            </div>
          </dl>
          <p>
            Illustrative scenario on real Leuven geography. Source readings and
            forecasts are synthetic demonstration data, not Leuven operational
            observations.
          </p>
          <p className="gp-incident-human">
            <ShieldCheck size={13} />
            <span>
              AI recommends. Mobility Department approves; an authorised traffic-signal operator executes.
            </span>
          </p>
          {onEvidence && (
            <button className="gp-incident-evidence" onClick={onEvidence}>
              <BookOpen size={13} />
              Review supporting evidence
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </details>
    </section>
  );
}
