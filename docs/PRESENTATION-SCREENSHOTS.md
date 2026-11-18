# Final GreenPulse presentation screenshots

The screenshot runner captures the existing React application through its real interface. It does not build substitute pages, inject completed interventions, or populate missing environmental observations.

```bash
npm ci
npm run screenshots
```

The runner uses Playwright with Chromium. It automatically finds Playwright's installed Chromium or a supported system Chromium. If neither is installed, install the browser and its Linux dependencies first:

```bash
npx playwright install --with-deps chromium
npm run screenshots
```

For an existing Chromium installation in another location:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run screenshots
```

On a fresh checkout, run `npm ci` before either browser setup or capture. Installation of system browser dependencies may require administrator rights on the local machine.

## Capture output

All five files are written to `docs/presentation-assets/` as **1920 × 1080 PNGs**, with `deviceScaleFactor: 1`, Chromium headless, the same dark theme, and no browser chrome.

| File | Application screen | Presentation purpose |
| --- | --- | --- |
| `01_KPI_Impact_Overview.png` | KPI Framework and its seven-indicator index | Introduce K1–K7, readiness, provenance and unavailable data. |
| `02_K1_Calculation_Assumptions.png` | Daily Traffic → Pilot KPI example | Explain the illustrative 18.0-minute baseline, modelled 16.2-minute scenario and 10% illustrative improvement, with calculation requirements and limitations. |
| `03_K1_Scenario_Comparison.png` | Selective Digital Twin, +60 minutes, Adaptive Signals selected | Compare Do Nothing, Adaptive Signals and Traffic Diversion before a human decision. |
| `04_Human_Approval_Drawer.png` | Reviewed traffic proposal, immediately before approval | Show Mobility Department approval authority, separate authorised execution, and the available human controls. |
| `05_Decision_Log_Completed.png` | Decision Log after the completed demonstration workflow | Show approval, authorised execution, closure and outcome review as an accountable lifecycle. |

The presence of this guide does not establish that captures succeeded. The runner must complete successfully and all five actual PNG files must exist before reporting them as generated.

## Deterministic application state

Each run starts a fresh browser context and fixes the demonstration clock at **2026-11-18T08:00:00Z**. The browser uses the `Europe/Sofia` timezone and `en-GB` locale. The script advances the clock to defined approval, execution and review times while using the application's normal controls and timers.

The sequence is deliberate:

1. Capture the seven-KPI overview and the detailed K1 illustration.
2. Open the existing incident's target scenario comparison and set +60 minutes.
3. Review the traffic-context safeguards and reference plan, select Mobility Department, and confirm the simulated approving role.
4. Save and validate screenshot **04 before clicking Approve intervention**.
5. Record approval, then separately identify an authorised operator and execute the approved prototype plan.
6. Show monitoring, close the intervention, and wait for the review window to complete.
7. Verify K7 has one complete decision out of one recorded decision, then capture the Decision Log.

Completing the review window records an **inconclusive demonstration outcome**. It does not establish a successful intervention, measured traffic improvement or measured environmental benefit. K7's **100% logging completeness** does not measure decision quality.

The runner leaves missing measured environmental inputs blank and checks that K2, K3, K5 and K6 still display **No data**. The 18.0 → 16.2-minute example remains explicitly illustrative/modelled; it is never entered as a municipal observation or achieved result. Prototype, synthetic-data, readiness and provenance labels stay visible in the captures where applicable.

## Local or deployed application

By default, the runner starts the existing application with Vite's `createServer` on **127.0.0.1:4175**, using the repository's configured base path. The port is strict: a conflict fails clearly rather than silently selecting another port. The runner closes the browser and its own server on success or failure.

To capture an already-running or deployed copy of the same updated application, provide its complete application URL, including its base path:

```bash
GREENPULSE_SCREENSHOT_URL=https://queenkm.github.io/greenpulse-smart-city/ npm run screenshots
```

With `GREENPULSE_SCREENSHOT_URL`, no local server is started or stopped. The target must be reachable and contain the expected current screens. The runner fails if a required screen, label or control cannot be reached; it does not fabricate a fallback image.

## Validation and review

Before each capture, the runner waits for document loading, fonts, map geometry where applicable, and interface transitions. It moves the pointer away from important content and checks that required text is inside the visible viewport. PNG checks confirm the signature, dimensions and nontrivial image size. Rendering errors fail the run.

After a successful run, open all five files and review readability, clipping, overlaps, map/chart rendering and disclaimers before committing them. Only the five final PNGs, screenshot automation, dependency updates and this guide belong in the screenshot change; exclude temporary browser profiles, debug captures, credentials and logs.
