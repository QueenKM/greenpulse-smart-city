import React, { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  GitCompareArrows,
  GripVertical,
  LockKeyhole,
  LocateFixed,
  Minus,
  Move,
  Plus,
  HelpCircle,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import CityMap from "./CityMap";
import {
  SCORE_WEIGHTS,
  calculateDecisionScore,
  getForecastAt,
} from "../scenario.mjs";
import "./DigitalTwin.css";

const scenarios = [
  {
    id: "A",
    name: "Do Nothing",
    congestion: 87,
    pm: 34,
    travel: 33,
    accessibility: "NONE",
    scores: [12, 10, 50, 100, 100],
    explanation:
      "Without intervention, congestion and air-quality pressure continue to build across the historic centre.",
  },
  {
    id: "B",
    name: "Adaptive Signals",
    congestion: 66,
    pm: 29,
    travel: 25,
    accessibility: "LOW",
    scores: [91, 88, 94, 100, 63],
    explanation:
      "Highest overall benefit with low accessibility impact and full compatibility with historic-centre constraints.",
  },
  {
    id: "C",
    name: "Traffic Diversion",
    congestion: 61,
    pm: 28,
    travel: 23,
    accessibility: "MEDIUM",
    scores: [94, 93, 67, 88, 49],
    explanation:
      "Greater traffic reduction, with additional accessibility trade-offs and more operational coordination.",
  },
].map((scenario) => ({
  ...scenario,
  score: calculateDecisionScore(scenario.scores),
}));
const scoreLabels = [
  "Environmental impact",
  "Mobility impact",
  "Accessibility",
  "Historic compatibility",
  "Implementation feasibility",
];

function ScoreRing({ score, selected }) {
  return (
    <span className={"twin-score-ring " + (selected ? "is-selected" : "")}>
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="18" />
        <circle
          cx="22"
          cy="22"
          r="18"
          pathLength="100"
          strokeDasharray={`${score} 100`}
        />
      </svg>
      <b>{score}</b>
    </span>
  );
}

function ScoreExplanation({ scenario, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const total = SCORE_WEIGHTS.reduce(
    (sum, criterion, index) =>
      sum + (scenario.scores[index] * criterion.weight) / 100,
    0,
  );
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    return () => previous?.focus?.();
  }, []);
  return (
    <div className="twin-score-overlay">
      <button
        className="twin-score-backdrop"
        tabIndex={-1}
        aria-label="Close score explanation"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        className="twin-score-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
          if (event.key === "Tab") {
            const controls = [
              ...event.currentTarget.querySelectorAll(
                'button, a[href], [tabindex="0"]',
              ),
            ];
            if (event.shiftKey && document.activeElement === controls[0]) {
              event.preventDefault();
              controls.at(-1)?.focus();
            } else if (
              !event.shiftKey &&
              document.activeElement === controls.at(-1)
            ) {
              event.preventDefault();
              controls[0]?.focus();
            }
          }
        }}
      >
        <header>
          <div>
            <span className="twin-overline">ILLUSTRATIVE DECISION MODEL</span>
            <h2 id={titleId}>How is this calculated?</h2>
          </div>
          <button aria-label="Close score methodology" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <p className="twin-score-introduction">
          Scenario {scenario.id} · {scenario.name}. A weighted comparison of
          synthetic criteria at the <strong>+60-minute decision horizon</strong>
          , regardless of the map time currently selected.{" "}
          {scenario.explanation}
        </p>
        <table>
          <thead>
            <tr>
              <th scope="col">Criterion</th>
              <th scope="col">Score</th>
              <th scope="col">Weight</th>
              <th scope="col">Contribution</th>
            </tr>
          </thead>
          <tbody>
            {SCORE_WEIGHTS.map((criterion, index) => (
              <tr key={criterion.label}>
                <th scope="row">{criterion.label}</th>
                <td>{scenario.scores[index]}</td>
                <td>{criterion.weight}%</td>
                <td>
                  {((scenario.scores[index] * criterion.weight) / 100).toFixed(
                    2,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="twin-score-equation">
          <span>Weighted sum · weights total 100%</span>
          <strong>
            {total.toFixed(2)}
            <ArrowRight size={17} />
            {calculateDecisionScore(scenario.scores)}
            <small>/100</small>
          </strong>
          <p>
            Multiply each criterion score by its percentage weight, add the
            contributions, then round to the nearest whole number.
          </p>
        </div>
        <div className="twin-score-assumptions">
          <h3>What the inputs mean</h3>
          <p>
            <strong>Implementation feasibility:</strong> a higher score means
            easier delivery and lower operational burden. {scenario.scores[4]}
            /100 is the scenario’s assumed ease of implementation; it is not a
            measure of “more effort”.
          </p>
          <p>
            <strong>Accessibility:</strong> retained local access. Temporary
            diversion lowers the score; congestion also reduces access when no
            action is taken.
          </p>
          <p>
            <strong>Historic compatibility:</strong> a design assumption about
            temporary, reversible actions, not legal or municipal approval.
          </p>
        </div>
        <p className="twin-score-disclaimer">
          <ShieldCheck size={15} />
          Synthetic criteria and illustrative weights. This model is not
          calibrated, validated or approved for real Leuven operations. An
          accountable human still makes the decision.
        </p>
      </section>
    </div>
  );
}

export default function DigitalTwin({
  onApprove,
  lifecycle = "idle",
  forecastOffset = 60,
  timeline,
}) {
  const [selected, setSelected] = useState("B");
  const [divider, setDivider] = useState(50);
  const [camera, setCamera] = useState({ zoom: 1, x: 0, y: 0 });
  const [viewMode, setViewMode] = useState("3d");
  const [panMode, setPanMode] = useState(false);
  const [panning, setPanning] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const panDrag = useRef(null);
  const uid = useId();
  const mapRef = useRef(null);
  const dragging = useRef(false);
  const updateDivider = (event) => {
    const bounds = mapRef.current?.getBoundingClientRect();
    if (!bounds?.width) return;
    setDivider(
      Math.round(
        Math.max(
          0,
          Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100),
        ),
      ),
    );
  };
  const endComparisonDrag = (event) => {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const comparisonPoint = (clientX, clientY) => {
    const box = mapRef.current?.getBoundingClientRect();
    if (!box?.width || !box?.height) return { x: 700, y: 450 };
    const scale = Math.max(box.width / 1400, box.height / 900);
    return {
      x: (clientX - box.left - (box.width - 1400 * scale) / 2) / scale,
      y: (clientY - box.top - (box.height - 900 * scale) / 2) / scale,
    };
  };
  const zoomComparison = (factor, anchor = { x: 700, y: 450 }) =>
    setCamera((previous) => {
      const zoom = Math.max(0.8, Math.min(3.4, previous.zoom * factor));
      const ratio = zoom / previous.zoom;
      return {
        zoom,
        x: anchor.x - (anchor.x - previous.x) * ratio,
        y: anchor.y - (anchor.y - previous.y) * ratio,
      };
    });
  useEffect(() => {
    const map = mapRef.current;
    const onWheel = (event) => {
      event.preventDefault();
      zoomComparison(
        event.deltaY < 0 ? 1.1 : 1 / 1.1,
        comparisonPoint(event.clientX, event.clientY),
      );
    };
    map?.addEventListener("wheel", onWheel, { passive: false });
    return () => map?.removeEventListener("wheel", onWheel);
  }, []);
  const startPan = (event) => {
    if (event.button !== 0) return;
    const point = comparisonPoint(event.clientX, event.clientY);
    panDrag.current = { point, camera };
    setPanning(true);
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const movePan = (event) => {
    if (!panDrag.current) return;
    const point = comparisonPoint(event.clientX, event.clientY);
    setCamera({
      ...panDrag.current.camera,
      x: panDrag.current.camera.x + point.x - panDrag.current.point.x,
      y: panDrag.current.camera.y + point.y - panDrag.current.point.y,
    });
  };
  const endPan = (event) => {
    panDrag.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const scenario = {
    ...scenarios.find((s) => s.id === selected),
    ...getForecastAt(forecastOffset, selected),
  };
  const scenarioRows = scenarios.map((item) => ({
    ...item,
    ...getForecastAt(forecastOffset, item.id),
  }));
  const baseline = getForecastAt(forecastOffset, "A");
  const congestionReduction =
    Math.round((baseline.congestion - scenario.congestion) * 10) / 10;
  const approved = [
    "active",
    "paused",
    "handover",
    "measuring",
    "measured",
  ].includes(lifecycle);
  const select = (id) => {
    setSelected(id);
    setDivider(50);
  };

  return (
    <div className={`twin-screen ${timeline ? "twin-has-timeline" : ""}`}>
      <div className="twin-intro">
        <p>Real Leuven geography · synthetic operating conditions</p>
        <span className="twin-model-note">
          <span className="twin-dot" /> SIMULATED <i />
          {forecastOffset === 0
            ? "Current synthetic baseline"
            : `+${forecastOffset}-minute projection`}
        </span>
      </div>
      {timeline && <div className="twin-timeline-slot">{timeline}</div>}
      <div className="twin-workspace">
        <section
          className="twin-map-stage"
          ref={mapRef}
          aria-label="Before and after city comparison"
          data-camera={`${camera.zoom.toFixed(3)}:${camera.x.toFixed(1)}:${camera.y.toFixed(1)}`}
        >
          <div className="twin-map-before">
            <CityMap
              mode="twin"
              camera={camera}
              onCameraChange={setCamera}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              forecastOffset={forecastOffset}
              scenario="A"
              layers={{
                traffic: true,
                air: true,
                heritage: true,
                sensors: false,
              }}
              compact
            />
          </div>
          <div
            className="twin-map-after"
            style={{ clipPath: `inset(0 0 0 ${divider}%)` }}
          >
            <CityMap
              mode="twin"
              camera={camera}
              onCameraChange={setCamera}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              forecastOffset={forecastOffset}
              scenario={selected}
              after={selected !== "A"}
              layers={{
                traffic: true,
                air: true,
                heritage: true,
                sensors: false,
              }}
              compact
            />
          </div>
          <div className="twin-map-top">
            <div>
              <span className="twin-overline">
                LEUVEN · HISTORIC CENTRE · H-03
              </span>
              <h2>See the decision before it happens.</h2>
            </div>
            <span className="twin-projection-label">
              <GitCompareArrows size={13} /> BEFORE / AFTER
            </span>
          </div>
          <div className="twin-map-label twin-before-label">
            <span /> BEFORE
            <span className="twin-label-detail">
              No action ·{" "}
              {forecastOffset === 0 ? "now" : `+${forecastOffset} min`}
            </span>
          </div>
          <div className="twin-map-label twin-after-label">
            <span /> AFTER
            <span className="twin-label-detail">
              Scenario {selected} ·{" "}
              {forecastOffset === 0 ? "now" : `+${forecastOffset} min`}
            </span>
          </div>
          <div className="twin-divider" style={{ left: `${divider}%` }}>
            <span className="twin-divider-handle">
              <GripVertical size={17} />
            </span>
          </div>
          <input
            id={uid}
            className="twin-comparison-input"
            hidden={panMode}
            type="range"
            min="0"
            max="100"
            step="1"
            value={divider}
            onChange={(event) => setDivider(Number(event.target.value))}
            onPointerDown={(event) => {
              event.preventDefault();
              dragging.current = true;
              event.currentTarget.focus();
              event.currentTarget.setPointerCapture?.(event.pointerId);
              updateDivider(event);
            }}
            onPointerMove={(event) => {
              if (dragging.current) updateDivider(event);
            }}
            onPointerUp={endComparisonDrag}
            onPointerCancel={endComparisonDrag}
            aria-label="Drag to compare before and after"
            aria-valuetext={`${divider}% simulated baseline, ${100 - divider}% simulated scenario ${selected}`}
          />
          {panMode && (
            <div
              className={`twin-pan-overlay ${panning ? "is-panning" : ""}`}
              role="application"
              tabIndex={0}
              aria-label="Pan both comparison maps"
              data-presentation-shortcuts="off"
              onPointerDown={startPan}
              onPointerMove={movePan}
              onPointerUp={endPan}
              onPointerCancel={endPan}
              onKeyDown={(event) => {
                const directions = {
                  ArrowLeft: [35, 0],
                  ArrowRight: [-35, 0],
                  ArrowUp: [0, 35],
                  ArrowDown: [0, -35],
                };
                const delta = directions[event.key];
                if (delta) {
                  event.preventDefault();
                  event.stopPropagation();
                  setCamera((previous) => ({
                    ...previous,
                    x: previous.x + delta[0],
                    y: previous.y + delta[1],
                  }));
                }
              }}
            />
          )}
          <div
            className="twin-camera-toolbar"
            role="group"
            aria-label="Synchronized comparison camera"
          >
            <button
              aria-label="Zoom in comparison maps"
              title="Zoom both maps in"
              onClick={() => zoomComparison(1.2)}
            >
              <Plus size={14} />
            </button>
            <button
              aria-label="Zoom out comparison maps"
              title="Zoom both maps out"
              onClick={() => zoomComparison(1 / 1.2)}
            >
              <Minus size={14} />
            </button>
            <button
              aria-label="Reset comparison view"
              title="Reset both maps"
              onClick={() => setCamera({ zoom: 1, x: 0, y: 0 })}
            >
              <LocateFixed size={14} />
            </button>
            <button
              className="twin-camera-mode"
              aria-label={`Show comparison in ${viewMode === "3d" ? "2D" : "3D"}`}
              title="Switch both map views"
              onClick={() =>
                setViewMode((mode) => (mode === "3d" ? "2d" : "3d"))
              }
            >
              {viewMode.toUpperCase()}
            </button>
            <button
              className={`twin-camera-pan ${panMode ? "active" : ""}`}
              aria-pressed={panMode}
              onClick={() => setPanMode((value) => !value)}
            >
              <Move size={13} />
              {panMode ? "Drag comparison" : "Pan both maps"}
            </button>
            <span>{Math.round(camera.zoom * 100)}%</span>
          </div>
          <div className="twin-map-bottom">
            <div className="twin-comparison-legend">
              <span>
                <i className="twin-legend-rose" /> High pressure
              </span>
              <span>
                <i className="twin-legend-amber" /> Improving
              </span>
              <span>
                <i className="twin-legend-cyan" /> Managed flow
              </span>
            </div>
            <span className="twin-drag-caption">Drag divider to explore</span>
          </div>
          <div className="twin-improvement">
            <ArrowDownRight size={19} />
            <span>
              <b>
                {congestionReduction}
                <small> pp</small>
              </b>
              <small>modelled congestion reduction</small>
            </span>
          </div>
          <div
            className="twin-map-source"
            aria-label="Geographic data attribution"
          >
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              © OpenStreetMap contributors
            </a>
            <span>·</span>
            <a
              href="https://opendatacommons.org/licenses/odbl/1-0/"
              target="_blank"
              rel="noreferrer"
            >
              ODbL
            </a>
            <b className="twin-operational-type">SIMULATED</b>
          </div>
        </section>

        <aside className="twin-rationale">
          <div className="twin-rationale-top">
            <span className="twin-overline">
              <Sparkles size={12} /> DECISION INTELLIGENCE
            </span>
            <span className="twin-modelled">MODELLED</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              className="twin-rationale-inner"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <div className="twin-rationale-title">
                <div>
                  <span className="twin-overline">WHY THIS SCENARIO?</span>
                  <h2>{scenario.name}</h2>
                </div>
                <div className="twin-big-score">
                  <b>{scenario.score}</b>
                  <span>/100</span>
                </div>
              </div>
              <p className="twin-rationale-description" role="status">
                {selected === "C"
                  ? "Lower congestion; medium impact on access and more coordination."
                  : selected === "B"
                    ? "Best balance: low disruption, with 5 pp more congestion than C."
                    : "No delivery burden; accepts worsening congestion and air quality."}
                <span>Trade-off at the +60-minute decision horizon</span>
              </p>
              <div
                className="twin-score-bars"
                aria-label="Criteria at the sixty-minute decision horizon"
              >
                {scoreLabels.map((label, index) => (
                  <div className="twin-score-item" key={label}>
                    <div>
                      <span>{label}</span>
                      <b>{scenario.scores[index]}</b>
                    </div>
                    <div className="twin-score-track">
                      <motion.i
                        initial={{ width: 0 }}
                        animate={{ width: `${scenario.scores[index]}%` }}
                        transition={{ duration: 0.5, delay: index * 0.04 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="twin-score-explain"
                onClick={() => setScoreOpen(true)}
                aria-haspopup="dialog"
              >
                <HelpCircle size={13} />
                How is this calculated?
                <ChevronRight size={12} />
              </button>
            </motion.div>
          </AnimatePresence>
          <div className="twin-approval-area">
            {selected === "B" ? (
              <button
                className="twin-approve-button"
                onClick={() => onApprove?.()}
                disabled={approved}
              >
                <span>
                  {approved ? (
                    <>
                      <Check size={16} /> Scenario approved
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={15} /> Review & approve
                    </>
                  )}
                </span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="twin-approve-button twin-choose-recommended"
                onClick={() => select("B")}
              >
                <span>View recommended scenario</span>
                <ArrowRight size={16} />
              </button>
            )}
            <p>
              <LockKeyhole size={11} /> Human approval required. No city systems
              connected.
            </p>
          </div>
        </aside>
      </div>

      <section
        className="twin-scenarios"
        aria-label="Compare intervention scenarios"
      >
        <div className="twin-scenario-heading">
          <div>
            <span className="twin-overline">INTERVENTION OPTIONS</span>
            <span className="twin-scenario-subtitle">
              A transparent comparison of synthetic interventions.
            </span>
          </div>
          <span className="twin-scenario-horizon">
            SAME CITY ·{" "}
            {forecastOffset === 0
              ? "CURRENT BASELINE"
              : `+${forecastOffset} MIN HORIZON`}
          </span>
        </div>
        <div className="twin-scenario-columns" aria-hidden="true">
          <span>SCENARIO</span>
          <span>CONGESTION</span>
          <span>PM2.5</span>
          <span>TRAVEL TIME</span>
          <span>ACCESSIBILITY IMPACT</span>
          <span>60-MIN DECISION SCORE</span>
        </div>
        {scenarioRows.map((s) => (
          <button
            key={s.id}
            className={
              "twin-scenario-row " + (selected === s.id ? "is-selected" : "")
            }
            onClick={() => {
              select(s.id);
              if (s.id === "B" && !approved) onApprove?.();
            }}
            aria-pressed={selected === s.id}
            aria-label={`Scenario ${s.id}, ${s.name}, score ${s.score} out of 100`}
          >
            <span className="twin-scenario-name">
              <span className="twin-scenario-letter">{s.id}</span>
              <span>
                <b>{s.name}</b>
                {s.id === "B" && (
                  <small>
                    <Sparkles size={10} /> RECOMMENDED
                  </small>
                )}
              </span>
            </span>
            <span className="twin-row-value">
              <span className="twin-mobile-label">Congestion</span>
              {s.congestion}
              <small>%</small>
            </span>
            <span className="twin-row-value">
              <span className="twin-mobile-label">PM2.5</span>
              {s.pm}
              <small>µg/m³</small>
            </span>
            <span className="twin-row-value">
              <span className="twin-mobile-label">Travel time</span>
              {s.travel}
              <small>min</small>
            </span>
            <span
              className={"twin-accessibility " + s.accessibility.toLowerCase()}
            >
              <i />
              {s.accessibility}
            </span>
            <span className="twin-row-score">
              <ScoreRing score={s.score} selected={selected === s.id} />
              <span>/ 100</span>
              <ChevronRight size={16} />
            </span>
          </button>
        ))}
      </section>
      {scoreOpen && (
        <ScoreExplanation
          scenario={scenario}
          onClose={() => setScoreOpen(false)}
        />
      )}
    </div>
  );
}
