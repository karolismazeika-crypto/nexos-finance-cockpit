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

const compact = (value, limit = 180) => {
  const text = String(value || "").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trim()}…` : text;
};

function quickTopicBrief(question, context) {
  const terms = question.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (!terms.length || terms.length > 3) return null;

  const ranked = context
    .map((item) => {
      const searchable = [item.title, item.topic, item.summary, item.financeImpact]
        .join(" ")
        .toLowerCase();
      return { item, score: terms.filter((term) => searchable.includes(term)).length };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length) {
    const item = ranked[0].item;
    return `${compact(item.title, 140)}\n\n• ${compact(item.summary)}\n• Finance impact: ${compact(item.financeImpact)}\n• Next action: ${compact(item.action)}${item.url ? `\n\n${item.url}` : ""}\n\nInformational only; validate with tax or legal advisers.`;
  }

  if (terms.includes("beps")) {
    return "No BEPS-specific development is present in the current monitored queue.\n\n• This means the radar has not surfaced a BEPS item; it does not mean the group has no BEPS exposure.\n• Finance should separately review transfer pricing, intercompany charges, Pillar Two, permanent-establishment and substance risks.\n\nInformational only; validate with tax or legal advisers.";
  }

  return `No development specifically matching “${compact(question, 60)}” is present in the current monitored queue. Finance should widen the official-source screening rather than infer a conclusion from unrelated items.\n\nInformational only; validate with tax or legal advisers.`;
}

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

  const quickAnswer = quickTopicBrief(question, context);
  if (quickAnswer) {
    requests.set(ip, [...recent, now]);
    return json({ answer: quickAnswer });
  }

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
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
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
        signal: AbortSignal.timeout(25000),
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
