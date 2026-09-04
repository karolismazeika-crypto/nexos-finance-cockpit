"use client";

import { useMemo, useState } from "react";
import {
  actuals,
  contractDemo,
  euro,
  euroCompact,
  getDecisionFlags,
  getRevenueBridge,
  modelScenario,
  presets,
  type ScenarioAssumptions,
} from "./lib/finance";

type View = "cockpit" | "revenue" | "scenario";

const revenueTrend = [
  ["Oct", 315], ["Nov", 328], ["Dec", 342], ["Jan", 351], ["Feb", 366], ["Mar", 382],
] as const;
const cashTrend = [
  ["Oct", 6.25], ["Nov", 6.02], ["Dec", 5.78], ["Jan", 5.51], ["Feb", 5.25], ["Mar", 5.0],
] as const;

function Info({ text }: { text: string }) {
  return <span className="info" title={text} aria-label={text}>i</span>;
}

function Metric({ label, value, delta, info }: { label: string; value: string; delta?: string; info?: string }) {
  return <article className="metric-card">
    <div className="metric-label">{label}{info && <Info text={info} />}</div>
    <div className="metric-value">{value}</div>
    {delta && <div className="metric-delta">{delta}</div>}
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
  return <section className="view">
    <div className="page-heading"><div><p className="eyebrow">EXECUTIVE COCKPIT</p><h1>Growth is on track.<br/><span>Cash needs attention.</span></h1></div><p className="management-question">Are we on plan, how much runway do we have, and where does leadership need to act?</p></div>
    <div className="metrics-grid">
      <Metric label="ARR" value={euroCompact(actuals.arr)} delta="↑ 8.2% vs prior quarter" info="Annual recurring revenue at the current run rate." />
      <Metric label="Recognised revenue YTD" value={euroCompact(actuals.recognizedRevenueYtd)} delta="96% of plan" />
      <Metric label="Cash balance" value={euroCompact(actuals.cashBalance)} delta="€0.3m below plan" />
      <Metric label="Monthly net burn" value={euroCompact(actuals.monthlyNetBurn)} delta="↑ €24k vs prior month" info="Cash outflows less cash inflows for the month." />
      <Metric label="Runway" value={`${actuals.cashBalance / actuals.monthlyNetBurn} mo`} delta="Planning threshold: 18 mo" info="Cash balance divided by current monthly net burn." />
      <Metric label="Headcount" value={`${actuals.headcount}`} delta="+7 since January" />
    </div>
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
  const bridge = getRevenueBridge(contractDemo, 3);
  const steps = [
    ["Contracted", bridge.contracted, "Signed annual value"], ["Invoiced", bridge.invoiced, "Annual upfront"], ["Recognised", bridge.recognized, "3 months served"], ["Deferred", bridge.deferred, "Future service"], ["Cash collected", bridge.collected, "Collections to date"],
  ] as const;
  return <section className="view">
    <div className="page-heading"><div><p className="eyebrow">REVENUE BRIDGE</p><h1>One contract.<br/><span>Five financial states.</span></h1></div><p className="management-question">How does a commercial contract translate into billing, accounting revenue, deferred revenue and cash?</p></div>
    <div className="contract-strip"><div><span>Customer</span><strong>{contractDemo.customerName}</strong></div><div><span>Service period</span><strong>01 Jan — 31 Dec 2026</strong></div><div><span>Billing</span><strong>Annual upfront</strong></div><div><span>Collections</span><strong>{euro(contractDemo.cashCollected)} received</strong></div></div>
    <div className="revenue-layout"><article className="panel bridge-panel"><div className="panel-header"><div><p className="eyebrow">COMMERCIAL TO CASH</p><h2>Contract value flow</h2></div><span className="status neutral">At 31 Mar 2026</span></div>
      <div className="bridge">{steps.map(([label, value, note], i) => <div className="bridge-step" key={label}><span className="step-index">0{i + 1}</span><p>{label}</p><strong>{euro(value)}</strong><small>{note}</small>{i < steps.length - 1 && <span className="arrow">→</span>}</div>)}</div>
      <div className="schedule"><div><span>Service elapsed</span><strong>25%</strong></div><div className="schedule-track"><span style={{width:"25%"}} /></div><p>Subscription revenue is recognised straight-line over the 12-month service period in this simplified demonstration.</p></div>
    </article>
    <aside className="why-panel"><p className="eyebrow">WHY?</p><h2>Revenue is not cash</h2><p>Upfront billing creates a receivable and a contract liability. Revenue emerges as the service is delivered—not when an invoice is sent.</p><dl><div><dt>Subscription</dt><dd>€10,000 recognised monthly</dd></div><div><dt>Outstanding AR</dt><dd>{euro(bridge.invoiced - bridge.collected)}</dd></div></dl><div className="review-note"><strong>Judgement required</strong><p>The €15,000 implementation fee depends on whether setup is a distinct performance obligation. It is flagged for review, not automatically recognised.</p></div><small>Illustrative learning material only. Not accounting advice.</small></aside></div>
  </section>;
}

function ScenarioPlanner({ assumptions, setAssumptions }: { assumptions: ScenarioAssumptions; setAssumptions: (a: ScenarioAssumptions) => void }) {
  const output = useMemo(() => modelScenario(assumptions), [assumptions]);
  const base = modelScenario(presets.base);
  const set = (key: keyof ScenarioAssumptions, value: number) => setAssumptions({ ...assumptions, [key]: value });
  return <section className="view">
    <div className="page-heading"><div><p className="eyebrow">SCENARIO PLANNER</p><h1>Make the trade-off<br/><span>visible.</span></h1></div><p className="management-question">If growth, hiring or infrastructure costs change, what happens to cash and runway?</p></div>
    <div className="scenario-layout"><aside className="controls-panel"><div className="preset-row">{Object.entries(presets).map(([name, values]) => <button key={name} className={JSON.stringify(values) === JSON.stringify(assumptions) ? "active" : ""} onClick={() => setAssumptions(values)}>{name[0].toUpperCase()+name.slice(1)}</button>)}</div>
      <label><span><b>Revenue growth</b><output>{assumptions.revenueGrowthPct}%</output></span><input type="range" min="0" max="60" value={assumptions.revenueGrowthPct} onChange={e => set("revenueGrowthPct", +e.target.value)} /></label>
      <label><span><b>Planned hires</b><output>{assumptions.plannedHires}</output></span><input type="range" min="0" max="35" value={assumptions.plannedHires} onChange={e => set("plannedHires", +e.target.value)} /></label>
      <label><span><b>Infrastructure cost growth</b><output>{assumptions.infrastructureGrowthPct}%</output></span><input type="range" min="0" max="50" value={assumptions.infrastructureGrowthPct} onChange={e => set("infrastructureGrowthPct", +e.target.value)} /></label>
      <button className="reset" onClick={() => setAssumptions(presets.base)}>↺ Reset demo</button>
    </aside>
    <div className="scenario-results"><div className="result-grid"><Metric label="Forecast annual revenue" value={euroCompact(output.forecastRevenue)} delta={`${assumptions.revenueGrowthPct}% growth`} /><Metric label="Forecast payroll" value={euroCompact(output.forecastPayroll)} delta={`${assumptions.plannedHires} planned hires`} /><Metric label="Infrastructure cost" value={euroCompact(output.forecastInfrastructureCost)} delta={`${assumptions.infrastructureGrowthPct}% growth`} /><Metric label="Monthly burn" value={euroCompact(output.forecastMonthlyBurn)} delta={`${output.forecastMonthlyBurn > base.forecastMonthlyBurn ? "↑" : "↓"} ${euroCompact(Math.abs(output.forecastMonthlyBurn - base.forecastMonthlyBurn))} vs base`} /></div>
      <article className="runway-card"><div><p className="eyebrow">FORECAST RUNWAY</p><strong>{Number.isFinite(output.runwayMonths) ? `${output.runwayMonths.toFixed(1)} months` : "Cash generative / N/A"}</strong><span>Ending cash after 12 months: {euroCompact(output.forecastEndingCash)}</span></div><div className="runway-compare"><span>BASE <b>{base.runwayMonths.toFixed(1)} mo</b></span><span>SCENARIO <b>{Number.isFinite(output.runwayMonths) ? `${output.runwayMonths.toFixed(1)} mo` : "N/A"}</b></span></div></article>
      <article className="narrative"><span className="pulse"/><div><p className="eyebrow">MANAGEMENT IMPLICATION</p><h3>{output.narrative}</h3></div></article>
    </div></div>
  </section>;
}

export default function Home() {
  const [view, setView] = useState<View>("cockpit");
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>(presets.base);
  return <main><div className="demo-banner">ILLUSTRATIVE FICTIONAL DATA <span>Independent interview prototype</span></div>
    <header><button className="brand" onClick={() => setView("cockpit")} aria-label="Go to cockpit"><span>n</span><b>finance cockpit</b></button><nav>{(["cockpit","revenue","scenario"] as View[]).map(item => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item === "cockpit" ? "Executive cockpit" : item === "revenue" ? "Revenue bridge" : "Scenario planner"}</button>)}</nav><div className="period"><span>Reporting period</span><strong>31 Mar 2026</strong></div></header>
    {view === "cockpit" && <Cockpit onNavigate={setView} />}{view === "revenue" && <RevenueBridge />}{view === "scenario" && <ScenarioPlanner assumptions={assumptions} setAssumptions={setAssumptions} />}
    <footer><span>Fictional illustrative data. Independent interview prototype; not affiliated with or endorsed by nexos.ai.</span><span>EUR · Management view · v1.0</span></footer>
  </main>;
}
