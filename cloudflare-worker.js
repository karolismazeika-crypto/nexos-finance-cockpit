import { onRequestPost } from "./functions/api/ask-gemini.js";

const methodNotAllowed = () =>
  new Response(JSON.stringify({ error: "Method not allowed." }), {
    status: 405,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/ask-gemini") {
      if (request.method !== "POST") return methodNotAllowed();
      return onRequestPost({ request, env });
    }

    return env.ASSETS.fetch(request);
  },
};
