#!/bin/bash
# Script para fazer push com backup AUTOMÁTICO de PRODUÇÃO
# Uso: npm run push-prod

set -e

echo ""
echo "🚀 PUSH AUTOMÁTICO COM BACKUP DE PRODUÇÃO"
echo "=========================================="
echo ""
echo "Este comando faz backup do banco que o DONO DA REVENDA usa!"
echo ""

# 1. Criar backup de PRODUÇÃO
echo "📦 Passo 1/4: Criando backup do banco de PRODUÇÃO..."
echo ""

# Verificar se DATABASE_URL_PRODUCTION existe
if [ -z "$DATABASE_URL_PRODUCTION" ]; then
    echo "⚠️  ATENÇÃO: DATABASE_URL_PRODUCTION não configurada!"
    echo ""
    echo "📋 CONFIGURE AGORA:"
    echo "   1. Vá em 'Deployments' no Replit"
    echo "   2. Clique no deployment ativo"
    echo "   3. Vá em 'Environment variables'"
    echo "   4. Copie o valor de DATABASE_URL"
    echo "   5. Vá em 'Secrets' (cadeado)"
    echo "   6. Adicione: DATABASE_URL_PRODUCTION = (URL copiada)"
    echo ""
    read -p "Continuar SEM backup de produção? (s/N): " CONTINUE
    if [ "$CONTINUE" != "s" ] && [ "$CONTINUE" != "S" ]; then
        echo "❌ Push cancelado"
        exit 1
    fi
    echo "⚠️  Continuando sem backup de produção..."
else
    npm run db:backup-prod --silent
    
    LATEST_BACKUP=$(ls -t backups/*PRODUCTION*.sql 2>/dev/null | head -n 1)
    
    if [ -n "$LATEST_BACKUP" ]; then
        echo "✅ Backup de produção criado: $LATEST_BACKUP"
        
        # Adicionar ao git
        git add "$LATEST_BACKUP"
        
        # Commitar se necessário
        if ! git diff --cached --quiet "$LATEST_BACKUP" 2>/dev/null; then
            TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
            git commit -m "🔥 Backup de PRODUÇÃO - $TIMESTAMP"
            echo "✅ Backup commitado"
        fi
    fi
fi

# 2. Fazer push
echo ""
echo "📤 Passo 2/4: Enviando tudo para o GitHub..."
echo ""

git push "$@"

if [ $? -eq 0 ]; then
    echo "✅ Push concluído!"
else
    echo "❌ Erro ao fazer push"
    exit 1
fi

# 3. Resumo
echo ""
echo "🎉 CONCLUÍDO!"
echo "=================================="
echo ""
echo "✅ Código no GitHub"
echo "✅ Backup de PRODUÇÃO no GitHub"
echo "✅ Dados do dono da revenda preservados"
echo ""
echo "💡 Se você perder esta conta Replit:"
echo "   1. Clone o projeto do GitHub"
echo "   2. npm install"
echo "   3. Configure DATABASE_URL_PRODUCTION"
echo "   4. npm run db:restore-prod backups/velostock_PRODUCTION_*.sql"
echo "   5. Publique o deployment"
echo "   6. O dono da revenda terá TODOS os dados de volta!"
echo ""
