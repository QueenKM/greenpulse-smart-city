// Synthetic demonstration assumptions, shared by every visualisation.
// These are not a calibrated forecast or a scoring model validated for Leuven.
export const FORECAST_MINUTES = [0, 15, 30, 60];
export const SCORE_WEIGHTS = [
  { label: "Environmental impact", weight: 30 },
  { label: "Mobility impact", weight: 25 },
  { label: "Accessibility", weight: 20 },
  { label: "Historic compatibility", weight: 10 },
  { label: "Implementation feasibility", weight: 15 },
];

export function calculateDecisionScore(scores) {
  return Math.round(
    scores.reduce(
      (sum, value, i) => sum + (value * SCORE_WEIGHTS[i].weight) / 100,
      0,
    ),
  );
}

const endpoints = {
  A: { congestion: 87, pm: 34, travel: 33, speed: 13 },
  B: { congestion: 66, pm: 29, travel: 25, speed: 23 },
  C: { congestion: 61, pm: 28, travel: 23, speed: 25 },
};
const baseline = { congestion: 72, pm: 27, travel: 28, speed: 19 };
const noActionCongestion = [
  [0, 72],
  [15, 76],
  [30, 80],
  [38, 82],
  [60, 87],
];

export function getForecast(minutes = 0, scenario = "A") {
  const offset = Math.max(0, Math.min(60, Number(minutes) || 0));
  const end = endpoints[scenario] || endpoints.A;
  const ratio = offset / 60;
  const result = Object.fromEntries(
    Object.keys(baseline).map((key) => [
      key,
      Math.round((baseline[key] + (end[key] - baseline[key]) * ratio) * 10) /
        10,
    ]),
  );
  if (scenario === "A") {
    const index = noActionCongestion.findIndex((point) => point[0] >= offset);
    const right = noActionCongestion[Math.max(0, index)];
    const left = noActionCongestion[Math.max(0, index - 1)];
    result.congestion =
      Math.round(
        (right[0] === left[0]
          ? right[1]
          : left[1] +
            ((right[1] - left[1]) * (offset - left[0])) /
              (right[0] - left[0])) * 10,
      ) / 10;
  }
  return result;
}
export const getForecastAt = getForecast;
