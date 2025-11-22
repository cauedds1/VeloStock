#!/bin/bash
# Script para fazer push com backup COMPLETO (Desenvolvimento + Produção)
# Uso: npm run push-full

set -e

echo ""
echo "🚀 PUSH COMPLETO COM BACKUP DE TUDO"
echo "====================================="
echo ""
echo "Este comando faz backup de:"
echo "  📦 Banco de DESENVOLVIMENTO (dados de teste)"
echo "  🔥 Banco de PRODUÇÃO (dados reais do dono da revenda)"
echo ""

BACKUPS_CREATED=0

# 1. Backup de DESENVOLVIMENTO
echo "📦 Passo 1/5: Backup do banco de DESENVOLVIMENTO..."
echo ""

if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL não encontrada, pulando backup de desenvolvimento"
else
    npm run db:backup --silent
    
    LATEST_DEV_BACKUP=$(ls -t backups/velostock_backup_*.sql 2>/dev/null | grep -v "PRODUCTION" | head -n 1)
    
    if [ -n "$LATEST_DEV_BACKUP" ]; then
        echo "✅ Backup DEV: $LATEST_DEV_BACKUP"
        git add "$LATEST_DEV_BACKUP"
        BACKUPS_CREATED=$((BACKUPS_CREATED + 1))
    fi
fi

# 2. Backup de PRODUÇÃO
echo ""
echo "🔥 Passo 2/5: Backup do banco de PRODUÇÃO..."
echo ""

if [ -z "$DATABASE_URL_PRODUCTION" ]; then
    echo "⚠️  DATABASE_URL_PRODUCTION não configurada"
    echo ""
    echo "💡 COMO CONFIGURAR:"
    echo "   1. Deployments > Deployment ativo > Environment variables"
    echo "   2. Copie DATABASE_URL"
    echo "   3. Secrets (cadeado) > New Secret"
    echo "   4. Nome: DATABASE_URL_PRODUCTION, Valor: (cole a URL)"
    echo ""
    echo "⚠️  Pulando backup de produção..."
else
    npm run db:backup-prod --silent
    
    LATEST_PROD_BACKUP=$(ls -t backups/*PRODUCTION*.sql 2>/dev/null | head -n 1)
    
    if [ -n "$LATEST_PROD_BACKUP" ]; then
        echo "✅ Backup PROD: $LATEST_PROD_BACKUP"
        git add "$LATEST_PROD_BACKUP"
        BACKUPS_CREATED=$((BACKUPS_CREATED + 1))
    fi
fi

# 3. Commit dos backups
echo ""
echo "📝 Passo 3/5: Commitando backups..."
echo ""

if [ $BACKUPS_CREATED -gt 0 ]; then
    # Verificar se há mudanças staged
    if ! git diff --cached --quiet backups/ 2>/dev/null; then
        TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
        git commit -m "💾 Backup completo (DEV + PROD) - $TIMESTAMP"
        echo "✅ $BACKUPS_CREATED backup(s) commitado(s)"
    else
        echo "ℹ️  Backups já estavam no Git"
    fi
else
    echo "⚠️  Nenhum backup foi criado"
fi

# 4. Push para GitHub
echo ""
echo "📤 Passo 4/5: Enviando tudo para o GitHub..."
echo ""

git push "$@"

if [ $? -eq 0 ]; then
    echo "✅ Push concluído!"
else
    echo "❌ Erro ao fazer push"
    exit 1
fi

# 5. Resumo final
echo ""
echo "🎉 Passo 5/5: CONCLUÍDO!"
echo "====================================="
echo ""

if [ $BACKUPS_CREATED -eq 2 ]; then
    echo "✅ Código no GitHub"
    echo "✅ Backup de DESENVOLVIMENTO no GitHub"
    echo "✅ Backup de PRODUÇÃO no GitHub"
    echo ""
    echo "🎯 TUDO ESTÁ SALVO!"
    echo ""
    echo "💡 Se você perder esta conta Replit:"
    echo "   1. Clone o projeto do GitHub"
    echo "   2. npm install"
    echo "   3. npm run db:push"
    echo "   4. npm run db:restore-prod backups/*PRODUCTION*.sql"
    echo "   5. Publique o deployment"
    echo "   6. O dono da revenda terá TODOS os dados!"
elif [ $BACKUPS_CREATED -eq 1 ]; then
    echo "✅ Código no GitHub"
    echo "✅ 1 backup no GitHub"
    echo ""
    echo "⚠️  Configure DATABASE_URL_PRODUCTION para backup completo"
else
    echo "✅ Código no GitHub"
    echo "⚠️  Nenhum backup foi criado"
    echo ""
    echo "💡 Configure as variáveis de ambiente para backups automáticos"
fi

echo ""
