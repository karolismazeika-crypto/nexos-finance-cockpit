"use client";

import { useMemo, useState } from "react";
import {
  actuals,
  euro,
  euroCompact,
  getDecisionFlags,
  getRevenueBridge,
  modelScenario,
  presets,
  type ScenarioAssumptions,
} from "./lib/finance";
import regulatoryRadar from "./data/regulatory-radar.json";

type View = "cockpit" | "revenue" | "scenario" | "close" | "compliance" | "regulatory";

const revenueTrend = [
  ["Oct", 315], ["Nov", 328], ["Dec", 342], ["Jan", 351], ["Feb", 366], ["Mar", 382],
] as const;
const cashTrend = [
  ["Oct", 6.25], ["Nov", 6.02], ["Dec", 5.78], ["Jan", 5.51], ["Feb", 5.25], ["Mar", 5.0],
] as const;

type Drilldown = "arr" | "nrr" | "margin" | "cash" | "burn" | "runway";
const topClients = [
  ["Enterprise Client A", 620_000], ["Enterprise Client B", 540_000], ["Enterprise Client C", 475_000], ["Enterprise Client D", 420_000], ["Enterprise Client E", 365_000], ["Enterprise Client F", 330_000], ["Enterprise Client G", 290_000], ["Enterprise Client H", 255_000], ["Enterprise Client I", 225_000], ["Enterprise Client J", 205_000],
] as const;
const contracts = [
  { customerName:"Enterprise Client A", subscriptionAmount:120_000, implementationFee:15_000, amountInvoiced:135_000, cashCollected:100_000, elapsedMonths:3, term:"01 Jan — 31 Dec 2026" },
  { customerName:"Enterprise Client B", subscriptionAmount:180_000, implementationFee:20_000, amountInvoiced:110_000, cashCollected:92_000, elapsedMonths:5, term:"01 Nov 2025 — 31 Oct 2026" },
  { customerName:"Enterprise Client C", subscriptionAmount:96_000, implementationFee:12_000, amountInvoiced:108_000, cashCollected:108_000, elapsedMonths:6, term:"01 Oct 2025 — 30 Sep 2026" },
  { customerName:"Enterprise Client D", subscriptionAmount:240_000, implementationFee:0, amountInvoiced:60_000, cashCollected:45_000, elapsedMonths:3, term:"01 Jan — 31 Dec 2026" },
  { customerName:"Enterprise Client E", subscriptionAmount:150_000, implementationFee:18_000, amountInvoiced:168_000, cashCollected:130_000, elapsedMonths:9, term:"01 Jul 2025 — 30 Jun 2026" },
] as const;
const drilldowns: Record<Drilldown, { title: string; subtitle: string; rows: readonly (readonly [string, string, string])[] }> = {
  arr: { title: "ARR concentration and movement", subtitle: "Top customers · closing ARR €4.8m", rows: topClients.slice(0,5).map(([name, value], i) => [name, euroCompact(value), `${(value / actuals.arr * 100).toFixed(1)}% · ${i < 2 ? "Concentration watch" : "Stable"}`]) },
  nrr: { title: "Net revenue retention drivers", subtitle: "Trailing 12 months · 108% NRR", rows: [["Opening ARR","€4.36m","100% baseline"],["Expansion ARR","+€620k","14.2%"],["Contraction","(€150k)","3.4%"],["Churned ARR","(€180k)","4.1%"],["Closing retained ARR","€4.65m","108% NRR"]] },
  margin: { title: "Gross margin movement", subtitle: "68% platform gross margin · 3 pts below plan", rows: [["Subscription revenue","€382k","Monthly"],["LLM inference","(€72k)","18.8% of revenue"],["Cloud infrastructure","(€38k)","9.9%"],["Customer operations","(€12k)","3.1%"],["Gross profit","€260k","68.0% margin"]] },
  cash: { title: "Cash sources and restrictions", subtitle: "€5.0m closing balance", rows: [["Equity funding", "€3.20m", "Unrestricted"], ["Customer collections", "€1.35m", "Operating cash"], ["R&D grant advances", "€0.25m", "Restricted"], ["Interest & other", "€0.20m", "Unrestricted"]] },
  burn: { title: "Monthly net burn drivers", subtitle: "March 2026 · click-through cost attribution", rows: [["Payroll & benefits", "€438k", "58% of gross outflow"], ["AI infrastructure", "€142k", "19%"], ["Sales & marketing", "€91k", "12%"], ["G&A and professional fees", "€57k", "8%"], ["Other operating costs", "€25k", "3%"], ["Less: cash collections", "(€503k)", "Net burn €250k"]] },
  runway: { title: "Runway sensitivity", subtitle: "Current cash divided by net monthly burn", rows: [["Current run-rate", "20.0 mo", "€250k burn"], ["10% lower collections", "17.7 mo", "€283k burn"], ["Hiring delayed 3 months", "22.4 mo", "€223k burn"]] },
};

function Info({ text }: { text: string }) {
  return <span className="info" title={text} aria-label={text}>i</span>;
}

function Metric({ label, value, delta, info, onClick, active }: { label: string; value: string; delta?: string; info?: string; onClick?: () => void; active?: boolean }) {
  const content = <><div className="metric-label">{label}{info && <Info text={info} />}</div><div className="metric-value">{value}</div>{delta && <div className="metric-delta">{delta}</div>}{onClick && <span className="open-detail">View detail →</span>}</>;
  if (onClick) return <button className={`metric-card metric-button ${active ? "selected" : ""}`} onClick={onClick}>{content}</button>;
  return <article className="metric-card">
    {content}
  </article>;
}

function Bars({ data, unit }: { data: readonly (readonly [string, number])[]; unit: "k" | "m" }) {
  const max = Math.max(...data.map(([, value]) => value));
  return <div className="bar-chart" role="img" aria-label="Six month trend chart">
    {data.map(([label, value], index) => <div className="bar-column" key={label}>
      <span className="bar-value">{unit === "k" ? `€${value}k` : `€${value.toFixed(1)}m`}</span>
      <div className="bar-track"><div className={`bar-fill ${index === data.length - 1 ? "current" : ""}`} style={{ height: `${Math.max(18, value / max * 100)}%` }} /></div>
      <span>{label}</span>
    </div>)}
  </div>;
}

function Cockpit({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [detail, setDetail] = useState<Drilldown>("arr");
  const selected = drilldowns[detail];
  return <section className="view">
    <div className="page-heading executive-heading"><div><p className="eyebrow">EXECUTIVE COCKPIT</p><div className="signal-line"><span className="signal-icon positive">✓</span><h1>Retention supports growth</h1></div><div className="signal-line"><span className="signal-icon attention">!</span><h1>AI margin needs action</h1></div></div><div className="executive-summary"><p className="eyebrow">EXECUTIVE ASSESSMENT</p><strong>ARR reached €4.8m and NRR remains healthy at 108%, but gross margin is three points below plan.</strong><p>Pipeline coverage supports the growth plan. Leadership should prioritise model routing and enterprise pricing before accelerating hiring; cash runway remains 20 months.</p></div></div>
    <div className="metrics-grid">
      <Metric label="ARR" value={euroCompact(actuals.arr)} delta="↑ 8.2% vs prior quarter" info="Annual recurring revenue at the current run rate." onClick={() => setDetail("arr")} active={detail === "arr"}/>
      <Metric label="Net revenue retention" value="108%" delta="Target ≥ 110%" info="Opening recurring revenue retained including expansion." onClick={() => setDetail("nrr")} active={detail === "nrr"}/>
      <Metric label="Platform gross margin" value="68%" delta="3 pts below plan" onClick={() => setDetail("margin")} active={detail === "margin"}/>
      <Metric label="Cash balance" value={euroCompact(actuals.cashBalance)} delta="€0.3m below plan" onClick={() => setDetail("cash")} active={detail === "cash"}/>
      <Metric label="Monthly net burn" value={euroCompact(actuals.monthlyNetBurn)} delta="↑ €24k vs prior month" info="Cash outflows less cash inflows for the month." onClick={() => setDetail("burn")} active={detail === "burn"}/>
      <Metric label="Runway" value={`${actuals.cashBalance / actuals.monthlyNetBurn} mo`} delta="Planning threshold: 18 mo" info="Cash balance divided by current monthly net burn." onClick={() => setDetail("runway")} active={detail === "runway"}/>
    </div>
    <article className="drilldown-panel"><div className="drilldown-title"><div><p className="eyebrow">KPI DRILL-DOWN</p><h2>{selected.title}</h2><span>{selected.subtitle}</span></div><span className="live-tag">Selected: {detail}</span></div><div className="drilldown-list">{selected.rows.map(([name,value,note],i)=><div key={name}><span className="rank">{String(i+1).padStart(2,"0")}</span><b>{name}</b><strong>{value}</strong><em>{note}</em></div>)}</div></article>
    <div className="exec-scorecards"><article className="panel"><div className="panel-header"><div><p className="eyebrow">COMMERCIAL ENGINE</p><h2>Growth quality</h2></div><span className="status good">3.1× pipeline cover</span></div><div className="mini-score-grid"><div><span>New ARR</span><b>€410k</b><small>Q1</small></div><div><span>Expansion ARR</span><b>€190k</b><small>Q1</small></div><div><span>GRR</span><b>96%</b><small>Target 95%</small></div><div><span>CAC payback</span><b>14 mo</b><small>Target ≤15</small></div></div><button className="panel-link" onClick={()=>onNavigate("revenue")}>Open commercial engine →</button></article><article className="panel"><div className="panel-header"><div><p className="eyebrow">AI FINOPS</p><h2>Cost-to-serve</h2></div><span className="status warn">Margin gap 3 pts</span></div><div className="mini-score-grid"><div><span>LLM cost</span><b>€72k</b><small>Monthly</small></div><div><span>Cost / 1k requests</span><b>€1.84</b><small>↓ 6%</small></div><div><span>Top supplier</span><b>58%</b><small>Concentration</small></div><div><span>Platform margin</span><b>68%</b><small>Target 71%</small></div></div><button className="panel-link" onClick={()=>onNavigate("scenario")}>Open AI economics →</button></article></div>
    <div className="decision-section"><div className="section-heading"><div><p className="eyebrow">DECISION FLAGS</p><h2>Where leadership needs to act</h2></div><span className="as-of">As of 31 Mar 2026</span></div>
      <div className="flag-list"><article className="flag"><span className="flag-number amber">01</span><div><h3>Protect platform margin</h3><p>Higher-complexity workloads are growing faster than contract repricing. Route eligible traffic to efficient models and introduce consumption guardrails.</p></div><button onClick={()=>onNavigate("scenario")}>Review AI economics →</button></article><article className="flag"><span className="flag-number amber">02</span><div><h3>Convert enterprise pipeline</h3><p>Pipeline coverage is healthy, but the 74-day sales cycle delays cash conversion. Focus executive sponsorship on five late-stage opportunities.</p></div><button onClick={()=>onNavigate("revenue")}>Review pipeline →</button></article></div>
    </div>
  </section>;
}

function RevenueBridge() {
  const arrBridge = [["Opening ARR",4.36,"base"],["New ARR",.41,"up"],["Expansion",.19,"up"],["Contraction",-.07,"down"],["Churn",-.09,"down"],["Closing ARR",4.80,"close"]] as const;
  const pipeline = [["Qualified",6.8,34],["Solution fit",4.1,18],["Commercial",2.3,9],["Commit",1.2,5]] as const;
  const opportunities = [["Enterprise Client K","€420k","Commit","24 days"],["Enterprise Client L","€310k","Commercial","41 days"],["Enterprise Client M","€260k","Commercial","63 days"],["Enterprise Client N","€190k","Solution fit","72 days"],["Enterprise Client O","€165k","Solution fit","81 days"]] as const;
  return <section className="view">
    <div className="page-heading"><div><p className="eyebrow">COMMERCIAL ENGINE</p><h1>Turn pipeline into<br/><span>durable ARR.</span></h1></div><p className="management-question">Is growth repeatable, efficient and sufficiently retained to justify the next investment?</p></div>
    <div className="commercial-kpis"><Metric label="New ARR · Q1" value="€410k" delta="102% of plan"/><Metric label="Expansion ARR · Q1" value="€190k" delta="46% of new ARR"/><Metric label="NRR · TTM" value="108%" delta="Target ≥110%"/><Metric label="GRR · TTM" value="96%" delta="Target ≥95%"/><Metric label="Win rate" value="27%" delta="↑ 3 pts QoQ"/><Metric label="CAC payback" value="14 mo" delta="Target ≤15 mo"/><Metric label="Sales cycle" value="74 days" delta="↑ 8 days QoQ"/></div>
    <div className="commercial-grid"><article className="panel"><div className="panel-header"><div><p className="eyebrow">ARR WATERFALL</p><h2>Quarterly recurring revenue movement</h2></div><span className="status good">+10.1% net growth</span></div><div className="arr-waterfall">{arrBridge.map(([label,value,type])=><div className={type} key={label}><span>{label}</span><i style={{height:`${Math.max(18,Math.abs(value)/4.8*150)}px`}}/><strong>{value<0?"−":value>0&&type!=="base"&&type!=="close"?"+":""}€{Math.abs(value).toFixed(2)}m</strong></div>)}</div></article><article className="panel"><div className="panel-header"><div><p className="eyebrow">PIPELINE COVERAGE</p><h2>€6.8m qualified pipeline</h2></div><span className="status neutral">3.1× next-quarter target</span></div><div className="pipeline-funnel">{pipeline.map(([label,value,count])=><div key={label}><span>{label}<small>{count} opportunities</small></span><i><u style={{width:`${value/6.8*100}%`}}/></i><strong>€{value.toFixed(1)}m</strong></div>)}</div><div className="pipeline-callout"><b>Executive decision</b><p>Five committed opportunities cover 55% of the Q2 new ARR target. Assign executive sponsors and protect solution-engineering capacity.</p></div></article></div>
    <div className="commercial-grid lower"><article className="panel"><div className="panel-header"><div><p className="eyebrow">ACQUISITION EFFICIENCY</p><h2>Go-to-market productivity</h2></div><span className="status warn">Sales cycle rising</span></div><div className="efficiency-table"><div><span>Metric</span><span>Current</span><span>Plan</span><span>Trend</span></div><div><b>Blended CAC</b><span>€18.6k</span><span>€19.2k</span><em className="good-text">Favourable</em></div><div><b>CAC payback</b><span>14 mo</span><span>15 mo</span><em className="good-text">Favourable</em></div><div><b>Win rate</b><span>27%</span><span>25%</span><em className="good-text">+2 pts</em></div><div><b>Sales cycle</b><span>74 days</span><span>65 days</span><em className="warn-text">+9 days</em></div></div></article><article className="panel"><div className="panel-header"><div><p className="eyebrow">LATE-STAGE DEALS</p><h2>Top five opportunities</h2></div><span className="status neutral">€1.35m potential ARR</span></div><div className="opportunity-list">{opportunities.map(([name,arr,stage,age],i)=><div key={name}><span>0{i+1}</span><b>{name}</b><strong>{arr}</strong><em>{stage}</em><small>{age}</small></div>)}</div></article></div>
  </section>;
}

function ScenarioPlanner() {
  const [routing, setRouting] = useState(35);
  const [priceLift, setPriceLift] = useState(4);
  const [volumeGrowth, setVolumeGrowth] = useState(20);
  const economics = useMemo(()=>{const llm=72000*(1+volumeGrowth/100)*(1-routing*.006);const revenue=382000*(1+volumeGrowth/100)*(1+priceLift/100);const grossProfit=revenue-llm-38000-12000;return {llm,revenue,margin:grossProfit/revenue*100,costPerThousand:1.84*(1-routing*.006)}},[routing,priceLift,volumeGrowth]);
  return <section className="view">
    <div className="page-heading"><div><p className="eyebrow">AI ECONOMICS</p><h1>Scale consumption.<br/><span>Protect the margin.</span></h1></div><p className="management-question">Which customers, workloads and model suppliers create value—and where is AI consumption diluting platform margin?</p></div>
    <div className="ai-kpis"><Metric label="Platform gross margin" value="68%" delta="Target 71%"/><Metric label="LLM cost · monthly" value="€72k" delta="18.8% of revenue"/><Metric label="Infrastructure cost" value="€38k" delta="9.9% of revenue"/><Metric label="Cost / 1k requests" value="€1.84" delta="↓ 6% QoQ"/><Metric label="Consumption / customer" value="1.9m" delta="Requests · monthly"/><Metric label="Top supplier share" value="58%" delta="Target <50%"/></div>
    <div className="ai-grid"><article className="panel"><div className="panel-header"><div><p className="eyebrow">MODEL MIX</p><h2>Requests and cost by model tier</h2></div><span className="status warn">Supplier concentration 58%</span></div><div className="model-mix"><div><span>Frontier reasoning</span><i><u style={{width:"18%"}}/></i><b>18% volume</b><strong>42% cost</strong></div><div><span>Balanced general</span><i><u style={{width:"47%"}}/></i><b>47% volume</b><strong>39% cost</strong></div><div><span>Efficient / small</span><i><u style={{width:"35%"}}/></i><b>35% volume</b><strong>19% cost</strong></div></div><div className="supplier-row"><div><span>Supplier A</span><b>58%</b></div><div><span>Supplier B</span><b>27%</b></div><div><span>Open / other</span><b>15%</b></div></div></article><article className="panel"><div className="panel-header"><div><p className="eyebrow">CUSTOMER ECONOMICS</p><h2>Contribution by consumption cohort</h2></div><span className="status neutral">Portfolio view</span></div><div className="cohort-table"><div><span>Cohort</span><span>ARR</span><span>AI cost</span><span>Margin</span></div><div><b>Enterprise · governed</b><span>€2.1m</span><span>€238k</span><em className="good-text">76%</em></div><div><b>Enterprise · intensive</b><span>€1.4m</span><span>€312k</span><em className="warn-text">61%</em></div><div><b>Growth</b><span>€0.9m</span><span>€126k</span><em>67%</em></div><div><b>Long tail</b><span>€0.4m</span><span>€61k</span><em>64%</em></div></div></article></div>
    <div className="scenario-layout ai-scenario"><aside className="controls-panel"><p className="eyebrow">MARGIN SCENARIO</p><label><span><b>Traffic routed to efficient models</b><output>{routing}%</output></span><input type="range" min="0" max="70" value={routing} onChange={e=>setRouting(+e.target.value)}/></label><label><span><b>Consumption price uplift</b><output>{priceLift}%</output></span><input type="range" min="0" max="15" value={priceLift} onChange={e=>setPriceLift(+e.target.value)}/></label><label><span><b>Request volume growth</b><output>{volumeGrowth}%</output></span><input type="range" min="0" max="60" value={volumeGrowth} onChange={e=>setVolumeGrowth(+e.target.value)}/></label></aside><div className="scenario-results"><div className="result-grid ai-result-grid"><Metric label="Scenario revenue" value={euroCompact(economics.revenue)} delta={`+${volumeGrowth}% volume`}/><Metric label="Scenario LLM cost" value={euroCompact(economics.llm)} delta={`${routing}% efficient routing`}/><Metric label="Cost / 1k requests" value={`€${economics.costPerThousand.toFixed(2)}`} delta="Blended model cost"/><Metric label="Platform margin" value={`${economics.margin.toFixed(1)}%`} delta={`${economics.margin>=71?"At / above target":"Below 71% target"}`}/></div><article className="narrative"><span className="pulse"/><div><p className="eyebrow">MANAGEMENT IMPLICATION</p><h3>{economics.margin>=71?"Routing and price discipline restore platform margin above target; scale can proceed with monthly cohort monitoring.":"Growth remains margin-dilutive. Increase efficient-model routing or reprice high-consumption enterprise workloads before accelerating volume."}</h3></div></article></div></div>
  </section>;
}

function MonthEndClose() {
  const reconciliations = [
    ["Cash & bank", "12 / 12", "100%", "Signed off", "Controller"], ["Accounts receivable", "7 / 8", "88%", "1 exception", "AR Lead"], ["Accounts payable", "9 / 9", "100%", "Signed off", "AP Lead"], ["Payroll & benefits", "6 / 6", "100%", "Signed off", "People Ops"], ["Deferred revenue", "14 / 15", "93%", "1 exception", "Revenue Accountant"], ["Intercompany", "4 / 5", "80%", "2 exceptions", "Group Finance"],
  ];
  const exceptions = [
    ["IC-2403", "Intercompany hosting charge", "€18.4k", "34 days", "Group Finance", "High"], ["REV-118", "Contract modification review", "€12.0k", "12 days", "Revenue Accountant", "Medium"], ["AR-771", "Unapplied enterprise receipt", "€6.8k", "8 days", "AR Lead", "Medium"], ["FX-029", "Foreign-currency variance", "€3.8k", "4 days", "Controller", "Low"],
  ];
  return <section className="view">
    <div className="page-heading close-heading"><div><p className="eyebrow">RECORD TO REPORT</p><div className="signal-line"><span className="signal-icon positive">✓</span><h1>March close achieved on WD3</h1></div><p className="close-subtitle">Books signed off at 17:40 · target 18:00 · two reconciliation exceptions carried under documented review.</p></div><div className="close-verdict"><span>ON TIME</span><strong>WD3</strong><small>3-month average: WD3.3</small></div></div>
    <div className="close-metrics"><Metric label="Close completion" value="96%" delta="48 of 50 tasks complete"/><Metric label="Reclasses posted" value="7" delta="€84k gross value"/><Metric label="Late journals" value="2" delta="After WD2 cut-off"/><Metric label="Unreconciled balance" value="€41k" delta="0.3% of balance-sheet value"/><Metric label="Aged items >30 days" value="€18k" delta="1 item · intercompany"/><Metric label="Post-close adjustments" value="1" delta="€6k · below materiality"/></div>
    <article className="panel close-timeline"><div className="panel-header"><div><p className="eyebrow">CLOSE TIMELINE</p><h2>Critical path to WD3</h2></div><span className="status good">Target achieved</span></div><div className="timeline"><div className="done"><b>WD−2</b><span>Subledgers frozen</span><small>18:10</small></div><div className="done"><b>WD1</b><span>Bank, AP & payroll posted</span><small>16:25</small></div><div className="done"><b>WD2</b><span>Revenue & accrual review</span><small>19:05</small></div><div className="done current"><b>WD3</b><span>Management sign-off</span><small>17:40</small></div><div><b>WD4</b><span>Reporting pack issued</span><small>Planned 12:00</small></div></div></article>
    <div className="close-grid"><article className="panel reconciliation-panel"><div className="panel-header"><div><p className="eyebrow">BALANCE-SHEET CONTROL</p><h2>Reconciliation status</h2></div><span className="status warn">4 open items</span></div><div className="recon-table"><div className="recon-head"><span>Area</span><span>Accounts</span><span>Complete</span><span>Status</span><span>Owner</span></div>{reconciliations.map(row=><div className="recon-row" key={row[0]}>{row.map((cell,i)=><span key={cell} className={i===3&&cell!=="Signed off"?"exception":""}>{cell}</span>)}</div>)}</div></article>
      <aside className="panel journal-panel"><div className="panel-header"><div><p className="eyebrow">JOURNAL QUALITY</p><h2>Reclasses and late entries</h2></div></div><div className="journal-chart"><div><span>Revenue mapping</span><i><u style={{width:"43%"}}/></i><b>3</b></div><div><span>Cost centre</span><i><u style={{width:"29%"}}/></i><b>2</b></div><div><span>Accrual timing</span><i><u style={{width:"14%"}}/></i><b>1</b></div><div><span>FX classification</span><i><u style={{width:"14%"}}/></i><b>1</b></div></div><p className="journal-note"><b>Root cause:</b> five of seven reclasses arose from upstream coding. Add mandatory department and contract fields before posting.</p></aside></div>
    <div className="exceptions-section"><div className="section-heading"><div><p className="eyebrow">OPEN EXCEPTIONS</p><h2>Items carried beyond close</h2></div><span className="as-of">Review at WD5</span></div><div className="exception-table"><div className="exception-head"><span>ID</span><span>Item</span><span>Value</span><span>Age</span><span>Owner</span><span>Risk</span></div>{exceptions.map(row=><div className="exception-row" key={row[0]}>{row.map((cell,i)=><span key={cell} className={i===5?cell.toLowerCase():""}>{cell}</span>)}</div>)}</div></div>
  </section>;
}

function Compliance() {
  const tax = { vatRemitted: 286_400, vatClaimed: 94_700, citPaid: 168_000, directSavings: 72_000, indirectSavings: 38_500, subsidyPipeline: 420_000 };
  const risks = [
    { level: "high", title: "Group perimeter & Pillar Two scope", owner: "Tax lead · 30 Apr", detail: "Confirm ultimate ownership, consolidated revenue and constituent entities. The €750m threshold assessment cannot be concluded from public information." },
    { level: "medium", title: "Related-party service charges", owner: "Finance Director · 15 Apr", detail: "Refresh transfer-pricing support for shared technology, management and support services; evidence benefit received and arm’s-length pricing." },
    { level: "medium", title: "Permanent establishment exposure", owner: "Legal & Tax · 31 May", detail: "Map where commercial authority, remote work and service delivery occur; document decision rights and contracting practice by jurisdiction." },
    { level: "low", title: "VAT place-of-supply evidence", owner: "Controller · Monthly", detail: "Retain customer status, location evidence and invoice tax codes for cross-border B2B digital services." },
  ];
  return <section className="view">
    <div className="page-heading"><div><p className="eyebrow">TAX & COMPLIANCE</p><h1>Know the exposure.<br/><span>Evidence the position.</span></h1></div><p className="management-question">Are tax filings controlled, savings defensible, and cross-border risks visible before they become liabilities?</p></div>
    <div className="compliance-note"><strong>Illustrative control view</strong><span>All values and statuses are fictional. Group ownership, tax residency and Pillar Two scope require verified legal-entity data.</span></div>
    <div className="tax-metrics"><Metric label="VAT remitted YTD" value={euroCompact(tax.vatRemitted)} delta="Output less recoverable input VAT" info="Illustrative net VAT paid to tax authorities year to date."/><Metric label="Input VAT claimed YTD" value={euroCompact(tax.vatClaimed)} delta="24.9% of input VAT reviewed" info="Illustrative recoverable VAT supported by qualifying invoices."/><Metric label="Corporate income tax paid" value={euroCompact(tax.citPaid)} delta="2025 final + 2026 advances"/><Metric label="Direct tax savings" value={euroCompact(tax.directSavings)} delta="R&D and eligible cost review"/><Metric label="Indirect tax savings" value={euroCompact(tax.indirectSavings)} delta="VAT recovery corrections"/><Metric label="R&D subsidy pipeline" value={euroCompact(tax.subsidyPipeline)} delta="Applied · not yet awarded" info="Illustrative non-tax government and EU support under application or assessment. Excluded from cash until confirmed."/></div>
    <div className="compliance-grid"><article className="panel tax-waterfall"><div className="panel-header"><div><p className="eyebrow">VAT CONTROL</p><h2>Quarter-to-date VAT movement</h2></div><span className="status good">Reconciled</span></div><div className="waterfall"><div><span>Output VAT</span><strong>€381.1k</strong><i style={{width:"100%"}}/></div><div><span>Input VAT claimed</span><strong>(€94.7k)</strong><i className="claim" style={{width:"25%"}}/></div><div className="net"><span>Net remitted</span><strong>€286.4k</strong><i style={{width:"75%"}}/></div></div><div className="control-evidence"><span><b>100%</b> ledger-to-return tie-out</span><span><b>12</b> exceptions reviewed</span><span><b>0</b> overdue filings</span></div></article>
      <article className="panel tax-calendar"><div className="panel-header"><div><p className="eyebrow">FILING CALENDAR</p><h2>Next obligations</h2></div><span className="status neutral">4 upcoming</span></div><div className="calendar-list"><div><time>25 APR</time><p><b>VAT return</b><span>March 2026 · Prepared</span></p><em className="ready">Ready</em></div><div><time>15 MAY</time><p><b>Advance CIT</b><span>Q2 instalment · Forecast</span></p><em>Open</em></div><div><time>31 MAY</time><p><b>Transfer pricing file</b><span>Evidence refresh · In review</span></p><em className="review">Review</em></div><div><time>15 JUN</time><p><b>Annual CIT return</b><span>FY2025 · Draft</span></p><em>Open</em></div></div></article></div>
    <div className="beps-section"><div className="section-heading"><div><p className="eyebrow">BEPS RISK REGISTER</p><h2>Cross-border positions requiring evidence</h2></div><span className="beps-score"><b>2</b> priority reviews</span></div><div className="risk-table"><div className="risk-head"><span>Risk area</span><span>Control assessment</span><span>Owner / due</span><span>Status</span></div>{risks.map(r=><div className="risk-row" key={r.title}><span><i className={`risk-dot ${r.level}`}/><b>{r.title}</b></span><p>{r.detail}</p><span>{r.owner}</span><em className={r.level}>{r.level}</em></div>)}</div><div className="beps-guidance"><div><strong>Pillar Two screen</strong><p>First gate: verify whether consolidated group revenue meets the €750m threshold and whether the entity sits within the relevant consolidated perimeter.</p></div><div><strong>Transfer pricing</strong><p>Keep intercompany agreements, functional analysis, benefit evidence and pricing support aligned with where people, risks and value creation actually sit.</p></div><div><strong>Decision rule</strong><p>No green status without evidence. Escalate uncertain residency, permanent establishment, withholding tax or related-party positions to qualified advisers.</p></div></div></div>
  </section>;
}

type RegulatoryItem = (typeof regulatoryRadar.items)[number];

function RegulatoryRadar() {
  const topics = ["All", ...Array.from(new Set(regulatoryRadar.items.map(item => item.topic)))] as string[];
  const [topic, setTopic] = useState("All");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState("");
  const visible = topic === "All" ? regulatoryRadar.items : regulatoryRadar.items.filter(item => item.topic === topic);
  const high = regulatoryRadar.items.filter(item => item.relevance === "High").length;
  const askGemini = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = question.trim();
    if (!clean || asking) return;
    setAsking(true); setAnswer(""); setAskError("");
    try {
      const context = regulatoryRadar.items.map(item => ({ title:item.title, topic:item.topic, relevance:item.relevance, summary:item.summary, financeImpact:item.financeImpact, action:item.action, url:item.url }));
      const response = await fetch("/.netlify/functions/ask-gemini", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ question:clean, context }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The assistant is temporarily unavailable.");
      setAnswer(payload.answer);
    } catch (error) { setAskError(error instanceof Error ? error.message : "The assistant is temporarily unavailable."); }
    finally { setAsking(false); }
  };
  return <section className="view">
    <div className="page-heading radar-heading"><div><p className="eyebrow">EU REGULATORY RADAR</p><h1>Discover change.<br/><span>Translate the impact.</span></h1></div><div className="agent-status"><span className="agent-pulse"/><div><b>Discovery agent active</b><small>Last checked {regulatoryRadar.lastChecked} · {regulatoryRadar.generatedBy}</small></div></div></div>
    <div className="radar-note"><strong>Official-source monitor</strong><span>Daily screening of EU legislation and Commission proposals. AI-generated impact assessments are informational and require validation by qualified legal or tax advisers.</span></div>
    <section className="ask-gemini"><div className="ask-copy"><span className="agent-pulse"/><div><p className="eyebrow">ASK GEMINI</p><h2>Ask a clarifying question</h2><small>Answers use only the regulatory items shown in this cockpit.</small></div></div><form onSubmit={askGemini}><input aria-label="Question for Gemini" maxLength={500} value={question} onChange={event=>setQuestion(event.target.value)} placeholder="e.g. Which development should Finance review first?"/><button type="submit" disabled={asking || !question.trim()}>{asking ? "Thinking…" : "Ask →"}</button></form>{answer && <div className="ask-answer"><span>GEMINI RESPONSE</span><p>{answer}</p></div>}{askError && <div className="ask-error">{askError}</div>}<p className="ask-disclaimer">Informational only · no chat history retained · validate tax and legal conclusions with qualified advisers.</p></section>
    <div className="radar-summary"><article><span>Relevant developments</span><strong>{regulatoryRadar.items.length}</strong><small>Current monitored set</small></article><article><span>High relevance</span><strong>{high}</strong><small>Finance review required</small></article><article><span>Source coverage</span><strong>3</strong><small>Legislation · proposals · OJ L</small></article><article><span>Next automated scan</span><strong>24h</strong><small>GitHub scheduled workflow</small></article></div>
    <div className="radar-toolbar"><div><p className="eyebrow">DISCOVERY QUEUE</p><h2>Developments ranked for finance</h2></div><div className="topic-filters" aria-label="Filter regulatory developments">{topics.map(value=><button key={value} className={topic===value?"active":""} onClick={()=>setTopic(value)}>{value}</button>)}</div></div>
    <div className="radar-list">{visible.map((item: RegulatoryItem, index: number)=><article className="radar-card" key={item.url}><div className="radar-rank">{String(index+1).padStart(2,"0")}</div><div className="radar-main"><div className="radar-meta"><span>{item.topic}</span><time>{item.date}</time><em className={item.relevance.toLowerCase()}>{item.relevance} relevance</em></div><h3>{item.title}</h3><p>{item.summary}</p><div className="impact-box"><span>FINANCE IMPACT</span><strong>{item.financeImpact}</strong></div></div><aside><span>STATUS</span><b>{item.status}</b><span>ACTION</span><p>{item.action}</p><a href={item.url} target="_blank" rel="noopener noreferrer">Open official source ↗</a></aside></article>)}</div>
    {visible.length === 0 && <div className="radar-empty">No current developments match this topic.</div>}
    <div className="agent-method"><div><b>01 · Discover</b><p>Read official EUR-Lex feeds and remove duplicates.</p></div><div><b>02 · Classify</b><p>Score tax, BEPS, AI, data, grants and reporting relevance.</p></div><div><b>03 · Translate</b><p>Gemini drafts concise finance implications and actions.</p></div><div><b>04 · Govern</b><p>Human review remains required before any decision.</p></div></div>
  </section>;
}

export default function Home() {
  const [view, setView] = useState<View>("cockpit");
  return <main><div className="demo-banner">ILLUSTRATIVE OVERVIEW <span>by Karolis Mazeika (Finance Director)</span></div>
    <header><button className="brand" onClick={() => setView("cockpit")} aria-label="Go to cockpit"><span>n</span><b>nexos.ai Finance Cockpit</b></button><nav aria-label="Finance cockpit sections">
      <div className="nav-group"><span className="nav-group-label">FP&amp;A</span><div className="nav-items">{(["cockpit","revenue","scenario"] as View[]).map(item => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item === "cockpit" ? "Executive cockpit" : item === "revenue" ? "Commercial engine" : "AI economics"}</button>)}</div></div>
      <div className="nav-group"><span className="nav-group-label">Record to Report</span><div className="nav-items"><button className={view === "close" ? "active" : ""} onClick={() => setView("close")}>Month-end close</button></div></div>
      <div className="nav-group"><span className="nav-group-label">Statutory &amp; Tax</span><div className="nav-items"><button className={view === "compliance" ? "active" : ""} onClick={() => setView("compliance")}>Tax & compliance</button><button className={view === "regulatory" ? "active" : ""} onClick={() => setView("regulatory")}>EU regulatory radar</button></div></div>
    </nav><div className="period"><span>Reporting period</span><strong>31 Mar 2026</strong></div></header>
    {view === "cockpit" && <Cockpit onNavigate={setView} />}{view === "revenue" && <RevenueBridge />}{view === "scenario" && <ScenarioPlanner />}{view === "close" && <MonthEndClose />}{view === "compliance" && <Compliance />}{view === "regulatory" && <RegulatoryRadar />}
    <footer><span>Fictional illustrative data. Independent interview prototype; not affiliated with or endorsed by nexos.ai.</span><span>EUR · Management view · v1.3</span></footer>
  </main>;
}
