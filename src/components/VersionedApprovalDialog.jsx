import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  evaluateTrafficContext,
  isReviewCurrent,
  planFingerprint,
} from "../decision.mjs";
import { evaluateDataReadiness } from "../quality.mjs";
import "./VersionedApprovalDialog.css";

const newReview = (plan, readiness, context, version) => {
  if (!readiness?.key || !context?.key) return null;
  try {
    return createPlanReview(plan, {
      version,
      qualityKey: readiness.key,
      contextKey: context.key,
      reviewedAt: new Date().toISOString(),
    });
  } catch {
    return null;
  }
};
const planForAction = (action) => ({
  ...DEFAULT_PLAN,
  action,
  routeGuidance: action === "ztl" ? false : DEFAULT_PLAN.routeGuidance,
});
const APPROVING_AUTHORITIES = [
  "Mobility Department",
  "Municipal Police",
  "Authorised traffic-signal operator",
];
const TRIAL_CHECKS = [
  ["pedestrian", "Pedestrian safety and crossing delay reviewed"],
  ["bus", "Bus punctuality and access reviewed"],
  ["residential", "Residential congestion displacement reviewed"],
  ["heritage", "Historic-centre compatibility reviewed"],
  ["rollback", "Time-limited trial and rollback plan reviewed"],
];
const PROTECTED_ACCESS = [
  ["residents", "Residents"],
  ["emergency", "Emergency vehicles"],
  ["disabled", "People with disabilities"],
  ["deliveries", "Deliveries"],
  ["transit", "Public transport"],
];

export default function VersionedApprovalDialog({
  open,
  onClose,
  onApprove,
  operator = "Control Room Operator #02",
  qualityState,
  maturity = "TARGET",
  onInspectDataHealth,
  trafficContext,
  action = "signals",
  onInspectTrafficContext,
  onTrafficContextChange,
  onDecline,
  onModify,
}) {
  const [modify, setModify] = useState(false);
  const [plan, setPlan] = useState(() => planForAction(action));
  const readiness = evaluateDataReadiness(qualityState, plan.action);
  const context = evaluateTrafficContext(trafficContext, plan.action);
  const contextAvailable = ["MVP", "TARGET"].includes(maturity) && Boolean(trafficContext && context.canApprove === true);
  const [note, setNote] = useState("");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [authority, setAuthority] = useState("");
  const [authorityConfirmed, setAuthorityConfirmed] = useState(false);
  const [policeReviewed, setPoliceReviewed] = useState(false);
  const [legalProcessConfirmed, setLegalProcessConfirmed] = useState(false);
  const [privacyReviewed, setPrivacyReviewed] = useState(false);
  const [reviewVersion, setReviewVersion] = useState(1);
  const [reviewSnapshot, setReviewSnapshot] = useState(() =>
    readiness.canApprove && contextAvailable
      ? newReview(planForAction(action), readiness, context, 1)
      : null,
  );
  const referenceForecast = useMemo(() => newReview(
    DEFAULT_PLAN,
    evaluateDataReadiness(qualityState, "signals"),
    evaluateTrafficContext(trafficContext, "signals"),
    1,
  )?.forecast.reference, [readiness.key, context.key]);
  const previousOpen = useRef(false);
  const previousQualityKey = useRef(readiness.key);
  const previousContextKey = useRef(context.key);
  const previousAction = useRef(action);
  const reviewNoticeId = useId();
  const modifyPanelId = useId();
  const authorityId = useId();
  const overridePanelId = useId();

  useEffect(() => {
    if (open && (!previousOpen.current || previousAction.current !== action)) {
      const nextPlan = planForAction(action);
      const nextReadiness = evaluateDataReadiness(qualityState, action);
      const nextContext = evaluateTrafficContext(trafficContext, action);
      setModify(false);
      setPlan(nextPlan);
      setNote("");
      setOverrideOpen(false);
      setOverrideReason("");
      setAcknowledged(false);
      setAuthority("");
      setAuthorityConfirmed(false);
      setPoliceReviewed(false); setLegalProcessConfirmed(false); setPrivacyReviewed(false);
      setReviewVersion(1);
      setReviewSnapshot(trafficContext && nextReadiness.canApprove && nextContext.canApprove
        ? newReview(nextPlan, nextReadiness, nextContext, 1) : null);
    } else if (open && (previousQualityKey.current !== readiness.key || previousContextKey.current !== context.key)) {
      setReviewSnapshot(null);
      setAcknowledged(false);
      setAuthority("");
      setAuthorityConfirmed(false);
      setPoliceReviewed(false); setLegalProcessConfirmed(false); setPrivacyReviewed(false);
    }
    previousOpen.current = open;
    previousQualityKey.current = readiness.key;
    previousContextKey.current = context.key;
    previousAction.current = action;
  }, [open, readiness.key, context.key, action]);

  const modified = planFingerprint(plan) !== planFingerprint(DEFAULT_PLAN) ||
    trafficContext?.eventLoad === "event" || trafficContext?.roadworks === true;
  const actionMatches = plan.action === action;
  const reviewCurrent = actionMatches && contextAvailable &&
    isReviewCurrent(reviewSnapshot, plan, readiness, trafficContext);
  const referenceCurrent = reviewCurrent && reviewSnapshot?.forecast.status === "reference";
  const authorityMatches = Boolean(context.authority && authority === context.authority);
  const policeConfirmed = !context.requiresPolice || (policeReviewed && legalProcessConfirmed && privacyReviewed);
  const canApprove = readiness.canApprove && reviewCurrent && authorityMatches &&
    authorityConfirmed && policeConfirmed;
  const contextReasons = !trafficContext
    ? ["Traffic-context checks have not been supplied. Complete and record the required review before approval."]
    : !["MVP", "TARGET"].includes(maturity) ? ["CURRENT shows available evidence only. Select the PILOT or TARGET demonstration before reviewing an intervention."] : context.reasons || [];
  const actionLabel = context.actionLabel || ({
    signals: "Adaptive signal timing",
    guidance: "Targeted route guidance",
    ztl: "ZTL access-arrangement review",
  }[plan.action] || "Unsupported intervention");
  const gateMessage = !readiness.canApprove
    ? "Approval is blocked until this action’s required sources recover and the plan is reviewed."
    : !contextAvailable
      ? "Complete the traffic-context review before approving this intervention."
      : !reviewCurrent
        ? "Record a current plan review before approving this intervention."
        : !authorityMatches
          ? "Select the proposed approving authority required for this action."
          : !authorityConfirmed
            ? "Explicitly confirm the proposed approving authority for this synthetic decision."
            : "Confirm Municipal Police review, the established legal procedure and privacy review before approving this synthetic ZTL decision.";

  const updatePlan = (changes) => {
    const nextPlan = { ...plan, ...changes };
    setPlan(nextPlan);
    onModify?.({ action: plan.action, plan: nextPlan, reason: `Human plan modification: ${nextPlan.duration} minutes; route guidance ${nextPlan.routeGuidance ? "included" : "excluded"}.`, operator });
    // A return to the original settings still requires a new explicit review.
    setReviewSnapshot(null);
    setAcknowledged(false);
    setAuthority("");
    setAuthorityConfirmed(false);
    setPoliceReviewed(false); setLegalProcessConfirmed(false); setPrivacyReviewed(false);
  };

  const updateContext = (group, key, checked) => {
    if (!onTrafficContextChange || !trafficContext) return;
    // Invalidate immediately as well as on the next parent-context render.
    setReviewSnapshot(null);
    setAcknowledged(false);
    setAuthority("");
    setAuthorityConfirmed(false);
    setPoliceReviewed(false); setLegalProcessConfirmed(false); setPrivacyReviewed(false);
    onTrafficContextChange((current) => {
      if (!current || typeof current !== "object") return current;
      return group
        ? { ...current, [group]: { ...current[group], [key]: checked } }
        : { ...current, [key]: checked };
    });
  };

  const recordReview = () => {
    if (!actionMatches || !readiness.canApprove || !contextAvailable || (modified && !acknowledged)) return;
    const nextVersion = reviewVersion + 1;
    const snapshot = newReview(plan, readiness, context, nextVersion);
    if (!isReviewCurrent(snapshot, plan, readiness, trafficContext)) return;
    setReviewVersion(nextVersion);
    setReviewSnapshot(snapshot);
  };

  const approve = () => {
    if (!canApprove || !trafficContext ||
      !isReviewCurrent(reviewSnapshot, plan, readiness, trafficContext)) return;
    onApprove?.({ ...plan, note, authority, authorityConfirmed, policeReviewed: context.requiresPolice ? policeReviewed === true : false, legalProcessConfirmed: context.requiresPolice ? legalProcessConfirmed === true : false, privacyReviewed: context.requiresPolice ? privacyReviewed === true : false, trafficContext, reviewSnapshot });
  };
  const recordOverride = () => {
    const reason = overrideReason.trim();
    if (!onDecline || reason.length < 3) return;
    onDecline({ reason, operator, action: plan.action, plan: { ...plan }, trafficContext });
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
            <LockKeyhole size={13} /> AI may recommend. A human authority approves; an authorised operator executes separately.
          </p>
          {!canApprove && (
            <p className="gp-versioned-approval-gate" id={reviewNoticeId}>
              {gateMessage}
            </p>
          )}
          <button
            type="button"
            className="button primary gp-dialog-approve"
            onClick={approve}
            disabled={!canApprove}
            aria-describedby={!canApprove ? reviewNoticeId : undefined}
          >
            <CheckCheck size={17} /> Approve intervention <ArrowRight size={16} />
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
            {onDecline && <button type="button" className="button secondary" onClick={() => setOverrideOpen((value) => !value)} aria-expanded={overrideOpen} aria-controls={overridePanelId}>
              Record override
            </button>}
          </div>
        </>
      }
    >
      <div className="gp-dialog-scenario-line">
        <span className="gp-dialog-badge gp-dialog-badge-amber">SYNTHETIC</span>
        <span>{modified ? "ACTION-SPECIFIC PLAN" : "REFERENCE SIGNAL PLAN"}</span>
        {referenceCurrent ? (
          <span className="gp-versioned-forecast-label">MODELLED · illustrative KPI example</span>
        ) : (
          <span className="gp-versioned-forecast-label">
            {modified ? "No numerical estimate" : "Review required"}
          </span>
        )}
      </div>
      <div className="gp-dialog-action-block">
        <span className="gp-dialog-field-label">PROPOSED ACTION</span>
        <h3>
          {actionLabel}
          {plan.action === "signals" && plan.routeGuidance && <> <span>+</span> targeted route guidance</>}
        </h3>
        <div className="gp-dialog-incident">
          <span className="gp-dialog-incident-dot" />
          INC-2026-1109-H03 <span>Historic Centre</span>
        </div>
      </div>

      <section className={`gp-versioned-context ${contextAvailable ? "is-ready" : "is-blocked"}`} aria-label="Traffic-context review">
        <div className="gp-versioned-context-heading">
          {contextAvailable ? <FileCheck2 size={16} /> : <AlertTriangle size={16} />}
          <h3>{contextAvailable ? "Traffic-context checks recorded" : "Traffic-context review required"}</h3>
        </div>
        <p>Pedestrian access · bus routes · residential impact · heritage constraints · rollback plan</p>
        {onTrafficContextChange && trafficContext && <div className="gp-versioned-inline-review">
          <fieldset className="gp-versioned-trial-checks">
            <legend>Trial review checks</legend>
            {TRIAL_CHECKS.map(([key, label]) => <label key={key}>
              <input type="checkbox" checked={trafficContext.checks?.[key] === true} onChange={(event) => updateContext("checks", key, event.target.checked)} />
              <span>{label}</span>
            </label>)}
            {plan.action === "signals" && <label>
              <input type="checkbox" checked={trafficContext.thresholdAgreed === true} onChange={(event) => updateContext(null, "thresholdAgreed", event.target.checked)} />
              <span>Synthetic queue-pattern trigger reviewed; municipal operating threshold remains to be agreed</span>
            </label>}
            {plan.action === "ztl" && <label>
              <input type="checkbox" checked={trafficContext.aggregateReviewConfirmed === true} onChange={(event) => updateContext(null, "aggregateReviewConfirmed", event.target.checked)} />
              <span>Aggregate entries reviewed by gate and period; entries are not automatically violations</span>
            </label>}
          </fieldset>
          <fieldset className="gp-versioned-protections">
            <legend>Protected access retained</legend>
            {PROTECTED_ACCESS.map(([key, label]) => <label key={key}>
              <input type="checkbox" checked={trafficContext.protectedAccess?.[key] === true} onChange={(event) => updateContext("protectedAccess", key, event.target.checked)} />
              <span>{label}</span>
            </label>)}
          </fieldset>
          <p className="gp-versioned-inline-note">These confirmations document a proposed synthetic trial. They do not establish legal approval, measured safety, or access to street controllers.</p>
        </div>}
        {!contextAvailable && <details className="gp-versioned-outstanding"><summary>Outstanding review conditions ({contextReasons.length})</summary><ul>{contextReasons.map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}</ul></details>}
        {onInspectTrafficContext && <button type="button" className="button secondary" onClick={() => { onClose?.(); onInspectTrafficContext(); }}>
          {contextAvailable ? "Inspect recorded checks" : "Review traffic context"}<ArrowRight size={13} />
        </button>}
      </section>

      <section className="gp-versioned-authority" aria-labelledby={authorityId}>
        <div className="gp-versioned-authority-heading"><ShieldCheck size={17} /><h3 id={authorityId}>Proposed decision rights</h3></div>
        <p className="gp-versioned-required-authority">Required approving authority<strong>{context.authority || "No authority assigned to this action"}</strong></p>
        <label className="gp-dialog-input-label">
          Acting as the proposed approving authority
          <select value={authority} onChange={(event) => { setAuthority(event.target.value); setAuthorityConfirmed(false); setPoliceReviewed(false); setLegalProcessConfirmed(false); setPrivacyReviewed(false); }}>
            <option value="">Select an authority for this demonstration</option>
            {APPROVING_AUTHORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        {authority && !authorityMatches && <p className="gp-versioned-authority-mismatch" role="status">The selected role cannot approve this action. The proposed decision right belongs to {context.authority || "an assigned approving authority"}.</p>}
        <label className="gp-versioned-authority-confirmation">
          <input type="checkbox" checked={authorityConfirmed} disabled={!authorityMatches} onChange={(event) => setAuthorityConfirmed(event.target.checked)} />
          <span>I confirm this synthetic decision as the proposed approving authority</span>
        </label>
        {context.requiresPolice && <label className="gp-versioned-authority-confirmation gp-versioned-police-confirmation">
          <input type="checkbox" checked={policeReviewed} disabled={!authorityMatches} onChange={(event) => setPoliceReviewed(event.target.checked)} />
          <span>Municipal Police operational review confirmed for this synthetic ZTL decision</span>
        </label>}
        {context.requiresPolice && <>
          <label className="gp-versioned-authority-confirmation">
            <input type="checkbox" checked={legalProcessConfirmed} disabled={!authorityMatches} onChange={(event) => setLegalProcessConfirmed(event.target.checked)} />
            <span>Established legal procedure reviewed; no automatic ZTL rule changes</span>
          </label>
          <label className="gp-versioned-authority-confirmation">
            <input type="checkbox" checked={privacyReviewed} disabled={!authorityMatches} onChange={(event) => setPrivacyReviewed(event.target.checked)} />
            <span>Authorised privacy review confirmed; no identifiable licence-plate records</span>
          </label>
        </>}
        <p className="gp-versioned-role-note">Presentation role simulation. No municipal system is connected. Approval does not execute an action. {context.requiresPolice ? "Municipal Police and the established legal process remain mandatory." : "Implementation requires a separate named authorised traffic-signal operator."}</p>
      </section>

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
          {plan.duration} minutes · {actionLabel}{plan.action === "signals" && plan.routeGuidance ? " + route guidance" : ""}
        </p>
        {modified ? (
          <>
            <p className="gp-versioned-review-warning">No updated numerical benefit estimate</p>
            <p>The reference signal-plan worked example does not apply to these settings. Recording this review acknowledges the uncertainty; it does not recalculate a forecast.</p>
            <details className="gp-versioned-reference">
              <summary>Original reference · not applicable to this plan</summary>
              {referenceForecast ? <p>
                Signal plan · {referenceForecast.duration} minutes · targeted route guidance included.
                {referenceForecast.k1 && <> K1 worked example: {referenceForecast.k1.baselineMinutes} → {referenceForecast.k1.predictedMinutes} {referenceForecast.k1.unit}.</>}
                {" "}These values are excluded from this action-specific plan; they do not establish KPI accuracy.
              </p> : <p>The separate signal-plan reference does not estimate benefits for this action. No numerical outcome is assigned to this plan.</p>}
            </details>
            {!reviewCurrent && (
              <label className="gp-versioned-acknowledgement">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                />
                <span>I understand this action-specific or modified plan has no numerical forecast</span>
              </label>
            )}
          </>
        ) : (
          <>
            <p>{reviewCurrent
              ? "Reference signal plan · 60-minute operating window with route guidance. No new forecast was calculated."
              : "Review the reference signal settings against the current source status and traffic context before approval."}</p>
            {referenceCurrent && referenceForecast?.k1 && <div className="gp-versioned-k1">
              <span>K1 · PILOT / CONDITIONAL · CORRIDOR TRAVEL TIME</span>
              <strong>{referenceForecast.k1.baselineMinutes}<ArrowRight size={16} />{referenceForecast.k1.predictedMinutes}<small>{referenceForecast.k1.unit}</small></strong>
              <p>Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation.</p>
              <p>{Math.abs(referenceForecast.k1.predictedChangePercent)}% illustrative improvement · MODELLED scenario, not an achieved result.</p>
            </div>}
          </>
        )}
        {!reviewCurrent ? (
          <button
            type="button"
            className="button secondary gp-versioned-record-review"
            onClick={recordReview}
            disabled={!actionMatches || !readiness.canApprove || !contextAvailable || (modified && !acknowledged)}
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

      {overrideOpen && onDecline && <section id={overridePanelId} className="gp-versioned-override" aria-label="Record recommendation override">
        <div className="gp-versioned-review-heading"><FileCheck2 size={16} /><h3>Record an override without activating</h3></div>
        <p>Document why the recommendation is declined or deferred. This records a human decision and does not alter a signal plan, ZTL rule or physical city system.</p>
        <label className="gp-dialog-input-label">Override reason
          <textarea rows={3} value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} maxLength={1000} required placeholder="Explain the evidence, uncertainty or operational constraint…" />
        </label>
        <button type="button" className="button secondary" disabled={overrideReason.trim().length < 3} onClick={recordOverride}>Record override decision <FileCheck2 size={14} /></button>
      </section>}

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
          <span className="gp-dialog-field-label">OPERATOR RECORDING THE DECISION</span>
          <strong>{operator}</strong>
          <span>Recorded separately from the approving authority: {authorityMatches && authorityConfirmed ? authority : "confirmation pending"}.</span>
        </div>
        <ShieldCheck size={19} />
      </div>
      <dl className="gp-dialog-details">
        <div><dt><UsersRound size={15} />Operational lead</dt><dd>{plan.action === "ztl" ? "Municipal Police" : "Mobility Department"}</dd></div>
        <div><dt><Network size={15} />Supporting actors</dt><dd>{plan.action === "ztl" ? "Mobility · IT / Data Office · privacy lead" : "Municipal Police · IT / Digital Office"}</dd></div>
        <div><dt><Clock3 size={15} />Duration</dt><dd>{plan.duration} minutes</dd></div>
        <div><dt><Landmark size={15} />Traffic-context review</dt><dd>{contextAvailable ? <><Check size={13} /> Checks recorded</> : "Pending review"}</dd></div>
      </dl>
      <div className="gp-dialog-escalation">
        <span className="gp-dialog-field-label">ACTION-SPECIFIC APPROVAL CONDITION</span>
        <strong>{plan.action === "signals" ? "Locally agreed signal threshold" : plan.action === "ztl" ? "Police + established legal process + authorised privacy review" : "Monitored queue patterns + reviewed route impacts"}</strong>
        <p>The proposed approving authority must review the operating conditions and rollback plan. This drawer does not establish a legal threshold.</p>
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
            {plan.action === "signals" && <label className="gp-dialog-checkbox">
              <input type="checkbox" checked={plan.routeGuidance} onChange={(event) => updatePlan({ routeGuidance: event.target.checked })} />
              <Route size={15} /><span>Include targeted route guidance</span>
            </label>}
            <label className="gp-dialog-input-label">
              Operator note <span>Optional</span>
              <textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add context for the next operator…" />
            </label>
            <p>Duration and route changes require a new plan review. Operator notes do not alter the forecast.</p>
          </div>
        </div>
      )}
      <p className="gp-dialog-prototype-note">
        Approval records a synthetic demonstration decision only. Execution is a separate human action. No physical city systems are connected.
      </p>
    </Drawer>
  );
}
