import { defineConfig } from "drizzle-kit";
import { getDatabaseUrl } from "./server/config/database";

// Obter URL do banco de dados (funciona em dev e produção)
const databaseUrl = getDatabaseUrl();

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
