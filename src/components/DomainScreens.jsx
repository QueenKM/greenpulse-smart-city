import { motion } from "framer-motion";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Check, ChevronRight, FileCheck2, ShieldCheck } from "lucide-react";
import "./DomainScreens.css";

const tipStyle = {
  background: "#0b202a",
  border: "1px solid #24404b",
  borderRadius: 8,
  color: "#e1edf3",
  fontSize: 12,
  boxShadow: "0 10px 35px #0008",
};
const stagger = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45 },
};
const Tag = ({ tone = "cyan", children }) => (
  <span className={`ds-tag ${tone}`}>
    <i />
    {children}
  </span>
);
const DomainTitle = ({ eyebrow, title, description, children }) => (
  <div className="ds-title">
    <div>
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {children}
  </div>
);

export function TrafficScreen({ readiness } = {}) {
  const data = [
    { period: "07:30", count: 124, queue: 3 },
    { period: "08:00", count: 186, queue: 7 },
    { period: "08:30", count: 238, queue: 12 },
    { period: "09:00", count: 211, queue: 9 },
    { period: "09:30", count: 167, queue: 5 },
  ];
  return <motion.div {...stagger} className="ds-screen traffic-screen">
    <DomainTitle eyebrow="DAILY TRAFFIC / SELECTED MONITORING POINTS" title="Counts and queue patterns" description="Identify recurring congestion patterns where monitoring exists. No network-wide coverage is inferred."><Tag>SYNTHETIC</Tag></DomainTitle>
    <div className="traffic-composition">
      <section className="ds-chart-surface">
        <div className="ds-section-heading"><div><span className="eyebrow">ILLUSTRATIVE CAMERA / LOOP AGGREGATES</span><h2>Recurring morning demand</h2></div><Tag>SYNTHETIC</Tag></div>
        <div className="traffic-chart" role="img" aria-label="Synthetic vehicle counts at one selected monitoring point">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{top:25,right:24,left:0,bottom:10}}><defs><linearGradient id="traffic-count-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={.25}/><stop offset="100%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#24404a" strokeDasharray="3 7"/><XAxis dataKey="period" tick={{fill:'#8aa7b7',fontSize:12}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#8aa7b7',fontSize:12}} axisLine={false} tickLine={false}/><Tooltip contentStyle={tipStyle} formatter={value => [value,'SYNTHETIC vehicles / 30 min']}/><Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={3} fill="url(#traffic-count-fill)"/></AreaChart></ResponsiveContainer>
        </div>
        <p className="muted">These synthetic counts illustrate the review workflow. They do not represent a connected municipal feed or calibrated forecast.</p>
      </section>
      <aside className="traffic-insight"><Tag tone="amber">PILOT · CONDITIONAL</Tag><h2>Travel time needs validated linkage.</h2><p>K1 requires validated timestamp linkage between selected camera / OCR monitoring points. Until that validation is complete, the operating view uses counts and queue patterns only.</p><div className="traffic-selected-support"><span>Corridor travel time<strong>No data</strong></span><span>Network congestion coverage<strong>No data</strong></span></div><div className="ds-confidence"><span>Required evidence for prototype review</span><strong className={readiness?.canApprove === false ? 'amber' : 'cyan'}>{readiness?.canApprove === false ? 'Review required' : 'Synthetic review inputs available'}</strong><small>Availability in this replay does not validate municipal data access, coverage or timestamp linkage.</small></div></aside>
    </div>
    <div className="traffic-stat-ribbon">{[["Selected point count","167","vehicles / 30 min","SYNTHETIC"],["Indicative queue","5","vehicles","SYNTHETIC"],["K2 · tailpipe CO₂","No data","estimated · TARGET","ESTIMATED"],["K3 · NO₂ / PM2.5","No data","measurement integration required","NO DATA"]].map(([label,value,note,tag])=><div className="traffic-stat" key={label}><Activity size={18}/><div><span className="eyebrow">{label}</span><div><strong>{value}</strong></div><small>{note}</small></div><Tag tone={tag === 'ESTIMATED' ? 'purple':'cyan'}>{tag}</Tag></div>)}</div>
  </motion.div>;
}

export { default as DataHealth } from "./DataHealthPanel";

export function DecisionLog({ lifecycle = "idle", logs = [] }) {
  const entries = logs;
  return (
    <motion.div {...stagger} className="ds-screen decision-log-screen">
      <DomainTitle
        eyebrow="GOVERNANCE / HUMAN ACCOUNTABILITY"
        title="Decision Log"
        description="A traceable record of evidence, judgement and operational responsibility."
      >
        <Tag tone="purple">HUMAN-IN-THE-LOOP</Tag>
      </DomainTitle>
      <div className="decision-accountability">
        <ShieldCheck size={29} />
        <div>
          <h2>Every action has an accountable owner.</h2>
          <p>
            AI provides recommendations. An identified human operator reviews
            and authorises every operational intervention.
          </p>
        </div>
        <span>INC-2026-1109-H03</span>
      </div>
      {entries.length ? (
        <div className="decision-timeline">
          {entries.map((entry, i) => (
            <div className="decision-entry" key={i}>
              <div className="decision-entry-time">
                {entry.time || "No data"}
                <span>{entry.date || "DEMONSTRATION"}</span>
              </div>
              <div className="decision-entry-dot">
                <Check size={13} />
              </div>
              <div>
                <Tag tone="green">{entry.status || "RECORDED"}</Tag>
                <h3>
                  {entry.event ||
                    entry.title ||
                    entry.action ||
                    "Operational decision recorded"}
                </h3>
                <p>
                  {entry.detail ||
                    entry.description ||
                    "Synthetic decision record"}
                </p>
                <div className="decision-entry-meta">
                  <span>
                    OPERATOR{" "}
                    <strong>
                      {entry.operator || "Control Room Operator #02"}
                    </strong>
                  </span>
                  <span>
                    AUTHORITY <strong>{entry.authority || entry.owner || "No data"}</strong>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ds-empty">
          <div className="ds-empty-icon">
            <FileCheck2 size={36} />
          </div>
          <span className="eyebrow">AWAITING THE FIRST DECISION</span>
          <h2>
            The recommendation is ready.
            <br />
            The decision is human.
          </h2>
          <p>
            Review the H-03 incident, compare scenarios and approve an
            intervention. The authorisation and subsequent lifecycle events will
            appear here.
          </p>
          <div className="ds-empty-steps">
            <span>Evidence</span>
            <ChevronRight size={13} />
            <span>Human approval</span>
            <ChevronRight size={13} />
            <span>Auditable action</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export { default as AlertCenter } from "./AlertCenterPanel";
