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

type Drilldown = "arr" | "revenue" | "cash" | "burn" | "runway" | "headcount";
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
  arr: { title: "Top 10 customers by ARR", subtitle: "Illustrative concentration view · Top 10 represent 77.6% of ARR", rows: topClients.map(([name, value], i) => [name, euroCompact(value), `${(value / actuals.arr * 100).toFixed(1)}% · ${i < 2 ? "Monitor" : "Stable"}`]) },
  revenue: { title: "Top 5 recognised revenue contributors", subtitle: "Year-to-date · fictional customer mix", rows: topClients.slice(0, 5).map(([name, value]) => [name, euroCompact(value * .44), "Recognised YTD"]) },
  cash: { title: "Cash sources and restrictions", subtitle: "€5.0m closing balance", rows: [["Equity funding", "€3.20m", "Unrestricted"], ["Customer collections", "€1.35m", "Operating cash"], ["R&D grant advances", "€0.25m", "Restricted"], ["Interest & other", "€0.20m", "Unrestricted"]] },
  burn: { title: "Monthly net burn drivers", subtitle: "March 2026 · click-through cost attribution", rows: [["Payroll & benefits", "€438k", "58% of gross outflow"], ["AI infrastructure", "€142k", "19%"], ["Sales & marketing", "€91k", "12%"], ["G&A and professional fees", "€57k", "8%"], ["Other operating costs", "€25k", "3%"], ["Less: cash collections", "(€503k)", "Net burn €250k"]] },
  runway: { title: "Runway sensitivity", subtitle: "Current cash divided by net monthly burn", rows: [["Current run-rate", "20.0 mo", "€250k burn"], ["10% lower collections", "17.7 mo", "€283k burn"], ["Hiring delayed 3 months", "22.4 mo", "€223k burn"]] },
  headcount: { title: "Headcount by function", subtitle: "70 people · 15 planned hires", rows: [["Engineering & product", "42", "+8 planned"], ["Sales & marketing", "13", "+4 planned"], ["Operations & support", "9", "+2 planned"], ["Finance, legal & people", "6", "+1 planned"]] },
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
  const flags = getDecisionFlags(actuals);
  const [detail, setDetail] = useState<Drilldown>("arr");
  const selected = drilldowns[detail];
  return <section className="view">
    <div className="page-heading executive-heading"><div><p className="eyebrow">EXECUTIVE COCKPIT</p><div className="signal-line"><span className="signal-icon positive">✓</span><h1>Growth is on track</h1></div><div className="signal-line"><span className="signal-icon attention">!</span><h1>Cash needs attention</h1></div></div><div className="executive-summary"><p className="eyebrow">EXECUTIVE ASSESSMENT</p><strong>Commercial momentum remains positive, with ARR up 8.2% quarter on quarter.</strong><p>Revenue is 4% below plan and collections have softened, leaving runway at 20 months—still above the 18-month threshold, but close enough to stage hiring and escalate overdue enterprise receivables.</p></div></div>
    <div className="metrics-grid">
      <Metric label="ARR" value={euroCompact(actuals.arr)} delta="↑ 8.2% vs prior quarter" info="Annual recurring revenue at the current run rate." onClick={() => setDetail("arr")} active={detail === "arr"}/>
      <Metric label="Recognised revenue YTD" value={euroCompact(actuals.recognizedRevenueYtd)} delta="96% of plan" onClick={() => setDetail("revenue")} active={detail === "revenue"}/>
      <Metric label="Cash balance" value={euroCompact(actuals.cashBalance)} delta="€0.3m below plan" onClick={() => setDetail("cash")} active={detail === "cash"}/>
      <Metric label="Monthly net burn" value={euroCompact(actuals.monthlyNetBurn)} delta="↑ €24k vs prior month" info="Cash outflows less cash inflows for the month." onClick={() => setDetail("burn")} active={detail === "burn"}/>
      <Metric label="Runway" value={`${actuals.cashBalance / actuals.monthlyNetBurn} mo`} delta="Planning threshold: 18 mo" info="Cash balance divided by current monthly net burn." onClick={() => setDetail("runway")} active={detail === "runway"}/>
      <Metric label="Headcount" value={`${actuals.headcount}`} delta="+7 since January" onClick={() => setDetail("headcount")} active={detail === "headcount"}/>
    </div>
    <article className="drilldown-panel"><div className="drilldown-title"><div><p className="eyebrow">KPI DRILL-DOWN</p><h2>{selected.title}</h2><span>{selected.subtitle}</span></div><span className="live-tag">Selected: {detail}</span></div><div className="drilldown-list">{selected.rows.map(([name,value,note],i)=><div key={name}><span className="rank">{String(i+1).padStart(2,"0")}</span><b>{name}</b><strong>{value}</strong><em>{note}</em></div>)}</div></article>
    <div className="chart-grid">
      <article className="panel"><div className="panel-header"><div><p className="eyebrow">COMMERCIAL MOMENTUM</p><h2>Monthly recognised revenue</h2></div><span className="status good">+21% over 6 mo</span></div><Bars data={revenueTrend} unit="k" /></article>
      <article className="panel"><div className="panel-header"><div><p className="eyebrow">LIQUIDITY</p><h2>Cash balance</h2></div><span className="status warn">20 months runway</span></div><Bars data={cashTrend} unit="m" /></article>
    </div>
    <div className="decision-section"><div className="section-heading"><div><p className="eyebrow">DECISION FLAGS</p><h2>Where leadership needs to act</h2></div><span className="as-of">As of 31 Mar 2026</span></div>
      <div className="flag-list">{flags.map((flag, i) => <article className="flag" key={flag.title}><span className={`flag-number ${i ? "amber" : "red"}`}>0{i + 1}</span><div><h3>{flag.title}</h3><p>{flag.message}</p></div><button onClick={() => onNavigate(i === 0 ? "revenue" : "scenario")}>{i === 0 ? "Review receivables" : "Model response"} →</button></article>)}</div>
    </div>
  </section>;
}

function RevenueBridge() {
  const [contractIndex, setContractIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const contract = contracts[contractIndex];
  const bridge = getRevenueBridge(contract, contract.elapsedMonths);
  const steps = [
    ["Contracted", bridge.contracted, "Signed contract value"], ["Invoiced", bridge.invoiced, "Billing to date"], ["Recognised", bridge.recognized, `${contract.elapsedMonths} months served`], ["Deferred", bridge.deferred, "Future service"], ["Cash collected", bridge.collected, "Collections to date"],
  ] as const;
  const portfolio = contracts.map(item => { const values=getRevenueBridge(item,item.elapsedMonths); return {name:item.customerName, values:[values.contracted,values.invoiced,values.recognized,values.deferred,values.collected]}; }).sort((a,b)=>b.values[stageIndex]-a.values[stageIndex]);
  return <section className="view">
    <div className="page-heading"><div><p className="eyebrow">REVENUE BRIDGE</p><h1>One contract.<br/><span>Five financial states.</span></h1></div><p className="management-question">How does a commercial contract translate into billing, accounting revenue, deferred revenue and cash?</p></div>
    <div className="contract-selector"><span>CONTRACT PORTFOLIO</span>{contracts.map((item,i)=><button key={item.customerName} className={contractIndex===i?"active":""} onClick={()=>setContractIndex(i)}><b>0{i+1}</b>{item.customerName.replace("Enterprise ","")}</button>)}</div>
    <div className="contract-strip"><div><span>Customer</span><strong>{contract.customerName}</strong></div><div><span>Service period</span><strong>{contract.term}</strong></div><div><span>Billing</span><strong>{contract.amountInvoiced >= contract.subscriptionAmount ? "Annual upfront" : "Quarterly / staged"}</strong></div><div><span>Collections</span><strong>{euro(contract.cashCollected)} received</strong></div></div>
    <article className="panel bridge-panel"><div className="panel-header"><div><p className="eyebrow">COMMERCIAL TO CASH</p><h2>Contract value flow</h2></div><span className="status neutral">At 31 Mar 2026</span></div>
      <div className="bridge">{steps.map(([label, value, note], i) => <button className={`bridge-step ${stageIndex===i?"selected":""}`} key={label} onClick={()=>setStageIndex(i)}><span className="step-index">0{i + 1}</span><p>{label}</p><strong>{euro(value)}</strong><small>{note}</small><em>View top 5 ↓</em>{i < steps.length - 1 && <span className="arrow">→</span>}</button>)}</div>
      <div className="schedule"><div><span>Service elapsed</span><strong>{Math.round(contract.elapsedMonths/12*100)}%</strong></div><div className="schedule-track"><span style={{width:`${contract.elapsedMonths/12*100}%`}} /></div><p>Subscription revenue is recognised straight-line over the 12-month service period in this simplified demonstration.</p></div>
    </article>
    <article className="drilldown-panel revenue-drilldown"><div className="drilldown-title"><div><p className="eyebrow">PORTFOLIO DRILL-DOWN · STAGE 0{stageIndex+1}</p><h2>Top 5 contracts by {steps[stageIndex][0].toLowerCase()} value</h2><span>Click any stage above to change the ranking</span></div><strong>{euro(portfolio.reduce((sum,item)=>sum+item.values[stageIndex],0))}</strong></div><div className="portfolio-bars">{portfolio.map((item,i)=>{const max=portfolio[0].values[stageIndex]; return <div key={item.name}><span>0{i+1}</span><b>{item.name}</b><i><u style={{width:`${item.values[stageIndex]/max*100}%`}}/></i><strong>{euro(item.values[stageIndex])}</strong></div>})}</div></article>
  </section>;
}

function ScenarioPlanner({ assumptions, setAssumptions }: { assumptions: ScenarioAssumptions; setAssumptions: (a: ScenarioAssumptions) => void }) {
  const output = useMemo(() => modelScenario(assumptions), [assumptions]);
  const base = modelScenario(presets.base);
  const set = (key: keyof ScenarioAssumptions, value: number) => setAssumptions({ ...assumptions, [key]: value });
  return <section className="view">
    <div className="page-heading"><div><p className="eyebrow">SCENARIO PLANNER</p><h1>Make the trade-off<br/><span>visible.</span></h1></div><p className="management-question">How do growth, hiring, AI infrastructure and R&D investment interact—and how much runway could confirmed grant support protect?</p></div>
    <div className="scenario-layout"><aside className="controls-panel"><div className="preset-row">{Object.entries(presets).map(([name, values]) => <button key={name} className={JSON.stringify(values) === JSON.stringify(assumptions) ? "active" : ""} onClick={() => setAssumptions(values)}>{name[0].toUpperCase()+name.slice(1)}</button>)}</div>
      <label><span><b>Revenue growth</b><output>{assumptions.revenueGrowthPct}%</output></span><input type="range" min="0" max="60" value={assumptions.revenueGrowthPct} onChange={e => set("revenueGrowthPct", +e.target.value)} /></label>
      <label><span><b>Planned hires</b><output>{assumptions.plannedHires}</output></span><input type="range" min="0" max="35" value={assumptions.plannedHires} onChange={e => set("plannedHires", +e.target.value)} /></label>
      <label><span><b>Infrastructure cost growth</b><output>{assumptions.infrastructureGrowthPct}%</output></span><input type="range" min="0" max="50" value={assumptions.infrastructureGrowthPct} onChange={e => set("infrastructureGrowthPct", +e.target.value)} /></label>
      <label><span><b>R&D investment</b><output>{euroCompact(assumptions.rdInvestment)}</output></span><input type="range" min="250000" max="2000000" step="50000" value={assumptions.rdInvestment} onChange={e => set("rdInvestment", +e.target.value)} /></label>
      <label><span><b>Expected grant coverage</b><output>{assumptions.grantCoveragePct}%</output></span><input type="range" min="0" max="50" step="5" value={assumptions.grantCoveragePct} onChange={e => set("grantCoveragePct", +e.target.value)} /></label>
      <button className="reset" onClick={() => setAssumptions(presets.base)}>↺ Reset demo</button>
    </aside>
    <div className="scenario-results"><div className="result-grid scenario-output-grid"><Metric label="Forecast annual revenue" value={euroCompact(output.forecastRevenue)} delta={`${assumptions.revenueGrowthPct}% growth`} /><Metric label="Forecast payroll" value={euroCompact(output.forecastPayroll)} delta={`${assumptions.plannedHires} planned hires`} /><Metric label="Infrastructure cost" value={euroCompact(output.forecastInfrastructureCost)} delta={`${assumptions.infrastructureGrowthPct}% growth`} /><Metric label="Net R&D investment" value={euroCompact(output.netRdInvestment)} delta={`${euroCompact(output.grantFunding)} grant offset`} /><Metric label="Expected grant funding" value={euroCompact(output.grantFunding)} delta="Unconfirmed pipeline" /><Metric label="Monthly burn" value={euroCompact(output.forecastMonthlyBurn)} delta={`${output.forecastMonthlyBurn > base.forecastMonthlyBurn ? "↑" : "↓"} ${euroCompact(Math.abs(output.forecastMonthlyBurn - base.forecastMonthlyBurn))} vs base`} /></div>
      <article className="runway-card"><div><p className="eyebrow">FORECAST RUNWAY</p><strong>{Number.isFinite(output.runwayMonths) ? `${output.runwayMonths.toFixed(1)} months` : "Cash generative / N/A"}</strong><span>Ending cash after 12 months: {euroCompact(output.forecastEndingCash)}</span></div><div className="runway-compare"><span>BASE <b>{base.runwayMonths.toFixed(1)} mo</b></span><span>SCENARIO <b>{Number.isFinite(output.runwayMonths) ? `${output.runwayMonths.toFixed(1)} mo` : "N/A"}</b></span></div></article>
      <article className="narrative"><span className="pulse"/><div><p className="eyebrow">MANAGEMENT IMPLICATION</p><h3>{output.narrative}</h3></div></article>
    </div></div>
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
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>(presets.base);
  return <main><div className="demo-banner">ILLUSTRATIVE OVERVIEW <span>by Karolis Mazeika (Finance Director)</span></div>
    <header><button className="brand" onClick={() => setView("cockpit")} aria-label="Go to cockpit"><span>n</span><b>nexos.ai Finance Cockpit</b></button><nav aria-label="Finance cockpit sections">
      <div className="nav-group"><span className="nav-group-label">FP&amp;A</span><div className="nav-items">{(["cockpit","revenue","scenario"] as View[]).map(item => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item === "cockpit" ? "Executive cockpit" : item === "revenue" ? "Revenue bridge" : "Scenario planner"}</button>)}</div></div>
      <div className="nav-group"><span className="nav-group-label">Record to Report</span><div className="nav-items"><button className={view === "close" ? "active" : ""} onClick={() => setView("close")}>Month-end close</button></div></div>
      <div className="nav-group"><span className="nav-group-label">Statutory &amp; Tax</span><div className="nav-items"><button className={view === "compliance" ? "active" : ""} onClick={() => setView("compliance")}>Tax & compliance</button><button className={view === "regulatory" ? "active" : ""} onClick={() => setView("regulatory")}>EU regulatory radar</button></div></div>
    </nav><div className="period"><span>Reporting period</span><strong>31 Mar 2026</strong></div></header>
    {view === "cockpit" && <Cockpit onNavigate={setView} />}{view === "revenue" && <RevenueBridge />}{view === "scenario" && <ScenarioPlanner assumptions={assumptions} setAssumptions={setAssumptions} />}{view === "close" && <MonthEndClose />}{view === "compliance" && <Compliance />}{view === "regulatory" && <RegulatoryRadar />}
    <footer><span>Fictional illustrative data. Independent interview prototype; not affiliated with or endorsed by nexos.ai.</span><span>EUR · Management view · v1.2</span></footer>
  </main>;
}
