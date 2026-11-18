import { useEffect, useId, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  FileText,
  GitBranch,
  Landmark,
  Network,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { Drawer } from "./Dialogs";
import {
  BENCHMARK_REFERENCES,
  DOCUMENT_OPEN_QUESTIONS,
  DOCUMENT_METHOD_REFERENCES,
  DOCUMENT_SOURCE_POLICY,
  DOCUMENT_SOURCES,
  REFERENCE_CITY_PROFILE,
} from "../document-sources.mjs";
import "./DocumentEvidence.css";

const tabs = [
  { id: "benchmarks", label: "Benchmarks", Icon: Landmark },
  { id: "documents", label: "Source documents", Icon: FileText },
  { id: "questions", label: "Validation gates", Icon: GitBranch },
];
const icons = { Tartu: Network, Leuven: UsersRound, Pavia: Landmark };

export default function DocumentEvidence({ open, onClose, onNext }) {
  const [tab, setTab] = useState("documents");
  const id = useId();
  useEffect(() => {
    if (open) setTab("documents");
  }, [open]);

  const handleTabKey = (event, index) => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    setTab(tabs[next].id);
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Evidence → design"
      label="DOCUMENTED PROVENANCE / EXPLICIT LIMITS"
      className="document-evidence"
      footer={
        <>
          <p className="de-footer-note">
            <ShieldCheck size={14} />
            Evidence informs the proposal. It does not validate the demo's effects or authorise an intervention.
          </p>
          {onNext && (
            <button className="button primary gp-dialog-demo-next" onClick={onNext}>
              Next Step <ArrowRight size={15} />
            </button>
          )}
        </>
      }
    >
      <div className="de-tabs" role="tablist" aria-label="Evidence views" data-presentation-shortcuts="off">
        {tabs.map(({ id: key, label, Icon }, index) => (
          <button
            key={key}
            id={`${id}-${key}-tab`}
            role="tab"
            aria-selected={tab === key}
            aria-controls={`${id}-${key}-panel`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(event) => handleTabKey(event, index)}
          >
            <Icon size={14} /> {label}
            {key === "questions" && <small>{DOCUMENT_OPEN_QUESTIONS.length}</small>}
          </button>
        ))}
      </div>

      <section
        className="de-panel"
        id={`${id}-${tab}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${tab}-tab`}
        tabIndex={0}
      >
        {tab === "benchmarks" && (
          <>
            <p className="de-introduction">
              Three background city experiences inform design principles. They do not expand the final scope or verify municipal integration, readiness or numerical effects.
            </p>
            {BENCHMARK_REFERENCES.map((benchmark) => {
              const Icon = icons[benchmark.city] || Landmark;
              return (
                <article className="de-benchmark" key={benchmark.city}>
                  <header>
                    <span className="de-number">{benchmark.number}</span>
                    <h3>{benchmark.city}</h3>
                    <Icon size={22} strokeWidth={1.5} />
                  </header>
                  <span className="de-status">{benchmark.status}</span>
                  <p className="de-context">{benchmark.context}</p>
                  <div className="de-principle"><ArrowRight size={13} /><strong>{benchmark.principle}</strong></div>
                  <p>{benchmark.summary}</p>
                  <details>
                    <summary>Source, transferability &amp; limits <ChevronDown size={12} /></summary>
                    <p>{benchmark.limitation}</p>
                    <small>{benchmark.reportedDate} · {benchmark.sourceSection}</small>
                    <div className="de-source-links">
                      {benchmark.links.map((link) => (
                        <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                          {link.label} <ArrowUpRight size={12} />
                        </a>
                      ))}
                    </div>
                  </details>
                </article>
              );
            })}
            <div className="de-boundary">
              <BookOpen size={17} />
              <p>Benchmark claims are interpretations of the supplied reports, not new independent research. No city comparison establishes GreenPulse's numerical effects.</p>
            </div>
          </>
        )}

        {tab === "documents" && (
          <>
            <div className="de-source-policy">
              <span className="de-eyebrow">WHICH VERSION DRIVES THE PROTOTYPE?</span>
              <h3>The final presentation defines the application.</h3>
              <p>{DOCUMENT_SOURCE_POLICY.statement}</p>
            </div>
            <div className="de-documents">
              {DOCUMENT_SOURCES.map((source) => (
                <article key={source.id}>
                  <div className="de-document-top"><FileText size={16} /><span>{source.format}</span><strong>{source.status}</strong></div>
                  <h3>{source.label}</h3>
                  <p className="de-filename">{source.filename}</p>
                  <p>{source.scope}</p>
                  <p className="de-document-authority">{source.authority}</p>
                  <small>{source.date}</small>
                </article>
              ))}
            </div>
            <div className="de-method-boundary">
              <span>18.0 → 16.2 min is an illustrative KPI calculation, not a measured baseline or achieved result.</span>
              <span>CO₂ requires vehicle-km and justified emission factors.</span>
              <span>Air quality requires matched observed concentrations.</span>
              <span>2030 annual reference values are not hourly alert thresholds.</span>
            </div>
            <div className="de-source-links de-method-links">
              {DOCUMENT_METHOD_REFERENCES.map((reference) => (
                <div key={reference.id}>
                  <a href={reference.href} target="_blank" rel="noreferrer">{reference.label}<ArrowUpRight size={12} /></a>
                  <small>{reference.scope}</small>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "questions" && (
          <>
            <p className="de-introduction">The final specification fixes scope and decision authority. These data dependencies must be validated before the corresponding pilot or target claims.</p>
            <div className="de-open-questions">
              {DOCUMENT_OPEN_QUESTIONS.map((question, index) => (
                <details key={question.id}>
                  <summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{question.title}</strong><ChevronDown size={13} /></summary>
                  <p>{question.difference}</p>
                  <div><span className="de-eyebrow">VALIDATION REQUIREMENT</span><p>{question.provisional}</p></div>
                  <small>{question.status} · {question.source}</small>
                </details>
              ))}
            </div>
          </>
        )}
      </section>
      <p className="de-profile-note">
        {REFERENCE_CITY_PROFILE.population} · {REFERENCE_CITY_PROFILE.fabric}. {REFERENCE_CITY_PROFILE.distinction}
      </p>
    </Drawer>
  );
}
