import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

let pool: pg.Pool | undefined;

function normalizedDatabaseUrl(raw: string) {
  try {
    const databaseUrl = new URL(raw);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return raw;

    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    if (!projectRef) return raw;

    // Render does not support Supabase's IPv6-only direct database endpoint.
    // Keep the existing database password but route through Supavisor session
    // mode, which is IPv4-compatible and behaves like a normal Postgres
    // connection for node-postgres/Drizzle.
    databaseUrl.protocol = "postgresql:";
    databaseUrl.username = `postgres.${projectRef}`;
    databaseUrl.hostname = process.env.SUPABASE_DB_POOLER_HOST ?? "aws-0-ap-southeast-2.pooler.supabase.com";
    databaseUrl.port = "5432";
    databaseUrl.pathname = "/postgres";
    return databaseUrl.toString();
  } catch {
    return raw;
  }
}

export function getDb() {
  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const connectionString = normalizedDatabaseUrl(rawConnectionString);

  pool ??= new pg.Pool({
    connectionString,
    // Supabase requires an encrypted connection from Render.
    ssl: { rejectUnauthorized: false },
  });
  const database = drizzle(pool, { schema });
  return Object.assign(database, {
    // D1 exposed batch(); keep the existing application contract while
    // Postgres executes the prepared statements concurrently.
    batch<T extends readonly PromiseLike<unknown>[]>(queries: T) {
      return Promise.all(queries);
    },
  });
}
