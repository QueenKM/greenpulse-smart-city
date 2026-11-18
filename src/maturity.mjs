// Illustrated capability views, not a verified inventory of Leuven's systems.
export const MATURITY_MAP_STAGES = {
  CURRENT: {
    label: "CURRENT",
    shortLabel: "Reference inventory",
    description:
      "Reference geography and an illustrative inventory baseline. No connected operational feeds are shown.",
    availableLayers: ["heritage"],
    viewMode: "2d",
  },
  MVP: {
    label: "MVP",
    shortLabel: "Priority corridor",
    description:
      "PILOT: counts and queue patterns at selected monitoring points; timestamp linkage must be validated for corridor travel time.",
    availableLayers: ["traffic", "heritage", "sensors"],
    viewMode: "2d",
  },
  TARGET: {
    label: "TARGET",
    shortLabel: "Integrated urban model",
    description:
      "TARGET: selective synthetic modelling and environmental layers after data validation; no connected municipal systems.",
    availableLayers: ["traffic", "air", "heat", "heritage", "sensors"],
    viewMode: "3d",
  },
};

export function resolveMapLayers(layers = {}, maturity = "TARGET") {
  const stage =
    typeof maturity === "string" && Object.hasOwn(MATURITY_MAP_STAGES, maturity)
      ? MATURITY_MAP_STAGES[maturity]
      : MATURITY_MAP_STAGES.TARGET;
  return Object.fromEntries(
    ["traffic", "air", "heat", "heritage", "sensors"].map((key) => [
      key,
      stage.availableLayers.includes(key) &&
        (key === "heat" ? layers.heat === true : layers[key] !== false),
    ]),
  );
}
