import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Database,
  Gauge,
  MapPin,
  Radio,
  Route,
  ShieldCheck,
  Sun,
  Users,
  Wind,
  Wrench,
  WifiOff,
} from "lucide-react";
import {
  createInitialQualityState,
  evaluateDataReadiness,
  getQualitySummary,
  getSourceStatus,
  QUALITY_SOURCES,
} from "../quality.mjs";
import "./DataHealthPanel.css";

const SOURCE_ICONS = {
  traffic: Activity,
  air: Wind,
  parking: MapPin,
  transit: Route,
  weather: Sun,
  visitor: Users,
  reference: Database,
};
const STATUS_LABELS = {
  healthy: "Healthy",
  offline: "Offline",
  delayed: "Delayed",
  maintenance: "Maintenance",
  reference: "Reference",
  unknown: "Unavailable",
};
const STATUS_TONES = {
  healthy: "cyan",
  offline: "red",
  delayed: "amber",
  maintenance: "amber",
  reference: "purple",
  unknown: "red",
};
const DEMO_CONTROLS = new Set(["traffic", "AQ-04", "AQ-07", "visitor"]);

function Status({ status }) {
  return (
    <span className={`quality-status ${STATUS_TONES[status] || "red"}`}>
      <i />
      {STATUS_LABELS[status] || "Unavailable"}
    </span>
  );
}

function freshness(source, status) {
  if (status === "reference") return "Reference dataset";
  if (status === "healthy") return source.freshness;
  if (status === "delayed")
    return source.id === "visitor" ? "11 minutes" : "Delayed";
  if (
    status === "maintenance" ||
    (source.id === "AQ-07" && status === "offline")
  )
    return "Maintenance";
  return "No current signal";
}

export default function DataHealthPanel({
  qualityState,
  onQualityChange,
  selectedSourceId,
  onSelectedSourceChange,
  onBackToIncident,
}) {
  const [localQuality, setLocalQuality] = useState(createInitialQualityState);
  const [localSelected, setLocalSelected] = useState("traffic");
  const state = qualityState ?? localQuality;
  const selectedId = selectedSourceId ?? localSelected;
  const selected =
    QUALITY_SOURCES.find((source) => source.id === selectedId) ||
    QUALITY_SOURCES[0];
  const selectedStatus = getSourceStatus(state, selected.id);
  const summary = getQualitySummary(state);
  const readiness = evaluateDataReadiness(state);
  const canControl =
    DEMO_CONTROLS.has(selected.id) &&
    (!!onQualityChange || qualityState === undefined);
  const chooseSource = (id) => {
    setLocalSelected(id);
    onSelectedSourceChange?.(id);
  };
  const changeStatus = (status) => {
    const nextState = {
      ...state,
      version: 1,
      overrides: { ...state.overrides, [selected.id]: status },
    };
    setLocalQuality(nextState);
    onQualityChange?.(nextState);
  };
  const excludedSources = QUALITY_SOURCES.filter(
    (source) =>
      source.totalFeeds > 0 && getSourceStatus(state, source.id) !== "healthy",
  );
  const sourceNote =
    selected.id === "traffic" && selectedStatus !== "healthy"
      ? "Whole-group outage simulated. T12–T17 are unavailable; T18 remains in maintenance."
      : selected.id === "AQ-07" && selectedStatus === "healthy"
        ? "Backup station restored in this synthetic demonstration. It counts as operational but is not an automatic substitute for AQ-04."
        : selected.id === "visitor" && selectedStatus === "healthy"
          ? "Synthetic visitor stream restored. Current observations are available as optional context."
          : selected.id === "visitor" && selectedStatus === "offline"
            ? "Synthetic visitor stream unavailable · excluded from current operational feeds."
            : selected.note;

  return (
    <section
      className="ds-screen quality-screen"
      aria-label="Data Health and decision eligibility"
    >
      <div className="quality-summary">
        <div
          className={`quality-orbit ${readiness.canApprove ? "" : "is-blocked"}`}
        >
          <svg viewBox="0 0 110 110" aria-hidden="true">
            <circle cx="55" cy="55" r="46" />
            <circle
              cx="55"
              cy="55"
              r="46"
              pathLength="100"
              strokeDasharray={readiness.canApprove ? "96 100" : "0 100"}
            />
          </svg>
          <div>
            <strong>
              {summary.qualityPercent ?? "—"}
              {summary.qualityPercent !== null && <small>%</small>}
            </strong>
            <span>
              {summary.qualityPercent !== null
                ? "DATA QUALITY"
                : "NOT ASSERTED"}
            </span>
          </div>
        </div>
        <div className="quality-summary-copy">
          <span className="quality-eyebrow">TRUST & OBSERVABILITY</span>
          <h2>
            Decision-grade data.
            <br />
            <span>Visible limitations.</span>
          </h2>
          <p>
            <strong>{summary.sourceGroupCount}</strong> critical source groups{" "}
            <i /> <strong>{summary.degradedCount}</strong> degraded{" "}
            {summary.degradedCount === 1 ? "source" : "sources"}
          </p>
        </div>
        <div className="quality-coverage">
          <strong>
            {summary.operational}
            <span>/ {summary.total}</span>
          </strong>
          <span>OPERATIONAL FEEDS</span>
          <small>Synthetic source state</small>
        </div>
        <div
          className={`quality-readiness-pill ${readiness.status}`}
          role="status"
        >
          {readiness.canApprove ? (
            <ShieldCheck size={17} />
          ) : (
            <CircleAlert size={17} />
          )}
          <span>
            {readiness.canApprove ? "H-03 READY" : "H-03 BLOCKED"}
            <small>
              {readiness.canApprove
                ? "Required evidence available"
                : "Restore required evidence"}
            </small>
          </span>
        </div>
      </div>

      <div className="quality-workspace">
        <div className="quality-sources">
          <div className="quality-source-heading">
            <span>SOURCE / GROUP</span>
            <span>STATUS</span>
            <span>FRESHNESS</span>
            <span>QUALITY</span>
          </div>
          <div className="quality-source-list">
            {QUALITY_SOURCES.map((source) => {
              const Icon = SOURCE_ICONS[source.icon] || Database;
              const status = getSourceStatus(state, source.id);
              const quality =
                status === "healthy"
                  ? source.quality
                  : status === "delayed"
                    ? 72
                    : null;
              return (
                <button
                  key={source.id}
                  className={`quality-source-row ${selected.id === source.id ? "is-selected" : ""}`}
                  aria-pressed={selected.id === source.id}
                  aria-label={`Inspect ${source.label}, ${STATUS_LABELS[status] || "Unavailable"}`}
                  onClick={() => chooseSource(source.id)}
                >
                  <span className="quality-source-name">
                    <Icon size={17} />
                    <span>
                      <strong>
                        {source.label}
                        {source.required && (
                          <i
                            className="quality-required-mark"
                            title="Required for H-03"
                          />
                        )}
                      </strong>
                      <small>{source.detail}</small>
                    </span>
                  </span>
                  <Status status={status} />
                  <span className="quality-freshness">
                    {freshness(source, status)}
                  </span>
                  <span className="quality-source-score">
                    {quality === null ? (
                      <span>—</span>
                    ) : (
                      <>
                        <strong>
                          {quality}
                          <small>%</small>
                        </strong>
                        <i>
                          <span style={{ width: `${quality}%` }} />
                        </i>
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="quality-list-footnote">
            <span>
              <i className="quality-required-mark" />
              Required for H-03 approval
            </span>
            <span>
              <Radio size={12} /> Synthetic demonstration sources
            </span>
          </div>

          <div className="quality-coverage-note">
            <div>
              <Gauge size={17} />
              <h3>
                Why {summary.operational} / {summary.total}?
              </h3>
            </div>
            <p>
              17 operational feeds = traffic 7 + air quality 2 + parking 4 + AVL
              2 + weather 1 + visitor flow 1.{" "}
              <strong>{summary.operational}</strong> currently satisfy the
              source policy.
            </p>
            <div className="quality-exclusions">
              <span>
                <Wrench size={12} />
                T18 maintenance <b>1 excluded</b>
              </span>
              {excludedSources.map((source) => (
                <span key={source.id}>
                  <WifiOff size={12} />
                  {source.label} ·{" "}
                  {STATUS_LABELS[getSourceStatus(state, source.id)]}
                  <b>
                    {source.id === "traffic" ? "6" : source.totalFeeds} excluded
                  </b>
                </span>
              ))}
            </div>
            <small>
              Historic GIS is reference geometry and is excluded from the
              operational denominator. Coverage is separate from the fixed
              illustrative 96% quality baseline; when required evidence is
              missing, a quality score is not asserted.
            </small>
          </div>
        </div>

        <aside className="quality-inspector" aria-live="polite">
          <div className="quality-inspector-top">
            <span className="quality-eyebrow">SOURCE → DECISION</span>
            <span
              className={`quality-requirement ${selected.required ? "required" : ""}`}
            >
              {selected.required
                ? "REQUIRED FOR H-03"
                : selected.id === "reference"
                  ? "REFERENCE"
                  : "OPTIONAL FOR H-03"}
            </span>
          </div>
          <h2>{selected.label}</h2>
          <div className="quality-selected-status">
            <Status status={selectedStatus} />
            <span>
              <Clock3 size={12} />
              {freshness(selected, selectedStatus)}
            </span>
          </div>
          <p className="quality-source-note">{sourceNote}</p>
          <section className="quality-dependency">
            <h3>KPI dependencies</h3>
            <p>{selected.usedBy}</p>
          </section>
          <section className="quality-dependency">
            <h3>Fallback policy</h3>
            <p>{selected.fallback}</p>
          </section>
          <div
            className={`quality-eligibility ${selected.required && selectedStatus !== "healthy" ? "blocked" : "ready"}`}
          >
            {selected.required && selectedStatus !== "healthy" ? (
              <CircleAlert size={16} />
            ) : (
              <Check size={16} />
            )}
            <span>
              {selected.required
                ? selectedStatus === "healthy"
                  ? "Required input available"
                  : "This source blocks H-03 approval"
                : "Does not block H-03 approval"}
              <small>
                {selected.required
                  ? "Approval requires both traffic and AQ-04 to be healthy."
                  : "Optional context never substitutes for required evidence."}
              </small>
            </span>
          </div>

          {DEMO_CONTROLS.has(selected.id) && (
            <div className="quality-simulation">
              <span className="quality-simulation-label">
                <i />
                SYNTHETIC SOURCE SIMULATION
              </span>
              <p>
                Change this demonstration source and inspect the decision
                consequence.
              </p>
              <div>
                {selectedStatus !== "offline" && (
                  <button
                    className="quality-simulate-outage"
                    disabled={!canControl}
                    onClick={() => changeStatus("offline")}
                  >
                    <WifiOff size={14} />
                    Simulate outage
                  </button>
                )}
                {selectedStatus !== "healthy" && (
                  <button
                    className="quality-restore-source"
                    disabled={!canControl}
                    onClick={() => changeStatus("healthy")}
                  >
                    <Radio size={14} />
                    Restore source
                  </button>
                )}
              </div>
              <small>
                No external source or physical city system is changed.
              </small>
            </div>
          )}

          <div className={`quality-gate-explanation ${readiness.status}`}>
            <span className="quality-eyebrow">H-03 APPROVAL POLICY</span>
            <h3>
              {readiness.canApprove
                ? "Evidence ready for human review."
                : "Approval is withheld."}
            </h3>
            {readiness.canApprove ? (
              <p>
                Traffic and AQ-04 satisfy the required source policy. AI remains
                advisory; a human still authorises the intervention.
              </p>
            ) : (
              <ul>
                {readiness.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
            <div className="quality-gate-checks">
              {readiness.checks
                .filter((check) => check.required)
                .map((check) => (
                  <span key={check.id}>
                    <i
                      className={
                        check.status === "healthy" ? "healthy" : "missing"
                      }
                    />
                    {check.id === "traffic" ? "Traffic group" : check.label}
                    <b>
                      {check.status === "healthy" ? "Ready" : "Unavailable"}
                    </b>
                  </span>
                ))}
            </div>
          </div>
          {onBackToIncident && (
            <button className="quality-back-button" onClick={onBackToIncident}>
              Return to H-03 incident
              <ArrowRight size={15} />
            </button>
          )}
        </aside>
      </div>
    </section>
  );
}
