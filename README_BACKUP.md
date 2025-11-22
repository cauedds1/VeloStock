# 📦 Sistema de Backup e Restauração do Banco de Dados VeloStock

Este documento explica como fazer backup e restaurar TODOS os dados do seu banco de dados PostgreSQL, incluindo usuários, carros, observações e qualquer outra informação.

## 🎯 O Que Este Sistema Faz

✅ **Faz backup completo** de todos os dados do banco de dados  
✅ **Permite versionar** os backups no GitHub (se você quiser)  
✅ **Restaura dados** em qualquer conta Replit  
✅ **Preserva TUDO**: usuários, senhas, carros, observações, etc.

## 📋 Comandos Disponíveis

### 1. Criar um Backup

```bash
npm run db:backup
```

Este comando:
- Exporta TODOS os dados do banco de dados
- Salva em `backups/velostock_backup_YYYYMMDD_HHMMSS.sql`
- Mostra o tamanho do arquivo criado
- Fornece instruções de como versionar no Git

**Exemplo de saída:**
```
🔄 Iniciando backup do banco de dados VeloStock...
📁 Arquivo de backup: backups/velostock_backup_20241122_150000.sql
📦 Exportando banco de dados...
✅ Backup concluído com sucesso!
📊 Tamanho do arquivo: 2.5M
```

### 2. Listar Backups Disponíveis

```bash
npm run db:list-backups
```

Este comando mostra todos os backups salvos em `backups/`:

**Exemplo de saída:**
```
📂 Backups disponíveis em backups/:

   📦 backups/velostock_backup_20241122_150000.sql
      Tamanho: 2.5M | Data: Nov 22 15:00

   📦 backups/velostock_backup_20241121_140000.sql
      Tamanho: 2.3M | Data: Nov 21 14:00
```

### 3. Restaurar um Backup

```bash
npm run db:restore backups/velostock_backup_20241122_150000.sql
```

⚠️ **ATENÇÃO**: Este comando substitui TODOS os dados atuais!

O script pede confirmação antes de prosseguir:
```
⚠️  ATENÇÃO: Este processo irá SUBSTITUIR todos os dados atuais!
📁 Backup a ser restaurado: backups/velostock_backup_20241122_150000.sql

Tem certeza que deseja continuar? (digite 'SIM' para confirmar):
```

Digite `SIM` (em maiúsculas) para confirmar.

## 🚀 Fluxo de Trabalho Completo

### Cenário 1: Fazer Backup Antes de Mudanças Importantes

```bash
# 1. Fazer backup antes de modificações importantes
npm run db:backup

# 2. Fazer suas modificações normalmente
# ... desenvolver, testar, etc ...

# 3. Se algo der errado, restaure o backup
npm run db:restore backups/velostock_backup_20241122_150000.sql
```

### Cenário 2: Versionar Backup no GitHub

```bash
# 1. Fazer backup
npm run db:backup

# 2. Adicionar ao Git
git add backups/velostock_backup_20241122_150000.sql

# 3. Fazer commit
git commit -m "Backup do banco de dados - 2024-11-22"

# 4. Enviar para o GitHub
git push origin main
```

Agora seu backup está seguro no GitHub! 🎉

### Cenário 3: Migrar para Outra Conta Replit

**Na conta ORIGEM (onde estão os dados):**

```bash
# 1. Fazer backup
npm run db:backup

# 2. Versionar no Git (opcional mas recomendado)
git add backups/velostock_backup_20241122_150000.sql
git commit -m "Backup para migração"
git push origin main
```

**Na conta DESTINO (nova instalação):**

```bash
# 1. Clonar o repositório do GitHub
git clone https://github.com/seu-usuario/velostock.git

# 2. Instalar dependências
npm install

# 3. Configurar o banco de dados
npm run db:push

# 4. Restaurar o backup
npm run db:restore backups/velostock_backup_20241122_150000.sql
```

Pronto! Todos os usuários, carros e observações estarão na nova conta! ✅

## 🔒 Segurança e Boas Práticas

### ✅ FAÇA

1. **Faça backups regularmente**
   ```bash
   # Exemplo: backup semanal
   npm run db:backup
   ```

2. **Versione backups importantes no Git**
   - Backups antes de grandes mudanças
   - Backups de produção (se aplicável)

3. **Teste a restauração ocasionalmente**
   - Crie uma conta Replit de teste
   - Restaure um backup para verificar que funciona

4. **Mantenha múltiplos backups**
   - Não delete backups antigos imediatamente
   - Mantenha pelo menos os últimos 5 backups

### ❌ NÃO FAÇA

1. **Não versione backups gigantes no Git**
   - Se o backup for > 50MB, considere usar outra solução
   - GitHub tem limite de 100MB por arquivo

2. **Não compartilhe backups publicamente**
   - Backups contêm senhas e dados sensíveis
   - Mantenha o repositório privado se versionar backups

## 🔧 Solução de Problemas

### Erro: "DATABASE_URL não está definida"

**Causa**: A variável de ambiente do banco de dados não está configurada.

**Solução**:
1. Verifique se o banco de dados Replit está criado
2. A variável `DATABASE_URL` é automaticamente configurada pelo Replit

### Erro: "psql: command not found" ou "pg_dump: command not found"

**Causa**: As ferramentas do PostgreSQL não estão instaladas.

**Solução**:
```bash
# Instalar postgresql via packager
# Use a interface do Replit para adicionar o pacote 'postgresql'
```

### O backup está muito grande

**Sintomas**: Arquivo de backup > 100MB

**Soluções**:
1. **Comprimir o backup**:
   ```bash
   gzip backups/velostock_backup_20241122_150000.sql
   ```
   Isso criará `velostock_backup_20241122_150000.sql.gz` (muito menor)

2. **Usar serviços de armazenamento**:
   - Google Drive
   - Dropbox
   - AWS S3

## 📊 Estrutura dos Arquivos de Backup

O arquivo de backup é um arquivo SQL contendo:

```sql
-- 1. Remoção de tabelas existentes
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS cars CASCADE;
-- ...

-- 2. Criação das tabelas
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    -- ...
);

-- 3. Inserção de todos os dados
INSERT INTO users VALUES (1, 'usuario@email.com', ...);
INSERT INTO cars VALUES (1, 'Toyota', 'Corolla', ...);
-- ...
```

Este formato garante que TODOS os dados sejam preservados perfeitamente.

## 💡 Dicas Avançadas

### Backup Automático

Crie um backup automático antes de cada deploy:

```json
{
  "scripts": {
    "predeploy": "npm run db:backup",
    "deploy": "git push origin main"
  }
}
```

### Backup com Timestamp no Nome

Os backups já incluem timestamp automaticamente:
- `velostock_backup_20241122_150530.sql`
- Formato: `YYYYMMDD_HHMMSS`

### Ver Conteúdo do Backup

```bash
# Ver as primeiras 50 linhas
head -n 50 backups/velostock_backup_20241122_150000.sql

# Buscar por usuários específicos
grep "INSERT INTO users" backups/velostock_backup_20241122_150000.sql
```

## 🆘 Suporte

Se tiver problemas:

1. Verifique os logs detalhados durante backup/restore
2. Confirme que `DATABASE_URL` está configurada
3. Verifique se tem espaço em disco suficiente
4. Teste com um backup pequeno primeiro

## 📝 Notas Importantes

- ✅ Os backups preservam **TUDO**: estrutura + dados
- ✅ Senhas são preservadas (já hasheadas)
- ✅ Funciona entre diferentes contas Replit
- ✅ Funciona entre ambientes (dev → prod, prod → dev)
- ⚠️ Backups grandes podem demorar alguns minutos
- ⚠️ A restauração SUBSTITUI todos os dados atuais

---

**Criado para VeloStock** - Sistema de Gestão de Revenda de Veículos
