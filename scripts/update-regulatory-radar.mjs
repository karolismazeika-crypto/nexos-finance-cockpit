import { readFile, writeFile } from "node:fs/promises";

const feeds = [
  ["EU legislation", "https://eur-lex.europa.eu/EN/display-feed.rss?rssId=162"],
  ["Commission proposals", "https://eur-lex.europa.eu/EN/display-feed.rss?rssId=161"],
  ["Official Journal L", "https://eur-lex.europa.eu/EN/display-feed.rss?rssId=222"],
];
const terms = {
  "Tax & BEPS": ["tax", "taxation", "vat", "value added", "pillar two", "beps", "transfer pricing", "withholding"],
  "AI & Data": ["artificial intelligence", " AI ", "data act", "data protection", "digital services", "cybersecurity", "cloud"],
  "R&D & Grants": ["research", "innovation", "grant", "funding", "state aid", "horizon europe"],
  "Reporting": ["accounting", "financial reporting", "sustainability reporting", "audit", "disclosure", "corporate reporting"],
};
const excludedContexts = ["italian republic", "belgium", "moldova", "lebanon", "vessels at berth", "issuer-sponsored research"];
const decode = value => value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
const field = (item, tag) => decode(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] || "");

function classify(text) {
  let best = { topic: "Other", score: 0 };
  const lower = ` ${text.toLowerCase()} `;
  for (const [topic, keywords] of Object.entries(terms)) {
    const score = keywords.reduce((sum, term) => sum + (lower.includes(term.toLowerCase()) ? 1 : 0), 0);
    if (score > best.score) best = { topic, score };
  }
  return best;
}

async function discover() {
  const found = [];
  for (const [source, url] of feeds) {
    const response = await fetch(url, { headers: { "user-agent": "FinanceCockpit-Regulatory-Radar/1.0" } });
    if (!response.ok) throw new Error(`${source} returned ${response.status}`);
    const xml = await response.text();
    for (const match of xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)) {
      const raw = match[1];
      const title = field(raw, "title");
      const description = field(raw, "description");
      const category = classify(`${title} ${description}`);
      if (!category.score || excludedContexts.some(term => `${title} ${description}`.toLowerCase().includes(term))) continue;
      const rawUrl = field(raw, "link");
      const cleanUrl = rawUrl ? new URL(rawUrl.replace("/./", "/"), "https://eur-lex.europa.eu").href : "https://eur-lex.europa.eu/";
      found.push({ title, description, url: cleanUrl, published: field(raw, "pubDate") || field(raw, "dc:date") || field(raw, "updated"), source, ...category });
    }
  }
  return Array.from(new Map(found.map(item => [item.url || item.title, item])).values()).sort((a,b)=>b.score-a.score).slice(0, 12);
}

function fallback(items) {
  return items.map(item => ({
    title: item.title, topic: item.topic,
    date: item.published ? new Date(item.published).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric", timeZone:"UTC" }) : "Recent",
    relevance: item.score >= 2 ? "High" : "Medium", status: item.source,
    summary: item.description.slice(0, 280) || "New official EU publication identified by the finance relevance monitor.",
    financeImpact: `Potential ${item.topic.toLowerCase()} implications require finance and adviser assessment.`,
    action: "Review the official text, confirm scope and assign an owner if applicable.", url: item.url,
  }));
}

async function enrich(items) {
  if (!process.env.GEMINI_API_KEY || !items.length) return { items: fallback(items.slice(0, 6)), mode: "Rules-based official-source monitor" };
  const prompt = `You are a cautious EU finance regulatory analyst supporting a European B2B AI SaaS company. First remove items that are country-specific, sector-specific, or not plausibly relevant to that company. Return ONLY a JSON array of up to 6 remaining items. For every item provide: title, topic (Tax & BEPS, AI & Data, R&D & Grants, or Reporting), date, relevance (High/Medium/Low), status, summary (max 45 words), financeImpact (max 35 words), action (max 25 words), url (retain input). Do not invent effective dates or legal conclusions. Public official-source material only. Inputs: ${JSON.stringify(items)}`;
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", { method:"POST", headers:{"content-type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY}, body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:0.1}}) });
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const payload = await response.json();
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.items || parsed.results || [];
  return { items: list.filter(item => item.title && item.url).slice(0, 6), mode: "Gemini-assisted official-source monitor" };
}

const path = new URL("../app/data/regulatory-radar.json", import.meta.url);
const previous = JSON.parse(await readFile(path, "utf8"));
try {
  const discovered = await discover();
  let result;
  try {
    result = await enrich(discovered);
  } catch (error) {
    console.warn(`Gemini unavailable; using deterministic fallback: ${error.message}`);
    result = { items: fallback(discovered.slice(0, 6)), mode: `Rules-based fallback · ${error.message}` };
  }
  const { items } = result;
  if (!items.length) throw new Error("No relevant publications returned");
  const lastChecked = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric", timeZone:"Europe/Vilnius" });
  await writeFile(path, `${JSON.stringify({ lastChecked, generatedBy: result.mode, items }, null, 2)}\n`);
  console.log(`Updated regulatory radar with ${items.length} items.`);
} catch (error) {
  console.warn(`Radar update retained prior validated data: ${error.message}`);
  await writeFile(path, `${JSON.stringify(previous, null, 2)}\n`);
}
