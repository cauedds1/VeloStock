# VeloStock - Universal Multi-Tenant SaaS

## Overview
VeloStock is a universal multi-tenant SaaS platform for complete vehicle dealership and store management. Originally designed for "Capoeiras Automóveis," it has evolved into a white-label solution for any automotive business. The system manages vehicles through their preparation pipeline from intake to sale, featuring Kanban-style workflow, detailed tracking, cost management, AI-powered features (price suggestions and ad generation), intelligent alerts, and complete store operations (including inventory/supplies management). The application is localized in Brazilian Portuguese (pt-BR) with a modern, professional design system.

## Recent Major Changes (November 2024)
- **Multi-tenant architecture**: Full data isolation by empresaId across all tables
- **Custom branding**: Each company can configure logo and color theme
- **AI integration**: OpenAI-powered price suggestions and ad generation (3 styles)
- **Intelligent alerts**: Automated notifications for stuck vehicles, missing photos/prices
- **Enhanced dashboard**: 6 key metrics with real-time calculations
- **First-time setup**: Professional onboarding flow with company configuration
- **FIPE integration**: Proxy API for real-time vehicle pricing data
- **VeloStock branding**: Unique geometric logo and identity (purple/green color scheme)

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Technology Stack**: React with TypeScript, Vite, Wouter, TanStack React Query, Tailwind CSS.
- **UI/UX Design**: Dynamic theming system with company-specific colors and logo. Base palette: purple (#8B5CF6) and green (#10B981). Material Design principles combined with Linear/Notion aesthetics, Inter or IBM Plex Sans typography, consistent spacing. Utilizes Radix UI primitives and shadcn/ui (New York variant).
- **State Management**: React Query for server state, React hooks for local state, React Hook Form with Zod for form validation. ThemeProvider for company branding.
- **Key UI Patterns**: Kanban board with drag-and-drop, tab-based detail views, modal dialogs, toast notifications, interactive analytics, NotificationCenter with animated badges.
- **Features**: 
  - Vehicle management: sorting (status, brand, year), comprehensive checklist system, dynamic adaptation for vehicle types (Carro/Moto)
  - Document management: PDF upload/download per vehicle
  - Intelligent alerts: vehicles stopped X days, missing photos, missing prices
  - AI features: price suggestions, ad generation (3 styles: economic, complete, urgent)
  - Enhanced dashboard: 6 metrics (ready for sale, in preparation, sold this month, average margin, average days, total stock)
  - First-time setup: professional onboarding with company configuration

### Backend
- **Technology Stack**: Node.js with Express.js, TypeScript, PostgreSQL (via Neon serverless driver), Drizzle ORM.
- **API Design**: RESTful API using JSON, session-based authentication, Multer for file uploads, WebSocket for real-time updates.
- **Database Schema**: Multi-tenant tables with empresaId isolation:
  - companies (14 fields: branding, contact, locations, alert config)
  - users, vehicles, vehicle_images, vehicle_history, vehicle_costs, vehicle_documents, store_observations
- **Key Entities**: Vehicle status pipeline (Entrada, Preparação Mecânica, Preparação Estética, Documentação, Pronto para Venda, Vendido, Arquivado), cost categories (Mecânica, Estética, Documentação, Outros).
- **Architectural Decisions**: 
  - Multi-tenant with empresaId filtering on all queries
  - Separation of vehicle status and physical location (localizacaoFisica required except for Vendido/Arquivado)
  - Editable vehicle history with complete location tracking
  - Direct image storage in database (Base64)
  - Simplified cost system using `numeric(10,2)` for direct real values
  - Centralized database connection management
  - Robust document management (filesystem at `/uploads/vehicles/<vehicleId>/`)
  - FIPE integration proxy (4 endpoints for brands, models, years, prices)
  - AI integration endpoints (price suggestion, ad generation)
  - Alerts calculation endpoint (vehicles stopped, missing photos, missing prices)

### Data Flow
Client requests (TanStack Query) -> Express API -> Drizzle ORM -> PostgreSQL -> Response back to client. React Query manages caching.

### File Storage
Multer handles file uploads (10MB limit per image, 5 images per vehicle) and documents (10MB per file). Images are stored in the database. Documents are stored on disk at `/uploads/vehicles/<vehicleId>/`.

### Build and Deployment
- **Development**: Vite dev server (client) and Express (backend) with HMR.
- **Production**: Optimized client bundle and bundled server code served by a single Node.js process.

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL.
- **Drizzle ORM**: Type-safe ORM.

### AI Integration
- **OpenAI API**: GPT-4o-mini model for cost-effective AI features:
  - Price suggestions: Analyzes total costs, desired margin, and FIPE reference price
  - Ad generation: Creates professional ads in 3 styles (economic, complete, urgent) with title, description, hashtags, and CTA
- **FIPE API**: Free proxy integration for real-time vehicle pricing data (Parallelum API)

### Third-Party Services
- **Google Fonts**: For typography.
- **Socket.IO**: For real-time communication.

### Key Libraries
- **React Hook Form**: Form management and validation.
- **date-fns**: Date manipulation.
- **Tailwind CSS**: Styling.
- **Lucide React**: Icons.