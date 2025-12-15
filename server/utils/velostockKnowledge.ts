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

### DIFERENCIAIS COMPETITIVOS
- Interface moderna estilo Kanban (inspirada no Trello/Notion)
- IA integrada em múltiplos pontos
- Sistema bilíngue completo
- Multi-tenant white-label
- Checklist de entrada completo
- Gestão de localização física
- Aprovação de custos
- Comissões automáticas
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

### COMPETITIVE DIFFERENTIATORS
- Modern Kanban-style interface (inspired by Trello/Notion)
- AI integrated at multiple points
- Complete bilingual system
- Multi-tenant white-label
- Complete entry checklist
- Physical location management
- Cost approval workflow
- Automatic commissions

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
