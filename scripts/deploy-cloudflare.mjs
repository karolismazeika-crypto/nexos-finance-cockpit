import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is missing from the Cloudflare build variables.");
  process.exit(1);
}

const secretsPath = join(process.cwd(), ".cloudflare-secrets.json");

try {
  writeFileSync(secretsPath, JSON.stringify({ GEMINI_API_KEY: apiKey }), {
    encoding: "utf8",
    mode: 0o600,
  });

  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "wrangler",
      "deploy",
      "--config",
      "wrangler.toml",
      "--secrets-file",
      secretsPath,
    ],
    { stdio: "inherit" },
  );

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(secretsPath, { force: true });
}
