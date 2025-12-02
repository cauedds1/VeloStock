import type { Express } from "express";
import { db } from "../db";
import { companies, users, subscriptions, payments, vehicles } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function registerAdminRoutes(app: Express) {
  // ============================================
  // DASHBOARD - ESTATÍSTICAS GERAIS
  // ============================================
  app.get("/api/admin/dashboard", async (req: any, res) => {
    try {
      // Verificar autenticação admin (por enquanto qualquer um com adminToken)
      if (req.user?.role !== "proprietario" || req.user?.isAdmin !== true) {
        return res.status(403).json({ error: "Acesso negado" });
      }

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
  app.get("/api/admin/clientes", async (req: any, res) => {
    try {
      if (req.user?.role !== "proprietario" || req.user?.isAdmin !== true) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const status = (req.query.status as string) || "all";

      let query = db
        .select({
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
        })
        .from(companies)
        .leftJoin(subscriptions, eq(companies.id, subscriptions.companyId));

      if (status !== "all") {
        query = query.where(eq(subscriptions.status, status as any));
      }

      query = query.orderBy(desc(companies.createdAt));

      const clientes = await query;
      res.json(clientes);
    } catch (error) {
      console.error("Erro ao listar clientes:", error);
      res.status(500).json({ error: "Erro ao listar clientes" });
    }
  });

  // ============================================
  // CRIAR/ATUALIZAR SUBSCRIPTION DE CLIENTE
  // ============================================
  app.post("/api/admin/clientes/:companyId/subscription", async (req: any, res) => {
    try {
      if (req.user?.role !== "proprietario" || req.user?.isAdmin !== true) {
        return res.status(403).json({ error: "Acesso negado" });
      }

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
  app.get("/api/admin/clientes/:companyId/pagamentos", async (req: any, res) => {
    try {
      if (req.user?.role !== "proprietario" || req.user?.isAdmin !== true) {
        return res.status(403).json({ error: "Acesso negado" });
      }

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
  app.post("/api/admin/clientes/:companyId/pagamentos", async (req: any, res) => {
    try {
      if (req.user?.role !== "proprietario" || req.user?.isAdmin !== true) {
        return res.status(403).json({ error: "Acesso negado" });
      }

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
          subscriptionId: subscription[0].id,
          companyId,
          valor: Number(valor),
          status: status || "pendente",
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
  app.patch("/api/admin/clientes/:companyId/status", async (req: any, res) => {
    try {
      if (req.user?.role !== "proprietario" || req.user?.isAdmin !== true) {
        return res.status(403).json({ error: "Acesso negado" });
      }

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
  app.post("/api/admin/clientes/criar", async (req: any, res) => {
    try {
      if (req.user?.role !== "proprietario" || req.user?.isAdmin !== true) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const {
        nomeFantasia,
        razaoSocial,
        cnpj,
        email,
        telefone,
        primeiroNome,
        ultimoNome,
        plano,
        diasTestGratis,
      } = req.body;

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

      res.json({
        sucesso: true,
        empresaId: companyId,
        empresa: novaEmpresa[0],
      });
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
      res.status(500).json({ error: "Erro ao criar empresa" });
    }
  });

  // ============================================
  // BUSCAR ESTATÍSTICAS DE CLIENTE
  // ============================================
  app.get("/api/admin/clientes/:companyId/stats", async (req: any, res) => {
    try {
      if (req.user?.role !== "proprietario" || req.user?.isAdmin !== true) {
        return res.status(403).json({ error: "Acesso negado" });
      }

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
}
