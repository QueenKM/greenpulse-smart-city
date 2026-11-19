import { useState } from "react";
import { ArrowDown, ArrowRight, Database, GitMerge, Layers3, Network, ShieldCheck } from "lucide-react";
import "./ArchitectureWorkspace.css";

export const ARCHITECTURE_LAYERS = Object.freeze([
  { title: "Sources", Icon: Network, label: "CURRENT", summary: "Existing evidence, owned by its source department.", detail: "Traffic cameras, signal controllers, ITS panels and GIS; 4 vehicle-counting loops at three public parking areas; ZTL gates and OCR; official forecasts, demographic registry, partial tree inventory and civil-protection plans. Five installed paid parking sensors have no data access until the supplier contract is finalised.", gate: "Confirm source ownership, lawful access, coverage and maintenance. Installed hardware does not establish data availability. Environmental sensing remains a target dependency; no municipal system is connected to the prototype." },
  { title: "Integration", Icon: GitMerge, label: "PILOT", summary: "Validate before connecting.", detail: "Align timestamps and identifiers, validate freshness and coverage, minimise personal data and agree access contracts. Camera/OCR linkage must be validated before pilot corridor travel-time reporting.", gate: "Read-only integration first. No identifiable licence plates are displayed; no automatic enforcement interfaces are enabled." },
  { title: "Urban Data Hub", Icon: Database, label: "TARGET", summary: "A shared municipal evidence foundation.", detail: "Progressively organise validated operational and territorial data with provenance, access controls, quality metadata and retention rules. Each source department retains accountable stewardship.", gate: "A target-state capability, not an existing integrated municipal platform." },
  { title: "Analytics / Selective Digital Twin", Icon: Layers3, label: "TARGET", summary: "Model selected questions with explicit limits.", detail: "Support recurring traffic-pattern analysis, aggregate ZTL comparisons and indicative heat-priority areas. Prediction and selective Digital Twin scenarios are introduced only after suitable data and model validation.", gate: "Modelled results are not observations. Estimated CO₂ and measured air quality remain separate; green-space distribution does not prove cooling." },
  { title: "Action & Evidence", Icon: ShieldCheck, label: "PILOT", summary: "Human authority, recorded execution and review.", detail: "Mobility Department approves traffic; an authorised operator executes. Municipal Police leads ZTL operational/legal procedures. Civil Protection approves heat preparedness. Record approvals, rejections, modifications, executions and outcomes.", gate: "AI recommends only. K4 and K7 can start with a controlled decision log; 100% logging completeness is the K7 target, not a measure of decision quality." },
]);

export default function ArchitectureWorkspace() {
  const [selected, setSelected] = useState(0);
  const layer = ARCHITECTURE_LAYERS[selected];
  const Icon = layer.Icon;
  return <div className="architecture-workspace">
    <header className="architecture-intro"><span className="eyebrow">ONE SHARED MUNICIPAL DECISION CAPABILITY</span><h2>Five layers. Progressive implementation.</h2><p>Target-state architecture, implemented progressively after data validation.</p></header>
    <div className="architecture-composition">
      <nav className="architecture-stack" aria-label="Architecture layers">{ARCHITECTURE_LAYERS.map((item, index) => { const LayerIcon = item.Icon; return <div className="architecture-layer-wrap" key={item.title}><button aria-pressed={selected === index} onClick={() => setSelected(index)} className={selected === index ? "selected" : ""}><span className="architecture-index">0{index + 1}</span><LayerIcon size={20}/><span><strong>{item.title}</strong><small>{item.summary}</small></span><em>{item.label}</em><ArrowRight size={16}/></button>{index < ARCHITECTURE_LAYERS.length - 1 && <ArrowDown className="architecture-connector" size={15}/>}</div>; })}</nav>
      <section className="architecture-detail" aria-live="polite"><span className="architecture-provenance">{layer.label}</span><Icon size={38} strokeWidth={1.25}/><span className="eyebrow">LAYER 0{selected + 1} / VALIDATION BEFORE CAPABILITY</span><h3>{layer.title}</h3><p>{layer.detail}</p><div className="architecture-gate"><ShieldCheck size={18}/><p>{layer.gate}</p></div><footer><span>Daily Traffic</span><span>ZTL Access</span><span>Heat Preparedness</span></footer></section>
    </div>
    <p className="architecture-note">TARGET-STATE PROTOTYPE · Synthetic demonstration data. No municipal systems are connected.</p>
  </div>;
}
