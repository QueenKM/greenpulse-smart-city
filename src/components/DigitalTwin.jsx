import React, { useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  GitCompareArrows,
  GripVertical,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import CityMap from "./CityMap";
import "./DigitalTwin.css";

const scenarios = [
  {
    id: "A",
    name: "Do Nothing",
    congestion: 87,
    pm: 34,
    travel: 33,
    accessibility: "NONE",
    score: 41,
    scores: [34, 29, 94, 100, 100],
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
    score: 88,
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
    score: 81,
    scores: [94, 93, 67, 88, 49],
    explanation:
      "Greater traffic reduction, with additional accessibility trade-offs and more operational coordination.",
  },
];
const scoreLabels = [
  "Environmental impact",
  "Mobility impact",
  "Accessibility",
  "Historic compatibility",
  "Implementation effort",
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

export default function DigitalTwin({ onApprove, lifecycle = "idle" }) {
  const [selected, setSelected] = useState("B");
  const [divider, setDivider] = useState(50);
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
  const scenario = scenarios.find((s) => s.id === selected);
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
    <div className="twin-screen">
      <div className="twin-intro">
        <p>Real Leuven geography · synthetic operating conditions</p>
        <span className="twin-model-note">
          <span className="twin-dot" /> SIMULATED <i />
          60-minute projection
        </span>
      </div>
      <div className="twin-workspace">
        <section
          className="twin-map-stage"
          ref={mapRef}
          aria-label="Before and after city comparison"
        >
          <div className="twin-map-before">
            <CityMap
              mode="twin"
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
              Simulated baseline · no action
            </span>
          </div>
          <div className="twin-map-label twin-after-label">
            <span /> AFTER
            <span className="twin-label-detail">
              Simulated Scenario {selected}
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
                {selected === "A" ? "0" : selected === "B" ? "21" : "26"}
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
              <p className="twin-rationale-description">
                {scenario.explanation}
              </p>
              <div className="twin-score-bars">
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
              <div className="twin-constraint">
                <ShieldCheck size={16} />
                <span>
                  {selected === "C"
                    ? "Accessibility trade-off requires review"
                    : "Heritage-compatible scenario design"}
                  <small>
                    Synthetic decision criteria · no municipal validation
                  </small>
                </span>
              </div>
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
            SAME CITY · SAME FORECAST HORIZON
          </span>
        </div>
        <div className="twin-scenario-columns" aria-hidden="true">
          <span>SCENARIO</span>
          <span>CONGESTION</span>
          <span>PM2.5</span>
          <span>TRAVEL TIME</span>
          <span>ACCESSIBILITY IMPACT</span>
          <span>DECISION SCORE</span>
        </div>
        {scenarios.map((s) => (
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
    </div>
  );
}
