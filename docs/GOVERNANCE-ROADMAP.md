# Governance & Roadmap

GreenPulse supports three workflows through one shared municipal decision capability. This is a target-state prototype with synthetic operational data; no municipal systems are connected.

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

Every approval, rejection, modification and execution belongs in the Decision Log. K4 measures alert-to-human-decision time, with an illustrative pilot target under 10 minutes. K7 targets 100% complete records; it measures logging completeness rather than decision quality.

## Three progressive stages

| Period | Stage | Work and validation gate |
| :-- | :-- | :-- |
| **0–6 months** | **Discover & Prepare** | Confirm source inventory, owners, coverage, freshness, lawful access and privacy responsibilities. Select the traffic corridor; validate camera/OCR timestamp linkage and define the real pilot baseline. Validate a cooling-point inventory and pilot-defined accessibility threshold. Prepare K4/K7 logging. |
| **6–18 months** | **Integrate & Pilot** | Connect validated priority sources. Pilot targeted traffic operations with Mobility approval and authorised execution. Compare aggregate ZTL gate/period patterns under legal procedures. Coordinate heat preparedness using official forecasts and territorial evidence. Evaluate pilot claims against documented baselines and limitations. |
| **18–36 months** | **Extend Selectively** | Extend only where pilot evidence and ownership support it. Develop the Urban Data Hub and selective analytics / Digital Twin progressively. K2 needs validated K1 and approved factors; K3 needs ARPA and/or validated sensors; K5 needs validated local heat sensing. |

Dates do not make capabilities ready. Prediction, Digital Twin simulation, new environmental sensors and full KPI coverage are not currently operational. Each extension requires evidence, clear ownership and applicable legal/safety validation.

## Evidence boundaries

- **Daily Traffic:** 18 monitoring cameras, 4 vehicle-counting loops, 4 traffic-light controllers, 21 ITS panels and municipal GIS form the supplied reference evidence. Until timestamp linkage is validated, use counts and queue patterns at monitored locations only.
- **ZTL Access:** 10 gates, 16 OCR cameras and GIS support potential aggregate analysis. Police/permit data is conditional on lawful and technically validated access.
- **Heat Preparedness:** official external weather forecasts, demographic registry, GIS, partial tree/green-space inventory and civil-protection plans support indicative priorities. No local temperature/humidity network, validated cooling-point inventory or real-time health/exposure feed is documented. Green-space distribution does not prove cooling.

## Five architecture layers

1. Sources
2. Integration
3. Urban Data Hub
4. Analytics / Selective Digital Twin
5. Action & Evidence

**Target-state architecture, implemented progressively after data validation.**
