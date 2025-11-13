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