import { Router } from "express";
import { db } from "../db";
import { leads, followUps, activityLog, vehicles, users } from "@shared/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { requireCompanyUser, assertSameCompany } from "../middleware/dataIsolation";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// Todas as rotas exigem autenticação e empresa
router.use(requireCompanyUser);

// Apenas proprietário, gerente e vendedor podem acessar leads (SEM motorista)
router.use(requireRole(["proprietario", "gerente", "vendedor"]));

// ============================================
// LEADS - CRUD
// ============================================

// Listar leads
router.get("/", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    
    // Vendedor: vê apenas leads onde é responsável OU criou
    // Gerente/Proprietário: vê todos da empresa
    let query = db
      .select({
        id: leads.id,
        nome: leads.nome,
        telefone: leads.telefone,
        email: leads.email,
        status: leads.status,
        veiculoInteresse: leads.veiculoInteresse,
        veiculoInteresseNome: leads.veiculoInteresseNome,
        origem: leads.origem,
        observacoes: leads.observacoes,
        vendedorResponsavel: leads.vendedorResponsavel,
        vendedorNome: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        proximoFollowup: leads.proximoFollowup,
        valorProposta: leads.valorProposta,
        motivoPerdido: leads.motivoPerdido,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .leftJoin(users, eq(leads.vendedorResponsavel, users.id))
      .orderBy(desc(leads.createdAt));
    
    if (role === "vendedor") {
      // Filtrar apenas leads do próprio vendedor
      query = query.where(
        and(
          eq(leads.empresaId, empresaId),
          or(
            eq(leads.vendedorResponsavel, userId),
            eq(leads.criadoPor, userId)
          )
        )
      ) as any;
    } else {
      // Gerente/Proprietário vê todos
      query = query.where(eq(leads.empresaId, empresaId)) as any;
    }
    
    const result = await query;
    res.json(result);
  } catch (error) {
    console.error("Erro ao listar leads:", error);
    res.status(500).json({ error: "Erro ao listar leads" });
  }
});

// Criar lead
router.post("/", async (req: any, res) => {
  try {
    const { userId, empresaId } = req.companyUser;
    const leadData = req.body;
    
    // SECURITY: Validar vendedorResponsavel pertence à mesma empresa (se fornecido)
    const vendedorResponsavel = leadData.vendedorResponsavel || userId;
    
    if (leadData.vendedorResponsavel) {
      const [vendedor] = await db.select().from(users).where(
        and(
          eq(users.id, leadData.vendedorResponsavel),
          eq(users.empresaId, empresaId)
        )
      );
      
      if (!vendedor) {
        return res.status(400).json({ error: "Vendedor inválido ou não pertence à mesma empresa" });
      }
    }
    
    // Se fornecido veiculoInteresse, buscar nome legível do veículo
    let veiculoInteresseNome = null;
    if (leadData.veiculoInteresse) {
      const [vehicle] = await db.select().from(vehicles).where(
        and(
          eq(vehicles.id, leadData.veiculoInteresse),
          eq(vehicles.empresaId, empresaId)
        )
      );
      
      if (vehicle) {
        veiculoInteresseNome = `${vehicle.brand} ${vehicle.model} ${vehicle.year} - ${vehicle.color}`;
      }
    }
    
    // Criar lead (sem spread para evitar injeção de campos sensíveis)
    const [newLead] = await db.insert(leads).values({
      nome: leadData.nome,
      telefone: leadData.telefone,
      email: leadData.email,
      origem: leadData.origem,
      status: leadData.status || "Novo",
      observacoes: leadData.observacoes,
      veiculoInteresse: leadData.veiculoInteresse,
      veiculoInteresseNome,
      empresaId,
      criadoPor: userId,
      vendedorResponsavel,
    }).returning();
    
    // Registrar no activity log
    await db.insert(activityLog).values({
      empresaId,
      userId,
      userName: `${req.companyUser.firstName} ${req.companyUser.lastName}`,
      activityType: "lead_created",
      entityType: "lead",
      entityId: newLead.id,
      description: `Criou lead: ${newLead.nome}`,
      metadata: JSON.stringify({ leadStatus: newLead.status }),
    });
    
    res.status(201).json(newLead);
  } catch (error) {
    console.error("Erro ao criar lead:", error);
    res.status(500).json({ error: "Erro ao criar lead" });
  }
});

// Atualizar lead
router.put("/:id", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    const { id } = req.params;
    const updates = req.body;
    
    // Buscar lead para validar permissão
    const [existingLead] = await db.select().from(leads).where(eq(leads.id, id));
    
    if (!existingLead) {
      return res.status(404).json({ error: "Lead não encontrado" });
    }
    
    assertSameCompany(existingLead.empresaId, empresaId);
    
    // Vendedor só pode atualizar leads que criou ou é responsável
    if (role === "vendedor") {
      if (existingLead.vendedorResponsavel !== userId && existingLead.criadoPor !== userId) {
        return res.status(403).json({ error: "Você não tem permissão para editar este lead" });
      }
      
      // Vendedor não pode transferir lead para outro vendedor
      if (updates.vendedorResponsavel && updates.vendedorResponsavel !== userId) {
        return res.status(403).json({ error: "Apenas gerentes podem transferir leads" });
      }
    }
    
    // SECURITY: Validar vendedorResponsavel pertence à mesma empresa
    if (updates.vendedorResponsavel) {
      const [vendedor] = await db.select().from(users).where(
        and(
          eq(users.id, updates.vendedorResponsavel),
          eq(users.empresaId, empresaId)
        )
      );
      
      if (!vendedor) {
        return res.status(400).json({ error: "Vendedor inválido ou não pertence à mesma empresa" });
      }
      
      // Se estiver transferindo lead para outro vendedor
      if (updates.vendedorResponsavel !== existingLead.vendedorResponsavel) {
        const newVendedor = vendedor;
        
        // Transferir follow-ups pendentes para o novo vendedor
        await db.update(followUps)
          .set({ assignedTo: updates.vendedorResponsavel })
          .where(and(
            eq(followUps.leadId, id),
            eq(followUps.status, "Pendente")
          ));
        
        // Registrar transferência no log
        await db.insert(activityLog).values({
          empresaId,
          userId,
          userName: `${req.companyUser.firstName} ${req.companyUser.lastName}`,
          activityType: "lead_updated",
          entityType: "lead",
          entityId: id,
          description: `Transferiu lead "${existingLead.nome}" para ${newVendedor.firstName} ${newVendedor.lastName}`,
        });
      }
    }
    
    // SECURITY: WHITELIST de campos permitidos (NÃO usar spread direto do cliente)
    const safeUpdates: any = {
      updatedAt: new Date(),
    };
    
    // Campos permitidos para atualização
    const allowedFields = ['nome', 'telefone', 'email', 'origem', 'status', 'observacoes', 'vendedorResponsavel', 'veiculoInteresse'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    });
    
    // Se atualizou veiculoInteresse, buscar nome legível do veículo
    if (updates.veiculoInteresse !== undefined) {
      if (updates.veiculoInteresse) {
        const [vehicle] = await db.select().from(vehicles).where(
          and(
            eq(vehicles.id, updates.veiculoInteresse),
            eq(vehicles.empresaId, empresaId)
          )
        );
        
        if (vehicle) {
          safeUpdates.veiculoInteresseNome = `${vehicle.brand} ${vehicle.model} ${vehicle.year} - ${vehicle.color}`;
        }
      } else {
        safeUpdates.veiculoInteresseNome = null;
      }
    }
    
    // Atualizar lead
    const [updated] = await db.update(leads)
      .set(safeUpdates)
      .where(eq(leads.id, id))
      .returning();
    
    // Registrar atualização no log
    await db.insert(activityLog).values({
      empresaId,
      userId,
      userName: `${req.companyUser.firstName} ${req.companyUser.lastName}`,
      activityType: "lead_updated",
      entityType: "lead",
      entityId: id,
      description: `Atualizou lead: ${updated.nome}`,
      metadata: JSON.stringify({ oldStatus: existingLead.status, newStatus: updated.status }),
    });
    
    res.json(updated);
  } catch (error: any) {
    if (error.message?.includes("FORBIDDEN")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Erro ao atualizar lead:", error);
    res.status(500).json({ error: "Erro ao atualizar lead" });
  }
});

// Deletar lead
router.delete("/:id", async (req: any, res) => {
  try {
    const { userId, empresaId, role } = req.companyUser;
    const { id } = req.params;
    
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    
    if (!lead) {
      return res.status(404).json({ error: "Lead não encontrado" });
    }
    
    assertSameCompany(lead.empresaId, empresaId);
    
    // Apenas Gerente/Proprietário ou o criador pode deletar
    if (role !== "gerente" && role !== "proprietario" && lead.criadoPor !== userId) {
      return res.status(403).json({ error: "Apenas gerentes ou o criador podem deletar leads" });
    }
    
    await db.delete(leads).where(eq(leads.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    if (error.message?.includes("FORBIDDEN")) {
      return res.status(403).json({ error: error.message });
    }
    console.error("Erro ao deletar lead:", error);
    res.status(500).json({ error: "Erro ao deletar lead" });
  }
});

// ============================================
// ESTATÍSTICAS DE LEADS (Por vendedor)
// ============================================

router.get("/stats/me", async (req: any, res) => {
  try {
    const { userId, empresaId } = req.companyUser;
    
    const stats = await db
      .select({
        status: leads.status,
        count: sql<number>`count(*)::int`,
      })
      .from(leads)
      .where(and(
        eq(leads.empresaId, empresaId),
        or(
          eq(leads.vendedorResponsavel, userId),
          eq(leads.criadoPor, userId)
        )
      ))
      .groupBy(leads.status);
    
    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const convertidos = stats.find(s => s.status === "Convertido")?.count || 0;
    const taxaConversao = total > 0 ? ((convertidos / total) * 100).toFixed(1) : "0.0";
    
    res.json({
      porStatus: stats,
      total,
      convertidos,
      taxaConversao: parseFloat(taxaConversao),
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas de leads:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

export default router;
