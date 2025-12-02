# VeloStock - Universal Multi-Tenant SaaS

## Overview
VeloStock is a universal multi-tenant SaaS platform designed for comprehensive vehicle dealership and store management. It provides a white-label solution for automotive businesses, managing vehicles from intake to sale using a Kanban-style workflow, tracking detailed costs, and incorporating AI for price suggestions and ad generation. Key features include intelligent alerts, complete store operations, and inventory management, all localized in Brazilian Portuguese (pt-BR) with a modern design. The platform aims to be a scalable, secure, and feature-rich solution to streamline dealership operations, enhancing efficiency and profitability through advanced tools and multi-tenancy.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript, Vite, Tailwind CSS, Radix UI primitives, and shadcn/ui (New York variant). It features a dynamic theming system with company-specific colors, a base palette of purple and green, and Inter or IBM Plex Sans typography. Design principles combine Material Design with Linear/Notion aesthetics, emphasizing consistent spacing. Key UI patterns include Kanban boards with drag-and-drop, tab-based detail views, modal dialogs, toast notifications, interactive analytics, and a NotificationCenter. All screens are fully mobile-optimized.

### Technical Implementations
**Frontend:**
- **Technology Stack**: React, TypeScript, Vite, Wouter, TanStack React Query, Tailwind CSS.
- **State Management**: React Query for server state, React hooks for local state, React Hook Form with Zod for form validation.
- **Key Features**: Vehicle management (dynamic smart filtering, physical location tracking, document management), intelligent alerts, AI features (price suggestions, ad generation in 3 styles), enhanced dashboard metrics, user management (role-based permissions, invite users), first-time setup onboarding, theme customization, streamlined sale workflow with inline vendor selection and automatic commission creation, and a complete Bills system (Contas a Pagar/Receber) with RBAC.

**Backend:**
- **Technology Stack**: Node.js with Express.js, TypeScript, PostgreSQL (via Neon serverless driver), Drizzle ORM.
- **API Design**: RESTful API (JSON), Multer for file uploads.
- **Authentication**: Email/password authentication using bcrypt, passport-local strategy, and PostgreSQL session store (30-day TTL).
- **Multi-Tenant Security**: Data isolation via `empresaId` validation across all routes and queries.
- **Role-Based Access Control (RBAC)**: Four roles (Proprietário, Gerente, Vendedor, Motorista) with granular permissions managed by middleware.
- **Key Entities**: Vehicle status pipeline, cost categories, commission system with automatic payment creation.
- **File Storage**: Images are Base64 in the database; documents are stored on disk.
- **Email System**: SendGrid for email verification and password recovery, with console logging fallback.

### System Design Choices
- **Multi-tenancy**: Full data isolation per company (`empresaId`).
- **Role-Based Access Control (RBAC)**: Implemented with four distinct user roles.
- **Data Flow**: Client (TanStack Query) -> Express API -> Drizzle ORM -> PostgreSQL.
- **Deployment**: Designed for autoscale, using an external Neon PostgreSQL database.

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL with connection pooling.
- **Drizzle ORM**: Type-safe ORM for PostgreSQL.
- **connect-pg-simple**: PostgreSQL session store.

### AI Integration
- **OpenAI API (GPT-4o-mini)**:
  - **LeadAssistant**: Generates personalized response suggestions for leads.
  - **ChatbotWidget**: Floating AI assistant for FAQ.
  - **AdGeneratorMulti**: Creates optimized ads for multiple platforms.
  - **SellerAnalysisDialog**: AI-powered seller performance analysis.
  - **CoachingCard**: Provides daily coaching tips.
  - Price suggestions and ad text generation.
- **FIPE API**: Free proxy integration for real-time vehicle pricing data, with rate limiting and retry logic.
- **VeloBot**: Omniscient AI assistant with access to 15+ data contexts (e.g., full vehicle history, follow-ups, cost approvals, seller performance, document status, activity logs), offering context-aware, role-based, and adaptively formatted responses.

### Third-Party Services
- **SendGrid**: For email delivery.
- **Google Fonts**: For typography.
- **Socket.IO**: For real-time communication.

### Key Libraries
- **React Hook Form**: Form management and validation.
- **date-fns**: Date manipulation utility.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.