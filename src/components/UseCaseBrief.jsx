import { ArrowRight, Check, ShieldCheck, TriangleAlert } from "lucide-react";
import { USE_CASES } from "../use-case-spec.mjs";
import "./UseCaseBrief.css";

export default function UseCaseBrief({ useCase: useCaseId, onOpenKpi }) {
  const useCase = USE_CASES[useCaseId];
  if (!useCase) return null;
  return <section className="use-case-brief" aria-label={`${useCase.title} evidence and boundaries`}>
    <div className="ucb-purpose"><span className="ucb-label">PURPOSE</span><h3>{useCase.objective}</h3><p>One shared municipal decision capability · three human-led workflows.</p></div>
    <div className="ucb-evidence-grid">
      <section><span className="ucb-label">CURRENT EVIDENCE</span><ul>{useCase.evidence.map(item => <li key={item}><Check size={13} /><span>{item}</span></li>)}</ul><p className="ucb-note">CURRENT describes supplied evidence, not a live connection or verified Leuven inventory.</p></section>
      <section><span className="ucb-label">DATA GAPS</span><ul>{useCase.gaps.map(item => <li key={item}><TriangleAlert size={13} /><span>{item}</span></li>)}</ul></section>
      <section><span className="ucb-label">ACTORS</span><ul>{useCase.actors.map(item => <li key={item}><span className="ucb-dot" /><span>{item}</span></li>)}</ul></section>
    </div>
    <div className="ucb-path"><span className="ucb-label">DECISION PATH</span><ol>{useCase.workflow.map((step,index) => <li key={step}><span>{String(index+1).padStart(2,"0")}</span>{step}{index < useCase.workflow.length-1 && <ArrowRight size={12} />}</li>)}</ol></div>
    <div className="ucb-authority"><ShieldCheck size={19} /><div><span className="ucb-label">HUMAN APPROVAL</span><p>{useCase.approval}</p><small>AI may recommend. Approvals, rejections, modifications and executions are written to the Decision Log. All activity here is synthetic.</small></div></div>
    <div className="ucb-claims-grid"><section><span className="ucb-label">WHAT GREENPULSE CAN CLAIM</span><ul>{useCase.claims.map(item => <li key={item}><Check size={13} /><span>{item}</span></li>)}</ul></section><section><span className="ucb-label">WHAT GREENPULSE CANNOT CLAIM YET</span><ul>{useCase.cannotClaim.map(item => <li key={item}><TriangleAlert size={13} /><span>{item}</span></li>)}</ul></section></div>
    <div className="ucb-kpis"><div><span className="ucb-label">KPI IMPACT</span><p>{useCase.kpiNote}</p></div><div>{useCase.kpis.map(kpi => <button key={kpi} onClick={() => onOpenKpi?.(kpi)} disabled={!onOpenKpi}>{kpi}<ArrowRight size={12} /></button>)}</div></div>
  </section>;
}
