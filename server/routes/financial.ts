import { Router } from "express";
import { db } from "../db";
import { 
  commissionsConfig, 
  operationalExpenses, 
  commissionPayments, 
  salesTargets,
  vehicles,
  vehicleCosts,
  users,
  companies,
  billsPayable,
  storeObservations,
  insertOperationalExpenseSchema,
  insertCommissionPaymentSchema,
  insertCommissionsConfigSchema
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { requireProprietarioOrGerente, requireFinancialOrManagerAccess, requireRole } from "../middleware/roleCheck";

// Helper para validar autenticação e obter empresaId
// IMPORTANTE: Não confia no JWT, usa empresaId validado pelo middleware requireRole
function getUserWithCompany(req: any): { userId: string; empresaId: string } {
  const userId = req.user?.claims?.id || req.user?.claims?.sub;
  
  if (!userId) {
    throw new Error("Unauthorized");
  }
  
  // requireProprietarioOrGerente middleware já validou o role via DB lookup
  // e adicionou user completo do banco ao req.userFromDb
  const user = req.userFromDb; // Adicionado pelo middleware requireRole
  
  if (!user?.empresaId) {
    throw new Error("User not linked to a company");
  }
  
  return { userId, empresaId: user.empresaId };
}

const router = Router();

// Rota do relatório completo com acesso financeiro (proprietário, gerente OU financeiro)
// Definida ANTES do middleware global para ter seu próprio controle de acesso
router.get("/report/complete", requireFinancialOrManagerAccess, async (req, res) => {
  try {
    const { empresaId } = getUserWithCompanyForReport(req);
    const { mes, ano, startDate: startDateParam, endDate: endDateParam, tipo } = req.query;
    
    // Tipo de relatório
    const tipoRelatorio = (tipo as string) || "mensal";
    
    // Determinar período baseado no tipo
    let startDate: Date;
    let endDate: Date;
    let mesNum: number;
    let anoNum: number;
    
    if (tipoRelatorio === "personalizado" && startDateParam && endDateParam) {
      startDate = new Date(startDateParam as string);
      endDate = new Date(endDateParam as string);
      mesNum = startDate.getMonth() + 1;
      anoNum = startDate.getFullYear();
    } else if (tipoRelatorio === "ultimos3meses") {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      mesNum = new Date().getMonth() + 1;
      anoNum = new Date().getFullYear();
    } else if (tipoRelatorio === "mespassado") {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      mesNum = startDate.getMonth() + 1;
      anoNum = startDate.getFullYear();
    } else {
      mesNum = mes ? parseInt(mes as string) : new Date().getMonth() + 1;
      anoNum = ano ? parseInt(ano as string) : new Date().getFullYear();
      startDate = new Date(anoNum, mesNum - 1, 1);
      endDate = new Date(anoNum, mesNum, 0, 23, 59, 59, 999);
    }

    // Buscar dados da empresa
    const [empresa] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, empresaId))
      .limit(1);

    // Vendas do período
    const vendasPeriodo = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.empresaId, empresaId),
          eq(vehicles.status, "Vendido"),
          gte(vehicles.dataVenda, startDate),
          lte(vehicles.dataVenda, endDate)
        )
      );

    // Custos dos veículos VENDIDOS no período
    const custosPeriodo = await db
      .select()
      .from(vehicleCosts)
      .innerJoin(vehicles, eq(vehicleCosts.vehicleId, vehicles.id))
      .where(
        and(
          eq(vehicles.empresaId, empresaId),
          eq(vehicles.status, "Vendido"),
          gte(vehicles.dataVenda, startDate),
          lte(vehicles.dataVenda, endDate)
        )
      )
      .then(rows => rows.map(r => r.vehicle_costs));

    // Despesas operacionais do período
    const despesasPeriodo = await db
      .select()
      .from(operationalExpenses)
      .where(
        and(
          eq(operationalExpenses.empresaId, empresaId),
          gte(operationalExpenses.createdAt, startDate),
          lte(operationalExpenses.createdAt, endDate)
        )
      );

    // Pagamentos de comissão do período
    const comissoesPeriodo = await db
      .select()
      .from(commissionPayments)
      .where(
        and(
          eq(commissionPayments.empresaId, empresaId),
          gte(commissionPayments.createdAt, startDate),
          lte(commissionPayments.createdAt, endDate)
        )
      );

    // Contas a pagar do período
    const contasPagar = await db
      .select()
      .from(billsPayable)
      .where(
        and(
          eq(billsPayable.empresaId, empresaId),
          eq(billsPayable.tipo, "a_pagar"),
          gte(billsPayable.dataVencimento, startDate),
          lte(billsPayable.dataVencimento, endDate)
        )
      );

    // Contas a receber do período
    const contasReceber = await db
      .select()
      .from(billsPayable)
      .where(
        and(
          eq(billsPayable.empresaId, empresaId),
          eq(billsPayable.tipo, "a_receber"),
          gte(billsPayable.dataVencimento, startDate),
          lte(billsPayable.dataVencimento, endDate)
        )
      );

    // Observações pendentes
    const observacoesPendentes = await db
      .select()
      .from(storeObservations)
      .where(
        and(
          eq(storeObservations.empresaId, empresaId),
          eq(storeObservations.status, "Pendente")
        )
      );

    // Cálculos financeiros
    const receitaTotal = vendasPeriodo.reduce((sum, v) => sum + Number(v.salePrice || 0), 0);
    const aquisicaoTotal = vendasPeriodo.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0);
    const custoOperacionalTotal = custosPeriodo.reduce((sum, c) => sum + Number(c.value || 0), 0);
    const despesasTotal = despesasPeriodo.reduce((sum, d) => sum + Number(d.valor || 0), 0);
    const comissoesTotal = comissoesPeriodo.reduce((sum, c) => sum + Number(c.valorComissao || 0), 0);
    
    const custoTotal = aquisicaoTotal + custoOperacionalTotal + despesasTotal + comissoesTotal;
    const lucroLiquido = receitaTotal - custoTotal;
    const margemLucro = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

    // Custos por categoria
    const custosPorCategoria = custosPeriodo.reduce((acc: any[], custo) => {
      const existing = acc.find(c => c.categoria === custo.category);
      if (existing) {
        existing.total += Number(custo.value || 0);
        existing.quantidade += 1;
      } else {
        acc.push({
          categoria: custo.category,
          total: Number(custo.value || 0),
          quantidade: 1
        });
      }
      return acc;
    }, []).sort((a, b) => b.total - a.total);

    // Ranking de vendedores
    const vendedoresMap = new Map<string, { nome: string; email: string; vendas: number; receita: number; comissao: number }>();
    
    for (const venda of vendasPeriodo) {
      if (venda.vendedorId) {
        const existing = vendedoresMap.get(venda.vendedorId);
        if (existing) {
          existing.vendas += 1;
          existing.receita += Number(venda.salePrice || 0);
        } else {
          const [vendedor] = await db
            .select()
            .from(users)
            .where(eq(users.id, venda.vendedorId))
            .limit(1);
          
          vendedoresMap.set(venda.vendedorId, {
            nome: vendedor ? `${vendedor.firstName || ""} ${vendedor.lastName || ""}`.trim() : "Não informado",
            email: vendedor?.email || "",
            vendas: 1,
            receita: Number(venda.salePrice || 0),
            comissao: 0
          });
        }
      }
    }
    
    // Adicionar comissões aos vendedores
    for (const comissao of comissoesPeriodo) {
      if (comissao.vendedorId && vendedoresMap.has(comissao.vendedorId)) {
        const vendedor = vendedoresMap.get(comissao.vendedorId)!;
        vendedor.comissao += Number(comissao.valorComissao || 0);
      }
    }
    
    const rankingVendedores = Array.from(vendedoresMap.values()).sort((a, b) => b.receita - a.receita);

    // Totais de contas
    const totalContasPagar = contasPagar.reduce((sum, c) => sum + Number(c.valor || 0), 0);
    const totalContasReceber = contasReceber.reduce((sum, c) => sum + Number(c.valor || 0), 0);
    const contasPagarVencidas = contasPagar.filter(c => new Date(c.dataVencimento) < new Date() && c.status !== "pago");
    const contasReceberVencidas = contasReceber.filter(c => new Date(c.dataVencimento) < new Date() && c.status !== "pago");

    res.json({
      empresa: {
        nome: empresa?.nomeFantasia || "Empresa",
        logo: empresa?.logoUrl || null,
      },
      periodo: {
        tipo: tipoRelatorio,
        mes: mesNum,
        ano: anoNum,
        dataInicio: startDate.toISOString(),
        dataFim: endDate.toISOString(),
      },
      resumoFinanceiro: {
        receitaTotal,
        custoAquisicao: aquisicaoTotal,
        custoOperacional: custoOperacionalTotal,
        despesasOperacionais: despesasTotal,
        comissoes: comissoesTotal,
        custoTotal,
        lucroLiquido,
        margemLucro,
      },
      vendas: {
        quantidade: vendasPeriodo.length,
        receitaTotal,
        ticketMedio: vendasPeriodo.length > 0 ? receitaTotal / vendasPeriodo.length : 0,
      },
      comissoes: {
        total: comissoesTotal,
        pagas: comissoesPeriodo.filter(c => c.status === "Paga").reduce((sum, c) => sum + Number(c.valorComissao || 0), 0),
        aPagar: comissoesPeriodo.filter(c => c.status === "A Pagar").reduce((sum, c) => sum + Number(c.valorComissao || 0), 0),
      },
      contasPagar: {
        lista: contasPagar,
        total: totalContasPagar,
        vencidas: contasPagarVencidas.length,
        valorVencido: contasPagarVencidas.reduce((sum, c) => sum + Number(c.valor || 0), 0),
      },
      contasReceber: {
        lista: contasReceber,
        total: totalContasReceber,
        vencidas: contasReceberVencidas.length,
        valorVencido: contasReceberVencidas.reduce((sum, c) => sum + Number(c.valor || 0), 0),
      },
      despesasOperacionais: {
        lista: despesasPeriodo,
        total: despesasTotal,
      },
      custosPorCategoria,
      rankingVendedores,
      observacoesPendentes: observacoesPendentes.length,
      dataGeracao: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao gerar relatório completo:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

// Helper para a rota de relatório (aceita financeiro)
function getUserWithCompanyForReport(req: any): { userId: string; empresaId: string } {
  const userId = req.user?.claims?.id || req.user?.claims?.sub;
  
  if (!userId) {
    throw new Error("Unauthorized");
  }
  
  const user = req.userFromDb;
  
  if (!user?.empresaId) {
    throw new Error("User not linked to a company");
  }
  
  return { userId, empresaId: user.empresaId };
}

// Todas as outras rotas financeiras exigem papel de Proprietário ou Gerente
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
  try {
    const { empresaId, userId } = getUserWithCompany(req);

    // Validar dados com schema Zod (rejeita NaN, Infinity, valores fora de 0-100, etc)
    const validatedData = insertCommissionsConfigSchema.parse({
      empresaId,
      vendedorId: req.body.vendedorId,
      percentualComissao: req.body.percentualComissao,
      observacoes: req.body.observacoes,
      ativo: "true",
    });

    // Verificar se já existe configuração para este vendedor
    const existing = await db
      .select()
      .from(commissionsConfig)
      .where(
        and(
          eq(commissionsConfig.empresaId, empresaId),
          eq(commissionsConfig.vendedorId, validatedData.vendedorId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Atualizar existente
      const dbData = {
        ...validatedData,
        percentualComissao: String(validatedData.percentualComissao),
        updatedAt: new Date()
      };
      const [updated] = await db
        .update(commissionsConfig)
        .set(dbData)
        .where(eq(commissionsConfig.id, existing[0].id))
        .returning();
      
      res.json(updated);
    } else {
      // Criar novo
      const dbData = {
        ...validatedData,
        percentualComissao: String(validatedData.percentualComissao),
      };
      const [created] = await db
        .insert(commissionsConfig)
        .values([dbData])
        .returning();
      
      res.json(created);
    }
  } catch (error: any) {
    console.error("Erro ao salvar configuração de comissão:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.errors?.map((e: any) => e.message).join(", ") 
      });
    }
    res.status(500).json({ error: "Erro ao salvar configuração" });
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
  try {
    const { empresaId } = getUserWithCompany(req);
    const { vendedorId, status, mesReferencia, anoReferencia } = req.query;

    console.log("[COMMISSION ENDPOINT] ========================================");
    console.log("[COMMISSION ENDPOINT] Buscando comissões para empresaId:", empresaId);
    console.log("[COMMISSION ENDPOINT] Filtros:", { vendedorId, status, mesReferencia, anoReferencia });

    // Construir array de condições
    const conditions: any[] = [eq(commissionPayments.empresaId, empresaId)];

    if (vendedorId) {
      console.log("[COMMISSION ENDPOINT] Aplicando filtro vendedorId:", vendedorId);
      conditions.push(eq(commissionPayments.vendedorId, vendedorId as string));
    }

    if (status) {
      console.log("[COMMISSION ENDPOINT] Aplicando filtro status:", status);
      conditions.push(eq(commissionPayments.status, status as any));
    }

    // Filtro de mês/ano por data de criação
    if (mesReferencia && anoReferencia) {
      const mes = parseInt(mesReferencia as string);
      const ano = parseInt(anoReferencia as string);
      const startDate = new Date(ano, mes - 1, 1);
      const endDate = new Date(ano, mes, 0, 23, 59, 59);
      console.log("[COMMISSION ENDPOINT] Aplicando filtro de data:", { mes, ano, startDate, endDate });
      
      conditions.push(gte(commissionPayments.createdAt, startDate));
      conditions.push(lte(commissionPayments.createdAt, endDate));
    }

    const payments = await db
      .select({
        id: commissionPayments.id,
        vendedorId: commissionPayments.vendedorId,
        vendedor: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
        veiculoId: commissionPayments.veiculoId,
        veiculo: {
          brand: vehicles.brand,
          model: vehicles.model,
          year: vehicles.year,
        },
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
      .where(and(...conditions))
      .orderBy(desc(commissionPayments.createdAt));

    console.log("[COMMISSION ENDPOINT] Encontradas", payments.length, "comissões");
    console.log("[COMMISSION ENDPOINT] Dados:", JSON.stringify(payments, null, 2));
    console.log("[COMMISSION ENDPOINT] ========================================");

    res.json(payments);
  } catch (error) {
    console.error("[COMMISSION ENDPOINT] Erro ao buscar comissões:", error);
    res.status(500).json({ error: "Erro ao buscar comissões" });
  }
});

// Marcar comissão como paga
router.patch("/commissions/payments/:id/pay", async (req, res) => {
  try {
    const { empresaId } = getUserWithCompany(req);
    const { id } = req.params;

    // Whitelist de campos permitidos
    const allowedFields = ['dataPagamento', 'formaPagamento', 'observacoes'];
    const updates: any = {
      status: "Paga", // Forçar status como "Paga"
      updatedAt: new Date(),
    };

    // Adicionar apenas campos permitidos que foram enviados
    if (req.body.dataPagamento) {
      updates.dataPagamento = new Date(req.body.dataPagamento);
    }
    if (req.body.formaPagamento !== undefined) {
      updates.formaPagamento = req.body.formaPagamento;
    }
    if (req.body.observacoes !== undefined) {
      updates.observacoes = req.body.observacoes;
    }

    const [updated] = await db
      .update(commissionPayments)
      .set(updates)
      .where(
        and(
          eq(commissionPayments.id, id),
          eq(commissionPayments.empresaId, empresaId)
        )
      )
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Erro ao marcar comissão como paga:", error);
    res.status(500).json({ error: "Erro ao atualizar comissão" });
  }
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
  try {
    const { empresaId, userId } = getUserWithCompany(req);
    
    // Validar dados com schema Zod (rejeita NaN, Infinity, negativos, etc)
    const validatedData = insertOperationalExpenseSchema.parse({
      ...req.body,
      empresaId,
      criadoPor: userId,
      dataVencimento: req.body.dataVencimento ? new Date(req.body.dataVencimento) : null,
    });

    const dbData = {
      ...validatedData,
      valor: String(validatedData.valor),
    };
    const [expense] = await db
      .insert(operationalExpenses)
      .values([dbData])
      .returning();

    res.json(expense);
  } catch (error: any) {
    console.error("Erro ao criar despesa:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.errors?.map((e: any) => e.message).join(", ") 
      });
    }
    res.status(500).json({ error: "Erro ao criar despesa" });
  }
});

// Atualizar despesa
router.patch("/expenses/:id", async (req, res) => {
  try {
    const { empresaId } = getUserWithCompany(req);
    const { id } = req.params;
    
    // Whitelist de campos permitidos para atualização
    const allowedFields = [
      'categoria', 'descricao', 'valor', 'dataVencimento', 
      'dataPagamento', 'pago', 'formaPagamento', 'observacoes'
    ];
    
    // Filtrar apenas campos permitidos
    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    // Validar valor monetário se presente
    if (updates.valor !== undefined) {
      const validatedData = insertOperationalExpenseSchema.partial().parse({
        valor: updates.valor
      });
      updates.valor = validatedData.valor;
    }

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
  } catch (error: any) {
    console.error("Erro ao atualizar despesa:", error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.errors?.map((e: any) => e.message).join(", ") 
      });
    }
    res.status(500).json({ error: "Erro ao atualizar despesa" });
  }
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
// GERENCIAR METAS DE VENDAS
// ============================================

router.post("/sales-targets", requireRole(["vendedor"]), async (req, res) => {
  try {
    const userId = req.user?.claims?.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const user = req.userFromDb;
    const empresaId = user.empresaId;
    const { metaQuantidade, metaValor } = req.body;

    const now = new Date();
    const mesReferencia = now.getMonth() + 1;
    const anoReferencia = now.getFullYear();

    // Verificar se já existe meta para este mês
    const [existingMeta] = await db
      .select()
      .from(salesTargets)
      .where(
        and(
          eq(salesTargets.empresaId, empresaId),
          eq(salesTargets.vendedorId, userId),
          eq(salesTargets.mesReferencia, mesReferencia),
          eq(salesTargets.anoReferencia, anoReferencia)
        )
      )
      .limit(1);

    if (existingMeta) {
      // Atualizar meta existente
      await db
        .update(salesTargets)
        .set({
          metaQuantidade: metaQuantidade || null,
          metaValor: metaValor ? metaValor.toString() : null,
          updatedAt: new Date(),
        })
        .where(eq(salesTargets.id, existingMeta.id));
    } else {
      // Criar nova meta
      await db.insert(salesTargets).values({
        empresaId,
        vendedorId: userId,
        mesReferencia,
        anoReferencia,
        metaQuantidade: metaQuantidade || null,
        metaValor: metaValor ? metaValor.toString() : null,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao salvar meta:", error);
    res.status(500).json({ error: "Erro ao salvar meta" });
  }
});

// ============================================
// DASHBOARD DO VENDEDOR
// ============================================

router.get("/seller-dashboard", requireRole(["vendedor"]), async (req, res) => {
  try {
    const userId = req.user?.claims?.id || req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const user = req.userFromDb;
    if (user.role !== "vendedor") return res.status(403).json({ error: "Apenas vendedores podem acessar" });

    const empresaId = user.empresaId;
    const now = new Date();
    const mesNum = now.getMonth() + 1;
    const anoNum = now.getFullYear();
    const startDate = new Date(anoNum, mesNum - 1, 1);
    const endDate = new Date(anoNum, mesNum, 0, 23, 59, 59);

    // Meta do vendedor
    const [metaVendedor] = await db
      .select()
      .from(salesTargets)
      .where(
        and(
          eq(salesTargets.empresaId, empresaId),
          eq(salesTargets.vendedorId, userId)
        )
      )
      .limit(1);

    // Vendas do vendedor no mês
    const vendasVendedor = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.empresaId, empresaId),
          eq(vehicles.vendedorId, userId),
          eq(vehicles.status, "Vendido"),
          gte(vehicles.dataVenda, startDate),
          lte(vehicles.dataVenda, endDate)
        )
      );

    // Comissões do vendedor
    const [comissaoData] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${commissionPayments.valorComissao}), 0)`,
        pagas: sql<string>`COALESCE(SUM(CASE WHEN ${commissionPayments.status} = 'Paga' THEN ${commissionPayments.valorComissao} ELSE 0 END), 0)`,
        aPagar: sql<string>`COALESCE(SUM(CASE WHEN ${commissionPayments.status} = 'A Pagar' THEN ${commissionPayments.valorComissao} ELSE 0 END), 0)`,
      })
      .from(commissionPayments)
      .where(
        and(
          eq(commissionPayments.empresaId, empresaId),
          eq(commissionPayments.vendedorId, userId),
          gte(commissionPayments.createdAt, startDate),
          lte(commissionPayments.createdAt, endDate)
        )
      );

    // Percentual de comissão do vendedor
    const [percentualConfig] = await db
      .select()
      .from(commissionsConfig)
      .where(
        and(
          eq(commissionsConfig.empresaId, empresaId),
          eq(commissionsConfig.vendedorId, userId)
        )
      )
      .limit(1);

    const quantidadeVendas = vendasVendedor.length;
    const receitaTotal = vendasVendedor.reduce((sum, v) => sum + Number(v.salePrice || 0), 0);
    const metaQuantidade = metaVendedor?.metaQuantidade || null;
    const metaValor = metaVendedor?.metaValor ? Number(metaVendedor.metaValor) : null;
    const percentualComissao = percentualConfig?.percentualComissao ? Number(percentualConfig.percentualComissao) : 0;

    res.json({
      meta: {
        metaQuantidade,
        metaValor,
        quantidadeVendas,
        receitaTotal,
      },
      comissoes: {
        total: Number(comissaoData?.total || 0),
        pagas: Number(comissaoData?.pagas || 0),
        aPagar: Number(comissaoData?.aPagar || 0),
        percentualComissao,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar dashboard do vendedor:", error);
    res.status(500).json({ error: "Erro ao gerar dashboard" });
  }
});

// ============================================
// MÉTRICAS FINANCEIRAS
// ============================================

router.get("/metrics", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { mes, ano, startDate: startDateStr, endDate: endDateStr } = req.query;

  let startDate: Date;
  let endDate: Date;
  let mesNum: number;
  let anoNum: number;

  if (startDateStr && endDateStr) {
    // Use date range if provided
    startDate = new Date(startDateStr as string);
    endDate = new Date(endDateStr as string);
    mesNum = startDate.getMonth() + 1;
    anoNum = startDate.getFullYear();
  } else {
    // Fall back to month/year
    mesNum = mes ? parseInt(mes as string) : new Date().getMonth() + 1;
    anoNum = ano ? parseInt(ano as string) : new Date().getFullYear();
    startDate = new Date(anoNum, mesNum - 1, 1);
    endDate = new Date(anoNum, mesNum, 0, 23, 59, 59);
  }

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

  // Preço de aquisição dos veículos vendidos no período
  const aquisicaoResult = await db
    .select({
      aquisicaoTotal: sql<string>`COALESCE(SUM(${vehicles.purchasePrice}), 0)`,
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

  // Custos operacionais dos veículos vendidos no período (reparos, higienização, etc)
  const custosOperacionaisResult = await db
    .select({
      custoOperacionalTotal: sql<string>`COALESCE(SUM(${vehicleCosts.value}), 0)`,
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
  const aquisicao = aquisicaoResult[0];
  const custosOperacionais = custosOperacionaisResult[0];
  const despesas = despesasResult[0];
  const comissoes = comissoesResult[0];

  // Converter strings para números com validação ANTES do fallback
  const receitaParsed = Number(vendas?.receitaTotal ?? 0);
  const custoAquisicaoParsed = Number(aquisicao?.aquisicaoTotal ?? 0);
  const custoOperacionalParsed = Number(custosOperacionais?.custoOperacionalTotal ?? 0);
  const despesaParsed = Number(despesas?.despesaTotal ?? 0);
  const comissaoParsed = Number(comissoes?.comissaoTotal ?? 0);
  const comissoesPagasParsed = Number(comissoes?.comissoesPagas ?? 0);
  const comissoesAPagarParsed = Number(comissoes?.comissoesAPagar ?? 0);
  const ticketMedioParsed = Number(vendas?.ticketMedio ?? 0);

  // Validar que todos os valores são finitos (rejeita NaN, Infinity, -Infinity)
  // e não-negativos (custos/receitas não podem ser negativos)
  if (!Number.isFinite(receitaParsed) || receitaParsed < 0 ||
      !Number.isFinite(custoAquisicaoParsed) || custoAquisicaoParsed < 0 ||
      !Number.isFinite(custoOperacionalParsed) || custoOperacionalParsed < 0 ||
      !Number.isFinite(despesaParsed) || despesaParsed < 0 ||
      !Number.isFinite(comissaoParsed) || comissaoParsed < 0 ||
      !Number.isFinite(comissoesPagasParsed) || comissoesPagasParsed < 0 ||
      !Number.isFinite(comissoesAPagarParsed) || comissoesAPagarParsed < 0 ||
      !Number.isFinite(ticketMedioParsed) || ticketMedioParsed < 0) {
    console.error("Erro: Valores financeiros inválidos (NaN, Infinity ou negativos)", {
      vendas: vendas?.receitaTotal,
      aquisicao: aquisicao?.aquisicaoTotal,
      operacional: custosOperacionais?.custoOperacionalTotal,
      despesas: despesas?.despesaTotal,
      comissoes: comissoes?.comissaoTotal,
      parsed: {
        receita: receitaParsed,
        aquisicao: custoAquisicaoParsed,
        operacional: custoOperacionalParsed,
        despesas: despesaParsed,
        comissoes: comissaoParsed
      }
    });
    return res.status(500).json({ error: "Erro ao calcular métricas financeiras - dados inválidos ou corrompidos" });
  }

  // Agora que validamos, podemos usar os valores com segurança
  const receitaTotal = receitaParsed;
  const custoAquisicao = custoAquisicaoParsed;
  const custoOperacional = custoOperacionalParsed;
  const despesaTotal = despesaParsed;
  const comissaoTotal = comissaoParsed;
  const comissoesPagas = comissoesPagasParsed;
  const comissoesAPagar = comissoesAPagarParsed;
  const ticketMedio = ticketMedioParsed;

  // Custo total = preço de aquisição + custos operacionais
  const custoTotalVeiculos = custoAquisicao + custoOperacional;
  
  const lucroLiquido = receitaTotal - custoTotalVeiculos - despesaTotal - comissaoTotal;
  const margemLucro = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

  res.json({
    periodo: { mes: mesNum, ano: anoNum },
    vendas: {
      quantidade: vendas?.totalVendas || 0,
      receita: receitaTotal,
      ticketMedio: ticketMedio,
    },
    custos: {
      aquisicao: custoAquisicao, // Preço de aquisição dos veículos
      operacionais: custoOperacional, // Reparos, higienização, etc
      veiculos: custoTotalVeiculos, // Total de custos de veículos
      despesas: despesaTotal, // Despesas operacionais gerais
      comissoes: comissaoTotal,
      total: custoTotalVeiculos + despesaTotal + comissaoTotal,
    },
    resultados: {
      lucroLiquido,
      margemLucro,
    },
    comissoes: {
      total: comissaoTotal,
      pagas: comissoesPagas,
      aPagar: comissoesAPagar,
    },
  });
});

// Ranking de vendedores
router.get("/sellers/ranking", async (req, res) => {
  const { empresaId } = getUserWithCompany(req);
  const { mes, ano, startDate: startDateStr, endDate: endDateStr } = req.query;

  let startDate: Date;
  let endDate: Date;
  let mesNum: number;
  let anoNum: number;

  if (startDateStr && endDateStr) {
    // Use date range if provided
    startDate = new Date(startDateStr as string);
    endDate = new Date(endDateStr as string);
    mesNum = startDate.getMonth() + 1;
    anoNum = startDate.getFullYear();
  } else {
    // Fall back to month/year
    mesNum = mes ? parseInt(mes as string) : new Date().getMonth() + 1;
    anoNum = ano ? parseInt(ano as string) : new Date().getFullYear();
    startDate = new Date(anoNum, mesNum - 1, 1);
    endDate = new Date(anoNum, mesNum, 0, 23, 59, 59);
  }

  const ranking = await db
    .select({
      vendedorId: vehicles.vendedorId,
      vendedorNome: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
      vendedorEmail: users.email,
      quantidadeVendas: sql<number>`COUNT(DISTINCT ${vehicles.id})::int`,
      receitaTotal: sql<string>`COALESCE(SUM(DISTINCT ${vehicles.valorVenda}), 0)`,
      ticketMedio: sql<string>`COALESCE(AVG(DISTINCT ${vehicles.valorVenda}), 0)`,
      comissaoTotal: sql<string>`COALESCE(SUM(${commissionPayments.valorComissao}), 0)`,
    })
    .from(vehicles)
    .leftJoin(users, eq(vehicles.vendedorId, users.id))
    .leftJoin(commissionPayments, and(
      eq(commissionPayments.veiculoId, vehicles.id),
      eq(commissionPayments.empresaId, empresaId)
    ))
    .where(
      and(
        eq(vehicles.empresaId, empresaId),
        eq(vehicles.status, "Vendido"),
        gte(vehicles.dataVenda, startDate),
        lte(vehicles.dataVenda, endDate)
      )
    )
    .groupBy(vehicles.vendedorId, users.firstName, users.lastName, users.email)
    .orderBy(desc(sql`SUM(DISTINCT ${vehicles.valorVenda})`));

  // Converter strings para números com validação robusta (validar ANTES do fallback)
  const rankingComValoresNumericos = ranking.map(vendedor => {
    const receitaParsed = Number(vendedor.receitaTotal ?? 0);
    const ticketMedioParsed = Number(vendedor.ticketMedio ?? 0);
    const comissaoParsed = Number(vendedor.comissaoTotal ?? 0);

    // Validar se algum valor é inválido (NaN, Infinity, -Infinity ou negativo)
    if (!Number.isFinite(receitaParsed) || receitaParsed < 0 ||
        !Number.isFinite(ticketMedioParsed) || ticketMedioParsed < 0 ||
        !Number.isFinite(comissaoParsed) || comissaoParsed < 0) {
      console.error("Erro: Dados inválidos no ranking de vendedor", {
        vendedorId: vendedor.vendedorId,
        receita: vendedor.receitaTotal,
        ticket: vendedor.ticketMedio,
        comissao: vendedor.comissaoTotal,
        parsed: {
          receita: receitaParsed,
          ticket: ticketMedioParsed,
          comissao: comissaoParsed
        }
      });
      // Retornar com zeros para não quebrar o ranking inteiro
      return {
        vendedorId: vendedor.vendedorId,
        vendedorNome: vendedor.vendedorNome,
        vendedorEmail: vendedor.vendedorEmail,
        quantidadeVendas: vendedor.quantidadeVendas || 0,
        receitaTotal: 0,
        ticketMedio: 0,
        comissaoTotal: 0,
        _erro: true, // Flag para indicar erro
      };
    }

    return {
      vendedorId: vendedor.vendedorId,
      vendedorNome: vendedor.vendedorNome,
      vendedorEmail: vendedor.vendedorEmail,
      quantidadeVendas: vendedor.quantidadeVendas || 0,
      receitaTotal: receitaParsed,
      ticketMedio: ticketMedioParsed,
      comissaoTotal: comissaoParsed,
    };
  });

  res.json(rankingComValoresNumericos);
});

export default router;
