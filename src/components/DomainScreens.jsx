import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  ReferenceArea,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Droplets,
  FileCheck2,
  GitBranch,
  Layers3,
  Leaf,
  MapPin,
  Radio,
  ShieldCheck,
  Snowflake,
  Sun,
  Thermometer,
  Timer,
  TrafficCone,
  TrendingDown,
  TriangleAlert,
  Users,
  Waypoints,
  Wind,
  Zap,
} from "lucide-react";
import CityMap from "./CityMap";
import { FORECAST_MINUTES, getForecast } from "../scenario.mjs";
import {
  formatCityTime,
  formatCityDate,
  formatCityTimeZone,
} from "../time.mjs";
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

export function TrafficScreen({
  forecastOffset = 0,
  forecastAnchor,
  timeline,
} = {}) {
  const [localAnchor] = useState(() => Date.now());
  const anchor = new Date(forecastAnchor ?? localAnchor);
  const selectedMinute = FORECAST_MINUTES.includes(forecastOffset)
    ? forecastOffset
    : 0;
  const selectedForecast = getForecast(selectedMinute, "A");
  const isFuture = selectedMinute > 0;
  const selectedTimestamp = anchor.getTime() + selectedMinute * 60_000;
  const selectedTone = isFuture ? "#a78bfa" : "#38bdf8";
  const data = [
    { offset: -60, live: 38, model: 40 },
    { offset: -40, live: 47, model: 48 },
    { offset: -20, live: 58, model: 60 },
    { offset: 0, live: 72, model: getForecast(0, "A").congestion },
    ...FORECAST_MINUTES.filter((minutes) => minutes > 0).map((minutes) => ({
      offset: minutes,
      model: getForecast(minutes, "A").congestion,
    })),
  ].map(({ offset, ...values }) => ({
    ...values,
    timestamp: anchor.getTime() + offset * 60_000,
  }));
  const thresholdMinute = Array.from(
    { length: 61 },
    (_, minute) => minute,
  ).find((minute) => getForecast(minute, "A").congestion >= 80);
  const thresholdTime =
    thresholdMinute === undefined
      ? null
      : new Date(anchor.getTime() + thresholdMinute * 60_000);
  return (
    <motion.div {...stagger} className="ds-screen traffic-screen">
      <DomainTitle
        eyebrow="DECISION INTELLIGENCE / MOBILITY"
        title="Traffic & Emissions"
        description="The historic centre is approaching an operational threshold."
      >
        <Tag tone="red">H-03 · ELEVATED RISK</Tag>
      </DomainTitle>
      <div className="traffic-composition">
        <div className="ds-chart-surface">
          <div className="ds-section-heading">
            <div>
              <span className="eyebrow">HISTORIC CENTRE · H-03</span>
              <h2>Observed vs Forecast Congestion</h2>
            </div>
            <div className="ds-chart-key">
              <span className="cyan">
                <i />
                LIVE
              </span>
              <span className="purple">
                <i />
                MODELLED
              </span>
            </div>
          </div>
          <div className="traffic-timeline-slot">{timeline}</div>
          <div className="traffic-selection-state">
            <span className={isFuture ? "purple" : "cyan"}>
              {isFuture ? `MODELLED · +${selectedMinute} MIN` : "LIVE · NOW"}
            </span>
            <output
              aria-live="polite"
              aria-label="Selected congestion forecast"
            >
              {selectedForecast.congestion}% congestion
            </output>
            <time dateTime={new Date(selectedTimestamp).toISOString()}>
              {formatCityTime(new Date(selectedTimestamp), { seconds: false })}
            </time>
          </div>
          <div className="traffic-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 25, right: 24, left: -15, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="modelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#24404a"
                  strokeDasharray="3 6"
                />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  ticks={data.map((point) => point.timestamp)}
                  tickFormatter={(value) =>
                    formatCityTime(new Date(value), { seconds: false })
                  }
                  tick={{ fill: "#91aab9", fontSize: 12 }}
                  minTickGap={18}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "#78919e", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceArea
                  x1={anchor.getTime()}
                  x2={data[data.length - 1].timestamp}
                  fill="#a78bfa"
                  fillOpacity={0.035}
                />
                <ReferenceLine
                  y={80}
                  stroke="#FBBF24"
                  strokeDasharray="4 5"
                  label={{
                    value: "CRITICAL THRESHOLD",
                    fill: "#d8ae50",
                    fontSize: 10,
                    position: "insideTopLeft",
                  }}
                />
                <ReferenceLine
                  x={anchor.getTime()}
                  stroke="#4d6976"
                  strokeDasharray="3 5"
                />
                {isFuture && (
                  <ReferenceLine
                    x={selectedTimestamp}
                    stroke={selectedTone}
                    strokeDasharray="3 5"
                  />
                )}
                <ReferenceDot
                  x={selectedTimestamp}
                  y={selectedForecast.congestion}
                  r={6}
                  fill={selectedTone}
                  stroke="#09171e"
                  strokeWidth={3}
                  isFront
                />
                <Tooltip
                  contentStyle={tipStyle}
                  labelFormatter={(value) => {
                    const date = new Date(Number(value));
                    return `${formatCityDate(date)} · ${formatCityTime(date, { seconds: false })} ${formatCityTimeZone(date)}`;
                  }}
                  formatter={(v, k) => [
                    `${v}%`,
                    k === "live" ? "Live observation" : "Modelled forecast",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="model"
                  stroke="#A78BFA"
                  strokeWidth={3}
                  strokeDasharray="6 5"
                  fill="url(#modelFill)"
                  activeDot={{
                    r: 5,
                    stroke: "#a78bfa",
                    strokeWidth: 5,
                    strokeOpacity: 0.2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="live"
                  stroke="#38BDF8"
                  strokeWidth={3}
                  fill="transparent"
                  dot={{ r: 4, fill: "#071419", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="ds-chart-caption">
            <span>
              <Clock3 size={13} /> Synthetic observations ·{" "}
              {formatCityTime(anchor, { seconds: false })}
            </span>
            <span>
              Forecast horizon <strong>+60 min</strong>
            </span>
            <span>Synthetic observations + demonstration forecast</span>
          </div>
        </div>
        <aside
          className={`traffic-forecast ${isFuture ? "is-modelled" : "is-observed"}`}
        >
          <Tag tone={isFuture ? "purple" : "cyan"}>
            {isFuture ? `MODELLED · +${selectedMinute} MIN` : "LIVE · NOW"}
          </Tag>
          <div className="forecast-big">
            {selectedForecast.congestion}
            <span>%</span>
          </div>
          <h3>
            {!isFuture ? (
              <>
                The city’s current
                <br />
                operational pressure.
              </>
            ) : selectedForecast.congestion >= 80 ? (
              <>
                Forecast exceeds the
                <br />
                operating threshold.
              </>
            ) : (
              <>
                Pressure at the
                <br />
                selected horizon.
              </>
            )}
          </h3>
          <p>
            The map and this forecast share the same selected time. All
            operating conditions are synthetic demonstration data.
          </p>
          <div className="traffic-selected-support">
            <span>
              PM2.5{" "}
              <strong>
                {selectedForecast.pm}
                <small> µg/m³</small>
              </strong>
            </span>
            <span>
              Average speed{" "}
              <strong>
                {selectedForecast.speed}
                <small> km/h</small>
              </strong>
            </span>
          </div>
          <div className="ds-inline-warning">
            <TriangleAlert size={16} />
            <span>
              {thresholdTime
                ? `80% threshold forecast at ${formatCityTime(thresholdTime, { seconds: false })}`
                : "80% operating threshold"}
            </span>
          </div>
          <div className="ds-confidence">
            <span>Illustrative model confidence</span>
            <strong>87%</strong>
            <div>
              <i />
            </div>
          </div>
        </aside>
      </div>
      <div className="traffic-stat-ribbon">
        {[
          {
            icon: Activity,
            label: "AVERAGE SPEED",
            value: "19",
            unit: "km/h",
            note: "↓ 8 km/h from baseline",
          },
          {
            icon: Wind,
            label: "PM2.5",
            value: "27",
            unit: "µg/m³",
            note: "Air-quality station AQ-04",
          },
          {
            icon: Leaf,
            label: "NO₂",
            value: "47",
            unit: "µg/m³",
            note: "Approaching advisory level",
          },
          {
            icon: MapPin,
            label: "PARKING OCCUPANCY",
            value: "93",
            unit: "%",
            note: "P3 · Centre West",
          },
        ].map((x) => (
          <div className="traffic-stat" key={x.label}>
            <x.icon size={18} />
            <div>
              <span className="eyebrow">{x.label}</span>
              <div>
                <strong>{x.value}</strong>
                <span>{x.unit}</span>
              </div>
              <small>{x.note}</small>
            </div>
            <Tag>LIVE</Tag>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

const sources = [
  {
    name: "Traffic T12–T18",
    detail: "7 roadside traffic sensors",
    state: "Healthy",
    fresh: "18 sec",
    quality: 98,
    tone: "green",
    note: "T12–T17 streaming · T18 in maintenance",
  },
  {
    name: "AQ-04",
    detail: "Historic centre air quality",
    state: "Healthy",
    fresh: "52 sec",
    quality: 98,
    tone: "green",
    note: "PM2.5, NO₂ and ambient conditions",
  },
  {
    name: "Parking P1–P4",
    detail: "4 occupancy feeds",
    state: "Healthy",
    fresh: "27 sec",
    quality: 97,
    tone: "green",
    note: "Off-street parking capacity",
  },
  {
    name: "Public Transport AVL",
    detail: "2 vehicle & service feeds",
    state: "Healthy",
    fresh: "14 sec",
    quality: 96,
    tone: "green",
    note: "Two feeds: vehicle positions and service headways",
  },
  {
    name: "Weather W-01",
    detail: "Local weather station",
    state: "Healthy",
    fresh: "2 min",
    quality: 99,
    tone: "green",
    note: "Temperature, wind and humidity",
  },
  {
    name: "AQ-07",
    detail: "Air-quality backup station",
    state: "Offline",
    fresh: "Maintenance",
    quality: null,
    tone: "red",
    note: "Planned maintenance · excluded from model",
  },
  {
    name: "Visitor Flow",
    detail: "Aggregated pedestrian counts",
    state: "Delayed",
    fresh: "11 minutes",
    quality: 72,
    tone: "amber",
    note: "Degraded source · confidence reduced",
  },
  {
    name: "Historic GIS",
    detail: "OpenStreetMap · Leuven geometry",
    state: "Reference",
    fresh: "Reference dataset",
    quality: null,
    tone: "purple",
    note: "Bundled OSM snapshot · excluded from synthetic feed count",
  },
];
export function DataHealth() {
  const [selected, setSelected] = useState(0);
  const source = sources[selected];
  return (
    <motion.div {...stagger} className="ds-screen data-screen">
      <DomainTitle
        eyebrow="OPERATIONS / TRUST & OBSERVABILITY"
        title="Data Health"
        description="Every decision begins with knowing what the city can see."
      >
        <Tag tone="green">DATA PIPELINE MONITORED</Tag>
      </DomainTitle>
      <div className="data-layout">
        <div className="data-main">
          <div className="ds-health-summary">
            <div className="health-orbit">
              <svg viewBox="0 0 110 110">
                <circle cx="55" cy="55" r="46" />
                <circle
                  cx="55"
                  cy="55"
                  r="46"
                  className="health-orbit-progress"
                />
              </svg>
              <div>
                <strong>
                  96<span>%</span>
                </strong>
                <small>DATA QUALITY</small>
              </div>
            </div>
            <div>
              <h2>
                Decision-grade data.
                <br />
                <span>Visible limitations.</span>
              </h2>
              <p>
                <strong>6</strong> critical source groups <i />{" "}
                <strong>1</strong> degraded source
              </p>
            </div>
            <div className="feed-ratio">
              <strong>
                14<span>/ 17</span>
              </strong>
              <small>OPERATIONAL FEEDS</small>
            </div>
          </div>
          <div className="ds-source-heading">
            <span>SOURCE / GROUP</span>
            <span>STATUS</span>
            <span>FRESHNESS</span>
            <span>QUALITY</span>
          </div>
          <div className="source-list">
            {sources.map((s, i) => (
              <button
                onClick={() => setSelected(i)}
                aria-pressed={selected === i}
                className={`source-row ${selected === i ? "selected" : ""}`}
                key={s.name}
              >
                <span className="source-name">
                  <Database size={16} />
                  <span>
                    <strong>{s.name}</strong>
                    <small>{s.detail}</small>
                  </span>
                </span>
                <span>
                  <Tag tone={s.tone}>{s.state}</Tag>
                </span>
                <span className="source-fresh">{s.fresh}</span>
                <span className="source-quality">
                  {s.quality !== null ? (
                    <>
                      <strong>{s.quality}%</strong>
                      <i>
                        <b
                          style={{
                            width: s.quality + "%",
                            background:
                              s.tone === "amber" ? "#FBBF24" : "#34D399",
                          }}
                        />
                      </i>
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
        <aside className="health-explainer">
          <span className="eyebrow">UNDERSTANDING COVERAGE</span>
          <h2>Why 14 of 17?</h2>
          <p>
            17 expected feeds: 7 traffic, 2 air-quality, 4 parking, 2 transit, 1
            weather and 1 visitor-flow connection.
          </p>
          <div className="feed-count">
            <span>Expected operational feeds</span>
            <strong>17</strong>
          </div>
          <div className="feed-count">
            <span>
              <i className="green" />
              Streaming and current
            </span>
            <strong className="green">14</strong>
          </div>
          <div className="feed-count">
            <span>
              <i className="red" />
              AQ-07 · offline
            </span>
            <strong>1</strong>
          </div>
          <div className="feed-count">
            <span>
              <i className="amber" />
              Visitor Flow · delayed
            </span>
            <strong>1</strong>
          </div>
          <div className="feed-count">
            <span>
              <i className="amber" />
              Traffic T18 · maintenance
            </span>
            <strong>1</strong>
          </div>
          <div className="health-note">
            <CircleHelp size={16} />
            <p>
              Historic GIS uses a real Leuven OpenStreetMap reference snapshot.
              It supports the urban model but is not counted as an operational
              feed.
            </p>
          </div>
          <div className="source-detail" aria-live="polite">
            <span className="eyebrow">SELECTED SOURCE</span>
            <h3>{source.name}</h3>
            <p>{source.note}</p>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

export function HeatScreen({ maturity = "TARGET" } = {}) {
  const [simulated, setSimulated] = useState(false);
  const [point, setPoint] = useState(null);
  return (
    <motion.div {...stagger} className="ds-screen heat-screen">
      <DomainTitle
        eyebrow="DECISION INTELLIGENCE / CLIMATE RESILIENCE"
        title="Urban Heat"
        description="Make the invisible risk visible. Protect people where exposure is highest."
      >
        <Tag tone="amber">HEAT ADVISORY · LEVEL 2</Tag>
      </DomainTitle>
      <div className="heat-composition">
        <div className="heat-map">
          <CityMap
            mode="heat"
            maturity={maturity}
            layers={{
              heat: true,
              heritage: false,
              sensors: true,
              traffic: false,
              air: false,
            }}
            onSelect={(item) =>
              setPoint(item?.type === "cooling" ? item : null)
            }
          />
          <div className={`heat-map-heading ${maturity !== "TARGET" ? "is-maturity-limited" : ""}`}>
            <Tag tone={maturity === "TARGET" ? "purple" : "cyan"}>
              {maturity === "TARGET" ? "MODELLED HEAT EXPOSURE" : `${maturity} geographic view`}
            </Tag>
            <h2>{maturity === "TARGET" ? "Heat has a geography." : "Urban Heat belongs to the target state"}</h2>
          </div>
          {maturity === "TARGET" && point && (
            <div className="cooling-selection">
              <Snowflake size={18} />
              <div>
                <strong>{point.title}</strong>
                <small>{point.value} · simulated deployment</small>
              </div>
              <button
                aria-label="Close cooling point"
                onClick={() => setPoint(null)}
              >
                ×
              </button>
            </div>
          )}
          <div className="heat-map-key">
            {maturity === "TARGET" ? (
              <>
                <span>
                  <i style={{ background: "#38bdf8" }} />
                  Cooling point
                </span>
                <span>
                  <i style={{ background: "#fbbf24" }} />
                  Elevated risk
                </span>
                <span>
                  <i style={{ background: "#fb7185" }} />
                  High exposure
                </span>
              </>
            ) : (
              <span className="heat-maturity-note">
                Heat-risk and cooling layers are part of the target-state proposal.
              </span>
            )}
          </div>
        </div>
        <aside className="heat-response">
          <div className="heat-readings">
            <div>
              <Tag>LIVE</Tag>
              <div className="heat-value">
                33.7<span>°C</span>
              </div>
              <small>Ambient temperature</small>
            </div>
            <div>
              <Tag>LIVE</Tag>
              <div className="heat-value">
                62<span>%</span>
              </div>
              <small>Cooling coverage</small>
            </div>
            <div>
              <Tag tone="purple">MODELLED</Tag>
              <div className="heat-value purple">
                40.3<span>°C</span>
              </div>
              <small>Peak apparent temperature</small>
            </div>
            <div>
              <Tag tone="purple">MODELLED</Tag>
              <div className="heat-value purple">18,400</div>
              <small>Population exposed</small>
            </div>
          </div>
          <div className="heat-response-bundle">
            <span className="eyebrow">RECOMMENDED RESPONSE BUNDLE</span>
            {[
              { icon: Snowflake, text: "Activate cooling points" },
              { icon: Radio, text: "Targeted citizen notifications" },
              { icon: ShieldCheck, text: "Protect vulnerable zones" },
              { icon: Sun, text: "Adjust outdoor operations" },
            ].map((x) => (
              <div key={x.text}>
                <x.icon size={16} />
                <span>{x.text}</span>
              </div>
            ))}
          </div>
          <div className="heat-simulation">
            <div>
              <Tag tone="amber">SIMULATED</Tag>
              <span>Cooling coverage</span>
            </div>
            <div className="coverage-transition">
              <strong>
                62<span>%</span>
              </strong>
              <ArrowRight size={21} />
              <motion.strong
                key={simulated ? "on" : "off"}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                className={simulated ? "amber" : ""}
              >
                {simulated ? "81" : "—"}
                <span>{simulated ? "%" : ""}</span>
              </motion.strong>
            </div>
            <button
              className="ds-button"
              onClick={() => setSimulated(!simulated)}
            >
              {simulated ? "Reset simulation" : "Simulate response bundle"}
              <ArrowRight size={15} />
            </button>
            <small>
              Simulation only. Activation requires operator approval.
            </small>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

const phases = [
  {
    id: "01",
    time: "TODAY",
    name: "Current inventory",
    tone: "muted",
    intro: "A fragmented starting point",
    items: [
      "Fragmented municipal systems",
      "Partial data availability",
      "Manual coordination",
      "Uneven data ownership",
    ],
  },
  {
    id: "02",
    time: "0–6 MONTHS",
    name: "MVP",
    tone: "cyan",
    intro: "One connected operational workflow",
    items: [
      "Traffic use case",
      "Priority operational feeds",
      "Data-quality monitoring",
      "Simple forecasting",
      "Human approval & decision log",
      "Baseline KPIs",
    ],
  },
  {
    id: "03",
    time: "6–18 MONTHS",
    name: "Capability development",
    tone: "purple",
    intro: "Trust, coverage and coordination",
    items: [
      "Historical data integration",
      "More reliable forecasting",
      "Urban Heat use case",
      "Cross-department workflows",
      "Improved governance",
    ],
  },
  {
    id: "04",
    time: "18–36 MONTHS",
    name: "GreenPulse target state",
    tone: "purple",
    intro: "An integrated urban operating model",
    items: [
      "Urban Data Hub",
      "Mobility Digital Twin",
      "Urban Heat Digital Twin",
      "AI-supported scenario intelligence",
      "Cross-department orchestration",
      "Closed-loop learning",
    ],
  },
];
const phaseGovernance = [
  {
    owner: "Municipal programme lead (proposed)",
    stewards:
      "Proposed Mobility, Environment and IT custodians; confirm named source owners during inventory.",
    authority:
      "A municipal sponsor authorises discovery. No municipal operating capability is verified by this prototype.",
    gate: "Signed inventory and data statement: source coverage, quality, lawful access, ownership and integration gaps recorded.",
    dependency:
      "Municipal stakeholder validation and access to source-system documentation.",
  },
  {
    owner: "Mobility Operations (proposed)",
    stewards:
      "IT owns integration and quality monitoring; Environment stewards air-quality data.",
    authority:
      "A named control-room operator approves, modifies, pauses or reverses each action. Mobility owns escalation.",
    gate: "Baseline agreed; feed-quality thresholds and source owners approved; human approval, rollback and audit trail tested.",
    dependency:
      "Authorised priority feeds, traffic-control interfaces, support cover and an approved Mobility–IT–Environment RACI.",
  },
  {
    owner: "Cross-department steering group (proposed)",
    stewards:
      "Mobility / Environment RACI; IT manages source access, retention and integration duties.",
    authority:
      "Mobility approves traffic changes; a nominated heat lead approves heat response under an agreed protocol.",
    gate: "Joint operational drill and forecast backtest pass before expansion; heat protocol, data access and retention approved.",
    dependency:
      "Historical datasets, named heat-response partners and an agreed service and escalation protocol.",
  },
  {
    owner: "Urban Data Hub service owner (proposed)",
    stewards:
      "Named source stewards and a model-governance board; periodic validation and model-version review.",
    authority:
      "Named operators retain operational approval. The model-governance board authorises model changes, never operational execution.",
    gate: "Evidenced benefit against approved baselines, accessibility and historic constraints; periodic validation, continuity and rollback tested.",
    dependency:
      "Funded service ownership, interoperable sources, monitored models and recurring governance review.",
  },
];
export function Roadmap() {
  const [selected, setSelected] = useState(3);
  const [governanceOpen, setGovernanceOpen] = useState(true);
  const governance = phaseGovernance[selected];
  return (
    <motion.div {...stagger} className="ds-screen roadmap-screen">
      <DomainTitle
        eyebrow="GOVERNANCE / IMPLEMENTATION ROADMAP"
        title="A destination. A credible path."
        description="Progressive capability development, grounded in today’s municipal reality."
      >
        <Tag tone="purple">TARGET-STATE OPERATING MODEL</Tag>
      </DomainTitle>
      <div className="roadmap-statement">
        <span className="eyebrow">THE GREENPULSE PROPOSAL</span>
        <h2>
          Build capability.
          <br />
          <span>Then connect the city.</span>
        </h2>
        <p>
          GreenPulse describes what the city can progressively build towards.
          This prototype demonstrates the destination; it does not claim that
          these capabilities exist today.
        </p>
      </div>
      <div className="maturity-timeline">
        <div className="maturity-track" />
        {phases.map((p, i) => (
          <button
            className={`maturity-phase ${selected === i ? "is-selected" : ""} ${p.tone}`}
            key={p.id}
            onClick={() => {
              setSelected(i);
              setGovernanceOpen(true);
            }}
            aria-expanded={selected === i && governanceOpen}
            aria-controls="roadmap-governance-details"
          >
            <div className="maturity-node">
              <span>{p.id}</span>
              {i < 3 && <ArrowRight size={15} />}
            </div>
            <span className="eyebrow">{p.time}</span>
            <h3>{p.name}</h3>
            <p>{p.intro}</p>
            <ul>
              {p.items.map((x) => (
                <li key={x}>
                  <Check size={12} />
                  {x}
                </li>
              ))}
            </ul>
            <span className="maturity-detail-hint">
              Governance & stage gate <ChevronRight size={12} />
            </span>
          </button>
        ))}
      </div>
      <section
        className="roadmap-governance"
        aria-labelledby="roadmap-governance-title"
      >
        <button
          className="roadmap-governance-toggle"
          onClick={() => setGovernanceOpen((open) => !open)}
          aria-expanded={governanceOpen}
          aria-controls="roadmap-governance-details"
        >
          <ShieldCheck size={19} />
          <span>
            <span className="eyebrow">
              Proposed governance · validate against municipal inventory
            </span>
            <strong id="roadmap-governance-title">
              {phases[selected].name} · decision ownership & stage gate
            </strong>
          </span>
          <ChevronRight
            className={governanceOpen ? "is-expanded" : ""}
            size={17}
          />
        </button>
        {governanceOpen && (
          <motion.div
            id="roadmap-governance-details"
            className="roadmap-governance-details"
            key={selected}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <dl className="roadmap-governance-roles">
              <div>
                <dt>Accountable owner</dt>
                <dd>{governance.owner}</dd>
              </div>
              <div>
                <dt>Data stewards & delivery</dt>
                <dd>{governance.stewards}</dd>
              </div>
              <div>
                <dt>Decision authority</dt>
                <dd>{governance.authority}</dd>
              </div>
            </dl>
            <div className="roadmap-governance-gate">
              <div>
                <span className="eyebrow">Proposed acceptance gate</span>
                <p>{governance.gate}</p>
              </div>
              <div>
                <span className="eyebrow">Critical dependency</span>
                <p>{governance.dependency}</p>
              </div>
            </div>
            <p className="roadmap-governance-scope">
              Roles and gates are proposals, not a verified Leuven
              organisational structure. City geography provides context only.
            </p>
          </motion.div>
        )}
      </section>
      <div className="roadmap-bottom">
        <div>
          <GitBranch size={18} />
          <span>Stage-gated implementation</span>
        </div>
        <p>
          Progress depends on data ownership, integration readiness, governance,
          and demonstrated operational value.
        </p>
        <Tag
          tone={
            phases[selected].tone === "muted" ? "purple" : phases[selected].tone
          }
        >
          {phases[selected].name.toUpperCase()}
        </Tag>
      </div>
    </motion.div>
  );
}

export function DecisionLog({ lifecycle = "idle", logs = [] }) {
  const fallback = [
    "active",
    "paused",
    "handover",
    "measuring",
    "measured",
  ].includes(lifecycle)
    ? [
        {
          time: "—",
          action: "Intervention approved",
          detail: "Adaptive signal timing + targeted route guidance",
          operator: "Control Room Operator #02",
        },
      ]
    : [];
  const entries = logs.length ? logs : fallback;
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
                {entry.time || "—"}
                <span>{entry.date || "DEMONSTRATION"}</span>
              </div>
              <div className="decision-entry-dot">
                <Check size={13} />
              </div>
              <div>
                <Tag tone="green">{entry.status || "RECORDED"}</Tag>
                <h3>
                  {entry.action ||
                    entry.event ||
                    entry.title ||
                    "Operational decision recorded"}
                </h3>
                <p>
                  {entry.detail ||
                    entry.description ||
                    "INC-2026-1109-H03 · Mobility Operations"}
                </p>
                <div className="decision-entry-meta">
                  <span>
                    OPERATOR{" "}
                    <strong>
                      {entry.operator || "Control Room Operator #02"}
                    </strong>
                  </span>
                  <span>
                    OWNER <strong>Mobility Operations</strong>
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

const impactData = [
  { name: "Congestion", predicted: 12, actual: 10.8 },
  { name: "PM2.5", predicted: 8, actual: 7.1 },
  { name: "Travel time", predicted: 14, actual: 12.6 },
];
export function ImpactScreen({
  lifecycle = "idle",
  onNavigate,
  onMethodology,
}) {
  const [metric, setMetric] = useState(0);
  const methodologyButton = (
    <div className="impact-methodology-strip">
      <span>Transparent methods · synthetic demonstration</span>
      <button className="impact-methodology-button" onClick={onMethodology}>
        <CircleHelp size={14} />
        KPI calculation & assumptions
        <ChevronRight size={13} />
      </button>
    </div>
  );
  if (lifecycle !== "measured")
    return (
      <motion.div {...stagger} className="ds-screen impact-screen">
        <DomainTitle
          eyebrow="GOVERNANCE / CLOSED-LOOP LEARNING"
          title="KPI & Impact"
          description="An intervention is only as good as its measured outcome."
        />
        {methodologyButton}
        <div className="impact-pending">
          <div
            className={`impact-pending-orbit ${lifecycle === "measuring" ? "measuring" : ""}`}
          >
            <Activity size={35} />
          </div>
          <Tag tone={lifecycle === "measuring" ? "amber" : "purple"}>
            {lifecycle === "measuring"
              ? "MEASURING OUTCOME"
              : "OUTCOME NOT YET MEASURED"}
          </Tag>
          <h2>
            {lifecycle === "measuring"
              ? "Observing the city’s response."
              : "Evidence before celebration."}
          </h2>
          <p>
            {lifecycle === "measuring"
              ? "The intervention has closed. Synthetic observations are being compared with the baseline before an outcome is reported."
              : "Measured results become available after a human-approved intervention is closed and the measurement cycle is complete."}
          </p>
          {lifecycle === "measuring" && (
            <div className="measurement-demo-note">
              <Timer size={13} />
              Accelerated demonstration · 60-minute window compressed to 5
              seconds
            </div>
          )}
          <div className="impact-lifecycle">
            {["Approve", "Activate", "Monitor", "Close", "Measure"].map(
              (s, i) => (
                <React.Fragment key={s}>
                  <span
                    className={
                      lifecycle === "measuring" && i < 4 ? "complete" : ""
                    }
                  >
                    {lifecycle === "measuring" && i < 4 ? (
                      <Check size={12} />
                    ) : (
                      i + 1
                    )}{" "}
                    {s}
                  </span>
                  {i < 4 && <ChevronRight size={12} />}
                </React.Fragment>
              ),
            )}
          </div>
          {onNavigate && lifecycle !== "measuring" && (
            <button
              className="ds-button"
              onClick={() => onNavigate("Digital Twin")}
            >
              Explore scenario intelligence
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </motion.div>
    );
  return (
    <motion.div {...stagger} className="ds-screen impact-screen">
      <DomainTitle
        eyebrow="GOVERNANCE / CLOSED-LOOP LEARNING"
        title="Did the intervention work?"
        description="H-03 · Adaptive signal timing + targeted route guidance · 60-minute observation window"
      />
      {methodologyButton}
      <div className="impact-composition">
        <div className="impact-chart-area">
          <div className="ds-section-heading">
            <div>
              <span className="eyebrow">PREDICTED vs ACTUAL</span>
              <h2>Improvement, verified.</h2>
            </div>
            <div className="impact-chart-evidence">
              <Tag tone="green">MEASURED · SYNTHETIC OUTCOME</Tag>
              <div className="ds-chart-key">
                <span className="purple">
                  <i />
                  PREDICTED
                </span>
                <span className="green">
                  <i />
                  ACTUAL
                </span>
              </div>
            </div>
          </div>
          <div className="impact-bar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={impactData}
                barGap={8}
                barCategoryGap="24%"
                margin={{ top: 32, left: 0, right: 25, bottom: 12 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#24404a"
                  strokeDasharray="3 6"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#a8bdc8", fontSize: 13 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  domain={[0, 16]}
                  tickFormatter={(v) => `−${v}%`}
                  tick={{ fill: "#78919e", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tipStyle}
                  cursor={{ fill: "#38bdf805" }}
                  formatter={(v, k) => [
                    `−${v}%`,
                    k === "predicted"
                      ? "Predicted improvement"
                      : "Actual improvement",
                  ]}
                />
                <Bar
                  dataKey="predicted"
                  fill="#A78BFA"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={46}
                  onClick={(d, i) => setMetric(i)}
                >
                  {impactData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fillOpacity={index === metric ? 0.8 : 0.2}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="actual"
                  fill="#34D399"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={46}
                  onClick={(d, i) => setMetric(i)}
                >
                  {impactData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fillOpacity={index === metric ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="impact-focus" role="status" aria-live="polite">
            <strong>{impactData[metric].name}</strong>
            <span>
              Actual reduction was{" "}
              <b>
                {(
                  impactData[metric].predicted - impactData[metric].actual
                ).toFixed(1)}{" "}
                percentage points
              </b>{" "}
              below the forecast.
            </span>
            <small>Select a metric to focus the comparison</small>
          </div>
        </div>
        <aside className="impact-error">
          <span className="eyebrow">AVERAGE PREDICTION ERROR</span>
          <div>
            1.2<span>pp</span>
          </div>
          <h3>
            Close to the forecast.
            <br />
            Better for the next cycle.
          </h3>
          <p>Model performance feeds the next recommendation cycle.</p>
          <div className="learning-loop">
            <GitBranch size={21} />
            <span>Measure → Learn → Recommend</span>
          </div>
        </aside>
      </div>
      <div className="impact-metric-ribbon">
        {impactData.map((x, i) => (
          <button
            className={metric === i ? "selected" : ""}
            aria-pressed={metric === i}
            onClick={() => setMetric(i)}
            key={x.name}
          >
            <div>
              <TrendingDown size={18} />
              <strong>{x.name}</strong>
            </div>
            <span>
              <small>PREDICTED</small>
              <b className="purple">−{x.predicted}%</b>
            </span>
            <span>
              <small>ACTUAL</small>
              <b className="green">−{x.actual}%</b>
            </span>
            <span className="impact-metric-delta">
              {(x.predicted - x.actual).toFixed(1)} pp
              <br />
              <small>prediction error</small>
            </span>
          </button>
        ))}
      </div>
      <p className="impact-footnote">
        <CheckCircle2 size={13} /> Results are illustrative synthetic
        measurements, not actual municipal outcomes.
      </p>
    </motion.div>
  );
}

export function AlertCenter({ onOpen }) {
  const [anchor] = useState(() => new Date());
  const alerts = [
    {
      id: "INC-2026-1109-H03",
      tone: "red",
      level: "CRITICAL",
      title: "Traffic & Air Quality Deterioration",
      place: "Historic Centre H-03",
      detail:
        "Observed congestion 72%. Modelled congestion reaches 82% in 38 minutes.",
      time: formatCityTime(anchor, { seconds: false }),
      action: "Review incident",
      icon: TrafficCone,
      page: "Overview",
    },
    {
      id: "ADV-2026-1109-U02",
      tone: "amber",
      level: "WARNING",
      title: "Heat Exposure Advisory",
      place: "South Market / Riverside",
      detail:
        "Modelled apparent temperature could peak at 40.3°C. Cooling coverage is 62%.",
      time: formatCityTime(new Date(anchor.getTime() - 12 * 60_000), {
        seconds: false,
      }),
      action: "View heat exposure",
      icon: Thermometer,
      page: "Urban Heat",
    },
    {
      id: "DATA-AQ07-M01",
      tone: "amber",
      level: "SOURCE OFFLINE",
      title: "AQ-07 Scheduled Maintenance",
      place: "Air-quality monitoring network",
      detail:
        "Backup station excluded from operational feeds. AQ-04 remains healthy.",
      time: formatCityTime(new Date(anchor.getTime() - 30 * 60_000), {
        seconds: false,
      }),
      action: "Inspect data health",
      icon: Database,
      page: "Data Health",
    },
  ];
  return (
    <motion.div {...stagger} className="ds-screen alerts-screen">
      <DomainTitle
        eyebrow="OPERATIONS / ALERT CENTER"
        title="Attention where it matters."
        description="Prioritised operational exceptions, with the next decision in view."
      >
        <Tag tone="red">3 ACTIVE ALERTS</Tag>
      </DomainTitle>
      <div className="alert-queue-header">
        <span>PRIORITY QUEUE</span>
        <span>SORTED BY OPERATIONAL SEVERITY</span>
      </div>
      <div className="alert-queue">
        {alerts.map((a, i) => (
          <button
            className={`alert-item ${a.tone}`}
            onClick={() => onOpen?.(a.page)}
            key={a.id}
          >
            <div className="alert-priority">
              0{i + 1}
              <span />
            </div>
            <div className="alert-icon">
              <a.icon size={23} />
            </div>
            <div className="alert-description">
              <div>
                <Tag tone={a.tone}>{a.level}</Tag>
                <span className="alert-id">{a.id}</span>
              </div>
              <h2>{a.title}</h2>
              <p className="alert-place">
                <MapPin size={13} />
                {a.place}
              </p>
              <p>{a.detail}</p>
            </div>
            <div className="alert-action">
              <time>{a.time}</time>
              <span>
                {a.action}
                <ArrowRight size={16} />
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="alerts-note">
        <ShieldCheck size={17} />
        <p>
          Recommendations remain advisory. Operational changes require explicit
          human approval.
        </p>
        <span>SYNTHETIC DEMONSTRATION EVENTS</span>
      </div>
    </motion.div>
  );
}
