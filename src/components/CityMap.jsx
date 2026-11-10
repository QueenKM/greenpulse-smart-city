import React, { useId, useState } from "react";
import { Plus, Minus, LocateFixed, Navigation, X } from "lucide-react";
import "./CityMap.css";

// A purpose-built illustrative city: no external tiles and no claims of GIS accuracy.
const W = 1120,
  H = 720;
const river =
  "M-100 14 C180 28 128 172 210 229 C293 286 254 350 182 401 C115 449 184 498 306 536 C415 570 412 647 477 774";
const park = "M768 38 L886 21 968 73 942 148 850 166 781 124Z";
const park2 = "M69 467 C125 452 167 485 202 505 L178 557 113 578 52 540Z";
const heritage =
  "M382 175 L477 134 616 151 712 219 740 345 691 461 592 504 450 475 357 402 330 286Z";
const roads = [
  {
    id: "ring",
    d: "M356 139 C479 72 663 96 756 221 C831 319 798 462 692 533 C576 610 399 554 317 455 C223 342 248 218 356 139",
    width: 18,
  },
  {
    id: "eastwest",
    d: "M-40 370 C120 359 211 326 327 322 C441 318 512 350 623 336 C768 318 903 301 1160 341",
    width: 17,
  },
  {
    id: "northsouth",
    d: "M529 -30 C486 97 475 184 502 292 C529 394 581 498 570 750",
    width: 14,
  },
  {
    id: "south",
    d: "M-30 662 C231 625 348 561 459 470 C563 384 661 408 819 451 C958 489 1055 525 1155 549",
    width: 15,
  },
  {
    id: "north",
    d: "M173 -15 C236 89 339 179 443 205 C560 234 649 218 764 170 C861 129 1013 151 1151 119",
    width: 12,
  },
  {
    id: "east",
    d: "M1026 -30 C965 128 921 232 897 333 C873 438 876 574 949 751",
    width: 14,
  },
  {
    id: "heritagelane",
    d: "M333 259 C433 254 551 276 616 326 C666 365 689 416 691 464",
    width: 8,
  },
  { id: "westlane", d: "M376 171 C389 269 399 359 450 475", width: 7 },
];
const trafficSegments = [
  { d: "M-35 370 C107 362 218 328 327 322", color: "#38bdf8" },
  { d: "M327 322 C401 320 465 343 507 344", color: "#fbbf24" },
  {
    d: "M507 344 C548 345 583 343 623 336 C670 331 713 326 756 320",
    color: "#fb7185",
  },
  { d: "M756 320 C875 306 1030 315 1140 338", color: "#fbbf24" },
  { d: "M529 -20 C489 94 480 196 502 292", color: "#38bdf8" },
  { d: "M502 292 C516 349 541 412 558 460", color: "#fb7185" },
  { d: "M558 460 C574 530 578 639 570 743", color: "#fbbf24" },
  { d: "M356 139 C443 90 553 86 647 121", color: "#38bdf8" },
  {
    d: "M647 121 C698 142 731 185 756 221 C795 273 812 335 796 395",
    color: "#fbbf24",
  },
  { d: "M796 395 C784 459 742 504 692 533", color: "#fb7185" },
  { d: "M692 533 C573 610 400 555 317 455", color: "#fbbf24" },
  { d: "M317 455 C223 342 248 218 356 139", color: "#38bdf8" },
  { d: "M-20 661 C231 625 348 561 459 470", color: "#38bdf8" },
  { d: "M459 470 C563 384 661 408 819 451", color: "#fb7185" },
  { d: "M819 451 C958 489 1055 525 1155 549", color: "#fbbf24" },
  {
    d: "M1026 -20 C965 128 921 232 897 333 C873 438 876 574 949 751",
    color: "#38bdf8",
  },
];
function rand(n) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function clip(poly, a, b, c) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k],
      q = poly[(k + 1) % poly.length],
      dp = a * p[0] + b * p[1] - c,
      dq = a * q[0] + b * q[1] - c;
    if (dp <= 0) out.push(p);
    if (dp <= 0 !== dq <= 0) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}
function createBlocks() {
  const points = [];
  for (let y = -20, row = 0; y < 750; y += 35, row++)
    for (let x = -20, col = 0; x < 1150; x += 36, col++) {
      const n = row * 43 + col;
      const px =
        x + (row % 2) * 14 + rand(n) * 25 - 12 + Math.sin(y / 170) * 15;
      const py = y + rand(n + 300) * 25 - 12 + Math.sin(x / 200) * 16;
      points.push([px, py]);
    }
  return points
    .map((p, i) => {
      let poly = [
        [0, 0],
        [W, 0],
        [W, H],
        [0, H],
      ];
      for (let j = 0; j < points.length; j++) {
        if (j === i) continue;
        const q = points[j];
        if (Math.abs(q[0] - p[0]) > 105 || Math.abs(q[1] - p[1]) > 105)
          continue;
        poly = clip(
          poly,
          q[0] - p[0],
          q[1] - p[1],
          (q[0] * q[0] + q[1] * q[1] - p[0] * p[0] - p[1] * p[1]) / 2,
        );
        if (!poly.length) break;
      }
      if (poly.length < 3) return null;
      const gap = 0.78 + rand(i + 700) * 0.1;
      const inset = poly.map((v) => [
        p[0] + (v[0] - p[0]) * gap,
        p[1] + (v[1] - p[1]) * gap,
      ]);
      const inner = poly.map((v) => [
        p[0] + (v[0] - p[0]) * 0.32,
        p[1] + (v[1] - p[1]) * 0.32,
      ]);
      return {
        points: inset
          .map((v) => v.map((vv) => vv.toFixed(1)).join(","))
          .join(" "),
        inner: inner
          .map((v) => v.map((vv) => vv.toFixed(1)).join(","))
          .join(" "),
        shade: Math.floor(rand(i + 900) * 4),
        i,
      };
    })
    .filter(Boolean);
}
const BLOCKS = createBlocks();
const sensorData = [
  {
    id: "T14",
    x: 509,
    y: 342,
    type: "traffic",
    title: "Traffic sensor T14",
    value: "17 km/h · Congestion 72%",
    status: "Critical corridor",
  },
  {
    id: "AQ-04",
    x: 642,
    y: 300,
    type: "air",
    title: "Air quality · AQ-04",
    value: "PM2.5 27 µg/m³ · NO₂ 47 µg/m³",
    status: "Healthy · refreshed 52 sec ago",
  },
  {
    id: "T12",
    x: 314,
    y: 322,
    type: "traffic",
    title: "Traffic sensor T12",
    value: "32 km/h · Congestion 41%",
    status: "Healthy · refreshed 18 sec ago",
  },
  {
    id: "AQ-07",
    x: 788,
    y: 410,
    type: "air",
    title: "Air quality · AQ-07",
    value: "Offline · Scheduled maintenance",
    status: "Excluded from operational feeds",
  },
  {
    id: "P3",
    x: 738,
    y: 505,
    type: "parking",
    title: "Parking zone P3",
    value: "93% occupied · 12 spaces available",
    status: "Healthy · refreshed 27 sec ago",
  },
  {
    id: "P1",
    x: 335,
    y: 180,
    type: "parking",
    title: "Parking zone P1",
    value: "64% occupied",
    status: "Healthy · refreshed 27 sec ago",
  },
  {
    id: "C01",
    x: 433,
    y: 253,
    type: "cooling",
    title: "Cooling point · Civic Library",
    value: "Accessible · Capacity 120",
    status: "Available for activation",
  },
  {
    id: "C02",
    x: 714,
    y: 240,
    type: "cooling",
    title: "Cooling point · East Pavilion",
    value: "Accessible · Capacity 80",
    status: "Available for activation",
  },
  {
    id: "C03",
    x: 398,
    y: 438,
    type: "cooling",
    title: "Cooling point · Riverside Hall",
    value: "Accessible · Capacity 150",
    status: "Available for activation",
  },
];
const colors = ["#132831", "#142c36", "#10232c", "#172e38"];

export default function CityMap({
  layers = {},
  onSelect,
  mode = "traffic",
  scenario = "B",
  after = false,
  comparison = false,
  compact = false,
}) {
  const instanceId = useId().replace(/:/g, "");
  const svgId = (name) => `${instanceId}-${name}`;
  const svgUrl = (name) => `url(#${svgId(name)})`;
  const [zoom, setZoom] = useState(1),
    [selected, setSelected] = useState(null);
  const showTraffic = layers.traffic !== false && mode !== "heat";
  const showAir = layers.air !== false && mode !== "heat";
  const showHeat = layers.heat === true || mode === "heat";
  const showHeritage = layers.heritage !== false;
  const showSensors = layers.sensors !== false;
  const improved = after || (mode === "twin" && scenario !== "A");
  const pick = (sensor) => {
    setSelected(sensor);
    onSelect?.(
      sensor || { id: "H03", title: "Historic Centre H-03", type: "incident" },
    );
  };
  return (
    <div
      className={`city-map ${mode === "twin" ? "city-map-twin" : ""} ${compact ? "city-map-compact" : ""}`}
    >
      <svg
        className="city-map-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        role="group"
        aria-label="Illustrative historic European city showing operational traffic, heritage zones, air monitoring and green spaces"
      >
        <defs>
          <radialGradient id={svgId("city-back")}>
            <stop offset="0" stopColor="#112730" />
            <stop offset="1" stopColor="#07151c" />
          </radialGradient>
          <radialGradient id={svgId("pollution")}>
            <stop
              offset="0"
              stopColor={improved ? "#fbbf24" : "#fb7185"}
              stopOpacity={improved ? ".18" : ".3"}
            />
            <stop
              offset=".45"
              stopColor={improved ? "#fbbf24" : "#fb7185"}
              stopOpacity=".09"
            />
            <stop offset="1" stopColor="#fb7185" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={svgId("heat-zone")}>
            <stop offset="0" stopColor="#fb7185" stopOpacity=".43" />
            <stop offset=".45" stopColor="#fbbf24" stopOpacity=".25" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={svgId("city-vignette")}>
            <stop offset=".47" stopColor="#050d12" stopOpacity="0" />
            <stop offset="1" stopColor="#050d12" stopOpacity=".64" />
          </radialGradient>
          <linearGradient id={svgId("city-river")} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#103748" />
            <stop offset=".5" stopColor="#0a2b3a" />
            <stop offset="1" stopColor="#0e3441" />
          </linearGradient>
          <pattern
            id={svgId("park-grain")}
            width="19"
            height="21"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="8" cy="11" r="3.5" fill="#24463e" opacity=".6" />
            <circle cx="15" cy="2" r="2" fill="#31554a" opacity=".3" />
          </pattern>
          <mask id={svgId("city-building-mask")}>
            <rect width={W} height={H} fill="white" />
            {roads.map((r) => (
              <path
                key={r.id}
                d={r.d}
                fill="none"
                stroke="black"
                strokeWidth={r.width + 7}
              />
            ))}
            <path d={river} fill="none" stroke="black" strokeWidth="78" />
            <path d={park} fill="black" />
            <path d={park2} fill="black" />
            <path d="M569 238 L613 256 604 295 560 281Z" fill="black" />
          </mask>
          <filter id={svgId("map-softglow")}>
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={svgId("map-roadglow")}>
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <rect width={W} height={H} fill={svgUrl("city-back")} />
        <g
          className="city-map-geography"
          style={{
            transform: `translate(${W / 2}px,${H / 2}px) scale(${zoom}) translate(${-W / 2}px,${-H / 2}px)`,
          }}
        >
          <g className="city-blocks" mask={svgUrl("city-building-mask")}>
            {BLOCKS.map((b) => (
              <g key={b.i}>
                <polygon
                  points={b.points}
                  fill={colors[b.shade]}
                  stroke="#29414b"
                  strokeWidth=".65"
                />
                <polygon
                  points={b.inner}
                  fill="#0b1c24"
                  stroke="#1a3039"
                  strokeWidth=".55"
                />
              </g>
            ))}
          </g>
          <path d={river} stroke="#244652" strokeWidth="84" fill="none" />
          <path
            d={river}
            stroke={svgUrl("city-river")}
            strokeWidth="73"
            fill="none"
          />
          <path
            d={river}
            stroke="#427b89"
            strokeOpacity=".16"
            strokeWidth="1"
            fill="none"
            strokeDasharray="3 14"
          />
          <path d={park} fill="#142e2b" stroke="#2b4941" strokeWidth="1" />
          <path d={park} fill={svgUrl("park-grain")} />
          <path d={park2} fill="#18352f" stroke="#294a40" strokeWidth="1" />
          <path d={park2} fill={svgUrl("park-grain")} />
          <path
            d="M786 66 Q856 107 924 102 M849 40 L858 142"
            fill="none"
            stroke="#658576"
            strokeOpacity=".23"
            strokeWidth="2"
          />
          <g className="map-road-foundation">
            {roads.map((r) => (
              <path
                key={r.id}
                d={r.d}
                fill="none"
                stroke="#28434e"
                strokeWidth={r.width + 2}
              />
            ))}
            {roads.map((r) => (
              <path
                key={r.id}
                d={r.d}
                fill="none"
                stroke="#102630"
                strokeWidth={r.width - 1}
              />
            ))}
          </g>
          <path
            d="M560 281 L569 238 613 256 604 295Z"
            fill="#324148"
            stroke="#506267"
            strokeWidth="1"
          />
          <path
            d="M566 270 L595 282 601 260 574 250Z"
            fill="#496069"
            stroke="#6c838a"
            strokeWidth="1.4"
          />
          <path d="M574 250 L580 241 607 252 601 260Z" fill="#617780" />
          <path d="M576 237 L581 220 588 240" fill="#586d77" />
          <g className="map-pedestrian">
            <path
              d="M385 281 Q473 269 561 281 M442 211 Q440 273 452 324 M538 170 Q547 226 560 249 M585 295 Q581 361 618 405 M399 382 Q488 375 527 402"
              fill="none"
              stroke="#94a3b8"
              strokeOpacity=".35"
              strokeWidth="2"
              strokeDasharray="3 4"
            />
          </g>
          <g className="map-transit">
            <path
              d="M-10 393 C173 385 270 347 360 349 C485 344 555 381 685 351 C804 324 945 333 1130 360"
              fill="none"
              stroke="#a78bfa"
              strokeWidth="2"
              strokeOpacity=".6"
              strokeDasharray="8 6"
            />
            {[
              [277, 357],
              [449, 352],
              [666, 355],
              [869, 338],
            ].map(([x, y], i) => (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#0a1a23"
                  stroke="#a78bfa"
                  strokeWidth="1.5"
                />
                <circle cx={x} cy={y} r="1.2" fill="#a78bfa" />
              </g>
            ))}
          </g>
          <g
            className={`map-layer map-heritage ${showHeritage ? "is-visible" : ""}`}
          >
            <path
              d={heritage}
              fill="#a78bfa"
              fillOpacity=".035"
              stroke="#a78bfa"
              strokeOpacity=".5"
              strokeWidth="1.5"
              strokeDasharray="6 5"
            />
            <path
              d={heritage}
              fill="none"
              stroke="#a78bfa"
              strokeOpacity=".04"
              strokeWidth="15"
            />
          </g>
          <g className={`map-layer map-air ${showAir ? "is-visible" : ""}`}>
            <ellipse
              cx="585"
              cy="350"
              rx={improved ? 92 : 160}
              ry={improved ? 74 : 132}
              fill={svgUrl("pollution")}
              className="map-pollution-cloud"
            />
            <ellipse
              cx="717"
              cy="438"
              rx={improved ? 60 : 96}
              ry={improved ? 50 : 80}
              fill={svgUrl("pollution")}
            />
          </g>
          <g className={`map-layer map-heat ${showHeat ? "is-visible" : ""}`}>
            <ellipse
              cx="564"
              cy="330"
              rx="210"
              ry="184"
              fill={svgUrl("heat-zone")}
            />
            <ellipse
              cx="856"
              cy="493"
              rx="176"
              ry="133"
              fill={svgUrl("heat-zone")}
            />
            <ellipse
              cx="339"
              cy="154"
              rx="95"
              ry="90"
              fill={svgUrl("heat-zone")}
            />
            <path
              d="M442 220 C590 187 730 298 688 422 C648 520 481 449 415 371Z"
              fill="none"
              stroke="#fbbf24"
              strokeOpacity=".4"
              strokeDasharray="4 5"
            />
          </g>
          <g
            className={`map-layer map-traffic ${showTraffic ? "is-visible" : ""}`}
          >
            {trafficSegments.map((r, i) => (
              <path
                key={`glow-${i}`}
                d={r.d}
                fill="none"
                stroke={
                  improved
                    ? r.color === "#fb7185"
                      ? "#38bdf8"
                      : r.color === "#fbbf24"
                        ? "#38bdf8"
                        : r.color
                    : r.color
                }
                strokeOpacity=".11"
                strokeWidth="11"
                filter={svgUrl("map-roadglow")}
              />
            ))}
            {trafficSegments.map((r, i) => (
              <path
                key={i}
                d={r.d}
                fill="none"
                stroke={
                  improved
                    ? r.color === "#fb7185"
                      ? "#38bdf8"
                      : r.color === "#fbbf24"
                        ? "#38bdf8"
                        : r.color
                    : r.color
                }
                strokeOpacity=".81"
                strokeWidth="3.3"
                className="map-traffic-segment"
              />
            ))}
            <path
              d="M511 344 C552 346 588 342 623 336"
              fill="none"
              stroke="#fff"
              strokeOpacity=".8"
              strokeWidth="2"
              strokeDasharray="2 90"
              className="map-data-flow"
            />
            <path
              d="M1019 0 C965 128 921 232 897 333"
              fill="none"
              stroke="#fff"
              strokeOpacity=".5"
              strokeWidth="1.7"
              strokeDasharray="2 110"
              className="map-data-flow map-data-flow-slow"
            />
          </g>
          {improved && (
            <g className="map-intervention">
              <path
                d={heritage}
                fill="#38bdf8"
                fillOpacity=".025"
                stroke="#38bdf8"
                strokeOpacity=".4"
                strokeWidth="1.5"
              />
              <path
                d="M420 205 L665 205 698 413 466 455Z"
                fill="#38bdf8"
                fillOpacity=".025"
                stroke="#38bdf8"
                strokeOpacity=".24"
                strokeDasharray="3 6"
              />
            </g>
          )}
          <g className="map-district-labels">
            <text
              x="132"
              y="149"
              transform="rotate(27 132 149)"
              className="map-river-name"
            >
              RIVER ARDA
            </text>
            <text x="850" y="96" className="map-park-label">
              BOTANICAL GARDENS
            </text>
            <text x="130" y="527" className="map-park-label">
              RIVERSIDE PARK
            </text>
            <text x="870" y="229">
              EAST QUARTER
            </text>
            <text x="696" y="650">
              SOUTH DISTRICT
            </text>
            <text x="332" y="79">
              NORTH GATE
            </text>
            <text x="109" y="618">
              WEST BANK
            </text>
            <text x="980" y="595">
              UNIVERSITY
            </text>
          </g>
          <g className="map-street-labels">
            <text x="765" y="307" transform="rotate(-4 765 307)">
              EASTERN BOULEVARD
            </text>
            <text x="634" y="468" transform="rotate(17 634 468)">
              LIBERTY AVENUE
            </text>
            <text x="516" y="102" transform="rotate(1 516 102)">
              NORTH RING ROAD
            </text>
            <text x="409" y="529" transform="rotate(21 409 529)">
              HERITAGE RING
            </text>
          </g>
          <g
            className={`map-layer map-sensors ${showSensors ? "is-visible" : ""}`}
          >
            {sensorData
              .filter((s) => s.type !== "cooling" || showHeat)
              .map((s) => (
                <g
                  key={s.id}
                  className={`map-marker map-marker-${s.type} ${s.id === "AQ-07" ? "map-marker-offline" : ""}`}
                  role="button"
                  tabIndex="0"
                  aria-label={s.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    pick(s);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pick(s);
                    }
                  }}
                  transform={`translate(${s.x},${s.y})`}
                >
                  <circle
                    r="13"
                    fill="#071820"
                    stroke={
                      s.type === "air"
                        ? "#38bdf8"
                        : s.type === "parking"
                          ? "#93a5b3"
                          : s.type === "cooling"
                            ? "#34d399"
                            : "#38bdf8"
                    }
                    strokeOpacity=".55"
                    strokeWidth="1"
                  />
                  {s.type === "air" ? (
                    <>
                      <path
                        d="M-6 0 H4 Q8 0 7-4 Q6-7 3-5 M-5 4 H2 Q6 4 5 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </>
                  ) : s.type === "parking" ? (
                    <>
                      <text
                        x="0"
                        y="4.5"
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="12"
                        fontWeight="600"
                      >
                        P
                      </text>
                    </>
                  ) : s.type === "cooling" ? (
                    <>
                      <path
                        d="M0-7 C-1-4-5 0-5 3 A5 5 0 0 0 5 3 C5 0 1-4 0-7Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                      />
                    </>
                  ) : (
                    <>
                      <circle r="3" fill="currentColor" />
                      <path
                        d="M-6-5 Q-10 0-6 5 M6-5 Q10 0 6 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      />
                    </>
                  )}
                  <text y="27" textAnchor="middle" className="map-sensor-label">
                    {s.id}
                  </text>
                </g>
              ))}
            {[
              [702, 160],
              [278, 426],
              [911, 334],
              [573, 583],
              [484, 140],
              [620, 470],
            ].map(([x, y], i) => (
              <g key={i} className="map-small-sensor">
                <circle cx={x} cy={y} r="5" fill="#38bdf8" fillOpacity=".1" />
                <circle cx={x} cy={y} r="2.3" fill="#38bdf8" />
                <circle
                  cx={x}
                  cy={y}
                  r="7"
                  stroke="#38bdf8"
                  strokeOpacity=".3"
                  fill="none"
                />
              </g>
            ))}
          </g>
          <g
            className="map-incident-target"
            role="button"
            tabIndex="0"
            aria-label="Select Historic Centre H-03 incident"
            onClick={() => pick(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                pick(null);
              }
            }}
          >
            <circle
              cx="563"
              cy="355"
              r="45"
              fill={improved ? "#38bdf8" : "#fb7185"}
              fillOpacity=".025"
              stroke={improved ? "#38bdf8" : "#fb7185"}
              strokeOpacity=".3"
              strokeWidth="1"
              className="map-incident-pulse"
            />
            <circle
              cx="563"
              cy="355"
              r="23"
              fill={improved ? "#38bdf8" : "#fb7185"}
              fillOpacity=".06"
              stroke={improved ? "#38bdf8" : "#fb7185"}
              strokeOpacity=".6"
              strokeWidth="1"
            />
            <circle
              cx="563"
              cy="355"
              r="6"
              fill={improved ? "#38bdf8" : "#fb7185"}
              stroke="#17212b"
              strokeWidth="2"
            />
            <path
              d="M538 355 H547 M579 355 H588 M563 330 V339 M563 371 V380"
              stroke={improved ? "#38bdf8" : "#fb7185"}
              strokeOpacity=".75"
              strokeWidth="1"
            />
            <g transform="translate(568,391)">
              <rect
                x="-91"
                y="0"
                width="182"
                height="49"
                rx="3"
                fill="#07141d"
                fillOpacity=".93"
                stroke="#5c6574"
                strokeOpacity=".3"
              />
              <text
                textAnchor="middle"
                y="20"
                fill="#e5edf2"
                fontSize="12"
                fontWeight="600"
                letterSpacing="1.7"
              >
                HISTORIC CENTRE
              </text>
              <text
                textAnchor="middle"
                y="36"
                fill={improved ? "#38bdf8" : "#fb7185"}
                fontSize="9"
                letterSpacing="1.2"
              >
                H–03 · {improved ? "SIMULATED RESPONSE" : "CRITICAL INCIDENT"}
              </text>
            </g>
          </g>
        </g>
        <rect
          width={W}
          height={H}
          fill={svgUrl("city-vignette")}
          pointerEvents="none"
        />
      </svg>
      <div className="map-identification">
        <span className="map-identification-dot" />
        <span>ILLUSTRATIVE CITY MODEL</span>
        <span className="map-model-version">V.02</span>
      </div>
      <div className="map-compass" title="North">
        <Navigation size={17} />
        <span>N</span>
      </div>
      <div className="map-controls">
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
        >
          <Plus size={16} />
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.85, z - 0.15))}
        >
          <Minus size={16} />
        </button>
        <button aria-label="Reset map view" onClick={() => setZoom(1)}>
          <LocateFixed size={16} />
        </button>
      </div>
      <div className="map-scale">
        <span />
        <small>{Math.round(200 / zoom)} m</small>
      </div>
      <div className="map-coordinates">ILLUSTRATIVE · MODEL H03</div>
      {selected && (
        <div className="map-sensor-tooltip">
          <button
            aria-label="Close sensor details"
            onClick={() => setSelected(null)}
          >
            <X size={13} />
          </button>
          <span className="map-tooltip-kicker">SYNTHETIC SENSOR READING</span>
          <strong>{selected.title}</strong>
          <p>{selected.value}</p>
          <small>{selected.status}</small>
        </div>
      )}
    </div>
  );
}
