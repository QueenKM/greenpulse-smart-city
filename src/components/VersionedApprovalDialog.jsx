import { useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCheck,
  Clock3,
  FileCheck2,
  Fingerprint,
  Landmark,
  LockKeyhole,
  Network,
  PencilLine,
  Route,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Drawer } from "./Dialogs";
import {
  DEFAULT_PLAN,
  createPlanReview,
  isReviewCurrent,
  planFingerprint,
} from "../decision.mjs";
import { evaluateDataReadiness } from "../quality.mjs";
import "./VersionedApprovalDialog.css";

const newReview = (plan, readiness, version) =>
  createPlanReview(plan, {
    version,
    qualityKey: readiness.key,
    reviewedAt: new Date().toISOString(),
  });

export default function VersionedApprovalDialog({
  open,
  onClose,
  onApprove,
  operator = "Control Room Operator #02",
  qualityState,
  onInspectDataHealth,
}) {
  const readiness = evaluateDataReadiness(qualityState);
  const [modify, setModify] = useState(false);
  const [plan, setPlan] = useState(() => ({ ...DEFAULT_PLAN }));
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [reviewVersion, setReviewVersion] = useState(1);
  const [reviewSnapshot, setReviewSnapshot] = useState(() =>
    newReview(DEFAULT_PLAN, readiness, 1),
  );
  const referenceForecast = useRef(reviewSnapshot?.forecast.reference).current;
  const previousOpen = useRef(false);
  const previousQualityKey = useRef(readiness.key);
  const reviewNoticeId = useId();
  const modifyPanelId = useId();

  useEffect(() => {
    if (open && !previousOpen.current) {
      setModify(false);
      setPlan({ ...DEFAULT_PLAN });
      setNote("");
      setAcknowledged(false);
      setReviewVersion(1);
      setReviewSnapshot(newReview(DEFAULT_PLAN, readiness, 1));
    } else if (open && previousQualityKey.current !== readiness.key) {
      setReviewSnapshot(null);
      setAcknowledged(false);
    }
    previousOpen.current = open;
    previousQualityKey.current = readiness.key;
  }, [open, readiness.key]);

  const modified = planFingerprint(plan) !== planFingerprint(DEFAULT_PLAN);
  const reviewCurrent = isReviewCurrent(reviewSnapshot, plan, readiness);
  const referenceCurrent = reviewCurrent && reviewSnapshot?.forecast.status === "reference";
  const canApprove = readiness.canApprove && reviewCurrent;

  const updatePlan = (changes) => {
    setPlan((current) => ({ ...current, ...changes }));
    // A return to the original settings still requires a new explicit review.
    setReviewSnapshot(null);
    setAcknowledged(false);
  };

  const recordReview = () => {
    if (!readiness.canApprove || (modified && !acknowledged)) return;
    const nextVersion = reviewVersion + 1;
    const snapshot = newReview(plan, readiness, nextVersion);
    if (!isReviewCurrent(snapshot, plan, readiness)) return;
    setReviewVersion(nextVersion);
    setReviewSnapshot(snapshot);
  };

  const approve = () => {
    if (!canApprove || !isReviewCurrent(reviewSnapshot, plan, readiness)) return;
    onApprove?.({ ...plan, note, reviewSnapshot });
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Approve intervention"
      label="HUMAN DECISION REQUIRED"
      className="gp-dialog-approval gp-versioned-approval"
      footer={
        <>
          <p className="gp-dialog-authority">
            <LockKeyhole size={13} /> AI recommends. You authorise.
          </p>
          {!canApprove && (
            <p className="gp-versioned-approval-gate" id={reviewNoticeId}>
              {!readiness.canApprove
                ? "Approval is blocked until required data sources recover and the plan is reviewed."
                : "Record a current plan review before approving this intervention."}
            </p>
          )}
          <button
            type="button"
            className="button primary gp-dialog-approve"
            onClick={approve}
            disabled={!canApprove}
            aria-describedby={!canApprove ? reviewNoticeId : undefined}
          >
            <CheckCheck size={17} /> Approve &amp; Activate <ArrowRight size={16} />
          </button>
          <div className="gp-dialog-secondary-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setModify((value) => !value)}
              aria-expanded={modify}
              aria-controls={modifyPanelId}
            >
              <PencilLine size={14} /> {modify ? "Done modifying" : "Modify"}
            </button>
            <button type="button" className="button secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </>
      }
    >
      <div className="gp-dialog-scenario-line">
        <span className="gp-dialog-badge gp-dialog-badge-amber">SIMULATED</span>
        <span>{modified ? "MODIFIED PLAN" : "SCENARIO B"}</span>
        {referenceCurrent ? (
          <strong aria-label={`Reference score ${reviewSnapshot.forecast.score} out of 100`}>
            {reviewSnapshot.forecast.score}<span>/100</span>
          </strong>
        ) : (
          <span className="gp-versioned-forecast-label">
            {modified ? "No numerical estimate" : "Review required"}
          </span>
        )}
      </div>
      <div className="gp-dialog-action-block">
        <span className="gp-dialog-field-label">{modified ? "MODIFIED ACTION" : "RECOMMENDED ACTION"}</span>
        <h3>
          Adaptive signal timing
          {plan.routeGuidance && <> <span>+</span> targeted route guidance</>}
        </h3>
        <div className="gp-dialog-incident">
          <span className="gp-dialog-incident-dot" />
          INC-2026-1109-H03 <span>Historic Centre</span>
        </div>
      </div>

      <section
        className={`gp-versioned-review ${reviewCurrent ? "is-reviewed" : "needs-review"}`}
        aria-label="Plan forecast review"
      >
        <div className="gp-versioned-review-heading" aria-live="polite">
          {reviewCurrent ? <FileCheck2 size={16} /> : <AlertTriangle size={16} />}
          <h3>{reviewCurrent ? "Plan review recorded" : "Forecast requires review"}</h3>
          {reviewCurrent && <span>V{reviewSnapshot.version}</span>}
        </div>
        <p className="gp-versioned-review-settings">
          {plan.duration} minutes · {plan.routeGuidance ? "Signal timing + route guidance" : "Signal timing only"}
        </p>
        {modified ? (
          <>
            <p className="gp-versioned-review-warning">No updated numerical benefit estimate</p>
            <p>The original Scenario B forecast does not apply to these settings. Recording this review acknowledges the uncertainty; it does not recalculate a forecast.</p>
            <details className="gp-versioned-reference">
              <summary>Original reference · not applicable to this plan</summary>
              <p>
                Scenario {referenceForecast.scenario} · {referenceForecast.duration} minutes · targeted route guidance included.
                {" "}Reference score {referenceForecast.score}/100, congestion {referenceForecast.values.congestion}%,
                {" "}PM2.5 {referenceForecast.values.pm} µg/m³ and travel time {referenceForecast.values.travel} min.
                {" "}These values are excluded from the modified plan.
              </p>
            </details>
            {!reviewCurrent && (
              <label className="gp-versioned-acknowledgement">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>I understand the modified plan has no numerical forecast</span>
              </label>
            )}
          </>
        ) : (
          <p>
            {reviewCurrent
              ? "Original Scenario B reference forecast · 60-minute operating window with route guidance. No new forecast was calculated."
              : "Review the original Scenario B settings against the current source status before using its reference forecast."}
          </p>
        )}
        {!reviewCurrent ? (
          <button
            type="button"
            className="button secondary gp-versioned-record-review"
            onClick={recordReview}
            disabled={!readiness.canApprove || (modified && !acknowledged)}
          >
            <FileCheck2 size={14} /> Record plan review
          </button>
        ) : (
          <p className="gp-versioned-reviewed-note">
            <Check size={12} />
            {modified ? "Unestimated plan acknowledged" : "Reference settings reviewed"} · review V{reviewSnapshot.version}
          </p>
        )}
      </section>

      {!readiness.canApprove && (
        <section className="gp-versioned-data-block" aria-label="Data readiness" role="status">
          <div><AlertTriangle size={16} /><h3>Required data unavailable</h3></div>
          <ul>{readiness.reasons.map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}</ul>
          {onInspectDataHealth && (
            <button type="button" className="button secondary" onClick={onInspectDataHealth}>
              Inspect data health <ArrowRight size={13} />
            </button>
          )}
        </section>
      )}

      <div className="gp-dialog-human">
        <div className="gp-dialog-human-icon"><Fingerprint size={24} strokeWidth={1.5} /></div>
        <div>
          <span className="gp-dialog-field-label">ACCOUNTABLE OPERATOR</span>
          <strong>{operator}</strong>
          <span>Your explicit approval and reviewed plan version are recorded in the decision log.</span>
        </div>
        <ShieldCheck size={19} />
      </div>
      <dl className="gp-dialog-details">
        <div><dt><UsersRound size={15} />Owner</dt><dd>Mobility Operations</dd></div>
        <div><dt><Network size={15} />Supporting department</dt><dd>Environment</dd></div>
        <div><dt><Clock3 size={15} />Duration</dt><dd>{plan.duration} minutes</dd></div>
        <div><dt><Landmark size={15} />Historic compatibility</dt><dd><Check size={13} /> Protected constraints retained</dd></div>
      </dl>
      <div className="gp-dialog-escalation">
        <span className="gp-dialog-field-label">ESCALATION TRIGGER</span>
        <strong>NO₂ forecast &gt; 60 µg/m³</strong>
        <p>Escalate to Mobility Operations and Environment for human review.</p>
      </div>

      {modify && (
        <div className="gp-dialog-modify" id={modifyPanelId}>
          <div className="gp-dialog-modify-inner">
            <h3>Modify the intervention</h3>
            <label className="gp-dialog-input-label">
              Operating window
              <select value={plan.duration} onChange={(event) => updatePlan({ duration: Number(event.target.value) })}>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </label>
            <label className="gp-dialog-checkbox">
              <input type="checkbox" checked={plan.routeGuidance} onChange={(event) => updatePlan({ routeGuidance: event.target.checked })} />
              <Route size={15} /><span>Include targeted route guidance</span>
            </label>
            <label className="gp-dialog-input-label">
              Operator note <span>Optional</span>
              <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add context for the next operator…" />
            </label>
            <p>Duration and route changes require a new plan review. Operator notes do not alter the forecast.</p>
          </div>
        </div>
      )}
      <p className="gp-dialog-prototype-note">
        This activates a synthetic demonstration only. No physical city systems are connected.
      </p>
    </Drawer>
  );
}
