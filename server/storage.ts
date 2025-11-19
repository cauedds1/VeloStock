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
  type VehicleDocument,
  type InsertVehicleDocument,
  type Company,
  type InsertCompany,
  users,
  vehicles,
  vehicleImages,
  vehicleHistory,
  vehicleCosts,
  storeObservations,
  companySettings,
  vehicleDocuments,
  companies,
  userPermissions,
} from "@shared/schema";
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
  
  getAllCosts(): Promise<VehicleCost[]>;
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

  async getAllCosts(): Promise<VehicleCost[]> {
    return await db.select().from(vehicleCosts)
      .orderBy(desc(vehicleCosts.date));
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
    const result = await db.insert(storeObservations).values(insertObservation).returning();
    return result[0];
  }

  async updateStoreObservation(id: string, updates: Partial<InsertStoreObservation>): Promise<StoreObservation | undefined> {
    const finalUpdates: any = { ...updates, updatedAt: new Date() };
    
    if (updates.status === "Resolvido" && !updates.resolvedAt) {
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
}

export const storage = new DatabaseStorage();
