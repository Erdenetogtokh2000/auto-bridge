import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations/d1",
  schema: ["./db/schema.ts", "./db/user-login-log-schema.ts"],
  dialect: "sqlite",
  driver: "d1-http",
});
