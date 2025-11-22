pg_dump: last built-in OID is 16383
pg_dump: reading extensions
pg_dump: identifying extension members
pg_dump: reading schemas
pg_dump: reading user-defined tables
pg_dump: reading user-defined functions
pg_dump: reading user-defined types
pg_dump: reading procedural languages
pg_dump: reading user-defined aggregate functions
pg_dump: reading user-defined operators
pg_dump: reading user-defined access methods
pg_dump: reading user-defined operator classes
pg_dump: reading user-defined operator families
pg_dump: reading user-defined text search parsers
pg_dump: reading user-defined text search templates
pg_dump: reading user-defined text search dictionaries
pg_dump: reading user-defined text search configurations
pg_dump: reading user-defined foreign-data wrappers
pg_dump: reading user-defined foreign servers
pg_dump: reading default privileges
pg_dump: reading user-defined collations
pg_dump: reading user-defined conversions
pg_dump: reading type casts
pg_dump: reading transforms
pg_dump: reading table inheritance information
pg_dump: reading event triggers
pg_dump: finding extension tables
pg_dump: finding inheritance relationships
pg_dump: reading column info for interesting tables
pg_dump: finding table default expressions
pg_dump: flagging inherited columns in subtables
pg_dump: reading partitioning data
pg_dump: reading indexes
pg_dump: flagging indexes in partitioned tables
pg_dump: reading extended statistics
pg_dump: reading constraints
pg_dump: reading triggers
pg_dump: reading rewrite rules
pg_dump: reading policies
pg_dump: reading row-level security policies
pg_dump: reading publications
pg_dump: reading publication membership of tables
pg_dump: reading publication membership of schemas
pg_dump: reading subscriptions
pg_dump: reading subscription membership of tables
pg_dump: reading large objects
pg_dump: reading dependency data
pg_dump: saving encoding = UTF8
pg_dump: saving "standard_conforming_strings = on"
pg_dump: saving "search_path = "
pg_dump: dropping FK CONSTRAINT vehicle_images vehicle_images_vehicle_id_vehicles_id_fk
pg_dump: dropping FK CONSTRAINT vehicle_history vehicle_history_vehicle_id_vehicles_id_fk
pg_dump: dropping FK CONSTRAINT vehicle_history vehicle_history_user_id_users_id_fk
pg_dump: dropping FK CONSTRAINT vehicle_documents vehicle_documents_vehicle_id_vehicles_id_fk
pg_dump: dropping FK CONSTRAINT vehicle_documents vehicle_documents_uploaded_by_users_id_fk
pg_dump: dropping FK CONSTRAINT vehicle_costs vehicle_costs_vehicle_id_vehicles_id_fk
pg_dump: dropping INDEX IDX_session_expire
pg_dump: dropping CONSTRAINT vehicles vehicles_plate_unique
pg_dump: dropping CONSTRAINT vehicles vehicles_pkey
pg_dump: dropping CONSTRAINT vehicle_images vehicle_images_pkey
pg_dump: dropping CONSTRAINT vehicle_history vehicle_history_pkey
pg_dump: dropping CONSTRAINT vehicle_documents vehicle_documents_pkey
pg_dump: dropping CONSTRAINT vehicle_costs vehicle_costs_pkey
pg_dump: dropping CONSTRAINT users users_pkey
pg_dump: dropping CONSTRAINT users users_email_unique
pg_dump: dropping CONSTRAINT user_permissions user_permissions_pkey
pg_dump: dropping CONSTRAINT store_observations store_observations_pkey
pg_dump: dropping CONSTRAINT sessions sessions_pkey
pg_dump: dropping CONSTRAINT sales_targets sales_targets_pkey
pg_dump: dropping CONSTRAINT operational_expenses operational_expenses_pkey
pg_dump: dropping CONSTRAINT leads leads_pkey
pg_dump: dropping CONSTRAINT follow_ups follow_ups_pkey
pg_dump: dropping CONSTRAINT cost_approvals cost_approvals_pkey
pg_dump: dropping CONSTRAINT company_settings company_settings_pkey
pg_dump: dropping CONSTRAINT companies companies_pkey
pg_dump: dropping CONSTRAINT commissions_config commissions_config_pkey
pg_dump: dropping CONSTRAINT commission_payments commission_payments_pkey
pg_dump: dropping CONSTRAINT bills_payable bills_payable_pkey
pg_dump: dropping CONSTRAINT approval_settings approval_settings_pkey
pg_dump: dropping CONSTRAINT approval_settings approval_settings_empresa_id_unique
pg_dump: dropping CONSTRAINT advanced_company_settings advanced_company_settings_pkey
pg_dump: dropping CONSTRAINT advanced_company_settings advanced_company_settings_empresa_id_unique
pg_dump: dropping CONSTRAINT activity_log activity_log_pkey
pg_dump: dropping TABLE vehicles
pg_dump: dropping TABLE vehicle_images
pg_dump: dropping TABLE vehicle_history
pg_dump: dropping TABLE vehicle_documents
pg_dump: dropping TABLE vehicle_costs
pg_dump: dropping TABLE users
pg_dump: dropping TABLE user_permissions
--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10
-- Dumped by pg_dump version 17.5

-- Started on 2025-11-22 13:36:40 UTC

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.vehicle_images DROP CONSTRAINT IF EXISTS vehicle_images_vehicle_id_vehicles_id_fk;
ALTER TABLE IF EXISTS ONLY public.vehicle_history DROP CONSTRAINT IF EXISTS vehicle_history_vehicle_id_vehicles_id_fk;
ALTER TABLE IF EXISTS ONLY public.vehicle_history DROP CONSTRAINT IF EXISTS vehicle_history_user_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.vehicle_documents DROP CONSTRAINT IF EXISTS vehicle_documents_vehicle_id_vehicles_id_fk;
ALTER TABLE IF EXISTS ONLY public.vehicle_documents DROP CONSTRAINT IF EXISTS vehicle_documents_uploaded_by_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.vehicle_costs DROP CONSTRAINT IF EXISTS vehicle_costs_vehicle_id_vehicles_id_fk;
DROP INDEX IF EXISTS public."IDX_session_expire";
ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS vehicles_plate_unique;
ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS vehicles_pkey;
ALTER TABLE IF EXISTS ONLY public.vehicle_images DROP CONSTRAINT IF EXISTS vehicle_images_pkey;
ALTER TABLE IF EXISTS ONLY public.vehicle_history DROP CONSTRAINT IF EXISTS vehicle_history_pkey;
ALTER TABLE IF EXISTS ONLY public.vehicle_documents DROP CONSTRAINT IF EXISTS vehicle_documents_pkey;
ALTER TABLE IF EXISTS ONLY public.vehicle_costs DROP CONSTRAINT IF EXISTS vehicle_costs_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.user_permissions DROP CONSTRAINT IF EXISTS user_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.store_observations DROP CONSTRAINT IF EXISTS store_observations_pkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.sales_targets DROP CONSTRAINT IF EXISTS sales_targets_pkey;
ALTER TABLE IF EXISTS ONLY public.operational_expenses DROP CONSTRAINT IF EXISTS operational_expenses_pkey;
ALTER TABLE IF EXISTS ONLY public.leads DROP CONSTRAINT IF EXISTS leads_pkey;
ALTER TABLE IF EXISTS ONLY public.follow_ups DROP CONSTRAINT IF EXISTS follow_ups_pkey;
ALTER TABLE IF EXISTS ONLY public.cost_approvals DROP CONSTRAINT IF EXISTS cost_approvals_pkey;
ALTER TABLE IF EXISTS ONLY public.company_settings DROP CONSTRAINT IF EXISTS company_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.companies DROP CONSTRAINT IF EXISTS companies_pkey;
ALTER TABLE IF EXISTS ONLY public.commissions_config DROP CONSTRAINT IF EXISTS commissions_config_pkey;
ALTER TABLE IF EXISTS ONLY public.commission_payments DROP CONSTRAINT IF EXISTS commission_payments_pkey;
ALTER TABLE IF EXISTS ONLY public.bills_payable DROP CONSTRAINT IF EXISTS bills_payable_pkey;
ALTER TABLE IF EXISTS ONLY public.approval_settings DROP CONSTRAINT IF EXISTS approval_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.approval_settings DROP CONSTRAINT IF EXISTS approval_settings_empresa_id_unique;
ALTER TABLE IF EXISTS ONLY public.advanced_company_settings DROP CONSTRAINT IF EXISTS advanced_company_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.advanced_company_settings DROP CONSTRAINT IF EXISTS advanced_company_settings_empresa_id_unique;
ALTER TABLE IF EXISTS ONLY public.activity_log DROP CONSTRAINT IF EXISTS activity_log_pkey;
DROP TABLE IF EXISTS public.vehicles;
DROP TABLE IF EXISTS public.vehicle_images;
DROP TABLE IF EXISTS public.vehicle_history;
DROP TABLE IF EXISTS public.vehicle_documents;
DROP TABLE IF EXISTS public.vehicle_costs;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_permissiopg_dump: dropping TABLE store_observations
pg_dump: dropping TABLE sessions
pg_dump: dropping TABLE sales_targets
pg_dump: dropping TABLE operational_expenses
pg_dump: dropping TABLE leads
pg_dump: dropping TABLE follow_ups
pg_dump: dropping TABLE cost_approvals
pg_dump: dropping TABLE company_settings
pg_dump: dropping TABLE companies
pg_dump: dropping TABLE commissions_config
pg_dump: dropping TABLE commission_payments
pg_dump: dropping TABLE bills_payable
pg_dump: dropping TABLE approval_settings
pg_dump: dropping TABLE advanced_company_settings
pg_dump: dropping TABLE activity_log
pg_dump: dropping TYPE vehicle_type
pg_dump: dropping TYPE vehicle_status
pg_dump: dropping TYPE user_role
pg_dump: dropping TYPE transaction_type
pg_dump: dropping TYPE store_observation_status
pg_dump: dropping TYPE store_observation_category
pg_dump: dropping TYPE lead_status
pg_dump: dropping TYPE followup_status
pg_dump: dropping TYPE expense_category
pg_dump: dropping TYPE document_type
pg_dump: dropping TYPE cost_approval_status
pg_dump: dropping TYPE commission_status
pg_dump: dropping TYPE bill_type
pg_dump: dropping TYPE bill_status
pg_dump: dropping TYPE activity_type
pg_dump: creating TYPE "public.activity_type"
pg_dump: creating TYPE "public.bill_status"
pg_dump: creating TYPE "public.bill_type"
pg_dump: creating TYPE "public.commission_status"
pg_dump: creating TYPE "public.cost_approval_status"
pg_dump: creating TYPE "public.document_type"
pg_dump: creating TYPE "public.expense_category"
pg_dump: creating TYPE "public.followup_status"
pg_dump: creating TYPE "public.lead_status"
pg_dump: creating TYPE "public.store_observation_category"
pg_dump: creating TYPE "public.store_observation_status"
ns;
DROP TABLE IF EXISTS public.store_observations;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.sales_targets;
DROP TABLE IF EXISTS public.operational_expenses;
DROP TABLE IF EXISTS public.leads;
DROP TABLE IF EXISTS public.follow_ups;
DROP TABLE IF EXISTS public.cost_approvals;
DROP TABLE IF EXISTS public.company_settings;
DROP TABLE IF EXISTS public.companies;
DROP TABLE IF EXISTS public.commissions_config;
DROP TABLE IF EXISTS public.commission_payments;
DROP TABLE IF EXISTS public.bills_payable;
DROP TABLE IF EXISTS public.approval_settings;
DROP TABLE IF EXISTS public.advanced_company_settings;
DROP TABLE IF EXISTS public.activity_log;
DROP TYPE IF EXISTS public.vehicle_type;
DROP TYPE IF EXISTS public.vehicle_status;
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.transaction_type;
DROP TYPE IF EXISTS public.store_observation_status;
DROP TYPE IF EXISTS public.store_observation_category;
DROP TYPE IF EXISTS public.lead_status;
DROP TYPE IF EXISTS public.followup_status;
DROP TYPE IF EXISTS public.expense_category;
DROP TYPE IF EXISTS public.document_type;
DROP TYPE IF EXISTS public.cost_approval_status;
DROP TYPE IF EXISTS public.commission_status;
DROP TYPE IF EXISTS public.bill_type;
DROP TYPE IF EXISTS public.bill_status;
DROP TYPE IF EXISTS public.activity_type;
--
-- TOC entry 861 (class 1247 OID 16386)
-- Name: activity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.activity_type AS ENUM (
    'vehicle_created',
    'vehicle_updated',
    'vehicle_deleted',
    'vehicle_status_changed',
    'vehicle_sold',
    'cost_added',
    'cost_updated',
    'cost_deleted',
    'cost_approved',
    'cost_rejected',
    'document_uploaded',
    'document_deleted',
    'image_uploaded',
    'image_deleted',
    'user_created',
    'user_updated',
    'user_deactivated',
    'settings_updated',
    'lead_created',
    'lead_updated',
    'lead_converted'
);


--
-- TOC entry 864 (class 1247 OID 16430)
-- Name: bill_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bill_status AS ENUM (
    'pendente',
    'pago',
    'vencido',
    'parcial'
);


--
-- TOC entry 867 (class 1247 OID 16440)
-- Name: bill_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bill_type AS ENUM (
    'a_pagar',
    'a_receber'
);


--
-- TOC entry 870 (class 1247 OID 16446)
-- Name: commission_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.commission_status AS ENUM (
    'A Pagar',
    'Paga',
    'Cancelada'
);


--
-- TOC entry 873 (class 1247 OID 16454)
-- Name: cost_approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cost_approval_status AS ENUM (
    'Pendente',
    'Aprovado',
    'Rejeitado'
);


--
-- TOC entry 876 (class 1247 OID 16462)
-- Name: document_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_type AS ENUM (
    'CRLV',
    'Nota Fiscal',
    'Laudo Cautelar',
    'Contrato de Compra',
    'Transferência'
);


--
-- TOC entry 879 (class 1247 OID 16474)
-- Name: expense_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expense_category AS ENUM (
    'Aluguel',
    'Energia',
    'Água',
    'Internet',
    'Telefone',
    'Salários',
    'Impostos',
    'Marketing',
    'Manutenção',
    'Combustível',
    'Outros'
);


--
-- TOC entry 882 (class 1247 OID 16498)
-- Name: followup_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.followup_status AS ENUM (
    'Pendente',
    'Concluído',
    'Cancelado'
);


--
-- TOC entry 885 (class 1247 OID 16506)
-- Name: lead_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lead_status AS ENUM (
    'Novo',
    'Contatado',
    'Visitou Loja',
    'Proposta Enviada',
    'Negociando',
    'Convertido',
    'Perdido'
);


--
-- TOC entry 888 (class 1247 OID 16522)
-- Name: store_observation_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.store_observation_category AS ENUM (
    'Estoque',
    'Manutenção',
    'Outro'
);


--
-- TOC entry 891 (claspg_dump: creating TYPE "public.transaction_type"
pg_dump: creating TYPE "public.user_role"
pg_dump: creating TYPE "public.vehicle_status"
pg_dump: creating TYPE "public.vehicle_type"
pg_dump: creating TABLE "public.activity_log"
pg_dump: creating TABLE "public.advanced_company_settings"
pg_dump: creating TABLE "public.approval_settings"
pg_dump: creating TABLE "public.bills_payable"
pg_dump: creating TABLE "public.commission_payments"
s 1247 OID 16530)
-- Name: store_observation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.store_observation_status AS ENUM (
    'Pendente',
    'Resolvido'
);


--
-- TOC entry 894 (class 1247 OID 16536)
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.transaction_type AS ENUM (
    'Receita',
    'Despesa'
);


--
-- TOC entry 897 (class 1247 OID 16542)
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'proprietario',
    'gerente',
    'vendedor',
    'motorista'
);


--
-- TOC entry 900 (class 1247 OID 16552)
-- Name: vehicle_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vehicle_status AS ENUM (
    'Entrada',
    'Em Reparos',
    'Em Higienização',
    'Pronto para Venda',
    'Vendido',
    'Arquivado'
);


--
-- TOC entry 903 (class 1247 OID 16566)
-- Name: vehicle_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vehicle_type AS ENUM (
    'Carro',
    'Moto'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 215 (class 1259 OID 16571)
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    user_id character varying NOT NULL,
    user_name text NOT NULL,
    activity_type public.activity_type NOT NULL,
    entity_type text NOT NULL,
    entity_id character varying,
    description text NOT NULL,
    metadata text,
    ip_address character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 216 (class 1259 OID 16580)
-- Name: advanced_company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advanced_company_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    categorias_custos text[] DEFAULT '{Mecânica,Estética,Documentação,Outros}'::text[],
    origens_leads text[] DEFAULT '{WhatsApp,Site,Indicação,"Loja Física","Redes Sociais",Telefone}'::text[],
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 217 (class 1259 OID 16594)
-- Name: approval_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    limite_aprovacao_automatica numeric(10,2) DEFAULT 500.00,
    exigir_aprovacao_gerente character varying DEFAULT 'true'::character varying,
    notificar_proprietario character varying DEFAULT 'true'::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 218 (class 1259 OID 16609)
-- Name: bills_payable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bills_payable (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    tipo public.bill_type NOT NULL,
    descricao text NOT NULL,
    categoria character varying NOT NULL,
    valor numeric(10,2) NOT NULL,
    data_vencimento timestamp without time zone NOT NULL,
    data_pagamento timestamp without time zone,
    status public.bill_status DEFAULT 'pendente'::public.bill_status NOT NULL,
    observacoes text,
    recorrente integer DEFAULT 0,
    parcelado integer DEFAULT 0,
    numero_parcela integer,
    total_parcelas integer,
    grupo_parcelamento character varying,
    vehicle_id character varying,
    criado_por character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 219 (class 1259 OID 16622)
-- Name: commission_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_payments (
    id character varying DEFAULTpg_dump: creating TABLE "public.commissions_config"
pg_dump: creating TABLE "public.companies"
pg_dump: creating TABLE "public.company_settings"
pg_dump: creating TABLE "public.cost_approvals"
pg_dump: creating TABLE "public.follow_ups"
pg_dump: creating TABLE "public.leads"
 gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    vendedor_id character varying NOT NULL,
    veiculo_id character varying,
    percentual_aplicado numeric(5,2) NOT NULL,
    valor_base numeric(10,2) NOT NULL,
    valor_comissao numeric(10,2) NOT NULL,
    status public.commission_status DEFAULT 'A Pagar'::public.commission_status,
    data_pagamento timestamp without time zone,
    forma_pagamento text,
    observacoes text,
    criado_por character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 220 (class 1259 OID 16633)
-- Name: commissions_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commissions_config (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    vendedor_id character varying NOT NULL,
    percentual_comissao numeric(5,2) NOT NULL,
    ativo character varying DEFAULT 'true'::character varying,
    observacoes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 221 (class 1259 OID 16644)
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    nome_fantasia text NOT NULL,
    razao_social text,
    cnpj text,
    endereco text,
    telefone text,
    telefone2 text,
    email text,
    logo_url text,
    cor_primaria text DEFAULT '#dc2626'::text,
    cor_secundaria text DEFAULT '#000000'::text,
    whatsapp_numero text,
    locais_comuns json DEFAULT '[]'::json,
    alerta_dias_parado integer DEFAULT 7,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 222 (class 1259 OID 16658)
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    company_name text,
    phone text,
    email text,
    address text,
    cnpj text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 223 (class 1259 OID 16668)
-- Name: cost_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_approvals (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    cost_id character varying NOT NULL,
    solicitado_por character varying NOT NULL,
    valor numeric(10,2) NOT NULL,
    status public.cost_approval_status DEFAULT 'Pendente'::public.cost_approval_status NOT NULL,
    aprovado_por character varying,
    aprovado_em timestamp without time zone,
    motivo_rejeicao text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 224 (class 1259 OID 16679)
-- Name: follow_ups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follow_ups (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    lead_id character varying,
    vehicle_id character varying,
    assigned_to character varying NOT NULL,
    titulo text NOT NULL,
    descricao text,
    data_agendada timestamp without time zone NOT NULL,
    status public.followup_status DEFAULT 'Pendente'::public.followup_status NOT NULL,
    concluido_em timestamp without time zone,
    resultado text,
    criado_por character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 225 (class 1259 OID 16690)
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    nome text Npg_dump: creating TABLE "public.operational_expenses"
pg_dump: creating TABLE "public.sales_targets"
pg_dump: creating TABLE "public.sessions"
pg_dump: creating TABLE "public.store_observations"
pg_dump: creating TABLE "public.user_permissions"
OT NULL,
    telefone character varying NOT NULL,
    email character varying,
    status public.lead_status DEFAULT 'Novo'::public.lead_status NOT NULL,
    veiculo_interesse character varying,
    veiculo_interesse_nome text,
    origem text,
    observacoes text,
    vendedor_responsavel character varying,
    proximo_followup timestamp without time zone,
    valor_proposta numeric(10,2),
    motivo_perdido text,
    criado_por character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 226 (class 1259 OID 16701)
-- Name: operational_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operational_expenses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    categoria public.expense_category NOT NULL,
    descricao text NOT NULL,
    valor numeric(10,2) NOT NULL,
    data_vencimento timestamp without time zone,
    data_pagamento timestamp without time zone,
    pago character varying DEFAULT 'false'::character varying,
    forma_pagamento text,
    observacoes text,
    criado_por character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 227 (class 1259 OID 16712)
-- Name: sales_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_targets (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    vendedor_id character varying,
    mes_referencia integer NOT NULL,
    ano_referencia integer NOT NULL,
    meta_quantidade integer,
    meta_valor numeric(10,2),
    observacoes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 228 (class 1259 OID 16722)
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- TOC entry 229 (class 1259 OID 16729)
-- Name: store_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_observations (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying,
    description text NOT NULL,
    category text,
    status public.store_observation_status DEFAULT 'Pendente'::public.store_observation_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    resolved_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 230 (class 1259 OID 16740)
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying NOT NULL,
    user_id character varying NOT NULL,
    acessar_dashboard character varying DEFAULT 'true'::character varying,
    acessar_veiculos character varying DEFAULT 'true'::character varying,
    acessar_custos character varying DEFAULT 'true'::character varying,
    acessar_alerts character varying DEFAULT 'true'::character varying,
    acessar_observacoes character varying DEFAULT 'true'::character varying,
    acessar_configuracoes character varying DEFAULT 'false'::character varying,
    acessar_usuarios character varying DEFAULT 'false'::character varying,
    acessar_financeiro character varying DEFAULT 'false'::character varying,
    acessar_dashboard_financeiro character varying DEFAULT 'false'::character varying,
    acessar_comissoes character varying DEFAULT 'false'::character varying,
    acessar_despesas character varying DEFAULT 'false'::character varying,
    acessar_relatorios character varying DEFAULT 'false'::character varying,
    criar_veiculos character varying DEFAULT 'true'::character varying,
    editar_veiculos character varying DEFAUpg_dump: creating TABLE "public.users"
pg_dump: creating TABLE "public.vehicle_costs"
pg_dump: creating TABLE "public.vehicle_documents"
pg_dump: creating TABLE "public.vehicle_history"
pg_dump: creating TABLE "public.vehicle_images"
pg_dump: creating TABLE "public.vehicles"
LT 'true'::character varying,
    deletar_veiculos character varying DEFAULT 'false'::character varying,
    ver_custos_veiculos character varying DEFAULT 'true'::character varying,
    editar_custos_veiculos character varying DEFAULT 'true'::character varying,
    ver_margens_lucro character varying DEFAULT 'false'::character varying,
    usar_sugestao_preco character varying DEFAULT 'true'::character varying,
    usar_geracao_anuncios character varying DEFAULT 'true'::character varying,
    criado_por character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 231 (class 1259 OID 16770)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying,
    email character varying NOT NULL,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    password_hash character varying,
    auth_provider character varying DEFAULT 'local'::character varying,
    role public.user_role DEFAULT 'vendedor'::public.user_role,
    is_active character varying DEFAULT 'true'::character varying,
    created_by character varying,
    email_verified character varying DEFAULT 'false'::character varying,
    verification_code character varying,
    verification_code_expiry timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- TOC entry 232 (class 1259 OID 16786)
-- Name: vehicle_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_costs (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id character varying NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    value numeric(10,2) NOT NULL,
    date timestamp without time zone NOT NULL,
    payment_method text DEFAULT 'Cartão Loja'::text NOT NULL,
    paid_by text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 233 (class 1259 OID 16796)
-- Name: vehicle_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_documents (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id character varying NOT NULL,
    document_type public.document_type NOT NULL,
    original_file_name text NOT NULL,
    stored_file_name text NOT NULL,
    storage_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type text DEFAULT 'application/pdf'::text NOT NULL,
    uploaded_at timestamp without time zone DEFAULT now() NOT NULL,
    uploaded_by character varying
);


--
-- TOC entry 234 (class 1259 OID 16806)
-- Name: vehicle_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_history (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id character varying NOT NULL,
    from_location text,
    to_location text,
    from_status public.vehicle_status,
    to_status public.vehicle_status NOT NULL,
    from_physical_location text,
    to_physical_location text,
    from_physical_location_detail text,
    to_physical_location_detail text,
    user_id character varying,
    notes text,
    moved_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 235 (class 1259 OID 16816)
-- Name: vehicle_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicle_images (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    vehicle_id character varying NOT NULL,
    image_url text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 236 (class 1259 OID 16826)
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    empresa_id character varying,
    brand textpg_dump: processing data for table "public.activity_log"
pg_dump: dumping contents of table "public.activity_log"
pg_dump: processing data for table "public.advanced_company_settings"
pg_dump: dumping contents of table "public.advanced_company_settings"
pg_dump: processing data for table "public.approval_settings"
pg_dump: dumping contents of table "public.approval_settings"
pg_dump: processing data for table "public.bills_payable"
pg_dump: dumping contents of table "public.bills_payable"
pg_dump: processing data for table "public.commission_payments"
pg_dump: dumping contents of table "public.commission_payments"
pg_dump: processing data for table "public.commissions_config"
pg_dump: dumping contents of table "public.commissions_config"
pg_dump: processing data for table "public.companies"
pg_dump: dumping contents of table "public.companies"
pg_dump: processing data for table "public.company_settings"
pg_dump: dumping contents of table "public.company_settings"
pg_dump: processing data for table "public.cost_approvals"
pg_dump: dumping contents of table "public.cost_approvals"
pg_dump: processing data for table "public.follow_ups"
 NOT NULL,
    model text NOT NULL,
    year integer NOT NULL,
    color text NOT NULL,
    plate text NOT NULL,
    vehicle_type public.vehicle_type DEFAULT 'Carro'::public.vehicle_type NOT NULL,
    location text,
    status public.vehicle_status DEFAULT 'Entrada'::public.vehicle_status NOT NULL,
    physical_location text,
    physical_location_detail text,
    km_odometer integer,
    fuel_type text,
    sale_price numeric(10,2),
    fipe_reference_price text,
    main_image_url text,
    features text[],
    notes text,
    checklist json DEFAULT '{}'::json,
    vendedor_id character varying,
    vendedor_nome text,
    data_venda timestamp without time zone,
    valor_venda numeric(10,2),
    forma_pagamento text,
    observacoes_venda text,
    repassado_para text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    location_changed_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 3704 (class 0 OID 16571)
-- Dependencies: 215
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_log (id, empresa_id, user_id, user_name, activity_type, entity_type, entity_id, description, metadata, ip_address, created_at) FROM stdin;
\.


--
-- TOC entry 3705 (class 0 OID 16580)
-- Dependencies: 216
-- Data for Name: advanced_company_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.advanced_company_settings (id, empresa_id, categorias_custos, origens_leads, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3706 (class 0 OID 16594)
-- Dependencies: 217
-- Data for Name: approval_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.approval_settings (id, empresa_id, limite_aprovacao_automatica, exigir_aprovacao_gerente, notificar_proprietario, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3707 (class 0 OID 16609)
-- Dependencies: 218
-- Data for Name: bills_payable; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bills_payable (id, empresa_id, tipo, descricao, categoria, valor, data_vencimento, data_pagamento, status, observacoes, recorrente, parcelado, numero_parcela, total_parcelas, grupo_parcelamento, vehicle_id, criado_por, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3708 (class 0 OID 16622)
-- Dependencies: 219
-- Data for Name: commission_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.commission_payments (id, empresa_id, vendedor_id, veiculo_id, percentual_aplicado, valor_base, valor_comissao, status, data_pagamento, forma_pagamento, observacoes, criado_por, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3709 (class 0 OID 16633)
-- Dependencies: 220
-- Data for Name: commissions_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.commissions_config (id, empresa_id, vendedor_id, percentual_comissao, ativo, observacoes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3710 (class 0 OID 16644)
-- Dependencies: 221
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, nome_fantasia, razao_social, cnpj, endereco, telefone, telefone2, email, logo_url, cor_primaria, cor_secundaria, whatsapp_numero, locais_comuns, alerta_dias_parado, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3711 (class 0 OID 16658)
-- Dependencies: 222
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_settings (id, company_name, phone, email, address, cnpj, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3712 (class 0 OID 16668)
-- Dependencies: 223
-- Data for Name: cost_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cost_approvals (id, empresa_id, cost_id, solicitado_por, valor, status, aprovado_por, aprovado_em, motivo_rejeicao, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3713 (class 0 OID 16679)
-- Dependencies: 224
-- Data for Name: follow_ups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follow_ups (id, epg_dump: dumping contents of table "public.follow_ups"
pg_dump: processing data for table "public.leads"
pg_dump: dumping contents of table "public.leads"
pg_dump: processing data for table "public.operational_expenses"
pg_dump: dumping contents of table "public.operational_expenses"
pg_dump: processing data for table "public.sales_targets"
pg_dump: dumping contents of table "public.sales_targets"
pg_dump: processing data for table "public.sessions"
pg_dump: dumping contents of table "public.sessions"
pg_dump: processing data for table "public.store_observations"
pg_dump: dumping contents of table "public.store_observations"
pg_dump: processing data for table "public.user_permissions"
pg_dump: dumping contents of table "public.user_permissions"
pg_dump: processing data for table "public.users"
pg_dump: dumping contents of table "public.users"
pg_dump: processing data for table "public.vehicle_costs"
pg_dump: dumping contents of table "public.vehicle_costs"
pg_dump: processing data for table "public.vehicle_documents"
pg_dump: dumping contents of table "public.vehicle_documents"
pg_dump: processing data for table "public.vehicle_history"
pg_dump: dumping contents of table "public.vehicle_history"
pg_dump: processing data for table "public.vehicle_images"
pg_dump: dumping contents of table "public.vehicle_images"
pg_dump: processing data for table "public.vehicles"
mpresa_id, lead_id, vehicle_id, assigned_to, titulo, descricao, data_agendada, status, concluido_em, resultado, criado_por, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3714 (class 0 OID 16690)
-- Dependencies: 225
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leads (id, empresa_id, nome, telefone, email, status, veiculo_interesse, veiculo_interesse_nome, origem, observacoes, vendedor_responsavel, proximo_followup, valor_proposta, motivo_perdido, criado_por, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3715 (class 0 OID 16701)
-- Dependencies: 226
-- Data for Name: operational_expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operational_expenses (id, empresa_id, categoria, descricao, valor, data_vencimento, data_pagamento, pago, forma_pagamento, observacoes, criado_por, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3716 (class 0 OID 16712)
-- Dependencies: 227
-- Data for Name: sales_targets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales_targets (id, empresa_id, vendedor_id, mes_referencia, ano_referencia, meta_quantidade, meta_valor, observacoes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3717 (class 0 OID 16722)
-- Dependencies: 228
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (sid, sess, expire) FROM stdin;
\.


--
-- TOC entry 3718 (class 0 OID 16729)
-- Dependencies: 229
-- Data for Name: store_observations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.store_observations (id, empresa_id, description, category, status, created_at, resolved_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3719 (class 0 OID 16740)
-- Dependencies: 230
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_permissions (id, empresa_id, user_id, acessar_dashboard, acessar_veiculos, acessar_custos, acessar_alerts, acessar_observacoes, acessar_configuracoes, acessar_usuarios, acessar_financeiro, acessar_dashboard_financeiro, acessar_comissoes, acessar_despesas, acessar_relatorios, criar_veiculos, editar_veiculos, deletar_veiculos, ver_custos_veiculos, editar_custos_veiculos, ver_margens_lucro, usar_sugestao_preco, usar_geracao_anuncios, criado_por, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3720 (class 0 OID 16770)
-- Dependencies: 231
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, empresa_id, email, first_name, last_name, profile_image_url, password_hash, auth_provider, role, is_active, created_by, email_verified, verification_code, verification_code_expiry, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3721 (class 0 OID 16786)
-- Dependencies: 232
-- Data for Name: vehicle_costs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicle_costs (id, vehicle_id, category, description, value, date, payment_method, paid_by, created_at) FROM stdin;
\.


--
-- TOC entry 3722 (class 0 OID 16796)
-- Dependencies: 233
-- Data for Name: vehicle_documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicle_documents (id, vehicle_id, document_type, original_file_name, stored_file_name, storage_path, file_size, mime_type, uploaded_at, uploaded_by) FROM stdin;
\.


--
-- TOC entry 3723 (class 0 OID 16806)
-- Dependencies: 234
-- Data for Name: vehicle_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicle_history (id, vehicle_id, from_location, to_location, from_status, to_status, from_physical_location, to_physical_location, from_physical_location_detail, to_physical_location_detail, user_id, notes, moved_at, created_at) FROM stdin;
\.


--
-- TOC entry 3724 (class 0 OID 16816)
-- Dependencies: 235
-- Data for Name: vehicle_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vehicle_images (id, vehicle_id, image_url, "order", created_at) FROM stdin;
\.


--
-- TOC entry 3725 (class 0 OID 16826)
-- Dependencies: 236
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: -
--

pg_dump: dumping contents of table "public.vehicles"
pg_dump: creating CONSTRAINT "public.activity_log activity_log_pkey"
pg_dump: creating CONSTRAINT "public.advanced_company_settings advanced_company_settings_empresa_id_unique"
pg_dump: creating CONSTRAINT "public.advanced_company_settings advanced_company_settings_pkey"
pg_dump: creating CONSTRAINT "public.approval_settings approval_settings_empresa_id_unique"
pg_dump: creating CONSTRAINT "public.approval_settings approval_settings_pkey"
pg_dump: creating CONSTRAINT "public.bills_payable bills_payable_pkey"
pg_dump: creating CONSTRAINT "public.commission_payments commission_payments_pkey"
pg_dump: creating CONSTRAINT "public.commissions_config commissions_config_pkey"
pg_dump: creating CONSTRAINT "public.companies companies_pkey"
pg_dump: creating CONSTRAINT "public.company_settings company_settings_pkey"
pg_dump: creating CONSTRAINT "public.cost_approvals cost_approvals_pkey"
pg_dump: creating CONSTRAINT "public.follow_ups follow_ups_pkey"
pg_dump: creating CONSTRAINT "public.leads leads_pkey"
pg_dump: creating CONSTRAINT "public.operational_expenses operational_expenses_pkey"
pg_dump: creating CONSTRAINT "public.sales_targets sales_targets_pkey"
pg_dump: creating CONSTRAINT "public.sessions sessions_pkey"
COPY public.vehicles (id, empresa_id, brand, model, year, color, plate, vehicle_type, location, status, physical_location, physical_location_detail, km_odometer, fuel_type, sale_price, fipe_reference_price, main_image_url, features, notes, checklist, vendedor_id, vendedor_nome, data_venda, valor_venda, forma_pagamento, observacoes_venda, repassado_para, created_at, updated_at, location_changed_at) FROM stdin;
\.


--
-- TOC entry 3503 (class 2606 OID 16579)
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- TOC entry 3505 (class 2606 OID 16593)
-- Name: advanced_company_settings advanced_company_settings_empresa_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advanced_company_settings
    ADD CONSTRAINT advanced_company_settings_empresa_id_unique UNIQUE (empresa_id);


--
-- TOC entry 3507 (class 2606 OID 16591)
-- Name: advanced_company_settings advanced_company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advanced_company_settings
    ADD CONSTRAINT advanced_company_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3509 (class 2606 OID 16608)
-- Name: approval_settings approval_settings_empresa_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_settings
    ADD CONSTRAINT approval_settings_empresa_id_unique UNIQUE (empresa_id);


--
-- TOC entry 3511 (class 2606 OID 16606)
-- Name: approval_settings approval_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_settings
    ADD CONSTRAINT approval_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3513 (class 2606 OID 16621)
-- Name: bills_payable bills_payable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bills_payable
    ADD CONSTRAINT bills_payable_pkey PRIMARY KEY (id);


--
-- TOC entry 3515 (class 2606 OID 16632)
-- Name: commission_payments commission_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_payments
    ADD CONSTRAINT commission_payments_pkey PRIMARY KEY (id);


--
-- TOC entry 3517 (class 2606 OID 16643)
-- Name: commissions_config commissions_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commissions_config
    ADD CONSTRAINT commissions_config_pkey PRIMARY KEY (id);


--
-- TOC entry 3519 (class 2606 OID 16657)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- TOC entry 3521 (class 2606 OID 16667)
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3523 (class 2606 OID 16678)
-- Name: cost_approvals cost_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_approvals
    ADD CONSTRAINT cost_approvals_pkey PRIMARY KEY (id);


--
-- TOC entry 3525 (class 2606 OID 16689)
-- Name: follow_ups follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_pkey PRIMARY KEY (id);


--
-- TOC entry 3527 (class 2606 OID 16700)
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- TOC entry 3529 (class 2606 OID 16711)
-- Name: operational_expenses operational_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operational_expenses
    ADD CONSTRAINT operational_expenses_pkey PRIMARY KEY (id);


--
-- TOC entry 3531 (class 2606 OID 16721)
-- Name: sales_targets sales_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_targets
    ADD CONSTRAINT sales_targets_pkey PRIMARY KEY (id);


--
-- TOC entry 35pg_dump: creating CONSTRAINT "public.store_observations store_observations_pkey"
pg_dump: creating CONSTRAINT "public.user_permissions user_permissions_pkey"
pg_dump: creating CONSTRAINT "public.users users_email_unique"
pg_dump: creating CONSTRAINT "public.users users_pkey"
pg_dump: creating CONSTRAINT "public.vehicle_costs vehicle_costs_pkey"
pg_dump: creating CONSTRAINT "public.vehicle_documents vehicle_documents_pkey"
pg_dump: creating CONSTRAINT "public.vehicle_history vehicle_history_pkey"
pg_dump: creating CONSTRAINT "public.vehicle_images vehicle_images_pkey"
pg_dump: creating CONSTRAINT "public.vehicles vehicles_pkey"
pg_dump: creating CONSTRAINT "public.vehicles vehicles_plate_unique"
pg_dump: creating INDEX "public.IDX_session_expire"
pg_dump: creating FK CONSTRAINT "public.vehicle_costs vehicle_costs_vehicle_id_vehicles_id_fk"
pg_dump: creating FK CONSTRAINT "public.vehicle_documents vehicle_documents_uploaded_by_users_id_fk"
pg_dump: creating FK CONSTRAINT "public.vehicle_documents vehicle_documents_vehicle_id_vehicles_id_fk"
pg_dump: creating FK CONSTRAINT "public.vehicle_history vehicle_history_user_id_users_id_fk"
pg_dump: creating FK CONSTRAINT "public.vehicle_history vehicle_history_vehicle_id_vehicles_id_fk"
34 (class 2606 OID 16728)
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- TOC entry 3536 (class 2606 OID 16739)
-- Name: store_observations store_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_observations
    ADD CONSTRAINT store_observations_pkey PRIMARY KEY (id);


--
-- TOC entry 3538 (class 2606 OID 16769)
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 3540 (class 2606 OID 16785)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- TOC entry 3542 (class 2606 OID 16783)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3544 (class 2606 OID 16795)
-- Name: vehicle_costs vehicle_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_costs
    ADD CONSTRAINT vehicle_costs_pkey PRIMARY KEY (id);


--
-- TOC entry 3546 (class 2606 OID 16805)
-- Name: vehicle_documents vehicle_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_documents
    ADD CONSTRAINT vehicle_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3548 (class 2606 OID 16815)
-- Name: vehicle_history vehicle_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_history
    ADD CONSTRAINT vehicle_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3550 (class 2606 OID 16825)
-- Name: vehicle_images vehicle_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_images
    ADD CONSTRAINT vehicle_images_pkey PRIMARY KEY (id);


--
-- TOC entry 3552 (class 2606 OID 16839)
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- TOC entry 3554 (class 2606 OID 16841)
-- Name: vehicles vehicles_plate_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_plate_unique UNIQUE (plate);


--
-- TOC entry 3532 (class 1259 OID 16872)
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- TOC entry 3555 (class 2606 OID 16842)
-- Name: vehicle_costs vehicle_costs_vehicle_id_vehicles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_costs
    ADD CONSTRAINT vehicle_costs_vehicle_id_vehicles_id_fk FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- TOC entry 3556 (class 2606 OID 16852)
-- Name: vehicle_documents vehicle_documents_uploaded_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_documents
    ADD CONSTRAINT vehicle_documents_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- TOC entry 3557 (class 2606 OID 16847)
-- Name: vehicle_documents vehicle_documents_vehicle_id_vehicles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_documents
    ADD CONSTRAINT vehicle_documents_vehicle_id_vehicles_id_fk FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- TOC entry 3558 (class 2606 OID 16862)
-- Name: vehicle_history vehicle_history_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_history
    ADD CONSTRAINT vehicle_history_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 3559 (class 2606 OID 16857)
-- Name: vehicle_history vehicle_history_vehicle_id_vehicles_id_fk; Type: Fpg_dump: creating FK CONSTRAINT "public.vehicle_images vehicle_images_vehicle_id_vehicles_id_fk"
K CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_history
    ADD CONSTRAINT vehicle_history_vehicle_id_vehicles_id_fk FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- TOC entry 3560 (class 2606 OID 16867)
-- Name: vehicle_images vehicle_images_vehicle_id_vehicles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicle_images
    ADD CONSTRAINT vehicle_images_vehicle_id_vehicles_id_fk FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


-- Completed on 2025-11-22 13:36:40 UTC

--
-- PostgreSQL database dump complete
--

