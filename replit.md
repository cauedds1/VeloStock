# AutoFlow - Vehicle Management System

## Overview
AutoFlow is a vehicle inventory and operations management system designed for "Capoeiras Automóveis," a car dealership in Brazil. It tracks vehicles through their preparation pipeline from intake to sale, featuring a Kanban-style workflow, detailed tracking, cost management, and AI-powered advertisement generation for social media. The application is localized in Brazilian Portuguese (pt-BR) and aims for a modern, intuitive user experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Technology Stack**: React with TypeScript, Vite, Wouter, TanStack React Query, Tailwind CSS.
- **UI/UX Design**: Custom black and red color palette, Material Design principles combined with Linear/Notion aesthetics, Inter or IBM Plex Sans typography, consistent spacing. Utilizes Radix UI primitives and shadcn/ui (New York variant).
- **State Management**: React Query for server state, React hooks for local state, React Hook Form with Zod for form validation.
- **Key UI Patterns**: Kanban board with drag-and-drop, tab-based detail views, modal dialogs, toast notifications, interactive analytics.
- **Features**: Vehicle sorting (status, brand, year), comprehensive checklist system with observations, dynamic checklist adaptation for vehicle types (Carro/Moto), document management (PDF upload/download), interactive urgent notification system, refactored general observations and reports.

### Backend
- **Technology Stack**: Node.js with Express.js, TypeScript, PostgreSQL (via Neon serverless driver), Drizzle ORM.
- **API Design**: RESTful API using JSON, session-based authentication, Multer for file uploads, WebSocket for real-time updates.
- **Database Schema**: Tables for users (role-based), vehicles, images, history, costs, and documents.
- **Key Entities**: Vehicle status pipeline (e.g., Entrada, Pronto para Venda, Vendido), cost categories (e.g., Mecânica, Estética).
- **Architectural Decisions**: Separation of vehicle status and physical location, editable vehicle history with complete location tracking, direct image storage in database, simplified cost system using `numeric(10,2)` for direct real values, centralized database connection management, robust document management.

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
- **OpenAI API**: Generates AI-powered vehicle advertisements.

### Third-Party Services
- **Google Fonts**: For typography.
- **Socket.IO**: For real-time communication.

### Key Libraries
- **React Hook Form**: Form management and validation.
- **date-fns**: Date manipulation.
- **Tailwind CSS**: Styling.
- **Lucide React**: Icons.