# AutoFlow - Vehicle Management System

## Overview
AutoFlow is a vehicle inventory and operations management system designed for "Capoeiras Automóveis," a car dealership in Brazil. It tracks vehicles through their preparation pipeline, from intake to sale, featuring a Kanban-style workflow, detailed tracking, cost management, and AI-powered advertisement generation for social media. The application is localized in Brazilian Portuguese (pt-BR) and follows a modern design inspired by Material Design, Linear, and Notion.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology Stack**: React with TypeScript, Vite, Wouter (routing), TanStack React Query (server state), Tailwind CSS (styling).
- **UI Component Library**: Radix UI primitives and shadcn/ui (New York variant) for pre-built components.
- **Design System**: Custom black and red color palette, Material Design principles combined with Linear/Notion aesthetics, Inter or IBM Plex Sans typography, consistent spacing.
- **State Management**: React Query for server state, React hooks for local state, React Hook Form with Zod for form validation.
- **Key UI Patterns**: Kanban board with drag-and-drop, tab-based detail views, modal dialogs, toast notifications.

### Backend Architecture
- **Technology Stack**: Node.js with Express.js, TypeScript, PostgreSQL (via Neon serverless driver), Drizzle ORM.
- **API Design**: RESTful API using JSON, session-based authentication, Multer for file uploads.
- **Database Schema**: Tables for users (role-based access: DONO/owner, EQUIPE/team), vehicles, images, history, and costs.
- **Key Entities**: Vehicle status pipeline (Entrada → Em Reparos → Aguardando Peças → Em Higienização → Em Documentação → Pronto para Venda → Vendido → Arquivado), cost categories (Mecânica, Estética, Documentação).
- **API Endpoints**: CRUD for vehicles, image management, history tracking, cost tracking, AI ad generation, and analytics.

### Data Flow
Client requests (TanStack Query) -> Express API -> Drizzle ORM -> PostgreSQL -> Response back to client. React Query manages caching. WebSocket for real-time updates.

### File Upload Strategy
Multer configured for in-memory storage (10MB limit), images stored in the database (base64 or binary), up to 5 images per vehicle.

### Build and Deployment
- **Development**: Vite dev server (client) and Express (backend) with HMR and auto-reload.
- **Production**: Optimized client bundle (Vite) and bundled server code (esbuild) served by a single Node.js process.

### Architectural Decisions
- **Status and Physical Location Separation**: Vehicle status (pipeline stage) is distinct from its physical location to allow for flexible tracking (e.g., "Ready for Sale" but physically at "Another Store").
- **Editable Vehicle History**: Users can edit history entries for corrections.
- **Complete Location Tracking**: History entries capture full physical location details.
- **Branding**: Capoeiras Automóveis logo integrated into sidebar and header.
- **Analytics**: Interactive cost analytics modal and a comprehensive reports page with various charts and filters.
- **Status Enum Cleanup**: Reduced vehicle status values from 9 to 8.
- **Checklist Observations System** (November 2025): Checklist structure migrated from arrays of strings to arrays of ChecklistItem objects {item: string, observation?: string} to support item-specific notes. Backward compatibility maintained via automatic normalization of legacy data. Visual indicators implemented: green (completed), yellow (completed with attention/observation), red (pending).
- **Observações Gerais Purpose**: Section reformulated from generic notes to specific tracking of store inventory (e.g., cleaning supplies, tire shine) and property maintenance reminders (e.g., heavy gate, broken lock).
- **Vehicle Image Placeholder** (November 2025): Elegant dark car silhouette placeholder image (/client/public/car-placeholder.png) automatically displayed for vehicles without photos, matching the system's design aesthetic.
- **React Query Cache Invalidation** (November 2025): SalePriceEditor now invalidates both vehicle-specific (`/api/vehicles/${id}`) and collection (`/api/vehicles`) query keys when updating sale price, ensuring DashboardAlerts and FinancialSummary reflect changes immediately.
- **Vehicle Type System** (November 2025): Comprehensive differentiation between cars (Carro) and motorcycles (Moto) with type-specific checklists. Database schema includes vehicleTypeEnum ("Carro"|"Moto") with "Carro" as default. Motorcycle checklists exclude irrelevant items (electric windows, A/C, electric locks) and include motorcycle-specific categories (fairings/finishings, simplified electrical system). All checklist helpers (normalizeChecklistData, getCategoryPresence, getChecklistStats, hasChecklistStarted) dynamically adapt to vehicle type. UI includes type selector (🚗/🏍️) in add/edit dialogs with backward compatibility for existing records.
- **Checklist UX Improvements** (November 2025): Resolved race condition where checkbox toggles would auto-uncheck due to stale refetch payloads overwriting optimistic updates. Solution uses ref-based guard (lastServerChecklistRef) to prevent stale server responses from overriding local state changes. Removed all query invalidations from checklist handlers to maximize performance and stability. Added intelligent "Marcar Todas" button to each checklist category header: marks only incomplete items, preserves existing observations, shows informative message when category is complete. All updates use simple local state with full rollback on error. Trade-off: vehicle list doesn't update immediately after checklist changes (acceptable for UX, improves performance). Features underwent architect review and approval.
- **Vehicle Sorting Feature** (November 2025): Added sorting dropdown in Vehicles page with four options: sort by status (default priority: Pronto para Venda → Em Higienização → ... → Arquivado), sort by brand (alphabetical), sort by year (newest first), and sort by year (oldest first). Implemented client-side sorting without mutating cached data.
- **Database Connection Resilience** (November 2025): Centralized database connection logic via `server/config/database.ts` helper function (`getDatabaseUrl()`). Replit automatically provides `DATABASE_URL` environment variable in both development and production (Replit Deploy), each with separate connection strings for isolated databases. All database consumers (server/db.ts, drizzle.config.ts, migration scripts) use this single helper for consistent behavior. Secure logging shows only environment type (dev/prod) without exposing credentials.
- **Vehicle History Bug Fix** (November 2025): Corrigido bug crítico onde histórico de movimentação não era criado ao atualizar status/localização. Problema estava na verificação de mudanças usando truthy check (`updates.status && ...`) que falhava com valores falsy. Solução implementada usa `Object.prototype.hasOwnProperty.call()` para detectar mudanças independente do valor.
- **Custom Movement Date Feature** (November 2025): Adicionado campo de seleção de data no modal "Atualizar Status e Localização" permitindo registrar movimentações com datas passadas ou futuras. Nova coluna `moved_at` adicionada à tabela `vehicle_history` para armazenar a data customizada (padrão: data atual). Frontend envia `moveDate` via PATCH que é persistido como `movedAt` no histórico. Calendar UI usa date-fns com locale pt-BR.
- **Vehicle History userId Fix** (November 2025): Coluna `user_id` em `vehicle_history` tornado nullable para permitir criação de histórico sem usuário autenticado (sistema interno). Resolve erro de foreign key constraint que impedia salvamento de histórico.
- **Store Observations Custom Category** (November 2025): Quando usuário seleciona categoria "Outro" nas Observações Gerais, aparece campo adicional para especificar categoria customizada (ex: Limpeza, Segurança, Administrativo). Categoria real é exibida no card da observação ao invés de "Sem categoria" genérico.
- **Vehicle Document Management System** (November 2025): Sistema completo de upload, gerenciamento e download de documentos em PDF para veículos. Nova tabela `vehicle_documents` com enum de tipos (CRLV, Nota Fiscal, Laudo Cautelar, Contrato de Compra, Transferência). Arquivos armazenados em `/uploads/vehicles/<vehicleId>/` com limite de 10MB por arquivo. Backend usa multer com diskStorage, validação de tipo MIME, tratamento robusto de erros TOCTOU, e proteção contra race conditions em download/exclusão. Frontend na aba "Documentos" oferece interface drag-and-drop, visualização agrupada por tipo com ícones distintos, download direto e exclusão com confirmação. WebSocket emite eventos em tempo real para sincronização. Sistema passou por rigorosa revisão de segurança com architect.
- **Interactive Urgent Notifications System** (November 2025): Sistema de notificações com alertas chamativos para tarefas pendentes. Links clicáveis levam diretamente ao veículo/página específica com aba correta via URL params (?tab=checklist). VehicleDetails lê parâmetro ?tab= da URL para abrir aba automaticamente. Indicadores visuais agressivos para urgência: tarefas >7 dias marcadas com exclamação vermelha pulsante (AlertCircle animate-pulse-urgent), background vermelho pulsante (bg-pulse-urgent), borda vermelha lateral, texto vermelho em negrito, e badges vermelhos animados. Tarefas >3 dias recebem badge laranja. Sino de notificações pulsa quando há tarefas urgentes. Popover fecha automaticamente ao clicar. CSS animations: @keyframes pulse-urgent (1s, scale 1.15) e bg-pulse-urgent com efeito de pulsação contínua muito rápido e intenso. Sino balança (shake-bell) quando há tarefas urgentes. Sistema projetado para "incomodar" o usuário e prevenir esquecimento de tarefas antigas.
- **Checklist Observations Alerts** (November 2025): Nova categoria de notificações "Problemas Reportados" detecta observações em checklists (ex: "rádio não sai som") e alerta usuário sobre veículos com problemas técnicos. Sistema conta total de observações por veículo, aplica mesma lógica de urgência (>7 dias), e oferece navegação direta para aba checklist. Invalidação de cache (`/api/vehicles`) adicionada em `toggleChecklistItem` e `markAllInCategory` para garantir que notificações atualizem imediatamente após marcar/desmarcar itens do checklist.
- **Days In Status Calculation Fix & Performance** (November 2025): Corrigido cálculo de "Dias no Status" para buscar data correta do histórico de movimentação ao invés do campo `locationChangedAt`. Implementada otimização N+1 query: busca TODO o histórico em uma única query (`getAllVehicleHistory()`) e processa em memória usando Map, reduzindo tempo de resposta de /api/vehicles de 9s para ~2s. Sistema agora mostra dias corretos desde que veículo mudou para status atual. Adicionado fallback para `createdAt` quando `statusChangedAt` é undefined, prevenindo crashes na rota. Corrigido bug onde Vehicles.tsx dependia de queryFn global removido, adicionando queryFn explícito ao useQuery. Adicionado campo numérico `daysInStatus` na API para uso em cálculos nos relatórios, eliminando dependência de cálculo local incorreto com `locationChangedAt`.
- **UI Improvements** (November 2025): Removido horário de "Últimas Movimentações" em VehicleDetails (agora mostra apenas data dd/mm/yyyy). Implementado sistema de filtro com botões clicáveis em "Observações Gerais da Loja" nos Relatórios, permitindo alternar entre visualização de pendentes e resolvidas com estilo visual consistente ao sistema de checklist.

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL.
- **Drizzle ORM**: Type-safe ORM for database interactions.

### AI Integration
- **OpenAI API**: Used for generating AI-powered vehicle advertisements in Portuguese.

### Third-Party Services
- **Google Fonts**: For typography (Inter, IBM Plex Sans, etc.).
- **Socket.IO**: For real-time bidirectional communication.

### Storage
- **PostgreSQL**: For session storage and direct image storage.

### Key Libraries
- **React Hook Form**: Form management with Zod validation.
- **date-fns**: Date formatting and manipulation.
- **Tailwind CSS**: Utility-first styling.
- **Lucide React**: Icons.