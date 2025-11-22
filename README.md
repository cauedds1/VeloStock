# 🚗 VeloStock - Sistema de Gestão para Revenda de Veículos

Sistema completo de gestão para revendas de veículos com backup automático e migração de dados.

---

## 🎯 Começando

### Desenvolvimento
```bash
npm install
npm run dev
```

### Produção
```bash
npm run build
npm start
```

---

## 🔥 Backup de PRODUÇÃO - A Funcionalidade Mais Importante!

### ⚠️ IMPORTANTE: Backup de Desenvolvimento vs Produção

Existem **DOIS** bancos de dados:
- **Desenvolvimento**: Dados de teste (quando você está programando)
- **Produção**: Dados REAIS que o dono da revenda usa (deployment)

**Você precisa fazer backup de PRODUÇÃO!** 🔥

## 📦 Backup Automático

### 🎯 Backup COMPLETO - DEV + PRODUÇÃO (RECOMENDADO) 

**Para salvar TUDO de uma vez (desenvolvimento + produção):**

#### 1. Configure DATABASE_URL_PRODUCTION (uma vez):
1. Deployments > Clique no deployment ativo > Environment variables
2. Copie a `DATABASE_URL`
3. Vá em Secrets (cadeado) > New Secret
4. Nome: `DATABASE_URL_PRODUCTION`, Valor: (cole a URL)

#### 2. Faça push com backup COMPLETO:
```bash
npm run push-full
```

**Isso faz backup de:**
- ✅ Banco de DESENVOLVIMENTO (seus testes)
- ✅ Banco de PRODUÇÃO (dados reais do dono da revenda)

**Tudo no GitHub!** 🎉

### Opções Alternativas

```bash
npm run push-prod    # Só backup de PRODUÇÃO
npm run push         # Só backup de DESENVOLVIMENTO
```

**O que acontece automaticamente:**
1. ✅ Cria backup completo do banco de dados
2. ✅ Adiciona o backup ao Git  
3. ✅ Faz commit do backup
4. ✅ Envia TUDO pro GitHub

### Por Que Isso é Importante?

**Cenário Real:**
- O dono da revenda em Manaus tem 200 carros cadastrados
- Tem 15 usuários (vendedores, gerentes, etc.)
- Tem histórico completo de vendas
- Precisa migrar o sistema para outra plataforma

**Com este sistema:**
```bash
# Na plataforma atual (onde estão os dados)
npm run push

# Na nova plataforma (Replit, AWS, servidor próprio, etc.)
git clone https://github.com/usuario/velostock.git
npm install
npm run db:push
npm run db:restore backups/velostock_backup_XXXXXXXX.sql
```

**Resultado:** TODOS os 200 carros, TODOS os 15 usuários, TODAS as vendas estarão na nova plataforma! As senhas continuam as mesmas! 🎉

---

## 📚 Documentação

- **[GUIA_RAPIDO_BACKUP.md](GUIA_RAPIDO_BACKUP.md)** - Guia visual rápido ⭐ **COMECE AQUI**
- **[README_PUSH_AUTOMATICO.md](README_PUSH_AUTOMATICO.md)** - Como usar o push automático
- **[README_BACKUP.md](README_BACKUP.md)** - Instruções detalhadas de backup manual
- **[replit.md](replit.md)** - Documentação técnica completa do projeto

---

## 🚀 Comandos Principais

### Desenvolvimento
```bash
npm run dev              # Iniciar servidor de desenvolvimento
npm run build            # Fazer build para produção
npm run start            # Iniciar em produção
```

### Banco de Dados
```bash
npm run db:push          # Sincronizar schema com o banco
npm run db:backup        # Criar backup manual
npm run db:restore       # Restaurar backup
npm run db:list-backups  # Listar backups disponíveis
```

### Git com Backup Automático
```bash
npm run push             # Push com backup automático (RECOMENDADO)
```

---

## ✅ O Que é Preservado nos Backups

| Dados | Status |
|-------|--------|
| 👤 Usuários e senhas (criptografadas) | ✅ 100% |
| 🚗 Carros e todas as informações | ✅ 100% |
| 📸 Fotos dos veículos | ✅ 100% |
| 📝 Observações e anotações | ✅ 100% |
| 💰 Vendas e comissões | ✅ 100% |
| 📊 Histórico completo | ✅ 100% |
| ⚙️ Configurações da empresa | ✅ 100% |
| 🏢 Dados multi-tenant | ✅ 100% |

**LITERALMENTE TUDO!** Nenhum dado é perdido.

---

## 🔐 Segurança

- ✅ Senhas criptografadas com bcrypt
- ✅ Autenticação por sessão
- ✅ Backups versionados no Git (repositório privado recomendado)
- ✅ Multi-tenant com isolamento completo de dados
- ✅ RBAC (controle de acesso baseado em funções)

---

## 💡 Casos de Uso do Backup

### 1. Migração de Plataforma
Mover o sistema de Replit para AWS, Vercel ou servidor próprio mantendo TODOS os dados.

### 2. Backup de Segurança
Criar backups regulares antes de grandes mudanças no sistema.

### 3. Ambiente de Teste
Clonar o ambiente de produção para testes sem afetar os dados reais.

### 4. Recuperação de Desastres
Restaurar o sistema completo em caso de problemas.

---

## 🏗️ Tecnologias

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn/UI
- **Backend**: Node.js, Express, PostgreSQL, Drizzle ORM
- **Autenticação**: Passport.js, bcrypt
- **Deploy**: Replit (autoscale)
- **Backup**: PostgreSQL pg_dump/pg_restore

---

## 📞 Suporte

Para dúvidas sobre backup e migração, consulte:
1. [GUIA_RAPIDO_BACKUP.md](GUIA_RAPIDO_BACKUP.md) - Guia visual
2. [README_BACKUP.md](README_BACKUP.md) - Documentação completa

---

## 🎉 Início Rápido

```bash
# 1. Clonar o projeto
git clone https://github.com/seu-usuario/velostock.git

# 2. Instalar dependências
npm install

# 3. Configurar banco de dados
npm run db:push

# 4. Se tiver backup, restaurar dados
npm run db:restore backups/velostock_backup_XXXXXXXX.sql

# 5. Iniciar desenvolvimento
npm run dev
```

**Pronto para usar!** 🚀

---

**VeloStock** - Gestão Completa para Revenda de Veículos com Backup Inteligente
