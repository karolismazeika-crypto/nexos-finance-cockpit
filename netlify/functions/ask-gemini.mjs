const requests = new Map();
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers:{ "content-type":"application/json", "cache-control":"no-store" } });
const compact = (value, limit=180) => { const text=String(value||"").trim(); return text.length>limit ? `${text.slice(0,limit-1).trim()}…` : text; };
const quickTopicBrief = (question, context) => { const terms=question.toLowerCase().match(/[a-z0-9]+/g)||[]; if(!terms.length||terms.length>3)return null; const ranked=context.map(item=>({item,score:terms.filter(term=>[item.title,item.topic,item.summary,item.financeImpact].join(" ").toLowerCase().includes(term)).length})).filter(({score})=>score>0).sort((a,b)=>b.score-a.score); if(ranked.length){const item=ranked[0].item;return `${compact(item.title,140)}\n\n• ${compact(item.summary)}\n• Finance impact: ${compact(item.financeImpact)}\n• Next action: ${compact(item.action)}${item.url?`\n\n${item.url}`:""}\n\nInformational only; validate with tax or legal advisers.`;} if(terms.includes("beps"))return "No BEPS-specific development is present in the current monitored queue.\n\n• This means the radar has not surfaced a BEPS item; it does not mean the group has no BEPS exposure.\n• Finance should separately review transfer pricing, intercompany charges, Pillar Two, permanent-establishment and substance risks.\n\nInformational only; validate with tax or legal advisers."; return `No development specifically matching “${compact(question,60)}” is present in the current monitored queue. Finance should widen the official-source screening rather than infer a conclusion from unrelated items.\n\nInformational only; validate with tax or legal advisers.`; };

export default async function handler(request) {
  if (request.method !== "POST") return json({ error:"Method not allowed." }, 405);
  if (!process.env.GEMINI_API_KEY) return json({ error:"Gemini is not configured in Netlify yet." }, 503);
  const ip = request.headers.get("x-nf-client-connection-ip") || "anonymous";
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter(time => now - time < WINDOW_MS);
  if (recent.length >= LIMIT) return json({ error:"Hourly question limit reached. Please try again later." }, 429);
  let payload;
  try { payload = await request.json(); } catch { return json({ error:"Invalid request." }, 400); }
  const question = String(payload.question || "").trim().slice(0, 500);
  const context = Array.isArray(payload.context) ? payload.context.slice(0, 8) : [];
  if (!question) return json({ error:"Please enter a question." }, 400);
  const quickAnswer=quickTopicBrief(question,context); if(quickAnswer){requests.set(ip,[...recent,now]);return json({answer:quickAnswer});}
  const prompt = `You are a fast, precise finance and EU-regulatory briefing assistant for an executive dashboard. Use only the supplied dashboard context. Never invent facts. If the user enters only a keyword, explain what the monitored dashboard currently shows about it and what Finance should do next. If the topic is absent, say so clearly. Start with a direct answer, use at most 3 short bullets, stay under 100 words, include an official-source URL only when present in context, and end with: "Informational only; validate with tax or legal advisers."\n\nDashboard context: ${JSON.stringify(context).slice(0, 10000)}\n\nUser question: ${question}`;
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent", { method:"POST", headers:{"content-type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY}, body:JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.1,maxOutputTokens:400,thinkingConfig:{thinkingLevel:"MINIMAL"}} }), signal:AbortSignal.timeout(25000) });
    if (!response.ok) return json({ error:"Gemini is temporarily unavailable. Please try again later." }, 502);
    const result = await response.json();
    const answer = result.candidates?.[0]?.content?.parts?.map(part=>part.text||"").join("").trim();
    if (!answer) return json({ error:"No answer was returned. Please rephrase the question." }, 502);
    requests.set(ip, [...recent, now]);
    return json({ answer });
  } catch { return json({ error:"The assistant is temporarily unavailable." }, 502); }
}
