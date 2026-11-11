import React, {
  useCallback,
  useEffect,
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
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Fingerprint,
  Gauge,
  GitBranch,
  Globe2,
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
  Wind,
  X,
  ChartNoAxesCombined,
  History,
  PanelLeftClose,
  ScanLine,
  CircleDot,
  Maximize2,
  Minimize2,
  LoaderCircle,
} from "lucide-react";
import CityMap, { preloadCityModel } from "./components/CityMap";
import IncidentPanel from "./components/IncidentPanel";
import ForecastTimeline from "./components/ForecastTimeline";
import { getForecast } from "./scenario.mjs";
import DigitalTwin from "./components/DigitalTwin";
import {
  DataHealth,
  TrafficScreen,
  HeatScreen,
  Roadmap,
  DecisionLog,
  ImpactScreen,
  AlertCenter,
} from "./components/DomainScreens";
import {
  ApprovalDialog,
  EvidenceDrawer,
  HandoverDialog,
  KpiMethodologyDrawer,
} from "./components/Dialogs";
import { lifecycleReducer, initialLifecycle } from "./lifecycle.mjs";
import {
  formatCityTime,
  formatCityDate,
  formatCityTimeZone,
  CITY_TIME_ZONE,
} from "./time.mjs";

const ID = "INC-2026-1109-H03";
const sections = [
  [
    "OPERATIONS",
    [
      ["Overview", Activity],
      ["Alert Center", Bell],
      ["City Map", Map],
      ["Data Health", Database],
    ],
  ],
  [
    "DECISION INTELLIGENCE",
    [
      ["Traffic & Emissions", Route],
      ["Urban Heat", Thermometer],
      ["Digital Twin", Layers3],
    ],
  ],
  [
    "GOVERNANCE",
    [
      ["Decision Log", History],
      ["KPI & Impact", ChartNoAxesCombined],
      ["Implementation Roadmap", GitBranch],
    ],
  ],
];
const subtitles = {
  Overview: "Leuven, Belgium. A clearer operational picture.",
  "Alert Center": "Prioritise what needs a human decision.",
  "City Map": "A shared operational picture of the city.",
  "Data Health": "Trust begins at the source.",
  "Traffic & Emissions": "Understand the pressure. Anticipate the next hour.",
  "Urban Heat": "Anticipate heat. Protect the most exposed.",
  "Digital Twin": "Compare interventions before acting in the physical city.",
  "Decision Log": "Every decision has a human owner.",
  "KPI & Impact": "From modelled benefit to measured outcome.",
  "Implementation Roadmap":
    "GreenPulse is the destination. A progressive path to get there.",
};
const demoSteps = [
  "Alert",
  "Evidence",
  "Prediction",
  "Scenarios",
  "Human approval",
  "Intervention",
  "Measured impact",
];
const maturityInfo = {
  CURRENT: [
    "Current inventory",
    "Available municipal systems",
    "Fragmented data",
    "Manual coordination",
  ],
  MVP: [
    "First connected workflow",
    "Priority operational sources",
    "Traffic prediction & human approval",
    "Baseline KPIs & decision log",
  ],
  TARGET: [
    "GreenPulse target state",
    "Urban Data Hub & Digital Twins",
    "AI-supported scenario intelligence",
    "Closed-loop measurement",
  ],
};
const layerNames = [
  ["traffic", "Traffic", Route],
  ["air", "Air Quality", Wind],
  ["heat", "Urban Heat", Thermometer],
  ["heritage", "Heritage", Building2],
  ["sensors", "Sensors", Radio],
];

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
function LayerBar({ layers, setLayers }) {
  return (
    <div className="layer-bar" aria-label="Map layers">
      <span className="layer-label">
        <Layers3 size={14} />
        LAYERS
      </span>
      {layerNames.map(([key, name, Icon]) => (
        <button
          key={key}
          aria-pressed={!!layers[key]}
          className={layers[key] ? "selected" : ""}
          onClick={() => setLayers((v) => ({ ...v, [key]: !v[key] }))}
        >
          <Icon size={14} />
          {name}
        </button>
      ))}
    </div>
  );
}

function ActivePanel({ state, dispatch, onHandover, onClose, onImpact }) {
  const paused = state.status === "paused";
  const countdown = new Date(state.remaining * 1000)
    .toISOString()
    .slice(11, 19);
  if (state.status === "measuring" || state.status === "measured")
    return (
      <section className="incident-panel outcome-panel">
        <Tag tone={state.status === "measured" ? "green" : "purple"}>
          {state.status === "measured" ? "MEASURED" : "MEASURING OUTCOME"}
        </Tag>
        <div className="outcome-orbit">
          <Activity size={38} />
        </div>
        <h2>
          {state.status === "measured"
            ? "The loop is complete."
            : "A decision is only the beginning."}
        </h2>
        <p className="muted">
          {state.status === "measured"
            ? "The completed measurement window is ready for review. Compare the actual outcome with the model’s prediction."
            : "The intervention has closed. GreenPulse is comparing the synthetic observation window with its baseline."}
        </p>
        <button className="button primary" onClick={onImpact}>
          View {state.status === "measured" ? "measured impact" : "measurement"}
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
      <h2>Signal Plan H03</h2>
      <p className="muted">
        Adaptive signals
        {state.routeGuidance ? " + targeted route guidance" : ""}
      </p>
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
          <dd>Mobility Operations</dd>
        </div>
        <div>
          <dt>Supporting department</dt>
          <dd>Environment</dd>
        </div>
        <div>
          <dt>Next review</dt>
          <dd>
            {state.nextReviewAt
              ? formatCityTime(new Date(state.nextReviewAt), { seconds: false })
              : "—"}
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
    [0, "Traffic T14 speed", "↓ 17 km/h", "cyan"],
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

function OperationsBottom({ onHealth, lifecycle }) {
  const [events, setEvents] = useState(seedEvents);
  useEffect(() => {
    let n = 0;
    const timer = setInterval(() => {
      n++;
      const entries = [
        ["Traffic T14 speed", `↓ ${17 + (n % 3)} km/h`, "cyan"],
        ["AQ-04 NO₂", "→ 47 µg/m³", "cyan"],
        ["Incident H03", "prediction updated", "purple"],
        ["AVL feed", "healthy", "cyan"],
      ];
      const e = entries[(n - 1) % entries.length];
      const t = formatCityTime();
      setEvents((v) => [[t, ...e], ...v].slice(0, 6));
    }, 8000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="operations-bottom">
      <section className="event-stream">
        <div className="stream-heading">
          <span className="eyebrow">
            <Radio size={13} />
            LIVE EVENT STREAM
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
          <span className="eyebrow">DATA HEALTH</span>
          <strong>
            96<span>%</span>
          </strong>
          <span className="muted">6 critical source groups · 1 degraded</span>
        </div>
        <div className="mini-feeds">
          {[
            ["Traffic", "18 sec"],
            ["Air Quality", "52 sec"],
            ["AVL", "14 sec"],
            ["Weather", "2 min"],
          ].map(([n, t]) => (
            <div key={n}>
              <i />
              <span>{n}</span>
              <small>Healthy</small>
              <time>{t}</time>
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
    [selected, setSelected] = useState(false),
    [closeConfirm, setCloseConfirm] = useState(false);
  const [maturity, setMaturity] = useState("TARGET"),
    [maturityOpen, setMaturityOpen] = useState(false);
  const [demo, setDemo] = useState(false),
    [step, setStep] = useState(0),
    [toast, setToast] = useState("");
  const appRef = useRef(null);
  const [forecastOffset, setForecastOffset] = useState(60);
  const [forecastAnchor, setForecastAnchor] = useState(() => Date.now());
  const [focusRequest, setFocusRequest] = useState(0);
  const [viewResetToken, setViewResetToken] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [preparation, setPreparation] = useState("idle");
  const selectMapIncident = useCallback((item) => {
    if (item?.type === "incident" || item?.id === "H03") {
      setSelected(true);
      setFocusRequest((value) => value + 1);
    }
  }, []);
  const clearMapFocus = useCallback(() => setSelected(false), []);
  useEffect(() => {
    const sync = () =>
      setFullscreen(document.fullscreenElement === appRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const active = ["active", "paused"].includes(state.status);
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
      5000,
    );
    return () => clearTimeout(t);
  }, [state.status]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3800);
    return () => clearTimeout(t);
  }, [toast]);
  const navigate = (name) => {
    setPage(name);
    setMobileNav(false);
    setSelected(false);
  };
  const openApproval = () => {
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
    setForecastAnchor(Date.now());
    setForecastOffset(demo ? 0 : 60);
    setViewResetToken((value) => value + 1);
    dispatch({ type: "RESET" });
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
      setPage("Overview");
      setForecastOffset(0);
      setSelected(true);
      setFocusRequest((value) => value + 1);
    }
    if (next === 1) {
      setPage("Overview");
      setSelected(true);
      setFocusRequest((value) => value + 1);
      setForecastOffset(0);
      setEvidence(true);
    }
    if (next === 2) {
      setPage("Traffic & Emissions");
      setForecastOffset(30);
    }
    if (next === 3) {
      setPage("Digital Twin");
      setForecastOffset(60);
    }
    if (next === 4) {
      setPage("Digital Twin");
      setForecastOffset(60);
      if (state.status === "idle") setApproval(true);
    }
    if (next === 5) {
      setPage("Overview");
      setForecastOffset(0);
    }
    if (next === 6) {
      setPage("KPI & Impact");
      if (active) dispatch({ type: "CLOSE", time: formatCityTime() });
    }
  };
  const nextStep = () => {
    if (step === 4 && state.status === "idle") {
      setApproval(true);
      setToast("A human must approve this intervention before continuing.");
      return;
    }
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
    setDemo(false);
    setEvidence(false);
    setApproval(false);
    setHandover(false);
    setMethodologyOpen(false);
    setCloseConfirm(false);
    leaveFullscreen();
  };
  const startDemo = () => {
    reset();
    setDemo(true);
    setForecastOffset(0);
    setSelected(true);
    setFocusRequest((value) => value + 1);
    setPreparation("loading");
    enterFullscreen();
    preloadCityModel()
      .then(() => setPreparation("ready"))
      .catch(() => {
        setPreparation("error");
        setToast(
          "The geographic model could not be prepared. Reload the page before presenting maps.",
        );
      });
  };
  useEffect(() => {
    if (!demo) return undefined;
    const keydown = (event) => {
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
        evidence &&
        step === 1 &&
        ["ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        demoGo(event.key === "ArrowRight" ? 2 : 0);
        return;
      }
      if (
        document.querySelector('[role="dialog"],[role="alertdialog"]') ||
        approval ||
        handover ||
        closeConfirm
      )
        return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (preparation !== "loading") nextStep();
      }
      if (event.key === "ArrowLeft" && step > 0) {
        event.preventDefault();
        demoGo(step - 1);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        stopDemo();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [
    demo,
    step,
    evidence,
    approval,
    handover,
    closeConfirm,
    preparation,
    state.status,
  ]);
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
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
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
        <div className="workspace-name">
          <span className="workspace-icon">
            <Globe2 size={16} />
          </span>
          <div>
            City Control Room<small>Demonstration environment</small>
          </div>
          <ChevronRight size={13} />
        </div>
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
                  aria-current={page === name ? "page" : undefined}
                >
                  <Icon size={17} strokeWidth={1.6} />
                  <span>{name}</span>
                  {name === "Alert Center" && (
                    <span className="nav-count">3</span>
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
              Control Room Operator<small>Mobility Operations</small>
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
              aria-label="Operating model maturity"
            >
              {["CURRENT", "MVP", "TARGET"].map((m) => (
                <button
                  key={m}
                  className={maturity === m ? "active" : ""}
                  aria-pressed={maturity === m}
                  onClick={() => {
                    setMaturity(m);
                    setMaturityOpen(true);
                  }}
                >
                  {m}
                </button>
              ))}
              <button
                className="maturity-help"
                aria-label="Explain maturity stages"
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
              className="maturity-popover"
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
              <h3>{maturityInfo[maturity][0]}</h3>
              <div>
                {maturityInfo[maturity].slice(1).map((t) => (
                  <span key={t}>
                    <Check size={13} />
                    {t}
                  </span>
                ))}
              </div>
              <p>
                The operational workspace illustrates the target state.
                Selecting a stage explains maturity; it does not represent
                deployed city capability.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  navigate("Implementation Roadmap");
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
                ) : (
                  <Check size={12} />
                )}
                {preparation === "loading"
                  ? "Preparing city"
                  : preparation === "error"
                    ? "Model unavailable"
                    : "City ready"}
              </span>
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
                  disabled={preparation === "loading"}
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
                : page === "Implementation Roadmap"
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
                    14 <small>/ 17</small>
                  </strong>
                  <small>operational feeds</small>
                </span>
              </button>
              <button onClick={() => navigate("Data Health")}>
                <span className="quality-ring">96</span>
                <span>
                  <strong>
                    96<small>%</small>
                  </strong>
                  <small>data quality</small>
                </span>
              </button>
              <button
                onClick={() => navigate("Alert Center")}
                className="alert-stat"
              >
                <Bell size={16} />
                <span>
                  <strong>3</strong>
                  <small>active alerts</small>
                </span>
              </button>
              <LocalClock />
            </div>
          ) : (
            <div className="heading-context">
              <Tag tone={page === "Digital Twin" ? "amber" : "cyan"} dot>
                {page === "Digital Twin" ? "SIMULATED" : "DEMONSTRATION"}
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
              {timeline}
              <div className="operations-stage">
                <section className="map-surface geo-context">
                  <div className="map-heading">
                    <div>
                      <span className="eyebrow">
                        <span className="live-dot" />
                        CITY OPERATIONS
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
                  <CityMap
                    key={`overview-map-${viewResetToken}`}
                    focused={selected}
                    focusRequest={focusRequest}
                    onClearFocus={clearMapFocus}
                    forecastOffset={forecastOffset}
                    layers={layers}
                    onSelect={selectMapIncident}
                    after={false}
                  />
                  <LayerBar layers={layers} setLayers={setLayers} />
                  <div className="map-bottom-legend">
                    <span>
                      <i className="cyan" />
                      Free flow
                    </span>
                    <span>
                      <i className="amber" />
                      Elevated
                    </span>
                    <span>
                      <i className="red" />
                      Congested
                    </span>
                    <span className="heritage-key">
                      <i />
                      Mapped historic sites
                    </span>
                  </div>
                  <div className="map-location-note">
                    <span className="location-cross">+</span>
                    <span>
                      LEUVEN HISTORIC CENTRE <b>H-03</b>
                    </span>
                    <Tag
                      tone={
                        state.status === "paused"
                          ? "amber"
                          : active
                            ? "green"
                            : "red"
                      }
                      dot
                    >
                      {state.status === "paused"
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
                  />
                ) : (
                  <ActivePanel
                    state={state}
                    dispatch={(action) =>
                      dispatch({ ...action, time: formatCityTime() })
                    }
                    onHandover={() => setHandover(true)}
                    onClose={() => setCloseConfirm(true)}
                    onImpact={() => navigate("KPI & Impact")}
                  />
                )}
              </div>
              {page === "Overview" && (
                <OperationsBottom
                  onHealth={() => navigate("Data Health")}
                  lifecycle={state.status}
                />
              )}
            </div>
          )}
          {page === "Digital Twin" && (
            <DigitalTwin
              onApprove={openApproval}
              lifecycle={state.status}
              forecastOffset={forecastOffset}
              timeline={timeline}
            />
          )}
          {page === "Data Health" && <DataHealth />}
          {page === "Traffic & Emissions" && (
            <TrafficScreen
              forecastOffset={forecastOffset}
              forecastAnchor={forecastAnchor}
              timeline={timeline}
            />
          )}
          {page === "Urban Heat" && <HeatScreen />}
          {page === "Implementation Roadmap" && <Roadmap />}
          {page === "Decision Log" && (
            <DecisionLog lifecycle={state.status} logs={state.logs} />
          )}
          {page === "KPI & Impact" && (
            <ImpactScreen
              lifecycle={state.status}
              onNavigate={() => navigate("Digital Twin")}
              onMethodology={() => setMethodologyOpen(true)}
            />
          )}
          {page === "Alert Center" && (
            <AlertCenter
              onOpen={(destination) => {
                navigate(destination);
                if (destination === "Overview") {
                  setSelected(true);
                  setFocusRequest((value) => value + 1);
                }
              }}
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
        onClose={() => setApproval(false)}
        onApprove={(options) => {
          dispatch({
            type: "APPROVE",
            humanApproved: true,
            time: formatCityTime(),
            duration: options?.duration,
            routeGuidance: options?.routeGuidance,
            note: options?.note,
          });
          setApproval(false);
          setPage("Overview");
          setForecastOffset(0);
          if (demo) setStep(5);
          setToast("Human approval recorded. Signal Plan H03 is now active.");
        }}
      />
      <EvidenceDrawer
        open={evidence}
        onClose={() => setEvidence(false)}
        onNext={demo && step === 1 ? () => demoGo(2) : undefined}
      />
      <KpiMethodologyDrawer
        open={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />
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
                  navigate("KPI & Impact");
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
