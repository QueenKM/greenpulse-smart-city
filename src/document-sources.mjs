import { REFERENCE_ASSETS, PRIORITY_CRITERIA, USE_CASES, calculateUseCasePriority } from "./use-case-spec.mjs";
export { REFERENCE_ASSETS, PRIORITY_CRITERIA, USE_CASES, calculateUseCasePriority };

// The final presentation specification supersedes earlier working documents.
// Keep only concise source metadata; source binaries and upload metadata are not published.
export const DOCUMENT_SOURCE_POLICY = Object.freeze({
  version: "greenpulse-current-final-v3-reviewed",
  kpiAuthority: "current-final-presentation",
  useCaseAuthority: "current-final-presentation",
  statement: "CURRENT FINAL version-3.pptx is the reviewed final design authority (18 slides). It defines three workflows, seven KPIs, four benchmark cases, human decision rights and progressive implementation. Earlier working documents provide background only.",
  verification: "All 18 slides of the supplied final presentation were reviewed. This verifies design alignment, not municipal integration, source access or an independent inventory audit.",
});

export const DOCUMENT_SOURCES = Object.freeze([
  { id: "current-final-presentation", filename: "CURRENT FINAL version-3.pptx", label: "Reviewed final presentation", format: "PPTX", status: "Final authority", date: "18-slide final source reviewed", scope: "Slides 3–4: benchmarks and prioritisation; 5–10: use cases, architecture and inventory; 11–15: seven KPIs and accountable decisions; 16–17: operating model and roadmap.", authority: "The reviewed final presentation takes precedence over earlier working documents. Source-slide traceability does not imply connected systems, measured outcomes or validated municipal data access." },
  { id: "benchmark", filename: "Task 1 - Smart City Control Rooms.docx", label: "Benchmark background", format: "DOCX", status: "Background", date: "Date not stated in the supplied report", scope: "City comparisons, transferability, governance and limitations.", authority: "Research provenance only; benchmark projects do not validate this prototype's operational capabilities or numerical effects." },
  { id: "use-cases-word", filename: "GreenPulse_Task2_Use_Cases.docx", label: "Earlier use-case analysis", format: "DOCX", status: "Superseded working version", date: "November 2026", scope: "Earlier challenge screening and proposed workflows.", authority: "Background only. The final presentation defines the three application workflows and their actors." },
  { id: "use-cases-pdf", filename: "GreenPulse_Use_Cases.docx.pdf", label: "Earlier use-case specification", format: "PDF", status: "Superseded working version", date: "Date not stated in the supplied file", scope: "Earlier inventory, use cases and delivery proposals.", authority: "The final presentation supersedes earlier scope, priorities, authority assignments and delivery periods." },
  { id: "kpi-original", filename: "GreenPulse_Part4_KPIs.docx", label: "Original KPI working document", format: "DOCX", status: "Background", date: "Date not stated in the supplied file", scope: "Original seven-KPI working framework.", authority: "The final presentation defines readiness, provenance labels and targets." },
  { id: "kpi-revised", filename: "GreenPulse_Part4_KPIs (1).docx", label: "Revised KPI working document", format: "DOCX", status: "Background", date: "November 2026", scope: "Formula provenance and illustrative calculations.", authority: "Formula background only; the final presentation's readiness and data limitations take precedence." },
]);

export const DOCUMENT_METHOD_REFERENCES = Object.freeze([
  { id: "air-policy", label: "EU air-quality policy — annual reference context", href: "https://www.consilium.europa.eu/en/policies/air-quality/", scope: "Annual reference context is not an hourly alert limit. K3 requires ARPA integration and/or validated sensors." },
  { id: "emission-method", label: "EMEP/EEA Guidebook 2023 — emission-estimation methods", href: "https://www.eea.europa.eu/en/analysis/publications/emep-eea-guidebook-2023", scope: "K2 remains estimated, dependent on validated K1 and approved emission factors; no causal CO₂ benefit is established." },
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
  { city: "Trikala", number: "01", status: "Municipality-led operational applications", context: "e-Trikala, municipal utilities and technology partners", principle: "Integrate useful existing systems before extending", summary: "The final assessment describes a central platform for traffic, parking, lighting, environmental and water systems, with APIs for third-party applications.", limitation: "Strong municipal commitment, partnerships and funding support the model. Long-term maintenance and supplier dependency remain challenges; a transferable approach still needs local source validation.", reportedDate: "Reviewed final presentation", sourceSection: "CURRENT FINAL version-3.pptx · slide 3 · Trikala assessment", links: [] },
  { city: "Venice", number: "02", status: "Operational Smart Control Room since 2020 — presentation assessment", context: "Municipality, Venis and public agencies", principle: "Adapt inter-agency coordination to municipal scale", summary: "The final assessment describes shared pedestrian, road and water-traffic monitoring, weather, parking and mobility information involving transport operators, Police, Civil Protection and municipal services.", limitation: "ICT infrastructure and a municipal technology company enable coordination. Data governance, privacy and visitor-flow complexity require attention when transferring the model to a smaller city.", reportedDate: "Reviewed final presentation", sourceSection: "CURRENT FINAL version-3.pptx · slide 3 · Venice assessment", links: [] },
  { city: "Pavia", number: "03", status: "Research and development", context: "Municipality–University partnership and DORIAN", principle: "Use GIS as the foundation for selective spatial modelling", summary: "The final assessment describes GIS, 3D and hydrological modelling, Digital Twin development and City-BIM / heritage research led by the municipality and University of Pavia.", limitation: "The presentation identifies research and development rather than an operational city-wide Control Room. Research expertise does not validate GreenPulse's numerical effects or establish municipal deployment.", reportedDate: "Reviewed final presentation", sourceSection: "CURRENT FINAL version-3.pptx · slide 3 · Pavia assessment", links: [] },
  { city: "Leuven", number: "04", status: "Useful initiatives; comparable governance assessment not provided", context: "Telraam, Leuven.cool and Flood4Cast", principle: "Transfer methods subject to data and partner capacity", summary: "The final assessment cites citizen traffic counting, urban heat analysis and short-term flood forecasting. It reports Leuven.cool's finding of up to 7°C warmer city-centre hot nights as benchmark context, not a GreenPulse observation.", limitation: "Specific operational actors and a unified city-wide integration architecture are not detailed. These initiatives do not establish a comparable Control Room governance model or calibrate this synthetic scenario.", reportedDate: "Reviewed final presentation", sourceSection: "CURRENT FINAL version-3.pptx · slide 3 · Leuven assessment", links: [] },
]);

export function getDocumentSource(id) {
  return DOCUMENT_SOURCES.find((source) => source.id === id);
}
