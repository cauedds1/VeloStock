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
  let databaseUrl: string | undefined;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Tentar ler de /tmp/replitdb (PRODUÇÃO)
  try {
    const fs = require('fs');
    if (fs.existsSync('/tmp/replitdb')) {
      databaseUrl = fs.readFileSync('/tmp/replitdb', 'utf8').trim();
      if (databaseUrl) {
        console.log('[Database] ✓ Using DATABASE_URL from /tmp/replitdb (PRODUCTION)');
      }
    }
  } catch (error) {
    // Fallback to environment variable
    console.warn('[Database] Could not read /tmp/replitdb, falling back to env var');
  }

  // 2. Fallback para variável de ambiente (DESENVOLVIMENTO)
  if (!databaseUrl) {
    databaseUrl = process.env.DATABASE_URL;
  }
  
  if (!databaseUrl) {
    throw new Error(
      '[Database] DATABASE_URL não encontrada! ' +
      'Verifique se o banco de dados PostgreSQL foi provisionado no Replit.'
    );
  }

  // 3. Em PRODUÇÃO, usar Neon pooler para autoscale (evita limite de 4 conexões)
  if (isProduction && databaseUrl.includes('neon.tech') && !databaseUrl.includes('-pooler')) {
    databaseUrl = databaseUrl.replace(
      /([a-z0-9-]+)\.([a-z0-9-]+)\.aws\.neon\.tech/,
      '$1-pooler.$2.aws.neon.tech'
    );
    console.log('[Database] ✓ Using Neon pooler for autoscale deployment');
  }
  
  const env = isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO';
  console.log(`[Database] ✓ Conectando ao banco de dados de ${env}`);

  return databaseUrl;
}
