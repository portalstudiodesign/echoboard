import { defineConfig } from "drizzle-kit";

// Migrations are generated from the schema; no database connection is needed for that.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  casing: "snake_case",
});
