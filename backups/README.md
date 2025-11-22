# 📦 Pasta de Backups

Esta pasta armazena os backups do banco de dados PostgreSQL do VeloStock.

## Comandos Disponíveis

```bash
# Criar um novo backup
npm run db:backup

# Listar todos os backups
npm run db:list-backups

# Restaurar um backup
npm run db:restore backups/velostock_backup_YYYYMMDD_HHMMSS.sql
```

## Versionamento no Git

Você pode (e deve!) versionar os backups importantes no Git:

```bash
git add backups/velostock_backup_20241122_133639.sql
git commit -m "Backup do banco de dados"
git push origin main
```

Isso garante que seus dados estejam seguros no GitHub!

## Documentação Completa

Para instruções detalhadas sobre backup, restauração e migração entre contas Replit, veja:

📖 **README_BACKUP.md** (na raiz do projeto)
