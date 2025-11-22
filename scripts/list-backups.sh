#!/bin/bash
# Script para listar todos os backups disponíveis
# Uso: npm run db:list-backups

echo "📂 Backups disponíveis em backups/:"
echo ""

if [ ! -d "backups" ] || [ -z "$(ls -A backups/*.sql 2>/dev/null)" ]; then
    echo "   Nenhum backup encontrado"
    echo ""
    echo "💡 Para criar um backup, execute:"
    echo "   npm run db:backup"
    exit 0
fi

ls -lht backups/*.sql | awk '{
    size = $5
    date = $6" "$7" "$8
    file = $9
    printf "   📦 %s\n      Tamanho: %s | Data: %s\n\n", file, size, date
}'

echo "💡 Para restaurar um backup, execute:"
echo "   npm run db:restore <arquivo-backup>"
