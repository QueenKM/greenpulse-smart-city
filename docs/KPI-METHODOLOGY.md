# GreenPulse KPI and decision methodology

GreenPulse is a target-state operating-model prototype. Its operational feeds, incidents, forecasts, intervention effects and measured outcomes are synthetic demonstrations. No Leuven municipal systems are connected. Real OpenStreetMap geography supplies spatial context; it does not validate any operational value or model.

This document separates what the code calculates from what a future city implementation would need to establish. Proposed definitions, data requirements, thresholds and ownership below are design proposals, not an inventory of Leuven's current capabilities.

## 1. What the prototype calculates

The forecast in [src/scenario.mjs](../src/scenario.mjs) interpolates between declared synthetic baseline and endpoint assumptions. It is not a traffic-assignment, queueing, emissions or atmospheric-dispersion model.

For most values, an offset `t` between 0 and 60 minutes uses:

```text
value(t) = baseline + (endpoint − baseline) × t / 60
```

Values are rounded to one decimal place. The no-action congestion path uses piecewise linear interpolation through the explicit anchors `(0,72), (15,76), (30,80), (38,82), (60,87)`. Thus the displayed 82% in 38 minutes is an assumed anchor, not a result learned from municipal data. Selecting Now, +15, +30 or +60 minutes changes the point on these synthetic paths.

| Quantity              | Synthetic baseline | A: no action, +60 min | B: adaptive signals, +60 min | C: diversion, +60 min |
| --------------------- | -----------------: | --------------------: | ---------------------------: | --------------------: |
| Congestion index      |                72% |                   87% |                          66% |                   61% |
| PM2.5 concentration   |           27 µg/m³ |              34 µg/m³ |                     29 µg/m³ |              28 µg/m³ |
| Travel time           |             28 min |                33 min |                       25 min |                23 min |
| Average traffic speed |            19 km/h |               13 km/h |                      23 km/h |               25 km/h |

The scenarios compare alternatives at the same future horizon. For example, B's congestion advantage over A is `87 − 66 = 21 percentage points`. Relative to A, that is `21 / 87 × 100 ≈ 24.1%`. Relative to the current 72% baseline, B's endpoint represents `6 / 72 × 100 ≈ 8.3%`. These are different comparisons and must retain their denominator and horizon labels.

## 2. Proposed operational KPI dictionary

All windows, quality gates and owners in this table are proposed. They would require agreement with actual data owners, legal review where relevant, and field validation before use.

| KPI                   | Proposed definition and source                                                                                                                                                                                                                  | Proposed window and quality rule                                                                                                                                                                                                                                                                                                   | Proposed accountable owner                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Congestion index (%)  | `100 × congested valid lane-time samples / all valid lane-time samples` from traffic detectors or suitable aggregated probe data. A candidate congestion condition is speed below 60% of a declared, street-specific reference free-flow speed. | Trailing 5 minutes, 30-second lane-time slots. Freeze and document the road set, lane weights, speed threshold and reference-speed method. Require at least 80% expected coverage; exclude stale, invalid and maintenance samples. Thresholds need local calibration.                                                              | Mobility Operations, with a named traffic-data steward.                       |
| Average speed (km/h)  | Weighted mean `Σ(wᵢvᵢ) / Σwᵢ` over valid observations. Vehicle-count weights give a vehicle-weighted mean; lane-time weights give a different statistic and must be named.                                                                      | Same declared corridor and 5-minute window as the congestion view. Traffic freshness target ≤60 seconds. Publish coverage and weighting; do not average sensor averages without their weights.                                                                                                                                     | Mobility Operations.                                                          |
| PM2.5 (µg/m³)         | Quality-controlled, time-weighted ambient concentration `Σ(cᵢΔtᵢ) / ΣΔtᵢ` at a named station. Any multi-station aggregation needs a declared spatial weighting rule.                                                                            | Proposed 60-minute evaluation means; the operational display may use a shorter, clearly labelled rolling mean. Proposed freshness target ≤120 seconds for a streaming feed. Flag calibration, humidity sensitivity, outliers and missing coverage. Do not treat a short reading as a statutory daily or annual compliance measure. | Environment, with the air-quality data steward.                               |
| NO₂ (µg/m³)           | Quality-controlled ambient station concentration, with the same explicit time and spatial aggregation principles as PM2.5.                                                                                                                      | Forecast escalation at >60 µg/m³ is a proposed operational review trigger, not a claimed legal limit. Require a validated forecast, defined averaging period and confidence handling before real deployment.                                                                                                                       | Environment; Mobility Operations receives the escalation.                     |
| Travel time (min)     | Mean or median observed end-to-end duration of completed trips over a fixed origin–destination corridor. Declare which statistic is used; weight a mean by completed trips.                                                                     | Compare matched 60-minute periods with adequate completed-trip counts. Show sample count and uncertainty. Minimise and aggregate personal-location data; retain no identifiable trip traces in the command view.                                                                                                                   | Mobility Operations, supported by the data-protection function.               |
| Parking occupancy (%) | Occupied valid spaces divided by available monitored spaces, with closed spaces excluded from the denominator.                                                                                                                                  | Proposed freshness ≤60 seconds; record monitored capacity, closures and sensor coverage.                                                                                                                                                                                                                                           | Parking Operations.                                                           |
| Cooling coverage (%)  | Share of the declared exposed population able to reach a verified, open, accessible cooling point within a declared walking-time threshold. This requires a network accessibility analysis, not a radius around a marker.                       | Proposed 10-minute walking threshold and current opening/capacity information. Validate routes, step-free access, vulnerable-population assumptions and privacy protections. The displayed 62%→81% is a synthetic assumption.                                                                                                      | Climate/Public Health lead, supported by Social Services and facility owners. |

For the proposed congestion definition, 36 congested samples out of 50 valid lane-time samples produce `36 / 50 × 100 = 72%`. This means 72% of valid sampled lane-time was classified as congested. It does **not** mean 72% of vehicles, residents or the entire city are congested. Fifty samples are an arithmetic illustration, not evidence that such a source currently exists.

Feed availability and KPI quality are separate. The prototype's 14/17 feed count excludes T18 maintenance, AQ-07 offline and delayed Visitor Flow. Historic GIS is reference data, outside that denominator. A healthy feed can still have insufficient corridor coverage; a 96% demonstration quality indicator is not proof of statistical validity.

## 3. Why a traffic intervention could change these KPIs

The proposed causal chain is:

```text
signal coordination + appropriate route guidance
→ changed arrivals, queues and stop–start driving
→ changed waiting time, completed-trip travel time and fuel use
→ potentially changed tailpipe emissions
→ potentially changed ambient concentrations after dispersion and background effects
```

Each arrow needs evidence. Signal changes may move queues to another junction, disadvantage pedestrians or buses, or divert traffic into sensitive streets. Reduced stop–start driving does not establish the size of an emissions reduction. Ambient PM2.5 also depends on weather, regional background, fleet composition, non-exhaust wear, resuspension, heating and other sources. An 8% PM2.5 improvement cannot be derived directly from a 12% congestion improvement.

A real forecast would need calibrated traffic flows and signal plans, vehicle/fleet and emissions factors, meteorology, background concentrations and an appropriate dispersion or empirically validated concentration model. A credible evaluation would compare matched periods and, where feasible, a control corridor or defensible counterfactual; report weather, demand, coverage and uncertainty. A simple before/after difference alone does not establish causation.

General methodological support comes from FHWA guidance on [travel-time, speed, data requirements and evaluation baselines](https://ops.fhwa.dot.gov/publications/fhwahop13031/chap4.htm), FHWA's description of [adaptive signal control mechanisms](https://www.fhwa.dot.gov/innovation/everydaycounts/edc-1/asct.cfm), and EEA explanations of [pollutant sources and concentration drivers](https://www.eea.europa.eu/en/analysis/publications/air-quality-in-europe-2021/sources-and-emissions-of-air-pollutants-in-europe). These sources support the proposed measurement and causal reasoning; they do not validate any GreenPulse number or promise an effect in Leuven.

## 4. Decision-score calculation

The decision score is a transparent, illustrative weighted comparison. It is neither a probability of success nor an empirically validated municipal utility function. Stakeholders would need to agree the criteria, scoring rubrics and weights; accessibility and heritage/legal constraints may also require hard exclusion gates that no high weighted score can override.

| Criterion                  |   Weight | Scenario B input (0–100) | Weighted contribution |
| -------------------------- | -------: | -----------------------: | --------------------: |
| Environmental impact       |      30% |                       91 |                 27.30 |
| Mobility impact            |      25% |                       88 |                 22.00 |
| Accessibility              |      20% |                       94 |                 18.80 |
| Historic compatibility     |      10% |                      100 |                 10.00 |
| Implementation feasibility |      15% |                       63 |                  9.45 |
| **Total**                  | **100%** |                          |    **87.55 → 88/100** |

Higher implementation feasibility means easier delivery. Every criterion input above is a synthetic assumption. The arithmetic is reproducible; the assumed scores and weighting policy remain unvalidated. Scenario B is recommended because the demonstration assigns it a high combined benefit with low accessibility impact and full historic compatibility, while C has stronger traffic reduction but greater trade-offs. This does not prove B is the best real-world intervention.

## 5. Closed-loop impact: a separate synthetic illustration

**The scenario forecast and the KPI & Impact benchmark use different comparators. They are not one calibrated experimental run.** The scenario table compares alternative +60-minute outcomes; the impact screen separately illustrates predicted-versus-observed improvement against a declared pre-intervention baseline. Do not use the A/B/C endpoints to derive the impact-screen percentages.

For the impact illustration:

```text
improvement (%) = 100 × (baseline − after) / baseline
after = baseline × (1 − improvement / 100)
absolute prediction error (percentage points) = |predicted improvement − actual improvement|
```

| KPI         | Demonstration baseline | Predicted improvement | Implied predicted after | Synthetic actual improvement | Implied synthetic actual after | Absolute error |
| ----------- | ---------------------: | --------------------: | ----------------------: | ---------------------------: | -----------------------------: | -------------: |
| Congestion  |                    72% |                   12% |                  63.36% |                        10.8% |                        64.224% |         1.2 pp |
| PM2.5       |               27 µg/m³ |                    8% |             24.84 µg/m³ |                         7.1% |                   25.083 µg/m³ |         0.9 pp |
| Travel time |                 28 min |                   14% |               24.08 min |                        12.6% |                     24.472 min |         1.4 pp |

Worked example: `100 × (72 − 64.224) / 72 = 10.8%` congestion improvement. The congestion index fell by **7.776 percentage points**, from 72% to 64.224%; its **relative improvement is 10.8%**. Predicted improvement was 12%, so the prediction error is `|12 − 10.8| = 1.2 percentage points`.

The displayed average absolute prediction error is `(1.2 + 0.9 + 1.4) / 3 = 1.1667`, rounded to **1.2 percentage points**. It averages errors in the three percentage-improvement predictions; it does not average raw concentrations, minutes and congestion levels. It is not a model-validation result, confidence interval or relative percentage error.

The app labels these outcomes MEASURED only after an approved intervention is closed and a visible five-second accelerated replay represents a proposed 60-minute observation window. “Actual” here means synthetic observation, not a real municipal measurement. Modified intervention settings are logged; the benchmark impact values remain fixed and are not recomputed by a physical model.

## 6. Feasibility and governance before a real pilot

Start with one corridor and a read-only data-quality/forecasting pilot. Verify source access, ownership, timestamp alignment, sensor calibration, legal signal-control authority, protected-street constraints and operator procedures. Establish a baseline and an evaluation plan before changing traffic signals. Use existing safe signal controllers and rollback plans; a web prototype must not directly control street infrastructure.

The proposed approval gate records an identified operator, Mobility Operations as owner, Environment as supporting department, duration and the proposed escalation trigger. A real deployment also needs authenticated roles, permission checks, change approval, tamper-resistant audit retention, fail-safe behaviour, incident response and data-protection review. AI can recommend; an authorised human must approve activation. Closing begins measurement; it must not declare success automatically. Model updates after evaluation need their own versioning and review.

## Sources and reproducibility

- [Project README](../README.md): scope, operating instructions and verification limits.
- [Forecast assumptions and score weights](../src/scenario.mjs), [Digital Twin calculation](../src/components/DigitalTwin.jsx), [impact presentation](../src/components/DomainScreens.jsx), and [lifecycle gates](../src/lifecycle.mjs): implementation evidence, not external validation.
- [OpenStreetMap attribution](https://www.openstreetmap.org/copyright) and [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/): geography provenance and database licence. The bundled [city-model database](../src/data/city-model.json) is geographic source material, not a source for operational KPIs.
- [FHWA evaluation guidance, chapter 4](https://ops.fhwa.dot.gov/publications/fhwahop13031/chap4.htm): general performance-measure, data and baseline guidance.
- [FHWA adaptive signal control technology](https://www.fhwa.dot.gov/innovation/everydaycounts/edc-1/asct.cfm): general mechanism for adapting signals and reducing stops/delay, not a basis for the prototype's assumed percentages.
- [EEA: sources and emissions of air pollutants](https://www.eea.europa.eu/en/analysis/publications/air-quality-in-europe-2021/sources-and-emissions-of-air-pollutants-in-europe) and [many factors contribute to air pollution](https://www.eea.europa.eu/en/analysis/maps-and-charts/many-factors-contribute-to-air-1): general context for emissions, transport, meteorology and concentrations.

Tartu, Leuven and Pavia themes in the evidence drawer are design interpretations. They are not empirical evidence for the forecast, score weights, claimed intervention effect or current municipal integration.
