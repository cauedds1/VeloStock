/**
 * Obtém a URL de conexão do banco de dados
 * 
 * Em PRODUÇÃO (autoscale): DATABASE_URL está em /tmp/replitdb
 * Em DESENVOLVIMENTO: DATABASE_URL vem de process.env.DATABASE_URL
 * 
 * IMPORTANTE: Para Autoscale deployments, usa automaticamente o Neon pooler
 * (substitui .neon.tech por -pooler.neon.tech) para evitar limite de conexões.
 * 
 * Fonte: https://docs.replit.com/hosting/deployments/postgresql-on-deployments
 */
export function getDatabaseUrl(): string {
  let databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl && process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    const host = process.env.PGHOST;
    const port = process.env.PGPORT || '5432';
    const user = process.env.PGUSER;
    const password = process.env.PGPASSWORD;
    const database = process.env.PGDATABASE;
    databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;
    console.log('[Database] ✓ Built DATABASE_URL from PG* environment variables');
  }
  
  if (!databaseUrl) {
    throw new Error(
      '[Database] DATABASE_URL não encontrada! ' +
      'Verifique se a variável de ambiente DATABASE_URL está configurada.'
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const env = isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO';
  console.log(`[Database] ✓ Conectando ao banco de dados de ${env} via environment variable`);

  return databaseUrl;
}
