# GreenPulse KPI methodology

This framework follows the reviewed **CURRENT FINAL version-3.pptx**, especially slides 11–15. No municipal systems are connected. Calculations using demonstration inputs do not establish municipal data readiness, a measured baseline or an achieved effect. Missing input returns **No data**, never zero.

| KPI | Formula / definition | Readiness and condition |
| :-- | :-- | :-- |
| **K1 · Pilot corridor travel time and delay** | Mean completed-trip duration between selected points; delay = observed travel time − agreed free-flow reference. | **PILOT.** Validate camera/OCR timestamp linkage, coverage and time synchronisation first. Until validation, report counts and queue patterns only. No network-wide congestion claim. |
| **K2 · Estimated tailpipe CO₂ avoided** | Σ vehicle-km by category × (approved baseline emission factor − approved intervention factor). | **TARGET · ESTIMATED.** Depends on validated K1 and approved factors. Preserve negative results. Delay alone does not establish causal CO₂ reductions. |
| **K3 · Measured NO₂ and PM2.5** | Separate validated concentration means over explicitly matched periods; any comparison states averaging period and matching assumptions. | **TARGET · MEASURED** data type. Requires ARPA integration and/or new validated sensors. No measured environmental feed is connected. |
| **K4 · Alert-to-decision time** | (recorded human decision timestamp − alert timestamp) / 60,000, in minutes. | **PILOT-READY** through the GreenPulse decision log. Under 10 minutes is an **illustrative pilot target**, not achieved service performance or controller-response time. |
| **K5 · Heat exposure in person-hours** | Σ population in a zone × hours above a declared heat threshold, using validated local heat observations and a specified population/time basis. | **TARGET.** Requires validated local temperature/humidity sensing. Official forecasts or land-surface temperature do not create a measured exposure feed. |
| **K6 · Vulnerable residents within reach of cooling points** | Unique vulnerable residents within the agreed accessible catchment / all vulnerable residents × 100. State inventory, opening/operability and capacity assumptions. | **PILOT.** Subject to a validated cooling-point inventory and a **pilot-defined walking-time or network-distance threshold**. Green-space distribution does not demonstrate cooling or accessibility. |
| **K7 · Decisions fully recorded** | Decisions with all required data, model/version, recommendation, human decision and result fields / all decisions × 100. | **PILOT-READY** through the decision log. Target **100%** complete logging. Measures completeness, not decision quality or intervention success. A pending result is incomplete. |

## KPI ownership, frequency and direction

Slide 12 assigns the following KPI responsibilities. These are intended collection/review frequencies after the relevant inputs are validated, not a claim that the browser prototype operates those feeds. KPI ownership is distinct from the operational approval and interpretation roles on slide 16.

| KPI | Owner in slide 12 | Frequency | Target / direction |
| :-- | :-- | :-- | :-- |
| K1 | Mobility Department | Every 15 minutes | Shorter corridor travel time when the new signal plan is on, assessed against the validated baseline. |
| K2 | Environment / Climate Office + Mobility | Each time the plan runs; annual reporting | Report an estimate for each evaluated plan and yearly; avoid overlapping episodes when aggregating. |
| K3 | Environment / Climate Office | Hourly | Lower than on comparable days; measured evidence must establish any difference. |
| K4 | Control Room Manager | Every event | Under 10 minutes — illustrative pilot target. |
| K5 | Environment / Climate Office | Every 10–15 minutes after local sensing is validated | Lower exposure in zones with shade or greening is a proposed direction to evaluate, not proof that mapped green space cools the area. |
| K6 | Civil Protection + Social Services | Daily in summer, after inventory validation | Increase validated accessibility each season using the agreed walking-time or network-distance threshold. |
| K7 | Data Lead | Monthly completeness review; decisions are recorded as events occur | 100% complete logging, not decision quality. |

The final slide deck names ARPA as the regional air-quality agency source. That is a source-design dependency, not a claim that ARPA supplies a live Leuven feed. The reference inventory and real Leuven geometry remain separate.

## The single traffic illustration

- **SYNTHETIC illustrative baseline:** 18.0 minutes.
- **MODELLED scenario:** 16.2 minutes.
- **Illustrative improvement:** `(18.0 − 16.2) / 18.0 × 100 = 10%`.

> Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation.

18.0 minutes is not currently measured municipal data. 16.2 minutes is not an achieved result. This example cannot justify K2 without validated K1 and approved factors, or K3 without separately measured concentrations.

## Interpretation rules

- CO₂ is **estimated/calculated**. NO₂ and PM2.5 are **measured separately**.
- Traffic improvement does not automatically prove an air-quality improvement.
- **MODELLED** results are not observed results. A synthetic scenario remains **SYNTHETIC** even when its arithmetic is reproducible.
- Annual air-quality reference values are not hourly alert thresholds or a prototype compliance test.
- No health-outcome or heat-exposure real-time feed is documented. Local heat-priority maps are **indicative / MODELLED**.
- A completed demonstration review window creates an audit event; it does not create observations or a successful result.
- A record can be complete while its outcome is inconclusive. K7 completeness does not certify decision quality.

## Human accountability

Mobility Department approves traffic; an authorised traffic-signal operator executes. Municipal Police leads ZTL operational/legal actions under established procedures. Civil Protection approves and activates heat preparedness, Environment / Urban Planning interprets environmental evidence, and Social Services coordinates outreach. Approvals, rejections, modifications and executions are recorded in the Decision Log.

The implementation keeps formulas and input validation in `src/kpi-framework.mjs`; the KPI Framework interface displays readiness, source requirements and calculation limits alongside results.
