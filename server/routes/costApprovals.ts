import { Router } from "express";
import { db } from "../db";
import { costApprovals, approvalSettings, vehicleCosts, activityLog, users } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireCompanyUser, assertSameCompany } from "../middleware/dataIsolation";

const router = Router();

router.use(requireCompanyUser);

// ============================================
// CONFIGURAÇÕES DE APROVAÇÃO
// ============================================

// Buscar configurações
router.get("/settings", async (req: any, res) => {
  try {
    const { empresaId, role } = req.companyUser;
    
    // Apenas Proprietário/Gerente pode ver configurações
    if (role !== "proprietario" && role !== "gerente") {
      return res.status(403).json({ error: "Apenas gerentes podem acessar configurações de aprovação" });
    }
    
    const [settings] = await db
      .select()
      .from(approvalSettings)
      .where(eq(approvalSettings.empresaId, empresaId));
    
    // Se não existir, retornar valores padrão
    if (!settings) {
      return res.json({
        limiteAprovacaoAutomatica: "500.00",
        exigirAprovacaoGerente: "true",
        notificarProprietario: "true",
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error("Erro ao buscar configurações de aprovação:", error);
    res.status(500).json({ error: "Erro ao buscar configurações" });
  }
});

// Atualizar configurações
router.put("/settings", async (req: any, res) => {
  try {
    const { empresaId, role, userId } = req.companyUser;
    
    // Apenas Proprietário pode alterar configurações
    if (role !== "proprietario") {
      return res.status(403).json({ error: "Apenas proprietários podem alterar configurações de aprovação" });
    }
    
    const { limiteAprovacaoAutomatica, exigirAprovacaoGerente, notificarProprietario } = req.body;
    
    const [existing] = await db
      .select()
      .from(approvalSettings)
      .where(eq(approvalSettings.empresaId, empresaId));
    
    let result;
    if (existing) {
      [result] = await db.update(approvalSettings)
        .set({
          limiteAprovacaoAutomatica,
          exigirAprovacaoGerente,
          notificarProprietario,
          updatedAt: new Date(),
        })
        .where(eq(approvalSettings.empresaId, empresaId))
        .returning();
    } else {
      [result] = await db.insert(approvalSettings)
        .values({
          empresaId,
          limiteAprovacaoAutomatica,
          exigirAprovacaoGerente,
          notificarProprietario,
        })
        .returning();
    }
    
    // Registrar no log
    await db.insert(activityLog).values({
      empresaId,
      userId,
      userName: `${req.companyUser.firstName} ${req.companyUser.lastName}`,
      activityType: "settings_updated",
      entityType: "approval_settings",
      entityId: result.id,
      description: `Atualizou configurações de aprovação de custos`,
    });
    
    res.json(result);
  } catch (error) {
    console.error("Erro ao atualizar configurações de aprovação:", error);
    res.status(500).json({ error: "Erro ao atualizar configurações" });
  }
});

// ============================================
// APROVAÇÕES - CRUD
// ============================================

// Listar aprovações pendentes
router.get("/", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    const { status } = req.query;
    
    let query = db
      .select({
        id: costApprovals.id,
        costId: costApprovals.costId,
        solicitadoPor: costApprovals.solicitadoPor,
        solicitanteNome: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        valor: costApprovals.valor,
        status: costApprovals.status,
        aprovadoPor: costApprovals.aprovadoPor,
        aprovadoEm: costApprovals.aprovadoEm,
        motivoRejeicao: costApprovals.motivoRejeicao,
        createdAt: costApprovals.createdAt,
      })
      .from(costApprovals)
      .leftJoin(users, eq(costApprovals.solicitadoPor, users.id))
      .orderBy(desc(costApprovals.createdAt));
    
    // Vendedor: vê apenas suas próprias solicitações
    // Gerente/Proprietário: vê todas
    if (role === "vendedor" || role === "motorista") {
      query = query.where(
        and(
          eq(costApprovals.empresaId, empresaId),
          eq(costApprovals.solicitadoPor, userId),
          status ? eq(costApprovals.status, status as any) : undefined
        )
      ) as any;
    } else {
      query = query.where(
        and(
          eq(costApprovals.empresaId, empresaId),
          status ? eq(costApprovals.status, status as any) : undefined
        )
      ) as any;
    }
    
    const approvals = await query;
    res.json(approvals);
  } catch (error) {
    console.error("Erro ao listar aprovações:", error);
    res.status(500).json({ error: "Erro ao listar aprovações" });
  }
});

// Criar solicitação de aprovação
router.post("/", async (req: any, res) => {
  try {
    const { userId, empresaId } = req.companyUser;
    const { costId, valor } = req.body;
    
    // CRITICAL: Validar que o custo pertence à mesma empresa
    if (costId) {
      const [cost] = await db.select().from(vehicleCosts).where(
        and(
          eq(vehicleCosts.id, costId),
          eq(vehicleCosts.empresaId, empresaId)
        )
      );
      
      if (!cost) {
        return res.status(400).json({ error: "Custo inválido ou não pertence à mesma empresa" });
      }
    }
    
    const [newApproval] = await db.insert(costApprovals).values({
      empresaId,
      costId,
      solicitadoPor: userId,
      valor,
      status: "Pendente",
    }).returning();
    
    // Registrar no log
    await db.insert(activityLog).values({
      empresaId,
      userId,
      userName: `${req.companyUser.firstName} ${req.companyUser.lastName}`,
      activityType: "cost_added",
      entityType: "cost_approval",
      entityId: newApproval.id,
      description: `Solicitou aprovação de custo de R$ ${valor}`,
    });
    
    res.status(201).json(newApproval);
  } catch (error) {
    console.error("Erro ao criar solicitação de aprovação:", error);
    res.status(500).json({ error: "Erro ao criar solicitação" });
  }
});

// Aprovar/Rejeitar
router.put("/:id/review", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    const { id } = req.params;
    const { status, motivoRejeicao } = req.body;
    
    // Apenas Gerente/Proprietário pode aprovar/rejeitar
    if (role !== "gerente" && role !== "proprietario") {
      return res.status(403).json({ error: "Apenas gerentes podem aprovar custos" });
    }
    
    const [existing] = await db.select().from(costApprovals).where(eq(costApprovals.id, id));
    
    if (!existing) {
      return res.status(404).json({ error: "Aprovação não encontrada" });
    }
    
    assertSameCompany(existing.empresaId, empresaId);
    
    if (existing.status !== "Pendente") {
      return res.status(400).json({ error: "Esta aprovação já foi processada" });
    }
    
    const [updated] = await db.update(costApprovals)
      .set({
        status,
        aprovadoPor: userId,
        aprovadoEm: new Date(),
        motivoRejeicao: status === "Rejeitado" ? motivoRejeicao : null,
        updatedAt: new Date(),
      })
      .where(eq(costApprovals.id, id))
      .returning();
    
    // Registrar no log
    await db.insert(activityLog).values({
      empresaId,
      userId,
      userName: `${req.companyUser.firstName} ${req.companyUser.lastName}`,
      activityType: status === "Aprovado" ? "cost_approved" : "cost_rejected",
      entityType: "cost_approval",
      entityId: id,
      description: `${status === "Aprovado" ? "Aprovou" : "Rejeitou"} custo de R$ ${existing.valor}`,
      metadata: motivoRejeicao ? JSON.stringify({ motivo: motivoRejeicao }) : undefined,
    });
    
    res.json(updated);
  } catch (error: any) {
    if (error.message?.includes("FORBIDDEN")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Erro ao processar aprovação:", error);
    res.status(500).json({ error: "Erro ao processar aprovação" });
  }
});

// Estatísticas de aprovações
router.get("/stats", async (req: any, res) => {
  try {
    const { empresaId, role } = req.companyUser;
    
    // Apenas Gerente/Proprietário
    if (role !== "gerente" && role !== "proprietario") {
      return res.status(403).json({ error: "Acesso negado" });
    }
    
    const stats = await db
      .select({
        status: costApprovals.status,
        count: sql<number>`count(*)::int`,
        total: sql<string>`COALESCE(SUM(${costApprovals.valor}), 0)`,
      })
      .from(costApprovals)
      .where(eq(costApprovals.empresaId, empresaId))
      .groupBy(costApprovals.status);
    
    res.json(stats);
  } catch (error) {
    console.error("Erro ao buscar estatísticas de aprovações:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

export default router;
