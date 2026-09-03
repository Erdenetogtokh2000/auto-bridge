import { getDatabase } from "@netlify/database";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export function getDb() {
  const connection = getDatabase();
  if (connection.driver !== "server") {
    throw new Error("AUTO BRIDGE requires the Netlify server database driver.");
  }
  const database = drizzle(connection.pool, { schema });
  return Object.assign(database, {
    // D1 exposed batch(); keep the existing application contract while
    // Postgres executes the prepared statements concurrently.
    batch<T extends readonly PromiseLike<unknown>[]>(queries: T) {
      return Promise.all(queries);
    },
  });
}
