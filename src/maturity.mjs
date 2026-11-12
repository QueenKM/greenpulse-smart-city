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
      "A proposed traffic and air-quality workflow with limited corridor and monitoring coverage.",
    availableLayers: ["traffic", "air", "heritage", "sensors"],
    viewMode: "2d",
  },
  TARGET: {
    label: "TARGET",
    shortLabel: "Integrated urban model",
    description:
      "An integrated city view with multi-domain layers and mapped-height 3D modelling.",
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
