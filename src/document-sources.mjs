import { REFERENCE_ASSETS, PRIORITY_CRITERIA, USE_CASES, calculateUseCasePriority } from "./use-case-spec.mjs";
export { REFERENCE_ASSETS, PRIORITY_CRITERIA, USE_CASES, calculateUseCasePriority };

// The final presentation specification supersedes earlier working documents.
// Keep only concise source metadata; source binaries and upload metadata are not published.
export const DOCUMENT_SOURCE_POLICY = Object.freeze({
  version: "greenpulse-current-final-v1",
  kpiAuthority: "current-final-presentation",
  useCaseAuthority: "current-final-presentation",
  statement: "CURRENT FINAL version.pptx is the final design authority. The supplied final application specification defines three workflows, seven KPIs, human decision rights and progressive implementation. Earlier working documents provide background only.",
  verification: "Presentation-aligned prototype specification; no municipal integration or inventory audit is claimed.",
});

export const DOCUMENT_SOURCES = Object.freeze([
  { id: "current-final-presentation", filename: "CURRENT FINAL version.pptx", label: "Final presentation specification", format: "SPECIFICATION", status: "Final authority", date: "Detailed final application requirements supplied in chat", scope: "Daily Traffic Management, ZTL / Historic-Centre Access Management and Heatwave Preparedness; seven KPIs, five architecture layers, decision rights and the three-stage roadmap.", authority: "The final specification takes precedence over earlier working documents. This prototype implements the team's detailed application requirements." },
  { id: "benchmark", filename: "Task 1 - Smart City Control Rooms.docx", label: "Benchmark background", format: "DOCX", status: "Background", date: "Date not stated in the supplied report", scope: "City comparisons, transferability, governance and limitations.", authority: "Research provenance only; benchmark projects do not validate this prototype's operational capabilities or numerical effects." },
  { id: "use-cases-word", filename: "GreenPulse_Task2_Use_Cases.docx", label: "Earlier use-case analysis", format: "DOCX", status: "Superseded working version", date: "November 2026", scope: "Earlier challenge screening and proposed workflows.", authority: "Background only. The final presentation defines the three application workflows and their actors." },
  { id: "use-cases-pdf", filename: "GreenPulse_Use_Cases.docx.pdf", label: "Earlier use-case specification", format: "PDF", status: "Superseded working version", date: "Date not stated in the supplied file", scope: "Earlier inventory, use cases and delivery proposals.", authority: "The final presentation supersedes earlier scope, priorities, authority assignments and delivery periods." },
  { id: "kpi-original", filename: "GreenPulse_Part4_KPIs.docx", label: "Original KPI working document", format: "DOCX", status: "Background", date: "Date not stated in the supplied file", scope: "Original seven-KPI working framework.", authority: "The final presentation defines readiness, provenance labels and targets." },
  { id: "kpi-revised", filename: "GreenPulse_Part4_KPIs (1).docx", label: "Revised KPI working document", format: "DOCX", status: "Background", date: "November 2026", scope: "Formula provenance and illustrative calculations.", authority: "Formula background only; the final presentation's readiness and data limitations take precedence." },
]);

export const DOCUMENT_METHOD_REFERENCES = Object.freeze([
  { id: "air-policy", label: "EU air-quality policy — annual reference context", href: "https://www.consilium.europa.eu/en/policies/air-quality/", scope: "Annual reference context is not an hourly alert limit. K3 requires ARPA integration and/or validated sensors." },
  { id: "emission-method", label: "EMEP/EEA Guidebook 2023 — road-transport method", href: "https://www.eea.europa.eu/publications/emep-eea-guidebook-2023/part-b-sectoral-guidance-chapters/1-energy/1-a-combustion/1-a-3-b-i", scope: "K2 remains estimated, dependent on validated K1 and approved emission factors; no causal CO₂ benefit is established." },
]);

export const REFERENCE_CITY_PROFILE = Object.freeze({
  population: "Municipal reference inventory",
  fabric: "Historic-centre demonstration context",
  distinction: "Real Leuven geography provides spatial context only. No operational municipal systems are connected; operational scenarios are synthetic.",
  baseline: "Fragmented source systems. Access, coverage, data protection and measurement suitability require validation before pilot claims.",
});

export const DOCUMENT_OPEN_QUESTIONS = Object.freeze([
  { id: "timestamp-linkage", title: "K1 timestamp linkage", difference: "Cameras and OCR do not by themselves establish corridor travel times.", provisional: "Validate timestamp linkage between selected monitoring points and establish the real pilot baseline. Until then, use counts and queue patterns only.", status: "PILOT validation gate", source: "Final presentation specification" },
  { id: "lawful-access", title: "ZTL lawful data linkage", difference: "Recorded entries are not automatically violations.", provisional: "Validate lawful and technical access to Police, permit and exemption records. Use aggregate outputs only and retain legal approval procedures.", status: "PILOT validation gate", source: "Final presentation specification" },
  { id: "cooling-inventory", title: "K6 cooling-point reach", difference: "No validated cooling-point inventory is currently documented.", provisional: "Validate opening hours, accessibility, capacity and the pilot-defined walking-time or network-distance threshold before reporting coverage.", status: "PILOT validation gate", source: "Final presentation specification" },
  { id: "environmental-inputs", title: "Target environmental data", difference: "No local temperature/humidity sensing network or real-time health/exposure feed is documented.", provisional: "K3 requires ARPA integration and/or validated sensors. K5 requires validated local heat sensing. Green-space distribution does not demonstrate cooling.", status: "TARGET dependency", source: "Final presentation specification" },
]);

export const BENCHMARK_REFERENCES = Object.freeze([
  { city: "Tartu", number: "01", status: "Reported operational projects", context: "Mobility monitoring and data integration", principle: "Connect existing sources before expanding", summary: "The supplied report describes IoT and mobility applications, but does not establish one unified citywide environmental control room.", limitation: "Supplier continuity, municipal data ownership and recurring maintenance require attention. Transferability depends on local capacity.", reportedDate: "Task 1 report · date not stated", sourceSection: "Task 1 comparison table; Tartu governance, interoperability and challenges", links: [{ label: "Mobility research cited in the report", href: "https://www.mdpi.com/1424-8220/22/8/3030" }, { label: "Tartu open-data reference cited in the report", href: "https://imo.ut.ee/en/tartu-open-data/" }] },
  { city: "Leuven", number: "02", status: "Reported platform and research projects", context: "Urban Sense, climate monitoring and collaboration", principle: "Govern environmental decisions across departments", summary: "The report describes a shared data platform and environmental monitoring projects. It does not establish a unified environmental control room; the 3D twin is described as experimental.", limitation: "Citizen-station coverage and heat-study findings are background evidence, not feeds or calibration data used by this prototype.", reportedDate: "Task 1 report · date not stated", sourceSection: "Task 1 Leuven technologies, interoperability, challenges and qualifications", links: [{ label: "Leuven.cool project cited in the report", href: "https://www.kuleuven.be/plant-institute/research/urban-ecosystems/projects/leuven-cool" }, { label: "Leuven climate-governance reference", href: "https://en.leuven2030.be/" }] },
  { city: "Pavia", number: "03", status: "Research and development", context: "DORIAN and heritage-sensitive spatial modelling", principle: "Model selected strategic areas first", summary: "The uploaded report presents DORIAN as a municipality–university research initiative, not an operational citywide control room or a fully deployed citywide twin.", limitation: "A common geospatial foundation and selective City-BIM / H-BIM work inform the design; no measured GreenPulse benefit follows from that precedent.", reportedDate: "Task 1 report · date not stated", sourceSection: "Task 1 Pavia–DORIAN governance, status and transferability", links: [{ label: "DORIAN review cited in the earlier use-case document (2025)", href: "https://doi.org/10.5194/isprs-archives-XLVIII-1-W5-2025-45-2025" }] },
]);

export function getDocumentSource(id) {
  return DOCUMENT_SOURCES.find((source) => source.id === id);
}
