import { writeFile } from "node:fs/promises";

const hyperdriveId = process.env.CLOUDFLARE_HYPERDRIVE_ID?.trim();
if (!hyperdriveId) {
  throw new Error("Set CLOUDFLARE_HYPERDRIVE_ID to the Hyperdrive configuration ID");
}

const config = {
  name: "auto-bridge",
  main: "./worker/index.ts",
  compatibility_date: "2026-09-27",
  compatibility_flags: ["nodejs_compat"],
  observability: { traces: { enabled: true } },
  hyperdrive: [{ binding: "HYPERDRIVE", id: hyperdriveId }],
  images: { binding: "IMAGES" },
};

await writeFile(new URL("../wrangler.jsonc", import.meta.url), `${JSON.stringify(config, null, 2)}\n`);
