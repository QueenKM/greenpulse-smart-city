import { Database, Map, ThermometerSun, Wind } from "lucide-react";
import { REFERENCE_ASSETS, USE_CASES } from "../use-case-spec.mjs";

export default function ReferenceInventory() {
  return <section className="reference-inventory" aria-label="Current evidence and data gaps">
    <header><span className="eyebrow">CURRENT / PRESENTATION EVIDENCE</span><h2>Three workflows. One shared decision capability.</h2><p>The supplied evidence informs pilot preparation. Leuven geography is spatial context; these systems are not connected to the prototype.</p></header>
    <div className="inventory-list">{REFERENCE_ASSETS.map(asset=><article key={asset.id}><Database size={17}/><strong>{asset.count ?? "No data"}</strong><div><h3>{asset.label}</h3><p>{asset.caveat}</p></div><span>CURRENT · supplied evidence</span></article>)}</div>
    <div className="inventory-gaps"><article><Map size={20}/><div><h3>CURRENT / Municipal GIS and territorial records</h3><p>GIS supports all three workflows. Heat preparedness also uses official external weather forecasts, the demographic registry, partial tree/green-space inventory and civil-protection plans.</p></div></article><article><Wind size={20}/><div><h3>K3 · TARGET / NO DATA</h3><p>Measured NO₂ and PM2.5 require ARPA integration and/or new validated sensors. No municipal air-quality system is connected.</p></div></article><article><ThermometerSun size={20}/><div><h3>Heat sensing and cooling inventory are gaps</h3><p>{USE_CASES.heat.gaps.join(". ")}. K5 requires validated local sensing; K6 requires a validated inventory and pilot-defined walking-time or network-distance threshold.</p></div></article></div>
  </section>;
}
