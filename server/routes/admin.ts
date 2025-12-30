import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { companies, users, subscriptions, payments, vehicles, adminCredentials, bugReports, billsPayable } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

declare module 'express-session' {
  interface SessionData {
    adminId?: string;
    adminEmail?: string;
    isAdminSession?: boolean;
  }
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdminSession || !req.session?.adminId) {
    return res.status(401).json({ error: "Sessão admin inválida" });
  }
  next();
}

export async function registerAdminRoutes(app: Express) {
  // ============================================
  // AUTENTICAÇÃO ADMIN - SISTEMA SEPARADO
  // ============================================
  
  const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_TIME = 15 * 60 * 1000;

  // Login híbrido: aceita token OU email+senha
  app.post("/api/admin/login", async (req: any, res) => {
    try {
      const { email, password, token } = req.body;
      const clientIp = req.ip || req.connection.remoteAddress || "unknown";
      
      // Verificar rate limiting
      const attempts = loginAttempts.get(clientIp);
      if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        if (timeSinceLastAttempt < LOCKOUT_TIME) {
          const minutesLeft = Math.ceil((LOCKOUT_TIME - timeSinceLastAttempt) / 60000);
          return res.status(429).json({ 
            error: `Muitas tentativas. Tente novamente em ${minutesLeft} minutos.` 
          });
        } else {
          loginAttempts.delete(clientIp);
        }
      }

      let admin: any[] = [];

      // MÉTODO 1: Login por TOKEN
      if (token) {
        admin = await db
          .select()
          .from(adminCredentials)
          .where(eq(adminCredentials.token, token))
          .limit(1);

        if (admin.length === 0) {
          const current = loginAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
          loginAttempts.set(clientIp, { count: current.count + 1, lastAttempt: Date.now() });
          return res.status(401).json({ error: "Token inválido" });
        }
      }
      // MÉTODO 2: Login por EMAIL + SENHA
      else if (email && password) {
        admin = await db
          .select()
          .from(adminCredentials)
          .where(eq(adminCredentials.email, email))
          .limit(1);

        if (admin.length === 0) {
          const current = loginAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
          loginAttempts.set(clientIp, { count: current.count + 1, lastAttempt: Date.now() });
          return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const isValidPassword = await bcrypt.compare(password, admin[0].passwordHash);
        if (!isValidPassword) {
          const current = loginAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
          loginAttempts.set(clientIp, { count: current.count + 1, lastAttempt: Date.now() });
          return res.status(401).json({ error: "Credenciais inválidas" });
        }
      } else {
        return res.status(400).json({ error: "Informe token OU email e senha" });
      }

      if (admin[0].ativo !== "true") {
        return res.status(403).json({ error: "Conta admin desativada" });
      }

      loginAttempts.delete(clientIp);

      await db
        .update(adminCredentials)
        .set({ ultimoLogin: new Date() })
        .where(eq(adminCredentials.id, admin[0].id));

      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Erro ao regenerar sessão:", err);
          return res.status(500).json({ error: "Erro no login" });
        }
        
        req.session.adminId = admin[0].id;
        req.session.adminEmail = admin[0].email;
        req.session.isAdminSession = true;

        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Erro ao salvar sessão:", saveErr);
            return res.status(500).json({ error: "Erro no login" });
          }
          
          res.json({
            id: admin[0].id,
            email: admin[0].email,
            nome: admin[0].nome,
            isMaster: admin[0].isMaster === "true",
          });
        });
      });
    } catch (error) {
      console.error("Erro no login admin:", error);
      res.status(500).json({ error: "Erro no login" });
    }
  });

  app.post("/api/admin/logout", async (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Erro ao destruir sessão:", err);
        return res.status(500).json({ error: "Erro no logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/admin/me", async (req: any, res) => {
    if (!req.session?.isAdminSession || !req.session?.adminId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const admin = await db
      .select({
        id: adminCredentials.id,
        email: adminCredentials.email,
        nome: adminCredentials.nome,
        isMaster: adminCredentials.isMaster,
        token: adminCredentials.token,
      })
      .from(adminCredentials)
      .where(eq(adminCredentials.id, req.session.adminId))
      .limit(1);

    if (admin.length === 0) {
      return res.status(401).json({ error: "Admin não encontrado" });
    }

    res.json({
      ...admin[0],
      isMaster: admin[0].isMaster === "true",
    });
  });

  // Atualizar email do admin logado
  app.patch("/api/admin/update-email", requireAdminAuth, async (req: any, res) => {
    try {
      const { email } = req.body;
      const adminId = req.session.adminId;

      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Email inválido" });
      }

      // Verificar se o email já está em uso por outro admin
      const existingAdmin = await db
        .select()
        .from(adminCredentials)
        .where(eq(adminCredentials.email, email))
        .limit(1);

      if (existingAdmin.length > 0 && existingAdmin[0].id !== adminId) {
        return res.status(400).json({ error: "Este email já está em uso" });
      }

      await db
        .update(adminCredentials)
        .set({ email })
        .where(eq(adminCredentials.id, adminId));

      req.session.adminEmail = email;

      res.json({ success: true, email });
    } catch (error) {
      console.error("Erro ao atualizar email:", error);
      res.status(500).json({ error: "Erro ao atualizar email" });
    }
  });

  // Atualizar nome do admin logado
  app.patch("/api/admin/update-name", requireAdminAuth, async (req: any, res) => {
    try {
      const { nome } = req.body;
      const adminId = req.session.adminId;

      if (!nome || nome.trim().length < 2) {
        return res.status(400).json({ error: "Nome inválido" });
      }

      await db
        .update(adminCredentials)
        .set({ nome: nome.trim() })
        .where(eq(adminCredentials.id, adminId));

      res.json({ success: true, nome: nome.trim() });
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      res.status(500).json({ error: "Erro ao atualizar nome" });
    }
  });

  // Atualizar senha do admin logado
  app.patch("/api/admin/update-password", requireAdminAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminId = req.session.adminId;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Preencha todos os campos" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres" });
      }

      // Buscar admin atual
      const admin = await db
        .select()
        .from(adminCredentials)
        .where(eq(adminCredentials.id, adminId))
        .limit(1);

      if (admin.length === 0) {
        return res.status(404).json({ error: "Admin não encontrado" });
      }

      // Verificar senha atual
      const isValidPassword = await bcrypt.compare(currentPassword, admin[0].passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await db
        .update(adminCredentials)
        .set({ passwordHash: hashedPassword })
        .where(eq(adminCredentials.id, adminId));

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao atualizar senha:", error);
      res.status(500).json({ error: "Erro ao atualizar senha" });
    }
  });

  // ============================================
  // GERENCIAMENTO DE USUÁRIOS ADMIN
  // ============================================

  // Listar todos os admins (apenas master pode ver)
  app.get("/api/admin/usuarios", requireAdminAuth, async (req: any, res) => {
    try {
      const currentAdmin = await db
        .select()
        .from(adminCredentials)
        .where(eq(adminCredentials.id, req.session.adminId))
        .limit(1);

      if (currentAdmin.length === 0 || currentAdmin[0].isMaster !== "true") {
        return res.status(403).json({ error: "Apenas o admin master pode ver usuários" });
      }

      const admins = await db
        .select({
          id: adminCredentials.id,
          email: adminCredentials.email,
          nome: adminCredentials.nome,
          token: adminCredentials.token,
          isMaster: adminCredentials.isMaster,
          ativo: adminCredentials.ativo,
          ultimoLogin: adminCredentials.ultimoLogin,
          createdAt: adminCredentials.createdAt,
        })
        .from(adminCredentials)
        .orderBy(desc(adminCredentials.createdAt));

      res.json(admins.map(a => ({
        ...a,
        isMaster: a.isMaster === "true",
        ativo: a.ativo === "true",
      })));
    } catch (error) {
      console.error("Erro ao listar admins:", error);
      res.status(500).json({ error: "Erro ao listar usuários admin" });
    }
  });

  // Criar novo usuário admin (apenas master pode criar)
  app.post("/api/admin/usuarios", requireAdminAuth, async (req: any, res) => {
    try {
      const currentAdmin = await db
        .select()
        .from(adminCredentials)
        .where(eq(adminCredentials.id, req.session.adminId))
        .limit(1);

      if (currentAdmin.length === 0 || currentAdmin[0].isMaster !== "true") {
        return res.status(403).json({ error: "Apenas o admin master pode criar usuários" });
      }

      const { email, password, nome } = req.body;

      if (!email || !password || !nome) {
        return res.status(400).json({ error: "Email, senha e nome são obrigatórios" });
      }

      // Verificar se email já existe
      const existingAdmin = await db
        .select()
        .from(adminCredentials)
        .where(eq(adminCredentials.email, email))
        .limit(1);

      if (existingAdmin.length > 0) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      // Gerar token único
      const crypto = await import("crypto");
      const newToken = crypto.randomBytes(32).toString("hex");

      const passwordHash = await bcrypt.hash(password, 10);

      const newAdmin = await db
        .insert(adminCredentials)
        .values({
          email,
          passwordHash,
          nome,
          token: newToken,
          isMaster: "false",
          ativo: "true",
        })
        .returning();

      console.log(`[ADMIN] Novo usuário admin criado: ${email}`);

      res.json({
        id: newAdmin[0].id,
        email: newAdmin[0].email,
        nome: newAdmin[0].nome,
        token: newAdmin[0].token,
        isMaster: false,
        ativo: true,
      });
    } catch (error) {
      console.error("Erro ao criar admin:", error);
      res.status(500).json({ error: "Erro ao criar usuário admin" });
    }
  });

  // Desativar/Ativar usuário admin
  app.patch("/api/admin/usuarios/:adminId/status", requireAdminAuth, async (req: any, res) => {
    try {
      const currentAdmin = await db
        .select()
        .from(adminCredentials)
        .where(eq(adminCredentials.id, req.session.adminId))
        .limit(1);

      if (currentAdmin.length === 0 || currentAdmin[0].isMaster !== "true") {
        return res.status(403).json({ error: "Apenas o admin master pode alterar status" });
      }

      const { adminId } = req.params;
      const { ativo } = req.body;

      // Não pode desativar a si mesmo
      if (adminId === req.session.adminId) {
        return res.status(400).json({ error: "Você não pode desativar sua própria conta" });
      }

      const updated = await db
        .update(adminCredentials)
        .set({ 
          ativo: ativo ? "true" : "false",
          updatedAt: new Date(),
        })
        .where(eq(adminCredentials.id, adminId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json({
        id: updated[0].id,
        ativo: updated[0].ativo === "true",
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      res.status(500).json({ error: "Erro ao atualizar status" });
    }
  });

  // Regenerar token de usuário admin
  app.post("/api/admin/usuarios/:adminId/regenerar-token", requireAdminAuth, async (req: any, res) => {
    try {
      const currentAdmin = await db
        .select()
        .from(adminCredentials)
        .where(eq(adminCredentials.id, req.session.adminId))
        .limit(1);

      if (currentAdmin.length === 0 || currentAdmin[0].isMaster !== "true") {
        return res.status(403).json({ error: "Apenas o admin master pode regenerar tokens" });
      }

      const { adminId } = req.params;

      const crypto = await import("crypto");
      const newToken = crypto.randomBytes(32).toString("hex");

      const updated = await db
        .update(adminCredentials)
        .set({ 
          token: newToken,
          updatedAt: new Date(),
        })
        .where(eq(adminCredentials.id, adminId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json({
        id: updated[0].id,
        token: updated[0].token,
      });
    } catch (error) {
      console.error("Erro ao regenerar token:", error);
      res.status(500).json({ error: "Erro ao regenerar token" });
    }
  });

  // Regenerar token do PRÓPRIO admin logado
  app.post("/api/admin/me/regenerar-token", requireAdminAuth, async (req: any, res) => {
    try {
      const adminId = req.session.adminId;
      const crypto = await import("crypto");
      const newToken = crypto.randomBytes(32).toString("hex");

      const updated = await db
        .update(adminCredentials)
        .set({ 
          token: newToken,
          updatedAt: new Date(),
        })
        .where(eq(adminCredentials.id, adminId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Admin não encontrado" });
      }

      res.json({
        id: updated[0].id,
        token: updated[0].token,
      });
    } catch (error) {
      console.error("Erro ao regenerar token próprio:", error);
      res.status(500).json({ error: "Erro ao regenerar token" });
    }
  });

  const setupAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const MAX_SETUP_ATTEMPTS = 3;
  const SETUP_LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutos

  app.post("/api/admin/setup", async (req: any, res) => {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || "unknown";
      
      // Rate limiting para setup
      const attempts = setupAttempts.get(clientIp);
      if (attempts && attempts.count >= MAX_SETUP_ATTEMPTS) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        if (timeSinceLastAttempt < SETUP_LOCKOUT_TIME) {
          console.warn(`[SECURITY] Setup bloqueado por rate limit - IP: ${clientIp}`);
          return res.status(429).json({ error: "Muitas tentativas. Tente mais tarde." });
        } else {
          setupAttempts.delete(clientIp);
        }
      }

      const existingAdmins = await db.select().from(adminCredentials).limit(1);
      
      if (existingAdmins.length > 0) {
        return res.status(400).json({ error: "Admin já configurado. Use login." });
      }

      // Validar token secreto
      const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN;
      if (!SETUP_TOKEN) {
        console.error("[SECURITY] ADMIN_SETUP_TOKEN não configurado no ambiente");
        return res.status(503).json({ error: "Setup não disponível. Configure o token no servidor." });
      }

      const providedToken = req.headers["x-admin-setup-token"] || req.body.setupToken;
      
      if (!providedToken || providedToken !== SETUP_TOKEN) {
        const current = setupAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
        setupAttempts.set(clientIp, { count: current.count + 1, lastAttempt: Date.now() });
        console.warn(`[SECURITY] Tentativa de setup com token inválido - IP: ${clientIp}, Tentativas: ${current.count + 1}`);
        return res.status(403).json({ error: "Token de configuração inválido" });
      }

      const { email, password, nome } = req.body;
      
      if (!email || !password || !nome) {
        return res.status(400).json({ error: "Email, senha e nome são obrigatórios" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const crypto = await import("crypto");
      const setupToken = crypto.randomBytes(32).toString("hex");

      const newAdmin = await db
        .insert(adminCredentials)
        .values({
          email,
          passwordHash,
          nome,
          token: setupToken,
          ativo: "true",
        })
        .returning();

      setupAttempts.delete(clientIp);
      console.log(`[ADMIN] Primeiro admin criado: ${email}`);

      res.json({
        message: "Admin criado com sucesso",
        admin: {
          id: newAdmin[0].id,
          email: newAdmin[0].email,
          nome: newAdmin[0].nome,
        },
      });
    } catch (error) {
      console.error("Erro ao criar admin:", error);
      res.status(500).json({ error: "Erro ao criar admin" });
    }
  });

  app.get("/api/admin/needs-setup", async (req: any, res) => {
    const existingAdmins = await db.select().from(adminCredentials).limit(1);
    const needsSetup = existingAdmins.length === 0;
    const setupTokenConfigured = !!process.env.ADMIN_SETUP_TOKEN;
    res.json({ needsSetup, setupTokenConfigured });
  });

  const tokenValidationAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const MAX_TOKEN_ATTEMPTS = 3;
  const TOKEN_LOCKOUT_TIME = 30 * 60 * 1000;

  app.post("/api/admin/validate-token", async (req: any, res) => {
    const clientIp = req.ip || req.connection.remoteAddress || "unknown";
    const { token } = req.body;

    const attempts = tokenValidationAttempts.get(clientIp);
    if (attempts && attempts.count >= MAX_TOKEN_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      if (timeSinceLastAttempt < TOKEN_LOCKOUT_TIME) {
        const minutesLeft = Math.ceil((TOKEN_LOCKOUT_TIME - timeSinceLastAttempt) / 60000);
        console.warn(`[SECURITY] Token validation bloqueado - IP: ${clientIp}`);
        return res.status(429).json({ error: `Muitas tentativas. Tente em ${minutesLeft} minutos.` });
      } else {
        tokenValidationAttempts.delete(clientIp);
      }
    }

    const SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN;
    if (!SETUP_TOKEN) {
      return res.status(503).json({ error: "Token não configurado no servidor" });
    }

    if (!token || token !== SETUP_TOKEN) {
      const current = tokenValidationAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
      tokenValidationAttempts.set(clientIp, { count: current.count + 1, lastAttempt: Date.now() });
      console.warn(`[SECURITY] Token inválido - IP: ${clientIp}, Tentativas: ${current.count + 1}`);
      return res.status(403).json({ error: "Token inválido" });
    }

    tokenValidationAttempts.delete(clientIp);
    res.json({ valid: true });
  });

  // ============================================
  // DASHBOARD - ESTATÍSTICAS GERAIS
  // ============================================
  app.get("/api/admin/dashboard", requireAdminAuth, async (req: any, res) => {
    try {

      const totalCompanies = await db
        .select({ count: sql`count(*)` })
        .from(companies);

      const activeSubscriptions = await db
        .select({ count: sql`count(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "ativo"));

      const testSubscriptions = await db
        .select({ count: sql`count(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "teste_gratis"));

      const totalVehicles = await db
        .select({ count: sql`count(*)` })
        .from(vehicles);

      const totalUsers = await db
        .select({ count: sql`count(*)` })
        .from(users);

      const pendingPayments = await db
        .select({ count: sql`count(*)`, total: sql`sum(${payments.valor})` })
        .from(payments)
        .where(eq(payments.status, "pendente"));

      res.json({
        totalClientes: totalCompanies[0]?.count || 0,
        clientesAtivos: activeSubscriptions[0]?.count || 0,
        clientesTeste: testSubscriptions[0]?.count || 0,
        totalVeiculos: totalVehicles[0]?.count || 0,
        totalUsuarios: totalUsers[0]?.count || 0,
        pagamentosPendentes: pendingPayments[0]?.count || 0,
        valorPendente: pendingPayments[0]?.total || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar dashboard:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // ============================================
  // LISTAR CLIENTES (EMPRESAS)
  // ============================================
  app.get("/api/admin/clientes", requireAdminAuth, async (req: any, res) => {
    try {
      const status = (req.query.status as string) || "all";

      const selectFields = {
        empresaId: companies.id,
        nomeFantasia: companies.nomeFantasia,
        cnpj: companies.cnpj,
        telefone: companies.telefone,
        email: companies.email,
        subscriptionStatus: subscriptions.status,
        plano: subscriptions.plano,
        dataInicio: subscriptions.dataInicio,
        dataProximoPagamento: subscriptions.dataProximoPagamento,
        valorMensal: subscriptions.valorMensalR$,
      };

      let clientes;
      if (status !== "all") {
        clientes = await db
          .select(selectFields)
          .from(companies)
          .leftJoin(subscriptions, eq(companies.id, subscriptions.companyId))
          .where(eq(subscriptions.status, status as "ativo" | "teste_gratis" | "suspenso" | "cancelado"))
          .orderBy(desc(companies.createdAt));
      } else {
        clientes = await db
          .select(selectFields)
          .from(companies)
          .leftJoin(subscriptions, eq(companies.id, subscriptions.companyId))
          .orderBy(desc(companies.createdAt));
      }
      res.json(clientes);
    } catch (error) {
      console.error("Erro ao listar clientes:", error);
      res.status(500).json({ error: "Erro ao listar clientes" });
    }
  });

  // ============================================
  // CRIAR/ATUALIZAR SUBSCRIPTION DE CLIENTE
  // ============================================
  app.post("/api/admin/clientes/:companyId/subscription", requireAdminAuth, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const { status, plano, valorMensal, diasTestGratis, observacoes } = req.body;

      const existing = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.companyId, companyId))
        .limit(1);

      if (existing.length > 0) {
        const updated = await db
          .update(subscriptions)
          .set({
            status: status || existing[0].status,
            plano: plano || existing[0].plano,
            valorMensalR$: valorMensal || existing[0].valorMensalR$,
            observacoes: observacoes || existing[0].observacoes,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.companyId, companyId))
          .returning();

        return res.json(updated[0]);
      }

      const created = await db
        .insert(subscriptions)
        .values({
          companyId,
          status: status || "ativo",
          plano: plano || "basico",
          valorMensalR$: valorMensal,
          diasTestGratis: diasTestGratis || 14,
          observacoes,
        })
        .returning();

      res.json(created[0]);
    } catch (error) {
      console.error("Erro ao atualizar subscription:", error);
      res.status(500).json({ error: "Erro ao atualizar subscription" });
    }
  });

  // ============================================
  // LISTAR PAGAMENTOS DE CLIENTE
  // ============================================
  app.get("/api/admin/clientes/:companyId/pagamentos", requireAdminAuth, async (req: any, res) => {
    try {
      const { companyId } = req.params;

      const pagamentos = await db
        .select()
        .from(payments)
        .where(eq(payments.companyId, companyId))
        .orderBy(desc(payments.dataVencimento));

      res.json(pagamentos);
    } catch (error) {
      console.error("Erro ao listar pagamentos:", error);
      res.status(500).json({ error: "Erro ao listar pagamentos" });
    }
  });

  // ============================================
  // REGISTRAR PAGAMENTO
  // ============================================
  app.post("/api/admin/clientes/:companyId/pagamentos", requireAdminAuth, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const { valor, status, dataPagamento, dataVencimento, metodo, descricao } = req.body;

      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.companyId, companyId))
        .limit(1);

      if (subscription.length === 0) {
        return res.status(404).json({ error: "Subscription não encontrada" });
      }

      const created = await db
        .insert(payments)
        .values({
          subscriptionId: subscription[0].id as string,
          companyId,
          valor: String(valor),
          status: (status || "pendente") as any,
          dataPagamento: dataPagamento ? new Date(dataPagamento) : undefined,
          dataVencimento: new Date(dataVencimento),
          metodo,
          descricao,
        })
        .returning();

      res.json(created[0]);
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      res.status(500).json({ error: "Erro ao registrar pagamento" });
    }
  });

  // ============================================
  // BLOQUEAR/DESBLOQUEAR CLIENTE
  // ============================================
  app.patch("/api/admin/clientes/:companyId/status", requireAdminAuth, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const { status } = req.body;

      if (!["ativo", "teste_gratis", "suspenso", "cancelado"].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const updated = await db
        .update(subscriptions)
        .set({
          status: status as any,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.companyId, companyId))
        .returning();

      res.json(updated[0]);
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      res.status(500).json({ error: "Erro ao atualizar status" });
    }
  });

  // ============================================
  // CRIAR NOVA EMPRESA E CONTA PROPRIETÁRIO
  // ============================================
  app.post("/api/admin/clientes/criar", requireAdminAuth, async (req: any, res) => {
    try {
      const {
        nomeFantasia,
        razaoSocial,
        cnpj,
        email,
        telefone,
        senhaTemporaria,
        plano,
        diasTestGratis,
      } = req.body;

      // Validar senha temporária
      if (!senhaTemporaria || senhaTemporaria.length < 6) {
        return res.status(400).json({ error: "Senha temporária deve ter no mínimo 6 caracteres" });
      }

      // Verificar se já existe empresa com esse email
      const empresaExistente = await db
        .select()
        .from(companies)
        .where(eq(companies.email, email))
        .limit(1);

      if (empresaExistente.length > 0) {
        return res.status(400).json({ error: "Já existe uma empresa com esse email" });
      }

      // Verificar se já existe usuário com esse email
      const usuarioExistente = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (usuarioExistente.length > 0) {
        return res.status(400).json({ error: "Já existe um usuário com esse email" });
      }

      // Criar empresa
      const novaEmpresa = await db
        .insert(companies)
        .values({
          nomeFantasia,
          razaoSocial,
          cnpj,
          email,
          telefone,
        })
        .returning();

      const companyId = novaEmpresa[0].id;

      // Criar subscription
      await db.insert(subscriptions).values({
        companyId,
        plano: plano || "basico",
        status: "teste_gratis",
        diasTestGratis: diasTestGratis || 14,
      });

      // Criar usuário proprietário com senha temporária
      const passwordHash = await bcrypt.hash(senhaTemporaria, 10);
      
      await db.insert(users).values({
        empresaId: companyId,
        email,
        firstName: nomeFantasia, // Usa nome fantasia como primeiro nome
        lastName: "",
        passwordHash,
        role: "proprietario",
        isActive: "true",
        emailVerified: "true", // Já verificado pelo admin
        authProvider: "local",
      });

      res.json({
        sucesso: true,
        empresaId: companyId,
        empresa: novaEmpresa[0],
        mensagem: `Empresa criada com sucesso! O usuário ${email} pode fazer login com a senha temporária fornecida.`,
      });
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
      res.status(500).json({ error: "Erro ao criar empresa" });
    }
  });

  // ============================================
  // BUSCAR ESTATÍSTICAS DE CLIENTE
  // ============================================
  app.get("/api/admin/clientes/:companyId/stats", requireAdminAuth, async (req: any, res) => {
    try {
      const { companyId } = req.params;

      const totalVeiculos = await db
        .select({ count: sql`count(*)` })
        .from(vehicles)
        .where(eq(vehicles.empresaId, companyId));

      const totalUsuarios = await db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(eq(users.empresaId, companyId));

      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.companyId, companyId))
        .limit(1);

      const totalPagamentos = await db
        .select({ count: sql`count(*)`, total: sql`sum(${payments.valor})` })
        .from(payments)
        .where(eq(payments.companyId, companyId));

      res.json({
        totalVeiculos: totalVeiculos[0]?.count || 0,
        totalUsuarios: totalUsuarios[0]?.count || 0,
        subscription: subscription[0] || null,
        totalPagamentos: totalPagamentos[0]?.count || 0,
        valorTotalPago: totalPagamentos[0]?.total || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // ============================================
  // LISTAR USUÁRIOS DE UMA EMPRESA
  // ============================================
  app.get("/api/admin/clientes/:companyId/usuarios", requireAdminAuth, async (req: any, res) => {
    try {
      const { companyId } = req.params;

      const usuariosEmpresa = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.empresaId, companyId))
        .orderBy(desc(users.createdAt));

      res.json(usuariosEmpresa.map(u => ({
        ...u,
        isActive: u.isActive === "true",
      })));
    } catch (error) {
      console.error("Erro ao listar usuários da empresa:", error);
      res.status(500).json({ error: "Erro ao listar usuários" });
    }
  });

  // ============================================
  // ALTERAR EMAIL DE USUÁRIO (ADMIN)
  // ============================================
  app.patch("/api/admin/usuarios/:userId/email", requireAdminAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { novoEmail } = req.body;

      if (!novoEmail || !novoEmail.includes("@")) {
        return res.status(400).json({ error: "Email inválido" });
      }

      // Verificar se o email já está em uso por outro usuário
      const emailExistente = await db
        .select()
        .from(users)
        .where(eq(users.email, novoEmail))
        .limit(1);

      if (emailExistente.length > 0 && emailExistente[0].id !== userId) {
        return res.status(400).json({ error: "Este email já está em uso por outro usuário" });
      }

      // Buscar usuário atual
      const usuarioAtual = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (usuarioAtual.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const emailAntigo = usuarioAtual[0].email;

      // Atualizar email
      const updated = await db
        .update(users)
        .set({ 
          email: novoEmail,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      console.log(`[ADMIN] Email alterado: ${emailAntigo} -> ${novoEmail} (userId: ${userId})`);

      res.json({
        id: updated[0].id,
        email: updated[0].email,
        emailAntigo,
        mensagem: "Email alterado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao alterar email:", error);
      res.status(500).json({ error: "Erro ao alterar email do usuário" });
    }
  });

  // ============================================
  // LISTAR TODOS OS PAGAMENTOS
  // ============================================
  app.get("/api/admin/pagamentos", requireAdminAuth, async (req: any, res) => {
    try {
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 50;

      const selectFields = {
        id: payments.id,
        companyId: payments.companyId,
        nomeEmpresa: companies.nomeFantasia,
        valor: payments.valor,
        status: payments.status,
        dataVencimento: payments.dataVencimento,
        dataPagamento: payments.dataPagamento,
        metodo: payments.metodo,
        descricao: payments.descricao,
        createdAt: payments.createdAt,
      };

      if (status && status !== "all") {
        const pagamentos = await db
          .select(selectFields)
          .from(payments)
          .leftJoin(companies, eq(payments.companyId, companies.id))
          .where(eq(payments.status, status as "pendente" | "pago" | "atrasado" | "cancelado"))
          .orderBy(desc(payments.createdAt))
          .limit(limit);
        return res.json(pagamentos);
      }

      const pagamentos = await db
        .select(selectFields)
        .from(payments)
        .leftJoin(companies, eq(payments.companyId, companies.id))
        .orderBy(desc(payments.createdAt))
        .limit(limit);

      res.json(pagamentos);
    } catch (error) {
      console.error("Erro ao listar pagamentos:", error);
      res.status(500).json({ error: "Erro ao listar pagamentos" });
    }
  });

  // ============================================
  // CRIAR PAGAMENTO MANUAL
  // ============================================
  app.post("/api/admin/pagamentos", requireAdminAuth, async (req: any, res) => {
    try {
      const { companyId, valor, dataVencimento, descricao, metodo } = req.body;

      if (!companyId || !valor || !dataVencimento) {
        return res.status(400).json({ error: "Empresa, valor e data de vencimento são obrigatórios" });
      }

      const empresa = await db.select().from(subscriptions).where(eq(subscriptions.companyId, companyId)).limit(1);
      const subscriptionId = empresa[0]?.id || companyId;

      const descricaoFinal = descricao || `Cobrança VeloStock - ${new Date().toLocaleDateString('pt-BR')}`;

      const novoPagamento = await db
        .insert(payments)
        .values({
          subscriptionId,
          companyId,
          valor: String(valor),
          status: "pendente",
          dataVencimento: new Date(dataVencimento),
          descricao: descricaoFinal,
          metodo: metodo || null,
        })
        .returning();

      // Criar conta a pagar automaticamente no painel do cliente
      await db.insert(billsPayable).values({
        empresaId: companyId,
        tipo: "a_pagar",
        descricao: descricaoFinal,
        categoria: descricao && descricao.trim() ? descricao : "Cobrança VeloStock",
        valor: String(valor),
        dataVencimento: new Date(dataVencimento),
        status: "pendente",
        observacoes: `Cobrança gerada automaticamente pelo sistema VeloStock. ID do pagamento: ${novoPagamento[0].id}`,
        criadoPor: "admin_system",
      });

      console.log(`[ADMIN] Pagamento criado para empresa ${companyId}: R$ ${valor} - Conta a pagar também criada`);

      res.json(novoPagamento[0]);
    } catch (error) {
      console.error("Erro ao criar pagamento:", error);
      res.status(500).json({ error: "Erro ao criar pagamento" });
    }
  });

  // ============================================
  // ATUALIZAR STATUS DO PAGAMENTO
  // ============================================
  app.patch("/api/admin/pagamentos/:paymentId", requireAdminAuth, async (req: any, res) => {
    try {
      const { paymentId } = req.params;
      const { status, dataPagamento, metodo, descricao } = req.body;

      const updates: any = { updatedAt: new Date() };
      if (status) updates.status = status;
      if (dataPagamento) updates.dataPagamento = new Date(dataPagamento);
      if (metodo) updates.metodo = metodo;
      if (descricao !== undefined) updates.descricao = descricao;

      const atualizado = await db
        .update(payments)
        .set(updates)
        .where(eq(payments.id, paymentId))
        .returning();

      if (atualizado.length === 0) {
        return res.status(404).json({ error: "Pagamento não encontrado" });
      }

      res.json(atualizado[0]);
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      res.status(500).json({ error: "Erro ao atualizar pagamento" });
    }
  });

  // ============================================
  // ESTATÍSTICAS FINANCEIRAS
  // ============================================
  app.get("/api/admin/financeiro/stats", requireAdminAuth, async (req: any, res) => {
    try {
      const totalRecebido = await db
        .select({ total: sql`COALESCE(sum(CAST(${payments.valor} AS DECIMAL)), 0)` })
        .from(payments)
        .where(eq(payments.status, "pago"));

      const totalPendente = await db
        .select({ total: sql`COALESCE(sum(CAST(${payments.valor} AS DECIMAL)), 0)` })
        .from(payments)
        .where(eq(payments.status, "pendente"));

      const totalAtrasado = await db
        .select({ total: sql`COALESCE(sum(CAST(${payments.valor} AS DECIMAL)), 0)` })
        .from(payments)
        .where(eq(payments.status, "atrasado"));

      const receitaMesAtual = await db
        .select({ total: sql`COALESCE(sum(CAST(${payments.valor} AS DECIMAL)), 0)` })
        .from(payments)
        .where(
          and(
            eq(payments.status, "pago"),
            sql`EXTRACT(MONTH FROM ${payments.dataPagamento}) = EXTRACT(MONTH FROM CURRENT_DATE)`,
            sql`EXTRACT(YEAR FROM ${payments.dataPagamento}) = EXTRACT(YEAR FROM CURRENT_DATE)`
          )
        );

      const countPagos = await db
        .select({ count: sql`count(*)` })
        .from(payments)
        .where(eq(payments.status, "pago"));

      const countPendentes = await db
        .select({ count: sql`count(*)` })
        .from(payments)
        .where(eq(payments.status, "pendente"));

      const countAtrasados = await db
        .select({ count: sql`count(*)` })
        .from(payments)
        .where(eq(payments.status, "atrasado"));

      res.json({
        totalRecebido: Number(totalRecebido[0]?.total) || 0,
        totalPendente: Number(totalPendente[0]?.total) || 0,
        totalAtrasado: Number(totalAtrasado[0]?.total) || 0,
        receitaMesAtual: Number(receitaMesAtual[0]?.total) || 0,
        countPagos: Number(countPagos[0]?.count) || 0,
        countPendentes: Number(countPendentes[0]?.count) || 0,
        countAtrasados: Number(countAtrasados[0]?.count) || 0,
      });
    } catch (error) {
      console.error("Erro ao buscar stats financeiras:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas financeiras" });
    }
  });

  // ============================================
  // DETALHES DE UMA EMPRESA
  // ============================================
  app.get("/api/admin/clientes/:companyId", requireAdminAuth, async (req: any, res) => {
    try {
      const { companyId } = req.params;

      const empresa = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (empresa.length === 0) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      const subscription = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.companyId, companyId))
        .limit(1);

      const usuarios = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.empresaId, companyId));

      const veiculosCount = await db
        .select({ count: sql`count(*)` })
        .from(vehicles)
        .where(eq(vehicles.empresaId, companyId));

      const pagamentosRecentes = await db
        .select()
        .from(payments)
        .where(eq(payments.companyId, companyId))
        .orderBy(desc(payments.createdAt))
        .limit(10);

      res.json({
        empresa: empresa[0],
        subscription: subscription[0] || null,
        usuarios,
        totalVeiculos: Number(veiculosCount[0]?.count) || 0,
        pagamentosRecentes,
      });
    } catch (error) {
      console.error("Erro ao buscar empresa:", error);
      res.status(500).json({ error: "Erro ao buscar empresa" });
    }
  });

  // ============================================
  // ATUALIZAR EMPRESA
  // ============================================
  app.patch("/api/admin/clientes/:companyId", requireAdminAuth, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const { nomeFantasia, razaoSocial, cnpj, email, telefone, endereco, cidade, estado, cep, logoUrl, corPrimaria, corSecundaria } = req.body;

      const updates: any = { updatedAt: new Date() };
      if (nomeFantasia) updates.nomeFantasia = nomeFantasia;
      if (razaoSocial) updates.razaoSocial = razaoSocial;
      if (cnpj) updates.cnpj = cnpj;
      if (email) updates.email = email;
      if (telefone) updates.telefone = telefone;
      if (endereco) updates.endereco = endereco;
      if (cidade) updates.cidade = cidade;
      if (estado) updates.estado = estado;
      if (cep) updates.cep = cep;
      if (logoUrl) updates.logoUrl = logoUrl;
      if (corPrimaria) updates.corPrimaria = corPrimaria;
      if (corSecundaria) updates.corSecundaria = corSecundaria;

      const atualizado = await db
        .update(companies)
        .set(updates)
        .where(eq(companies.id, companyId))
        .returning();

      if (atualizado.length === 0) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }

      res.json(atualizado[0]);
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      res.status(500).json({ error: "Erro ao atualizar empresa" });
    }
  });

  // ============================================
  // BUG REPORTS - ENDPOINTS PARA ADMIN
  // ============================================
  
  // Listar todos os bug reports
  app.get("/api/admin/bug-reports", requireAdminAuth, async (req: any, res) => {
    try {
      const reports = await db
        .select()
        .from(bugReports)
        .orderBy(desc(bugReports.createdAt));
      
      res.json(reports);
    } catch (error) {
      console.error("Erro ao buscar bug reports:", error);
      res.status(500).json({ error: "Erro ao buscar relatórios de bugs" });
    }
  });

  // Atualizar status do bug report
  app.patch("/api/admin/bug-reports/:id/status", requireAdminAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status é obrigatório" });
      }

      const updated = await db
        .update(bugReports)
        .set({ status })
        .where(eq(bugReports.id, id))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Bug report não encontrado" });
      }

      res.json(updated[0]);
    } catch (error) {
      console.error("Erro ao atualizar status do bug report:", error);
      res.status(500).json({ error: "Erro ao atualizar status" });
    }
  });
}
