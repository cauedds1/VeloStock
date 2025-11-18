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
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  empresaId: varchar("empresa_id"), // Multi-tenant: user belongs to one company
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  passwordHash: varchar("password_hash"), // Para autenticação nativa (bcrypt)
  authProvider: varchar("auth_provider").default("local"), // "local" ou "google"
  emailVerified: varchar("email_verified").default("false"), // "true" ou "false"
  verificationCode: varchar("verification_code"), // Código de 6 dígitos
  verificationCodeExpiry: timestamp("verification_code_expiry"), // Expiração do código
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
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }), // stored in reais
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  locationChangedAt: timestamp("location_changed_at").defaultNow().notNull(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
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
  value: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? val : val.toString()),
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
