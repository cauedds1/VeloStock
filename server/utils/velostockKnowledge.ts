export const velostockKnowledgeBase = {
  "pt-BR": `
## CONHECIMENTO COMPLETO DO VELOSTOCK - BASE DE CONHECIMENTO ESTRATÉGICO

### O QUE É O VELOSTOCK?
O VeloStock é um sistema SaaS completo de gestão para revendas de veículos (carros, motos, caminhões). É uma solução multi-tenant white-label que ajuda concessionárias a gerenciar todo o ciclo de vida dos veículos, desde a entrada no estoque até a venda final.

### PRINCIPAIS RECURSOS E FUNCIONALIDADES

#### 1. GESTÃO DE ESTOQUE (Kanban Visual)
- **Pipeline Visual**: Os veículos passam por etapas visuais: Entrada → Preparação → Pronto → Vendido → Arquivado
- **Drag & Drop**: Arraste veículos entre colunas para mudar status
- **Filtros Inteligentes**: Filtre por marca, modelo, ano, cor, status, localização, vendedor
- **Localização Física**: Rastreie onde cada veículo está (Loja, Oficina, Lavagem, Detailing, etc.)
- **Fotos e Documentos**: Upload de múltiplas fotos e documentos por veículo
- **Checklist de Entrada**: Avaliação completa do veículo na entrada com 50+ itens verificáveis

#### 2. GESTÃO DE CUSTOS
- **Categorias de Custos**: Mecânica, Estética, Documentação, Comissões, Outros
- **Aprovação de Custos**: Custos podem requerer aprovação do gerente/proprietário
- **Custo Total Calculado**: Sistema calcula automaticamente custo total por veículo
- **Margem de Lucro**: Visualize margem em tempo real baseado em preço de compra + custos vs preço de venda

#### 3. LEADS E CRM
- **Captação de Leads**: Registre interessados com nome, telefone, email, veículo de interesse
- **Status de Negociação**: Novo → Contato → Negociando → Convertido/Perdido
- **Follow-ups Agendados**: Agende lembretes para acompanhar leads
- **Histórico de Contatos**: Registre todas as interações com o cliente
- **Conversão**: Converta lead em venda com um clique
- **Temperatura do Lead**: Quente (contato recente) / Frio (sem contato há dias)

#### 4. PROCESSO DE VENDA
- **Registro de Venda**: Marque veículo como vendido com dados completos
- **Informações da Venda**: Valor de venda, data, vendedor, comprador, forma de pagamento
- **Comissão Automática**: Sistema cria automaticamente conta a pagar de comissão para o vendedor
- **Documentação**: Gere contratos e recibos

#### 5. CONTAS A PAGAR/RECEBER
- **Contas a Pagar**: Registre despesas, fornecedores, aluguel, etc.
- **Contas a Receber**: Registre entradas, financiamentos, parcelas
- **Vencimentos**: Alertas de contas vencendo hoje, amanhã, esta semana
- **Status**: Pendente, Pago, Vencido, Cancelado
- **Vinculação a Veículos**: Vincule contas a veículos específicos

#### 6. DESPESAS OPERACIONAIS
- **Custos Fixos**: Aluguel, água, luz, internet, funcionários
- **Custos Variáveis**: Combustível, material de escritório
- **Relatórios Mensais**: Visualize gastos por categoria

#### 7. COMISSÕES
- **Comissão por Venda**: Defina percentual ou valor fixo por venda
- **Pagamento de Comissões**: Gere contas a pagar automaticamente
- **Histórico**: Veja todas as comissões por vendedor

#### 8. OBSERVAÇÕES DA LOJA
- **Registro de Problemas**: Anote problemas encontrados (ar condicionado quebrado, porta com defeito, etc.)
- **Prioridade**: Alta, Média, Baixa
- **Resolução**: Marque como resolvido quando concluído
- **Vinculação**: Vincule a veículos específicos

#### 9. ANALYTICS E MÉTRICAS
- **Dashboard**: Visão geral de veículos por status
- **Vendas do Mês**: Total vendido, valor, ticket médio
- **Tempo Médio em Estoque**: Quantos dias cada veículo fica parado
- **Ranking de Vendedores**: Quem vendeu mais
- **Leads por Status**: Quantos leads em cada etapa

#### 10. RECURSOS DE IA
- **Gerador de Anúncios**: Crie textos para Instagram, Facebook, OLX, Webmotors com IA
- **VeloBot**: Assistente virtual que responde perguntas sobre o estoque, custos, vendas
- **Sugestão de Preços**: IA sugere preços baseados no mercado
- **Análise de Desempenho**: IA analisa performance dos vendedores

### PAPÉIS DE USUÁRIOS E PERMISSÕES

#### PROPRIETÁRIO (Dono)
- Acesso TOTAL a todas as funcionalidades
- Visualiza todos os dados financeiros
- Gerencia usuários e permissões
- Configura a empresa

#### GERENTE
- Acesso a veículos, leads, vendas
- Visualiza dados financeiros
- Aprova custos
- Gerencia equipe de vendedores

#### VENDEDOR
- Acesso apenas aos seus veículos e leads
- Registra vendas
- Não visualiza dados financeiros gerais
- Não vê comissões de outros vendedores

#### MOTORISTA
- Acesso limitado
- Visualiza veículos para transporte
- Atualiza localização física

### FLUXO DE TRABALHO TÍPICO

1. **ENTRADA**: Veículo chega → Preenche dados → Faz checklist → Tira fotos
2. **PREPARAÇÃO**: Envia para oficina/lavagem → Registra custos → Aguarda ficar pronto
3. **PRONTO PARA VENDA**: Define preço → Gera anúncios → Publica nas plataformas
4. **NEGOCIAÇÃO**: Recebe leads → Faz follow-ups → Negocia preço
5. **VENDA**: Fecha negócio → Registra venda → Gera comissão → Emite documentos
6. **PÓS-VENDA**: Arquiva veículo → Atualiza métricas → Paga comissões

### INTEGRAÇÕES E TECNOLOGIAS
- **FIPE**: Consulta tabela FIPE para preços de referência
- **OpenAI**: IA para geração de conteúdo e assistente virtual
- **SendGrid/Resend**: Envio de emails
- **WebSockets**: Atualizações em tempo real

### MULTI-TENANCY
- Cada empresa tem seus dados isolados
- Usuários só veem dados da sua empresa
- Configurações personalizadas por empresa (logo, nome, cores)

### IDIOMAS SUPORTADOS
- Português Brasileiro (pt-BR) - Padrão
- Inglês Americano (en-US)
- Todas as interfaces e conteúdos IA são traduzidos

### BENEFÍCIOS DO VELOSTOCK
1. **Organização**: Tudo em um só lugar
2. **Controle Financeiro**: Saiba exatamente seus custos e lucros
3. **Agilidade**: Reduza tempo de preparação e venda
4. **Profissionalismo**: Anúncios de qualidade, follow-ups em dia
5. **Decisões Baseadas em Dados**: Analytics para melhorar resultados
6. **Equipe Alinhada**: Todos sabem o status de cada veículo
7. **Segurança**: Permissões por papel garantem privacidade dos dados

---

## GUIAS ESTRATÉGICOS POR PAPEL DE USUÁRIO

### GUIA DO VENDEDOR - FOCO EM CONVERSÃO

**Seu dia a dia:**
1. Verificar seus leads pendentes logo cedo
2. Fazer follow-up dos leads quentes (contato < 2 dias)
3. Responder leads novos rapidamente (velocidade = conversão)
4. Atualizar status das negociações
5. Verificar veículos prontos para ofertar

**Dicas de mensagens para clientes:**
- **Primeiro contato**: "Olá [Nome]! Vi que você se interessou pelo [Veículo]. Está disponível e posso te enviar mais fotos/vídeos. Qual horário seria bom para conversarmos?"
- **Follow-up após visita**: "Olá [Nome]! Foi um prazer te receber. O [Veículo] continua reservado para você. Posso ajudar com algo mais?"
- **Reativação de lead frio**: "Olá [Nome]! Lembrei de você. Temos novidades no estoque que combinam com o que você procurava. Posso te mostrar?"
- **Negociação de preço**: "Entendo sua proposta. Deixa eu verificar internamente o melhor que posso fazer e te retorno ainda hoje."
- **Fechamento**: "Ótima escolha! Vou preparar toda a documentação. Quando você consegue vir para finalizarmos?"

**Métricas que você deve acompanhar:**
- Taxa de conversão (leads → vendas)
- Tempo médio de resposta aos leads
- Leads quentes vs frios
- Suas vendas do mês

### GUIA DO PROPRIETÁRIO - FOCO EM CONTROLE E LUCRO

**Seu dia a dia:**
1. Verificar resumo financeiro (entradas x saídas)
2. Aprovar custos pendentes
3. Verificar contas vencendo
4. Analisar margem dos veículos
5. Acompanhar performance da equipe

**Indicadores importantes:**
- **Margem por veículo**: Preço venda - (Compra + Custos) = Lucro
- **Tempo médio em estoque**: Carros parados = dinheiro parado
- **Custo operacional mensal**: Aluguel + funcionários + despesas fixas
- **Ticket médio**: Valor médio das vendas
- **ROI por veículo**: Quanto cada carro retornou de lucro

**Dicas de gestão financeira:**
- Defina limite de custo por veículo (ex: máximo 15% do valor de compra)
- Acompanhe veículos há mais de 60 dias em estoque (considere promoção)
- Mantenha reserva de caixa para oportunidades
- Compare custo real vs estimado para melhorar precificação

**Perguntas que você deveria fazer regularmente:**
- "Quais veículos estão com margem negativa?"
- "Quanto gastamos em custos este mês?"
- "Quais contas vencem esta semana?"
- "Qual vendedor está performando melhor?"
- "Quantos dias em média os carros ficam parados?"

### GUIA DO GERENTE - FOCO EM EQUIPE E OPERAÇÃO

**Seu dia a dia:**
1. Verificar custos pendentes de aprovação
2. Acompanhar leads da equipe
3. Verificar veículos em preparação (evitar gargalos)
4. Resolver problemas/observações pendentes
5. Apoiar vendedores em negociações difíceis

**Gestão da equipe:**
- Distribua leads de forma equilibrada
- Acompanhe tempo de resposta de cada vendedor
- Identifique vendedores que precisam de coaching
- Celebre vendas e resultados positivos

**Otimização de processos:**
- Veículos não devem ficar mais de 3 dias em preparação
- Custos devem ser aprovados no mesmo dia
- Leads novos devem ser contatados em até 2 horas
- Problemas devem ser resolvidos em até 48 horas

### GUIA DO MOTORISTA - FOCO EM LOGÍSTICA

**Seu dia a dia:**
1. Verificar veículos para transportar
2. Atualizar localização ao mover veículos
3. Reportar qualquer problema encontrado

**Boas práticas:**
- Sempre atualize a localização no sistema ao mover um veículo
- Tire foto se encontrar algum problema novo
- Comunique atrasos com antecedência

---

## DICAS ESTRATÉGICAS PROATIVAS

### PARA AUMENTAR VENDAS
1. Responda leads em menos de 5 minutos (aumenta 21x a chance de conversão)
2. Faça follow-up em até 48 horas após primeiro contato
3. Use fotos de qualidade nos anúncios
4. Mantenha descrições completas e honestas
5. Ofereça test-drive sempre que possível

### PARA REDUZIR CUSTOS
1. Negocie com fornecedores fixos (oficinas, lavanderias)
2. Agrupe serviços similares para desconto por volume
3. Evite reparos desnecessários - foque no essencial
4. Compare orçamentos antes de aprovar custos altos

### PARA MELHORAR ORGANIZAÇÃO
1. Mantenha o Kanban sempre atualizado
2. Não deixe veículos em "preparação" por mais de 1 semana
3. Complete checklists de entrada no mesmo dia
4. Resolva observações pendentes diariamente

### PARA GESTÃO DE ESTOQUE
1. Veículos populares: priorize preparação
2. Veículos há +60 dias: considere reduzir preço
3. Veículos há +90 dias: ação urgente necessária
4. Mantenha mix equilibrado (populares + premium)
`,

  "en-US": `
## VELOSTOCK COMPLETE KNOWLEDGE - STRATEGIC KNOWLEDGE BASE

### WHAT IS VELOSTOCK?
VeloStock is a complete SaaS management system for vehicle dealerships (cars, motorcycles, trucks). It's a multi-tenant white-label solution that helps dealerships manage the entire vehicle lifecycle, from inventory entry to final sale.

### MAIN FEATURES AND FUNCTIONALITIES

#### 1. INVENTORY MANAGEMENT (Visual Kanban)
- **Visual Pipeline**: Vehicles go through visual stages: Entry → Preparation → Ready → Sold → Archived
- **Drag & Drop**: Drag vehicles between columns to change status
- **Smart Filters**: Filter by brand, model, year, color, status, location, seller
- **Physical Location**: Track where each vehicle is (Store, Workshop, Car Wash, Detailing, etc.)
- **Photos and Documents**: Upload multiple photos and documents per vehicle
- **Entry Checklist**: Complete vehicle evaluation at entry with 50+ verifiable items

#### 2. COST MANAGEMENT
- **Cost Categories**: Mechanical, Aesthetic, Documentation, Commissions, Others
- **Cost Approval**: Costs may require manager/owner approval
- **Calculated Total Cost**: System automatically calculates total cost per vehicle
- **Profit Margin**: View real-time margin based on purchase price + costs vs selling price

#### 3. LEADS AND CRM
- **Lead Capture**: Register interested parties with name, phone, email, vehicle of interest
- **Negotiation Status**: New → Contact → Negotiating → Converted/Lost
- **Scheduled Follow-ups**: Schedule reminders to follow up with leads
- **Contact History**: Record all interactions with the customer
- **Conversion**: Convert lead to sale with one click
- **Lead Temperature**: Hot (recent contact) / Cold (no contact for days)

#### 4. SALES PROCESS
- **Sale Registration**: Mark vehicle as sold with complete data
- **Sale Information**: Sale value, date, seller, buyer, payment method
- **Automatic Commission**: System automatically creates payable account for seller commission
- **Documentation**: Generate contracts and receipts

#### 5. ACCOUNTS PAYABLE/RECEIVABLE
- **Accounts Payable**: Register expenses, suppliers, rent, etc.
- **Accounts Receivable**: Register income, financing, installments
- **Due Dates**: Alerts for bills due today, tomorrow, this week
- **Status**: Pending, Paid, Overdue, Canceled
- **Vehicle Linking**: Link bills to specific vehicles

#### 6. OPERATIONAL EXPENSES
- **Fixed Costs**: Rent, water, electricity, internet, employees
- **Variable Costs**: Fuel, office supplies
- **Monthly Reports**: View spending by category

#### 7. COMMISSIONS
- **Commission per Sale**: Set percentage or fixed amount per sale
- **Commission Payment**: Generate payable accounts automatically
- **History**: See all commissions by seller

#### 8. STORE OBSERVATIONS
- **Problem Logging**: Note problems found (broken AC, door defect, etc.)
- **Priority**: High, Medium, Low
- **Resolution**: Mark as resolved when completed
- **Linking**: Link to specific vehicles

#### 9. ANALYTICS AND METRICS
- **Dashboard**: Overview of vehicles by status
- **Monthly Sales**: Total sold, value, average ticket
- **Average Time in Stock**: How many days each vehicle sits
- **Seller Ranking**: Who sold the most
- **Leads by Status**: How many leads at each stage

#### 10. AI FEATURES
- **Ad Generator**: Create texts for Instagram, Facebook, OLX, Webmotors with AI
- **VeloBot**: Virtual assistant that answers questions about inventory, costs, sales
- **Price Suggestions**: AI suggests prices based on market
- **Performance Analysis**: AI analyzes seller performance

### USER ROLES AND PERMISSIONS

#### OWNER (Proprietário)
- FULL access to all functionalities
- Views all financial data
- Manages users and permissions
- Configures the company

#### MANAGER (Gerente)
- Access to vehicles, leads, sales
- Views financial data
- Approves costs
- Manages sales team

#### SELLER (Vendedor)
- Access only to their vehicles and leads
- Registers sales
- Does not view general financial data
- Does not see other sellers' commissions

#### DRIVER (Motorista)
- Limited access
- Views vehicles for transport
- Updates physical location

### TYPICAL WORKFLOW

1. **ENTRY**: Vehicle arrives → Fill in data → Do checklist → Take photos
2. **PREPARATION**: Send to workshop/car wash → Register costs → Wait until ready
3. **READY FOR SALE**: Set price → Generate ads → Publish on platforms
4. **NEGOTIATION**: Receive leads → Do follow-ups → Negotiate price
5. **SALE**: Close deal → Register sale → Generate commission → Issue documents
6. **POST-SALE**: Archive vehicle → Update metrics → Pay commissions

### INTEGRATIONS AND TECHNOLOGIES
- **FIPE**: Query FIPE table for reference prices (Brazilian vehicle pricing)
- **OpenAI**: AI for content generation and virtual assistant
- **SendGrid/Resend**: Email sending
- **WebSockets**: Real-time updates

### MULTI-TENANCY
- Each company has isolated data
- Users only see their company's data
- Custom settings per company (logo, name, colors)

### SUPPORTED LANGUAGES
- Brazilian Portuguese (pt-BR) - Default
- American English (en-US)
- All interfaces and AI content are translated

### VELOSTOCK BENEFITS
1. **Organization**: Everything in one place
2. **Financial Control**: Know exactly your costs and profits
3. **Agility**: Reduce preparation and sales time
4. **Professionalism**: Quality ads, timely follow-ups
5. **Data-Driven Decisions**: Analytics to improve results
6. **Aligned Team**: Everyone knows the status of each vehicle
7. **Security**: Role-based permissions ensure data privacy

---

## STRATEGIC GUIDES BY USER ROLE

### SELLER GUIDE - FOCUS ON CONVERSION

**Your daily routine:**
1. Check your pending leads first thing in the morning
2. Follow up on hot leads (contact < 2 days)
3. Respond to new leads quickly (speed = conversion)
4. Update negotiation status
5. Check vehicles ready to offer

**Tips for customer messages:**
- **First contact**: "Hello [Name]! I saw you're interested in the [Vehicle]. It's available and I can send you more photos/videos. What time would be good to chat?"
- **Post-visit follow-up**: "Hello [Name]! It was a pleasure meeting you. The [Vehicle] is still reserved for you. Can I help with anything else?"
- **Cold lead reactivation**: "Hello [Name]! I remembered you. We have new arrivals that match what you were looking for. Want me to show you?"
- **Price negotiation**: "I understand your offer. Let me check internally for the best I can do and get back to you today."
- **Closing**: "Great choice! I'll prepare all the documentation. When can you come to finalize?"

**Metrics you should track:**
- Conversion rate (leads → sales)
- Average response time to leads
- Hot vs cold leads
- Your monthly sales

### OWNER GUIDE - FOCUS ON CONTROL AND PROFIT

**Your daily routine:**
1. Check financial summary (income vs expenses)
2. Approve pending costs
3. Check upcoming due bills
4. Analyze vehicle margins
5. Monitor team performance

**Important indicators:**
- **Margin per vehicle**: Sale price - (Purchase + Costs) = Profit
- **Average time in stock**: Idle cars = idle money
- **Monthly operational cost**: Rent + employees + fixed expenses
- **Average ticket**: Average sale value
- **ROI per vehicle**: How much profit each car returned

**Financial management tips:**
- Set cost limit per vehicle (e.g., max 15% of purchase value)
- Track vehicles over 60 days in stock (consider promotion)
- Keep cash reserve for opportunities
- Compare actual vs estimated costs to improve pricing

**Questions you should ask regularly:**
- "Which vehicles have negative margins?"
- "How much did we spend on costs this month?"
- "What bills are due this week?"
- "Which seller is performing best?"
- "How many days on average do cars sit?"

### MANAGER GUIDE - FOCUS ON TEAM AND OPERATIONS

**Your daily routine:**
1. Check pending cost approvals
2. Monitor team leads
3. Check vehicles in preparation (avoid bottlenecks)
4. Resolve pending issues/observations
5. Support sellers in difficult negotiations

**Team management:**
- Distribute leads evenly
- Track each seller's response time
- Identify sellers needing coaching
- Celebrate sales and positive results

**Process optimization:**
- Vehicles should not stay in preparation for more than 3 days
- Costs should be approved same day
- New leads should be contacted within 2 hours
- Issues should be resolved within 48 hours

### DRIVER GUIDE - FOCUS ON LOGISTICS

**Your daily routine:**
1. Check vehicles to transport
2. Update location when moving vehicles
3. Report any problems found

**Best practices:**
- Always update location in the system when moving a vehicle
- Take photos if you find any new problem
- Communicate delays in advance

---

## PROACTIVE STRATEGIC TIPS

### TO INCREASE SALES
1. Respond to leads within 5 minutes (21x higher conversion chance)
2. Follow up within 48 hours of first contact
3. Use quality photos in ads
4. Keep descriptions complete and honest
5. Offer test drives whenever possible

### TO REDUCE COSTS
1. Negotiate with regular suppliers (workshops, car washes)
2. Bundle similar services for volume discounts
3. Avoid unnecessary repairs - focus on essentials
4. Compare quotes before approving high costs

### TO IMPROVE ORGANIZATION
1. Keep the Kanban always updated
2. Don't leave vehicles in "preparation" for more than 1 week
3. Complete entry checklists same day
4. Resolve pending observations daily

### TO MANAGE INVENTORY
1. Popular vehicles: prioritize preparation
2. Vehicles 60+ days: consider price reduction
3. Vehicles 90+ days: urgent action needed
4. Maintain balanced mix (popular + premium)

---

### FREQUENTLY ASKED QUESTIONS

**Q: How do I add a new vehicle?**
A: Click "Add Vehicle" button, fill in the basic info (brand, model, year, color, plate), set the physical location, and save.

**Q: How do I mark a car as sold?**
A: Open the vehicle details, click on "Mark as Sold" or drag to the "Sold" column, fill in sale details (price, buyer, seller, date).

**Q: How do costs work?**
A: Each vehicle can have multiple costs in categories. Go to vehicle details > Costs tab > Add cost with category, description and value.

**Q: How does the commission system work?**
A: When a vehicle is sold, the system can automatically create a payable account for the seller's commission based on your configured rules.

**Q: Can I control who sees financial data?**
A: Yes! Only Owners and Managers can see financial data. Sellers only see their own sales and leads.

**Q: How do I generate ads for my vehicles?**
A: Open vehicle details > click "Generate Ads" > AI will create optimized texts for Instagram, Facebook, OLX and other platforms.

**Q: What is the VeloBot?**
A: VeloBot is an intelligent virtual assistant that can answer questions about your inventory, costs, leads, and sales in real-time.
`
};

export function getVelostockKnowledge(language: string): string {
  return velostockKnowledgeBase[language as keyof typeof velostockKnowledgeBase] || velostockKnowledgeBase["pt-BR"];
}
