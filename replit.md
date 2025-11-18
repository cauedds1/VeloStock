# VeloStock - Universal Multi-Tenant SaaS

## Overview
VeloStock is a universal multi-tenant SaaS platform for complete vehicle dealership and store management. Originally designed for "Capoeiras Automóveis," it has evolved into a white-label solution for any automotive business. The system manages vehicles through their preparation pipeline from intake to sale, featuring Kanban-style workflow, detailed tracking, cost management, AI-powered features (price suggestions and ad generation), intelligent alerts, and complete store operations (including inventory/supplies management). The application is localized in Brazilian Portuguese (pt-BR) with a modern, professional design system.

## Recent Major Changes (November 2024)
- **ROLE-BASED ACCESS CONTROL (RBAC)**: Complete permission system with 4 user roles
  - **Roles**: Proprietário (owner), Gerente (manager), Vendedor (salesperson), Motorista (driver)
  - **Permissions**: Role-specific access to features (Vendedor can't see costs/margins, Motorista only logistics)
  - **User Management**: Proprietário can create/manage users, assign roles, activate/deactivate accounts
  - **Backend Protection**: All sensitive endpoints protected with requireProprietario/requireRole middleware
  - **Frontend Filtering**: usePermissions hook controls UI visibility based on role
  - **Menu "Usuários"**: New page for user management (visible only to Proprietário)
- **ENHANCED PHYSICAL LOCATION**: Improved location tracking with predefined options
  - **Fixed Options**: Casa, Loja, Pátio da Loja, Oficina, Higienização, Outra Loja
  - **Custom Option**: "Outro (especificar)" allows custom location input
  - **Smart Validation**: Locations required for all statuses except Vendido/Arquivado
  - **Detail Field**: Optional additional detail for each location (e.g., specific mechanic name)
- **PRODUCTION-READY MULTI-TENANT ISOLATION**: Complete data isolation with empresaId validation on ALL routes
  - Removed `getDefaultCompanyId()` vulnerability
  - Created `getUserWithCompany()` helper for consistent validation
  - Protected ALL routes: vehicles, costs, images, documents, history, AI features, metrics, observations, users
  - Returns 403 if user not linked to a company
  - Disabled insecure `GET /api/costs/all` route
- **DEPLOYMENT CONFIGURED**: Ready for production deployment via Replit Deploy
  - Autoscale deployment type for optimal performance
  - Build: `npm run build` (Vite + esbuild)
  - Run: `npm run start` (production mode)
  - Public landing page as homepage
- **THEME FIXES**: Custom company colors now apply immediately via page reload after save
- **Multi-tenant architecture**: Full data isolation by empresaId across all tables
- **Production-ready authentication**: Dual authentication system with native email/password and Google OAuth
- **Custom branding**: Each company can configure logo and color theme
- **AI integration**: OpenAI-powered price suggestions and ad generation (3 styles)
- **Intelligent alerts**: Automated notifications for stuck vehicles, missing photos/prices
- **Enhanced dashboard**: 6 key metrics with real-time calculations
- **First-time setup**: Professional onboarding flow with company configuration
- **FIPE integration**: Proxy API for real-time vehicle pricing data
- **VeloStock branding**: Unique geometric logo and identity (purple/green color scheme)
- **Public landing page**: Professional marketing page with authentication options

## How to Deploy (Publish)
1. Click the "Deploy" button in Replit interface
2. The site will be published with:
   - Landing page (`/`) as the public homepage with login options
   - Google OAuth and email/password authentication
   - All features protected behind authentication
   - Each company sees only their own data (multi-tenant isolation)
3. Optional: Add a custom domain in deployment settings

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
  - Physical location tracking: 7 predefined options + custom "Outro" field with detail input
  - Document management: PDF upload/download per vehicle
  - Intelligent alerts: vehicles stopped X days, missing photos, missing prices
  - AI features: price suggestions, ad generation (3 styles: economic, complete, urgent)
  - Enhanced dashboard: 6 metrics (ready for sale, in preparation, sold this month, average margin, average days, total stock)
  - User management: Role-based permissions, invite users, assign roles (Proprietário only)
  - First-time setup: professional onboarding with company configuration
  - Theme customization: Colors apply immediately via page reload after save

### Backend
- **Technology Stack**: Node.js with Express.js, TypeScript, PostgreSQL (via Neon serverless driver), Drizzle ORM.
- **API Design**: RESTful API using JSON, session-based authentication, Multer for file uploads, WebSocket for real-time updates.
- **Authentication**: Dual authentication system:
  - **Native auth**: Email/password with bcrypt hashing, passport-local strategy
  - **Google OAuth**: Replit Auth integration with OIDC, automatic user creation
  - Session management with PostgreSQL store, 30-day TTL (persistent login), environment-aware secure cookies
  - Protected API routes with isAuthenticated middleware
  - User-company linking via empresaId for multi-tenant isolation
- **Multi-Tenant Security**: COMPLETE data isolation enforced:
  - `getUserWithCompany(req)` helper extracts empresaId from authenticated user
  - ALL routes validate empresaId before data access
  - Returns 403 if user not linked to a company
  - ALL storage methods filter by empresaId
  - Routes protected: vehicles, costs, images, documents, history, AI, metrics, observations
  - Insecure routes disabled (e.g., GET /api/costs/all)
- **Database Schema**: Multi-tenant tables with empresaId isolation:
  - companies (14 fields: branding, contact, locations, alert config)
  - users (with passwordHash, authProvider, empresaId, role, isActive, createdBy, createdAt, updatedAt), vehicles, vehicle_images, vehicle_history, vehicle_costs, vehicle_documents, store_observations
- **Role-Based Access Control (RBAC)**: 4 user roles with specific permissions:
  - **Proprietário (Owner)**: Full access including user management, company settings, costs, margins
  - **Gerente (Manager)**: All features except user management and company settings
  - **Vendedor (Salesperson)**: Cannot see costs, margins, or profit calculations
  - **Motorista (Driver)**: Only logistics features (location updates, vehicle movements)
- **Key Entities**: Vehicle status pipeline (Entrada, Preparação Mecânica, Preparação Estética, Documentação, Pronto para Venda, Vendido, Arquivado), cost categories (Mecânica, Estética, Documentação, Outros).
- **Architectural Decisions**: 
  - Multi-tenant with empresaId filtering on all queries via getUserWithCompany() helper
  - Role-based access control (RBAC) with 4 roles: requireProprietario, requireProprietarioOrGerente middleware
  - User management endpoints protected with requireProprietario + empresaId validation
  - Dual authentication: native (bcrypt + passport-local) and Google OAuth (Replit Auth + OIDC)
  - First user of a company automatically becomes Proprietário during company creation
  - Public routes: Landing (/), Login (/login), Signup (/signup), Google OAuth (/api/auth/google)
  - Protected routes: All app pages and API endpoints require authentication via isAuthenticated middleware
  - Separation of vehicle status and physical location with 7 predefined options (Casa, Loja, Pátio da Loja, Oficina, Higienização, Outra Loja, Outro)
  - Physical location required except for Vendido/Arquivado statuses
  - Editable vehicle history with complete location tracking
  - Direct image storage in database (Base64)
  - Simplified cost system using `numeric(10,2)` for direct real values
  - Centralized database connection management
  - Robust document management (filesystem at `/uploads/vehicles/<vehicleId>/`)
  - FIPE integration proxy (4 endpoints for brands, models, years, prices)
  - AI integration endpoints (price suggestion, ad generation)
  - Alerts calculation endpoint (vehicles stopped, missing photos, missing prices)
  - User management endpoints (list, create, update, deactivate users)

### Data Flow
Client requests (TanStack Query) -> Express API -> Drizzle ORM -> PostgreSQL -> Response back to client. React Query manages caching.

### File Storage
Multer handles file uploads (10MB limit per image, 5 images per vehicle) and documents (10MB per file). Images are stored in the database. Documents are stored on disk at `/uploads/vehicles/<vehicleId>/`.

### Build and Deployment
- **Development**: Vite dev server (client) and Express (backend) with HMR.
- **Production**: Optimized client bundle and bundled server code served by a single Node.js process.
- **Deployment Type**: Autoscale (stateless web app with external PostgreSQL database)
- **Build Command**: `npm run build` (Vite + esbuild bundling)
- **Run Command**: `npm run start` (NODE_ENV=production)

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
