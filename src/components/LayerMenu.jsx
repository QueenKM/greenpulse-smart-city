import { useEffect, useId, useRef, useState } from "react";
import {
  CarFront,
  Check,
  ChevronDown,
  Layers3,
  Landmark,
  Radio,
  ThermometerSun,
  Wind,
} from "lucide-react";
import "./LayerMenu.css";

const layerOptions = [
  {
    key: "traffic",
    name: "Traffic",
    Icon: CarFront,
    tone: "cyan",
    stage: "MVP",
    description: "Synthetic road speeds and congestion.",
    unavailable: "Priority traffic workflow becomes available in MVP.",
  },
  {
    key: "air",
    name: "Air Quality",
    Icon: Wind,
    tone: "cyan",
    stage: "MVP",
    description: "Synthetic air-monitoring observations.",
    unavailable: "Priority air-monitoring sources connect in MVP.",
  },
  {
    key: "heat",
    name: "Urban Heat",
    Icon: ThermometerSun,
    tone: "amber",
    stage: "TARGET",
    description: "Modelled heat risk and cooling coverage.",
    unavailable: "Heat-risk modelling is a target-state capability.",
  },
  {
    key: "heritage",
    name: "Heritage",
    Icon: Landmark,
    tone: "purple",
    stage: "CURRENT",
    description: "Historic-centre reference geography.",
    unavailable: "Reference geography is unavailable in this view.",
  },
  {
    key: "sensors",
    name: "Sensors",
    Icon: Radio,
    tone: "cyan",
    stage: "MVP",
    description: "Synthetic monitoring-source locations.",
    unavailable: "Connected monitoring sources become available in MVP.",
  },
];

const policyLayers = {
  CURRENT: ["heritage"],
  MVP: ["traffic", "air", "heritage", "sensors"],
  TARGET: ["traffic", "air", "heat", "heritage", "sensors"],
};

export default function LayerMenu({
  layers,
  setLayers,
  maturity = "TARGET",
  availableLayers,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const panelId = useId();
  const currentMaturity = String(maturity).toUpperCase();
  const allowedLayers =
    availableLayers ??
    (Object.hasOwn(policyLayers, currentMaturity)
      ? policyLayers[currentMaturity]
      : policyLayers.TARGET);
  const activeCount = layerOptions.filter(
    ({ key }) => allowedLayers.includes(key) && layers[key],
  ).length;

  useEffect(() => {
    if (!open) return undefined;
    const handleOutside = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open]);

  return (
    <div
      className={`layer-menu${open ? " layer-menu-open" : ""}`}
      ref={menuRef}
      data-presentation-shortcuts="off"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        className="layer-menu-trigger"
        type="button"
        ref={triggerRef}
        aria-label="Layers"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Layers3 size={15} aria-hidden="true" />
        <span>Layers</span>
        <span className="layer-menu-count" aria-hidden="true">
          {activeCount}
        </span>
        <ChevronDown
          className="layer-menu-chevron"
          size={13}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          className="layer-menu-panel"
          id={panelId}
          role="group"
          aria-label="Map layers"
          data-presentation-shortcuts="off"
        >
          <div className="layer-menu-heading">
            <span>MAP LAYERS</span>
            <small>{activeCount} active</small>
          </div>
          <div className="layer-menu-options">
            {layerOptions.map(
              ({ key, name, Icon, tone, stage, description, unavailable }) => {
                const available = allowedLayers.includes(key);
                const active = available && !!layers[key];
                const descriptionId = `${panelId}-${key}-description`;
                return (
                  <button
                    type="button"
                    key={key}
                    className={`layer-menu-option layer-menu-tone-${tone}${active ? " is-active" : ""}`}
                    aria-label={name}
                    aria-pressed={active}
                    aria-describedby={descriptionId}
                    disabled={!available}
                    onClick={() => {
                      if (available)
                        setLayers((value) => ({
                          ...value,
                          [key]: !value[key],
                        }));
                    }}
                  >
                    <span className="layer-menu-option-icon">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span className="layer-menu-option-copy">
                      <span className="layer-menu-option-name">
                        {name}
                        {!available && (
                          <small className="layer-menu-stage">{stage}</small>
                        )}
                      </span>
                      <small id={descriptionId}>
                        {available ? description : unavailable}
                      </small>
                    </span>
                    <span className="layer-menu-check" aria-hidden="true">
                      {active && <Check size={11} strokeWidth={2.5} />}
                    </span>
                  </button>
                );
              },
            )}
          </div>
          <p className="layer-menu-note">
            {currentMaturity === "CURRENT"
              ? "Current inventory · geographic reference only"
              : "Operational overlays use synthetic demonstration data."}
          </p>
        </div>
      )}
    </div>
  );
}
