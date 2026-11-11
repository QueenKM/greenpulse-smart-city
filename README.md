# GreenPulse — Urban Decision Intelligence

A presentation-led React + Vite target-state Smart City Command Center. All operational values are synthetic demonstration data. The Leuven urban model uses real OpenStreetMap street and building geometry. All incidents, sensor positions, measurements, heat zones, forecasts and interventions are synthetic; they are not Leuven operational data. No municipal systems are connected.

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

The clock shows the actual date and time from the viewer’s device in **Europe/Sofia**, updates every second, and adjusts for summer/winter time. Reset Demo does not reset the clock. Synthetic event timestamps, forecast times, and decision records use the same timezone; the original incident identifiers remain fixed demonstration case IDs.

Start **Presentation Demo** in the sidebar. The seven steps follow Alert → Evidence → Prediction → Scenarios → Human approval → Intervention → Measured impact. Continue from the evidence drawer with **Next Step**. At approval, the presenter must explicitly choose **Approve & Activate**. The progression controls cannot bypass this gate.

Use **Pause / Resume**, **Handover**, and **Close Intervention** to demonstrate ownership. Closing starts a visible five-second accelerated measurement replay representing a 60-minute observation window; only then do measured synthetic outcomes appear. Reset Demo starts a clean cycle. The active timer starts at 00:47:32 in the default 60-minute replay; modified operating windows start at their full duration. An elapsed operating window pauses for human review.

### Exploring and presenting

- Click the H-03 incident on the map to focus its affected corridors. **Show whole city** restores context; sensor clicks retain their own reading panel.
- **Now / +15 / +30 / +60 min** is shared across Overview, Traffic & Emissions, and Digital Twin. Future layers and values are MODELLED synthetic forecasts; the real wall clock remains independent. Forecast timestamps share one anchor, including across midnight.
- Digital Twin zoom, pan, reset and 2D/3D controls apply to both comparison halves. Switch **Pan both maps** on to move the shared camera, then **Drag comparison** to operate the before/after divider. The camera also supports local arrow-key pan without advancing presentation steps.
- **How is this calculated?** explains the 60-minute decision score. Weights: environment 30%, mobility 25%, accessibility 20%, historic compatibility 10%, implementation feasibility 15%. Higher feasibility means easier delivery. Scenario B sums to 87.55 and rounds to 88/100. These inputs and weights are illustrative assumptions, not a calibrated Leuven model.
- Technical metadata lives under **Evidence & model details**, while the observed signals, forecast, recommendation and approval path remain visible.
- **Presentation Demo** requests native fullscreen and prepares both geographic views before enabling Next. Use **← / →** for previous/next and **Esc** to exit. Inputs, the comparison camera and approval dialogs keep their own keyboard controls; no shortcut can approve an intervention. The fullscreen toolbar can enter/leave fullscreen independently. Browsers that decline fullscreen retain the guided in-page presentation. Reset returns to the current-condition alert with a fresh synthetic timeline; actual date/time keep running.

The global **CURRENT / MVP / TARGET** control explains operating-model maturity. It does not claim those capabilities exist today or alter the synthetic operating workspace. The roadmap shows a progressive 0–36 month implementation path.

## Method, evidence and presentation annexes

- [KPI calculation, assumptions and verification plan](docs/KPI-METHODOLOGY.md): the worked congestion example, other KPI definitions, why decisions can affect them, and limits of the synthetic model. Open **KPI & Impact → KPI calculation & assumptions** for the in-app explanation.
- [Proposed governance and implementation gates](docs/GOVERNANCE-ROADMAP.md): accountable owners, stewards, decision authority, dependencies and phase acceptance. Select a phase in **Implementation Roadmap** to inspect its proposed governance.
- [15-minute presentation guide](docs/PRESENTATION-GUIDE.md): emphasis on method and results, one worked KPI, one governance gate, and links for the final slide.

The +60-minute scenario comparison and the closed-loop impact benchmark are separate synthetic examples with different comparators. Their percentages must not be combined or described as one calibrated causal simulation. The methodology drawer and annex explain this distinction; no result is claimed to be real Leuven operational evidence.

## Structure

- `src/App.jsx`: persistent shell, Overview, presentation coordinator
- `src/lifecycle.mjs`: explicit human-approved intervention state transitions
- `src/components/CityMap.jsx`: lazy map loader and recoverable loading state
- `src/components/GeographicCityMap.jsx`: geographic renderer for the bundled real Leuven OSM snapshot
- `src/components/DigitalTwin.jsx`: scenarios, rationale, before/after comparison
- `src/components/Dialogs.jsx`: accessible approval, evidence, and handover drawers
- `src/components/DomainScreens.jsx`: traffic, heat, data health, roadmap, log, impact, alerts
- `tests/`: lifecycle and DOM interaction checks. Motion is replaced by a deterministic adapter in DOM tests; these checks do not verify browser layout or animation.

## Geographic context and provenance

Every map persistently displays **LEUVEN URBAN MODEL / Illustrative operational scenario / Synthetic demonstration data**. Real geometry provides spatial context only. The prototype is not connected to Leuven municipal systems and is not a calibrated or surveyed digital twin.

The snapshot includes real central Leuven street hierarchy, pedestrian areas, building footprints, water features and green spaces. Source: [© OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Source feature identifiers are retained. Download the normalized database from `data/leuven-urban-model.json` in the deployed app, or inspect `src/data/city-model.json`. That database remains ODbL; application code is separate.

Only explicit OSM height values produce building extrusions. Missing heights remain flat footprints; floor counts are not converted into invented measured heights. Historic features show mapped sites, not an authoritative legal heritage boundary. Synthetic traffic colors are applied only to roads that permit the modelled road mode; pedestrian routes remain distinct. The displayed sensor positions and cooling response points are proposed demonstration placements, not a real inventory.

To regenerate from an OSM API XML extract covering the documented bbox, run `python scripts/build-city-model.py /path/to/leuven-osm.xml`. The snapshot is bundled locally, so maps do not depend on tile servers during a presentation.

## Data semantics

Cyan = LIVE synthetic replay; purple = MODELLED / AI; amber = warning / SIMULATED; emerald = APPROVED / ACTIVE / MEASURED positive results; rose = CRITICAL.

Fourteen of seventeen operational feeds are current: seven traffic, two air quality, four parking, two public transport AVL, one weather, and one visitor-flow feed. T18 maintenance, AQ-07 offline, and delayed Visitor Flow account for the three excluded feeds. Historic GIS is reference data and excluded from the live count.

Scenario scores are illustrative decision-support scores, not a validated scoring model. Evidence themes are design interpretations of Tartu, Leuven, and Pavia, not claims of equivalent municipal capability or connected integrations. Modified intervention parameters are recorded; benchmark impact values remain fixed synthetic demonstration outcomes.

## Deployment

The Vite default base is `/greenpulse-smart-city/` for GitHub Pages. The GitHub Actions workflow installs from the lockfile, tests and builds pull requests, and deploys successful pushes to `main`. Pull requests never deploy. For root-path private Sites hosting, build with `SITES_BUILD=1 npm run build`; this keeps GitHub Pages configuration intact.

## Verification limit

Production builds and DOM/state interaction checks are automated. Shared browser-control tools were unavailable in the managed build environment, so visual layout, hover animation, and exact viewport-fit inspection require a browser review before a live presentation.
