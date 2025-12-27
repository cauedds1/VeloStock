import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { getDatabaseUrl } from "./config/database";

// Obter URL do banco de dados (funciona em dev e produção)
const databaseUrl = getDatabaseUrl();

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });
