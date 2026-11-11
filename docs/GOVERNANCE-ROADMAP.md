# GreenPulse proposed governance and phase gates

GreenPulse is a target-state prototype using synthetic demonstration data. These role names, responsibilities and acceptance gates are proposals to validate against the municipal inventory. They are not a verified description of Leuven's organisation, systems, data availability or operating capabilities. Leuven geography provides context only.

## Accountability principles

- A named municipal operator reviews each recommendation and explicitly approves any operational intervention. AI never executes an intervention.
- The accountable service owner owns the operational outcome, escalation and rollback arrangements. Accountability remains visible during handover.
- Named source stewards own data definitions, quality, access and retention. IT implements integrations; integration does not transfer source ownership.
- Model owners document assumptions, limitations, validation evidence and versions. A model-governance review authorises model changes, not operational actions.
- Record evidence, the selected option, human approval, lifecycle events and the measurement outcome in the decision log. Do not report a measured outcome before the observation window completes.

RACI below means accountable (A), responsible (R), consulted (C) and informed (I). Each assignment is provisional. Confirm actual departments, named people, delegated authority and support coverage before implementation.

## Current inventory — discovery before claims

**A:** Municipal programme lead (proposed).

**R:** Discovery team with proposed Mobility, Environment and IT source custodians.

**C:** Municipal sponsor, system owners, information governance and operational staff.

**I:** Departments whose data or workflows are in scope.

**Decision authority:** A municipal sponsor authorises discovery. The prototype does not verify any municipal operating capability.

**Proposed acceptance gate:** Sign off a municipal inventory and data statement covering source coverage, quality, lawful access, named ownership and integration gaps. Document what is unavailable or unknown before defining the MVP.

**Dependency:** Municipal stakeholder validation and access to source-system documentation.

## MVP — 0–6 months

**A:** Mobility Operations (proposed).

**R:** IT for priority integrations and data-quality monitoring; named operators for review, approval and intervention monitoring; Environment for air-quality stewardship.

**C:** Source-system owners, information governance and operational support.

**I:** Environment, transport stakeholders and the municipal sponsor, according to agreed escalation rules.

**Decision authority:** A named control-room operator approves, modifies, pauses or reverses each action. Mobility owns escalation. Approval is explicit and recorded; AI remains advisory.

**Proposed acceptance gate:** Agree a baseline and feed-quality thresholds. Approve named source owners and the Mobility–IT–Environment RACI. Test approval, audit logging, rollback, handover and escalation in an operational drill before enabling a live traffic workflow.

**Dependency:** Authorised priority feeds, traffic-control interfaces, support cover and a signed allocation of responsibilities.

## Capability development — 6–18 months

**A:** Cross-department steering group (proposed).

**R:** Mobility and Environment under an agreed RACI; IT for source access, retention and integration duties; a nominated heat-response lead for the heat protocol.

**C:** Source stewards, model specialists, public-health and vulnerable-population partners, accessibility representatives and information governance.

**I:** Participating departments and the municipal programme sponsor.

**Decision authority:** Mobility approves traffic changes. A nominated heat lead approves heat-response actions under an agreed protocol. Cross-department escalation and handover responsibilities must be explicit.

**Proposed acceptance gate:** Pass a joint operational drill and a forecast backtest before expansion. Approve the heat-response protocol, source access and retention rules. Backtest acceptance criteria, relevant time horizons and failure conditions must be agreed before testing.

**Dependency:** Historical datasets, named heat-response partners and an agreed service and escalation protocol.

## GreenPulse target state — 18–36 months

**A:** Urban Data Hub service owner (proposed).

**R:** Named source stewards, digital-twin and model owners, municipal operators and integration/service teams.

**C:** Model-governance board, participating departments, accessibility and heritage specialists, information governance and operational assurance.

**I:** Municipal leadership and affected departments through an agreed reporting process.

**Decision authority:** Named municipal operators retain approval of operational actions. A model-governance board reviews model versions, assumptions and periodic validation; it does not execute interventions.

**Proposed acceptance gate:** Demonstrate benefit against approved baselines and preserve accessibility and historic-centre constraints. Complete periodic validation, continuity and rollback tests. Expand only where benefit and operational readiness are evidenced.

**Dependency:** Funded service ownership, interoperable sources, monitored models and recurring governance review.

## Operational process

1. **Inventory:** Establish the source, owner, quality, lawful access and limitations of the evidence.
2. **Predict and compare:** Present modelled outcomes, uncertainty, tradeoffs and constraints alongside observed data.
3. **Human decision:** Record the authorised operator, selected scenario, owner, supporting department, duration and escalation trigger.
4. **Activate and monitor:** Apply only an explicitly approved intervention. Keep pause, handover, close and rollback paths available.
5. **Measure:** Close the intervention and complete the defined measurement window before publishing an outcome. The prototype compresses the illustrative 60-minute window into five seconds for presentation.
6. **Learn and govern:** Compare predicted and actual change, investigate errors, review model validity and record any proposed model update for human governance review.

No phase is automatically accepted because its calendar window has elapsed. Acceptance requires documented evidence and municipal approval. Specific numeric thresholds, legal bases, retention periods, named authorities and organisational assignments remain subject to the municipal inventory and implementation design.
