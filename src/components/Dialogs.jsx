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

export function Drawer({
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

const handoverPlans = {
  signals: { label: "SIGNAL PLAN H03", role: "Authorised traffic-signal operator", note: "Monitor H-03 counts and queue patterns. Retain pedestrian, bus and rollback safeguards at the next review." },
  guidance: { label: "ROUTE GUIDANCE H03", role: "Authorised traffic-signal operator", note: "Review the guidance trial and monitored queue patterns. Preserve protected access and withdraw guidance if required by the approved plan." },
  ztl: { label: "ZTL ACCESS REVIEW H03", role: "Municipal Police", note: "Review aggregate gate entries and the recorded legal procedure. Retain permit and exemption safeguards; no automatic access-rule changes." },
};

export function HandoverDialog({ open, action = "signals", onClose, onConfirm }) {
  const plan = handoverPlans[action] || handoverPlans.signals;
  const [operator, setOperator] = useState("Control Room Operator #03");
  const [note, setNote] = useState(plan.note);
  useEffect(() => { if (open) setNote(plan.note); }, [open, plan.note]);
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
        <span className="gp-dialog-field-label">{plan.label}</span>
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
      <p className="gp-versioned-role-note">Receiving role: {plan.role}. This handover retains the recorded approval and does not authorise a new intervention.</p>
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
