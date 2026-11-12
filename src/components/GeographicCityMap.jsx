import React, {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUpRight,
  Info,
  LocateFixed,
  Minus,
  Navigation,
  Plus,
  Radio,
  X,
} from "lucide-react";
import cityModel from "../data/city-model.json";
import { MATURITY_MAP_STAGES, resolveMapLayers } from "../maturity.mjs";
import "./CityMap.css";

// All base geometry comes from the bundled OpenStreetMap extract. Operational
// layers are deliberately separate and synthetic; no city feeds are connected.
const W = 1400;
const H = 900;
const R = 6378137;
const metadata = cityModel.metadata;
const bbox = metadata.bbox;
const mercator = ([lon, lat]) => [
  (R * lon * Math.PI) / 180,
  R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
];
const [west, south] = mercator([bbox[0], bbox[1]]);
const [east, north] = mercator([bbox[2], bbox[3]]);
const origin = mercator(
  metadata.center || [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2],
);
const pxPerMetre = Math.max(W / (east - west), H / (north - south));
const latitudeScale = Math.cos(
  ((metadata.center?.[1] || (bbox[1] + bbox[3]) / 2) * Math.PI) / 180,
);
const groundPxPerMetre = pxPerMetre / latitudeScale;
const project = (point, perspective = false, height = 0) => {
  const p = mercator(point);
  const x = W / 2 + (p[0] - origin[0]) * pxPerMetre;
  const y = H / 2 - (p[1] - origin[1]) * pxPerMetre;
  return [
    x,
    perspective
      ? H / 2 + (y - H / 2) * 0.76 - height * groundPxPerMetre * 0.65
      : y,
  ];
};
const pathFor = (points, perspective = false, close = false, height = 0) =>
  (points || [])
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${project(point, perspective, height)
          .map((n) => n.toFixed(2))
          .join(" ")}`,
    )
    .join(" ") + (close ? " Z" : "");
const centerOf = (points) =>
  points.reduce(
    (sum, point) => [
      sum[0] + point[0] / points.length,
      sum[1] + point[1] / points.length,
    ],
    [0, 0],
  );
const roadPoint = (road) => road.points[Math.floor(road.points.length / 2)];
const readableRoad = (road, perspective) => {
  const points = road.points;
  const a = project(points[0], perspective),
    b = project(points.at(-1), perspective);
  return pathFor(a[0] > b[0] ? [...points].reverse() : points, perspective);
};
const dist = (point) => {
  const p = project(point);
  return Math.hypot(p[0] - W / 2, p[1] - H / 2);
};
const roads = (cityModel.roads || []).filter((road) => road.points?.length > 1);
const buildings = (cityModel.buildings || []).filter(
  (building) => building.points?.length > 3,
);
const greens = (cityModel.greens || []).filter(
  (area) => area.points?.length > 3,
);
const water = (cityModel.water || []).filter((area) => area.points?.length > 1);
const historicAreas = (cityModel.heritage || []).filter(
  (area) => area.points?.length > 3,
);
const landmarks = (cityModel.landmarks || []).filter(
  (place) => place.point && place.name,
);
const drivingKinds = new Set([
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "unclassified",
  "residential",
  "living_street",
]);
const trafficRoads = roads
  .filter(
    (road) =>
      drivingKinds.has(road.kind) &&
      !road.pedestrian &&
      !["no", "private"].includes(road.access) &&
      !["no", "private", "delivery", "agricultural", "forestry"].includes(
        road.motorVehicle,
      ),
  )
  .map((road) => ({ ...road, distance: dist(roadPoint(road)) }));
const mainRoads = trafficRoads
  .filter((road) => !["residential", "living_street"].includes(road.kind))
  .sort((a, b) => a.distance - b.distance);
const mappedHeightCount = buildings.filter(
  (building) => Number(building.height) > 0,
).length;
const datum = metadata.center || [
  (bbox[0] + bbox[2]) / 2,
  (bbox[1] + bbox[3]) / 2,
];
const sensorRoads = [];
for (const road of mainRoads) {
  const point = roadPoint(road),
    p = project(point);
  if (
    !sensorRoads.some((chosen) => {
      const q = project(roadPoint(chosen));
      return Math.hypot(p[0] - q[0], p[1] - q[1]) < 110;
    })
  )
    sensorRoads.push(road);
}
const nearPoint = (index) =>
  sensorRoads[index]
    ? roadPoint(sensorRoads[index])
    : mainRoads[index]
      ? roadPoint(mainRoads[index])
      : datum;
const selectLandmark = (expression) =>
  landmarks.find((place) => expression.test(place.name));

const library = selectLandmark(
  /universiteitsbibliotheek|university library|bibliotheek/i,
);
const park1 =
  greens.find((area) => /donatus/i.test(area.name || "")) || greens[0];
const park2 =
  greens.find((area) => /kruidtuin|botanic/i.test(area.name || "")) ||
  greens[1];
const atPlace = (place, fallback = datum) =>
  place?.point || (place?.points?.length ? centerOf(place.points) : fallback);
const syntheticSensors = [
  {
    id: "T14",
    type: "traffic",
    point: nearPoint(0),
    title: "Scenario traffic sensor T14",
    value: "19 km/h · Congestion 72%",
    note: "Synthetic reading · proposed sensor location",
  },
  {
    id: "T12",
    type: "traffic",
    point: nearPoint(3),
    title: "Scenario traffic sensor T12",
    value: "32 km/h · Congestion 41%",
    note: "Synthetic reading · proposed sensor location",
  },
  {
    id: "AQ-04",
    type: "air",
    point: nearPoint(1),
    title: "Scenario air-quality station AQ-04",
    value: "PM2.5 27 µg/m³ · NO₂ 47 µg/m³",
    note: "Synthetic reading · proposed monitoring location",
  },
  {
    id: "AQ-07",
    type: "offline",
    point: nearPoint(5),
    title: "Scenario station AQ-07",
    value: "Offline · demonstration maintenance",
    note: "No physical sensor is represented",
  },
  {
    id: "P3",
    type: "parking",
    point: nearPoint(7),
    title: "Scenario parking zone P3",
    value: "93% occupancy · synthetic observation",
    note: "Scenario marker · parking capacity is not verified",
  },
  {
    id: "C01",
    type: "cooling",
    point: atPlace(park1, nearPoint(7)),
    title: "Proposed cooling point C01",
    value: park1?.name || "Scenario refuge location",
    note: "Simulated deployment · not an operating cooling facility",
  },
  {
    id: "C02",
    type: "cooling",
    point: atPlace(park2, nearPoint(8)),
    title: "Proposed cooling point C02",
    value: park2?.name || "Scenario refuge location",
    note: "Simulated deployment · not an operating cooling facility",
  },
  {
    id: "C03",
    type: "cooling",
    point: atPlace(library, nearPoint(9)),
    title: "Proposed cooling point C03",
    value: library?.name || "Scenario refuge location",
    note: "Simulated deployment · accessibility and capacity unverified",
  },
];
const WIDTHS = {
  motorway: 10,
  trunk: 9,
  primary: 7.5,
  primary_link: 5,
  secondary: 6,
  secondary_link: 4,
  tertiary: 4.5,
  tertiary_link: 3,
  unclassified: 3.2,
  residential: 2.4,
  living_street: 2.2,
  service: 1.6,
  pedestrian: 2.1,
  footway: 1.1,
  cycleway: 1.1,
  path: 0.9,
  steps: 0.8,
};
const namedRoads = [
  ...new Map(
    roads
      .filter(
        (road) =>
          road.name &&
          road.points.length > 3 &&
          !["service", "footway", "steps", "path"].includes(road.kind),
      )
      .map((road) => [road.name, road]),
  ).values(),
].slice(0, 32);
const landmarkLabels = landmarks
  .filter((place) =>
    /stadhuis|sint.pieter|universiteitsbibliotheek|groot begijnhof|muntstraat|grote markt|kruidtuin|donatus/i.test(
      place.name,
    ),
  )
  .slice(0, 9);
const fallbackLabels = landmarks.slice(0, 5);
const pointLabel = (point) =>
  `${point[1].toFixed(5)}° N · ${point[0].toFixed(5)}° E`;
const snapshotDate = metadata.capturedAt
  ? new Date(metadata.capturedAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
  : "Bundled OSM extract";

const polygonPath = (feature, perspective = false, height = 0) =>
  pathFor(feature.points, perspective, true, height) +
  (feature.holes || [])
    .map((hole) => pathFor(hole, perspective, true, height))
    .join(" ");
const preparedViews = new Map();
function prepareView(perspective) {
  if (preparedViews.has(perspective)) return preparedViews.get(perspective);
  const roadKinds = new Map();
  const paths = new Map();
  for (const road of roads) {
    const path = pathFor(road.points, perspective);
    paths.set(road.id, path);
    const key = `${road.kind}:${road.pedestrian ? "walk" : "drive"}`;
    if (!roadKinds.has(key))
      roadKinds.set(key, {
        kind: road.kind,
        pedestrian: road.pedestrian,
        paths: [],
      });
    roadKinds.get(key).paths.push(path);
  }
  const value = {
    roads: [...roadKinds.values()].map((group) => ({
      ...group,
      path: group.paths.join(" "),
    })),
    roadPaths: paths,
    greens: greens.map((area) => polygonPath(area, perspective)).join(" "),
    buildings: buildings
      .filter((building) => !building.name)
      .map((building) => polygonPath(building, perspective))
      .join(" "),
    namedBuildings: buildings
      .filter((building) => building.name)
      .map((building) => polygonPath(building, perspective))
      .join(" "),
    waterPolygons: water
      .filter((area) => area.kind === "polygon")
      .map((area) => polygonPath(area, perspective))
      .join(" "),
    waterLines: water
      .filter((area) => area.kind !== "polygon")
      .map((area) => pathFor(area.points, perspective))
      .join(" "),
    heights: perspective
      ? buildings
          .filter((building) => Number(building.height) > 0)
          .sort((a, b) => centerOf(b.points)[1] - centerOf(a.points)[1])
          .map((building) => {
            const height = Number(building.height);
            const base = building.points.map((point) => project(point, true));
            const roof = building.points.map((point) =>
              project(point, true, height),
            );
            return {
              id: building.id,
              name: building.name,
              height,
              roof: polygonPath(building, true, height),
              sides: base
                .slice(0, -1)
                .map(
                  (point, i) =>
                    `M${point} L${base[i + 1]} L${roof[i + 1]} L${roof[i]}Z`,
                )
                .join(" "),
            };
          })
      : [],
  };
  preparedViews.set(perspective, value);
  return value;
}
const GeographicBase = memo(function GeographicBase({
  perspective,
  labelPrefix,
}) {
  const view = prepareView(perspective);
  return (
    <>
      <path
        className="geo-land-polygons"
        d={view.greens}
        fill="#15382f"
        stroke="#326052"
        strokeWidth="0.6"
        fillRule="evenodd"
      />
      <g className="geo-water">
        <path
          d={view.waterPolygons}
          fill="#123f50"
          stroke="#245c70"
          strokeWidth="1"
          fillRule="evenodd"
        />
        <path
          d={view.waterLines}
          fill="none"
          stroke="#245c70"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <g className="geo-street-foundation">
        {view.roads.map((group) => (
          <path
            key={`${group.kind}-${group.pedestrian}`}
            d={group.path}
            fill="none"
            stroke={group.pedestrian ? "#50646b" : "#37515c"}
            strokeWidth={(WIDTHS[group.kind] || 1.4) + 1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={group.pedestrian ? 0.45 : 0.7}
          />
        ))}
      </g>
      <g className="geo-building-footprints">
        <path
          d={view.buildings}
          fill="#1c323d"
          stroke="#45606c"
          strokeWidth=".55"
          fillRule="evenodd"
        />
        <path
          d={view.namedBuildings}
          fill="#29424d"
          stroke="#52707d"
          strokeWidth=".65"
          fillRule="evenodd"
        />
      </g>
      <g className="geo-street-centres">
        {view.roads.map((group) => (
          <path
            key={`${group.kind}-${group.pedestrian}`}
            d={group.path}
            fill="none"
            stroke={group.pedestrian ? "#819198" : "#0c1d26"}
            strokeWidth={WIDTHS[group.kind] || 1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={group.pedestrian ? "2 4" : undefined}
            opacity={group.pedestrian ? 0.55 : 1}
          />
        ))}
      </g>
      {perspective && (
        <g className="geo-building-heights">
          {view.heights.map((building) => (
            <g key={building.id}>
              <path
                d={building.sides}
                fill="#264652"
                stroke="#385867"
                strokeWidth=".45"
              />
              <path
                d={building.roof}
                fill="#41616f"
                stroke="#8ba9b4"
                strokeWidth=".7"
                fillRule="evenodd"
              >
                <title>{`${building.name || "Mapped building"} · OSM height ${building.height} m`}</title>
              </path>
            </g>
          ))}
        </g>
      )}
      <g className="geo-street-names">
        {namedRoads.map((road, index) => (
          <g key={road.id}>
            <defs>
              <path
                id={`${labelPrefix}-street-${index}`}
                d={readableRoad(road, perspective)}
              />
            </defs>
            <text>
              <textPath
                href={`#${labelPrefix}-street-${index}`}
                startOffset="50%"
                textAnchor="middle"
              >
                {road.name}
              </textPath>
            </text>
          </g>
        ))}
      </g>
      <g className="geo-landmark-names">
        {(landmarkLabels.length ? landmarkLabels : fallbackLabels).map(
          (place, index) => {
            const [x, y] = project(place.point, perspective);
            return (
              <g key={place.id} transform={`translate(${x},${y})`}>
                <rect
                  x="-2.5"
                  y="-2.5"
                  width="5"
                  height="5"
                  rx="1"
                  fill="#a6a0c0"
                />
                <text y={index % 2 ? -10 : 16}>{place.name}</text>
              </g>
            );
          },
        )}
      </g>
    </>
  );
});
const trafficViews = new Map();
function prepareTraffic(
  perspective,
  scenario,
  improved,
  forecastOffset = 0,
  coverage = "city",
) {
  const minute = Math.max(0, Math.min(60, Number(forecastOffset) || 0));
  const key = `${perspective}:${scenario}:${improved}:${minute}:${coverage}`;
  if (trafficViews.has(key)) return trafficViews.get(key);
  const base = prepareView(perspective),
    groups = new Map();
  for (const road of trafficRoads) {
    if (
      coverage === "priority" &&
      (road.distance > 400 ||
        ["residential", "living_street"].includes(road.kind))
    )
      continue;
    const color = roadTrafficColor(road, scenario, improved, minute);
    const residential = ["residential", "living_street"].includes(road.kind);
    const groupKey = `${color}:${residential}`;
    if (!groups.has(groupKey))
      groups.set(groupKey, { color, residential, paths: [] });
    groups.get(groupKey).paths.push(base.roadPaths.get(road.id));
  }
  const value = [...groups.values()].map((group) => ({
    ...group,
    path: group.paths.join(" "),
  }));
  trafficViews.set(key, value);
  return value;
}

function roadTrafficColor(road, scenario, improved, forecastOffset = 0) {
  const progress = Math.max(0, Math.min(1, forecastOffset / 60));
  if (!improved || scenario === "A") {
    return road.distance < 290 + 100 * progress
      ? "#fb7185"
      : road.distance < 500 + 100 * progress
        ? "#fbbf24"
        : "#38bdf8";
  }
  if (road.distance < 290 * (1 - progress)) return "#fb7185";
  if (scenario === "C") {
    return (road.distance > 280 && road.distance < 500 + 150 * progress) ||
      road.distance < 500 * (1 - progress)
      ? "#fbbf24"
      : "#38bdf8";
  }
  return road.distance < Math.max(130, 500 - 370 * progress) ||
    (progress > 0.6 && road.distance > 340 && road.distance < 430)
    ? "#fbbf24"
    : "#38bdf8";
}

// Presentation preloading warms the exact views used later by the two map
// halves, rather than waiting for the first 3D frame during the live journey.
export function warmGeographyViews() {
  for (const perspective of [false, true]) {
    prepareView(perspective);
    prepareTraffic(perspective, "A", false, 0);
    for (const scenario of ["A", "B", "C"])
      prepareTraffic(perspective, scenario, scenario !== "A", 60);
  }
  return {
    views: 2,
    buildingFootprints: buildings.length,
    mappedHeights: mappedHeightCount,
  };
}

function CityMap({
  layers = {},
  maturity = "TARGET",
  viewResetToken = 0,
  onSelect,
  mode = "traffic",
  scenario = "B",
  after = false,
  compact = false,
  focused = false,
  focusRequest = 0,
  onClearFocus,
  forecastOffset = 0,
  camera: controlledCamera,
  onCameraChange,
  viewMode,
  onViewModeChange,
}) {
  const stageKey =
    typeof maturity === "string" && Object.hasOwn(MATURITY_MAP_STAGES, maturity)
      ? maturity
      : "TARGET";
  const stage = MATURITY_MAP_STAGES[stageKey];
  const isCurrent = stageKey === "CURRENT";
  const isMVP = stageKey === "MVP";
  const canUse3d = stageKey === "TARGET";
  const effectiveLayers = resolveMapLayers(
    { ...layers, heat: layers.heat === true || mode === "heat" },
    stageKey,
  );
  const uid = useId().replaceAll(":", "");
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const [internalCamera, setInternalCamera] = useState({ zoom: 1, x: 0, y: 0 });
  const camera = controlledCamera || internalCamera;
  const cameraRef = useRef(camera);
  cameraRef.current = camera;
  const cameraChangeRef = useRef(onCameraChange);
  cameraChangeRef.current = onCameraChange;
  const setCamera = useCallback((update) => {
    const next =
      typeof update === "function" ? update(cameraRef.current) : update;
    cameraRef.current = next;
    if (cameraChangeRef.current) cameraChangeRef.current(next);
    else setInternalCamera(next);
  }, []);
  const [internalPerspective, setInternalPerspective] = useState(
    stage.viewMode === "3d",
  );
  const perspective =
    canUse3d && (viewMode ? viewMode === "3d" : internalPerspective);
  const viewModeChangeRef = useRef(onViewModeChange);
  viewModeChangeRef.current = onViewModeChange;
  const setPerspective = (update) => {
    if (!canUse3d) return;
    const next = typeof update === "function" ? update(perspective) : update;
    if (onViewModeChange) onViewModeChange(next ? "3d" : "2d");
    else setInternalPerspective(next);
  };
  const [focusAnimating, setFocusAnimating] = useState(false);
  const focusToken = useRef(null);
  const focusTimer = useRef(null);
  const dragStopTimer = useRef(null);
  const [selected, setSelected] = useState(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [viewportScale, setViewportScale] = useState(1);
  const showTraffic = effectiveLayers.traffic && mode !== "heat";
  const showAir = effectiveLayers.air && mode !== "heat";
  const showHeat = effectiveLayers.heat;
  const showHeritage = effectiveLayers.heritage;
  const showSensors = effectiveLayers.sensors;
  const improved =
    !isCurrent && (after || (mode === "twin" && scenario !== "A"));
  const forecastMinute = isCurrent
    ? 0
    : Math.max(0, Math.min(60, Number(forecastOffset) || 0));
  const coverage = isMVP ? "priority" : "city";
  const trafficView = !isCurrent
    ? prepareTraffic(perspective, scenario, improved, forecastMinute, coverage)
    : [];
  const forecastProgress = forecastMinute / 60;
  const airWidth =
    (improved
      ? 255 - (scenario === "C" ? 145 : 110) * forecastProgress
      : 255 + 75 * forecastProgress) * (isMVP ? 0.65 : 1);
  const airHeight =
    (improved ? 170 - 80 * forecastProgress : 170 + 50 * forecastProgress) *
    (isMVP ? 0.7 : 1);
  const pollutionImproving = improved && forecastMinute > 0;
  const incidentPoint = datum;
  const [ix, iy] = project(incidentPoint, perspective);
  useEffect(() => {
    setInternalPerspective(stage.viewMode === "3d");
    viewModeChangeRef.current?.(stage.viewMode);
    setCamera({ zoom: 1, x: 0, y: 0 });
    setSelected(null);
    setFocusAnimating(false);
    clearTimeout(focusTimer.current);
    focusToken.current = null;
  }, [stageKey, viewResetToken, setCamera]);
  useEffect(() => {
    if (!focused || isCurrent) {
      focusToken.current = null;
      return undefined;
    }
    const token = `${focusRequest}:${perspective}:${stageKey}`;
    if (focusToken.current === token) return undefined;
    focusToken.current = token;
    clearTimeout(focusTimer.current);
    setFocusAnimating(true);
    const zoom = 1.55;
    setCamera({ zoom, x: W / 2 - ix * zoom, y: H / 2 - iy * zoom });
    focusTimer.current = setTimeout(() => setFocusAnimating(false), 650);
    return () => {
      clearTimeout(focusTimer.current);
      focusToken.current = null;
    };
  }, [
    focused,
    focusRequest,
    perspective,
    ix,
    iy,
    setCamera,
    stageKey,
    isCurrent,
  ]);
  useEffect(
    () => () => {
      clearTimeout(focusTimer.current);
      clearTimeout(dragStopTimer.current);
    },
    [],
  );
  const clearIncidentFocus = () => {
    clearTimeout(focusTimer.current);
    setFocusAnimating(false);
    setCamera({ zoom: 1, x: 0, y: 0 });
    setSelected(null);
    onClearFocus?.();
  };
  const visibleSensors = syntheticSensors.filter((sensor) =>
    isMVP
      ? ["traffic", "air", "offline"].includes(sensor.type)
      : sensor.type !== "cooling" || showHeat,
  );
  const id = (name) => `${uid}-${name}`;
  const url = (name) => `url(#${id(name)})`;
  const groundScaleMetres = 250;
  const baseScaleWidth =
    groundScaleMetres * groundPxPerMetre * camera.zoom * viewportScale;
  const selectedBaseLabel = isCurrent
    ? "Reference inventory only · no connected feeds"
    : isMVP
      ? "Proposed priority corridor · limited coverage"
      : perspective
        ? `Mapped building heights · ${mappedHeightCount} tagged`
        : `${buildings.length.toLocaleString("en-GB")} real building footprints`;
  const pick = (item) => {
    if (isCurrent) return;
    setSelected(item);
    onSelect?.(
      item || {
        id: "H03",
        title: `${metadata.city} historic centre · H-03`,
        type: "incident",
        coordinates: incidentPoint,
        synthetic: true,
      },
    );
  };
  const clientToSvg = (clientX, clientY) => {
    const svg = svgRef.current;
    if (svg?.createSVGPoint && svg.getScreenCTM?.()) {
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      return point.matrixTransform(svg.getScreenCTM().inverse());
    }
    const bounds = svg.getBoundingClientRect();
    return {
      x: ((clientX - bounds.left) * W) / bounds.width,
      y: ((clientY - bounds.top) * H) / bounds.height,
    };
  };
  const zoomAt = (factor, pointer) => {
    setFocusAnimating(false);
    setCamera((previous) => {
      const zoom = Math.max(0.8, Math.min(3.4, previous.zoom * factor));
      const anchor = pointer || { x: W / 2, y: H / 2 };
      const ratio = zoom / previous.zoom;
      return {
        zoom,
        x: anchor.x - (anchor.x - previous.x) * ratio,
        y: anchor.y - (anchor.y - previous.y) * ratio,
      };
    });
  };
  useEffect(() => {
    const svg = svgRef.current;
    const measure = () => {
      const box = svg.getBoundingClientRect();
      if (box.width && box.height)
        setViewportScale(Math.max(box.width / W, box.height / H));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (compact) return undefined;
    const svg = svgRef.current;
    const wheel = (event) => {
      event.preventDefault();
      zoomAt(
        event.deltaY < 0 ? 1.09 : 1 / 1.09,
        clientToSvg(event.clientX, event.clientY),
      );
    };
    svg.addEventListener("wheel", wheel, { passive: false });
    return () => svg.removeEventListener("wheel", wheel);
  }, [compact]);
  const pointerDown = (event) => {
    if (compact || event.button !== 0) return;
    setFocusAnimating(false);
    const point = clientToSvg(event.clientX, event.clientY);
    dragRef.current = { x: point.x, y: point.y, camera: cameraRef.current };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const pointerMove = (event) => {
    if (!dragRef.current) return;
    const point = clientToSvg(event.clientX, event.clientY);
    const dx = point.x - dragRef.current.x,
      dy = point.y - dragRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) setDragging(true);
    setCamera({
      ...dragRef.current.camera,
      x: Math.max(-W * 1.8, Math.min(W * 1.8, dragRef.current.camera.x + dx)),
      y: Math.max(-H * 1.8, Math.min(H * 1.8, dragRef.current.camera.y + dy)),
    });
  };
  const pointerUp = (event) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    clearTimeout(dragStopTimer.current);
    dragStopTimer.current = setTimeout(() => setDragging(false), 0);
  };
  const onMarkerKey = (event, item) => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      pick(item);
    }
  };
  const landmarkData = useMemo(
    () =>
      landmarks
        .filter((place) =>
          /archaeological|historic|monument|memorial|stadhuis|begijnhof|sint.pieter|universiteitsbibliotheek/i.test(
            `${place.kind} ${place.name}`,
          ),
        )
        .slice(0, 35),
    [],
  );
  return (
    <div
      data-focused={focused && !isCurrent ? "true" : "false"}
      data-maturity={stageKey}
      data-forecast-minute={forecastMinute}
      className={`city-map geo-map geo-stage-${stageKey.toLowerCase()} ${compact ? "geo-compact" : ""} ${mode === "heat" ? "geo-heat" : ""} ${dragging ? "geo-dragging" : ""} ${focused && !isCurrent ? "geo-focused" : ""} ${focusAnimating ? "geo-focusing" : ""}`}
    >
      <svg
        ref={svgRef}
        className="geo-map-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        role="group"
        aria-label={`Real OpenStreetMap geography of ${metadata.city}. ${stage.label}: ${stage.description} This is an illustrated capability view, not a verified inventory of Leuven systems. All operational layers are synthetic demonstration data.`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
      >
        <defs>
          <radialGradient id={id("background")}>
            <stop stopColor="#19333e" />
            <stop offset="1" stopColor="#0b1a23" />
          </radialGradient>
          <radialGradient id={id("pollution")}>
            <stop
              stopColor={pollutionImproving ? "#fbbf24" : "#fb7185"}
              stopOpacity={
                pollutionImproving ? 0.21 : 0.37 + 0.05 * forecastProgress
              }
            />
            <stop
              offset=".5"
              stopColor={pollutionImproving ? "#fbbf24" : "#fb7185"}
              stopOpacity=".12"
            />
            <stop offset="1" stopColor="#fb7185" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("heat")}>
            <stop stopColor="#fb7185" stopOpacity=".47" />
            <stop offset=".45" stopColor="#fbbf24" stopOpacity=".21" />
            <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={id("vignette")}>
            <stop offset=".35" stopColor="#050d12" stopOpacity="0" />
            <stop offset="1" stopColor="#050d12" stopOpacity=".54" />
          </radialGradient>
          <filter
            id={id("road-glow")}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <rect width={W} height={H} fill={url("background")} />
        <g
          transform={`translate(${camera.x} ${camera.y}) scale(${camera.zoom})`}
          className="geo-camera"
        >
          <GeographicBase perspective={perspective} labelPrefix={uid} />
          <g
            className={`geo-layer geo-heritage ${showHeritage ? "visible" : ""}`}
            aria-hidden={!showHeritage}
          >
            {historicAreas.map((area) => (
              <path
                key={area.id}
                d={polygonPath(area, perspective)}
                fillRule="evenodd"
                stroke="#a78bfa"
                strokeWidth="1.8"
                strokeDasharray="5 5"
                fill="#a78bfa"
                fillOpacity=".055"
              >
                <title>{`${area.name || "OSM historic feature"} · OpenStreetMap feature, not a legal protection boundary`}</title>
              </path>
            ))}
            {landmarkData.map((place) => {
              const [x, y] = project(place.point, perspective);
              return (
                <g key={place.id} transform={`translate(${x} ${y})`}>
                  <rect
                    x="-7"
                    y="-7"
                    width="14"
                    height="14"
                    rx="2"
                    fill="#a78bfa"
                    fillOpacity=".07"
                    stroke="#a78bfa"
                    strokeOpacity=".6"
                    strokeWidth="1"
                    transform="rotate(45)"
                  />
                  <circle r="2" fill="#a78bfa" />
                  <title>{`${place.name} · mapped historic feature`}</title>
                </g>
              );
            })}
          </g>
          {isMVP && (showTraffic || showAir || showSensors) && (
            <g
              className="geo-mvp-coverage"
              aria-label="Proposed MVP pilot coverage"
            >
              <ellipse
                cx={ix}
                cy={iy}
                rx="400"
                ry="400"
                fill="#38bdf8"
                fillOpacity=".014"
                stroke="#38bdf8"
                strokeOpacity=".24"
                strokeWidth="1.2"
                strokeDasharray="7 9"
              />
              <title>
                Illustrated priority-corridor coverage. Not an existing
                municipal service boundary.
              </title>
            </g>
          )}
          {!isCurrent && (
            <g
              className={`geo-layer geo-air ${showAir ? "visible" : ""}`}
              aria-hidden={!showAir}
            >
              <ellipse
                cx={
                  ix +
                  (scenario === "C" && improved ? 65 * forecastProgress : 0)
                }
                cy={iy + 15}
                rx={airWidth}
                ry={airHeight}
                fill={url("pollution")}
              />
              <ellipse
                cx={ix + 205}
                cy={iy + 130}
                rx={
                  improved
                    ? 140 - 65 * forecastProgress
                    : 140 + 40 * forecastProgress
                }
                ry={
                  improved
                    ? 85 - 35 * forecastProgress
                    : 85 + 25 * forecastProgress
                }
                fill={url("pollution")}
              />
            </g>
          )}
          {stage.availableLayers.includes("heat") && (
            <g
              className={`geo-layer geo-heat-overlay ${showHeat ? "visible" : ""}`}
              aria-hidden={!showHeat}
            >
              <ellipse
                cx={ix + 20}
                cy={iy + 35}
                rx="255"
                ry={perspective ? 140 : 195}
                fill={url("heat")}
              />
              <ellipse
                cx={ix - 245}
                cy={iy + 210}
                rx="165"
                ry="120"
                fill={url("heat")}
              />
              <ellipse
                cx={ix + 285}
                cy={iy - 110}
                rx="180"
                ry="120"
                fill={url("heat")}
              />
              <path
                d={`M${ix - 180},${iy - 85} C${ix - 80},${iy - 175} ${ix + 160},${iy - 100} ${ix + 195},${iy + 25} C${ix + 215},${iy + 155} ${ix - 110},${iy + 170} ${ix - 180},${iy - 85}Z`}
                fill="none"
                stroke="#fbbf24"
                strokeOpacity=".38"
                strokeDasharray="5 6"
              />
            </g>
          )}
          {!isCurrent && (
            <g
              className={`geo-layer geo-traffic-overlay ${showTraffic ? "visible" : ""}`}
              aria-hidden={!showTraffic}
            >
              {trafficView
                .filter((group) => !group.residential)
                .map((group) => (
                  <path
                    key={`glow-${group.color}`}
                    d={group.path}
                    fill="none"
                    stroke={group.color}
                    strokeWidth="11"
                    opacity=".09"
                    filter={url("road-glow")}
                  />
                ))}
              {trafficView.map((group) => (
                <path
                  key={`${group.color}:${group.residential}`}
                  className="geo-traffic-line"
                  d={group.path}
                  fill="none"
                  stroke={group.color}
                  strokeWidth={group.residential ? 1.25 : 2.7}
                  strokeOpacity={group.residential ? 0.36 : 0.88}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {!isMVP && improved && scenario === "C" && forecastMinute > 0 && (
                <path
                  className="geo-flow-dash"
                  d={mainRoads
                    .filter(
                      (road) => road.distance > 200 && road.distance < 600,
                    )
                    .slice(0, 18)
                    .map((road) =>
                      prepareView(perspective).roadPaths.get(road.id),
                    )
                    .join(" ")}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="3 11"
                />
              )}
            </g>
          )}
          {!isCurrent && focused && showTraffic && (
            <g
              className="geo-focus-corridors"
              aria-label="Affected incident corridors"
              pointerEvents="none"
            >
              <path
                d={trafficRoads
                  .filter((road) => road.distance < 340)
                  .map((road) =>
                    prepareView(perspective).roadPaths.get(road.id),
                  )
                  .join(" ")}
                fill="none"
                stroke={pollutionImproving ? "#38bdf8" : "#fb7185"}
                strokeWidth="3.3"
                strokeOpacity=".95"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}
          {showSensors && (
            <g className="geo-synthetic-sensors">
              {visibleSensors.map((sensor) => {
                const [x, y] = project(sensor.point, perspective);
                const item = {
                  ...sensor,
                  coordinates: sensor.point,
                  synthetic: true,
                };
                return (
                  <g
                    key={sensor.id}
                    transform={`translate(${x} ${y})`}
                    className={`geo-sensor geo-sensor-${sensor.type}`}
                    role="button"
                    tabIndex={compact ? -1 : 0}
                    aria-label={sensor.title}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      pick(item);
                    }}
                    onKeyDown={(event) => onMarkerKey(event, item)}
                  >
                    <circle
                      r="14"
                      fill="#091a24"
                      stroke="currentColor"
                      strokeOpacity=".6"
                      strokeWidth="1.2"
                    />
                    <circle
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity=".09"
                      className="geo-sensor-halo"
                    />
                    {sensor.type === "air" ? (
                      <path
                        d="M-6 -2H4Q8-2 6-6 M-6 3H1Q7 3 4 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    ) : sensor.type === "parking" ? (
                      <text
                        textAnchor="middle"
                        y="5"
                        fill="currentColor"
                        fontSize="13"
                        fontWeight="600"
                      >
                        P
                      </text>
                    ) : sensor.type === "cooling" ? (
                      <path
                        d="M0-8V8M-7-4L7 4M-7 4L7-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    ) : sensor.type === "offline" ? (
                      <path
                        d="M-5-5L5 5M-5 5L5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    ) : (
                      <>
                        <circle r="3" fill="currentColor" />
                        <path
                          d="M-7-4Q-10 0-7 4M7-4Q10 0 7 4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.3"
                        />
                      </>
                    )}
                    <text className="geo-sensor-id" y="30" textAnchor="middle">
                      {sensor.id}
                    </text>
                  </g>
                );
              })}
            </g>
          )}
          {!isCurrent && (
            <g
              transform={`translate(${ix} ${iy})`}
              className="geo-incident"
              role="button"
              tabIndex={compact ? -1 : 0}
              aria-label={`Select ${metadata.city} Historic Centre H-03 scenario`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                if (!dragging) pick(null);
              }}
              onKeyDown={(event) => onMarkerKey(event, null)}
            >
              <circle
                r="48"
                fill="none"
                stroke={pollutionImproving ? "#38bdf8" : "#fb7185"}
                strokeWidth="1"
                strokeOpacity=".3"
                className="geo-incident-pulse"
              />
              <circle
                r="23"
                fill={pollutionImproving ? "#38bdf8" : "#fb7185"}
                fillOpacity=".06"
                stroke={pollutionImproving ? "#38bdf8" : "#fb7185"}
                strokeOpacity=".45"
              />
              <path
                d="M-34 0H-19M19 0H34M0-34V-19M0 19V34"
                stroke={pollutionImproving ? "#38bdf8" : "#fb7185"}
                strokeOpacity=".6"
              />
              <circle
                r="5"
                fill={pollutionImproving ? "#38bdf8" : "#fb7185"}
                stroke="#101c25"
                strokeWidth="2"
              />
              <g transform="translate(0,53)">
                <rect
                  x="-95"
                  y="-4"
                  width="190"
                  height="49"
                  rx="4"
                  fill="#081721"
                  fillOpacity=".92"
                  stroke="#547080"
                  strokeOpacity=".36"
                />
                <text className="geo-zone-name" y="15">
                  GROTE MARKT
                </text>
                <text
                  className="geo-zone-status"
                  y="32"
                  fill={pollutionImproving ? "#38bdf8" : "#fb7185"}
                >
                  H-03 ·{" "}
                  {forecastMinute === 0
                    ? "CURRENT BASELINE"
                    : improved
                      ? scenario === "C"
                        ? "DIVERSION SCENARIO"
                        : "SIGNAL SCENARIO"
                      : "NO ACTION FORECAST"}
                </text>
              </g>
            </g>
          )}
        </g>
        <rect
          width={W}
          height={H}
          fill={url("vignette")}
          pointerEvents="none"
        />
      </svg>
      <div
        className="geo-provenance"
        aria-label="Leuven urban model provenance"
      >
        <strong>LEUVEN URBAN MODEL</strong>
        <span>Illustrative operational scenario</span>
        <span>Synthetic demonstration data</span>
      </div>
      <div
        className={`geo-time-state ${!isCurrent && forecastMinute ? "is-modelled" : "is-observed"} ${isCurrent ? "is-reference" : ""}`}
        role="status"
        aria-label={`${stage.label} map capability view`}
        title={`${stage.description} Illustrated capability, not a verified Leuven inventory.`}
      >
        <i />
        {isCurrent
          ? "CURRENT · REFERENCE INVENTORY"
          : `${stage.label} · ${forecastMinute ? `MODELLED +${forecastMinute} MIN` : "SYNTHETIC REPLAY NOW"}`}
        {isCurrent && <small>Illustrative baseline · no connected feeds</small>}
      </div>
      {!isCurrent && focused && !compact && (
        <button className="geo-clear-focus" onClick={clearIncidentFocus}>
          <LocateFixed size={12} />
          Show whole city
        </button>
      )}
      {!compact && (
        <>
          <div className="geo-map-heading">
            <span>
              <i />
              REAL OPENSTREETMAP GEOGRAPHY
            </span>
            <small>{selectedBaseLabel}</small>
          </div>
          <div className="geo-north" title="Geographic north">
            <Navigation size={17} />
            <span>N</span>
          </div>
          <div className="geo-map-tools" aria-label="Map view controls">
            <button
              aria-label="Zoom in"
              title="Zoom in"
              onClick={() => zoomAt(1.2)}
            >
              <Plus size={16} />
            </button>
            <button
              aria-label="Zoom out"
              title="Zoom out"
              onClick={() => zoomAt(1 / 1.2)}
            >
              <Minus size={16} />
            </button>
            <button
              aria-label="Reset map view"
              title="Reset map view"
              onClick={clearIncidentFocus}
            >
              <LocateFixed size={16} />
            </button>
            <button
              className={perspective ? "is-on" : ""}
              aria-label={
                perspective ? "Show 2D map" : "Show mapped 3D building heights"
              }
              title={
                canUse3d
                  ? "2D / mapped building heights"
                  : "Mapped-height 3D is illustrated in TARGET"
              }
              disabled={!canUse3d}
              aria-pressed={perspective}
              onClick={() => setPerspective((value) => !value)}
            >
              {perspective ? "3D" : "2D"}
            </button>
            <button
              aria-label="Map data sources"
              title="Map data sources"
              aria-expanded={sourceOpen}
              onClick={() => setSourceOpen((value) => !value)}
            >
              <Info size={15} />
            </button>
          </div>
          <div className="geo-map-scale">
            <i
              style={{
                width: `${Math.max(36, Math.min(155, baseScaleWidth))}px`,
              }}
            />
            <span>
              {baseScaleWidth > 155
                ? Math.round((groundScaleMetres * 155) / baseScaleWidth)
                : baseScaleWidth < 36
                  ? Math.round((groundScaleMetres * 36) / baseScaleWidth)
                  : groundScaleMetres}{" "}
              m
            </span>
          </div>
          <a
            className="geo-attribution"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors · ODbL
            <ArrowUpRight size={9} />
          </a>
        </>
      )}
      {!compact && sourceOpen && (
        <aside
          className="geo-source-panel"
          role="region"
          aria-label="Map data provenance"
        >
          <button
            className="geo-popover-close"
            aria-label="Close map data sources"
            onClick={() => setSourceOpen(false)}
          >
            <X size={15} />
          </button>
          <span className="geo-source-overline">GEOGRAPHY / OPERATIONS</span>
          <h3>A real city. An illustrative scenario.</h3>
          <div className="geo-stage-explanation">
            <strong>
              {stage.label} · {stage.shortLabel}
            </strong>
            <p>{stage.description}</p>
            <small>
              Illustrated capability view, not a verified inventory of Leuven
              systems.
            </small>
          </div>
          <p>
            Street geometry, building footprints, green spaces and waterways
            come from OpenStreetMap.
          </p>
          <dl>
            <div>
              <dt>Geographic model</dt>
              <dd>
                {metadata.city}, {metadata.country || "Belgium"}
              </dd>
            </div>
            <div>
              <dt>Snapshot</dt>
              <dd>{snapshotDate}</dd>
            </div>
            <div>
              <dt>Building footprints</dt>
              <dd>{buildings.length.toLocaleString("en-GB")}</dd>
            </div>
            <div>
              <dt>Height-tagged buildings</dt>
              <dd>{mappedHeightCount.toLocaleString("en-GB")}</dd>
            </div>
          </dl>
          <p>
            Only recorded OSM height tags are extruded. Buildings without mapped
            heights stay flat. This is not a surveyed, complete as-built 3D city
            model.
          </p>
          <p className="geo-synthetic-note">
            <Radio size={14} />
            All sensor positions, readings, heat-risk surfaces, traffic states
            and interventions are synthetic demonstration layers. Historic
            features are OSM references, not legal protection boundaries.
          </p>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap data · ODbL 1.0
            <ArrowUpRight size={12} />
          </a>
          <a
            href={`${import.meta.env?.BASE_URL || "/"}${metadata.downloadUrl}`}
            download
          >
            Download geographic extract
            <ArrowUpRight size={12} />
          </a>
        </aside>
      )}
      {!isCurrent && !compact && selected && (
        <aside className="geo-sensor-panel" role="status">
          <button
            className="geo-popover-close"
            aria-label="Close sensor details"
            onClick={() => setSelected(null)}
          >
            <X size={14} />
          </button>
          <span className="geo-source-overline">
            ILLUSTRATIVE OPERATIONAL SCENARIO
          </span>
          <h3>{selected.title}</h3>
          <strong>{selected.value}</strong>
          <p>{selected.note}</p>
          <small>{pointLabel(selected.point || selected.coordinates)}</small>
          <span className="geo-sensor-disclaimer">
            Synthetic demonstration data · no physical device is represented.
          </span>
        </aside>
      )}
    </div>
  );
}

const mapLayerKeys = ["traffic", "air", "heat", "heritage", "sensors"];
export default memo(
  CityMap,
  (previous, next) =>
    previous.mode === next.mode &&
    previous.maturity === next.maturity &&
    previous.viewResetToken === next.viewResetToken &&
    previous.scenario === next.scenario &&
    previous.after === next.after &&
    previous.compact === next.compact &&
    previous.comparison === next.comparison &&
    previous.onSelect === next.onSelect &&
    previous.focused === next.focused &&
    previous.focusRequest === next.focusRequest &&
    previous.onClearFocus === next.onClearFocus &&
    previous.forecastOffset === next.forecastOffset &&
    previous.camera === next.camera &&
    previous.onCameraChange === next.onCameraChange &&
    previous.viewMode === next.viewMode &&
    previous.onViewModeChange === next.onViewModeChange &&
    mapLayerKeys.every((key) =>
      key === "heat"
        ? (previous.layers?.heat === true) === (next.layers?.heat === true)
        : (previous.layers?.[key] !== false) === (next.layers?.[key] !== false),
    ),
);
