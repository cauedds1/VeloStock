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
  - Step 2: 6-digit verification code sent via Replit Mail (15-minute expiry)
  - Email marked as `emailVerified: "true"` after verification
  - Routes: `/api/auth/signup-step1` and `/api/auth/verify-signup-email`
  
- **Password Recovery**: 3-step process
  - `POST /api/auth/forgot-password` - Generate code and send email
  - `POST /api/auth/verify-reset-code` - Validate code
  - `POST /api/auth/reset-password` - Update password with bcrypt
  - Code expires in 15 minutes
  - Frontend pages: `/forgot-password` and `/reset-password`

- **Email Delivery**: Uses Replit Mail integration (REPLIT_CONNECTORS_HOSTNAME)
  - HTML-formatted emails with VeloStock branding (purple/green gradient)
  - Logging added for email delivery debugging
  - Automatic code generation and expiry management

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
- **OpenAI API**: Utilizes GPT-4o-mini for AI-powered price suggestions and ad generation.
- **FIPE API**: Free proxy integration (Parallelum API) for real-time vehicle pricing data.

### Third-Party Services
- **Google Fonts**: For typography.
- **Socket.IO**: For real-time communication.

### Key Libraries
- **React Hook Form**: Form management and validation.
- **date-fns**: Date manipulation utility.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Lucide React**: Icon library.