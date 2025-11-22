#!/bin/bash
# Script para restaurar backup no banco de PRODUÇÃO
# Uso: npm run db:restore-prod backups/velostock_PRODUCTION_YYYYMMDD_HHMMSS.sql

set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ ERRO: Você precisa especificar o arquivo de backup"
    echo ""
    echo "Uso: npm run db:restore-prod <arquivo-backup-producao>"
    echo ""
    echo "Exemplo:"
    echo "  npm run db:restore-prod backups/velostock_PRODUCTION_20241122_150000.sql"
    echo ""
    echo "📂 Backups de produção disponíveis:"
    ls -lh backups/*PRODUCTION*.sql 2>/dev/null || echo "   Nenhum backup de produção encontrado"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERRO: Arquivo não encontrado: ${BACKUP_FILE}"
    exit 1
fi

# Verificar se DATABASE_URL_PRODUCTION existe
if [ -z "$DATABASE_URL_PRODUCTION" ]; then
    echo "⚠️  ATENÇÃO: DATABASE_URL_PRODUCTION não está configurada"
    echo ""
    echo "📋 COMO OBTER A URL DE PRODUÇÃO NA NOVA CONTA:"
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
    echo "❌ Restauração cancelada"
    exit 1
fi

echo ""
echo "🔥 RESTAURAR BANCO DE PRODUÇÃO 🔥"
echo "=================================="
echo ""
echo "⚠️  ATENÇÃO: Você está prestes a SUBSTITUIR o banco de PRODUÇÃO!"
echo "📁 Backup: ${BACKUP_FILE}"
echo ""
echo "Isso irá restaurar TODOS os dados do dono da revenda:"
echo "   • Todos os carros"
echo "   • Todos os usuários e senhas"
echo "   • Todas as vendas"
echo "   • Todo o histórico"
echo ""
read -p "Tem CERTEZA? Digite 'SIM PRODUÇÃO' para confirmar: " CONFIRM

if [ "$CONFIRM" != "SIM PRODUÇÃO" ]; then
    echo "❌ Restauração cancelada"
    exit 0
fi

echo ""
echo "🔄 Restaurando banco de dados de PRODUÇÃO..."
echo ""

psql "$DATABASE_URL_PRODUCTION" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ BANCO DE PRODUÇÃO RESTAURADO COM SUCESSO!"
    echo "============================================="
    echo ""
    echo "🎉 O dono da revenda agora tem acesso a TODOS os dados:"
    echo "   ✅ Todos os carros"
    echo "   ✅ Todos os usuários (mesmas senhas)"
    echo "   ✅ Todas as vendas"
    echo "   ✅ Todo o histórico"
    echo ""
    echo "💡 Ele pode fazer login normalmente com a mesma senha!"
else
    echo "❌ Erro ao restaurar backup de produção"
    exit 1
fi
