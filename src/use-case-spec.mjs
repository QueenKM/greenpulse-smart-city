// Final presentation contract. Inventories describe evidence in the proposal;
// Leuven provides geographic context only. No field system is connected.
const freeze = value => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export const USE_CASE_PROVENANCE = freeze({
  primary: { id: "current-final-presentation", title: "CURRENT FINAL version-3.pptx — final presentation", status: "Final scope; validate source access before implementation" },
  alternative: { id: "use-cases-word", title: "Earlier working documents", status: "Superseded where they differ from the final presentation" },
  boundary: "Real Leuven geography provides spatial context only. The prototype is not connected to municipal systems. Operational examples, markers and scenario values are synthetic or modelled.",
});

// Retained as a compatibility utility for archived research, not a live ranking.
export const PRIORITY_CRITERIA = freeze([
  { id: "relevance", label: "Environmental / public relevance", weight: .35 },
  { id: "feasibility", label: "Feasibility", weight: .25 },
  { id: "dataReadiness", label: "Data readiness", weight: .25 },
  { id: "simplicity", label: "Implementation simplicity", weight: .15 },
]);
export function calculateUseCasePriority(scores) {
  if (!Array.isArray(scores) || scores.length !== 4 || Array.from(scores).some(score => typeof score !== "number" || !Number.isFinite(score) || score < 1 || score > 5)) throw new RangeError("Provide four numeric criterion scores on the 1–5 scale.");
  return Math.round(scores.reduce((sum, score, index) => sum + score * PRIORITY_CRITERIA[index].weight, 0) * 100) / 100;
}
export const ALTERNATIVE_PRIORITISATION = freeze({ source: USE_CASE_PROVENANCE.alternative, criteria: [{ id: "relevance", weight: .3 }, { id: "feasibility", weight: .25 }, { id: "dataAvailability", weight: .25 }, { id: "inverseComplexity", weight: .2 }], challenges: [], boundary: "Archived research only; separate from intervention scenario scores and outside the final presentation workflow." });

export const REFERENCE_ASSETS = freeze([
  { id: "traffic-cameras", label: "Traffic-monitoring cameras", count: 18, useCase: "traffic", caveat: "Validate detection quality, coverage and timestamp linkage between selected monitoring points." },
  { id: "vehicle-loops", label: "Vehicle-counting loops", count: 4, publicParkingAreas: 3, useCase: "traffic", caveat: "Counts at three public parking areas. Data access and output format require confirmation; these are not documented corridor counters." },
  { id: "signal-controllers", label: "Traffic-light controllers", count: 4, useCase: "traffic", caveat: "Mobility approval and an authorised traffic-signal operator are required for implementation." },
  { id: "its-panels", label: "ITS information panels", count: 21, useCase: "traffic", caveat: "Publishing rights and supplier interfaces require validation; no messages are sent." },
  { id: "ztl-gates", label: "ZTL gates", count: 10, useCase: "ztl", caveat: "Recorded entries are not automatically violations. Baselines and gate-period coverage require validation." },
  { id: "ocr-cameras", label: "OCR cameras", count: 16, useCase: "ztl", caveat: "Lawful permit/exemption linkage is conditional. Minimise personal data; no identifiable plates are displayed." },
  { id: "parking-sensors", label: "Paid parking sensors", count: 5, useCase: "traffic", availability: "CURRENT hardware · NO DATA", accessStatus: "supplier-contract-pending", caveat: "Hardware and software are installed. Data is unavailable until the supplier contract is finalised; this does not establish occupancy monitoring or a connected feed." },
].map(asset => ({ availability: "CURRENT · supplied evidence", ...asset, sourceId: USE_CASE_PROVENANCE.primary.id, verifiedForLeuven: false, connected: false })));

export const TRAFFIC_WORKFLOW = freeze([
  "Review data", "Validate freshness & coverage", "Compare operational options", "Mobility approval", "Authorised execution", "Monitor", "Record outcome",
]);
export const ZTL_WORKFLOW = freeze([
  "Establish baseline", "Compare gates & periods", "Review options", "Human / legal approval", "Evaluate aggregate results",
]);
export const HEAT_WORKFLOW = freeze([
  "Official forecast", "Validate", "Indicative priority areas", "Civil Protection approval", "Preparedness actions", "Post-event review",
]);

export const USE_CASES = freeze({
  traffic: {
    id: "traffic", title: "Daily Traffic Management", shortTitle: "Daily Traffic", sourceId: USE_CASE_PROVENANCE.primary.id,
    objective: "Identify recurring congestion patterns at monitored locations and support targeted, time-limited traffic operations.",
    owner: "Mobility Department", approval: "Mobility Department approves; an authorised traffic-signal operator executes.",
    evidence: ["18 traffic-monitoring cameras", "4 vehicle-counting loops at three public parking areas", "4 traffic-light controllers", "21 ITS information panels", "Municipal GIS"],
    actors: ["Mobility Department — lead and approval authority", "Municipal Police", "IT / Digital Office", "Authorised traffic-signal operator"],
    inputs: ["Counts and queue patterns at monitored locations", "Freshness, coverage and completeness", "Controller access and GIS constraints"],
    gaps: ["Validate camera/OCR timestamp linkage between selected monitoring points before using corridor travel time", "Agree the pilot corridor, baseline, coverage and free-flow benchmark", "Confirm system access, authorised execution and rollback procedures", "Loop data covers three public parking areas; confirm access and output format before reuse", "Data from 5 installed paid parking sensors is unavailable until the supplier contract is finalised"],
    workflow: TRAFFIC_WORKFLOW, kpis: ["K1", "K2", "K4", "K7"],
    claims: ["Review counts and queue patterns at monitored locations", "Prepare targeted, time-limited operational options for Mobility approval", "Record human decisions and authorised execution"],
    cannotClaim: ["Validated corridor travel time before timestamp-linkage validation", "Network-wide congestion coverage", "Measured emissions or causal CO₂ reductions", "Automatic execution by AI"],
    kpiNote: "K1 is PILOT and conditional on validated timestamp linkage. K2 is TARGET and estimated, dependent on validated K1 and approved emission factors. K4 and K7 are PILOT-READY through the decision log.",
  },
  ztl: {
    id: "ztl", title: "ZTL / Historic-Centre Access Management", shortTitle: "ZTL Access", sourceId: USE_CASE_PROVENANCE.primary.id,
    objective: "Understand when and where vehicles enter the historic centre and support evidence-based review of access arrangements.",
    owner: "Municipal Police", approval: "Municipal Police and the established legal process authorise operational/legal action. No rule changes are automatic.",
    evidence: ["10 ZTL gates", "16 OCR cameras", "Municipal GIS", "Police, traffic-fine and permit-related records/processes — subject to lawful and technically validated access"],
    actors: ["Municipal Police — operational lead", "Mobility Department", "IT / Data Office", "Data-protection authority or authorised privacy lead"],
    inputs: ["Aggregate entries by gate and period", "Coverage and baseline validation", "Permit and exemption records only after lawful linkage validation", "Relevant complaints and operational records, subject to validated access"],
    gaps: ["Validate lawful and technically reliable linkage to permits and exemptions", "Establish gate-period baselines and review data completeness", "Agree privacy controls, retention and the applicable legal approval process"],
    workflow: ZTL_WORKFLOW, kpis: ["K4", "K7"],
    claims: ["Compare aggregate entry patterns by gate and period", "Support human review of access arrangements", "Record approvals, rejections and evidence for post-review evaluation"],
    cannotClaim: ["That a recorded entry is a violation", "Compliance without validated permit/exemption linkage", "Automatic ZTL rule changes or enforcement", "Identifiable licence-plate records in this prototype"],
    kpiNote: "K4 records alert-to-human-decision time; its under-10-minute target is an illustrative pilot target. K7 measures complete logging, not legal compliance or decision quality.",
  },
  heat: {
    id: "heat", title: "Heatwave Preparedness", shortTitle: "Heat Preparedness", sourceId: USE_CASE_PROVENANCE.primary.id,
    objective: "Use official forecasts and available territorial information to identify indicative priority areas and coordinate preparedness.",
    owner: "Civil Protection", approval: "Civil Protection reviews, approves and activates preparedness. Environment / Urban Planning interprets environmental information; Social Services coordinates outreach.",
    evidence: ["Official external weather forecasts", "Demographic registry", "Municipal GIS", "Partial tree and green-space inventory", "Civil-protection plans"],
    actors: ["Civil Protection — response lead", "Environment / Urban Planning", "Social Services", "IT / Data Office"],
    inputs: ["Official forecast and validation", "Privacy-safe aggregate demographic and territorial information", "Preparedness plans and responsible service coordination"],
    gaps: ["No local temperature/humidity sensor network is documented", "No validated cooling-point inventory is currently documented", "No real-time health-outcome or heat-exposure feed is available", "Green-space distribution does not prove cooling"],
    workflow: HEAT_WORKFLOW, kpis: ["K4", "K5", "K6", "K7"],
    claims: ["Identify indicative/modelled priority areas for preparedness", "Coordinate Civil Protection review and human-approved preparedness actions", "Record environmental interpretation and Social Services outreach responsibility"],
    cannotClaim: ["Measured local heat exposure or real-time health outcomes", "Validated cooling-point accessibility before an inventory and threshold are agreed", "That green spaces provide measured cooling", "Automatic protective action by AI"],
    kpiNote: "K5 is TARGET and requires validated local heat sensing. K6 is PILOT and conditional on a validated cooling inventory and pilot-defined walking-time or network-distance threshold. K4 and K7 are PILOT-READY.",
  },
});

export const PROTECTED_ACCESS = freeze([
  { id: "residents", label: "Residents" }, { id: "emergency", label: "Emergency services" }, { id: "disabled", label: "People with disabilities" }, { id: "deliveries", label: "Deliveries" }, { id: "transit", label: "Public transport" },
]);
export const TRAFFIC_CHECKS = freeze([
  { id: "pedestrian", label: "Pedestrian crossings and delay reviewed" },
  { id: "bus", label: "Bus punctuality and access reviewed" },
  { id: "residential", label: "No residential queue displacement identified" },
  { id: "heritage", label: "Historic-street constraints reviewed" },
  { id: "rollback", label: "Authorised rollback plan recorded" },
]);
export const TRAFFIC_ACTIONS = freeze({
  signals: { id: "signals", label: "Time-limited signal operation", authority: "Mobility Department", execution: "prototype_trial", trigger: "Recurring counts and queue patterns at monitored locations, after freshness and coverage validation.", requiredInputs: ["traffic", "controller-phases", "events-roadworks", "heritage"], optionalInputs: [], safeguards: ["Pedestrian safety", "Public transport", "Residential displacement", "Heritage", "Authorised rollback"], implementedScope: "Prepare a time-limited synthetic proposal. Mobility Department approves; an authorised operator separately executes. No controller is connected.", reviewLabel: "Review traffic proposal" },
  guidance: { id: "guidance", label: "ITS information proposal", authority: "Mobility Department", execution: "prototype_trial", trigger: "Validated counts and queue patterns support targeted, time-limited public traffic information.", parkingTriggerPercent: 90, requiredInputs: ["traffic", "events-roadworks", "accessible-routes"], safeguards: ["Accessible routes", "No residential displacement", "Authorised message publication", "Withdrawal plan"], implementedScope: "Prepare synthetic ITS guidance for Mobility approval and authorised execution. No public message is published.", reviewLabel: "Review information proposal" },
  ztl: { id: "ztl", label: "ZTL access-arrangement review", authority: "Municipal Police", execution: "prototype_trial", trigger: "Aggregate gate-period patterns after baseline, coverage and lawful access validation; entries are not violations.", requiredInputs: ["ztl-access", "heritage", "permit-linkage", "legal-process"], safeguards: ["Human/legal approval", "Privacy review", "Permit and exemption validation", "Protected access"], implementedScope: "Record a Municipal Police access-arrangement review within the established legal process. This is not an enforcement command. No ZTL rule is changed automatically.", reviewLabel: "Review ZTL proposal" },
  // Compatibility paths remain unavailable in the final navigation/workflow.
  transit: { id: "transit", label: "Transit support", authority: "Mobility Department", execution: "request_only", trigger: "Human departmental request", requiredInputs: [], safeguards: ["Human review"], implementedScope: "No service is dispatched.", reviewLabel: "Record request" },
  policy: { id: "policy", label: "Policy review", authority: "Municipal Police and established legal process", execution: "review_only", trigger: "Human legal review", requiredInputs: [], safeguards: ["Human/legal review"], implementedScope: "No municipal rule is changed.", reviewLabel: "Record review" },
});
export const TRAFFIC_PILOT_EXAMPLE = freeze({
  sourceId: USE_CASE_PROVENANCE.primary.id, baselineMinutes: 18, scenarioMinutes: 16.2, relativeChangePercent: -10,
  label: "Illustrative traffic KPI calculation",
  boundary: "Illustrative values used to demonstrate the KPI calculation. The real baseline will be established during pilot preparation.",
});
export function createTrafficUseCaseContext() {
  return { action: "signals", eventLoad: "normal", roadworks: false, protectedAccess: Object.fromEntries(PROTECTED_ACCESS.map(({ id }) => [id, true])), checks: Object.fromEntries(TRAFFIC_CHECKS.map(({ id }) => [id, false])), thresholdAgreed: false, timestampLinkageValidated: false, aqEvidenceConfirmed: false, parkingOccupancy: 93, permitLinkageValidated: false, legalProcessConfirmed: false, privacyReviewed: false };
}
