import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getDatabaseUrl } from "./config/database";

neonConfig.webSocketConstructor = ws;

// Obter URL do banco de dados (funciona em dev e produção)
const databaseUrl = getDatabaseUrl();

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
