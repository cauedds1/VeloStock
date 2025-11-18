/**
 * Obtém a URL de conexão do banco de dados
 * 
 * Em PRODUÇÃO (autoscale): DATABASE_URL está em /tmp/replitdb
 * Em DESENVOLVIMENTO: DATABASE_URL vem de process.env.DATABASE_URL
 * 
 * Fonte: https://docs.replit.com/hosting/deployments/postgresql-on-deployments
 */
export function getDatabaseUrl(): string {
  let databaseUrl: string | undefined;

  // 1. Tentar ler de /tmp/replitdb (PRODUÇÃO)
  try {
    const fs = require('fs');
    if (fs.existsSync('/tmp/replitdb')) {
      databaseUrl = fs.readFileSync('/tmp/replitdb', 'utf8').trim();
      if (databaseUrl) {
        console.log('[Database] ✓ Using DATABASE_URL from /tmp/replitdb (PRODUCTION)');
        return databaseUrl;
      }
    }
  } catch (error) {
    // Fallback to environment variable
    console.warn('[Database] Could not read /tmp/replitdb, falling back to env var');
  }

  // 2. Fallback para variável de ambiente (DESENVOLVIMENTO)
  databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(
      '[Database] DATABASE_URL não encontrada! ' +
      'Verifique se o banco de dados PostgreSQL foi provisionado no Replit.'
    );
  }

  const isDev = process.env.NODE_ENV === 'development';
  const env = isDev ? 'DESENVOLVIMENTO' : 'PRODUÇÃO';
  
  console.log(`[Database] ✓ Conectando ao banco de dados de ${env}`);

  return databaseUrl;
}
