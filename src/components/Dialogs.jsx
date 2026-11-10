import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  FileCheck2,
  Fingerprint,
  Landmark,
  Layers3,
  LockKeyhole,
  Network,
  PencilLine,
  Route,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import "./Dialogs.css";

function Drawer({
  open,
  onClose,
  title,
  label,
  children,
  footer,
  className = "",
}) {
  const id = useId();
  const drawerRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      [
        ...(drawerRef.current?.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ) || []),
      ].filter((element) => !element.hidden);
    const frame = requestAnimationFrame(() => focusable()[0]?.focus());
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) {
        event.preventDefault();
        drawerRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !drawerRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !drawerRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gp-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            className="gp-dialog-backdrop"
            aria-label="Close drawer"
            tabIndex={-1}
            onClick={onClose}
          />
          <motion.section
            ref={drawerRef}
            className={`gp-dialog-drawer ${className}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            tabIndex={-1}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 290 }}
          >
            <header className="gp-dialog-header">
              <div>
                <span className="gp-dialog-overline">{label}</span>
                <h2 id={id}>{title}</h2>
              </div>
              <button
                className="gp-dialog-close"
                aria-label={`Close ${title.toLowerCase()}`}
                onClick={onClose}
              >
                <X size={19} />
              </button>
            </header>
            <div className="gp-dialog-content">{children}</div>
            {footer && <footer className="gp-dialog-footer">{footer}</footer>}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ApprovalDialog({
  open,
  onClose,
  onApprove,
  operator = "Control Room Operator #02",
}) {
  const [modify, setModify] = useState(false);
  const [duration, setDuration] = useState(60);
  const [routeGuidance, setRouteGuidance] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setModify(false);
      setDuration(60);
      setRouteGuidance(true);
      setNote("");
    }
  }, [open]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Approve intervention"
      label="HUMAN DECISION REQUIRED"
      className="gp-dialog-approval"
      footer={
        <>
          <p className="gp-dialog-authority">
            <LockKeyhole size={13} /> AI recommends. You authorise.
          </p>
          <button
            className="button primary gp-dialog-approve"
            onClick={() => onApprove?.({ duration, routeGuidance, note })}
          >
            <CheckCheck size={17} /> Approve & Activate <ArrowRight size={16} />
          </button>
          <div className="gp-dialog-secondary-actions">
            <button
              className="button secondary"
              onClick={() => setModify(!modify)}
            >
              <PencilLine size={14} />
              {modify ? "Done modifying" : "Modify"}
            </button>
            <button className="button secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </>
      }
    >
      <div className="gp-dialog-scenario-line">
        <span className="gp-dialog-badge gp-dialog-badge-amber">SIMULATED</span>
        <span>SCENARIO B</span>
        <strong>
          88<span>/100</span>
        </strong>
      </div>
      <div className="gp-dialog-action-block">
        <span className="gp-dialog-field-label">
          {duration !== 60 || !routeGuidance
            ? "MODIFIED ACTION"
            : "RECOMMENDED ACTION"}
        </span>
        <h3>
          Adaptive signal timing
          {routeGuidance && (
            <>
              {" "}
              <span>+</span> targeted route guidance
            </>
          )}
        </h3>
        <div className="gp-dialog-incident">
          <span className="gp-dialog-incident-dot" />
          INC-2026-1109-H03 <span>Historic Centre</span>
        </div>
      </div>

      <div className="gp-dialog-human">
        <div className="gp-dialog-human-icon">
          <Fingerprint size={24} strokeWidth={1.5} />
        </div>
        <div>
          <span className="gp-dialog-field-label">ACCOUNTABLE OPERATOR</span>
          <strong>{operator}</strong>
          <span>Your explicit approval is recorded in the decision log.</span>
        </div>
        <ShieldCheck size={19} />
      </div>

      <dl className="gp-dialog-details">
        <div>
          <dt>
            <UsersRound size={15} />
            Owner
          </dt>
          <dd>Mobility Operations</dd>
        </div>
        <div>
          <dt>
            <Network size={15} />
            Supporting department
          </dt>
          <dd>Environment</dd>
        </div>
        <div>
          <dt>
            <Clock3 size={15} />
            Duration
          </dt>
          <dd>{duration} minutes</dd>
        </div>
        <div>
          <dt>
            <Landmark size={15} />
            Historic compatibility
          </dt>
          <dd>
            <Check size={13} /> Protected constraints retained
          </dd>
        </div>
      </dl>

      <div className="gp-dialog-escalation">
        <span className="gp-dialog-field-label">ESCALATION TRIGGER</span>
        <strong>NO₂ forecast &gt; 60 µg/m³</strong>
        <p>Escalate to Mobility Operations and Environment for human review.</p>
      </div>

      <AnimatePresence initial={false}>
        {modify && (
          <motion.div
            className="gp-dialog-modify"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="gp-dialog-modify-inner">
              <h3>Modify the intervention</h3>
              <label className="gp-dialog-input-label">
                Operating window
                <select
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value))}
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </label>
              <label className="gp-dialog-checkbox">
                <input
                  type="checkbox"
                  checked={routeGuidance}
                  onChange={(event) => setRouteGuidance(event.target.checked)}
                />
                <Route size={15} />
                <span>Include targeted route guidance</span>
              </label>
              <label className="gp-dialog-input-label">
                Operator note <span>Optional</span>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add context for the next operator…"
                />
              </label>
              <p>Changes will be recorded with your approval.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="gp-dialog-prototype-note">
        This activates a synthetic demonstration only. No physical city systems
        are connected.
      </p>
    </Drawer>
  );
}

const benchmarks = [
  {
    city: "Tartu",
    number: "01",
    icon: Network,
    context: "Integrated digital services",
    principle: "Interoperability principle",
    detail:
      "Connect priority sources through shared definitions, ownership and a common operational view.",
  },
  {
    city: "Leuven",
    number: "02",
    icon: UsersRound,
    context: "Climate-neutral governance",
    principle: "Cross-department coordination",
    detail:
      "Assign an accountable owner and supporting department to every operational decision.",
  },
  {
    city: "Pavia",
    number: "03",
    icon: Landmark,
    context: "Heritage-sensitive modelling",
    principle: "Historic constraint layer",
    detail:
      "Evaluate interventions against protected streets, access needs and historic-centre constraints.",
  },
];

export function EvidenceDrawer({ open, onClose, onNext }) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Evidence → design"
      label="RESEARCH PROVENANCE"
      className="gp-dialog-evidence"
      footer={
        <>
          <p className="gp-dialog-evidence-footnote">
            <BookOpen size={15} /> Benchmark themes inform the target-state
            design; they do not represent city integrations.
          </p>
          {onNext && (
            <button
              className="button primary gp-dialog-demo-next"
              onClick={onNext}
            >
              Next Step
              <ArrowRight size={15} />
            </button>
          )}
        </>
      }
    >
      <p className="gp-dialog-introduction">
        Three European city perspectives. Three principles behind the GreenPulse
        operating model.
      </p>
      <div className="gp-dialog-benchmarks">
        {benchmarks.map(
          ({ city, number, icon: Icon, context, principle, detail }) => (
            <article className="gp-dialog-benchmark" key={city}>
              <div className="gp-dialog-benchmark-top">
                <span>{number}</span>
                <h3>{city}</h3>
                <Icon size={22} strokeWidth={1.4} />
              </div>
              <p>{context}</p>
              <div className="gp-dialog-principle">
                <ArrowDown size={16} />
                <span>DESIGN PRINCIPLE</span>
              </div>
              <h4>{principle}</h4>
              <p className="gp-dialog-benchmark-detail">{detail}</p>
            </article>
          ),
        )}
      </div>
      <div className="gp-dialog-research-note">
        <Layers3 size={19} />
        <p>
          <strong>From precedent to proposal</strong>These are design
          interpretations for an illustrative target-state prototype, rather
          than claims of equivalent municipal capability.
        </p>
      </div>
    </Drawer>
  );
}

export function HandoverDialog({ open, onClose, onConfirm }) {
  const [operator, setOperator] = useState("Control Room Operator #03");
  const [note, setNote] = useState(
    "Monitor H-03 and review the NO₂ forecast at the next checkpoint.",
  );
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Handover intervention"
      label="CONTINUITY & ACCOUNTABILITY"
      className="gp-dialog-handover"
      footer={
        <>
          <button
            className="button primary gp-dialog-approve"
            onClick={() => onConfirm?.(operator, note)}
          >
            <UserRound size={16} />
            Confirm handover <ArrowRight size={16} />
          </button>
          <button
            className="button secondary gp-dialog-cancel-wide"
            onClick={onClose}
          >
            Cancel
          </button>
        </>
      }
    >
      <div className="gp-dialog-action-block">
        <span className="gp-dialog-field-label">SIGNAL PLAN H03</span>
        <h3>
          Transfer responsibility.
          <br />
          Keep the city in view.
        </h3>
        <div className="gp-dialog-incident">INC-2026-1109-H03</div>
      </div>
      <label className="gp-dialog-input-label">
        Receiving operator
        <select
          value={operator}
          onChange={(event) => setOperator(event.target.value)}
        >
          <option>Control Room Operator #03</option>
          <option>Control Room Operator #04</option>
        </select>
      </label>
      <label className="gp-dialog-input-label">
        Handover note
        <textarea
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className="gp-dialog-handover-note">
        <FileCheck2 size={20} />
        <p>
          <strong>Accountability remains explicit</strong>The current operator
          remains responsible until you confirm. The receiving operator and
          handover note are recorded in the decision log.
        </p>
      </div>
    </Drawer>
  );
}
