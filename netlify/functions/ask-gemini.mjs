const requests = new Map();
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers:{ "content-type":"application/json", "cache-control":"no-store" } });

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
  const prompt = `You are a fast, precise finance and EU-regulatory briefing assistant for an executive dashboard. Use only the supplied dashboard context. Never invent facts. If the user enters only a keyword, explain what the monitored dashboard currently shows about it and what Finance should do next. If the topic is absent, say so clearly. Start with a direct answer, use at most 3 short bullets, stay under 100 words, include an official-source URL only when present in context, and end with: "Informational only; validate with tax or legal advisers."\n\nDashboard context: ${JSON.stringify(context).slice(0, 10000)}\n\nUser question: ${question}`;
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent", { method:"POST", headers:{"content-type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY}, body:JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.1,maxOutputTokens:400,thinkingConfig:{thinkingLevel:"MINIMAL"}} }), signal:AbortSignal.timeout(12000) });
    if (!response.ok) return json({ error:"Gemini is temporarily unavailable. Please try again later." }, 502);
    const result = await response.json();
    const answer = result.candidates?.[0]?.content?.parts?.map(part=>part.text||"").join("").trim();
    if (!answer) return json({ error:"No answer was returned. Please rephrase the question." }, 502);
    requests.set(ip, [...recent, now]);
    return json({ answer });
  } catch { return json({ error:"The assistant is temporarily unavailable." }, 502); }
}
