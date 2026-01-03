import { 
  type User, 
  type UpsertUser,
  type Vehicle,
  type InsertVehicle,
  type VehicleImage,
  type InsertVehicleImage,
  type VehicleHistory,
  type InsertVehicleHistory,
  type VehicleCost,
  type InsertVehicleCost,
  type StoreObservation,
  type InsertStoreObservation,
  type CompanySettings,
  type InsertCompanySettings,
  type AdvancedCompanySettings,
  type InsertAdvancedCompanySettings,
  type VehicleDocument,
  type InsertVehicleDocument,
  type Company,
  type InsertCompany,
  type Reminder,
  type InsertReminder,
  type BugReport,
  type InsertBugReport,
  type ChecklistCategory,
  type InsertChecklistCategory,
  type ChecklistCustomItem,
  type InsertChecklistCustomItem,
  type Invite,
  type InsertInvite,
  users,
  vehicles,
  vehicleImages,
  vehicleHistory,
  vehicleCosts,
  storeObservations,
  companySettings,
  advancedCompanySettings,
  vehicleDocuments,
  companies,
  userPermissions,
  activityLog,
  leads,
  followUps,
  reminders,
  bugReports,
  checklistCategories,
  checklistCustomItems,
  invites,
} from "@shared/schema";
import { or, sql } from "drizzle-orm";
import { normalizeChecklistData } from "@shared/checklistUtils";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getAllCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined>;
  
  // User operations - Replit Auth + Local Auth
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(empresaId: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  updateUserVerificationCode(userId: string, code: string, expiry: Date): Promise<User | undefined>;
  verifyUserEmail(userId: string): Promise<User | undefined>;
  
  getAllVehicles(empresaId?: string): Promise<Vehicle[]>;
  getVehicle(id: string, empresaId?: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;
  
  getVehicleImages(vehicleId: string): Promise<VehicleImage[]>;
  addVehicleImage(image: InsertVehicleImage): Promise<VehicleImage>;
  updateVehicleImage(id: string, updates: Partial<InsertVehicleImage>): Promise<VehicleImage | null>;
  deleteVehicleImage(id: string): Promise<boolean>;
  
  getAllVehicleHistory(): Promise<VehicleHistory[]>;
  getVehicleHistory(vehicleId: string): Promise<VehicleHistory[]>;
  addVehicleHistory(history: InsertVehicleHistory): Promise<VehicleHistory>;
  
  getAllCosts(empresaId?: string): Promise<VehicleCost[]>;
  getAllCostsWithVehicleInfo(empresaId: string): Promise<(VehicleCost & { vehicleBrand: string; vehicleModel: string; vehiclePlate: string })[]>;
  getVehicleCosts(vehicleId: string): Promise<VehicleCost[]>;
  addVehicleCost(cost: InsertVehicleCost): Promise<VehicleCost>;
  updateVehicleCost(id: string, updates: Partial<InsertVehicleCost>): Promise<VehicleCost | undefined>;
  deleteCost(id: string): Promise<boolean>;
  
  getAllStoreObservations(empresaId?: string): Promise<StoreObservation[]>;
  getStoreObservation(id: string): Promise<StoreObservation | undefined>;
  createStoreObservation(observation: InsertStoreObservation): Promise<StoreObservation>;
  updateStoreObservation(id: string, updates: Partial<InsertStoreObservation>): Promise<StoreObservation | undefined>;
  deleteStoreObservation(id: string): Promise<boolean>;
  
  getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]>;
  addVehicleDocument(document: InsertVehicleDocument): Promise<VehicleDocument>;
  getVehicleDocument(id: string): Promise<VehicleDocument | undefined>;
  deleteVehicleDocument(id: string): Promise<boolean>;

  getVehicleReminders(vehicleId: string): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined>;
  deleteReminder(id: string): Promise<boolean>;
  getUserReminders(userId: string, empresaId: string): Promise<Reminder[]>;

  createBugReport(report: InsertBugReport): Promise<BugReport>;
  getAllBugReports(): Promise<BugReport[]>;
  updateBugReportStatus(id: string, status: string): Promise<BugReport | undefined>;

  // Checklist Custom Categories and Items
  getChecklistCategories(empresaId: string): Promise<ChecklistCategory[]>;
  createChecklistCategory(category: InsertChecklistCategory): Promise<ChecklistCategory>;
  deleteChecklistCategory(id: string, empresaId: string): Promise<boolean>;
  getChecklistCustomItems(empresaId: string): Promise<ChecklistCustomItem[]>;
  createChecklistCustomItem(item: InsertChecklistCustomItem): Promise<ChecklistCustomItem>;
  deleteChecklistCustomItem(id: string, empresaId: string): Promise<boolean>;
  
  // Invites
  getInviteByCode(code: string): Promise<Invite | undefined>;
  createInvite(invite: InsertInvite): Promise<Invite>;
  updateInvite(id: string, updates: Partial<InsertInvite>): Promise<Invite | undefined>;
  getInvitesByCompany(empresaId: string): Promise<Invite[]>;
}

export class DatabaseStorage implements IStorage {
  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id));
    return result[0];
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const result = await db.insert(companies).values(insertCompany as any).returning();
    return result[0];
  }

  async updateCompany(id: string, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const dataToUpdate: any = {
      ...updates,
      updatedAt: new Date()
    };
    const result = await db.update(companies)
      .set(dataToUpdate)
      .where(eq(companies.id, id))
      .returning();
    return result[0];
  }

  // User operations - Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getAllUsers(empresaId: string): Promise<User[]> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.empresaId, empresaId))
      .orderBy(desc(users.createdAt));
    return result;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createLocalUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUserVerificationCode(userId: string, code: string, expiry: Date): Promise<User | undefined> {
    const result = await db.update(users)
      .set({
        verificationCode: code,
        verificationCodeExpiry: expiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async verifyUserEmail(userId: string): Promise<User | undefined> {
    const result = await db.update(users)
      .set({
        emailVerified: "true",
        verificationCode: null,
        verificationCodeExpiry: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async getAllVehicles(empresaId?: string): Promise<Vehicle[]> {
    let query = db.select().from(vehicles);
    if (empresaId) {
      query = query.where(eq(vehicles.empresaId, empresaId)) as any;
    }
    const vehiclesList = await query.orderBy(desc(vehicles.createdAt));
    return vehiclesList.map(v => ({
      ...v,
      checklist: normalizeChecklistData(v.checklist)
    }));
  }

  async getVehicle(id: string, empresaId?: string): Promise<Vehicle | undefined> {
    let whereCondition = eq(vehicles.id, id);
    if (empresaId) {
      whereCondition = and(eq(vehicles.id, id), eq(vehicles.empresaId, empresaId)) as any;
    }
    const result = await db.select().from(vehicles).where(whereCondition);
    if (!result[0]) return undefined;
    return {
      ...result[0],
      checklist: normalizeChecklistData(result[0].checklist)
    };
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const dataToInsert = {
      ...insertVehicle,
      checklist: insertVehicle.checklist ? normalizeChecklistData(insertVehicle.checklist) : {}
    };
    const result = await db.insert(vehicles).values(dataToInsert as any).returning();
    return {
      ...result[0],
      checklist: normalizeChecklistData(result[0].checklist)
    };
  }

  async updateVehicle(id: string, updates: Partial<InsertVehicle>): Promise<Vehicle | undefined> {
    const dataToUpdate = {
      ...updates,
      checklist: updates.checklist ? normalizeChecklistData(updates.checklist) : undefined,
      updatedAt: new Date()
    };
    const result = await db.update(vehicles)
      .set(dataToUpdate as any)
      .where(eq(vehicles.id, id))
      .returning();
    if (!result[0]) return undefined;
    return {
      ...result[0],
      checklist: normalizeChecklistData(result[0].checklist)
    };
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const result = await db.delete(vehicles).where(eq(vehicles.id, id)).returning();
    return result.length > 0;
  }

  async getVehicleImages(vehicleId: string): Promise<VehicleImage[]> {
    return await db.select().from(vehicleImages)
      .where(eq(vehicleImages.vehicleId, vehicleId))
      .orderBy(vehicleImages.order);
  }

  async addVehicleImage(insertImage: InsertVehicleImage): Promise<VehicleImage> {
    const result = await db.insert(vehicleImages).values(insertImage).returning();
    return result[0];
  }

  async updateVehicleImage(id: string, updates: Partial<InsertVehicleImage>): Promise<VehicleImage | null> {
    const result = await db.update(vehicleImages)
      .set(updates)
      .where(eq(vehicleImages.id, id))
      .returning();
    return result[0] || null;
  }

  async deleteVehicleImage(id: string): Promise<boolean> {
    const result = await db.delete(vehicleImages).where(eq(vehicleImages.id, id)).returning();
    return result.length > 0;
  }

  async getAllVehicleHistory(): Promise<VehicleHistory[]> {
    return await db.select().from(vehicleHistory)
      .orderBy(desc(vehicleHistory.createdAt));
  }

  async getVehicleHistory(vehicleId: string): Promise<VehicleHistory[]> {
    return await db.select().from(vehicleHistory)
      .where(eq(vehicleHistory.vehicleId, vehicleId))
      .orderBy(desc(vehicleHistory.createdAt));
  }

  async addVehicleHistory(insertHistory: InsertVehicleHistory): Promise<VehicleHistory> {
    const result = await db.insert(vehicleHistory).values(insertHistory).returning();
    return result[0];
  }

  async getHistoryEntry(id: string): Promise<VehicleHistory | null> {
    const result = await db.select().from(vehicleHistory)
      .where(eq(vehicleHistory.id, id))
      .limit(1);
    return result[0] || null;
  }

  async updateVehicleHistory(id: string, vehicleId: string, updates: Partial<InsertVehicleHistory>): Promise<VehicleHistory | null> {
    const result = await db.update(vehicleHistory)
      .set(updates)
      .where(and(eq(vehicleHistory.id, id), eq(vehicleHistory.vehicleId, vehicleId)))
      .returning();
    
    return result[0] || null;
  }

  async getAllCosts(empresaId?: string): Promise<VehicleCost[]> {
    if (empresaId) {
      // Get vehicles that belong to the company first, then get their costs
      const companyVehicles = await db.select({ id: vehicles.id }).from(vehicles)
        .where(eq(vehicles.empresaId, empresaId));
      
      const vehicleIds = companyVehicles.map(v => v.id);
      
      if (vehicleIds.length === 0) {
        return [];
      }
      
      return await db.select().from(vehicleCosts)
        .where(or(...vehicleIds.map(id => eq(vehicleCosts.vehicleId, id))))
        .orderBy(desc(vehicleCosts.date));
    }
    
    return await db.select().from(vehicleCosts)
      .orderBy(desc(vehicleCosts.date));
  }

  async getAllCostsWithVehicleInfo(empresaId: string): Promise<(VehicleCost & { vehicleBrand: string; vehicleModel: string; vehiclePlate: string })[]> {
    // Get vehicles that belong to the company first
    const companyVehicles = await db.select().from(vehicles)
      .where(eq(vehicles.empresaId, empresaId));
    
    const vehicleIds = companyVehicles.map(v => v.id);
    
    if (vehicleIds.length === 0) {
      return [];
    }
    
    const costs = await db.select().from(vehicleCosts)
      .where(or(...vehicleIds.map(id => eq(vehicleCosts.vehicleId, id))))
      .orderBy(desc(vehicleCosts.date));
    
    // Map vehicle info to costs
    const vehicleMap = new Map(companyVehicles.map(v => [v.id, v]));
    
    return costs.map(cost => {
      const vehicle = vehicleMap.get(cost.vehicleId);
      return {
        ...cost,
        vehicleBrand: vehicle?.brand || 'Desconhecido',
        vehicleModel: vehicle?.model || 'Desconhecido',
        vehiclePlate: vehicle?.plate || 'N/A',
      };
    });
  }

  async getVehicleCosts(vehicleId: string): Promise<VehicleCost[]> {
    return await db.select().from(vehicleCosts)
      .where(eq(vehicleCosts.vehicleId, vehicleId))
      .orderBy(desc(vehicleCosts.date));
  }

  async addVehicleCost(insertCost: InsertVehicleCost): Promise<VehicleCost> {
    const result = await db.insert(vehicleCosts).values(insertCost).returning();
    return result[0];
  }

  async updateVehicleCost(id: string, updates: Partial<InsertVehicleCost>): Promise<VehicleCost | undefined> {
    const result = await db.update(vehicleCosts)
      .set(updates)
      .where(eq(vehicleCosts.id, id))
      .returning();
    return result[0];
  }

  async deleteCost(id: string): Promise<boolean> {
    const result = await db.delete(vehicleCosts).where(eq(vehicleCosts.id, id)).returning();
    return result.length > 0;
  }

  async getAllStoreObservations(empresaId?: string): Promise<StoreObservation[]> {
    let query = db.select().from(storeObservations);
    if (empresaId) {
      query = query.where(eq(storeObservations.empresaId, empresaId)) as any;
    }
    return await query.orderBy(desc(storeObservations.createdAt));
  }

  async getStoreObservation(id: string): Promise<StoreObservation | undefined> {
    const result = await db.select().from(storeObservations)
      .where(eq(storeObservations.id, id));
    return result[0];
  }

  async createStoreObservation(insertObservation: InsertStoreObservation): Promise<StoreObservation> {
    const [result] = await db.insert(storeObservations).values({
      description: insertObservation.description,
      empresaId: insertObservation.empresaId,
      category: insertObservation.category || null,
      status: insertObservation.status || "Pendente",
      expenseCost: insertObservation.expenseCost ? insertObservation.expenseCost.toString() : null,
      expenseDescription: insertObservation.expenseDescription || null,
      expensePaymentMethod: insertObservation.expensePaymentMethod || null,
      expensePaidBy: insertObservation.expensePaidBy || null,
    }).returning();
    return result;
  }

  async updateStoreObservation(id: string, updates: Partial<InsertStoreObservation>): Promise<StoreObservation | undefined> {
    const finalUpdates: any = { ...updates, updatedAt: new Date() };
    
    if (updates.status === "Resolvido") {
      finalUpdates.resolvedAt = new Date();
    } else if (updates.status === "Pendente") {
      finalUpdates.resolvedAt = null;
    }

    const result = await db.update(storeObservations)
      .set(finalUpdates)
      .where(eq(storeObservations.id, id))
      .returning();
    return result[0];
  }

  async deleteStoreObservation(id: string): Promise<boolean> {
    const result = await db.delete(storeObservations).where(eq(storeObservations.id, id)).returning();
    return result.length > 0;
  }

  // Company Settings
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const result = await db.select().from(companySettings).limit(1);
    return result[0];
  }

  async createOrUpdateCompanySettings(settings: Partial<InsertCompanySettings>): Promise<CompanySettings> {
    const existing = await this.getCompanySettings();
    
    if (existing) {
      // Apenas atualizar os campos que foram enviados para evitar race conditions
      const updates: any = { updatedAt: new Date() };
      
      if (settings.companyName !== undefined) updates.companyName = settings.companyName;
      if (settings.phone !== undefined) updates.phone = settings.phone;
      if (settings.email !== undefined) updates.email = settings.email;
      if (settings.address !== undefined) updates.address = settings.address;
      if (settings.cnpj !== undefined) updates.cnpj = settings.cnpj;
      
      const result = await db.update(companySettings)
        .set(updates)
        .where(eq(companySettings.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(companySettings).values({ ...settings, updatedAt: new Date() }).returning();
      return result[0];
    }
  }

  // Advanced Company Settings (categorias customizadas, origens de leads)
  async getAdvancedSettings(empresaId: string) {
    const result = await db.select()
      .from(advancedCompanySettings)
      .where(eq(advancedCompanySettings.empresaId, empresaId))
      .limit(1);
    return result[0];
  }

  async updateAdvancedSettings(empresaId: string, settings: Partial<InsertAdvancedCompanySettings>) {
    const existing = await this.getAdvancedSettings(empresaId);
    
    if (existing) {
      const updates: any = { updatedAt: new Date() };
      
      if (settings.categoriasCustos !== undefined) updates.categoriasCustos = settings.categoriasCustos;
      if (settings.origensLeads !== undefined) updates.origensLeads = settings.origensLeads;
      if (settings.localizacoes !== undefined) updates.localizacoes = settings.localizacoes;
      if (settings.prazoPreparacaoVeiculo !== undefined) updates.prazoPreparacaoVeiculo = settings.prazoPreparacaoVeiculo;
      if (settings.prazoValidadeOrcamento !== undefined) updates.prazoValidadeOrcamento = settings.prazoValidadeOrcamento;
      if (settings.prazoAlertaVeiculoParado !== undefined) updates.prazoAlertaVeiculoParado = settings.prazoAlertaVeiculoParado;
      if (settings.notificacoesVeiculosParados !== undefined) updates.notificacoesVeiculosParados = settings.notificacoesVeiculosParados;
      if (settings.notificacoesPrazos !== undefined) updates.notificacoesPrazos = settings.notificacoesPrazos;
      if (settings.avisosCustosAltos !== undefined) updates.avisosCustosAltos = settings.avisosCustosAltos;
      
      const result = await db.update(advancedCompanySettings)
        .set(updates)
        .where(eq(advancedCompanySettings.empresaId, empresaId))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(advancedCompanySettings)
        .values({ empresaId, ...settings, updatedAt: new Date() })
        .returning();
      return result[0];
    }
  }

  // Vehicle Documents
  async getVehicleDocuments(vehicleId: string): Promise<VehicleDocument[]> {
    const result = await db.select()
      .from(vehicleDocuments)
      .where(eq(vehicleDocuments.vehicleId, vehicleId))
      .orderBy(desc(vehicleDocuments.uploadedAt));
    return result;
  }

  async addVehicleDocument(document: InsertVehicleDocument): Promise<VehicleDocument> {
    const result = await db.insert(vehicleDocuments).values(document).returning();
    return result[0];
  }

  async getVehicleDocument(id: string): Promise<VehicleDocument | undefined> {
    const result = await db.select().from(vehicleDocuments).where(eq(vehicleDocuments.id, id));
    return result[0];
  }

  async deleteVehicleDocument(id: string): Promise<boolean> {
    const result = await db.delete(vehicleDocuments).where(eq(vehicleDocuments.id, id)).returning();
    return result.length > 0;
  }

  // Reminders
  async getVehicleReminders(vehicleId: string): Promise<Reminder[]> {
    const result = await db.select()
      .from(reminders)
      .where(eq(reminders.vehicleId, vehicleId))
      .orderBy(desc(reminders.dataLimite));
    return result;
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    const result = await db.insert(reminders).values(reminder as any).returning();
    return result[0];
  }

  async updateReminder(id: string, updates: Partial<InsertReminder>): Promise<Reminder | undefined> {
    const result = await db.update(reminders).set(updates as any).where(eq(reminders.id, id)).returning();
    return result[0];
  }

  async deleteReminder(id: string): Promise<boolean> {
    const result = await db.delete(reminders).where(eq(reminders.id, id)).returning();
    return result.length > 0;
  }

  async getUserReminders(userId: string, empresaId: string): Promise<Reminder[]> {
    const result = await db.select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.empresaId, empresaId)))
      .orderBy(desc(reminders.dataLimite));
    return result;
  }

  // User Permissions (Custom Permissions)
  async getUserPermissions(userId: string, empresaId: string) {
    const result = await db.select()
      .from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.empresaId, empresaId)
      ))
      .limit(1);
    return result[0];
  }

  async updateUserPermissions(userId: string, empresaId: string, permissions: any) {
    const existing = await this.getUserPermissions(userId, empresaId);
    
    if (existing) {
      const [updated] = await db.update(userPermissions)
        .set({ ...permissions, updatedAt: new Date() })
        .where(and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.empresaId, empresaId)
        ))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userPermissions)
        .values({ userId, empresaId, ...permissions })
        .returning();
      return created;
    }
  }

  // Activity Log
  async logActivity(activity: any) {
    const [created] = await db.insert(activityLog).values(activity).returning();
    return created;
  }

  async getActivities(empresaId: string, filters?: any) {
    let query = db.select().from(activityLog).where(eq(activityLog.empresaId, empresaId));
    
    if (filters?.userId) {
      query = db.select().from(activityLog).where(and(
        eq(activityLog.empresaId, empresaId),
        eq(activityLog.userId, filters.userId)
      ));
    }
    
    return await query.orderBy(desc(activityLog.createdAt)).limit(filters?.limit || 50);
  }

  // Leads
  async getLeads(empresaId: string, userId?: string, role?: string) {
    let query = db.select().from(leads);
    
    if (role === "vendedor" || role === "motorista") {
      query = query.where(and(
        eq(leads.empresaId, empresaId),
        or(
          eq(leads.vendedorResponsavel, userId!),
          eq(leads.criadoPor, userId!)
        )
      )) as any;
    } else {
      query = query.where(eq(leads.empresaId, empresaId)) as any;
    }
    
    return await query.orderBy(desc(leads.createdAt));
  }

  // Follow-ups
  async getFollowUps(empresaId: string, userId?: string, role?: string) {
    let query = db.select().from(followUps);
    
    if (role === "vendedor" || role === "motorista") {
      query = query.where(and(
        eq(followUps.empresaId, empresaId),
        eq(followUps.assignedTo, userId!)
      )) as any;
    } else {
      query = query.where(eq(followUps.empresaId, empresaId)) as any;
    }
    
    return await query.orderBy(followUps.dataAgendada);
  }

  // SECURITY: Invalidar todas as sessões de um usuário específico
  // Usado quando: usuário é desativado, senha é alterada, etc.
  async invalidateUserSessions(userId: string): Promise<number> {
    try {
      // Validar formato do userId para prevenir SQL injection
      // UUIDs válidos têm formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.error(`[SECURITY] Tentativa de invalidar sessões com userId inválido: ${userId}`);
        return 0;
      }
      
      // A sessão do connect-pg-simple armazena dados no formato:
      // sess: { passport: { user: { claims: { id: "...", sub: "..." } } } }
      // Usando query parametrizada para prevenir SQL injection
      const searchPatternId = `%"id":"${userId}"%`;
      const searchPatternSub = `%"sub":"${userId}"%`;
      
      const result = await db.execute(
        sql`DELETE FROM sessions 
            WHERE sess::text LIKE ${searchPatternId} 
            OR sess::text LIKE ${searchPatternSub}`
      );
      
      const deletedCount = (result as any).rowCount || 0;
      console.log(`[SECURITY] Invalidadas ${deletedCount} sessões do usuário ${userId}`);
      return deletedCount;
    } catch (error) {
      console.error(`[SECURITY] Erro ao invalidar sessões do usuário ${userId}:`, error);
      return 0;
    }
  }
  async createBugReport(report: InsertBugReport): Promise<BugReport> {
    try {
      // Garantir que os campos obrigatórios estão presentes
      if (!report.userId || !report.message) {
        throw new Error("userId e message são obrigatórios");
      }

      const insertData = {
        userId: report.userId,
        userName: report.userName || null,
        userEmail: report.userEmail || null,
        userPhotoUrl: report.userPhotoUrl || null,
        message: report.message,
        attachments: report.attachments && report.attachments.length > 0 ? report.attachments : [],
        status: report.status || "novo",
      };

      console.log("[BUG STORAGE] Inserindo bug com dados:", {
        userId: insertData.userId,
        userName: insertData.userName,
        messageLength: insertData.message.length,
        attachmentsCount: insertData.attachments.length,
        status: insertData.status,
      });

      const [created] = await db.insert(bugReports).values(insertData as any).returning();
      return created;
    } catch (error) {
      console.error("[BUG STORAGE] Erro ao inserir bug:", error);
      throw error;
    }
  }

  async getAllBugReports(): Promise<BugReport[]> {
    return await db.select().from(bugReports).orderBy(desc(bugReports.createdAt));
  }

  async updateBugReportStatus(id: string, status: string): Promise<BugReport | undefined> {
    const [updated] = await db.update(bugReports).set({ status }).where(eq(bugReports.id, id)).returning();
    return updated;
  }

  // Checklist Custom Categories and Items
  async getChecklistCategories(empresaId: string): Promise<ChecklistCategory[]> {
    return await db.select().from(checklistCategories)
      .where(and(eq(checklistCategories.empresaId, empresaId), eq(checklistCategories.isActive, "true")))
      .orderBy(checklistCategories.order);
  }

  async createChecklistCategory(category: InsertChecklistCategory): Promise<ChecklistCategory> {
    const [created] = await db.insert(checklistCategories).values(category).returning();
    return created;
  }

  async deleteChecklistCategory(id: string, empresaId: string): Promise<boolean> {
    const result = await db.update(checklistCategories)
      .set({ isActive: "false" })
      .where(and(eq(checklistCategories.id, id), eq(checklistCategories.empresaId, empresaId)));
    return true;
  }

  async getChecklistCustomItems(empresaId: string): Promise<ChecklistCustomItem[]> {
    return await db.select().from(checklistCustomItems)
      .where(and(eq(checklistCustomItems.empresaId, empresaId), eq(checklistCustomItems.isActive, "true")))
      .orderBy(checklistCustomItems.order);
  }

  async createChecklistCustomItem(item: InsertChecklistCustomItem): Promise<ChecklistCustomItem> {
    const [created] = await db.insert(checklistCustomItems).values(item).returning();
    return created;
  }

  async deleteChecklistCustomItem(id: string, empresaId: string): Promise<boolean> {
    const result = await db.update(checklistCustomItems)
      .set({ isActive: "false" })
      .where(and(eq(checklistCustomItems.id, id), eq(checklistCustomItems.empresaId, empresaId)));
    return true;
  }

  // Invites
  async getInviteByCode(code: string): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.code, code));
    return invite;
  }

  async createInvite(insertInvite: InsertInvite): Promise<Invite> {
    const [invite] = await db.insert(invites).values(insertInvite as any).returning();
    return invite;
  }

  async updateInvite(id: string, updates: Partial<InsertInvite>): Promise<Invite | undefined> {
    const [invite] = await db.update(invites).set(updates).where(eq(invites.id, id)).returning();
    return invite;
  }

  async getInvitesByCompany(empresaId: string): Promise<Invite[]> {
    return await db.select().from(invites).where(eq(invites.empresaId, empresaId)).orderBy(desc(invites.createdAt));
  }
}

export const storage = new DatabaseStorage();
