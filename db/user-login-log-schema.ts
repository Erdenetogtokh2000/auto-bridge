import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const userLoginLogs = sqliteTable("user_login_logs", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role"),
  result: text("result").notNull().default("SUCCESS"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  source: text("source").notNull().default("WEB"),
  loggedInAt: text("logged_in_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
