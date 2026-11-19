# Governance & Roadmap

GreenPulse supports three workflows through one shared municipal decision capability. This is a target-state prototype with synthetic operational data; no municipal systems are connected. This operating model follows slides 16–17 of the reviewed **CURRENT FINAL version-3.pptx**.

## One coordinator, clear departmental authority

| Role in slide 16 | Responsibility |
| :-- | :-- |
| Municipal Executive / Steering Group | Set priorities, approve budget, resolve cross-department issues and decide whether to scale. |
| Control Room Coordinator | Route alerts, maintain the decision log, track response and coordinate KPI review. |
| Mobility Department | Own Daily Traffic; assess and approve traffic interventions within its authority. |
| Municipal Police | Operate ZTL processes, control access to identifiable records and apply authorised enforcement through the established legal process. |
| Environment / Urban Planning | Maintain environmental and green-space layers; interpret heat and environmental information. |
| Civil Protection / Social Services | Lead heat-response coordination under existing plans and support targeted outreach. |
| IT / Digital Office | Manage interfaces, security, access control, data quality and technical continuity. |
| External partners | Provide agreed feeds and specialist validation under documented contracts and data terms. |

Source owners retain responsibility for original records. The municipality retains access to its data, configurations and decision history. These are proposed implementation responsibilities; the browser prototype does not provide production identity management, durable audit storage or external system control.

## Human decision rights

| Workflow / responsibility | Accountable authority | Supporting actors |
| :-- | :-- | :-- |
| Daily Traffic approval | **Mobility Department** | Municipal Police; IT / Digital Office. |
| Traffic execution | **Authorised traffic-signal operator**, after Mobility approval | Source/controller custodians and the named operator. |
| ZTL operational/legal action | **Municipal Police** and the established legal process | Mobility Department; IT / Data Office; data-protection authority or authorised privacy lead. |
| Heat response approval / activation | **Civil Protection** | Environment / Urban Planning; Social Services; IT / Data Office. |
| Environmental interpretation | **Environment / Urban Planning** | Validated environmental-data providers. |
| Outreach | **Social Services** | Civil Protection and relevant service owners. |

AI may recommend but never execute autonomously. Traffic approval is separate from authorised execution. ZTL recorded entries are not automatically violations; compliance requires lawful, technically validated linkage to permits and exemptions. The prototype displays no identifiable licence-plate records and cannot change ZTL rules automatically.

Every approval, rejection, modification and execution belongs in the Decision Log. K4 measures alert-to-human-decision time, with an illustrative pilot target under 10 minutes. K7 targets 100% complete records; it measures logging completeness rather than decision quality. KPI ownership/frequency follows slide 12 and is documented separately in [KPI methodology](KPI-METHODOLOGY.md).

## Three progressive stages

| Period | Stage | Work and validation gate |
| :-- | :-- | :-- |
| **0–6 months** | **Discover & Prepare** | Confirm source owners, access, interfaces and legal basis. Audit traffic/ZTL coverage and GIS. Resolve paid-parking supplier access if prioritised. Establish the coordinator, decision log and first baselines. Validate camera/OCR timestamp linkage and the suitability of external forecasts and territorial data for heat preparedness. |
| **6–18 months** | **Integrate & Pilot** | Connect validated priority feeds only. Pilot targeted traffic operations with Mobility approval and authorised execution. Establish ZTL access-pattern reporting separately. Run heatwave preparedness under existing plans. Review KPI quality, staff capacity and operating cost. |
| **18–36 months** | **Extend Selectively** | Add sensors only where a documented gap justifies investment. Consider selective simulation / Digital Twin functions. Consider flooding only with data, skills and a funded owner; it is not a fourth active workflow. Publish aggregate results and review cost/value annually. Retain, redesign or retire components based on evidence. |

Dates do not make capabilities ready. Prediction, Digital Twin simulation, new environmental sensors and full KPI coverage are not currently operational. Each extension requires evidence, clear ownership and applicable legal/safety validation. K2 needs validated K1/activity data and approved factors, K3 needs regional agency data and/or validated sensors, and K5 needs validated local heat sensing. K6 requires a validated cooling-point inventory and a pilot-defined accessibility threshold.

## Sustainability conditions

| Dimension from slide 17 | Condition |
| :-- | :-- |
| Organisational | Named owners, backups, training and agreed workflows. |
| Informational | Documented access, quality, retention and data responsibility. |
| Technical | Interoperable interfaces, exportable data, manual fallback and security. |
| Economic | Phased investment and a continuing budget for maintenance, licences, staff and renewal. |

## Evidence boundaries

- **Daily Traffic:** 18 monitoring cameras, 4 vehicle-counting loops at 3 public parking areas, 4 traffic-light controllers, 21 ITS panels and municipal GIS form the supplied reference evidence. Until timestamp linkage is validated, use counts and queue patterns at monitored locations only. Five paid-parking sensors are installed but their data remains unavailable until the supplier contract is finalised.
- **ZTL Access:** 10 gates, 16 OCR cameras and GIS support potential aggregate analysis. Relevant Police, traffic-fine and permit/exemption records are conditional on lawful and technically validated access.
- **Heat Preparedness:** official external weather forecasts, demographic registry, GIS, partial tree/green-space inventory and civil-protection plans support indicative priorities. No local temperature/humidity network, validated cooling-point inventory or real-time health/exposure feed is documented. Green-space distribution does not prove cooling.

## Five architecture layers

1. Sources
2. Integration
3. Urban Data Hub
4. Analytics / Selective Digital Twin
5. Action & Evidence

**Target-state architecture, implemented progressively after data validation.** Slide 9 calls the final layer “Action layer”; the application label makes its approvals, alerts and evidence responsibility explicit.
