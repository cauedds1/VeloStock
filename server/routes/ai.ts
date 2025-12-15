import type { Express } from "express";
import { isAuthenticated } from "../replitAuth";
import { storage } from "../storage";
import { generateCompletion, generateJSON, handleOpenAIError } from "../utils/openai";
import { getAdFromCache, saveAdToCache, clearAdCache } from "../utils/adCache";
import { normalizeRole, hasRole } from "../utils/roleHelper";
import { getVelostockKnowledge } from "../utils/velostockKnowledge";
import { db } from "../db";
import { 
  leads, 
  followUps, 
  vehicles, 
  storeObservations, 
  billsPayable, 
  users, 
  vehicleCosts, 
  commissionPayments, 
  vehicleHistory,
  reminders,
  costApprovals,
  operationalExpenses,
  activityLog,
  vehicleDocuments
} from "@shared/schema";
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

      // Obter idioma da requisição (padrão pt-BR)
      const { language = "pt-BR" } = req.body;

      // ===== VERIFICAR CACHE (por idioma) =====
      const cachedAd = getAdFromCache(vehicleId, language);
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

      // Prompt dinâmico baseado no idioma
      const isEnglish = language === "en-US";
      
      const prompt = isEnglish 
        ? `IMPORTANT: Generate ALL text content in English.

You are a vehicle sales expert. Generate AUTHENTIC and SPECIFIC ads (not generic) for this vehicle:

${vehicleDescription}

Store: "${companyName}"

IMPORTANT:
1. Use SPECIFIC information about the car (don't say "beautiful vehicle" or similar - mention real features)
2. Highlight the mentioned features naturally
3. Mention low mileage as an advantage if applicable
4. Be persuasive but honest - sound like a REAL sale, not a generic template
5. Each ad should sound like the seller knows this specific car well

Generate a JSON object with these fields (max characters):
- instagram_story: Short impactful text for Story (max 50 chars, mention something specific)
- instagram_feed: Engaging Feed post (max 150 chars, highlight 1-2 main features)
- facebook: Complete persuasive post (max 200 chars, tell a "story" about the car)
- olx_title: SEO optimized title for OLX (max 60 chars, include color and year if fits)
- whatsapp: Conversational message (max 100 chars, like a friend recommending)
- seo_title: Title for search engines (max 60 chars, SEO friendly)

Use natural, conversational English, without excessive emojis. Return ONLY valid JSON.`
        : `IMPORTANTE: Gere TODO o conteúdo de texto em português brasileiro.

Você é um especialista em vendas de veículos. Gere anúncios AUTÊNTICOS e ESPECÍFICOS (não genéricos) para este veículo:

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

      const systemPromptLang = language === "en-US"
        ? "You are an expert automotive sales copywriter with years of experience. Create ads that seem real and specific, not generic. Return only valid JSON. All text must be in English."
        : "Você é um copywriter especialista em vendas de veículos automotivos com anos de experiência. Crie anúncios que pareçam reais e específicos, não genéricos. Retorne apenas JSON válido.";

      const result = await generateJSON(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.8,
        maxTokens: 800,
        systemPrompt: systemPromptLang,
      });

      // ===== SALVAR EM CACHE (por idioma) =====
      saveAdToCache(vehicleId, result, language);

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

      const { message, conversationHistory = [], language = "pt-BR" } = req.body;
      const isEnglish = language === "en-US";
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: isEnglish ? "Message is required" : "Mensagem é obrigatória" });
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
      if (!currentUser) {
        return res.status(403).json({ error: "Usuário não encontrado" });
      }
      
      const userRole = normalizeRole(currentUser.role);
      
      // CORRECAO: Motoristas nao podem usar chatbot
      if (userRole === "motorista") {
        return res.status(403).json({ error: "Motoristas não têm acesso ao chatbot." });
      }
      
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
        createdAt: vehicles.createdAt,
      }).from(vehicles).where(eq(vehicles.empresaId, userCompany.empresaId));

      // ====== EXTRAIR CONTEXTO COMPLETO DO HISTÓRICO ======
      // Procura por: 1) veículo mencionado, 2) tópico da conversa
      let vehicleInContext: { id: string; brand: string; model: string; year?: number } | null = null;
      let conversationTopic = "geral"; // custos, localização, vendas, comissões, status, etc
      
      if (validHistory.length > 0 && allVehicles.length > 0) {
        const recentText = validHistory
          .map((m) => m.content)
          .join(" ")
          .toLowerCase();
        
        // 1. Procurar por nome de veículo mencionado (ex: "chevrolet onix", "compass", "ford fiesta")
        // Primeiro tenta "brand + model", depois só "model"
        for (const vehicle of allVehicles) {
          const fullName = `${vehicle.brand} ${vehicle.model}`.toLowerCase();
          const modelOnly = vehicle.model.toLowerCase();
          
          if (recentText.includes(fullName) || recentText.includes(modelOnly)) {
            vehicleInContext = {
              id: vehicle.id,
              brand: vehicle.brand,
              model: vehicle.model,
              year: vehicle.year,
            };
            break;
          }
        }
        
        // 2. Detectar tópico da conversa pelos keywords (ordem de prioridade)
        if (recentText.match(/follow[- ]?up|acompanhament|retorno|agendam/i)) conversationTopic = "follow-ups";
        else if (recentText.match(/lembrete|aviso|prazo|pendencia|tarefa/i)) conversationTopic = "lembretes";
        else if (recentText.match(/aprovaca|aprovar|autorizar|pendente para/i)) conversationTopic = "aprovações";
        else if (recentText.match(/despesa\s+operac|operacional|fixa|aluguel|salario|conta\s+fixo/i)) conversationTopic = "despesas operacionais";
        else if (recentText.match(/vendedor|equipe|quem vendeu|performance|desempenho/i)) conversationTopic = "vendedores";
        else if (recentText.match(/cust|despesa|gast|valor/i)) conversationTopic = "custos";
        else if (recentText.match(/localiz|local|endereco|estoque|deposito|onde\s+esta/i)) conversationTopic = "localização";
        else if (recentText.match(/vend|vendido|preço|preco|faturament/i)) conversationTopic = "vendas";
        else if (recentText.match(/comiss|comissao/i)) conversationTopic = "comissões";
        else if (recentText.match(/status|etapa|preparacao|reparos|higien|pronto|quanto\s+tempo|dias?\s+em|tempo\s+na/i)) conversationTopic = "status/preparação";
        else if (recentText.match(/lead|negociac|cliente|prospect/i)) conversationTopic = "leads";
        else if (recentText.match(/document|transfer|vistori|placa|crlv|laudo/i)) conversationTopic = "documentação";
        else if (recentText.match(/conta[s]?\s+(a\s+)?pagar|conta[s]?\s+(a\s+)?receber|venciment|boleto|fatura/i)) conversationTopic = "contas";
        else if (recentText.match(/observa[cç][ãa]o|problem|pendenc/i)) conversationTopic = "observações";
      }

      // Obter contexto resumido do último turno do usuário
      const lastUserMessage = validHistory
        .reverse()
        .find((m: any) => m.role === 'user')?.content || "";
      validHistory.reverse(); // Restaurar ordem

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
      const canViewBills = hasRole(userRole, "proprietario", "gerente") || userPermissions?.viewBills;
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
      }

      // 4. Leads ativos
      let leadsContext = "";
      const userLeads = hasRole(userRole, "proprietario", "gerente")
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

      // 5b. Se tópico é sobre status/preparação, também mostrar veículos em reparo/preparação
      let repairContext = "";
      if (conversationTopic === "status/preparação") {
        const inRepair = allVehicles.filter(v => 
          v.status === "Em Reparos" || v.status === "Em Higienização"
        );
        repairContext = inRepair.length > 0 ? `\n## VEÍCULOS EM PREPARAÇÃO (${inRepair.length} veículos):\n${inRepair.slice(0, 15).map(v => 
          `- ${v.brand} ${v.model} ${v.year} (${v.color}) | Placa: ${v.plate} | Status: ${v.status} | Local: ${v.location || "N/A"}`
        ).join("\n")}` : "\n## VEÍCULOS EM PREPARAÇÃO: Nenhum";
      }

      // 6. Veículos vendidos (últimos 30 dias)
      const soldVehicles = allVehicles.filter(v => v.status === "Vendido" && v.dataVenda);
      const soldContext = soldVehicles.length > 0 ? `\n## VENDAS RECENTES:\n${soldVehicles.slice(0, 10).map(v => {
        const dataStr = v.dataVenda ? new Date(v.dataVenda).toLocaleDateString('pt-BR') : "N/A";
        const valor = v.valorVenda ? Number(v.valorVenda).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : "N/A";
        return `- ${v.brand} ${v.model} ${v.year} | Vendedor: ${v.vendedorNome || "N/A"} | ${dataStr} | ${valor}`;
      }).join("\n")}` : "\n## VENDAS: Nenhuma venda registrada";

      // 7. Custos de veículos (filtrado por vehicleInContext se disponível)
      let vehicleCostsList: any[] = [];
      let costsContext = "";
      
      if (vehicleInContext) {
        // Se há um veículo em contexto, buscar APENAS custos daquele veículo
        vehicleCostsList = await db.select({
          vehicleId: vehicleCosts.vehicleId,
          description: vehicleCosts.description,
          value: vehicleCosts.value,
        }).from(vehicleCosts).where(eq(vehicleCosts.vehicleId, vehicleInContext.id));
        
        if (vehicleCostsList.length > 0) {
          const totalCosts = vehicleCostsList.reduce((sum, c) => sum + Number(c.value), 0);
          costsContext = `\n## CUSTOS DO ${vehicleInContext.brand.toUpperCase()} ${vehicleInContext.model.toUpperCase()} (Total: R$ ${totalCosts.toFixed(2)}):\n${vehicleCostsList.map(c => 
            `- ${c.description}: R$ ${Number(c.value).toFixed(2)}`
          ).join("\n")}`;
        } else {
          costsContext = `\n## CUSTOS: ${vehicleInContext.brand} ${vehicleInContext.model} não tem custos registrados`;
        }
      } else {
        // Se não há veículo em contexto, mostrar custos gerais (limitado)
        vehicleCostsList = await db.select({
          vehicleId: vehicleCosts.vehicleId,
          description: vehicleCosts.description,
          value: vehicleCosts.value,
        }).from(vehicleCosts).limit(15);
        
        costsContext = vehicleCostsList.length > 0 ? `\n## CUSTOS REGISTRADOS (gerais):\n${vehicleCostsList.map(c => 
          `- Custo: ${c.description} | R$ ${Number(c.value).toFixed(2)}`
        ).join("\n")}` : "\n## CUSTOS: Nenhum custo registrado";
      }

      const observationsContext = pendingObservations.length > 0 ? `\n## OBSERVAÇÕES PENDENTES:\n${pendingObservations.map(o => 
        `- ${o.description} (Criada em: ${new Date(o.createdAt).toLocaleDateString('pt-BR')})`
      ).join("\n")}` : "\n## OBSERVAÇÕES: Nenhuma observação pendente";

      // 8. Comissões pendentes (apenas se usuário tem permissão)
      let commissionsContext = "";
      const canViewCommissions = hasRole(userRole, "proprietario", "gerente") || userPermissions?.viewBills;
      if (canViewCommissions) {
        const pendingCommissions = await db.select({
          id: commissionPayments.id,
          vendedorId: commissionPayments.vendedorId,
          valorComissao: commissionPayments.valorComissao,
          status: commissionPayments.status,
          createdAt: commissionPayments.createdAt,
        }).from(commissionPayments).where(
          and(
            eq(commissionPayments.empresaId, userCompany.empresaId),
            eq(commissionPayments.status, "A Pagar")
          )
        ).limit(20);
        
        if (pendingCommissions.length > 0) {
          const totalComissoes = pendingCommissions.reduce((sum, c) => sum + Number(c.valorComissao), 0);
          commissionsContext = `\n## COMISSÕES PENDENTES (${pendingCommissions.length} registros):\nTotal: R$ ${totalComissoes.toFixed(2)}\n${pendingCommissions.map(c => 
            `- Comissão: R$ ${Number(c.valorComissao).toFixed(2)} (Registrada em: ${new Date(c.createdAt).toLocaleDateString('pt-BR')})`
          ).join("\n")}`;
        } else {
          commissionsContext = "\n## COMISSÕES: Nenhuma comissão pendente";
        }
      }

      // 9. Follow-ups pendentes (filtrado por role: vendedores veem apenas seus próprios)
      let followUpsContext = "";
      const isManagerOrOwner = hasRole(userRole, "proprietario", "gerente");
      const followUpConditions = isManagerOrOwner
        ? and(eq(followUps.empresaId, userCompany.empresaId), eq(followUps.status, "Pendente"))
        : and(eq(followUps.empresaId, userCompany.empresaId), eq(followUps.status, "Pendente"), eq(followUps.assignedTo, userCompany.userId));
      
      const pendingFollowUps = await db.select({
        id: followUps.id,
        titulo: followUps.titulo,
        descricao: followUps.descricao,
        dataAgendada: followUps.dataAgendada,
        status: followUps.status,
        assignedTo: followUps.assignedTo,
      }).from(followUps).where(followUpConditions).orderBy(followUps.dataAgendada).limit(10);
      
      if (pendingFollowUps.length > 0) {
        const today = new Date();
        const overdueCount = pendingFollowUps.filter(f => new Date(f.dataAgendada) < today).length;
        followUpsContext = `\n## FOLLOW-UPS PENDENTES (${pendingFollowUps.length}${overdueCount > 0 ? ` - ${overdueCount} atrasados` : ''}):\n${pendingFollowUps.map(f => {
          const date = new Date(f.dataAgendada);
          const isOverdue = date < today;
          return `- ${f.titulo}${isOverdue ? ' [ATRASADO]' : ''} | Agendado: ${date.toLocaleDateString('pt-BR')}`;
        }).join("\n")}`;
      }

      // 10. Lembretes pendentes (filtrado por role: vendedores veem apenas seus próprios)
      let remindersContext = "";
      const reminderConditions = isManagerOrOwner
        ? and(eq(reminders.empresaId, userCompany.empresaId), eq(reminders.status, "Pendente"))
        : and(eq(reminders.empresaId, userCompany.empresaId), eq(reminders.status, "Pendente"), eq(reminders.userId, userCompany.userId));
      
      const pendingReminders = await db.select({
        id: reminders.id,
        titulo: reminders.titulo,
        descricao: reminders.descricao,
        dataLimite: reminders.dataLimite,
        vehicleId: reminders.vehicleId,
        status: reminders.status,
      }).from(reminders).where(reminderConditions).orderBy(reminders.dataLimite).limit(10);
      
      if (pendingReminders.length > 0) {
        const today = new Date();
        const overdueReminders = pendingReminders.filter(r => new Date(r.dataLimite) < today).length;
        remindersContext = `\n## LEMBRETES PENDENTES (${pendingReminders.length}${overdueReminders > 0 ? ` - ${overdueReminders} vencidos` : ''}):\n${pendingReminders.map(r => {
          const date = new Date(r.dataLimite);
          const isOverdue = date < today;
          return `- ${r.titulo}${isOverdue ? ' [VENCIDO]' : ''} | Prazo: ${date.toLocaleDateString('pt-BR')}`;
        }).join("\n")}`;
      }

      // 11. Aprovações de custos pendentes (apenas proprietário/gerente)
      let costApprovalsContext = "";
      if (hasRole(userRole, "proprietario", "gerente")) {
        const pendingApprovals = await db.select({
          id: costApprovals.id,
          valor: costApprovals.valor,
          status: costApprovals.status,
          createdAt: costApprovals.createdAt,
        }).from(costApprovals).where(
          and(
            eq(costApprovals.empresaId, userCompany.empresaId),
            eq(costApprovals.status, "Pendente")
          )
        ).limit(20);
        
        if (pendingApprovals.length > 0) {
          const totalPendingApproval = pendingApprovals.reduce((sum, a) => sum + Number(a.valor), 0);
          costApprovalsContext = `\n## APROVAÇÕES PENDENTES (${pendingApprovals.length} custos):\nTotal a aprovar: R$ ${totalPendingApproval.toFixed(2)}`;
        }
      }

      // 12. Despesas operacionais do mês (apenas proprietário/gerente)
      let operationalExpensesContext = "";
      if (hasRole(userRole, "proprietario", "gerente")) {
        const currentMonth = new Date();
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        
        const monthlyExpenses = await db.select({
          id: operationalExpenses.id,
          descricao: operationalExpenses.descricao,
          valor: operationalExpenses.valor,
          categoria: operationalExpenses.categoria,
          dataVencimento: operationalExpenses.dataVencimento,
        }).from(operationalExpenses).where(
          and(
            eq(operationalExpenses.empresaId, userCompany.empresaId),
            gte(operationalExpenses.dataVencimento, firstDayOfMonth)
          )
        ).limit(30);
        
        if (monthlyExpenses.length > 0) {
          const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + Number(e.valor), 0);
          const byCategory: { [key: string]: number } = {};
          monthlyExpenses.forEach(e => {
            const cat = e.categoria || 'Outros';
            byCategory[cat] = (byCategory[cat] || 0) + Number(e.valor);
          });
          
          const categoryBreakdown = Object.entries(byCategory)
            .map(([cat, val]) => `${cat}: R$ ${val.toFixed(2)}`)
            .join(" | ");
          
          operationalExpensesContext = `\n## DESPESAS OPERACIONAIS DO MÊS:\nTotal: R$ ${totalExpenses.toFixed(2)}\nPor categoria: ${categoryBreakdown}`;
        }
      }

      // 13. Métricas de vendedores (apenas proprietário/gerente)
      let sellersMetricsContext = "";
      if (hasRole(userRole, "proprietario", "gerente")) {
        const allSellers = await db.select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
        }).from(users).where(
          and(
            eq(users.empresaId, userCompany.empresaId),
            eq(users.role, "vendedor"),
            eq(users.isActive, "true")
          )
        );
        
        if (allSellers.length > 0) {
          const sellerMetrics = await Promise.all(allSellers.map(async (seller) => {
            const sellerSales = allVehicles.filter(v => 
              v.status === "Vendido" && v.vendedorNome?.includes(seller.firstName || '')
            );
            const sellerLeads = await db.select({ id: leads.id, status: leads.status })
              .from(leads)
              .where(and(
                eq(leads.empresaId, userCompany.empresaId),
                eq(leads.vendedorResponsavel, seller.id)
              ));
            const activeLeads = sellerLeads.filter(l => l.status !== "Convertido" && l.status !== "Perdido").length;
            const convertedLeads = sellerLeads.filter(l => l.status === "Convertido").length;
            
            return {
              name: `${seller.firstName || ''} ${seller.lastName || ''}`.trim() || 'Vendedor',
              sales: sellerSales.length,
              activeLeads,
              convertedLeads,
            };
          }));
          
          sellersMetricsContext = `\n## MÉTRICAS DE VENDEDORES:\n${sellerMetrics.map(s => 
            `- ${s.name}: ${s.sales} vendas | ${s.activeLeads} leads ativos | ${s.convertedLeads} convertidos`
          ).join("\n")}`;
        }
      }

      // 14. Documentos pendentes (veículo em contexto)
      let documentsContext = "";
      if (vehicleInContext) {
        const vehicleDocs = await db.select({
          id: vehicleDocuments.id,
          documentType: vehicleDocuments.documentType,
          originalFileName: vehicleDocuments.originalFileName,
        }).from(vehicleDocuments).where(eq(vehicleDocuments.vehicleId, vehicleInContext.id));
        
        const docTypes = ['crlv', 'recibo_compra', 'laudo_vistoria', 'contrato_venda', 'transferencia', 'outros'];
        const existingTypes = vehicleDocs.map(d => d.documentType);
        const missingTypes = docTypes.filter(t => !existingTypes.includes(t as any));
        
        if (missingTypes.length > 0 || vehicleDocs.length > 0) {
          documentsContext = `\n## DOCUMENTAÇÃO DO ${vehicleInContext.brand.toUpperCase()} ${vehicleInContext.model.toUpperCase()}:\nDocumentos presentes: ${vehicleDocs.length > 0 ? vehicleDocs.map(d => d.documentType).join(', ') : 'Nenhum'}\nDocumentos faltando: ${missingTypes.length > 0 ? missingTypes.join(', ') : 'Nenhum - Completo!'}`;
        }
      }

      // 15. Activity Log (últimas atividades - apenas proprietário/gerente)
      let activityLogContext = "";
      if (hasRole(userRole, "proprietario", "gerente")) {
        const recentActivities = await db.select({
          id: activityLog.id,
          activityType: activityLog.activityType,
          description: activityLog.description,
          createdAt: activityLog.createdAt,
        }).from(activityLog).where(
          eq(activityLog.empresaId, userCompany.empresaId)
        ).orderBy(desc(activityLog.createdAt)).limit(15);
        
        if (recentActivities.length > 0) {
          activityLogContext = `\n## ATIVIDADES RECENTES:\n${recentActivities.map(a => {
            const date = new Date(a.createdAt).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
            return `- ${a.activityType}: ${a.description} (${date})`;
          }).join("\n")}`;
        }
      }

      // HISTÓRICO COMPLETO E CRONOLÓGICO DO VEÍCULO
      let vehicleContextInfo = "";
      let completeVehicleHistoryContext = "";
      if (vehicleInContext) {
        const vehicleData = allVehicles.find(v => v.id === vehicleInContext.id);
        if (vehicleData) {
          // Calcular dias no estoque
          const entryDate = vehicleData.createdAt ? new Date(vehicleData.createdAt) : new Date();
          const daysInStock = Math.floor((Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
          vehicleContextInfo = `\n## VEÍCULO EM DISCUSSÃO: ${vehicleData.brand} ${vehicleData.model} ${vehicleData.year}\nPlaca: ${vehicleData.plate}\nStatus: ${vehicleData.status}\nLocalização: ${vehicleData.location || "N/A"}\nPreço de Venda: R$ ${vehicleData.salePrice || "N/A"}\nDias no estoque: ${daysInStock} dias\nData de Entrada: ${entryDate.toLocaleDateString('pt-BR')}`;
        }

        // Montar histórico completo e cronológico
        const completeHistory: Array<{ date: Date; type: string; detail: string }> = [];

        // 1. Entrada do carro
        if (vehicleData && vehicleData.createdAt) {
          completeHistory.push({
            date: new Date(vehicleData.createdAt),
            type: "ENTRADA",
            detail: `Veículo entrou no estoque`
          });
        }

        // 2. Histórico de movimentação (status + localização)
        const movementHistory = await db.select({
          toPhysicalLocation: vehicleHistory.toPhysicalLocation,
          movedAt: vehicleHistory.movedAt,
          toStatus: vehicleHistory.toStatus,
        }).from(vehicleHistory)
          .where(eq(vehicleHistory.vehicleId, vehicleInContext.id))
          .orderBy(vehicleHistory.movedAt);

        movementHistory.forEach(move => {
          let detail = "";
          if (move.toStatus) detail += `Status: ${move.toStatus}`;
          if (move.toPhysicalLocation) detail += `${detail ? " | " : ""}Local: ${move.toPhysicalLocation}`;
          if (detail) {
            completeHistory.push({
              date: new Date(move.movedAt),
              type: "MOVIMENTAÇÃO",
              detail: detail
            });
          }
        });

        // 3. Histórico de custos
        const costHistory = await db.select({
          category: vehicleCosts.category,
          description: vehicleCosts.description,
          value: vehicleCosts.value,
          date: vehicleCosts.date,
        }).from(vehicleCosts)
          .where(eq(vehicleCosts.vehicleId, vehicleInContext.id));

        costHistory.forEach(cost => {
          completeHistory.push({
            date: new Date(cost.date),
            type: "CUSTO",
            detail: `${cost.category}: ${cost.description} - R$ ${Number(cost.value).toFixed(2)}`
          });
        });

        // 4. Histórico de documentos
        const docsHistory = await db.select({
          documentType: vehicleDocuments.documentType,
          uploadedAt: vehicleDocuments.uploadedAt,
        }).from(vehicleDocuments)
          .where(eq(vehicleDocuments.vehicleId, vehicleInContext.id));

        docsHistory.forEach(doc => {
          completeHistory.push({
            date: new Date(doc.uploadedAt),
            type: "DOCUMENTO",
            detail: `Documento: ${doc.documentType}`
          });
        });

        // 5. Histórico de observações do carro (filtradas por empresa)
        // Nota: storeObservations não tem vehicleId, então apenas mostramos no contexto geral
        // Se necessário no futuro, adicione um campo vehicleId à tabela storeObservations

        // 6. Venda (se houver)
        if (vehicleData && vehicleData.status === "Vendido" && vehicleData.dataVenda) {
          completeHistory.push({
            date: new Date(vehicleData.dataVenda),
            type: "VENDA",
            detail: `Vendido | Valor: R$ ${vehicleData.salePrice ? Number(vehicleData.salePrice).toFixed(2) : "N/A"} | Vendedor: ${vehicleData.vendedorNome || "N/A"}`
          });
        }

        // Ordenar cronologicamente
        completeHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Formatar e limitar a últimas 30 movimentações
        if (completeHistory.length > 0) {
          const relevantHistory = completeHistory.slice(-30);
          const historyText = relevantHistory.map(h => {
            const dateStr = new Date(h.date).toLocaleDateString('pt-BR');
            return `${dateStr} | ${h.type}: ${h.detail}`;
          }).join("\n");

          completeVehicleHistoryContext = `\n## HISTÓRICO COMPLETO (${vehicleInContext.brand.toUpperCase()} ${vehicleInContext.model.toUpperCase()}) - Últimos ${relevantHistory.length} eventos:\n${historyText}`;
        }
      }

      const systemContext = `${vehiclesContext}${repairContext}${leadsContext}${observationsContext}${soldContext}${costsContext}${billsContext}${commissionsContext}${followUpsContext}${remindersContext}${costApprovalsContext}${operationalExpensesContext}${sellersMetricsContext}${activityLogContext}${vehicleContextInfo}${completeVehicleHistoryContext}${documentsContext}`;

      const contextSummary = `CONTEXTO DA CONVERSA:\n- Tópico: ${conversationTopic}${vehicleInContext ? `\n- Veículo em foco: ${vehicleInContext.brand} ${vehicleInContext.model} ${vehicleInContext.year}` : ""}`;

      const prompt = `${historyText ? `Histórico completo:\n${historyText}\n\n` : ''}Última pergunta: ${sanitizedMessage}

Responda de forma CONCISA e DIRETA, respondendo APENAS o que foi perguntado, sem adicionar informações extras ou irrelevantes.${vehicleInContext ? `\n\nIMPORTANTE: Você está conversando sobre ${conversationTopic} do ${vehicleInContext.brand} ${vehicleInContext.model}. SEMPRE que perguntarem sobre ${conversationTopic}, comissões, custos ou detalhes deste veículo, responda APENAS sobre ESTE VEÍCULO ESPECÍFICO (ID: ${vehicleInContext.id}), não sobre outros carros.` : ""}`;

      const languageInstruction = isEnglish 
        ? `CRITICAL LANGUAGE RULE: You MUST respond ONLY in ENGLISH (American English). The user is using the English language setting. ALL responses, explanations, lists, and data MUST be in English. Use R$ for Brazilian monetary values but write everything else in English.`
        : `REGRA CRÍTICA DE IDIOMA: Você DEVE responder APENAS em PORTUGUÊS BRASILEIRO. Use formatação brasileira para datas (DD/MM/YYYY) e valores (R$ X.XXX,XX).`;

      const strategicKnowledge = getVelostockKnowledge(language);

      const veloStockSystemPrompt = `${languageInstruction}

You are VeloBot - the friendly virtual assistant of VeloStock for "${companyName}".

## YOUR PERSONALITY - THIS IS CRITICAL
${isEnglish 
? `You are a helpful colleague, not a robot. Talk naturally like a knowledgeable coworker:
- Be NATURAL and conversational - speak like a real person, not a manual
- Keep responses SHORT and CLEAR - don't list everything at once
- Answer the question directly first, then offer to explain more if needed
- Use contractions naturally - "I'll", "you're", "that's", "it's"
- Be warm but professional
- If someone asks "how does X work?", give a concise 2-3 sentence answer, not a full documentation

EXAMPLE of good natural response:
User: "how does the workflow work here?"
You: "Vehicles go through a simple flow: they arrive and get registered, then go through preparation (checklist, repairs, photos), and finally they're ready for sale. Would you like me to explain any specific part?"`
: `Você é um colega prestativo, não um robô. Fale naturalmente como alguém que conhece bem o sistema:
- Seja NATURAL e conversacional - fale como uma pessoa real, não como um manual
- Mantenha respostas CURTAS e CLARAS - não liste tudo de uma vez
- Responda a pergunta diretamente primeiro, depois ofereça explicar mais se precisar
- Use linguagem fluida e natural
- Seja cordial mas profissional
- Se perguntarem "como funciona X?", dê uma resposta concisa de 2-3 frases, não uma documentação completa

EXEMPLO de boa resposta natural:
Usuário: "olá, como funciona o fluxo aqui?"
Você: "Os veículos passam por um fluxo simples: chegam e são cadastrados, depois passam pela preparação (checklist, reparos, fotos) e ficam prontos para venda. Quer que eu explique alguma parte específica?"`}

## YOUR KNOWLEDGE
You know EVERYTHING about VeloStock:
- How the system works (features, workflows, integrations)
- Real-time data (vehicles, costs, leads, sales, bills)
- How to use each feature
- Best practices for dealerships

## STRATEGIC KNOWLEDGE BASE (COMPLETE SYSTEM DOCUMENTATION)
${strategicKnowledge}

## WHEN ASKED ABOUT THE SYSTEM
If the user asks strategic questions like:
- "What is VeloStock?" / "O que é o VeloStock?"
- "How does the system work?" / "Como funciona o sistema?"
- "What features do you have?" / "Quais recursos vocês têm?"
- "How do I..." / "Como faço para..."
- "What can VeloBot do?" / "O que o VeloBot pode fazer?"
- "Explain the workflow" / "Explique o fluxo de trabalho"
- "What are the user roles?" / "Quais são os papéis de usuário?"

USE the STRATEGIC KNOWLEDGE BASE above to give comprehensive, accurate answers about VeloStock capabilities.

## WHEN ASKED ABOUT OPERATIONAL DATA
If the user asks about their specific data (vehicles, costs, leads, etc.), use the SYSTEM DATA below.

## CURRENT USER CONTEXT
Company: ${companyName}
User Role: ${userRole}
Financial Data Access: ${canViewBills ? 'YES' : 'NO'}
Commission View Access: ${canViewCommissions ? 'YES' : 'NO'}

## ROLE-SPECIFIC ASSISTANCE - ADAPT TO USER'S ROLE
${isEnglish 
? `Based on the user role "${userRole}", you should:

${userRole === 'proprietario' ? `AS OWNER ASSISTANT:
- Help with financial control, margins, costs, and profit analysis
- Provide insights on team performance
- Alert about overdue bills or vehicles sitting too long
- Give strategic tips for the business
- Answer questions like: "Which vehicles have negative margins?", "How much did we spend this month?"` : ''}

${userRole === 'gerente' ? `AS MANAGER ASSISTANT:
- Help with team coordination and lead distribution
- Track pending cost approvals
- Monitor preparation bottlenecks
- Support with process optimization
- Answer questions like: "Any pending approvals?", "Which sellers need follow-up?"` : ''}

${userRole === 'vendedor' ? `AS SELLER ASSISTANT:
- Help craft messages to clients
- Suggest follow-up strategies for leads
- Provide vehicle information for negotiations
- Give sales tips and closing techniques
- Answer questions like: "Help me write a message for this client", "What should I say to reactivate this lead?"` : ''}

${userRole === 'motorista' ? `AS DRIVER ASSISTANT:
- Help with vehicle logistics and locations
- Track which vehicles need to be moved
- Answer questions about vehicle status
- Provide route/transport information` : ''}`
: `Baseado no papel "${userRole}", você deve:

${userRole === 'proprietario' ? `COMO ASSISTENTE DO PROPRIETÁRIO:
- Ajudar com controle financeiro, margens, custos e análise de lucro
- Fornecer insights sobre performance da equipe
- Alertar sobre contas vencendo ou veículos parados há muito tempo
- Dar dicas estratégicas para o negócio
- Responder perguntas como: "Quais veículos estão com margem negativa?", "Quanto gastamos este mês?"` : ''}

${userRole === 'gerente' ? `COMO ASSISTENTE DO GERENTE:
- Ajudar com coordenação da equipe e distribuição de leads
- Acompanhar aprovações de custos pendentes
- Monitorar gargalos na preparação
- Apoiar com otimização de processos
- Responder perguntas como: "Tem aprovações pendentes?", "Quais vendedores precisam de follow-up?"` : ''}

${userRole === 'vendedor' ? `COMO ASSISTENTE DO VENDEDOR:
- Ajudar a criar mensagens para clientes
- Sugerir estratégias de follow-up para leads
- Fornecer informações do veículo para negociações
- Dar dicas de vendas e técnicas de fechamento
- Responder perguntas como: "Me ajuda a escrever uma mensagem pro cliente", "O que falo pra reativar esse lead?"` : ''}

${userRole === 'motorista' ? `COMO ASSISTENTE DO MOTORISTA:
- Ajudar com logística e localização de veículos
- Acompanhar quais veículos precisam ser movidos
- Responder perguntas sobre status de veículos
- Fornecer informações de rota/transporte` : ''}`}

## ${contextSummary}

## DADOS DO SISTEMA (para sua referência)
${systemContext}

## ROLE DO USUÁRIO ATUAL
Papel: ${userRole}
Permissões de Visualização de Dados Financeiros: ${canViewBills ? 'SIM' : 'NÃO'}
Permissões de Visualização de Comissões: ${canViewCommissions ? 'SIM' : 'NÃO'}

## REGRA PRINCIPAL - FUNDAMENTAL: ENTENDA O CONTEXTO
**VOCÊ DEVE ENTENDER E MANTER CONTEXTO DA CONVERSA:**
1. **Histórico**: Leia o histórico completo para entender do que estão falando
2. **Tópico**: A conversa é sobre: ${conversationTopic}
3. **Veículo**: ${vehicleInContext ? `Estão falando sobre o ${vehicleInContext.brand} ${vehicleInContext.model}` : "Nenhum veículo específico em foco"}
4. **Resposta**: Responda APENAS sobre o que está sendo discutido. Se perguntam sobre custos deste carro, NÃO mostre custos de outros carros

## EXEMPLOS DE CONTEXT AWARENESS
SE a conversa é sobre "Chevrolet Onix" e custos:
- Pergunta: "quais foram os custos?"
- CORRETO: Liste APENAS os custos do Chevrolet Onix
- ERRADO: Liste custos de 15 carros diferentes

SE a conversa mudou para "localização":
- Pergunta: "onde está agora?"
- CORRETO: Responda sobre a localização do Onix
- ERRADO: Responda sobre localização geral de todos os carros

## COMPORTAMENTO CONVERSACIONAL
${isEnglish 
? `- Answer the question FIRST, then offer more details if relevant
- For numbers: present them naturally in a sentence ("You currently have 5 vehicles ready for sale")
- For lists: keep them concise unless more detail is requested
- Be natural - speak like a person, not a documentation
- If you don't have data, say so clearly ("I don't see any pending costs for that vehicle")`
: `- Responda a pergunta PRIMEIRO, depois ofereça mais detalhes se relevante
- Para números: apresente naturalmente em uma frase ("Você tem 5 veículos prontos para venda")
- Para listas: mantenha concisas, a menos que peçam mais detalhes
- Seja natural - fale como uma pessoa, não como documentação
- Se não tem dados, diga claramente ("Não encontrei custos pendentes para esse veículo")`}

## EXEMPLOS DE CONVERSA NATURAL

${isEnglish 
? `User: "how many cars do we have?"
You: "You currently have 12 vehicles - 5 ready for sale, 4 in preparation, and 3 sold this month. Would you like the full breakdown?"

User: "what about the Onix costs?"
You: "The Onix has R$ 1,500 in costs, mostly mechanical work: R$ 800 for brakes and R$ 700 for suspension. Want to see the complete history?"`
: `Usuário: "quantos carros a gente tem?"
Você: "Vocês têm 12 veículos no momento - 5 prontos para venda, 4 em preparação e 3 vendidos este mês. Quer ver a lista completa?"

Usuário: "e os custos do Onix?"
Você: "O Onix teve R$ 1.500 em custos, principalmente mecânica: R$ 800 de freio e R$ 700 de suspensão. Quer ver o histórico completo?"`}

## VELOBOT INTRODUCTION - WHEN ASKED "WHO ARE YOU?"
${isEnglish 
? `If asked "who are you?", respond naturally:
"I'm VeloBot, the virtual assistant of VeloStock. I can help you with anything about the system - from checking your inventory and costs to explaining how features work. Feel free to ask me anything!"`
: `Se perguntarem "quem é você?", responda naturalmente:
"Sou o VeloBot, o assistente virtual do VeloStock. Posso ajudar com qualquer coisa sobre o sistema - desde verificar seu estoque e custos até explicar como os recursos funcionam. Pode perguntar o que precisar!"`}

## TUTOR MODE - STEP BY STEP GUIDE
When user asks "how do I...", "how to...", "como faço para...", "como usar...", "tutorial", etc:

SWITCH TO TUTOR MODE. Give CLEAR, DIRECT instructions in numbered steps.

Use the STRATEGIC KNOWLEDGE BASE to provide accurate step-by-step guidance for any VeloStock feature.

MAIN FEATURES GUIDE:
- INVENTORY: View, add, edit, filter vehicles
- LEADS: Create, update status, track negotiations
- SALES: Mark as sold, register commissions
- COSTS: Add expenses, categorize, track totals
- OBSERVATIONS: Log problems, resolve issues
- BILLS: Manage accounts payable/receivable (owners/managers only)
- FILTERS: Search by status, location, brand, seller
- ANALYTICS: View sales and performance metrics

## ${isEnglish ? "WHAT NEVER TO DO" : "O QUE NUNCA FAZER"}
${isEnglish 
? `- Never add "If you need more information..."
- Never list unsolicited data (e.g., talking about inventory when asked about bills)
- Never offer extra help or resources
- Never use excessive formatting when unnecessary
- Never respond with false information or assumptions`
: `- Nunca adicionar "Se precisar de mais informações..."
- Nunca listar dados não solicitados (ex: falar de estoque quando perguntam de contas)
- Nunca oferecer ajuda ou recursos extra
- Nunca usar formatação excessiva quando não necessária
- Nunca responder com informações falsas ou assumptions`}

## ${isEnglish ? "FOR EXTERNAL CUSTOMERS/BUYERS" : "PARA CLIENTES/COMPRADORES"}
${isEnglish 
? "If you recognize an external customer, speak only about available vehicles concisely."
: "Se reconhecer que é cliente externo, fale apenas sobre veículos disponíveis de forma concisa"}`;

      const response = await generateCompletion(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 800,
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

      const { fipePrice, targetMarginPercent = 20, language = "pt-BR" } = req.body;

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

ESTRUTURA DA JUSTIFICATIVA (OBRIGATÓRIA):
A justificativa DEVE incluir:
1. Cálculo base: "Custo total R$ X + margem de Y% = R$ Z"
2. Análise de KM: "Quilometragem está X% abaixo/acima do esperado, o que justifica [premium/desconto]"
3. Comparação com similares: "Comparado com similares, este veículo está [mais caro/mais barato/competitivo]"
4. Fatores adicionais: Tempo em estoque, sazonalidade, condições específicas
5. Conclusão: "Preço sugerido: R$ X é [competitivo/premium/agressivo] por causa de [motivos principais]"

Exemplo de justificativa PLAUSÍVEL:
"Custo total R$ 40.000 + 20% de margem = R$ 48.000. Como o carro está com 50.000 km (77% abaixo do esperado para 2010), aplicamos prêmio de 12% = R$ 53.760. Similares estão entre R$ 52.000-56.000. Preço de R$ 53.500 é competitivo considerando o km excepcional e 8 dias em estoque."

Analise TODOS esses fatores e retorne um preço estratégico com justificativa PLAUSÍVEL que cite dados concretos.

${language === "en-US" ? "IMPORTANT: Write ALL reasoning and recommendation text in English." : "IMPORTANTE: Escreva TODA a justificativa e recomendação em português brasileiro."}

Retorne APENAS JSON válido (sem markdown): { "suggestedPrice": 00000.00, "reasoning": "justificativa detalhada com cálculos e fatores específicos", "recommendation": "recomendação de ação" }`;

      const priceSystemPrompt = language === "en-US"
        ? "You are a used vehicle pricing consultant. Provide precise and strategic analyses. All text must be in English."
        : "Você é um consultor de precificação de veículos seminovos. Forneça análises precisas e estratégicas.";

      const result = await generateJSON(prompt, {
        model: "gpt-4o-mini",
        temperature: 0.5,
        maxTokens: 500,
        systemPrompt: priceSystemPrompt,
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
