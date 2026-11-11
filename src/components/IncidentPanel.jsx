import React, { useId } from "react";
import {
  ArrowRight,
  ArrowUpRight,
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
}) {
  const titleId = useId();
  const minutes = forecastOffset > 0 ? forecastOffset : 38;
  const congestion =
    forecastOffset > 0
      ? (forecast?.congestion ?? Math.round(72 + (forecastOffset / 60) * 15))
      : 82;

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
          CRITICAL
        </span>
      </div>
      <h2 className="gp-incident-title" id={titleId}>
        Traffic & Air Quality
        <br />
        Deterioration
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
              LIVE
            </span>
            <span>Synthetic</span>
          </div>
          <dl className="gp-incident-metrics">
            <div>
              <dt>Traffic speed</dt>
              <dd>
                19<small> km/h</small>
              </dd>
            </div>
            <div>
              <dt>Congestion</dt>
              <dd>
                72<small>%</small>
              </dd>
            </div>
            <div>
              <dt>PM2.5</dt>
              <dd>
                27<small> µg/m³</small>
              </dd>
            </div>
          </dl>
        </div>

        <div className="gp-incident-forecast" aria-live="polite">
          <div>
            <span className="gp-incident-badge is-modelled">MODELLED</span>
            <p title={`Congestion in ${minutes} minutes`}>
              <span className="gp-incident-forecast-description">
                Congestion
              </span>
              <strong>+{minutes} min</strong>
            </p>
          </div>
          <strong className="gp-incident-forecast-value">
            {congestion}
            <small>%</small>
            <ArrowUpRight size={18} />
          </strong>
        </div>
      </div>

      <div className="gp-incident-recommendation">
        <span className="gp-incident-recommendation-label">
          <GitBranch size={13} />
          AI RECOMMENDATION
        </span>
        <h3>
          Adaptive traffic signal timing<span>+ targeted route guidance</span>
        </h3>
        <p className="gp-incident-expected">
          <span>Expected</span>
          <b>
            −12% <small>congestion</small>
          </b>
          <b>
            −8% <small>emissions</small>
          </b>
        </p>
      </div>
      <button
        className="button primary gp-incident-compare"
        onClick={onCompare}
      >
        Compare scenarios
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
              <dt>AQ-04</dt>
              <dd>52 sec freshness</dd>
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
              AI recommends. An identified operator must approve every
              intervention.
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
