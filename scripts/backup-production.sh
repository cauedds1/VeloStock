#!/bin/bash
# Script para fazer backup do banco de dados de PRODUÇÃO
# Uso: npm run db:backup-prod

set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/velostock_PRODUCTION_${TIMESTAMP}.sql"

echo ""
echo "🔥 BACKUP DO BANCO DE PRODUÇÃO 🔥"
echo "=================================="
echo ""
echo "Este é o backup que o dono da revenda usa!"
echo "Contém TODOS os dados reais: carros, usuários, vendas, etc."
echo ""

mkdir -p "${BACKUP_DIR}"

# Verificar se DATABASE_URL_PRODUCTION existe
if [ -z "$DATABASE_URL_PRODUCTION" ]; then
    echo "⚠️  ATENÇÃO: DATABASE_URL_PRODUCTION não está configurada"
    echo ""
    echo "📋 COMO OBTER A URL DE PRODUÇÃO:"
    echo "   1. Vá em 'Deployments' no Replit"
    echo "   2. Clique no deployment ativo"
    echo "   3. Vá em 'Environment variables'"
    echo "   4. Copie o valor de DATABASE_URL"
    echo ""
    echo "💡 Depois configure aqui no Replit:"
    echo "   1. Vá em 'Secrets' (cadeado no menu lateral)"
    echo "   2. Adicione nova secret:"
    echo "      Nome: DATABASE_URL_PRODUCTION"
    echo "      Valor: (cole a URL que você copiou)"
    echo ""
    echo "❌ Backup de produção cancelado"
    exit 1
fi

echo "📦 Exportando banco de dados de PRODUÇÃO..."
echo "📁 Arquivo: ${BACKUP_FILE}"
echo ""

pg_dump "$DATABASE_URL_PRODUCTION" \
    --format=plain \
    --no-owner \
    --no-privileges \
    --clean \
    --if-exists \
    --verbose \
    > "$BACKUP_FILE" 2>&1

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo ""
    echo "✅ BACKUP DE PRODUÇÃO CONCLUÍDO!"
    echo "=================================="
    echo "📊 Tamanho: ${SIZE}"
    echo "📂 Local: ${BACKUP_FILE}"
    echo ""
    echo "🔥 Este backup contém TODOS os dados do dono da revenda:"
    echo "   ✅ Todos os carros"
    echo "   ✅ Todos os usuários e senhas"
    echo "   ✅ Todas as vendas"
    echo "   ✅ Todo o histórico"
    echo ""
    echo "📋 Para versionar no Git:"
    echo "   git add ${BACKUP_FILE}"
    echo "   git commit -m 'Backup de PRODUÇÃO - ${TIMESTAMP}'"
    echo "   git push"
    echo ""
    echo "🔄 Para restaurar em outra conta Replit:"
    echo "   npm run db:restore-prod ${BACKUP_FILE}"
else
    echo "❌ Erro ao criar backup de produção"
    exit 1
fi
