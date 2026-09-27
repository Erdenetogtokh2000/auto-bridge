import { writeFile } from "node:fs/promises";

const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim() || "a4476a3a-ea13-43b4-bf8e-2c1196930f33";
const config = {
  name: "auto-bridge",
  main: "./worker/index.ts",
  compatibility_date: "2026-09-27",
  compatibility_flags: ["nodejs_compat"],
  secrets: { required: ["AUTH_BOOTSTRAP_TOKEN"] },
  observability: { traces: { enabled: true } },
  d1_databases: [{
    binding: "DB",
    database_name: "auto-bridge-db",
    database_id: databaseId,
    migrations_dir: "migrations/d1",
  }],
  r2_buckets: [{
    binding: "BUCKET",
    bucket_name: "auto-bridge-files",
  }],
  images: { binding: "IMAGES" },
  triggers: { crons: ["0 */6 * * *", "*/15 * * * *"] },
  routes: [{ pattern: "autobridge.mn/*", zone_name: "autobridge.mn" }],
};

await writeFile(new URL("../wrangler.jsonc", import.meta.url), `${JSON.stringify(config, null, 2)}\n`);
