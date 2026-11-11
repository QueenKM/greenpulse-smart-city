# GreenPulse: a 15-minute method and results presentation

The strongest argument is a clear, accountable decision method: detect a pressure, inspect its evidence and assumptions, compare options, obtain human approval, then evaluate an outcome. Present the prototype as a proposed operating model, not as proof that Leuven already has this capability or that the intervention has achieved these effects.

## Opening statement

> GreenPulse proposes how a city could progress from fragmented systems toward a shared decision process. The map uses real OpenStreetMap geography of Leuven. Every operational reading, sensor placement, forecast, intervention and measured result in this demonstration is synthetic. Today I will show the method, one reproducible KPI calculation, the human approval gate, and what would be needed to test this in practice.

Leave the target-state and synthetic-data labels visible. “LIVE” means the synthetic operational replay, not a connection to a real municipal source. Use MODELLED for the forecast, SIMULATED for intervention alternatives and MEASURED only for the completed synthetic evaluation.

## Fifteen-minute running order

| Time        | Focus                        | What to show and explain                                                                                                                                                                                                                                                        |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–1:00   | Problem and scope            | Overview. Explain fragmented sources, manual coordination and the target-state proposal. State the synthetic-data boundary once, clearly.                                                                                                                                       |
| 1:00–3:00   | Method                       | Briefly show the maturity toggle and Data Health. Explain source ownership, freshness and quality before forecasting. Explain the proposed congestion definition and the distinction between feed availability and sufficient spatial coverage.                                 |
| 3:00–5:00   | One KPI, worked              | Use congestion only: 36/50 valid lane-time samples gives 72%. Explain the threshold and window are proposed and need calibration. Show the forecast timeline and state that the current prototype interpolates declared assumptions; it does not run a validated traffic model. |
| 5:00–9:30   | Decision demonstration       | Use Presentation Demo: alert → evidence → prediction → scenarios → explicit approval → intervention → measurement. Explain the B score briefly and show the before/after divider. Spend time on the decision, not every navigation item.                                        |
| 9:30–11:30  | Results and interpretation   | On KPI & Impact, show the congestion worked example and the 1.2 pp average-error calculation. Explain that these are separate synthetic closed-loop examples, not values derived from the scenario endpoints. Discuss what causal evidence is missing.                          |
| 11:30–13:30 | Feasibility and governance   | Show one approval record and the roadmap. Identify the operational owner, supporting department, rollback and escalation responsibilities, and a realistic first-corridor pilot. Distinguish a prototype from an operational control system.                                    |
| 13:30–15:00 | Contribution and limitations | State what the prototype demonstrates: an intelligible, human-led operating workflow. State what remains unproven: calibrated forecasts, causal impact, integration feasibility and operational performance. End with the pilot/evaluation proposal.                            |

If running late, omit heat and detailed benchmark discussion. Preserve the KPI example, human decision gate and honest interpretation of results.

## A compact demonstration script

### Alert and evidence

Start **Presentation Demo** from Overview. Allow its geographic views to prepare. Fullscreen is optional; if the browser declines it, continue with the guided in-page mode. Use **Next Step** or the arrow-key controls; approval still requires its explicit action.

> The historic-centre incident combines mobility and air-quality pressure. These readings would need source-specific freshness and quality checks. Fourteen of seventeen operational feeds are current in this synthetic case; the missing three are maintenance, offline air quality and delayed visitor flow. That does not establish that the whole road network is adequately sampled.

Show evidence briefly. Benchmark-city themes explain design choices; they do not validate the effects or establish that these integrations exist in Leuven. Continue with **Next Step** in the evidence drawer.

### Prediction and scenarios

> The timeline lets an operator inspect a common forecast horizon across the views. In this prototype, the trajectories are explicit assumptions joined by interpolation. A real system would need calibrated traffic and environmental models, historical evaluation and uncertainty estimates.

Show +60 minutes and the A/B/C comparison. Use the divider once; avoid spending time adjusting the camera.

> At the same +60-minute horizon, A assumes 87% congestion and B assumes 66%: a 21-percentage-point advantage over no action. This is a synthetic alternative comparison, not an observed improvement. C offers more traffic reduction but larger accessibility trade-offs. B receives 88/100 under the declared weighting policy.

Open **How is this calculated?** if time allows. One sentence is enough:

> Thirty percent environment, twenty-five mobility, twenty accessibility, ten historic compatibility and fifteen implementation feasibility give B a weighted sum of 87.55, rounded to 88. The arithmetic is transparent; the criterion inputs and policy weights still require validation and stakeholder agreement.

### One governance gate

Open **Review & approve**. Point to the operator and owner before clicking anything.

> The model cannot execute an action. Control Room Operator #02 reviews the evidence and constraints; Mobility Operations owns delivery, with Environment supporting. Approval records the duration and escalation condition. The proposed NO₂ threshold is an operational review trigger, not a claimed statutory limit.

Click **Approve & Activate** explicitly. The scenario remains a recommendation until that click. Show Pause/Resume or Handover only if useful; one control is enough to establish human accountability. Explain that street deployment would also require authenticated roles, controller integration, safety constraints and rollback procedures that this prototype does not implement.

### Close, measure, interpret

Proceed to the final presentation step or close the intervention with **Close & measure**. The system first displays **MEASURING OUTCOME**. Let the five-second replay complete.

> Closing does not establish success. This accelerated replay represents a proposed 60-minute observation window. The subsequent “actual” values are synthetic observations used to explain evaluation.

Use one worked result:

> For the separate impact illustration, congestion begins at 72%. A synthetic after-value of 64.224% gives `(72 − 64.224) / 72 × 100 = 10.8%` relative improvement. That is a 7.776-percentage-point change in the congestion index. Against a predicted 12% improvement, the error is 1.2 percentage points.

Then state the comparator boundary:

> The impact illustration is separate from the A/B/C +60-minute endpoints. They are not one calibrated experiment, and the impact percentages are not calculated from those endpoints. Across congestion, PM2.5 and travel time, the demonstration averages absolute improvement errors of 1.2, 0.9 and 1.4 percentage points to 1.1667, displayed as 1.2 pp.

## Method, results and limitations to defend

| Likely question                          | Defensible answer                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “What is your method?”                   | A proposed closed-loop operating workflow: define sources and quality gates, describe a forecast horizon and assumptions, compare constrained alternatives, record human approval, then evaluate outcomes against a declared comparator. The application demonstrates this method interactively.                                                                                             |
| “How is congestion calculated?”          | The proposed index is the share of valid lane-time samples below a declared speed/reference-speed threshold. In the example, 36/50 = 72%. Window, road set, sample validity, weights and threshold must be documented and calibrated. It is not a share of all citizens or vehicles.                                                                                                         |
| “Why would signals improve air quality?” | Better coordination can change queues, idling and stop–start driving, affecting fuel use and emissions. Ambient concentration additionally depends on weather, background, fleet and non-traffic sources. A specific PM2.5 reduction requires dispersion or empirical evaluation; it cannot be inferred proportionally from congestion.                                                      |
| “Is 88 a proven optimal score?”          | No. It is a reproducible weighted sum of synthetic criterion inputs. Weights express a proposed policy preference. A pilot needs agreed rubrics, sensitivity analysis, and hard safety/accessibility/heritage constraints.                                                                                                                                                                   |
| “What are the results?”                  | The implemented result is an end-to-end decision prototype with explicit lifecycle gates, comparison tools and visible model assumptions. The numerical impact and prediction-error values illustrate evaluation; they are not measured city benefits or model-validation findings. Automated state/DOM checks do not prove browser layout, usability or real-world operational performance. |
| “Can this be deployed now?”              | Not as a street-control system. Begin with a read-only, single-corridor pilot; secure data access and ownership, validate coverage and forecasts, establish an evaluation baseline, then consider a supervised and reversible intervention with the authorised operations team.                                                                                                              |
| “Who is responsible if it fails?”        | The authorised municipal service owns the intervention, with named operators and supporting specialists. Real deployment requires role-based authority, escalation, rollback, audit retention and incident response. AI advice does not transfer accountability away from that governance structure.                                                                                         |

## A realistic next research step

Propose one corridor, one KPI and one explicit decision gate. Inventory real sources and their contracts; synchronise and assess data; agree a congestion definition and baseline; validate a forecast out of sample; then run a supervised, reversible intervention only after the competent authority approves. Evaluate against a matched control or defensible counterfactual, reporting demand, weather, missingness and uncertainty. Use the results to revise the recommendation model through a reviewed version change.

The MVP/phase-two/target roadmap is a proposed sequence, not a guaranteed delivery schedule or an assertion of current city maturity. Data permissions, procurement, existing controller capabilities, staffing and cross-department agreements determine feasibility.

## Preparation before the room

1. Run `npm ci`, `npm test` and `npm run build`; open the actual deployed URL and allow the bundled map to load.
2. Rehearse one complete Presentation Demo on the projector's viewport. Verify text size, every stage transition, approval, visible measurement delay and final impact screen. Browser layout/hover review remains distinct from automated state/DOM checks.
3. Reset the demo, leave Overview visible and close unrelated windows. Keep [KPI methodology](KPI-METHODOLOGY.md) available for questions rather than presenting every equation on screen.
4. If a step fails, explain the intended gate and continue from the relevant screen. Never describe an unexecuted action as approved or a pending outcome as measured.

## Sources and companion material

- [KPI methodology and worked examples](KPI-METHODOLOGY.md).
- [Project scope, operation and verification limits](../README.md).
- [Forecast/score implementation](../src/scenario.mjs), [human approval lifecycle](../src/lifecycle.mjs), and [repository](https://github.com/QueenKM/greenpulse-smart-city).
- [OpenStreetMap contributors and attribution](https://www.openstreetmap.org/copyright), licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). This source supports the geographic base, not the operational readings or effect sizes.
- [FHWA evaluation methodology](https://ops.fhwa.dot.gov/publications/fhwahop13031/chap4.htm) and [adaptive signal control](https://www.fhwa.dot.gov/innovation/everydaycounts/edc-1/asct.cfm): general measurement, baseline and causal-mechanism references.
- [EEA air-pollutant sources and emissions](https://www.eea.europa.eu/en/analysis/publications/air-quality-in-europe-2021/sources-and-emissions-of-air-pollutants-in-europe) and [factors contributing to air pollution](https://www.eea.europa.eu/en/analysis/maps-and-charts/many-factors-contribute-to-air-1): why ambient concentrations cannot be assumed proportional to traffic emissions.

Do not cite benchmark-city themes as empirical performance evidence. Add primary research, verified local data documentation and any validated pilot findings when those materials actually exist.
