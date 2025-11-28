import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { generateCompletion, generateJSON, handleOpenAIError } from "../utils/openai";
import { getAdFromCache, saveAdToCache, clearAdCache } from "../utils/adCache";
import { db } from "../db";
import { leads, followUps, vehicles, storeObservations, billsPayable, users, vehicleCosts } from "@shared/schema";
import { eq, and, desc, isNull, lt, gte, sql } from "drizzle-orm";

async function getUserWithCompany(req: any): Promise<{ userId: string; empresaId: string } | null> {
  const userId = req.user?.claims?.id || req.user?.claims?.sub;
  if (!userId) return null;
  
  const user = await storage.getUser(userId);
  if (!user?.empresaId) return null;
  
  return { userId, empresaId: user.empresaId };
}

export function registerAIRoutes(app: Express) {
  
  // POST /api/vehicles/:id/generate-ad-multi - Gerar anúncios multi-plataforma (com cache)
  app.post("/api/vehicles/:id/generate-ad-multi", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const vehicleId = req.params.id;

      // ===== VERIFICAR CACHE =====
      const cachedAd = getAdFromCache(vehicleId);
      if (cachedAd) {
        // Remover timestamp antes de retornar
        const { timestamp, ...adWithoutTimestamp } = cachedAd;
        return res.json({ ...adWithoutTimestamp, fromCache: true });
      }

      const vehicle = await storage.getVehicle(vehicleId, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado" });
      }

      const companies = await storage.getAllCompanies();
      const company = companies.find(c => c.id === userCompany.empresaId);
      const companyName = company?.nomeFantasia || "Nossa Loja";

      // Montar descrição detalhada do veículo com informações específicas
      const features = vehicle.features || [];
      const salePrice = Number(vehicle.salePrice) || 0;
      const hasPriceSet = salePrice > 0;
      const priceInfo = hasPriceSet 
        ? `Preço: R$ ${salePrice.toLocaleString('pt-BR')}`
        : "Preço sob consulta";
      
      const kmOdometer = Number(vehicle.kmOdometer) || 0;
      const kmInfo = kmOdometer > 0 ? `${kmOdometer.toLocaleString('pt-BR')} km` : 'Baixa quilometragem';

      // Selecionar alguns opcionais principais (máx 3-4 mais relevantes)
      const mainFeatures = features.slice(0, 4).join(", ");
      const featuresList = features.length > 4 
        ? `Principais opcionais: ${mainFeatures} + ${features.length - 4} outros` 
        : `Opcionais: ${mainFeatures}`;

      // Construir informações sobre o carro de forma mais detalhada
      const vehicleDescription = `${vehicle.brand} ${vehicle.model} ${vehicle.year}
Cor: ${vehicle.color}
Combustível: ${vehicle.fuelType || 'Não especificado'}
Quilometragem: ${kmInfo}
${featuresList}
${vehicle.notes ? `Observações importantes: ${vehicle.notes}` : ''}
${priceInfo}`;

      // Prompt mais detalhado e específico para gerar anúncios autênticos
      const prompt = `Você é um especialista em vendas de veículos. Gere anúncios AUTÊNTICOS e ESPECÍFICOS (não genéricos) para este veículo:

${vehicleDescription}

Loja: "${companyName}"

IMPORTANTE:
1. Use informações ESPECÍFICAS do carro (não fale de "veículo bonito" ou similar - mencione características reais)
2. Destaque os opcionais mencionados de forma natural
3. Mencione a quilometragem como vantagem se for baixa
4. Seja persuasivo mas honesto - pareça uma venda REAL, não template genérico
5. Cada anúncio deve soar como se quem está vendendo conhece bem este carro específico

Gere um objeto JSON com os seguintes campos (máximo de caracteres):
- instagram_story: Texto curto e impactante para Story (máx 50 caracteres, mencione algo específico)
- instagram_feed: Texto engajador para Feed (máx 150 caracteres, destaque 1-2 opcionais principais)
- facebook: Post completo e persuasivo (máx 200 caracteres, conte uma "história" sobre o carro)
- olx_title: Título SEO otimizado para OLX (máx 60 caracteres, inclua cor e ano se couber)
- whatsapp: Mensagem conversacional (máx 100 caracteres, como se um amigo recomendasse)
- seo_title: Título para buscadores (máx 60 caracteres, SEO friendly)

Use linguagem brasileira natural, conversacional, sem emojis excessivos. Retorne APENAS JSON válido.`;

      const result = await generateJSON(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.8,
        maxTokens: 800,
        systemPrompt: "Você é um copywriter especialista em vendas de veículos automotivos com anos de experiência. Crie anúncios que pareçam reais e específicos, não genéricos. Retorne apenas JSON válido.",
      });

      // ===== SALVAR EM CACHE =====
      saveAdToCache(vehicleId, result);

      res.json({ ...result, fromCache: false });
    } catch (error) {
      handleOpenAIError(error, res);
    }
  });

  // POST /api/leads/:id/suggest-response - Sugerir resposta para lead
  app.post("/api/leads/:id/suggest-response", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Buscar lead diretamente do banco
      const leadResult = await db.select().from(leads)
        .where(and(eq(leads.id, req.params.id), eq(leads.empresaId, userCompany.empresaId)));
      
      const lead = leadResult[0];
      if (!lead) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      // Buscar follow-ups do lead
      const followupsResult = await db.select().from(followUps)
        .where(eq(followUps.leadId, lead.id))
        .orderBy(desc(followUps.createdAt))
        .limit(5);

      const historyText = followupsResult
        .map((f: any) => `${new Date(f.createdAt).toLocaleDateString('pt-BR')}: ${f.notes || f.tipo}`)
        .join("\n");

      const companies = await storage.getAllCompanies();
      const company = companies.find(c => c.id === userCompany.empresaId);
      const companyName = company?.nomeFantasia || "Nossa Loja";

      // Construir descrição do veículo com dados detalhados do frontend, se fornecido
      const veiculoData = req.body?.veiculoData;
      let veiculoDescricao = lead.veiculoInteresseNome || "veículos";
      
      if (veiculoData && veiculoData.brand && veiculoData.model) {
        // Usar dados detalhados se disponíveis
        veiculoDescricao = `${veiculoData.brand} ${veiculoData.model} ${veiculoData.year}${veiculoData.color ? ` (${veiculoData.color})` : ""}`;
      }

      const prompt = `Você é um vendedor da "${companyName}". O lead "${lead.nome}" está interessado em um ${veiculoDescricao}.

Histórico de contatos:
${historyText || "Nenhum contato anterior registrado."}

Status atual: ${lead.status}
Contato: ${lead.telefone || lead.email}

Sugira uma resposta profissional, persuasiva e personalizada para continuar a negociação, mencionando especificamente o ${veiculoDescricao} se relevante. A resposta deve ser pronta para enviar via WhatsApp ou email.`;

      const suggestedResponse = await generateCompletion(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 400,
        systemPrompt: "Você é um vendedor experiente de veículos. Gere respostas naturais, profissionais e que estimulem a conversão.",
      });

      res.json({ suggestedResponse });
    } catch (error) {
      handleOpenAIError(error, res);
    }
  });

  // POST /api/financial/seller-analysis - Análise de desempenho do vendedor
  app.post("/api/financial/seller-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const { sellerId } = req.body;
      if (!sellerId) {
        return res.status(400).json({ error: "ID do vendedor é obrigatório" });
      }

      const seller = await storage.getUser(sellerId);
      if (!seller || seller.empresaId !== userCompany.empresaId) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }

      const vehicles = await storage.getAllVehicles(userCompany.empresaId);
      const soldVehicles = vehicles.filter((v: any) => 
        v.status === "Vendido" && v.vendedorId === sellerId
      );
      
      const totalSales = soldVehicles.length;
      const totalValue = soldVehicles.reduce((sum: number, v: any) => sum + (Number(v.valorVenda || v.salePrice) || 0), 0);
      
      // Buscar leads do vendedor
      const leadsResult = await db.select().from(leads)
        .where(and(
          eq(leads.empresaId, userCompany.empresaId),
          eq(leads.vendedorResponsavel, sellerId)
        ));
      
      const convertedLeads = leadsResult.filter((l: any) => l.status === "Convertido");
      const conversionRate = leadsResult.length > 0 
        ? (convertedLeads.length / leadsResult.length * 100).toFixed(1)
        : "0";

      const prompt = `Analise o desempenho do vendedor com os seguintes dados:

Nome: ${seller.firstName} ${seller.lastName}
Total de Vendas: ${totalSales} veículos
Valor Total: R$ ${totalValue.toLocaleString('pt-BR')}
Taxa de Conversão: ${conversionRate}%
Leads Atribuídos: ${leadsResult.length}
Leads Convertidos: ${convertedLeads.length}

Forneça uma análise completa incluindo:
1. Pontos fortes
2. Áreas de melhoria
3. 3 recomendações práticas de treinamento ou ação

Retorne um JSON com: { "analysis": "texto da análise", "recommendations": ["rec1", "rec2", "rec3"] }`;

      const result = await generateJSON(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 600,
        systemPrompt: "Você é um consultor de vendas automotivas. Analise métricas e forneça insights acionáveis.",
      });

      res.json(result);
    } catch (error) {
      handleOpenAIError(error, res);
    }
  });

  // POST /api/chatbot/message - Chatbot FAQ com contexto completo do sistema
  app.post("/api/chatbot/message", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const { message, conversationHistory = [] } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Mensagem é obrigatória" });
      }

      // Sanitize and validate message length
      const sanitizedMessage = message.trim().slice(0, 500);
      if (!sanitizedMessage) {
        return res.status(400).json({ error: "Mensagem inválida" });
      }

      const companies = await storage.getAllCompanies();
      const company = companies.find(c => c.id === userCompany.empresaId);
      const companyName = company?.nomeFantasia || "Nossa Loja";

      // Buscar usuário para verificar permissões
      const currentUser = await storage.getUser(userCompany.userId);
      const userRole = currentUser?.role || "vendedor";
      const userPermissions = currentUser?.customPermissions || {};

      // Validate and sanitize conversation history (only allow valid structure)
      const validHistory = Array.isArray(conversationHistory) 
        ? conversationHistory
            .filter((m: any) => 
              m && 
              typeof m === 'object' &&
              (m.role === 'user' || m.role === 'assistant') &&
              typeof m.content === 'string' &&
              m.content.length <= 500
            )
            .slice(-5)
            .map((m: any) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content.trim().slice(0, 500)
            }))
        : [];

      const historyText = validHistory
        .map((m) => `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.content}`)
        .join("\n");

      // ====== BUSCAR TODOS OS DADOS DO SISTEMA ======
      // 1. Todos os veículos (estoque + vendidos + arquivados)
      const allVehicles = await db.select({
        id: vehicles.id,
        brand: vehicles.brand,
        model: vehicles.model,
        year: vehicles.year,
        color: vehicles.color,
        status: vehicles.status,
        location: vehicles.physicalLocation,
        plate: vehicles.plate,
        salePrice: vehicles.salePrice,
        purchasePrice: vehicles.purchasePrice,
        dataVenda: vehicles.dataVenda,
        vendedorNome: vehicles.vendedorNome,
        valorVenda: vehicles.valorVenda,
      }).from(vehicles).where(eq(vehicles.empresaId, userCompany.empresaId));

      // 2. Observações pendentes
      const pendingObservations = await db.select({
        id: storeObservations.id,
        description: storeObservations.description,
        status: storeObservations.status,
        createdAt: storeObservations.createdAt,
      }).from(storeObservations).where(
        and(
          eq(storeObservations.empresaId, userCompany.empresaId),
          eq(storeObservations.status, "Pendente")
        )
      ).limit(10);

      // 3. Contas a pagar (apenas se usuário tem permissão)
      let billsContext = "";
      const canViewBills = userRole === "proprietario" || userRole === "gerente" || userPermissions?.viewBills;
      if (canViewBills) {
        const bills = await db.select({
          id: billsPayable.id,
          descricao: billsPayable.descricao,
          valor: billsPayable.valor,
          dataVencimento: billsPayable.dataVencimento,
          status: billsPayable.status,
        }).from(billsPayable).where(
          and(
            eq(billsPayable.empresaId, userCompany.empresaId),
            eq(billsPayable.status, "pendente")
          )
        ).orderBy(billsPayable.dataVencimento).limit(10);
        
        billsContext = bills.length > 0 ? `\n## CONTAS A PAGAR (Pendentes):\n${bills.map(b => 
          `- ${b.descricao}: R$ ${Number(b.valor).toFixed(2)} (Vence: ${new Date(b.dataVencimento).toLocaleDateString('pt-BR')})`
        ).join("\n")}` : "\n## CONTAS: Nenhuma conta pendente";
      } else {
        billsContext = "\n[Usuário sem permissão para visualizar contas financeiras]";
      }

      // 4. Leads ativos
      let leadsContext = "";
      const userLeads = userRole === "proprietario" || userRole === "gerente" 
        ? await db.select({
            nome: leads.nome,
            status: leads.status,
            veiculoInteresseNome: leads.veiculoInteresseNome,
          }).from(leads).where(
            and(
              eq(leads.empresaId, userCompany.empresaId),
              eq(leads.status, "Negociando")
            )
          ).limit(5)
        : await db.select({
            nome: leads.nome,
            status: leads.status,
            veiculoInteresseNome: leads.veiculoInteresseNome,
          }).from(leads).where(
            and(
              eq(leads.empresaId, userCompany.empresaId),
              eq(leads.status, "Negociando"),
              eq(leads.vendedorResponsavel, userCompany.userId)
            )
          ).limit(5);

      if (userLeads.length > 0) {
        leadsContext = `\n## LEADS EM NEGOCIAÇÃO:\n${userLeads.map(l => 
          `- ${l.nome} (${l.veiculoInteresseNome || "Veículo não especificado"})`
        ).join("\n")}`;
      }

      // 5. Veículos em estoque
      const inStock = allVehicles.filter(v => v.status === "Entrada" || v.status === "Pronto para Venda");
      const vehiclesContext = inStock.length > 0 ? `\n## ESTOQUE DISPONÍVEL (${inStock.length} veículos):\n${inStock.slice(0, 15).map(v => 
        `- ${v.brand} ${v.model} ${v.year} (${v.color}) | Placa: ${v.plate} | Local: ${v.location || "N/A"}`
      ).join("\n")}` : "\n## ESTOQUE: Vazio";

      // 6. Veículos vendidos (últimos 30 dias)
      const soldVehicles = allVehicles.filter(v => v.status === "Vendido" && v.dataVenda);
      const soldContext = soldVehicles.length > 0 ? `\n## VENDAS RECENTES:\n${soldVehicles.slice(0, 10).map(v => {
        const dataStr = v.dataVenda ? new Date(v.dataVenda).toLocaleDateString('pt-BR') : "N/A";
        const valor = v.valorVenda ? Number(v.valorVenda).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : "N/A";
        return `- ${v.brand} ${v.model} ${v.year} | Vendedor: ${v.vendedorNome || "N/A"} | ${dataStr} | ${valor}`;
      }).join("\n")}` : "\n## VENDAS: Nenhuma venda registrada";

      // 7. Custos de veículos (limitado aos primeiros 15)
      const vehicleCostsList = await db.select({
        vehicleId: vehicleCosts.vehicleId,
        description: vehicleCosts.description,
        value: vehicleCosts.value,
      }).from(vehicleCosts).limit(15);

      const costsContext = vehicleCostsList.length > 0 ? `\n## CUSTOS REGISTRADOS:\n${vehicleCostsList.map(c => 
        `- Custo: ${c.description} | R$ ${Number(c.value).toFixed(2)}`
      ).join("\n")}` : "\n## CUSTOS: Nenhum custo registrado";

      const observationsContext = pendingObservations.length > 0 ? `\n## OBSERVAÇÕES PENDENTES:\n${pendingObservations.map(o => 
        `- ${o.description} (Criada em: ${new Date(o.createdAt).toLocaleDateString('pt-BR')})`
      ).join("\n")}` : "\n## OBSERVAÇÕES: Nenhuma observação pendente";

      const systemContext = `${vehiclesContext}${leadsContext}${observationsContext}${soldContext}${costsContext}${billsContext}`;

      const prompt = `${historyText ? `Histórico:\n${historyText}\n\n` : ''}Usuário perguntou: ${sanitizedMessage}

Responda de forma CONCISA e DIRETA, respondendo APENAS o que foi perguntado, sem adicionar informações extras ou irrelevantes.`;

      const veloStockSystemPrompt = `Você é o assistente virtual especializado do VeloStock - um sistema completo de gestão de revenda de veículos da "${companyName}".

## DADOS DO SISTEMA (para sua referência)
${systemContext}

## ROLE DO USUÁRIO ATUAL
Papel: ${userRole}
Permissões de Visualização de Contas: ${canViewBills ? 'SIM' : 'NÃO'}

## REGRA PRINCIPAL - FUNDAMENTAL
**RESPONDA APENAS O QUE FOI PERGUNTADO.** Não adicione contexto, informações extras, ou dados irrelevantes. Se perguntam sobre carros sem fotos, fale APENAS sobre carros sem fotos. Se perguntam sobre contas, fale APENAS sobre contas. Sem exceções.

## COMPORTAMENTO
1. **Mestre do Sistema**: Você tem acesso a TUDO nos dados acima
2. **Resposta Direta**: Pergunta sobre contas? Responda APENAS contas. Pergunta sobre veículos? APENAS veículos. Nada de extras.
3. **Adapte o Tipo de Resposta**:
   - PERGUNTAS QUANTITATIVAS ("Quantos", "Quanto", "Qual é o total", "Quantas"): Responda com NÚMERO APENAS
   - PERGUNTAS QUALITATIVAS ("Quais", "Liste", "Me mostre", "Qual", "Detalhes"): Responda com LISTA ORGANIZADA e bem formatada
   - Pergunta é busca geral: Use bom senso para determinar o melhor formato
4. **Permissões**: Se usuário não tem acesso (ex: vendedor vendo contas), recuse educadamente e pronto
5. **Formato**: Respostas concisas, bem organizadas, sem fluff
6. **Sem Recomendações**: Não ofereça ajuda extra ou pergunte "se precisar de mais", apenas responda o perguntado

## EXEMPLOS DE RESPOSTAS CORRETAS

**PERGUNTA QUANTITATIVA - "Quantos carros estão em preparação?"**
**RESPOSTA**:
3

(Apenas o número. Sem contexto, sem lista, sem formatação extra)

---

**PERGUNTA QUALITATIVA - "Quais carros estão em preparação?"**
**RESPOSTA**:
Carros em preparação:

🚗 Volkswagen Gol 2017 (Prata) - Placa OKG-0912
🚗 Fiat Palio 2019 (Branco) - Placa XYZ-1234
🚗 Chevrolet Onix 2020 (Preto) - Placa ABC-5678

(Lista bem organizada com detalhes relevantes)

---

**PERGUNTA QUANTITATIVA - "Quantas contas tenho?"**
**RESPOSTA**:
0

---

**PERGUNTA QUALITATIVA - "Quais contas estão vencendo?"**
**RESPOSTA**:
Contas vencendo:

💰 Aluguel - R$ 5.000 (Vence: 31/01/2025)
💰 Fornecedor X - R$ 2.300 (Vence: 30/01/2025)

---

**PERGUNTA QUANTITATIVA - "Qual é o custo total?"**
**RESPOSTA**:
R$ 7.500

---

**PERGUNTA QUALITATIVA - "Quem vendeu mais?"**
**RESPOSTA**:
João Silva com 5 vendas

(Se perguntarem detalhes: listar vendas; se apenas número, só número)

---

**PERGUNTA COM RESTRIÇÃO - "Quais contas estão pendentes?" (sem permissão)**
**RESPOSTA**:
Você não tem acesso aos dados financeiros. Apenas proprietários e gerentes podem visualizar contas.

## O QUE NUNCA FAZER
- ❌ Adicionar "Se precisar de mais informações..."
- ❌ Listar dados não solicitados (ex: falar de estoque quando perguntam de contas)
- ❌ Oferecer ajuda ou recursos extra
- ❌ Usar formatação excessiva quando não necessária
- ❌ Responder com informações falsas ou assumptions

## PARA CLIENTES/COMPRADORES
Se reconhecer que é cliente externo, fale apenas sobre veículos disponíveis de forma concisa`;

      const response = await generateCompletion(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 300,
        systemPrompt: veloStockSystemPrompt,
      });

      res.json({ response });
    } catch (error) {
      handleOpenAIError(error, res);
    }
  });

  // POST /api/checklists/suggest-observation - Sugestão de observação para checklist
  app.post("/api/checklists/suggest-observation", isAuthenticated, async (req: any, res) => {
    try {
      const { itemName, category, vehicleBrand, vehicleModel } = req.body;
      
      if (!itemName) {
        return res.status(400).json({ error: "Nome do item é obrigatório" });
      }

      const prompt = `Item do checklist: "${itemName}"
Categoria: ${category || "Geral"}
Veículo: ${vehicleBrand || ""} ${vehicleModel || ""}

Sugira uma observação técnica profissional para este item que foi marcado como "Fazer Reparo". A observação deve:
1. Ser objetiva e técnica
2. Descrever o problema encontrado
3. Sugerir a ação necessária
4. Ter no máximo 2 linhas

Retorne apenas a observação, sem formatação adicional.`;

      const observation = await generateCompletion(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.5,
        maxTokens: 150,
        systemPrompt: "Você é um mecânico automotivo experiente. Forneça observações técnicas precisas e profissionais.",
      });

      res.json({ observation: observation.trim() });
    } catch (error) {
      handleOpenAIError(error, res);
    }
  });

  // POST /api/leads/generate-email-campaign - Gerar campanha de email marketing
  app.post("/api/leads/generate-email-campaign", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const { leadIds, campaignType = "followup" } = req.body;
      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: "IDs dos leads são obrigatórios" });
      }

      const companies = await storage.getAllCompanies();
      const company = companies.find(c => c.id === userCompany.empresaId);
      const companyName = company?.nomeFantasia || "Nossa Loja";

      const emails = [];

      for (const leadId of leadIds.slice(0, 10)) { // Máx 10 leads por vez
        const leadResult = await db.select().from(leads)
          .where(and(eq(leads.id, leadId), eq(leads.empresaId, userCompany.empresaId)));
        
        const lead = leadResult[0];
        if (!lead) continue;

        const typeDescriptions: Record<string, string> = {
          followup: "acompanhamento de negociação em andamento",
          promotion: "promoção especial com oferta limitada",
          reactivation: "reativação de cliente que não comprou há algum tempo",
        };

        const prompt = `Crie um email de ${typeDescriptions[campaignType] || "acompanhamento"} para:
Nome: ${lead.nome}
Interesse: ${lead.veiculoInteresseNome || "veículos em geral"}
Loja: ${companyName}

O email deve ter:
- Assunto atrativo (máx 50 caracteres)
- Corpo do email personalizado e persuasivo
- Tom profissional mas amigável
- Call-to-action claro

Retorne JSON: { "subject": "...", "body": "..." }`;

        const result = await generateJSON(prompt, {
          model: "gpt-4o-mini",
          temperature: 0.7,
          maxTokens: 400,
          systemPrompt: "Você é um especialista em email marketing para concessionárias de veículos.",
        });

        emails.push({
          leadId: lead.id,
          leadName: lead.nome,
          leadEmail: lead.email,
          ...result,
        });
      }

      res.json({ emails });
    } catch (error) {
      handleOpenAIError(error, res);
    }
  });

  // POST /api/financial/seller-coaching - Coaching de vendedor
  app.post("/api/financial/seller-coaching", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const { sellerId } = req.body;
      if (!sellerId) {
        return res.status(400).json({ error: "ID do vendedor é obrigatório" });
      }

      const seller = await storage.getUser(sellerId);
      if (!seller || seller.empresaId !== userCompany.empresaId) {
        return res.status(404).json({ error: "Vendedor não encontrado" });
      }

      // Obter vendas do mês atual
      const vehicles = await storage.getAllVehicles(userCompany.empresaId);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const soldThisMonth = vehicles.filter((v: any) => {
        if (v.status !== "Vendido" || v.vendedorId !== sellerId) return false;
        const soldDate = v.dataVenda ? new Date(v.dataVenda) : null;
        return soldDate && soldDate.getMonth() === currentMonth && soldDate.getFullYear() === currentYear;
      });

      // Buscar leads ativos do vendedor
      const leadsResult = await db.select().from(leads)
        .where(and(
          eq(leads.empresaId, userCompany.empresaId),
          eq(leads.vendedorResponsavel, sellerId)
        ));
      
      const activeLeads = leadsResult.filter((l: any) => 
        l.status !== "Convertido" && l.status !== "Perdido"
      );

      const leadsByStatus = activeLeads.reduce((acc: Record<string, number>, l: any) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {});

      const prompt = `Vendedor: ${seller.firstName} ${seller.lastName}
Vendas este mês: ${soldThisMonth.length}
Leads ativos no pipeline: ${activeLeads.length}
Leads por status: ${JSON.stringify(leadsByStatus)}

Forneça:
1. 3 dicas específicas e práticas para melhorar as vendas
2. Uma área de foco principal

Retorne JSON: { "tips": ["dica1", "dica2", "dica3"], "focusArea": "área de foco" }`;

      const result = await generateJSON(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 400,
        systemPrompt: "Você é um coach de vendas automotivas. Forneça conselhos práticos e acionáveis.",
      });

      res.json(result);
    } catch (error) {
      handleOpenAIError(error, res);
    }
  });

  // POST /api/vehicles/:id/suggest-price-dynamic - Sugestão de preço dinâmica
  app.post("/api/vehicles/:id/suggest-price-dynamic", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado" });
      }

      const { fipePrice, targetMarginPercent = 20 } = req.body;

      // Buscar veículos similares (mesma marca, ano próximo)
      const allVehicles = await storage.getAllVehicles(userCompany.empresaId);
      const similarVehicles = allVehicles.filter((v: any) => 
        v.id !== vehicle.id &&
        v.brand === vehicle.brand &&
        Math.abs(v.year - vehicle.year) <= 2 &&
        v.salePrice && Number(v.salePrice) > 0
      ).slice(0, 5);

      const similarPrices = similarVehicles.map((v: any) => ({
        model: v.model,
        year: v.year,
        km: v.kmOdometer,
        price: Number(v.salePrice),
        status: v.status,
      }));

      // Calcular dias parado
      const entryDate = vehicle.createdAt ? new Date(vehicle.createdAt) : new Date();
      const daysInStock = Math.floor((Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Custos
      const costs = await storage.getVehicleCosts(vehicle.id);
      const totalCosts = costs.reduce((sum: number, c: any) => sum + Number(c.value), 0) + Number(vehicle.purchasePrice || 0);

      // Calcular KM médio esperado por ano
      const currentYear = new Date().getFullYear();
      const vehicleAge = currentYear - vehicle.year;
      const kmOdometer = Number(vehicle.kmOdometer) || 0;
      const expectedKmPerYear = 15000; // Média brasileira
      const expectedTotalKm = vehicleAge * expectedKmPerYear;
      const kmStatus = kmOdometer < expectedTotalKm * 0.7 ? "muito baixa (PREMIUM)" : kmOdometer < expectedTotalKm ? "normal" : "acima da média";

      const currentMonth = new Date().toLocaleString('pt-BR', { month: 'long' });

      const prompt = `ANÁLISE DE PRECIFICAÇÃO DE VEÍCULO

Veículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year} (${vehicle.color})
Idade: ${vehicleAge} anos
Quilometragem: ${kmOdometer.toLocaleString('pt-BR')} km (Status: ${kmStatus})
Custo total investido: R$ ${totalCosts.toLocaleString('pt-BR')}
Dias em estoque: ${daysInStock}
Mês atual: ${currentMonth}
${fipePrice ? `Preço FIPE de referência: R$ ${fipePrice}` : 'Sem preço FIPE disponível'}
Margem de lucro desejada: ${targetMarginPercent}%

ANÁLISE DE QUILOMETRAGEM:
- KM esperado para esta idade: ~${(expectedTotalKm).toLocaleString('pt-BR')} km
- KM real: ${kmOdometer.toLocaleString('pt-BR')} km
- Diferença: ${kmOdometer < expectedTotalKm ? `${((expectedTotalKm - kmOdometer)).toLocaleString('pt-BR')} km ABAIXO do esperado (VANTAGEM)` : `${((kmOdometer - expectedTotalKm)).toLocaleString('pt-BR')} km ACIMA do esperado (DESVANTAGEM)`}

HISTÓRICO DE PREÇOS SIMILARES:
${similarPrices.length > 0 ? similarPrices.map((v: any) => `- ${v.model} ${v.year}: ${v.km ? v.km.toLocaleString('pt-BR') + ' km' : 'N/A'} → R$ ${v.price.toLocaleString('pt-BR')} (${v.status})`).join('\n') : 'Nenhum similar encontrado'}

FATORES A CONSIDERAR:
1. **Quilometragem**: Se está MUITO ABAIXO do esperado, aplicar PREMIUM (até 10-15% acima de similar)
2. **Custos**: Garantir cobertura de todos os gastos + margem desejada
3. **Tempo em estoque**: Se >30 dias, reduzir 5-8%. Se <7 dias, manter firme.
4. **Sazonalidade**: ${currentMonth === 'dezembro' || currentMonth === 'junho' ? 'Mês com alta demanda - considerar preço premium' : 'Mês normal - preço padrão'}
5. **Competitividade**: Considerar preços similares, mas premiação por km baixa

INSTRUÇÕES CRÍTICAS:
- Se KM está muito abaixo do esperado (30% ou mais), é um diferencial REAL - precificar como premium
- Aplicar o custo + margem como BASE MÍNIMA
- Comparar com similares e ajustar para cima se KM for vantagem
- Ser agressivo em precificação se KM for excepcional

Analise TODOS esses fatores e retorne um preço estratégico que maximize venda respeitando a realidade do carro.

Retorne APENAS JSON válido (sem markdown): { "suggestedPrice": 00000.00, "reasoning": "justificativa detalhada considerando todos os fatores", "recommendation": "recomendação de ação" }`;

      const result = await generateJSON(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.5,
        maxTokens: 500,
        systemPrompt: "Você é um consultor de precificação de veículos seminovos. Forneça análises precisas e estratégicas.",
      });

      res.json({
        ...result,
        daysInStock,
        totalCosts,
        similarVehiclesCount: similarVehicles.length,
      });
    } catch (error) {
      handleOpenAIError(error, res);
    }
  });
}
