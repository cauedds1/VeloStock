import { Router } from "express";
import { db } from "../db";
import { followUps, activityLog, leads, vehicles, users } from "@shared/schema";
import { eq, and, or, desc, lte, sql } from "drizzle-orm";
import { requireCompanyUser, assertSameCompany } from "../middleware/dataIsolation";

const router = Router();

router.use(requireCompanyUser);

// ============================================
// FOLLOW-UPS - CRUD
// ============================================

// Listar follow-ups
router.get("/", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    const { status } = req.query;
    
    let query = db
      .select({
        id: followUps.id,
        leadId: followUps.leadId,
        leadNome: leads.nome,
        vehicleId: followUps.vehicleId,
        vehicleNome: sql<string>`${vehicles.brand} || ' ' || ${vehicles.model}`,
        assignedTo: followUps.assignedTo,
        assignedToNome: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        titulo: followUps.titulo,
        descricao: followUps.descricao,
        dataAgendada: followUps.dataAgendada,
        status: followUps.status,
        concluidoEm: followUps.concluidoEm,
        resultado: followUps.resultado,
        createdAt: followUps.createdAt,
      })
      .from(followUps)
      .leftJoin(leads, eq(followUps.leadId, leads.id))
      .leftJoin(vehicles, eq(followUps.vehicleId, vehicles.id))
      .leftJoin(users, eq(followUps.assignedTo, users.id))
      .orderBy(followUps.dataAgendada);
    
    // Vendedor: vê apenas follow-ups atribuídos a ele
    // Gerente/Proprietário: vê todos da empresa
    if (role === "vendedor" || role === "motorista") {
      query = query.where(
        and(
          eq(followUps.empresaId, empresaId),
          eq(followUps.assignedTo, userId),
          status ? eq(followUps.status, status as any) : undefined
        )
      ) as any;
    } else {
      query = query.where(
        and(
          eq(followUps.empresaId, empresaId),
          status ? eq(followUps.status, status as any) : undefined
        )
      ) as any;
    }
    
    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("Erro ao listar follow-ups:", error);
    res.status(500).json({ error: "Erro ao listar follow-ups" });
  }
});

// Follow-ups de hoje (para dashboard)
router.get("/today", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let query = db
      .select({
        id: followUps.id,
        leadNome: leads.nome,
        vehicleNome: sql<string>`${vehicles.brand} || ' ' || ${vehicles.model}`,
        titulo: followUps.titulo,
        dataAgendada: followUps.dataAgendada,
        status: followUps.status,
      })
      .from(followUps)
      .leftJoin(leads, eq(followUps.leadId, leads.id))
      .leftJoin(vehicles, eq(followUps.vehicleId, vehicles.id))
      .orderBy(followUps.dataAgendada);
    
    if (role === "vendedor" || role === "motorista") {
      query = query.where(
        and(
          eq(followUps.empresaId, empresaId),
          eq(followUps.assignedTo, userId),
          eq(followUps.status, "Pendente"),
          lte(followUps.dataAgendada, today)
        )
      ) as any;
    } else {
      query = query.where(
        and(
          eq(followUps.empresaId, empresaId),
          eq(followUps.status, "Pendente"),
          lte(followUps.dataAgendada, today)
        )
      ) as any;
    }
    
    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("Erro ao buscar follow-ups de hoje:", error);
    res.status(500).json({ error: "Erro ao buscar follow-ups" });
  }
});

// Criar follow-up
router.post("/", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    const followUpData = req.body;
    
    // SECURITY: Validar assignedTo pertence à empresa
    if (followUpData.assignedTo) {
      const [assignee] = await db.select().from(users).where(
        and(
          eq(users.id, followUpData.assignedTo),
          eq(users.empresaId, empresaId)
        )
      );
      
      if (!assignee) {
        return res.status(400).json({ error: "Usuário atribuído inválido ou não pertence à mesma empresa" });
      }
    }
    
    // SECURITY: Validar leadId pertence à mesma empresa (se fornecido)
    if (followUpData.leadId) {
      const [lead] = await db.select().from(leads).where(
        and(
          eq(leads.id, followUpData.leadId),
          eq(leads.empresaId, empresaId)
        )
      );
      
      if (!lead) {
        return res.status(400).json({ error: "Lead inválido ou não pertence à mesma empresa" });
      }
    }
    
    // SECURITY: Validar vehicleId pertence à mesma empresa (se fornecido)
    if (followUpData.vehicleId) {
      const [vehicle] = await db.select().from(vehicles).where(
        and(
          eq(vehicles.id, followUpData.vehicleId),
          eq(vehicles.empresaId, empresaId)
        )
      );
      
      if (!vehicle) {
        return res.status(400).json({ error: "Veículo inválido ou não pertence à mesma empresa" });
      }
    }
    
    // Gerente/Proprietário pode criar para qualquer vendedor
    // Vendedor só pode criar para si mesmo
    const assignedTo = (role === "gerente" || role === "proprietario") 
      ? (followUpData.assignedTo || userId)
      : userId;
    
    // SECURITY: Criar follow-up com whitelist explícita (NÃO usar spread)
    const [newFollowUp] = await db.insert(followUps).values({
      titulo: followUpData.titulo,
      descricao: followUpData.descricao,
      status: followUpData.status || "Pendente",
      dataAgendada: followUpData.dataAgendada,
      leadId: followUpData.leadId,
      vehicleId: followUpData.vehicleId,
      observacoes: followUpData.observacoes,
      empresaId,
      assignedTo,
      criadoPor: userId,
    }).returning();
    
    // Registrar no activity log
    await db.insert(activityLog).values({
      empresaId,
      userId,
      userName: `${req.companyUser.firstName} ${req.companyUser.lastName}`,
      activityType: "lead_updated",
      entityType: "followup",
      entityId: newFollowUp.id,
      description: `Criou follow-up: ${newFollowUp.titulo}`,
    });
    
    res.status(201).json(newFollowUp);
  } catch (error) {
    console.error("Erro ao criar follow-up:", error);
    res.status(500).json({ error: "Erro ao criar follow-up" });
  }
});

// Atualizar follow-up
router.put("/:id", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    const { id } = req.params;
    const updates = req.body;
    
    const [existing] = await db.select().from(followUps).where(eq(followUps.id, id));
    
    if (!existing) {
      return res.status(404).json({ error: "Follow-up não encontrado" });
    }
    
    assertSameCompany(existing.empresaId, empresaId);
    
    // Vendedor só pode atualizar follow-ups atribuídos a ele
    if (role === "vendedor" || role === "motorista") {
      if (existing.assignedTo !== userId) {
        return res.status(403).json({ error: "Você só pode atualizar seus próprios follow-ups" });
      }
    }
    
    // SECURITY: Validar leadId e vehicleId pertencem à mesma empresa (se fornecidos)
    if (updates.leadId) {
      const [lead] = await db.select().from(leads).where(
        and(
          eq(leads.id, updates.leadId),
          eq(leads.empresaId, empresaId)
        )
      );
      
      if (!lead) {
        return res.status(400).json({ error: "Lead inválido ou não pertence à mesma empresa" });
      }
    }
    
    if (updates.vehicleId) {
      const [vehicle] = await db.select().from(vehicles).where(
        and(
          eq(vehicles.id, updates.vehicleId),
          eq(vehicles.empresaId, empresaId)
        )
      );
      
      if (!vehicle) {
        return res.status(400).json({ error: "Veículo inválido ou não pertence à mesma empresa" });
      }
    }
    
    // SECURITY: WHITELIST de campos permitidos (NÃO usar spread direto do cliente)
    const safeUpdates: any = {
      updatedAt: new Date(),
    };
    
    // Campos permitidos para atualização
    const allowedFields = ['titulo', 'descricao', 'status', 'dataAgendada', 'leadId', 'vehicleId', 'observacoes'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    });
    
    // Se está marcando como concluído, adicionar timestamp
    if (safeUpdates.status === "Concluído" && existing.status !== "Concluído") {
      safeUpdates.concluidoEm = new Date();
    }
    
    const [updated] = await db.update(followUps)
      .set(safeUpdates)
      .where(eq(followUps.id, id))
      .returning();
    
    res.json(updated);
  } catch (error: any) {
    if (error.message?.includes("FORBIDDEN")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Erro ao atualizar follow-up:", error);
    res.status(500).json({ error: "Erro ao atualizar follow-up" });
  }
});

// Deletar follow-up
router.delete("/:id", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    const { id } = req.params;
    
    const [followUp] = await db.select().from(followUps).where(eq(followUps.id, id));
    
    if (!followUp) {
      return res.status(404).json({ error: "Follow-up não encontrado" });
    }
    
    assertSameCompany(followUp.empresaId, empresaId);
    
    // Vendedor só pode deletar seus próprios follow-ups
    if (role === "vendedor" || role === "motorista") {
      if (followUp.assignedTo !== userId && followUp.criadoPor !== userId) {
        return res.status(403).json({ error: "Você só pode deletar seus próprios follow-ups" });
      }
    }
    
    await db.delete(followUps).where(eq(followUps.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes("FORBIDDEN")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Erro ao deletar follow-up:", error);
    res.status(500).json({ error: "Erro ao deletar follow-up" });
  }
});

export default router;
