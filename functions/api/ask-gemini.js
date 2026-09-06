const requests = new Map();
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) {
    return json({ error: "Gemini is not configured yet." }, 503);
  }

  const ip = request.headers.get("cf-connecting-ip") || "anonymous";
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter(
    (time) => now - time < WINDOW_MS,
  );
  if (recent.length >= LIMIT) {
    return json(
      { error: "Hourly question limit reached. Please try again later." },
      429,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const question = String(payload.question || "").trim().slice(0, 500);
  const context = Array.isArray(payload.context) ? payload.context.slice(0, 8) : [];
  if (!question) return json({ error: "Please enter a question." }, 400);

  const prompt = `You are a concise finance regulatory assistant. Answer only from the supplied EUR-Lex-derived dashboard context. If the answer is not supported, say so. Do not provide legal or tax advice, invent facts, or imply affiliation with nexos.ai. Respond in no more than 120 words and end with the most relevant official-source URL when available.\n\nContext: ${JSON.stringify(context).slice(0, 10000)}\n\nQuestion: ${question}`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 220 },
        }),
      },
    );
    if (!response.ok) {
      return json(
        { error: "Gemini is temporarily unavailable. Please try again later." },
        502,
      );
    }

    const result = await response.json();
    const answer = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!answer) {
      return json(
        { error: "No answer was returned. Please rephrase the question." },
        502,
      );
    }

    requests.set(ip, [...recent, now]);
    return json({ answer });
  } catch {
    return json({ error: "The assistant is temporarily unavailable." }, 502);
  }
}

export function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
