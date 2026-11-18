import { MODEL_VERSION } from "./decision.mjs";

export function decisionRecords(traffic, heat, proposals = []) {
  const records = [...(traffic?.overrides || []), ...(traffic?.modifications || []), ...(heat?.decisions || []), ...(heat?.overrides || []), ...proposals];
  const approved = traffic?.approvedDecision;
  if (approved) records.unshift({
    id: approved.snapshot.id,
    data: approved.data || approved.snapshot.qualityKey,
    modelVersion: approved.snapshot.modelVersion || MODEL_VERSION,
    recommendation: approved.snapshot.forecast.label,
    decision: { actor: `${approved.operator} · ${approved.authority}`, time: approved.approvedAt, approvedOrOverride: "approved" },
    result: traffic.status === "measured"
      ? { status: "inconclusive", summary: "Demonstration observation window completed. No municipal outcome or numerical observation dataset is inferred; inspect the entered KPI evidence separately." }
      : { status: "pending", summary: "Awaiting the observation window and outcome record." },
  });
  const protective = heat?.approvedDecision;
  if (protective) records.push({
    id: `HEAT-${protective.approvedAt}`,
    data: protective.data,
    modelVersion: protective.modelVersion,
    recommendation: "Human-reviewed heatwave preparedness, outreach and outdoor-operation coordination",
    decision: { actor: `${protective.operator} · ${protective.authority}`, time: protective.approvedAt, approvedOrOverride: "approved" },
    result: heat.status === "measured"
      ? { status: "inconclusive", summary: protective.result?.note || "Synthetic heat calculations recorded. No measured health or municipal benefit is claimed." }
      : { status: "pending", summary: "Protective response has no completed outcome record yet." },
  });
  return records;
}
