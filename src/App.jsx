import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Fingerprint,
  Gauge,
  GitBranch,
  Layers3,
  Leaf,
  Map,
  Menu,
  Navigation,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Route,
  ShieldCheck,
  Thermometer,
  Users,
  X,
  ChartNoAxesCombined,
  History,
  PanelLeftClose,
  ScanLine,
  CircleDot,
  Maximize2,
  Minimize2,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import CityMap, { preloadCityModel, retryGeographicModel } from "./components/CityMap";
import WorkspaceMenu from "./components/WorkspaceMenu";
import LayerMenu from "./components/LayerMenu";
import { MATURITY_MAP_STAGES } from "./maturity.mjs";
import useAutoHideSidebar from "./useAutoHideSidebar.mjs";
import IncidentPanel from "./components/IncidentPanel";
import ForecastTimeline from "./components/ForecastTimeline";
import { getForecast } from "./scenario.mjs";
import DigitalTwin from "./components/DigitalTwin";
import {
  DataHealth,
  TrafficScreen,
  DecisionLog,
  AlertCenter,
} from "./components/DomainScreens";
import {
  Drawer,
  HandoverDialog,
} from "./components/Dialogs";
import EvidenceDrawer from "./components/DocumentEvidence";
import Roadmap from "./components/DocumentRoadmap";
import HeatWorkspace from "./components/HeatWorkspace";
import KpiWorkbench from "./components/KpiWorkbench";
import TrafficUseCasePanel from "./components/TrafficUseCasePanel";
import ReferenceInventory from "./components/ReferenceInventory";
import ZtlWorkspace from "./components/ZtlWorkspace";
import ArchitectureWorkspace from "./components/ArchitectureWorkspace";
import ApprovalDialog from "./components/VersionedApprovalDialog";
import { createInitialQualityState, evaluateDataReadiness, getQualitySummary, getSourceStatus } from "./quality.mjs";
import { isReviewCurrent, evaluateTrafficContext, MODEL_VERSION } from "./decision.mjs";
import { createTrafficUseCaseContext, TRAFFIC_ACTIONS } from "./use-case-spec.mjs";
import { createInitialHeatState, heatReducer, deriveHeatMetrics } from "./heat-use-case.mjs";
import { decisionRecords } from "./document-workflow.mjs";
import { createInitialIncidentState, incidentReducer, getAlertQueue } from "./incidents.mjs";
import { createDefaultMapContext, createDefaultTwinContext } from "./view-context.mjs";
import { readViewSession, saveViewSession } from "./view-session.mjs";
import { lifecycleReducer, initialLifecycle } from "./lifecycle.mjs";
import {
  formatCityTime,
  formatCityDate,
  formatCityTimeZone,
  CITY_TIME_ZONE,
} from "./time.mjs";

const ID = "INC-2026-1109-H03";
const sections = [
  ["SHARED DECISION CAPABILITY", [["Overview", Activity]]],
  ["OPERATIONAL WORKFLOWS", [["Daily Traffic", Route], ["ZTL Access", ShieldCheck], ["Heat Preparedness", Thermometer]]],
  ["FOUNDATIONS & ACCOUNTABILITY", [["Architecture", Layers3], ["KPI Framework", ChartNoAxesCombined], ["Decision Log", History], ["Governance & Roadmap", GitBranch]]],
];
const subtitles = {
  Overview: "Leuven, Belgium. A clearer operational picture.",
  "Alert Center": "Prioritise what needs a human decision.",
  "City Map": "A shared operational picture of the city.",
  "Data Health": "Trust begins at the source.",
  "Daily Traffic": "Monitored counts and queue patterns. Conditional corridor pilot.",
  "ZTL Access": "Aggregate entries support human and legal review of historic-centre access.",
  Architecture: "One shared municipal decision capability. Five progressive layers.",
  "Heat Preparedness": "Official forecasts and indicative priority areas support preparedness.",
  "Digital Twin": "Compare interventions before acting in the physical city.",
  "Decision Log": "Every decision has a human owner.",
  "KPI Framework": "Seven defined indicators. Readiness and evidence before results.",
  "Governance & Roadmap":
    "GreenPulse is the destination. A progressive path to get there.",
};
const demoSteps = [
  "Alert",
  "Evidence",
  "Operational options",
  "Scenarios",
  "Human approval",
  "Authorised execution",
  "Outcome review",
];
const maturityInfo = {
  CURRENT: [
    "Current inventory",
    "Reference street and building geometry",
    "Illustrative fragmented inventory",
    "Manual coordination; no operational overlays",
  ],
  MVP: [
    "First connected workflow",
    "Counts and queues at selected monitored points",
    "Limited monitoring coverage in 2D",
    "Conditional timestamp linkage; human approval",
  ],
  TARGET: [
    "GreenPulse target state",
    "Selective extensions after validation",
    "Target modelling and environmental integration",
    "Proposed closed-loop measurement",
  ],
};

function LocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const syncClock = () => setNow(new Date());
    const timer = setInterval(syncClock, 1000);
    document.addEventListener("visibilitychange", syncClock);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", syncClock);
    };
  }, []);
  return (
    <div className="demo-clock" title={CITY_TIME_ZONE}>
      <span className="eyebrow">CURRENT LOCAL TIME</span>
      <strong>
        <time dateTime={now.toISOString()} aria-label="Current time in Sofia">
          {formatCityTime(now)}
        </time>
        <small>{formatCityTimeZone(now)}</small>
      </strong>
      <small>
        <time dateTime={now.toISOString()} aria-label="Current date in Sofia">
          {formatCityDate(now)}
        </time>{" "}
        · SOFIA
      </small>
    </div>
  );
}

function Tag({ tone = "cyan", children, dot = false }) {
  return (
    <span className={`tag ${tone}`}>
      {dot && <i />}
      {children}
    </span>
  );
}
function ActivePanel({ state, dispatch, onHandover, onClose, onImpact, onExecute, readiness }) {
  if (state.status === "approved") return <section className="incident-panel approved-awaiting"><Tag tone="amber">APPROVED · AWAITING AUTHORISED EXECUTION</Tag><div className="outcome-orbit"><ShieldCheck size={38} /></div><h2>Approval is recorded. Execution is a separate human action.</h2><p className="muted">{state.approvedDecision?.authority} approved the reviewed {state.action === "ztl" ? "access proposal" : "traffic plan"}. No intervention is active.</p><dl className="active-details"><div><dt>Approval authority</dt><dd>{state.approvedDecision?.authority}</dd></div><div><dt>Execution responsibility</dt><dd>{state.action === "ztl" ? "Municipal Police · established legal process" : "Authorised traffic-signal operator"}</dd></div></dl><button className="button primary" onClick={onExecute}>Review authorised execution <ArrowRight size={16}/></button><p className="accountability-note">SYNTHETIC prototype only. No controller, gate or municipal system is connected.</p></section>;
  const paused = state.status === "paused";
  const unestimated = state.approvedDecision?.snapshot.forecast.status === "unestimated";
  const countdown = new Date(state.remaining * 1000)
    .toISOString()
    .slice(11, 19);
  if (state.status === "measuring" || state.status === "measured")
    return (
      <section className="incident-panel outcome-panel">
        <Tag tone={state.status === "measured" ? "amber" : "purple"}>
          {state.status === "measured" ? "MEASUREMENT WINDOW COMPLETE" : "MEASURING OUTCOME"}
        </Tag>
        <div className="outcome-orbit">
          <Activity size={38} />
        </div>
        <h2>
          {state.status === "measured"
            ? "The window is complete. Evidence needs review."
            : "A decision is only the beginning."}
        </h2>
        <p className="muted">
          {state.status === "measured"
            ? unestimated ? "This reviewed modification has no plan-specific numerical forecast or outcome dataset. Completing the window does not establish success." : "Enter explicit demonstration observations in the KPI workbench. A completed window does not supply trip times, emission factors or measured air-quality data."
            : "The demonstration observation window is running. No numerical observation or improvement will be inferred from its completion."}
        </p>
        <button className="button primary" onClick={onImpact}>
          View KPI evidence
          <ArrowRight size={16} />
        </button>
        <p className="accountability-note">
          <Fingerprint size={15} />
          Accountable operator
          <br />
          {state.operator}
        </p>
      </section>
    );
  return (
    <section className="incident-panel active-panel">
      <div className="incident-top">
        <span className="eyebrow">APPROVED INTERVENTION</span>
        <Tag tone={paused ? "amber" : "green"} dot>
          {paused ? "PAUSED" : "ACTIVE"}
        </Tag>
      </div>
      <div className="incident-id">{ID}</div>
      <h2>{state.action === "ztl" ? "ZTL Access Review H03" : state.action === "guidance" ? "Route Guidance H03" : "Signal Plan H03"}</h2>
      <p className="muted">
        {state.action === "ztl" ? "Human legal-process review · protected access retained" : state.action === "guidance" ? "Parking and route guidance · synthetic message trial" : `Adaptive signals${state.routeGuidance ? " + targeted route guidance" : ""}`}
      </p>
      {state.approvedDecision && (
        <div className="approved-version" role="status">
          <span>Approved plan v{state.approvedDecision.snapshot.version}</span>
          <small>{state.approvedDecision.snapshot.forecast.status === "reference" ? "Reference scenario assumptions retained" : "Modified plan · no numerical forecast"}</small>
        </div>
      )}
      {readiness && !readiness.canApprove && <p className="workflow-warning">Critical evidence unavailable. Operator review required; pause remains a human decision.</p>}
      <div className={`countdown ${paused ? "paused" : ""}`}>
        <span className="eyebrow">TIME REMAINING</span>
        <strong>{countdown}</strong>
        <span className="monitoring-label">
          <CircleDot size={13} />
          {paused
            ? state.remaining === 0
              ? "WINDOW ELAPSED · REVIEW REQUIRED"
              : "OPERATOR PAUSED"
            : "MONITORING"}
        </span>
        <small className="replay-time-note">
          Accelerated replay · {state.duration}-minute operating window
        </small>
      </div>
      <dl className="active-details">
        <div>
          <dt>Operator</dt>
          <dd>{state.operator}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{state.action === "ztl" ? "Municipal Police" : "Mobility Department"}</dd>
        </div>
        <div>
          <dt>Supporting department</dt>
          <dd>{state.action === "ztl" ? "Mobility · IT / Data Office · Privacy lead" : "Municipal Police · IT / Digital Office"}</dd>
        </div>
        <div>
          <dt>Next review</dt>
          <dd>
            {state.nextReviewAt
              ? formatCityTime(new Date(state.nextReviewAt), { seconds: false })
              : "No data"}
          </dd>
        </div>
      </dl>
      <div className="active-controls">
        <button
          className="button secondary"
          disabled={paused && state.remaining === 0}
          onClick={() => dispatch({ type: paused ? "RESUME" : "PAUSE" })}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
          {paused ? "Resume" : "Pause"}
        </button>
        <button className="button secondary" onClick={onHandover}>
          <Users size={15} />
          Handover
        </button>
      </div>
      <button className="button close-intervention" onClick={onClose}>
        Close Intervention
        <ArrowRight size={15} />
      </button>
      <p className="accountability-note">
        <ShieldCheck size={14} />
        Activated by a human operator
      </p>
    </section>
  );
}

function seedEvents() {
  const timestamp = Date.now();
  return [
    [0, "Selected point T14", "167 vehicles / 30 min", "cyan"],
    [24, "AQ-04 NO₂", "→ 47 µg/m³", "cyan"],
    [51, "Incident H03", "prediction updated", "purple"],
    [69, "Parking P3 occupancy", "→ 93%", "cyan"],
    [104, "AI prediction", "recalculated", "purple"],
    [121, "AVL feed", "healthy", "cyan"],
  ].map(([age, ...event]) => [
    formatCityTime(new Date(timestamp - age * 1000)),
    ...event,
  ]);
}

function OperationsBottom({ onHealth, lifecycle, qualityState, qualitySummary }) {
  const [events, setEvents] = useState(seedEvents);
  useEffect(() => {
    let n = 0;
    const timer = setInterval(() => {
      n++;
      const entries = [
        getSourceStatus(qualityState, "traffic") === "healthy" ? ["Selected point T14 queue", `${5 + (n % 3)} vehicles · SYNTHETIC`, "cyan"] : ["Traffic group", "evidence unavailable", "amber"],
        getSourceStatus(qualityState, "AQ-04") === "healthy" ? ["AQ-04 NO₂", "→ 47 µg/m³", "cyan"] : ["AQ-04", "evidence unavailable", "amber"],
        ["Incident H03", evaluateDataReadiness(qualityState).canApprove ? "reference forecast available" : "human review required", "purple"],
        ["AVL feed", "healthy", "cyan"],
      ];
      const e = entries[(n - 1) % entries.length];
      const t = formatCityTime();
      setEvents((v) => [[t, ...e], ...v].slice(0, 6));
    }, 8000);
    return () => clearInterval(timer);
  }, [qualityState]);
  return (
    <div className="operations-bottom">
      <section className="event-stream">
        <div className="stream-heading">
          <span className="eyebrow">
            <Radio size={13} />
            SYNTHETIC EVENT REPLAY
          </span>
          <span className="stream-live">
            <i />
            SYNTHETIC EVENTS
          </span>
        </div>
        <div className="events-viewport">
          <AnimatePresence initial={false}>
            {events.slice(0, 3).map((e) => (
              <motion.div
                layout
                key={e[0]}
                className="event-line"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <time>{e[0]}</time>
                <i className={e[3]} />
                <span>{e[1]}</span>
                <b>{e[2]}</b>
                <ArrowUpRight size={13} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
      <button className="health-summary" onClick={onHealth}>
        <div className="health-number">
          <span className="eyebrow">DATA HEALTH · SYNTHETIC</span>
          <strong>
            {qualitySummary.qualityPercent ?? "No data"}{qualitySummary.qualityPercent !== null && <span>%</span>}
          </strong>
          <span className="muted">{qualitySummary.sourceGroupCount} source groups · {qualitySummary.degradedCount} degraded</span>
        </div>
        <div className="mini-feeds">
          {[
            ["Traffic", "18 sec", "traffic"],
            ["Air Quality", "52 sec", "AQ-04"],
            ["AVL", "14 sec", "AVL"],
            ["Weather", "2 min", "weather"],
          ].map(([n, t, id]) => (
            <div key={n}>
              <i />
              <span>{n}</span>
              <small>{getSourceStatus(qualityState, id) === "healthy" ? "Healthy" : "Unavailable"}</small>
              <time>{getSourceStatus(qualityState, id) === "healthy" ? t : "No data"}</time>
            </div>
          ))}
        </div>
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("Overview");
  const [state, dispatch] = useReducer(lifecycleReducer, initialLifecycle);
  const [heatState, dispatchHeat] = useReducer(heatReducer, undefined, createInitialHeatState);
  const [trafficContext, setTrafficContext] = useState(() => ({ ...createTrafficUseCaseContext(), aqEvidenceConfirmed: false, parkingOccupancy: 93 }));
  const [trafficTab, setTrafficTab] = useState("use-case");
  const [healthTab, setHealthTab] = useState("feeds");
  const [approvalAction, setApprovalAction] = useState("signals");
  const [executionOpen, setExecutionOpen] = useState(false);
  const [executionOperator, setExecutionOperator] = useState("");
  const [executionConfirmed, setExecutionConfirmed] = useState(false);
  const [executionLegal, setExecutionLegal] = useState(false);
  const [proposalAction, setProposalAction] = useState(null);
  const [proposalNote, setProposalNote] = useState("");
  const [proposals, setProposals] = useState([]);
  const [observations, setObservations] = useState({});
  const [kpiFocus, setKpiFocus] = useState("K1");
  const [qualityState, setQualityState] = useState(createInitialQualityState);
  const [incidents, dispatchIncident] = useReducer(incidentReducer, undefined, createInitialIncidentState);
  const [initialViews] = useState(readViewSession);
  const [overviewContext, setOverviewContext] = useState(initialViews.overview);
  const [heatContext, setHeatContext] = useState(initialViews.heat);
  const [twinContext, setTwinContext] = useState(initialViews.twin);
  const [selectedSourceId, setSelectedSourceId] = useState(initialViews.sourceId);
  const [alertAnchor, setAlertAnchor] = useState(() => Date.now());
  const readiness = useMemo(() => evaluateDataReadiness(qualityState, trafficContext.action), [qualityState, trafficContext.action]);
  const heatMetrics = useMemo(() => deriveHeatMetrics(heatState), [heatState]);
  const heatWithMetrics = useMemo(() => ({ ...heatState, metrics: heatMetrics }), [heatState, heatMetrics]);
  const records = useMemo(() => decisionRecords(state, heatState, proposals), [state, heatState, proposals]);
  const qualitySummary = useMemo(() => getQualitySummary(qualityState), [qualityState]);
  const alerts = useMemo(() => getAlertQueue(incidents, { lifecycle: state, qualityState, anchor: alertAnchor }), [incidents, state, qualityState, alertAnchor]);
  const activeAlertCount = alerts.filter(alert => alert.status !== "resolved").length;
  const changeQuality = useCallback(next => {
    setQualityState(next);
    dispatchIncident({ type: "SOURCE_STATE_CHANGED", id: "DATA-AQ07-M01", context: { qualityState: next } });
  }, []);
  const [layers, setLayers] = useState({
    traffic: true,
    air: true,
    heat: false,
    heritage: true,
    sensors: true,
  });
  const [approval, setApproval] = useState(false),
    [evidence, setEvidence] = useState(false),
    [handover, setHandover] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false),
    [selected, setSelected] = useState(initialViews.overview.entity?.id === "H03"),
    [closeConfirm, setCloseConfirm] = useState(false);
  const [maturity, setMaturity] = useState("TARGET"),
    [maturityOpen, setMaturityOpen] = useState(false);
  const [demo, setDemo] = useState(false),
    [step, setStep] = useState(0),
    [toast, setToast] = useState("");
  const { sidebarRef, sidebarExpanded, sidebarEvents } = useAutoHideSidebar({
    mobileOpen: mobileNav,
    presenting: demo,
  });
  const appRef = useRef(null);
  const maturityHelpRef = useRef(null);
  const [forecastOffset, setForecastOffset] = useState(60);
  const [forecastAnchor, setForecastAnchor] = useState(() => Date.now());
  const [focusRequest, setFocusRequest] = useState(0);
  const [viewResetToken, setViewResetToken] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [preparation, setPreparation] = useState("idle");
  const preparationRequest = useRef(0);
  const mapEnabled = !(demo && preparation === "fallback");
  useEffect(() => {
    saveViewSession({ overview: overviewContext, heat: heatContext, twin: twinContext, sourceId: selectedSourceId });
  }, [overviewContext, heatContext, twinContext, selectedSourceId]);
  const selectMapIncident = useCallback((item) => {
    if (item?.type === "incident" || item?.id === "H03") {
      setSelected(true);
      setOverviewContext(value => ({ ...value, entity: { id: "H03", type: "incident", synthetic: true } }));
      setFocusRequest((value) => value + 1);
    } else setSelected(false);
  }, []);
  const clearMapFocus = useCallback(() => { setSelected(false); setOverviewContext(value => ({ ...value, entity: null })); }, []);
  const updateOverviewCamera = useCallback(camera => setOverviewContext(value => ({ ...value, camera: typeof camera === "function" ? camera(value.camera) : camera })), []);
  const updateOverviewViewMode = useCallback(viewMode => setOverviewContext(value => ({ ...value, viewMode })), []);
  const updateOverviewEntity = useCallback(entity => setOverviewContext(value => ({ ...value, entity })), []);
  useEffect(() => {
    const sync = () =>
      setFullscreen(document.fullscreenElement === appRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const active = ["active", "paused"].includes(state.status);
  useEffect(() => {
    if (heatState.status !== "measuring") return undefined;
    const delay = Math.max(0, (heatState.measurementStartedAt || Date.now()) + 5010 - Date.now());
    const timer = setTimeout(() => dispatchHeat({ type: "MEASUREMENT_COMPLETE" }), delay);
    return () => clearTimeout(timer);
  }, [heatState.status, heatState.measurementStartedAt]);
  useEffect(() => {
    if (state.status !== "active") return;
    const t = setInterval(
      () => dispatch({ type: "TICK", time: formatCityTime() }),
      1000,
    );
    return () => clearInterval(t);
  }, [state.status]);
  useEffect(() => {
    if (state.status !== "measuring") return;
    const t = setTimeout(
      () =>
        dispatch({
          type: "MEASUREMENT_COMPLETE",
          time: formatCityTime(),
        }),
      Math.max(0, (state.measurementStartedAt || Date.now()) + 5010 - Date.now()),
    );
    return () => clearTimeout(t);
  }, [state.status, state.measurementStartedAt]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3800);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!maturityOpen) return undefined;
    const dismissOutside = (event) => {
      if (!event.target?.closest?.("[data-maturity-ui]"))
        setMaturityOpen(false);
    };
    const dismissWithEscape = (event) => {
      if (
        event.key !== "Escape" ||
        document.querySelector('[role="dialog"],[role="alertdialog"]')
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setMaturityOpen(false);
      maturityHelpRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithEscape, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithEscape, true);
    };
  }, [maturityOpen]);
  const navigate = (name) => {
    setPage(name);
    setMobileNav(false);
  };
  const openAlert = ({ page: destination, sourceId, alertId }) => {
    navigate(destination);
    if (sourceId) setSelectedSourceId(sourceId);
    if (alertId === ID) {
      setOverviewContext(value => ({ ...value, camera: { zoom: 1, x: 0, y: 0 }, entity: { id: "H03", type: "incident", synthetic: true } }));
      setSelected(true);
      setFocusRequest(value => value + 1);
    }
  };
  const changeMaturity = (next) => {
    setMaturity(next);
    setMaturityOpen(false);
    setOverviewContext(createDefaultMapContext(next));
    setHeatContext(createDefaultMapContext(next));
    setTwinContext(createDefaultTwinContext(next));
    setSelected(false);
    setViewResetToken(value => value + 1);
  };
  const openApproval = (requested = "signals") => {
    const action = typeof requested === "string" && Object.hasOwn(TRAFFIC_ACTIONS, requested) ? requested : "signals";
    if (["transit", "policy"].includes(action)) { setProposalAction(action); setProposalNote(""); return; }
    setTrafficContext(value => ({ ...value, action }));
    setApprovalAction(action);
    if (state.status === "idle") setApproval(true);
    else {
      setToast(
        active
          ? "An approved intervention is already in progress."
          : "Reset the demo to begin a new decision cycle.",
      );
      if (active) navigate("Overview");
    }
  };
  const compare = () => navigate("Digital Twin");
  const reset = () => {
    setMaturity("TARGET");
    setMaturityOpen(false);
    setForecastAnchor(Date.now());
    setForecastOffset(demo ? 0 : 60);
    setViewResetToken((value) => value + 1);
    dispatch({ type: "RESET" });
    dispatchHeat({ type: "RESET" });
    setTrafficContext({ ...createTrafficUseCaseContext(), aqEvidenceConfirmed: false, parkingOccupancy: 93 });
    setTrafficTab("use-case");
    setApprovalAction("signals");
    setProposalAction(null);
    setExecutionOpen(false);
    setExecutionOperator("");
    setExecutionConfirmed(false);
    setExecutionLegal(false);
    setProposals([]);
    setObservations({});
    setKpiFocus("K1");
    dispatchIncident({ type: "RESET" });
    setQualityState(createInitialQualityState());
    setAlertAnchor(Date.now());
    setOverviewContext(createDefaultMapContext());
    setHeatContext(createDefaultMapContext());
    setTwinContext(createDefaultTwinContext());
    setSelectedSourceId("traffic");
    setApproval(false);
    setHandover(false);
    setMethodologyOpen(false);
    setCloseConfirm(false);
    setEvidence(false);
    setStep(0);
    setPage("Overview");
    setSelected(demo);
    if (demo) setFocusRequest((value) => value + 1);
    setLayers({
      traffic: true,
      air: true,
      heat: false,
      heritage: true,
      sensors: true,
    });
  };
  const demoGo = (next) => {
    setStep(next);
    setEvidence(false);
    setApproval(false);
    setSelected(false);
    if (next === 0) {
      setOverviewContext(value => ({ ...value, camera: { zoom: 1, x: 0, y: 0 } }));
      setPage("Overview");
      setForecastOffset(0);
      setSelected(true);
      setFocusRequest((value) => value + 1);
    }
    if (next === 1) {
      setOverviewContext(value => ({ ...value, camera: { zoom: 1, x: 0, y: 0 } }));
      setPage("Overview");
      setSelected(true);
      setFocusRequest((value) => value + 1);
      setForecastOffset(0);
      setEvidence(true);
    }
    if (next === 2) {
      setTrafficTab("analysis");
      setPage("Daily Traffic");
      setForecastOffset(30);
    }
    if (next === 3) {
      setPage("Digital Twin");
      setForecastOffset(60);
    }
    if (next === 4) {
      setApprovalAction("signals");
      setTrafficContext(value => ({ ...value, action: "signals" }));
      setPage("Digital Twin");
      setForecastOffset(60);
      if (state.status === "idle") setApproval(true);
    }
    if (next === 5) {
      setPage("Overview");
      setForecastOffset(0);
    }
    if (next === 6) {
      setPage("KPI Framework");
      if (active) dispatch({ type: "CLOSE", time: formatCityTime() });
    }
  };
  const nextStep = () => {
    if (["loading", "error"].includes(preparation)) return;
    if (step === 4 && state.status === "idle") {
      setApproval(true);
      setToast("A human must approve this intervention before continuing.");
      return;
    }
    if (step === 5 && !["active", "paused", "measuring", "measured"].includes(state.status)) { setToast("An authorised operator must explicitly execute the approved prototype plan."); return; }
    if (step < 6) demoGo(step + 1);
    else stopDemo();
  };
  const enterFullscreen = () => {
    const request = appRef.current?.requestFullscreen;
    if (!request) {
      setToast(
        "Presentation mode is active. Fullscreen is unavailable in this browser.",
      );
      return;
    }
    try {
      Promise.resolve(request.call(appRef.current)).catch(() =>
        setToast(
          "Fullscreen was unavailable. You can continue in presentation mode.",
        ),
      );
    } catch {
      setToast(
        "Fullscreen was unavailable. You can continue in presentation mode.",
      );
    }
  };
  const leaveFullscreen = () => {
    if (
      document.fullscreenElement === appRef.current &&
      document.exitFullscreen
    ) {
      Promise.resolve(document.exitFullscreen()).catch(() => {});
    }
  };
  const stopDemo = () => {
    preparationRequest.current += 1;
    setDemo(false);
    setEvidence(false);
    setApproval(false);
    setHandover(false);
    setMethodologyOpen(false);
    setCloseConfirm(false);
    leaveFullscreen();
  };
  const prepareCity = (retry = false) => {
    const request = ++preparationRequest.current;
    setPreparation("loading");
    const task = retry ? retryGeographicModel() : preloadCityModel();
    Promise.resolve(task)
      .then(() => {
        if (preparationRequest.current !== request) return;
        if (retry) setViewResetToken(value => value + 1);
        setPreparation("ready");
      })
      .catch(() => {
        if (preparationRequest.current !== request) return;
        setPreparation("error");
        setToast("Geography is unavailable. Retry preparation or explicitly continue with a text-only demo.");
      });
  };
  const startDemo = () => {
    reset();
    setMobileNav(false);
    setDemo(true);
    setForecastOffset(0);
    setSelected(true);
    setFocusRequest((value) => value + 1);
    enterFullscreen();
    prepareCity();
  };
  // Native key events can arrive between a ready-state DOM commit and passive
  // effects. Read the current render rather than a previous loading/step closure.
  const presentationNavigation = useRef(null);
  presentationNavigation.current = { demo, step, evidence, approval, handover, closeConfirm, preparation, nextStep, demoGo, stopDemo };
  useEffect(() => {
    if (!demo) return undefined;
    const keydown = (event) => {
      const current = presentationNavigation.current;
      if (!current.demo) return;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.defaultPrevented ||
        event.repeat
      )
        return;
      if (
        event.key !== "Escape" &&
        event.target?.closest?.(
          "input,textarea,select,[contenteditable='true'],[data-presentation-shortcuts='off']",
        )
      )
        return;
      if (
        current.evidence &&
        current.step === 1 &&
        ["ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        current.demoGo(event.key === "ArrowRight" ? 2 : 0);
        return;
      }
      if (
        document.querySelector('[role="dialog"],[role="alertdialog"]') ||
        current.approval ||
        current.handover ||
        current.closeConfirm
      )
        return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (!["loading", "error"].includes(current.preparation)) current.nextStep();
      }
      if (event.key === "ArrowLeft" && current.step > 0) {
        event.preventDefault();
        current.demoGo(current.step - 1);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        current.stopDemo();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [demo]);
  const timeline = (
    <ForecastTimeline
      value={forecastOffset}
      onChange={setForecastOffset}
      anchor={forecastAnchor}
      compact
    />
  );

  return (
    <div
      ref={appRef}
      className={`app-shell ${demo ? "is-presenting" : ""} ${fullscreen ? "is-fullscreen" : ""}`}
    >
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar auto-hide-sidebar ${mobileNav ? "open" : ""} ${sidebarExpanded ? "is-expanded" : ""}`}
        aria-label="Workspace navigation"
        data-expanded={sidebarExpanded}
        {...sidebarEvents}
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
          aria-label="GreenPulse Overview"
        >
          <span className="brand-symbol">
            <Activity size={25} strokeWidth={1.8} />
          </span>
          <span>
            <strong>
              GreenPulse<span>®</span>
            </strong>
            <small>Urban Decision Intelligence</small>
          </span>
        </a>
        <WorkspaceMenu
          page={page}
          sidebarExpanded={sidebarExpanded}
          onNavigate={navigate}
          onStartDemo={startDemo}
        />
        <nav aria-label="Main navigation">
          {sections.map(([title, items]) => (
            <section className="nav-section" key={title}>
              <h2>{title}</h2>
              {items.map(([name, Icon]) => (
                <button
                  key={name}
                  className={`nav-item ${page === name ? "active" : ""}`}
                  onClick={() => navigate(name)}
                  aria-label={name}
                  title={name}
                  aria-current={page === name ? "page" : undefined}
                >
                  <Icon size={17} strokeWidth={1.6} />
                  <span>{name}</span>
                  {name === "Alert Center" && (
                    <span className="nav-count">{activeAlertCount}</span>
                  )}
                  {name === "Digital Twin" && (
                    <span className="nav-ai">AI</span>
                  )}
                </button>
              ))}
            </section>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-ready">
            <i />
            Target-state environment<span>v2.0</span>
          </div>
          <button
            className={`demo-start ${demo ? "running" : ""}`}
            aria-label="Presentation Demo"
            title="Presentation Demo"
            onClick={startDemo}
          >
            <span>
              <Play size={14} fill="currentColor" />
            </span>
            <div>
              Presentation Demo<small>Follow the decision journey</small>
            </div>
            <ChevronRight size={15} />
          </button>
          <div className="operator">
            <div className="operator-avatar">02</div>
            <span>
              Control Room Operator<small>Municipal decision support</small>
            </span>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <div className="global-bar">
          <div className="global-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              WORKSPACE <ChevronRight size={12} />
              <b>City operations</b>
            </span>
          </div>
          <div className="global-right">
            <div
              className="maturity-control"
              role="group"
              aria-label="Operating model maturity"
              data-maturity-ui
              data-presentation-shortcuts="off"
            >
              {["CURRENT", "MVP", "TARGET"].map((m) => (
                <button
                  key={m}
                  className={maturity === m ? "active" : ""}
                  aria-pressed={maturity === m}
                  onClick={() => changeMaturity(m)}
                >
                  {m}
                </button>
              ))}
              <button
                ref={maturityHelpRef}
                className="maturity-help"
                aria-label="Explain maturity stages"
                aria-expanded={maturityOpen}
                aria-controls="maturity-explanation"
                onClick={() => setMaturityOpen((v) => !v)}
              >
                <CircleHelp size={14} />
              </button>
            </div>
            <div className="prototype-label">
              <span>
                <i />
                TARGET-STATE PROTOTYPE
              </span>
              <small>Synthetic demonstration data</small>
            </div>
            <button
              className="evidence-button"
              onClick={() => setEvidence(true)}
            >
              <BookOpen size={15} />
              <span>Evidence</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {maturityOpen && (
            <motion.div
              id="maturity-explanation"
              className="maturity-popover"
              role="region"
              aria-labelledby="maturity-explanation-title"
              data-maturity-ui
              data-presentation-shortcuts="off"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <button
                className="icon-button"
                onClick={() => setMaturityOpen(false)}
                aria-label="Close maturity explanation"
              >
                <X size={16} />
              </button>
              <span className="eyebrow">
                CURRENT INVENTORY → MVP → CAPABILITY DEVELOPMENT → TARGET
              </span>
              <h3 id="maturity-explanation-title">
                {maturityInfo[maturity][0]}
              </h3>
              <div>
                {maturityInfo[maturity].slice(1).map((t) => (
                  <span key={t}>
                    <Check size={13} />
                    {t}
                  </span>
                ))}
              </div>
              <p>
                Selecting a stage changes the map’s illustrated capabilities:
                reference inventory, a priority-corridor MVP, or the integrated
                target-state model. These views do not verify deployed municipal
                systems; operational data remains synthetic.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  navigate("Governance & Roadmap");
                  setMaturityOpen(false);
                }}
              >
                Explore implementation roadmap
                <ArrowRight size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {demo && (
          <div
            className="demo-progress"
            title="Arrow keys: previous / next step. Escape: exit presentation. Inputs and dialogs retain their own keyboard controls."
          >
            <div
              className="presentation-current-step"
              role="status"
              aria-live="polite"
            >
              <span>{String(step + 1).padStart(2, "0")} / 07</span>
              <strong>{demoSteps[step]}</strong>
            </div>
            <div className="demo-steps" aria-label="Presentation journey">
              {demoSteps.map((name, i) => (
                <div
                  key={name}
                  aria-current={i === step ? "step" : undefined}
                  className={`${i === step ? "current" : ""} ${i < step ? "complete" : ""}`}
                >
                  <span>
                    {i < step ? (
                      <Check size={11} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  <b>{name}</b>
                </div>
              ))}
            </div>
            <span className="presentation-keys">
              <kbd>←</kbd>
              <kbd>→</kbd> Steps <span>·</span> <kbd>Esc</kbd> Exit
            </span>
            <div className="demo-actions">
              <span
                className={`presentation-preparation ${preparation}`}
                title="Preloaded 2D/3D geography and charts"
              >
                {preparation === "loading" ? (
                  <LoaderCircle size={12} />
                ) : preparation === "error" || preparation === "fallback" ? (
                  <TriangleAlert size={12} />
                ) : (
                  <Check size={12} />
                )}
                {preparation === "loading"
                  ? "Preparing city"
                  : preparation === "error"
                    ? "Model unavailable"
                    : preparation === "fallback"
                      ? "Text-only demo"
                    : "City ready"}
              </span>
              {preparation === "error" && <>
                <button onClick={() => prepareCity(true)}>Retry preparation</button>
                <button onClick={() => setPreparation("fallback")}>Continue without map</button>
              </>}
              {preparation === "fallback" && <button onClick={() => prepareCity(true)}>Retry preparation</button>}
              <button
                aria-label={
                  fullscreen ? "Exit full screen" : "Enter full screen"
                }
                title={fullscreen ? "Exit full screen" : "Enter full screen"}
                onClick={fullscreen ? leaveFullscreen : enterFullscreen}
              >
                {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                aria-label="Previous demo step"
                disabled={step === 0}
                onClick={() => demoGo(step - 1)}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              {!(evidence && step === 1) && (
                <button
                  className="next"
                  onClick={nextStep}
                  disabled={["loading", "error"].includes(preparation)}
                >
                  {step === 6 ? "Finish Demo" : "Next Step"}
                  <ChevronRight size={14} />
                </button>
              )}
              <button
                aria-label="Reset Demo"
                title="Reset Demo"
                onClick={reset}
              >
                <RotateCcw size={14} />
              </button>
              <button
                aria-label="Exit presentation"
                title="Exit presentation"
                onClick={stopDemo}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
        <header className="page-heading">
          <div>
            <div className="page-kicker">
              <span
                className={`kicker-dot ${page === "Digital Twin" ? "purple-dot" : ""}`}
              />
              {page === "Digital Twin"
                ? "SCENARIO INTELLIGENCE"
                : page === "Governance & Roadmap"
                  ? "THE PATH TO GREENPULSE"
                  : "GREENPULSE COMMAND CENTER"}
            </div>
            <h1>{page}</h1>
            <p>{subtitles[page]}</p>
          </div>
          {page === "Overview" || page === "City Map" ? (
            <div className="operational-stats">
              <button onClick={() => navigate("Data Health")}>
                <Radio size={15} />
                <span>
                  <strong>
                    {qualitySummary.operational} <small>/ {qualitySummary.total}</small>
                  </strong>
                  <small>SYNTHETIC feeds</small>
                </span>
              </button>
              <button onClick={() => navigate("Data Health")}>
                <span className="quality-ring">{qualitySummary.qualityPercent ?? "No data"}</span>
                <span>
                  <strong>
                    {qualitySummary.qualityPercent ?? "No data"}{qualitySummary.qualityPercent !== null && <small>%</small>}
                  </strong>
                  <small>SYNTHETIC quality</small>
                </span>
              </button>
              <button
                onClick={() => navigate("Alert Center")}
                className="alert-stat"
              >
                <Bell size={16} />
                <span>
                  <strong>{activeAlertCount}</strong>
                  <small>SYNTHETIC alerts</small>
                </span>
              </button>
              <LocalClock />
            </div>
          ) : (
            <div className="heading-context">
              <Tag tone={page === "Digital Twin" ? "amber" : "cyan"} dot>
                {page === "Digital Twin" ? "MODELLED · TARGET" : "SYNTHETIC PROTOTYPE"}
              </Tag>
              <span>Leuven · Historic Centre · H-03</span>
              <LocalClock />
            </div>
          )}
        </header>
        <main
          className={`screen-content screen-${page.toLowerCase().replaceAll(" ", "-").replace("&", "and")}`}
        >
          {(page === "Overview" || page === "City Map") && (
            <div
              className={`overview-layout ${page === "City Map" ? "map-page" : ""}`}
            >
              {page === "Overview" && <nav className="shared-workflow-nav" aria-label="Three operational workflows"><span>ONE SHARED MUNICIPAL DECISION CAPABILITY</span>{[["Daily Traffic", "01"], ["ZTL Access", "02"], ["Heat Preparedness", "03"]].map(([name, number]) => <button key={name} onClick={() => navigate(name)}><small>{number}</small>{name}<ArrowUpRight size={13} /></button>)}</nav>}
              {timeline}
              <div className="operations-stage">
                <section className="map-surface geo-context">
                  <div className="map-heading">
                    <div>
                      <span className="eyebrow">
                        {maturity !== "CURRENT" && (
                          <span className="live-dot" />
                        )}
                        {maturity === "CURRENT"
                          ? "CURRENT INVENTORY"
                          : maturity === "MVP"
                            ? "PROPOSED PRIORITY CORRIDOR"
                            : "CITY OPERATIONS"}
                      </span>
                      <h2>
                        Leuven historic centre<span>H-03</span>
                      </h2>
                    </div>
                    <div className="map-heading-note">
                      <ScanLine size={14} />
                      Belgium · OSM geography
                    </div>
                  </div>
                  {mapEnabled ? <CityMap
                    key={`overview-map-${viewResetToken}`}
                    focused={selected}
                    focusRequest={focusRequest}
                    onClearFocus={clearMapFocus}
                    forecastOffset={forecastOffset}
                    maturity={maturity}
                    layers={layers}
                    onSelect={selectMapIncident}
                    after={false}
                    camera={overviewContext.camera}
                    onCameraChange={updateOverviewCamera}
                    viewMode={overviewContext.viewMode}
                    onViewModeChange={updateOverviewViewMode}
                    selectedEntity={overviewContext.entity}
                    onSelectedEntityChange={updateOverviewEntity}
                  /> : <div className="map-unavailable-demo" role="status"><Map size={32} /><strong>Geographic view unavailable</strong><p>Text-only presentation · The incident, evidence, scenarios and human decision workflow remain available.</p><small>LEUVEN URBAN MODEL · Synthetic demonstration data</small></div>}
                  {mapEnabled && <LayerMenu
                    layers={layers}
                    setLayers={setLayers}
                    maturity={maturity}
                    availableLayers={
                      MATURITY_MAP_STAGES[maturity].availableLayers
                    }
                  />}
                  {mapEnabled && <div className="map-bottom-legend" aria-label="Map legend">
                    {maturity === "CURRENT" ? (
                      <span>CURRENT · reference geography, unconnected inventory</span>
                    ) : (
                      <>
                        <span>
                          <i className="cyan" />
                          SYNTHETIC · low queue
                        </span>
                        <span>
                          <i className="amber" />
                          SYNTHETIC · elevated
                        </span>
                        <span>
                          <i className="red" />
                          SYNTHETIC · queue
                        </span>
                        <span className="heritage-key">
                          <i />
                          Mapped historic sites
                        </span>
                      </>
                    )}
                  </div>}
                  <div className="map-location-note">
                    <span className="location-cross">+</span>
                    <span>
                      LEUVEN HISTORIC CENTRE <b>H-03</b>
                    </span>
                    <Tag
                      tone={
                        maturity === "CURRENT"
                          ? "cyan"
                          : state.status === "paused"
                            ? "amber"
                            : active
                              ? "green"
                              : "red"
                      }
                      dot
                    >
                      {maturity === "CURRENT"
                        ? "REFERENCE INVENTORY"
                        : state.status === "paused"
                          ? "INTERVENTION PAUSED"
                          : active
                            ? "APPROVED PLAN ACTIVE"
                            : "INCIDENT DETECTED"}
                    </Tag>
                  </div>
                </section>
                {state.status === "idle" ? (
                  <IncidentPanel
                    selected={selected}
                    forecastOffset={forecastOffset}
                    forecast={getForecast(forecastOffset)}
                    onCompare={compare}
                    onEvidence={() => setEvidence(true)}
                    readiness={readiness}
                    onInspectDataHealth={() => { setSelectedSourceId(readiness.missing[0] || "traffic"); navigate("Data Health"); }}
                  />
                ) : (
                  <ActivePanel
                    state={state}
                    dispatch={(action) =>
                      dispatch({ ...action, time: formatCityTime() })
                    }
                    onExecute={() => { setExecutionOperator(""); setExecutionConfirmed(false); setExecutionLegal(false); setExecutionOpen(true); }}
                    onHandover={() => setHandover(true)}
                    onClose={() => setCloseConfirm(true)}
                    onImpact={() => navigate("KPI Framework")}
                    readiness={readiness}
                  />
                )}
              </div>
              {page === "Overview" && (
                <OperationsBottom
                  onHealth={() => navigate("Data Health")}
                  lifecycle={state.status}
                  qualityState={qualityState}
                  qualitySummary={qualitySummary}
                />
              )}
            </div>
          )}
          {page === "Digital Twin" && (
            <DigitalTwin
              onApprove={openApproval}
              lifecycle={state.status}
              maturity={maturity}
              forecastOffset={forecastOffset}
              timeline={timeline}
              viewContext={twinContext}
              onViewContextChange={setTwinContext}
              mapEnabled={mapEnabled}
              readiness={readiness}
              approvedDecision={state.approvedDecision}
            />
          )}
          {page === "Data Health" && <div className="document-domain"><nav className="document-tabs" aria-label="Data Health views"><button aria-pressed={healthTab === "feeds"} onClick={() => setHealthTab("feeds")}>Synthetic feeds & decision gates</button><button aria-pressed={healthTab === "inventory"} onClick={() => setHealthTab("inventory")}>Supplied reference inventory</button></nav>{healthTab === "feeds" ? <DataHealth action={trafficContext.action} qualityState={qualityState} onQualityChange={changeQuality} selectedSourceId={selectedSourceId} onSelectedSourceChange={setSelectedSourceId} onBackToIncident={() => navigate("Overview")} /> : <ReferenceInventory />}</div>}
          {page === "Daily Traffic" && (
            <div className="document-domain"><nav className="document-tabs" aria-label="Traffic workspace views"><button aria-pressed={trafficTab === "analysis"} onClick={() => setTrafficTab("analysis")}>Counts & queue patterns</button><button aria-pressed={trafficTab === "use-case"} onClick={() => setTrafficTab("use-case")}>Purpose, evidence & decision path</button></nav>{trafficTab === "analysis" ? <TrafficScreen
              forecastOffset={forecastOffset}
              forecastAnchor={forecastAnchor}
              timeline={timeline}
              readiness={readiness}
            /> : <TrafficUseCasePanel context={trafficContext} onContextChange={setTrafficContext} readiness={readiness} onReview={openApproval} onOpenKpi={() => { setKpiFocus("K1"); navigate("KPI Framework"); }} />}</div>
          )}
          {page === "ZTL Access" && <ZtlWorkspace maturity={maturity} onReview={openApproval} onOpenKpi={id => { setKpiFocus(id || "K7"); navigate("KPI Framework"); }} />}
          {page === "Architecture" && <ArchitectureWorkspace />}
          {page === "Heat Preparedness" && <HeatWorkspace state={heatState} dispatch={dispatchHeat} maturity={maturity} viewContext={heatContext} onViewContextChange={setHeatContext} mapEnabled={mapEnabled} onOpenKpi={id => { setKpiFocus(id); navigate("KPI Framework"); }} />}
          {page === "Governance & Roadmap" && <Roadmap />}
          {page === "Decision Log" && (
            <DecisionLog lifecycle={state.status} logs={[...state.logs, ...heatState.logs.map(log => ({ ...log, time: formatCityTime(new Date(log.timestamp)), date: formatCityDate(new Date(log.timestamp)), detail: `${log.authority || "Civil Protection"} · synthetic preparedness record` })), ...proposals.map(record => ({ event: record.recommendation, time: formatCityTime(new Date(record.decision.time)), date: formatCityDate(new Date(record.decision.time)), operator: record.decision.actor, detail: record.result.summary }))].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))} />
          )}
          {page === "KPI Framework" && (
            <KpiWorkbench initialKpiId={kpiFocus} trafficLifecycle={{ ...state, requests: proposals }} heatState={heatWithMetrics} alertAt={alertAnchor} observations={observations} onObservationsChange={setObservations} decisionRecords={records} onNavigate={navigate} />
          )}
          {page === "Alert Center" && (
            <AlertCenter
              alerts={alerts}
              onOpen={openAlert}
              onAcknowledge={id => dispatchIncident({ type: "ACKNOWLEDGE", id, operator: state.operator })}
              onAssign={(id, owner) => dispatchIncident({ type: "ASSIGN", id, owner, operator: state.operator })}
              onResolve={(id, options) => dispatchIncident({ ...options, type: "RESOLVE", id, operator: state.operator, context: { lifecycle: state, qualityState } })}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={12} />
            Human-led decisions. AI-supported intelligence.
          </span>
          <span>
            Leuven · OpenStreetMap geography
            <span className="footer-sep">/</span>No live municipal systems
            connected
          </span>
          <span>
            GREENPULSE<span className="footer-version">CONTROL ROOM · 02</span>
          </span>
        </footer>
      </div>
      <ApprovalDialog
        open={approval}
        operator={state.operator}
        qualityState={qualityState}
        maturity={maturity}
        action={approvalAction}
        trafficContext={trafficContext}
        onTrafficContextChange={setTrafficContext}
        onInspectTrafficContext={() => { setApproval(false); setTrafficTab("use-case"); navigate("Daily Traffic"); }}
        onModify={options => { dispatch({ type: "MODIFY", humanReviewed: true, reason: options.reason, action: options.action, qualityState }); }}
        onDecline={options => { dispatch({ type: "OVERRIDE", humanReviewed: true, reason: options.reason, action: options.action, qualityState }); setApproval(false); setToast("Human override recorded. No intervention was activated."); }}
        onInspectDataHealth={() => { setApproval(false); setSelectedSourceId(readiness.missing[0] || "traffic"); navigate("Data Health"); }}
        onClose={() => setApproval(false)}
        onApprove={(options) => {
          const gate = evaluateTrafficContext(trafficContext, options?.action);
          const inputs = evaluateDataReadiness(qualityState, options?.action);
          if (!["MVP", "TARGET"].includes(maturity) || options?.authorityConfirmed !== true || options.authority !== gate.authority || (gate.requiresPolice && (options.policeReviewed !== true || options.legalProcessConfirmed !== true || options.privacyReviewed !== true)) || !isReviewCurrent(options?.reviewSnapshot, options, inputs, trafficContext)) {
            setToast("Approval blocked. Review the current plan and restore required evidence.");
            return;
          }
          dispatch({
            type: "APPROVE",
            humanApproved: true,
            time: formatCityTime(),
            duration: options?.duration,
            action: options?.action,
            trafficContext,
            authority: options?.authority,
            authorityConfirmed: options?.authorityConfirmed,
            policeReviewed: options?.policeReviewed,
            legalProcessConfirmed: options?.legalProcessConfirmed,
            privacyReviewed: options?.privacyReviewed,
            maturity,
            routeGuidance: options?.routeGuidance,
            note: options?.note,
            reviewSnapshot: options?.reviewSnapshot,
            qualityState,
          });
          setApproval(false);
          setPage("Overview");
          setForecastOffset(0);
          if (demo) setStep(5);
          setToast("Human approval recorded. Authorised execution is still required.");
        }}
      />
      <Drawer open={executionOpen} onClose={() => setExecutionOpen(false)} title="Authorised execution" label="HUMAN EXECUTION · SYNTHETIC PROTOTYPE" footer={<button className="button primary" disabled={state.status !== "approved" || executionOperator.trim().length < 3 || !executionConfirmed || (state.action === "ztl" && !executionLegal)} onClick={() => {
        const role = state.action === "ztl" ? "Municipal Police" : "Authorised traffic-signal operator";
        dispatch({ type: "EXECUTE", humanExecuted: true, authority: role, operatorRole: role, operator: executionOperator.trim(), legalProcessConfirmed: executionLegal });
        setExecutionOpen(false); setToast("Human execution recorded. Synthetic operating window started.");
      }}>Execute approved prototype plan <ArrowRight size={15}/></button>}>
        <p>The approved plan remains inactive until the responsible person records execution. This action operates the demonstration only.</p>
        <p><strong>Required role: {state.action === "ztl" ? "Municipal Police" : "Authorised traffic-signal operator"}</strong></p>
        <label className="document-request-note">Execution operator<input value={executionOperator} onChange={event => setExecutionOperator(event.target.value)} /></label>
        <label className="document-confirm"><input type="checkbox" checked={executionConfirmed} onChange={event => setExecutionConfirmed(event.target.checked)}/>I confirm the authorised operator role and approved plan</label>
        {state.action === "ztl" && <label className="document-confirm"><input type="checkbox" checked={executionLegal} onChange={event => setExecutionLegal(event.target.checked)}/>Municipal Police confirms the established legal process and protected exemptions</label>}
        <p>No physical traffic signal, access rule, enforcement action or public message is changed.</p>
      </Drawer>
      <EvidenceDrawer
        open={evidence}
        onClose={() => setEvidence(false)}
        onNext={demo && step === 1 ? () => demoGo(2) : undefined}
      />
      <Drawer open={Boolean(proposalAction)} onClose={() => setProposalAction(null)} title="Record departmental proposal" label="HUMAN REQUEST · NO OPERATIONAL ACTIVATION" footer={<button className="button primary" disabled={proposalNote.trim().length < 3} onClick={() => { const timestamp = Date.now(); setProposals(value => [...value, { id: `PROPOSAL-${timestamp}`, data: { useCase: "traffic", context: trafficContext }, modelVersion: MODEL_VERSION, recommendation: TRAFFIC_ACTIONS[proposalAction].label, decision: { actor: state.operator, time: new Date(timestamp).toISOString(), approvedOrOverride: "request" }, result: { status: "pending", summary: proposalNote.trim() } }]); setProposalAction(null); setToast("Departmental request recorded. No service or policy was changed."); }}>Record request</button>}><p>{proposalAction && TRAFFIC_ACTIONS[proposalAction]?.implementedScope}</p><p>Proposed decision owner: {proposalAction && TRAFFIC_ACTIONS[proposalAction]?.authority}</p><label className="document-request-note">Evidence and proposed follow-up<textarea rows={4} value={proposalNote} onChange={event => setProposalNote(event.target.value)} /></label><p>Synthetic demonstration record. This does not contact an operator, publish a message or change municipal rules.</p></Drawer>
      <HandoverDialog
        open={handover}
        onClose={() => setHandover(false)}
        onConfirm={(operator, note) => {
          dispatch({
            type: "HANDOVER",
            operator,
            note,
            time: formatCityTime(),
          });
          setHandover(false);
          setToast(`Accountability transferred to ${operator}.`);
        }}
      />
      {closeConfirm && (
        <div className="confirmation-backdrop">
          <div
            className="confirmation"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="close-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setCloseConfirm(false);
              if (event.key === "Tab") {
                const buttons = [
                  ...event.currentTarget.querySelectorAll("button"),
                ];
                if (event.shiftKey && document.activeElement === buttons[0]) {
                  event.preventDefault();
                  buttons.at(-1).focus();
                } else if (
                  !event.shiftKey &&
                  document.activeElement === buttons.at(-1)
                ) {
                  event.preventDefault();
                  buttons[0].focus();
                }
              }
            }}
          >
            <Tag tone="purple">CLOSED-LOOP MEASUREMENT</Tag>
            <h2 id="close-title">Close this intervention?</h2>
            <p>
              The signal plan will close and a synthetic outcome measurement
              window will begin. Results become available only after measurement
              completes.
            </p>
            <div>
              <button
                className="button secondary"
                autoFocus
                onClick={() => setCloseConfirm(false)}
              >
                Keep monitoring
              </button>
              <button
                className="button primary"
                onClick={() => {
                  dispatch({ type: "CLOSE", time: formatCityTime() });
                  setCloseConfirm(false);
                  navigate("KPI Framework");
                }}
              >
                Close & measure
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ShieldCheck size={16} />
            {toast}
            <button
              className="icon-button"
              onClick={() => setToast("")}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
