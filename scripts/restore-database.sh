#!/bin/bash
# Script para restaurar backup do banco de dados PostgreSQL
# Uso: npm run db:restore backups/velostock_backup_YYYYMMDD_HHMMSS.sql

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ ERRO: Você precisa especificar o arquivo de backup"
    echo ""
    echo "Uso: npm run db:restore <arquivo-backup>"
    echo ""
    echo "Exemplo:"
    echo "  npm run db:restore backups/velostock_backup_20241122_150000.sql"
    echo ""
    echo "📂 Backups disponíveis:"
    ls -lh backups/*.sql 2>/dev/null || echo "   Nenhum backup encontrado em backups/"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERRO: Arquivo não encontrado: ${BACKUP_FILE}"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERRO: DATABASE_URL não está definida"
    echo "💡 Configure a variável de ambiente DATABASE_URL"
    exit 1
fi

echo "⚠️  ATENÇÃO: Este processo irá SUBSTITUIR todos os dados atuais!"
echo "📁 Backup a ser restaurado: ${BACKUP_FILE}"
echo ""
read -p "Tem certeza que deseja continuar? (digite 'SIM' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SIM" ]; then
    echo "❌ Restauração cancelada"
    exit 0
fi

echo ""
echo "🔄 Restaurando banco de dados..."

psql "$DATABASE_URL" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Banco de dados restaurado com sucesso!"
    echo "📊 Todos os dados foram importados:"
    echo "   • Usuários"
    echo "   • Carros"
    echo "   • Observações"
    echo "   • Todas as outras tabelas"
else
    echo "❌ Erro ao restaurar backup"
    exit 1
fi
