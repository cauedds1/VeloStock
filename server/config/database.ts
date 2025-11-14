import { readFileSync } from 'fs';

let databaseUrl: string | null = null;
let connectionSource: 'file' | 'env' | null = null;

/**
 * Obtém a URL de conexão do banco de dados do local correto
 * dependendo do ambiente (produção vs desenvolvimento)
 * 
 * Em produção (Replit Deploy): lê de /tmp/replitdb
 * Em desenvolvimento: lê de process.env.DATABASE_URL
 */
export function getDatabaseUrl(): string {
  // Se já foi carregado, retorna o valor em cache
  if (databaseUrl) {
    return databaseUrl;
  }

  // Tenta ler de /tmp/replitdb primeiro (ambiente de produção)
  try {
    const fileContent = readFileSync('/tmp/replitdb', 'utf-8').trim();
    if (fileContent) {
      databaseUrl = fileContent;
      connectionSource = 'file';
      console.log('[Database] ✓ Conectando ao banco de dados de PRODUÇÃO');
      return databaseUrl;
    }
  } catch (error: any) {
    // Arquivo não existe ou não pode ser lido - isso é normal em desenvolvimento
    if (error.code !== 'ENOENT') {
      console.warn('[Database] ⚠️  Aviso ao ler /tmp/replitdb:', error.message);
    }
  }

  // Fallback para variável de ambiente (desenvolvimento)
  if (process.env.DATABASE_URL) {
    databaseUrl = process.env.DATABASE_URL;
    connectionSource = 'env';
    console.log('[Database] ✓ Conectando ao banco de dados de DESENVOLVIMENTO');
    return databaseUrl;
  }

  // Se chegou aqui, nenhuma configuração foi encontrada
  throw new Error(
    'DATABASE_URL não configurada! ' +
    'Verifique se o banco de dados foi provisionado no Replit. ' +
    'Em desenvolvimento: DATABASE_URL deve estar nas variáveis de ambiente. ' +
    'Em produção: /tmp/replitdb deve existir após o deploy.'
  );
}

/**
 * Retorna qual fonte está sendo usada para a conexão
 * Útil para debugging e monitoramento
 */
export function getConnectionSource(): 'file' | 'env' | null {
  return connectionSource;
}
