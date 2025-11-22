#!/bin/bash
# Script para fazer backup completo do banco de dados PostgreSQL
# Uso: npm run db:backup

set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/velostock_backup_${TIMESTAMP}.sql"

echo "🔄 Iniciando backup do banco de dados VeloStock..."
echo "📁 Arquivo de backup: ${BACKUP_FILE}"

mkdir -p "${BACKUP_DIR}"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERRO: DATABASE_URL não está definida"
    echo "💡 Configure a variável de ambiente DATABASE_URL"
    exit 1
fi

echo "📦 Exportando banco de dados..."
pg_dump "$DATABASE_URL" \
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
    echo "✅ Backup concluído com sucesso!"
    echo "📊 Tamanho do arquivo: ${SIZE}"
    echo "📂 Local: ${BACKUP_FILE}"
    echo ""
    echo "📋 Para versionar este backup no Git:"
    echo "   git add ${BACKUP_FILE}"
    echo "   git commit -m 'Backup do banco de dados - ${TIMESTAMP}'"
    echo ""
    echo "📤 Para restaurar este backup em outro projeto Replit:"
    echo "   npm run db:restore ${BACKUP_FILE}"
else
    echo "❌ Erro ao criar backup"
    exit 1
fi
