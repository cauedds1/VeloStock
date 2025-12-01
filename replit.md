# VeloStock - Universal Multi-Tenant SaaS

## 📦 Sistema de Backup e Migração de Dados

**IMPORTANTE**: Este projeto possui um sistema completo de backup que preserva TODOS os dados (usuários, carros, observações, etc.) para migração entre contas Replit ou restauração.

### 🚀 Push Automático com Backup COMPLETO (RECOMENDADO)

**Ao invés de `git push`, use:**
```bash
npm run push-full
```

Isso automaticamente faz backup de:
1. ✅ Banco de DESENVOLVIMENTO (dados de teste)
2. ✅ Banco de PRODUÇÃO (dados reais do dono da revenda)
3. ✅ Adiciona ambos ao Git
4. ✅ Envia tudo junto pro GitHub

**Resultado**: Se você perder a conta Replit, pode recuperar TUDO em outra conta - o dono da revenda terá todos os dados (usuários, senhas, carros, observações) funcionando imediatamente!

#### Configuração Inicial (uma vez):
1. Deployments > Deployment ativo > Environment variables
2. Copie DATABASE_URL
3. Secrets (cadeado) > New Secret: `DATABASE_URL_PRODUCTION` = (URL copiada)

### Comandos Disponíveis:
- `npm run push-full` - Push com backup de DEV + PROD (RECOMENDADO)
- `npm run push-prod` - Push com backup só de PRODUÇÃO
- `npm run push` - Push com backup só de DESENVOLVIMENTO
- `npm run db:backup` - Backup manual de desenvolvimento
- `npm run db:backup-prod` - Backup manual de produção
- `npm run db:restore-prod <arquivo>` - Restaurar dados de produção
- `npm run db:list-backups` - Listar todos os backups

📖 **Documentação completa**: 
- `GUIA_SIMPLES.md` - Guia ultra-simplificado ⭐ **LEIA PRIMEIRO**
- `GUIA_COMPLETO_PRODUCAO.md` - Guia completo passo a passo
- `README.md` - Documentação principal do projeto

---

## Overview
VeloStock is a universal multi-tenant SaaS platform for comprehensive vehicle dealership and store management. It originated from "Capoeiras Automóveis" and has evolved into a white-label solution for any automotive business. The system manages vehicles from intake to sale using a Kanban-style workflow, tracks detailed costs, and incorporates AI for price suggestions and ad generation. Key features include intelligent alerts, complete store operations, and inventory management. The application is localized in Brazilian Portuguese (pt-BR) and features a modern, professional design. Its business vision is to provide a scalable, secure, and feature-rich platform to streamline operations for automotive dealerships, enhancing efficiency and profitability through advanced tools and multi-tenancy.

## User Preferences
Preferred communication style: Simple, everyday language.

## Authentication System

### Email Verification & Recovery (November 27, 2025)
- **Signup Verification**: 2-step process (create account → verify email)
  - Step 1: User creates account with email/password
  - Step 2: 6-digit verification code sent via email (15-minute expiry)
  - Email marked as `emailVerified: "true"` after verification
  - Routes: `/api/auth/signup-step1` and `/api/auth/verify-signup-email`
  - **Important**: Account is ONLY created after email is successfully sent
  - User CANNOT login without email verification
  
- **Password Recovery**: 3-step process
  - `POST /api/auth/forgot-password` - Generate code and send email
  - `POST /api/auth/verify-reset-code` - Validate code
  - `POST /api/auth/reset-password` - Update password with bcrypt
  - Code expires in 15 minutes
  - Frontend pages: `/forgot-password` and `/reset-password`
  - Resend code button available with 60-second cooldown

- **Email Delivery**: 
  - Primary: SendGrid integration (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`)
  - Fallback: Logs verification codes to server console with visual formatting
  - HTML-formatted emails with VeloStock branding (purple/green gradient)
  - Automatic code generation and expiry management (6 digits, 15 min validity)

## System Architecture

### UI/UX Decisions
The frontend utilizes React with TypeScript, Vite, Tailwind CSS, Radix UI primitives, and shadcn/ui (New York variant). It features a dynamic theming system with company-specific colors and logos, a base palette of purple and green, and typography using Inter or IBM Plex Sans. Design principles blend Material Design with Linear/Notion aesthetics, focusing on consistent spacing. Key UI patterns include Kanban boards with drag-and-drop, tab-based detail views, modal dialogs, toast notifications, interactive analytics, and a NotificationCenter.

### Technical Implementations
**Frontend:**
- **Technology Stack**: React, TypeScript, Vite, Wouter, TanStack React Query, Tailwind CSS.
- **State Management**: React Query for server state, React hooks for local state, React Hook Form with Zod for form validation.
- **Key Features**: Vehicle management (dynamic smart filtering by location/status/brand with unique options extracted from vehicles, persistent filter preferences in localStorage), physical location tracking (7 predefined + custom), document management (PDF upload/download), intelligent alerts, AI features (price suggestions, ad generation in 3 styles), enhanced dashboard with 6 key metrics (Total em Estoque correctly excludes Vendidos/Arquivados), user management (role-based permissions, invite users), first-time setup onboarding, theme customization, streamlined sale workflow with inline vendor selection and "repassado" toggle directly in ChangeLocationDialog when status is "Vendido" (hides location fields and shows vendor dropdown, repasse toggle, and optional sale price field) plus automatic commission creation, and complete Bills system (Contas a Pagar/Receber) with RBAC.

**Backend:**
- **Technology Stack**: Node.js with Express.js, TypeScript, PostgreSQL (via Neon serverless driver), Drizzle ORM.
- **API Design**: RESTful API (JSON), Multer for file uploads, WebSocket for real-time updates.
- **Authentication**: Email/password authentication using bcrypt, passport-local strategy, and PostgreSQL session store (30-day TTL). Google OAuth has been removed.
- **Multi-Tenant Security**: Complete data isolation enforced via `empresaId` validation on all routes and queries, preventing cross-company data access.
- **Role-Based Access Control (RBAC)**: Four roles (Proprietário, Gerente, Vendedor, Motorista) with granular permissions managed by middleware.
- **Key Entities**: Vehicle status pipeline (Entrada to Arquivado), cost categories (Mecânica, Estética, Documentação, Outros), commission system with automatic commission_payments creation when vehicle marked as "Vendido".
- **File Storage**: Images are stored as Base64 in the database. Documents are stored on disk at `/uploads/vehicles/<vehicleId>/`.
- **Automatic Commission Creation**: When a vehicle is marked as "Vendido", the system automatically creates a commission payment record (status: "A Pagar") for the seller based on their configured commission percentage, visible to proprietários.

### System Design Choices
- **Multi-tenancy**: Full data isolation per company (`empresaId`) across all tables and API routes.
- **Role-Based Access Control (RBAC)**: Implemented with four distinct user roles, each with specific feature access.
- **Data Flow**: Client (TanStack Query) -> Express API -> Drizzle ORM -> PostgreSQL, with React Query handling caching.
- **Deployment**: Designed for autoscale, utilizing an external Neon PostgreSQL database with connection pooling for production. Build process uses Vite and esbuild.

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL with connection pooling.
- **Drizzle ORM**: Type-safe ORM for PostgreSQL.
- **connect-pg-simple**: PostgreSQL session store.

### AI Integration
- **OpenAI API**: Utilizes GPT-4o-mini for AI-powered features:
  - **LeadAssistant**: Generates personalized response suggestions for leads with WhatsApp integration
  - **ChatbotWidget**: Floating AI assistant for FAQ and general customer inquiries
  - **AdGeneratorMulti**: Creates optimized ads for multiple platforms (Instagram, Facebook, OLX, WhatsApp)
  - **SellerAnalysisDialog**: AI-powered seller performance analysis with recommendations
  - **CoachingCard**: Provides daily coaching tips for sellers based on their performance
  - Price suggestions based on vehicle characteristics
  - Ad text generation in multiple styles
- **FIPE API**: Free proxy integration (Parallelum API) for real-time vehicle pricing data.
  - Rate limiting protection with retry logic (exponential backoff)
  - Type-ahead search with Command component for filtering brands/models/years
  - Automatic delay between API calls to prevent 429 errors
  - Limited to 3 concurrent model searches for version lookup

### AI Components (November 2025)
Frontend components for AI features:
- `client/src/components/LeadAssistant.tsx` - Response suggestions for leads
- `client/src/components/ChatbotWidget.tsx` - Floating chatbot widget (visible when logged in)
- `client/src/components/AdGeneratorMulti.tsx` - Multi-platform ad generator
- `client/src/components/SellerAnalysisDialog.tsx` - Seller performance analysis
- `client/src/components/CoachingCard.tsx` - Daily coaching tips

Backend AI routes:
- `server/routes/ai.ts` - All AI endpoints consolidated with VeloBot omniscient context
- `server/utils/openai.ts` - OpenAI integration utilities

### VeloBot - Omniscient AI Assistant (November 29, 2025)
**VeloBot has access to 15+ comprehensive data contexts:**
1. **Histórico Completo de Carros** - Timeline cronológico de TUDO: entrada, movimentação entre locais, custos, documentos, observações, comissões, vendas (últimas 30 eventos)
2. Follow-ups & Reminders (filtro por role - vendedores veem só seus)
3. Cost Approvals & Operational Expenses (proprietários/gerentes)
4. Seller Performance Metrics (vendas, leads ativos, convertidos)
5. Document Status (verificação de documentação completa por veículo)
6. Activity Log (últimas 15 atividades do sistema)
7. Vehicle Context Awareness (detecta marca/modelo mencionados)
8. Topic Detection (10+ tópicos: custos, localização, comissões, documentos, etc)
9. Intelligent Response Formatting (quantitativas vs qualitativas)
10. Role-Based Access Control (dados financeiros protegidos por permissões)

**Key Features:**
- **Histórico Cronológico Completo**: Quando carro foi ENTRADA → ONDE foi (com datas) → QUANTO custou (cada custo adicionado) → Quanto TEMPO ficou em cada lugar → QUANDO foi vendido
- **Context-Aware Responses**: VeloBot entende do que você está falando (marca/modelo mencionados) e responde APENAS sobre esse carro específico
- **Adaptive Formatting**: Respostas quantitativas retornam APENAS números; qualitativas retornam listas bem organizadas
- **Role-Based Filtering**: Vendedores veem seus follow-ups; gerentes veem tudo; dados financeiros protegidos

### Third-Party Services
- **Google Fonts**: For typography.
- **Socket.IO**: For real-time communication.

### Key Libraries
- **React Hook Form**: Form management and validation.
- **date-fns**: Date manipulation utility.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Lucide React**: Icon library.

## Mobile Responsiveness (December 2025)
Full mobile optimization across all screens:
- **App.tsx**: Responsive header with compact buttons and logo visibility control
- **Dashboard.tsx**: Responsive padding, flex-wrap for buttons, mobile-friendly text
- **Vehicles.tsx**: Full-width selects on mobile, responsive grid (1→2→3→4 cols)
- **DashboardMetricsEnhanced.tsx**: 2-column grid on mobile, compact padding
- **FipeSearchDialog.tsx**: Responsive button text, 95vw dialog width on mobile
- **AddVehicleDialog.tsx**: Responsive button text, responsive form grid
- **KanbanBoard.tsx**: Horizontal scroll on mobile with min-width for columns

Mobile breakpoint strategy: Use `sm:` prefix for 640px+ screens, default styles for mobile.