import { drizzle } from "drizzle-orm/d1";
import type { AnyD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import { userLoginLogs } from "./user-login-log-schema";

declare global {
  // Installed from the D1 binding at the start of each Worker request.
  var autoBridgeD1Database: AnyD1Database | undefined;
}

const completeSchema = { ...schema, userLoginLogs };

export function getDb() {
  const database = globalThis.autoBridgeD1Database;
  if (!database) {
    throw new Error("Cloudflare D1 binding DB is not available for this request");
  }

  const drizzleDb = drizzle(database, { schema: completeSchema });
  return Object.assign(drizzleDb, {
    // Keep the existing application contract. D1 executes each statement
    // through its prepared-statement API; callers already await this batch.
    batch<T extends readonly PromiseLike<unknown>[]>(queries: T) {
      return Promise.all(queries);
    },
  });
}
