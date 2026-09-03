import { getConnectionString } from "@netlify/database";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

let pool: pg.Pool | undefined;

export function getDb() {
  pool ??= new pg.Pool({ connectionString: getConnectionString() });
  const database = drizzle(pool, { schema });
  return Object.assign(database, {
    // D1 exposed batch(); keep the existing application contract while
    // Postgres executes the prepared statements concurrently.
    batch<T extends readonly PromiseLike<unknown>[]>(queries: T) {
      return Promise.all(queries);
    },
  });
}
