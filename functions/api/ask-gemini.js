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

  const prompt = `You are a fast, precise finance and EU-regulatory briefing assistant for an executive dashboard.

Use only the supplied dashboard context. Never invent a law, deadline, risk or company fact. If the user enters only a keyword, interpret it as: "What does the monitored dashboard currently show about this topic, and what should Finance do next?" If the topic is absent, say that clearly instead of forcing an unrelated item.

Answer in this exact style:
- Start with a direct one-sentence answer.
- Add at most 3 short bullets only when useful.
- Maximum 100 words.
- Include one relevant official-source URL only when it exists in the context.
- End with: "Informational only; validate with tax or legal advisers."

Dashboard context: ${JSON.stringify(context).slice(0, 10000)}

User question: ${question}`;

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
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 400,
            thinkingConfig: { thinkingLevel: "MINIMAL" },
          },
        }),
        signal: AbortSignal.timeout(12000),
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
