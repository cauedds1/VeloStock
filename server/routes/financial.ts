import { Router } from "express";
import { db } from "../db";
import { 
  commissionsConfig, 
  operationalExpenses, 
  commissionPayments, 
  salesTargets,
  vehicles,
  vehicleCosts,
  users
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getUserWithCompany } from "../utils/getUserWithCompany";
import { requireProprietarioOrGerente } from "../middleware/roleCheck";

const router = Router();

// Todas as rotas financeiras exigem papel de Proprietário ou Gerente
router.use(requireProprietarioOrGerente);

// ============================================
// COMISSÕES - CONFIGURAÇÃO
// ============================================

// Listar configurações de comissão
router.get("/commissions/config", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  
  const configs = await db
    .select({
      id: commissionsConfig.id,
      vendedorId: commissionsConfig.vendedorId,
      vendedorNome: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      vendedorEmail: users.email,
      percentualComissao: commissionsConfig.percentualComissao,
      ativo: commissionsConfig.ativo,
      observacoes: commissionsConfig.observacoes,
      createdAt: commissionsConfig.createdAt,
      updatedAt: commissionsConfig.updatedAt,
    })
    .from(commissionsConfig)
    .leftJoin(users, eq(commissionsConfig.vendedorId, users.id))
    .where(eq(commissionsConfig.empresaId, empresaId))
    .orderBy(desc(commissionsConfig.createdAt));

  res.json(configs);
});

// Criar/atualizar configuração de comissão
router.post("/commissions/config", async (req, res) => {
  const { empresaId, userId } = getUserWithCompany(req);
  const { vendedorId, percentualComissao, observacoes } = req.body;

  // Verificar se já existe configuração para este vendedor
  const existing = await db
    .select()
    .from(commissionsConfig)
    .where(
      and(
        eq(commissionsConfig.empresaId, empresaId),
        eq(commissionsConfig.vendedorId, vendedorId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Atualizar existente
    const [updated] = await db
      .update(commissionsConfig)
      .set({ 
        percentualComissao, 
        observacoes,
        ativo: "true",
        updatedAt: new Date() 
      })
      .where(eq(commissionsConfig.id, existing[0].id))
      .returning();
    
    res.json(updated);
  } else {
    // Criar novo
    const [created] = await db
      .insert(commissionsConfig)
      .values({
        empresaId,
        vendedorId,
        percentualComissao,
        observacoes,
      })
      .returning();
    
    res.json(created);
  }
});

// Desativar configuração de comissão
router.delete("/commissions/config/:id", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { id } = req.params;

  const [updated] = await db
    .update(commissionsConfig)
    .set({ ativo: "false", updatedAt: new Date() })
    .where(
      and(
        eq(commissionsConfig.id, id),
        eq(commissionsConfig.empresaId, empresaId)
      )
    )
    .returning();

  res.json(updated);
});

// ============================================
// COMISSÕES - PAGAMENTOS
// ============================================

// Listar comissões (com filtros opcionais)
router.get("/commissions/payments", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { vendedorId, status, mesReferencia, anoReferencia } = req.query;

  let query = db
    .select({
      id: commissionPayments.id,
      vendedorId: commissionPayments.vendedorId,
      vendedorNome: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      veiculoId: commissionPayments.veiculoId,
      veiculoInfo: sql<string>`${vehicles.brand} || ' ' || ${vehicles.model} || ' ' || ${vehicles.year}`,
      percentualAplicado: commissionPayments.percentualAplicado,
      valorBase: commissionPayments.valorBase,
      valorComissao: commissionPayments.valorComissao,
      status: commissionPayments.status,
      dataPagamento: commissionPayments.dataPagamento,
      formaPagamento: commissionPayments.formaPagamento,
      observacoes: commissionPayments.observacoes,
      createdAt: commissionPayments.createdAt,
    })
    .from(commissionPayments)
    .leftJoin(users, eq(commissionPayments.vendedorId, users.id))
    .leftJoin(vehicles, eq(commissionPayments.veiculoId, vehicles.id))
    .where(eq(commissionPayments.empresaId, empresaId))
    .$dynamic();

  if (vendedorId) {
    query = query.where(eq(commissionPayments.vendedorId, vendedorId as string));
  }

  if (status) {
    query = query.where(eq(commissionPayments.status, status as any));
  }

  // Filtro de mês/ano por data de criação
  if (mesReferencia && anoReferencia) {
    const mes = parseInt(mesReferencia as string);
    const ano = parseInt(anoReferencia as string);
    const startDate = new Date(ano, mes - 1, 1);
    const endDate = new Date(ano, mes, 0, 23, 59, 59);
    
    query = query.where(
      and(
        gte(commissionPayments.createdAt, startDate),
        lte(commissionPayments.createdAt, endDate)
      )
    );
  }

  const payments = await query.orderBy(desc(commissionPayments.createdAt));

  res.json(payments);
});

// Marcar comissão como paga
router.patch("/commissions/payments/:id/pay", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { id } = req.params;
  const { dataPagamento, formaPagamento, observacoes } = req.body;

  const [updated] = await db
    .update(commissionPayments)
    .set({
      status: "Paga",
      dataPagamento: new Date(dataPagamento),
      formaPagamento,
      observacoes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(commissionPayments.id, id),
        eq(commissionPayments.empresaId, empresaId)
      )
    )
    .returning();

  res.json(updated);
});

// ============================================
// DESPESAS OPERACIONAIS
// ============================================

// Listar despesas
router.get("/expenses", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { categoria, pago, mes, ano } = req.query;

  let query = db
    .select()
    .from(operationalExpenses)
    .where(eq(operationalExpenses.empresaId, empresaId))
    .$dynamic();

  if (categoria) {
    query = query.where(eq(operationalExpenses.categoria, categoria as any));
  }

  if (pago !== undefined) {
    query = query.where(eq(operationalExpenses.pago, pago as string));
  }

  if (mes && ano) {
    const mesNum = parseInt(mes as string);
    const anoNum = parseInt(ano as string);
    const startDate = new Date(anoNum, mesNum - 1, 1);
    const endDate = new Date(anoNum, mesNum, 0, 23, 59, 59);
    
    query = query.where(
      and(
        gte(operationalExpenses.createdAt, startDate),
        lte(operationalExpenses.createdAt, endDate)
      )
    );
  }

  const expenses = await query.orderBy(desc(operationalExpenses.createdAt));

  res.json(expenses);
});

// Criar despesa
router.post("/expenses", async (req, res) => {
  const { empresaId, userId } = getUserWithCompany(req);
  const { categoria, descricao, valor, dataVencimento, observacoes } = req.body;

  const [expense] = await db
    .insert(operationalExpenses)
    .values({
      empresaId,
      categoria,
      descricao,
      valor,
      dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
      observacoes,
      criadoPor: userId,
    })
    .returning();

  res.json(expense);
});

// Atualizar despesa
router.patch("/expenses/:id", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { id } = req.params;
  const updates = req.body;

  const [updated] = await db
    .update(operationalExpenses)
    .set({ ...updates, updatedAt: new Date() })
    .where(
      and(
        eq(operationalExpenses.id, id),
        eq(operationalExpenses.empresaId, empresaId)
      )
    )
    .returning();

  res.json(updated);
});

// Marcar despesa como paga
router.patch("/expenses/:id/pay", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { id } = req.params;
  const { dataPagamento, formaPagamento } = req.body;

  const [updated] = await db
    .update(operationalExpenses)
    .set({
      pago: "true",
      dataPagamento: new Date(dataPagamento),
      formaPagamento,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operationalExpenses.id, id),
        eq(operationalExpenses.empresaId, empresaId)
      )
    )
    .returning();

  res.json(updated);
});

// Deletar despesa
router.delete("/expenses/:id", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { id } = req.params;

  await db
    .delete(operationalExpenses)
    .where(
      and(
        eq(operationalExpenses.id, id),
        eq(operationalExpenses.empresaId, empresaId)
      )
    );

  res.json({ success: true });
});

// ============================================
// MÉTRICAS FINANCEIRAS
// ============================================

router.get("/metrics", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { mes, ano } = req.query;

  const mesNum = mes ? parseInt(mes as string) : new Date().getMonth() + 1;
  const anoNum = ano ? parseInt(ano as string) : new Date().getFullYear();
  
  const startDate = new Date(anoNum, mesNum - 1, 1);
  const endDate = new Date(anoNum, mesNum, 0, 23, 59, 59);

  // Veículos vendidos no período
  const vendasResult = await db
    .select({
      totalVendas: sql<number>`COUNT(*)::int`,
      receitaTotal: sql<string>`COALESCE(SUM(${vehicles.valorVenda}), 0)`,
      ticketMedio: sql<string>`COALESCE(AVG(${vehicles.valorVenda}), 0)`,
    })
    .from(vehicles)
    .where(
      and(
        eq(vehicles.empresaId, empresaId),
        eq(vehicles.status, "Vendido"),
        gte(vehicles.dataVenda, startDate),
        lte(vehicles.dataVenda, endDate)
      )
    );

  // Custos dos veículos vendidos no período
  const custosResult = await db
    .select({
      custoTotal: sql<string>`COALESCE(SUM(${vehicleCosts.value}), 0)`,
    })
    .from(vehicleCosts)
    .innerJoin(vehicles, eq(vehicleCosts.vehicleId, vehicles.id))
    .where(
      and(
        eq(vehicles.empresaId, empresaId),
        eq(vehicles.status, "Vendido"),
        gte(vehicles.dataVenda, startDate),
        lte(vehicles.dataVenda, endDate)
      )
    );

  // Despesas operacionais do período
  const despesasResult = await db
    .select({
      despesaTotal: sql<string>`COALESCE(SUM(${operationalExpenses.valor}), 0)`,
    })
    .from(operationalExpenses)
    .where(
      and(
        eq(operationalExpenses.empresaId, empresaId),
        gte(operationalExpenses.createdAt, startDate),
        lte(operationalExpenses.createdAt, endDate)
      )
    );

  // Comissões a pagar do período
  const comissoesResult = await db
    .select({
      comissaoTotal: sql<string>`COALESCE(SUM(${commissionPayments.valorComissao}), 0)`,
      comissoesPagas: sql<string>`COALESCE(SUM(CASE WHEN ${commissionPayments.status} = 'Paga' THEN ${commissionPayments.valorComissao} ELSE 0 END), 0)`,
      comissoesAPagar: sql<string>`COALESCE(SUM(CASE WHEN ${commissionPayments.status} = 'A Pagar' THEN ${commissionPayments.valorComissao} ELSE 0 END), 0)`,
    })
    .from(commissionPayments)
    .where(
      and(
        eq(commissionPayments.empresaId, empresaId),
        gte(commissionPayments.createdAt, startDate),
        lte(commissionPayments.createdAt, endDate)
      )
    );

  const vendas = vendasResult[0];
  const custos = custosResult[0];
  const despesas = despesasResult[0];
  const comissoes = comissoesResult[0];

  const receitaTotal = parseFloat(vendas.receitaTotal);
  const custoTotal = parseFloat(custos.custoTotal);
  const despesaTotal = parseFloat(despesas.despesaTotal);
  const comissaoTotal = parseFloat(comissoes.comissaoTotal);

  const lucroLiquido = receitaTotal - custoTotal - despesaTotal - comissaoTotal;
  const margemLucro = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

  res.json({
    periodo: { mes: mesNum, ano: anoNum },
    vendas: {
      quantidade: vendas.totalVendas,
      receita: receitaTotal,
      ticketMedio: parseFloat(vendas.ticketMedio),
    },
    custos: {
      veiculos: custoTotal,
      operacionais: despesaTotal,
      comissoes: comissaoTotal,
      total: custoTotal + despesaTotal + comissaoTotal,
    },
    resultados: {
      lucroLiquido,
      margemLucro,
    },
    comissoes: {
      total: parseFloat(comissoes.comissaoTotal),
      pagas: parseFloat(comissoes.comissoesPagas),
      aPagar: parseFloat(comissoes.comissoesAPagar),
    },
  });
});

// Ranking de vendedores
router.get("/sellers/ranking", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { mes, ano } = req.query;

  const mesNum = mes ? parseInt(mes as string) : new Date().getMonth() + 1;
  const anoNum = ano ? parseInt(ano as string) : new Date().getFullYear();
  
  const startDate = new Date(anoNum, mesNum - 1, 1);
  const endDate = new Date(anoNum, mesNum, 0, 23, 59, 59);

  const ranking = await db
    .select({
      vendedorId: vehicles.vendedorId,
      vendedorNome: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      vendedorEmail: users.email,
      quantidadeVendas: sql<number>`COUNT(*)::int`,
      receitaTotal: sql<string>`COALESCE(SUM(${vehicles.valorVenda}), 0)`,
      ticketMedio: sql<string>`COALESCE(AVG(${vehicles.valorVenda}), 0)`,
      comissaoTotal: sql<string>`COALESCE(SUM(${commissionPayments.valorComissao}), 0)`,
    })
    .from(vehicles)
    .leftJoin(users, eq(vehicles.vendedorId, users.id))
    .leftJoin(commissionPayments, eq(commissionPayments.veiculoId, vehicles.id))
    .where(
      and(
        eq(vehicles.empresaId, empresaId),
        eq(vehicles.status, "Vendido"),
        gte(vehicles.dataVenda, startDate),
        lte(vehicles.dataVenda, endDate)
      )
    )
    .groupBy(vehicles.vendedorId, users.firstName, users.lastName, users.email)
    .orderBy(desc(sql`SUM(${vehicles.valorVenda})`));

  res.json(ranking);
});

export default router;
