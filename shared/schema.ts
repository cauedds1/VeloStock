import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum, json, numeric, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const checklistItemSchema = z.object({
  item: z.string(),
  observation: z.string().optional(),
});

export const vehicleChecklistSchema = z.object({
  pneus: z.array(checklistItemSchema).optional(),
  interior: z.array(checklistItemSchema).optional(),
  somEletrica: z.array(checklistItemSchema).optional(),
  lataria: z.array(checklistItemSchema).optional(),
  documentacao: z.array(checklistItemSchema).optional(),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type VehicleChecklist = z.infer<typeof vehicleChecklistSchema>;

// Enums
export const vehicleTypeEnum = pgEnum("vehicle_type", ["Carro", "Moto"]);

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "Entrada",
  "Em Reparos",
  "Em Higienização",
  "Pronto para Venda",
  "Vendido",
  "Arquivado"
]);

export const storeObservationCategoryEnum = pgEnum("store_observation_category", [
  "Estoque",
  "Manutenção",
  "Outro"
]);

export const storeObservationStatusEnum = pgEnum("store_observation_status", [
  "Pendente",
  "Resolvido"
]);

export const userRoleEnum = pgEnum("user_role", [
  "proprietario",
  "gerente",
  "financeiro",
  "vendedor",
  "motorista"
]);

export const billTypeEnum = pgEnum("bill_type", [
  "a_pagar",
  "a_receber"
]);

export const billStatusEnum = pgEnum("bill_status", [
  "pendente",
  "pago",
  "vencido",
  "parcial"
]);

// Session storage table - Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - Replit Auth with multi-tenant support
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
// Schema para permissões personalizadas por usuário
export const customPermissionsSchema = z.object({
  viewFinancialMetrics: z.boolean().optional(),
  viewCosts: z.boolean().optional(),
  editPrices: z.boolean().optional(),
  addCosts: z.boolean().optional(),
  editVehicles: z.boolean().optional(),
  deleteVehicles: z.boolean().optional(),
  viewBills: z.boolean().optional(),
  viewFinancialReports: z.boolean().optional(),
  viewOperationalReports: z.boolean().optional(),
  viewLeads: z.boolean().optional(),
  manageUsers: z.boolean().optional(),
  companySettings: z.boolean().optional(),
  viewPriceTab: z.boolean().optional(),
  viewAdTab: z.boolean().optional(),
  viewMediaTab: z.boolean().optional(),
  viewDocumentsTab: z.boolean().optional(),
  markAsSold: z.boolean().optional(),
});

export type CustomPermissions = z.infer<typeof customPermissionsSchema>;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id"), // Multi-tenant: user belongs to one company
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // Para autenticação nativa (bcrypt)
  authProvider: varchar("auth_provider").default("local"), // "local" ou "google"
  role: userRoleEnum("role").default("vendedor"), // Papel do usuário no sistema
  isActive: varchar("is_active").default("true"), // "true" ou "false"
  createdBy: varchar("created_by"), // ID do usuário que criou este usuário
  emailVerified: varchar("email_verified").default("false"), // "true" ou "false"
  verificationCode: varchar("verification_code"), // Código de 6 dígitos
  verificationCodeExpiry: timestamp("verification_code_expiry"), // Expiração do código
  // Comissão por vendedor (valor fixo em R$)
  comissaoFixa: numeric("comissao_fixa", { precision: 10, scale: 2 }), // Comissão fixa em R$ para este vendedor
  usarComissaoFixaGlobal: varchar("usar_comissao_fixa_global").default("true"), // "true" ou "false" - se true, usa a comissão global
  // Permissões personalizadas (JSON) - override das permissões padrão do role
  customPermissions: json("custom_permissions").$type<CustomPermissions>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id"),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  color: text("color").notNull(),
  plate: text("plate").notNull().unique(),
  vehicleType: vehicleTypeEnum("vehicle_type").notNull().default("Carro"),
  location: text("location"), // deprecated - kept for migration only
  status: vehicleStatusEnum("status").notNull().default("Entrada"),
  physicalLocation: text("physical_location"),
  physicalLocationDetail: text("physical_location_detail"),
  kmOdometer: integer("km_odometer"),
  fuelType: text("fuel_type"),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }), // Preço de aquisição - quanto a loja pagou pelo veículo
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }), // stored in reais
  fipeReferencePrice: text("fipe_reference_price"), // Preço FIPE consultado (string da API)
  mainImageUrl: text("main_image_url"),
  features: text("features").array(),
  notes: text("notes"),
  checklist: json("checklist").$type<{
    pneus?: Array<{ item: string; observation?: string }>;
    interior?: Array<{ item: string; observation?: string }>;
    somEletrica?: Array<{ item: string; observation?: string }>;
    lataria?: Array<{ item: string; observation?: string }>;
    documentacao?: Array<{ item: string; observation?: string }>;
  }>().default({}),
  // Campos de venda e comissão
  vendedorId: varchar("vendedor_id"), // FK para users - quem vendeu o veículo
  vendedorNome: text("vendedor_nome"), // Nome do vendedor (cache)
  dataVenda: timestamp("data_venda"), // Quando foi vendido
  valorVenda: numeric("valor_venda", { precision: 10, scale: 2 }), // Valor real da venda (pode ser diferente do salePrice)
  formaPagamento: text("forma_pagamento"), // À vista, financiado, etc
  observacoesVenda: text("observacoes_venda"),
  repassadoPara: text("repassado_para"), // Nome de quem recebeu o veículo repassado
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  locationChangedAt: timestamp("location_changed_at").defaultNow().notNull(),
});

// Helper para validar valores monetários (rejeita NaN, Infinity, negativos e valores extremos)
const monetaryValueSchema = z.union([z.string(), z.number(), z.null()])
  .transform((val) => {
    if (val === null || val === undefined || val === "") return null;
    const num = typeof val === 'string' ? Number(val) : val;
    // Rejeitar valores inválidos
    if (!Number.isFinite(num)) {
      throw new Error("Valor monetário inválido: deve ser um número finito");
    }
    if (num < 0) {
      throw new Error("Valor monetário não pode ser negativo");
    }
    if (num > 999999999.99) {
      throw new Error("Valor monetário muito grande (máximo: R$ 999.999.999,99)");
    }
    return num;
  })
  .nullable()
  .optional();

export const insertVehicleSchema = createInsertSchema(vehicles, {
  purchasePrice: monetaryValueSchema,
  salePrice: monetaryValueSchema,
  valorVenda: monetaryValueSchema,
  kmOdometer: z.union([z.number(), z.string()]).transform(val => {
    if (val === null || val === undefined || val === "") return null;
    const num = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(num)) {
      throw new Error("Quilometragem inválida: deve ser um número válido");
    }
    if (num < 0) {
      throw new Error("Quilometragem não pode ser negativa");
    }
    return Math.floor(num);
  }).nullable().optional(),
  year: z.union([z.number(), z.string()]).transform(val => {
    if (val === null || val === undefined || val === "") return null;
    const num = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(num)) {
      throw new Error("Ano inválido: deve ser um número válido");
    }
    if (num < 1900 || num > new Date().getFullYear() + 1) {
      throw new Error(`Ano deve estar entre 1900 e ${new Date().getFullYear() + 1}`);
    }
    return Math.floor(num);
  }).nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  locationChangedAt: true,
}).extend({
  checklist: vehicleChecklistSchema.optional(),
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Vehicle images table
export const vehicleImages = pgTable("vehicle_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVehicleImageSchema = createInsertSchema(vehicleImages).omit({
  id: true,
  createdAt: true,
});

export type InsertVehicleImage = z.infer<typeof insertVehicleImageSchema>;
export type VehicleImage = typeof vehicleImages.$inferSelect;

// Vehicle history table
export const vehicleHistory = pgTable("vehicle_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  fromLocation: text("from_location"), // deprecated - kept for migration
  toLocation: text("to_location"), // deprecated - kept for migration
  fromStatus: vehicleStatusEnum("from_status"),
  toStatus: vehicleStatusEnum("to_status").notNull(),
  fromPhysicalLocation: text("from_physical_location"),
  toPhysicalLocation: text("to_physical_location"),
  fromPhysicalLocationDetail: text("from_physical_location_detail"),
  toPhysicalLocationDetail: text("to_physical_location_detail"),
  userId: varchar("user_id")
    .references(() => users.id),
  notes: text("notes"),
  movedAt: timestamp("moved_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVehicleHistorySchema = createInsertSchema(vehicleHistory).omit({
  id: true,
  createdAt: true,
});

export const updateVehicleHistorySchema = z.object({
  toStatus: z.enum([
    "Entrada",
    "Em Reparos",
    "Em Higienização",
    "Pronto para Venda",
    "Vendido",
    "Arquivado"
  ]).optional(),
  toPhysicalLocation: z.string().nullable().optional(),
  toPhysicalLocationDetail: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  movedAt: z.string().datetime().optional(),
});

export type InsertVehicleHistory = z.infer<typeof insertVehicleHistorySchema>;
export type UpdateVehicleHistory = z.infer<typeof updateVehicleHistorySchema>;
export type VehicleHistory = typeof vehicleHistory.$inferSelect;

// Vehicle costs table
export const vehicleCosts = pgTable("vehicle_costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  paymentMethod: text("payment_method").notNull().default("Cartão Loja"),
  paidBy: text("paid_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVehicleCostSchema = createInsertSchema(vehicleCosts, {
  value: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? Number(val) : val;
    // Validar que é um número válido
    if (!Number.isFinite(num)) {
      throw new Error("Custo inválido: deve ser um número finito");
    }
    if (num < 0) {
      throw new Error("Custo não pode ser negativo");
    }
    if (num > 999999.99) {
      throw new Error("Custo muito grande (máximo: R$ 999.999,99)");
    }
    return num.toString();
  }),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertVehicleCost = z.infer<typeof insertVehicleCostSchema>;
export type VehicleCost = typeof vehicleCosts.$inferSelect;

// Document types enum
export const documentTypeEnum = pgEnum("document_type", [
  "CRLV",
  "Nota Fiscal",
  "Laudo Cautelar",
  "Contrato de Compra",
  "Transferência"
]);

// Vehicle documents table
export const vehicleDocuments = pgTable("vehicle_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  documentType: documentTypeEnum("document_type").notNull(),
  originalFileName: text("original_file_name").notNull(),
  storedFileName: text("stored_file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: text("mime_type").notNull().default("application/pdf"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
});

export const insertVehicleDocumentSchema = createInsertSchema(vehicleDocuments).omit({
  id: true,
  uploadedAt: true,
});

export type InsertVehicleDocument = z.infer<typeof insertVehicleDocumentSchema>;
export type VehicleDocument = typeof vehicleDocuments.$inferSelect;

// Store observations table
export const storeObservations = pgTable("store_observations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id"),
  description: text("description").notNull(),
  category: text("category"),
  status: storeObservationStatusEnum("status").notNull().default("Pendente"),
  expenseCost: numeric("expense_cost", { precision: 10, scale: 2 }), // Custo associado se registrado
  expenseDescription: text("expense_description"), // Descrição do gasto
  expensePaymentMethod: text("expense_payment_method"), // Forma de pagamento
  expensePaidBy: text("expense_paid_by"), // Quem pagou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStoreObservationSchema = createInsertSchema(storeObservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
}).extend({
  empresaId: z.string().optional(),
  expenseCost: z.union([z.number(), z.string()]).optional().transform(val => {
    if (!val) return undefined;
    const num = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(num)) {
      throw new Error("Custo da despesa inválido: deve ser um número finito");
    }
    if (num < 0) {
      throw new Error("Custo da despesa não pode ser negativo");
    }
    if (num > 99999999.99) {
      throw new Error("Custo da despesa muito grande (máximo: R$ 99.999.999,99)");
    }
    return num;
  }),
});

export type InsertStoreObservation = z.infer<typeof insertStoreObservationSchema>;
export type StoreObservation = typeof storeObservations.$inferSelect;

// Companies table (multi-tenant)
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nomeFantasia: text("nome_fantasia").notNull(),
  razaoSocial: text("razao_social"),
  cnpj: text("cnpj"),
  endereco: text("endereco"),
  telefone: text("telefone"),
  telefone2: text("telefone2"),
  email: text("email"),
  logoUrl: text("logo_url"),
  corPrimaria: text("cor_primaria").default("#dc2626"),
  corSecundaria: text("cor_secundaria").default("#000000"),
  whatsappNumero: text("whatsapp_numero"),
  locaisComuns: json("locais_comuns").$type<string[]>().default([]),
  alertaDiasParado: integer("alerta_dias_parado").default(7),
  // Comissão fixa global (valor em R$)
  comissaoFixaGlobal: numeric("comissao_fixa_global", { precision: 10, scale: 2 }).default("0"),
  // Toggle para mudar cor dos ícones junto com tema
  changeIconColors: varchar("change_icon_colors").default("true"), // "true" ou "false"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// Company settings table (deprecated - mantido para compatibilidade)
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  cnpj: text("cnpj"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;

// ============================================
// MÓDULO FINANCEIRO
// ============================================

// Enums para módulo financeiro
export const expenseCategoryEnum = pgEnum("expense_category", [
  "Aluguel",
  "Energia",
  "Água",
  "Internet",
  "Telefone",
  "Salários",
  "Impostos",
  "Marketing",
  "Manutenção",
  "Combustível",
  "Outros"
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "Receita", // Venda de veículo
  "Despesa"  // Despesa operacional
]);

export const commissionStatusEnum = pgEnum("commission_status", [
  "A Pagar",
  "Paga",
  "Cancelada"
]);

// Configuração de comissões por vendedor
export const commissionsConfig = pgTable("commissions_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  vendedorId: varchar("vendedor_id").notNull(), // FK para users
  percentualComissao: numeric("percentual_comissao", { precision: 5, scale: 2 }).notNull(), // Ex: 5.00 para 5%
  ativo: varchar("ativo").default("true"), // "true" ou "false"
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommissionsConfigSchema = createInsertSchema(commissionsConfig, {
  percentualComissao: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(num)) {
      throw new Error("Percentual de comissão inválido: deve ser um número finito");
    }
    if (num < 0 || num > 100) {
      throw new Error("Percentual de comissão deve estar entre 0 e 100");
    }
    return num;
  }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommissionsConfig = z.infer<typeof insertCommissionsConfigSchema>;
export type CommissionsConfig = typeof commissionsConfig.$inferSelect;

// Despesas operacionais
export const operationalExpenses = pgTable("operational_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  categoria: expenseCategoryEnum("categoria").notNull(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(), // Valor em reais
  dataVencimento: timestamp("data_vencimento"),
  dataPagamento: timestamp("data_pagamento"),
  pago: varchar("pago").default("false"), // "true" ou "false"
  formaPagamento: text("forma_pagamento"), // Dinheiro, Cartão, Transferência, etc
  observacoes: text("observacoes"),
  criadoPor: varchar("criado_por"), // ID do usuário que criou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOperationalExpenseSchema = createInsertSchema(operationalExpenses, {
  valor: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(num)) {
      throw new Error("Valor da despesa inválido: deve ser um número finito");
    }
    if (num < 0) {
      throw new Error("Valor da despesa não pode ser negativo");
    }
    if (num > 99999999.99) {
      throw new Error("Valor da despesa muito grande (máximo: R$ 99.999.999,99)");
    }
    return num;
  }),
  dataPagamento: z.union([z.date(), z.string()]).nullable().optional().transform(val => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    if (typeof val === 'string') return new Date(val);
    return undefined;
  }),
  dataVencimento: z.union([z.date(), z.string()]).nullable().optional().transform(val => {
    if (!val) return undefined;
    if (val instanceof Date) return val;
    if (typeof val === 'string') return new Date(val);
    return undefined;
  }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOperationalExpense = z.infer<typeof insertOperationalExpenseSchema>;
export type OperationalExpense = typeof operationalExpenses.$inferSelect;

// Comissões de vendedores (registro de comissões calculadas e pagas)
export const commissionPayments = pgTable("commission_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  vendedorId: varchar("vendedor_id").notNull(), // FK para users
  veiculoId: varchar("veiculo_id"), // FK para vehicles (opcional - pode ser comissão agrupada)
  percentualAplicado: numeric("percentual_aplicado", { precision: 5, scale: 2 }).notNull(),
  valorBase: numeric("valor_base", { precision: 10, scale: 2 }).notNull(), // Valor sobre o qual a comissão foi calculada
  valorComissao: numeric("valor_comissao", { precision: 10, scale: 2 }).notNull(), // Valor da comissão
  status: commissionStatusEnum("status").default("A Pagar"),
  dataPagamento: timestamp("data_pagamento"),
  formaPagamento: text("forma_pagamento"),
  observacoes: text("observacoes"),
  criadoPor: varchar("criado_por"), // ID do usuário que criou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommissionPaymentSchema = createInsertSchema(commissionPayments, {
  valorBase: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(num)) {
      throw new Error("Valor base da comissão inválido: deve ser um número finito");
    }
    if (num < 0) {
      throw new Error("Valor base da comissão não pode ser negativo");
    }
    if (num > 999999999.99) {
      throw new Error("Valor base muito grande (máximo: R$ 999.999.999,99)");
    }
    return num;
  }),
  valorComissao: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(num)) {
      throw new Error("Valor da comissão inválido: deve ser um número finito");
    }
    if (num < 0) {
      throw new Error("Valor da comissão não pode ser negativo");
    }
    if (num > 99999999.99) {
      throw new Error("Valor da comissão muito grande (máximo: R$ 99.999.999,99)");
    }
    return num;
  }),
  percentualAplicado: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(num)) {
      throw new Error("Percentual de comissão inválido: deve ser um número finito");
    }
    if (num < 0 || num > 100) {
      throw new Error("Percentual de comissão deve estar entre 0 e 100");
    }
    return num;
  }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCommissionPayment = z.infer<typeof insertCommissionPaymentSchema>;
export type CommissionPayment = typeof commissionPayments.$inferSelect;

// Metas de vendas
export const salesTargets = pgTable("sales_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  vendedorId: varchar("vendedor_id"), // Null = meta da loja inteira
  mesReferencia: integer("mes_referencia").notNull(), // 1-12
  anoReferencia: integer("ano_referencia").notNull(), // 2024, 2025, etc
  metaQuantidade: integer("meta_quantidade"), // Quantidade de veículos a vender
  metaValor: numeric("meta_valor", { precision: 10, scale: 2 }), // Valor total a vender
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSalesTargetSchema = createInsertSchema(salesTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSalesTarget = z.infer<typeof insertSalesTargetSchema>;
export type SalesTarget = typeof salesTargets.$inferSelect;

// ============================================
// PERMISSÕES CUSTOMIZADAS (GRANULARES)
// ============================================

// Permissões granulares por usuário (override do papel padrão)
export const userPermissions = pgTable("user_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  userId: varchar("user_id").notNull(), // FK para users
  // Menu e páginas
  acessarDashboard: varchar("acessar_dashboard").default("true"),
  acessarVeiculos: varchar("acessar_veiculos").default("true"),
  acessarCustos: varchar("acessar_custos").default("true"),
  acessarAlerts: varchar("acessar_alerts").default("true"),
  acessarObservacoes: varchar("acessar_observacoes").default("true"),
  acessarConfiguracoes: varchar("acessar_configuracoes").default("false"),
  acessarUsuarios: varchar("acessar_usuarios").default("false"),
  // Módulo Financeiro
  acessarFinanceiro: varchar("acessar_financeiro").default("false"),
  acessarDashboardFinanceiro: varchar("acessar_dashboard_financeiro").default("false"),
  acessarComissoes: varchar("acessar_comissoes").default("false"),
  acessarDespesas: varchar("acessar_despesas").default("false"),
  acessarRelatorios: varchar("acessar_relatorios").default("false"),
  // Ações em veículos
  criarVeiculos: varchar("criar_veiculos").default("true"),
  editarVeiculos: varchar("editar_veiculos").default("true"),
  deletarVeiculos: varchar("deletar_veiculos").default("false"),
  verCustosVeiculos: varchar("ver_custos_veiculos").default("true"),
  editarCustosVeiculos: varchar("editar_custos_veiculos").default("true"),
  verMargensLucro: varchar("ver_margens_lucro").default("false"),
  // Funcionalidades AI
  usarSugestaoPreco: varchar("usar_sugestao_preco").default("true"),
  usarGeracaoAnuncios: varchar("usar_geracao_anuncios").default("true"),
  // Data
  criadoPor: varchar("criado_por"), // ID do proprietário que configurou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPermissionsSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPermissions = z.infer<typeof insertUserPermissionsSchema>;
export type UserPermissions = typeof userPermissions.$inferSelect;

// ============================================
// ACTIVITY LOG (AUDITORIA COMPLETA)
// ============================================

export const activityTypeEnum = pgEnum("activity_type", [
  "vehicle_created",
  "vehicle_updated",
  "vehicle_deleted",
  "vehicle_status_changed",
  "vehicle_sold",
  "cost_added",
  "cost_updated",
  "cost_deleted",
  "cost_approved",
  "cost_rejected",
  "document_uploaded",
  "document_deleted",
  "image_uploaded",
  "image_deleted",
  "user_created",
  "user_updated",
  "user_deactivated",
  "settings_updated",
  "lead_created",
  "lead_updated",
  "lead_converted",
]);

export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  activityType: activityTypeEnum("activity_type").notNull(),
  entityType: text("entity_type").notNull(), // "vehicle", "cost", "user", etc
  entityId: varchar("entity_id"), // ID do veículo, custo, etc
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON com dados extras
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

// ============================================
// LEADS / CLIENTES (Para vendedores)
// ============================================

export const leadStatusEnum = pgEnum("lead_status", [
  "Novo",
  "Contatado",
  "Visitou Loja",
  "Proposta Enviada",
  "Negociando",
  "Convertido",
  "Perdido",
]);

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  nome: text("nome").notNull(),
  telefone: varchar("telefone").notNull(),
  email: varchar("email"),
  status: leadStatusEnum("status").notNull().default("Novo"),
  veiculoInteresse: varchar("veiculo_interesse"), // ID do veículo
  veiculoInteresseNome: text("veiculo_interesse_nome"), // Nome legível
  origem: text("origem"), // WhatsApp, Telefone, Presencial, Site
  observacoes: text("observacoes"),
  vendedorResponsavel: varchar("vendedor_responsavel"), // ID do vendedor
  proximoFollowup: timestamp("proximo_followup"),
  valorProposta: numeric("valor_proposta", { precision: 10, scale: 2 }),
  motivoPerdido: text("motivo_perdido"),
  criadoPor: varchar("criado_por").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads, {
  valorProposta: z.union([z.number(), z.string(), z.null()]).transform(val => 
    val === null ? null : (typeof val === 'string' ? val : val.toString())
  ).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// ============================================
// APROVAÇÃO DE CUSTOS (Workflow de aprovação)
// ============================================

export const costApprovalStatusEnum = pgEnum("cost_approval_status", [
  "Pendente",
  "Aprovado",
  "Rejeitado",
]);

export const costApprovals = pgTable("cost_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  costId: varchar("cost_id").notNull(), // FK para vehicle_costs
  solicitadoPor: varchar("solicitado_por").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  status: costApprovalStatusEnum("status").notNull().default("Pendente"),
  aprovadoPor: varchar("aprovado_por"),
  aprovadoEm: timestamp("aprovado_em"),
  motivoRejeicao: text("motivo_rejeicao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCostApprovalSchema = createInsertSchema(costApprovals, {
  valor: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? val : val.toString()),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCostApproval = z.infer<typeof insertCostApprovalSchema>;
export type CostApproval = typeof costApprovals.$inferSelect;

// ============================================
// CONFIGURAÇÕES DE APROVAÇÃO (Por empresa)
// ============================================

export const approvalSettings = pgTable("approval_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().unique(),
  limiteAprovacaoAutomatica: numeric("limite_aprovacao_automatica", { precision: 10, scale: 2 }).default("500.00"),
  exigirAprovacaoGerente: varchar("exigir_aprovacao_gerente").default("true"),
  notificarProprietario: varchar("notificar_proprietario").default("true"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertApprovalSettingsSchema = createInsertSchema(approvalSettings, {
  limiteAprovacaoAutomatica: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? val : val.toString()),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApprovalSettings = z.infer<typeof insertApprovalSettingsSchema>;
export type ApprovalSettings = typeof approvalSettings.$inferSelect;

// ============================================
// FOLLOW-UPS (Lembretes para vendedores)
// ============================================

export const followUpStatusEnum = pgEnum("followup_status", [
  "Pendente",
  "Concluído",
  "Cancelado",
]);

export const followUps = pgTable("follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  leadId: varchar("lead_id"), // FK para leads
  vehicleId: varchar("vehicle_id"), // FK para vehicles
  assignedTo: varchar("assigned_to").notNull(), // vendedor responsável
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  dataAgendada: timestamp("data_agendada").notNull(),
  status: followUpStatusEnum("status").notNull().default("Pendente"),
  concluidoEm: timestamp("concluido_em"),
  resultado: text("resultado"), // O que aconteceu no follow-up
  criadoPor: varchar("criado_por").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFollowUpSchema = createInsertSchema(followUps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFollowUp = z.infer<typeof insertFollowUpSchema>;
export type FollowUp = typeof followUps.$inferSelect;

// ============================================
// CONFIGURAÇÕES AVANÇADAS DA EMPRESA
// ============================================

export const advancedCompanySettings = pgTable("advanced_company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull().unique(),
  
  // Categorias de custos customizadas (JSON array)
  categoriasCustos: text("categorias_custos").array().default([
    "Mecânica",
    "Estética",
    "Documentação",
    "Outros"
  ]),
  
  // Origens de leads customizadas
  origensLeads: text("origens_leads").array().default([
    "WhatsApp",
    "Site",
    "Indicação",
    "Loja Física",
    "Redes Sociais",
    "Telefone"
  ]),
  
  // Localizações customizadas para veículos
  localizacoes: text("localizacoes").array().default([
    "Matriz",
    "Filial",
    "Pátio Externo",
    "Oficina"
  ]),
  
  // Prazos customizáveis (em dias)
  prazoPreparacaoVeiculo: integer("prazo_preparacao_veiculo").default(7),
  prazoValidadeOrcamento: integer("prazo_validade_orcamento").default(30),
  prazoAlertaVeiculoParado: integer("prazo_alerta_veiculo_parado").default(7),
  
  // Configurações de notificações (ativas/inativas)
  notificacoesVeiculosParados: integer("notificacoes_veiculos_parados").default(1), // 1 = ativo, 0 = inativo
  notificacoesPrazos: integer("notificacoes_prazos").default(1),
  avisosCustosAltos: integer("avisos_custos_altos").default(1),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAdvancedCompanySettingsSchema = createInsertSchema(advancedCompanySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAdvancedCompanySettings = z.infer<typeof insertAdvancedCompanySettingsSchema>;
export type AdvancedCompanySettings = typeof advancedCompanySettings.$inferSelect;

// ============================================
// CONTAS A PAGAR E A RECEBER
// ============================================

export const billsPayable = pgTable("bills_payable", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  
  tipo: billTypeEnum("tipo").notNull(), // "a_pagar" ou "a_receber"
  descricao: text("descricao").notNull(),
  categoria: varchar("categoria").notNull(), // Aluguel, Salário, Fornecedor, Venda, etc.
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  
  dataVencimento: timestamp("data_vencimento").notNull(),
  dataPagamento: timestamp("data_pagamento"), // Quando foi pago/recebido
  status: billStatusEnum("status").notNull().default("pendente"),
  
  observacoes: text("observacoes"),
  
  // Para contas recorrentes (ex: aluguel mensal)
  recorrente: integer("recorrente").default(0), // 0 = não, 1 = sim
  
  // Para parcelamentos
  parcelado: integer("parcelado").default(0), // 0 = não, 1 = sim
  numeroParcela: integer("numero_parcela"), // Ex: 1 de 12
  totalParcelas: integer("total_parcelas"), // Ex: 12
  grupoParcelamento: varchar("grupo_parcelamento"), // ID para agrupar parcelas da mesma conta
  
  // Relacionamento com veículos (opcional - se a conta for relacionada a venda)
  vehicleId: varchar("vehicle_id"),
  
  // Quem criou/registrou
  criadoPor: varchar("criado_por").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBillPayableSchema = createInsertSchema(billsPayable, {
  valor: z.union([z.number(), z.string()]).transform(val => {
    const num = typeof val === 'string' ? Number(val) : val;
    if (!Number.isFinite(num)) {
      throw new Error("Valor da conta inválido: deve ser um número finito");
    }
    if (num < 0) {
      throw new Error("Valor da conta não pode ser negativo");
    }
    if (num > 99999999.99) {
      throw new Error("Valor da conta muito grande (máximo: R$ 99.999.999,99)");
    }
    return num;
  }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBillPayable = z.infer<typeof insertBillPayableSchema>;
export type BillPayable = typeof billsPayable.$inferSelect;

// ============================================
// REMINDERS (Lembretes por usuário)
// ============================================

export const reminderStatusEnum = pgEnum("reminder_status", [
  "Pendente",
  "Concluído",
  "Cancelado"
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "Nenhum",
  "1_dia_antes",
  "no_dia",
  "passou"
]);

export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id").notNull(),
  vehicleId: varchar("vehicle_id").notNull(),
  userId: varchar("user_id").notNull(), // Usuário que criou/é responsável
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  dataLimite: timestamp("data_limite").notNull(),
  status: reminderStatusEnum("status").notNull().default("Pendente"),
  alertType: alertTypeEnum("alert_type").notNull().default("Nenhum"),
  concluidoEm: timestamp("concluido_em"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
});

export const insertReminderSchema = createInsertSchema(reminders, {
  dataLimite: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
}).omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;

// ============================================
// PAINEL ADMINISTRATIVO - GESTÃO DE CLIENTES
// ============================================

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ativo",
  "teste_gratis",
  "suspenso",
  "cancelado"
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pendente",
  "pago",
  "atrasado",
  "cancelado"
]);

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().unique(), // FK para companies
  plano: text("plano").default("basico"), // "basico", "profissional", "premium"
  status: subscriptionStatusEnum("status").notNull().default("ativo"),
  dataInicio: timestamp("data_inicio").defaultNow().notNull(),
  dataProximoPagamento: timestamp("data_proximo_pagamento"),
  dataCancelamento: timestamp("data_cancelamento"),
  diasTestGratis: integer("dias_test_gratis").default(14),
  valorMensalR$: numeric("valor_mensal_reais", { precision: 10, scale: 2 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull(), // FK
  companyId: varchar("company_id").notNull(), // FK para companies
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("pendente"),
  dataPagamento: timestamp("data_pagamento"),
  dataVencimento: timestamp("data_vencimento").notNull(),
  metodo: text("metodo"), // "cartao", "pix", "boleto", "transferencia"
  descricao: text("descricao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// ============================================
// ADMIN AUTHENTICATION
// ============================================

export const adminCredentials = pgTable("admin_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(),
  nome: varchar("nome").notNull(),
  ativo: varchar("ativo").default("true"), // "true" ou "false"
  ultimoLogin: timestamp("ultimo_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AdminCredential = typeof adminCredentials.$inferSelect;

// ============================================
// BUG REPORTS
// ============================================

export const bugReports = pgTable("bug_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  userName: text("user_name"),
  userEmail: text("user_email"),
  userPhotoUrl: text("user_photo_url"),
  message: text("message").notNull(),
  attachments: json("attachments").$type<Array<{ fileName: string; fileData: string; mimeType: string }>>().default([]),
  status: varchar("status").default("novo"), // "novo", "em_analise", "resolvido"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBugReportSchema = createInsertSchema(bugReports).omit({
  id: true,
  createdAt: true,
});

export type InsertBugReport = z.infer<typeof insertBugReportSchema>;
export type BugReport = typeof bugReports.$inferSelect;
