import { Router } from "express";
import { db } from "../db";
import { billsPayable, users, activityLog } from "@shared/schema";
import { eq, and, desc, gte, lte, or, sql } from "drizzle-orm";
import { getUserWithCompany } from "../utils/getUserWithCompany";

const router = Router();

// ============================================
// CONTAS A PAGAR E A RECEBER - CRUD
// ============================================

// Listar todas as contas
router.get("/", async (req: any, res) => {
  try {
    const { empresaId } = getUserWithCompany(req);
    const { tipo, status, mes, ano } = req.query;
    
    let query = db
      .select({
        id: billsPayable.id,
        tipo: billsPayable.tipo,
        descricao: billsPayable.descricao,
        categoria: billsPayable.categoria,
        valor: billsPayable.valor,
        dataVencimento: billsPayable.dataVencimento,
        dataPagamento: billsPayable.dataPagamento,
        status: billsPayable.status,
        observacoes: billsPayable.observacoes,
        recorrente: billsPayable.recorrente,
        parcelado: billsPayable.parcelado,
        numeroParcela: billsPayable.numeroParcela,
        totalParcelas: billsPayable.totalParcelas,
        grupoParcelamento: billsPayable.grupoParcelamento,
        vehicleId: billsPayable.vehicleId,
        criadoPor: billsPayable.criadoPor,
        criadoPorNome: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        createdAt: billsPayable.createdAt,
        updatedAt: billsPayable.updatedAt,
      })
      .from(billsPayable)
      .leftJoin(users, eq(billsPayable.criadoPor, users.id))
      .where(eq(billsPayable.empresaId, empresaId))
      .$dynamic();
    
    // Filtro por tipo
    if (tipo) {
      query = query.where(eq(billsPayable.tipo, tipo as any));
    }
    
    // Filtro por status
    if (status) {
      query = query.where(eq(billsPayable.status, status as any));
    }
    
    // Filtro por mês/ano
    if (mes && ano) {
      const mesNum = parseInt(mes as string);
      const anoNum = parseInt(ano as string);
      const startDate = new Date(anoNum, mesNum - 1, 1);
      const endDate = new Date(anoNum, mesNum, 0, 23, 59, 59);
      
      query = query.where(
        and(
          gte(billsPayable.dataVencimento, startDate),
          lte(billsPayable.dataVencimento, endDate)
        )
      );
    }
    
    const bills = await query.orderBy(desc(billsPayable.dataVencimento));
    res.json(bills);
  } catch (error) {
    console.error("Erro ao listar contas:", error);
    res.status(500).json({ error: "Erro ao listar contas" });
  }
});

// Dashboard de resumo
router.get("/dashboard", async (req: any, res) => {
  try {
    const { empresaId } = getUserWithCompany(req);
    
    // Total a pagar (pendente)
    const totalAPagarResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(${billsPayable.valor}), 0)`,
        quantidade: sql<number>`COUNT(*)::int`,
      })
      .from(billsPayable)
      .where(
        and(
          eq(billsPayable.empresaId, empresaId),
          eq(billsPayable.tipo, "a_pagar"),
          or(
            eq(billsPayable.status, "pendente"),
            eq(billsPayable.status, "vencido"),
            eq(billsPayable.status, "parcial")
          )
        )
      );
    
    // Total a receber (pendente)
    const totalAReceberResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(${billsPayable.valor}), 0)`,
        quantidade: sql<number>`COUNT(*)::int`,
      })
      .from(billsPayable)
      .where(
        and(
          eq(billsPayable.empresaId, empresaId),
          eq(billsPayable.tipo, "a_receber"),
          or(
            eq(billsPayable.status, "pendente"),
            eq(billsPayable.status, "vencido"),
            eq(billsPayable.status, "parcial")
          )
        )
      );
    
    // Contas vencidas (a pagar)
    const vencidasResult = await db
      .select({
        quantidade: sql<number>`COUNT(*)::int`,
        total: sql<string>`COALESCE(SUM(${billsPayable.valor}), 0)`,
      })
      .from(billsPayable)
      .where(
        and(
          eq(billsPayable.empresaId, empresaId),
          eq(billsPayable.tipo, "a_pagar"),
          eq(billsPayable.status, "vencido")
        )
      );
    
    // Próximos vencimentos (próximos 7 dias)
    const hoje = new Date();
    const proximos7dias = new Date();
    proximos7dias.setDate(hoje.getDate() + 7);
    
    const proximosVencimentosResult = await db
      .select({
        quantidade: sql<number>`COUNT(*)::int`,
        total: sql<string>`COALESCE(SUM(${billsPayable.valor}), 0)`,
      })
      .from(billsPayable)
      .where(
        and(
          eq(billsPayable.empresaId, empresaId),
          eq(billsPayable.tipo, "a_pagar"),
          eq(billsPayable.status, "pendente"),
          gte(billsPayable.dataVencimento, hoje),
          lte(billsPayable.dataVencimento, proximos7dias)
        )
      );
    
    // Totais pagos no mês atual
    const mesAtual = new Date();
    const inicioMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
    const fimMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0, 23, 59, 59);
    
    const pagosMesResult = await db
      .select({
        totalPago: sql<string>`COALESCE(SUM(CASE WHEN ${billsPayable.tipo} = 'a_pagar' THEN ${billsPayable.valor} ELSE 0 END), 0)`,
        totalRecebido: sql<string>`COALESCE(SUM(CASE WHEN ${billsPayable.tipo} = 'a_receber' THEN ${billsPayable.valor} ELSE 0 END), 0)`,
      })
      .from(billsPayable)
      .where(
        and(
          eq(billsPayable.empresaId, empresaId),
          eq(billsPayable.status, "pago"),
          gte(billsPayable.dataPagamento, inicioMes),
          lte(billsPayable.dataPagamento, fimMes)
        )
      );
    
    res.json({
      totalAPagar: {
        valor: totalAPagarResult[0]?.total || "0",
        quantidade: totalAPagarResult[0]?.quantidade || 0,
      },
      totalAReceber: {
        valor: totalAReceberResult[0]?.total || "0",
        quantidade: totalAReceberResult[0]?.quantidade || 0,
      },
      vencidas: {
        quantidade: vencidasResult[0]?.quantidade || 0,
        total: vencidasResult[0]?.total || "0",
      },
      proximosVencimentos: {
        quantidade: proximosVencimentosResult[0]?.quantidade || 0,
        total: proximosVencimentosResult[0]?.total || "0",
      },
      pagosMes: {
        totalPago: pagosMesResult[0]?.totalPago || "0",
        totalRecebido: pagosMesResult[0]?.totalRecebido || "0",
      },
      saldoPrevisto: (
        parseFloat(totalAReceberResult[0]?.total || "0") - 
        parseFloat(totalAPagarResult[0]?.total || "0")
      ).toFixed(2),
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard:", error);
    res.status(500).json({ error: "Erro ao buscar dashboard" });
  }
});

// Criar conta
router.post("/", async (req: any, res) => {
  try {
    const { empresaId, userId } = getUserWithCompany(req);
    const billData = req.body;
    
    const [newBill] = await db
      .insert(billsPayable)
      .values({
        empresaId,
        tipo: billData.tipo,
        descricao: billData.descricao,
        categoria: billData.categoria,
        valor: billData.valor,
        dataVencimento: new Date(billData.dataVencimento),
        status: "pendente",
        observacoes: billData.observacoes,
        recorrente: billData.recorrente || 0,
        parcelado: billData.parcelado || 0,
        numeroParcela: billData.numeroParcela,
        totalParcelas: billData.totalParcelas,
        grupoParcelamento: billData.grupoParcelamento,
        vehicleId: billData.vehicleId,
        criadoPor: userId,
      })
      .returning();
    
    // Activity log - removido temporariamente (precisa atualizar activityTypeEnum no schema)
    
    res.status(201).json(newBill);
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    res.status(500).json({ error: "Erro ao criar conta" });
  }
});

// Atualizar conta
router.put("/:id", async (req: any, res) => {
  try {
    const { empresaId } = getUserWithCompany(req);
    const { id } = req.params;
    const updates = req.body;
    
    // Se tiver dataVencimento, converter para Date
    if (updates.dataVencimento) {
      updates.dataVencimento = new Date(updates.dataVencimento);
    }
    
    const [updated] = await db
      .update(billsPayable)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(billsPayable.id, id),
          eq(billsPayable.empresaId, empresaId)
        )
      )
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar conta:", error);
    res.status(500).json({ error: "Erro ao atualizar conta" });
  }
});

// Marcar como pago/recebido
router.patch("/:id/pay", async (req: any, res) => {
  try {
    const { empresaId, userId } = getUserWithCompany(req);
    const { id } = req.params;
    const { dataPagamento } = req.body;
    
    const [updated] = await db
      .update(billsPayable)
      .set({
        status: "pago",
        dataPagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(billsPayable.id, id),
          eq(billsPayable.empresaId, empresaId)
        )
      )
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }
    
    // Activity log - removido temporariamente (precisa atualizar activityTypeEnum no schema)
    
    res.json(updated);
  } catch (error) {
    console.error("Erro ao marcar conta como paga:", error);
    res.status(500).json({ error: "Erro ao marcar conta como paga" });
  }
});

// Excluir conta
router.delete("/:id", async (req: any, res) => {
  try {
    const { empresaId } = getUserWithCompany(req);
    const { id } = req.params;
    
    const [deleted] = await db
      .delete(billsPayable)
      .where(
        and(
          eq(billsPayable.id, id),
          eq(billsPayable.empresaId, empresaId)
        )
      )
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }
    
    res.json({ message: "Conta excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir conta:", error);
    res.status(500).json({ error: "Erro ao excluir conta" });
  }
});

// Atualizar status de contas vencidas (para ser chamado periodicamente)
router.post("/update-overdue", async (req: any, res) => {
  try {
    const { empresaId } = getUserWithCompany(req);
    const hoje = new Date();
    
    await db
      .update(billsPayable)
      .set({ status: "vencido" })
      .where(
        and(
          eq(billsPayable.empresaId, empresaId),
          eq(billsPayable.status, "pendente"),
          lte(billsPayable.dataVencimento, hoje)
        )
      );
    
    res.json({ message: "Status atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar status de contas vencidas:", error);
    res.status(500).json({ error: "Erro ao atualizar status" });
  }
});

export default router;
