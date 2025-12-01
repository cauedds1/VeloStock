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

  // 2. Fallback para variável de ambiente DATABASE_URL (prioridade máxima após /tmp/replitdb)
  if (!databaseUrl && process.env.DATABASE_URL) {
    databaseUrl = process.env.DATABASE_URL;
    console.log('[Database] ✓ Using DATABASE_URL from environment variable');
  }
  
  // 3. Tentar construir a URL a partir das variáveis PG* (apenas se DATABASE_URL não existir)
  // IMPORTANTE: Só usar PG* se o host NÃO for "helium" (que é interno do Replit dev)
  if (!databaseUrl && process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
    const host = process.env.PGHOST;
    
    // Ignorar "helium" - é um hostname interno que só funciona em dev
    if (host === 'helium') {
      console.log('[Database] ⚠ Skipping internal "helium" host - requires external DATABASE_URL for production');
    } else {
      const port = process.env.PGPORT || '5432';
      const user = process.env.PGUSER;
      const password = process.env.PGPASSWORD;
      const database = process.env.PGDATABASE;
      databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;
      console.log('[Database] ✓ Built DATABASE_URL from PG* environment variables');
    }
  }
  
  if (!databaseUrl) {
    throw new Error(
      '[Database] DATABASE_URL não encontrada! ' +
      'Verifique se o banco de dados PostgreSQL foi provisionado no Replit.'
    );
  }

  // 3. Em PRODUÇÃO, usar Neon pooler para autoscale (evita limite de 4 conexões)
  if (isProduction && databaseUrl.includes('neon.tech') && !databaseUrl.includes('-pooler')) {
    // Exemplo: ep-icy-art-ah7hafdz.c-3.us-east-1.aws.neon.tech
    // Vira:    ep-icy-art-ah7hafdz-pooler.c-3.us-east-1.aws.neon.tech
    databaseUrl = databaseUrl.replace(
      /(ep-[a-z0-9-]+)\.(c-\d+\.us-[a-z]+-\d+\.aws\.neon\.tech)/,
      '$1-pooler.$2'
    );
    console.log('[Database] ✓ Using Neon pooler for autoscale deployment');
  }
  
  const env = isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO';
  console.log(`[Database] ✓ Conectando ao banco de dados de ${env}`);

  return databaseUrl;
}
