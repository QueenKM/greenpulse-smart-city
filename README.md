# GreenPulse — Urban Decision Intelligence

A presentation-led React + Vite target-state Smart City Command Center. All values are synthetic demonstration data. The city model is illustrative and does not use real GIS data. No municipal systems are connected.

## Run

```sh
npm ci
npm run dev
```

Open the Vite URL at `/greenpulse-smart-city/`.

```sh
npm test
npm run build
```

Node 22 or newer is recommended. Typography is bundled locally; maps require no external tile service.

## Present

Start **Presentation Demo** in the sidebar. The seven steps follow Alert → Evidence → Prediction → Scenarios → Human approval → Intervention → Measured impact. Continue from the evidence drawer with **Next Step**. At approval, the presenter must explicitly choose **Approve & Activate**. The progression controls cannot bypass this gate.

Use **Pause / Resume**, **Handover**, and **Close Intervention** to demonstrate ownership. Closing starts a visible five-second accelerated measurement replay representing a 60-minute observation window; only then do measured synthetic outcomes appear. Reset Demo starts a clean cycle. The active timer starts at 00:47:32 in the default 60-minute replay; modified operating windows start at their full duration. An elapsed operating window pauses for human review.

The global **CURRENT / MVP / TARGET** control explains operating-model maturity. It does not claim those capabilities exist today or alter the synthetic operating workspace. The roadmap shows a progressive 0–36 month implementation path.

## Structure

- `src/App.jsx`: persistent shell, Overview, presentation coordinator
- `src/lifecycle.mjs`: explicit human-approved intervention state transitions
- `src/components/CityMap.jsx`: deterministic layered vector city model
- `src/components/DigitalTwin.jsx`: scenarios, rationale, before/after comparison
- `src/components/Dialogs.jsx`: accessible approval, evidence, and handover drawers
- `src/components/DomainScreens.jsx`: traffic, heat, data health, roadmap, log, impact, alerts
- `tests/`: lifecycle and DOM interaction checks. Motion is replaced by a deterministic adapter in DOM tests; these checks do not verify browser layout or animation.

## Data semantics

Cyan = LIVE synthetic replay; purple = MODELLED / AI; amber = warning / SIMULATED; emerald = APPROVED / ACTIVE / MEASURED positive results; rose = CRITICAL.

Fourteen of seventeen operational feeds are current: seven traffic, two air quality, four parking, two public transport AVL, one weather, and one visitor-flow feed. T18 maintenance, AQ-07 offline, and delayed Visitor Flow account for the three excluded feeds. Historic GIS is reference data and excluded from the live count.

Scenario scores are illustrative decision-support scores, not a validated scoring model. Evidence themes are design interpretations of Tartu, Leuven, and Pavia, not claims of equivalent municipal capability or connected integrations. Modified intervention parameters are recorded; benchmark impact values remain fixed synthetic demonstration outcomes.

## Deployment

The Vite default base is `/greenpulse-smart-city/` for GitHub Pages. The retained GitHub Actions workflow installs from the lockfile, runs tests, builds, and deploys on pushes to `main`. For root-path private Sites hosting, build with `SITES_BUILD=1 npm run build`; this keeps GitHub Pages configuration intact.

## Verification limit

Production builds and DOM/state interaction checks are automated. Shared browser-control tools were unavailable in the managed build environment, so visual layout, hover animation, and exact viewport-fit inspection require a browser review before a live presentation.
