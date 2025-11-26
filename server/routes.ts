import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import { z } from "zod";
import { insertVehicleSchema, insertVehicleCostSchema, insertStoreObservationSchema, updateVehicleHistorySchema, insertCommissionPaymentSchema, commissionsConfig, commissionPayments, users, companies, storeObservations, operationalExpenses } from "@shared/schema";
import { isNotNull } from "drizzle-orm";
import OpenAI from "openai";
import path from "path";
import fs from "fs/promises";
import { existsSync, createReadStream } from "fs";
import { createBackup, listBackups, getBackupPath } from "./backup";
import { requireProprietario, requireProprietarioOrGerente, PERMISSIONS } from "./middleware/roleCheck";
import bcrypt from "bcrypt";
import financialRoutes from "./routes/financial";
import leadsRoutes from "./routes/leads";
import followupsRoutes from "./routes/followups";
import activityLogRoutes from "./routes/activityLog";
import costApprovalsRoutes from "./routes/costApprovals";
import billsRoutes from "./routes/bills";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const documentUpload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const vehicleId = req.params.id;
      const uploadDir = path.join(process.cwd(), "uploads", "vehicles", vehicleId);
      
      if (!existsSync(uploadDir)) {
        await fs.mkdir(uploadDir, { recursive: true });
      }
      
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos PDF são permitidos"));
    }
  }
});

// Helper para validar autenticação e obter empresaId do usuário logado
async function getUserWithCompany(req: any): Promise<{ userId: string; empresaId: string } | null> {
  const userId = req.user?.claims?.id || req.user?.claims?.sub;
  if (!userId) return null;
  
  const user = await storage.getUser(userId);
  if (!user?.empresaId) return null;
  
  return { userId, empresaId: user.empresaId };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication - Replit Auth
  await setupAuth(app);

  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("Cliente conectado ao WebSocket");
    
    socket.on("disconnect", () => {
      console.log("Cliente desconectado do WebSocket");
    });
  });

  // Auth endpoint - Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Extract userId from either OAuth claims or local auth
      const userId = req.user.claims?.sub || req.user.claims?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID not found in session" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // GET /api/vehicles - Listar todos os veículos (FILTRADO POR EMPRESA)
  app.get("/api/vehicles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.id || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (!user?.empresaId) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const vehicles = await storage.getAllVehicles(user.empresaId);
      
      // Otimização: buscar TODO o histórico de uma vez ao invés de N queries
      const allHistory = await storage.getAllVehicleHistory();
      
      // Criar um mapa de histórico por veículo
      const historyByVehicle = new Map<string, any[]>();
      allHistory.forEach(h => {
        if (!historyByVehicle.has(h.vehicleId)) {
          historyByVehicle.set(h.vehicleId, []);
        }
        historyByVehicle.get(h.vehicleId)!.push(h);
      });
      
      const vehiclesWithImages = await Promise.all(
        vehicles.map(async (vehicle) => {
          const images = await storage.getVehicleImages(vehicle.id);
          const now = new Date();
          
          // Buscar do histórico a data em que o veículo mudou para o status atual
          const history = historyByVehicle.get(vehicle.id) || [];
          const currentStatusEntry = history.find(h => h.toStatus === vehicle.status);
          
          // Se encontrou no histórico, usa essa data. Senão, usa locationChangedAt como fallback
          // Se tudo falhar, usa createdAt (garantia de que sempre terá uma data válida)
          const statusChangedAt = currentStatusEntry 
            ? (currentStatusEntry.movedAt || currentStatusEntry.createdAt)
            : (vehicle.locationChangedAt || vehicle.createdAt);
          
          const timeDiff = now.getTime() - statusChangedAt.getTime();
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          
          // Para veículos "Pronto para Venda", buscar a data do histórico quando ficou nesse status
          let readyForSaleAt: Date | null = null;
          if (vehicle.status === "Pronto para Venda") {
            const readyEntry = history.find(h => h.toStatus === "Pronto para Venda");
            if (readyEntry) {
              readyForSaleAt = readyEntry.movedAt || readyEntry.createdAt;
            }
          }
          
          const vehicleData = {
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            plate: vehicle.plate,
            vehicleType: vehicle.vehicleType || "Carro",
            location: vehicle.status, // deprecated - returns status for compatibility
            status: vehicle.status,
            physicalLocation: vehicle.physicalLocation,
            physicalLocationDetail: vehicle.physicalLocationDetail,
            salePrice: vehicle.salePrice,
            notes: vehicle.notes,
            checklist: vehicle.checklist || {},
            createdAt: vehicle.createdAt,
            locationChangedAt: vehicle.locationChangedAt,
            readyForSaleAt: readyForSaleAt, // Nova propriedade
            image: images[0]?.imageUrl || null,
            timeInStatus: days === 0 ? "Hoje" : `${days} ${days === 1 ? "dia" : "dias"}`,
            daysInStatus: days, // Campo numérico para cálculos
            hasNotes: !!vehicle.notes,
          };
          
          // Motoristas não devem ver NENHUMA informação de venda/financeira
          if (user.role === "motorista") {
            // Remover campos financeiros diretos
            delete (vehicleData as any).salePrice;
            delete (vehicleData as any).fipeReferencePrice;
            delete (vehicleData as any).vendedorId;
            delete (vehicleData as any).vendedorNome;
            delete (vehicleData as any).valorVenda;
            delete (vehicleData as any).comissao;
            delete (vehicleData as any).lucroLiquido;
            delete (vehicleData as any).margem;
            // Remover dados de custo (motoristas só veem status de preparação)
            delete (vehicleData as any).totalCosts;
            delete (vehicleData as any).costs;
          }
          
          return vehicleData;
        })
      );
      
      res.json(vehiclesWithImages);
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);
      res.status(500).json({ error: "Erro ao buscar veículos" });
    }
  });

  // GET /api/vehicles/:id - Buscar veículo por ID (COM VALIDAÇÃO DE EMPRESA)
  app.get("/api/vehicles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.id || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (!user?.empresaId) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }
      
      const empresaId = user.empresaId;

      const vehicle = await storage.getVehicle(req.params.id, empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }
      
      const images = await storage.getVehicleImages(vehicle.id);
      const vehicleData: any = { ...vehicle, images };
      
      // Motoristas não devem ver NENHUMA informação de venda/financeira
      if (user.role === "motorista") {
        delete vehicleData.purchasePrice;
        delete vehicleData.salePrice;
        delete vehicleData.fipeReferencePrice;
        delete vehicleData.vendedorId;
        delete vehicleData.vendedorNome;
        delete vehicleData.valorVenda;
        delete vehicleData.comissao;
        delete vehicleData.lucroLiquido;
        delete vehicleData.margem;
        delete vehicleData.totalCosts;
        delete vehicleData.costs;
      }
      
      res.json(vehicleData);
    } catch (error) {
      console.error("Erro ao buscar veículo:", error);
      res.status(500).json({ error: "Erro ao buscar veículo" });
    }
  });

  // POST /api/vehicles - Criar novo veículo
  app.post("/api/vehicles", isAuthenticated, upload.array("images", 8), async (req: any, res) => {
    try {
      const userId = req.user.claims?.id || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (!user?.empresaId) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }
      
      const empresaId = user.empresaId;

      // IMPORTANTE: NÃO fazer conversões manuais (parseFloat, parseInt) para valores monetários!
      // O insertVehicleSchema.parse() faz TODA a validação e conversão de forma segura,
      // rejeitando NaN, Infinity, -Infinity, valores negativos e extremos
      const vehicleData = insertVehicleSchema.parse({
        empresaId,
        brand: req.body.brand,
        model: req.body.model,
        year: parseInt(req.body.year),
        version: req.body.version || null,
        color: req.body.color,
        plate: req.body.plate,
        vehicleType: req.body.vehicleType || "Carro",
        status: req.body.status || "Entrada",
        physicalLocation: req.body.physicalLocation || null,
        physicalLocationDetail: req.body.physicalLocationDetail || null,
        purchasePrice: req.body.purchasePrice != null && req.body.purchasePrice !== "" ? req.body.purchasePrice : null,
        kmOdometer: req.body.kmOdometer != null && req.body.kmOdometer !== "" ? req.body.kmOdometer : null,
        fuelType: req.body.fuelType || null,
        fipeReferencePrice: req.body.fipeReferencePrice || null,
        features: req.body.features ? JSON.parse(req.body.features) : null,
        notes: req.body.notes || null,
        mainImageUrl: null,
      });

      const vehicle = await storage.createVehicle(vehicleData);

      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const imageUrl = `data:${files[i].mimetype};base64,${files[i].buffer.toString("base64")}`;
          await storage.addVehicleImage({
            vehicleId: vehicle.id,
            imageUrl,
            order: i,
          });

          if (i === 0) {
            await storage.updateVehicle(vehicle.id, { mainImageUrl: imageUrl });
          }
        }
      }

      io.emit("vehicle:created", vehicle);

      const updatedVehicle = await storage.getVehicle(vehicle.id, empresaId);
      const images = await storage.getVehicleImages(vehicle.id);
      
      res.json({ ...updatedVehicle, images });
    } catch (error: any) {
      console.error("Erro ao criar veículo:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      if (error.code === '23505' && error.constraint === 'vehicles_plate_unique') {
        return res.status(409).json({ error: "Já existe um veículo cadastrado com essa placa" });
      }
      res.status(500).json({ error: "Erro ao criar veículo" });
    }
  });

  // PATCH /api/vehicles/:id - Atualizar veículo (COM VALIDAÇÃO DE EMPRESA)
  app.patch("/api/vehicles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.id || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (!user?.empresaId) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }
      
      const empresaId = user.empresaId;

      const existingVehicle = await storage.getVehicle(req.params.id, empresaId);
      if (!existingVehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const updates = req.body;
      
      console.log("[PATCH VEHICLE] Recebido:", { vehicleId: req.params.id, newStatus: updates.status, existingStatus: existingVehicle.status, vendedorId: updates.vendedorId });
      
      // Detectar mudanças significativas em status ou localização física base
      const statusChanged = Object.prototype.hasOwnProperty.call(updates, "status") && 
        updates.status !== existingVehicle.status;
      const physicalLocationChanged = Object.prototype.hasOwnProperty.call(updates, "physicalLocation") && 
        updates.physicalLocation !== existingVehicle.physicalLocation;

      console.log("[PATCH VEHICLE] statusChanged:", statusChanged, "will create commission:", statusChanged && updates.status === "Vendido" && updates.vendedorId ? "SIM" : "NÃO");

      // Atualizar locationChangedAt apenas quando status muda
      if (statusChanged) {
        updates.locationChangedAt = new Date();
      }

      // Gerar data de venda automaticamente quando status muda para Vendido
      if (statusChanged && updates.status === "Vendido" && !updates.dataVenda) {
        updates.dataVenda = new Date();
      }

      const updatedVehicle = await storage.updateVehicle(req.params.id, updates);

      // Se veículo foi marcado como Vendido, criar comissão automática
      const vendedorIdFinal = updates.vendedorId || existingVehicle.vendedorId;
      if (statusChanged && updates.status === "Vendido" && vendedorIdFinal) {
        console.log("[COMISSÃO] Iniciando criação de comissão automática...");
        console.log("[COMISSÃO] VendedorId:", vendedorIdFinal);
        console.log("[COMISSÃO] EmpresaId:", empresaId);
        
        try {
          // Buscar informações do vendedor e da empresa
          const [vendedor] = await db
            .select({
              id: users.id,
              comissaoFixa: users.comissaoFixa,
              usarComissaoFixaGlobal: users.usarComissaoFixaGlobal,
            })
            .from(users)
            .where(eq(users.id, vendedorIdFinal))
            .limit(1);

          console.log("[COMISSÃO] Vendedor encontrado:", vendedor);

          const [empresa] = await db
            .select({
              comissaoFixaGlobal: companies.comissaoFixaGlobal,
            })
            .from(companies)
            .where(eq(companies.id, empresaId))
            .limit(1);

          console.log("[COMISSÃO] Empresa encontrada - comissaoFixaGlobal:", empresa?.comissaoFixaGlobal);

          // Determinar valor base da comissão com fallbacks robustos
          const valorVendaFinal = updates.valorVenda 
            || updates.salePrice 
            || existingVehicle.valorVenda 
            || existingVehicle.salePrice;
          
          console.log("[COMISSÃO] Valor de venda final:", valorVendaFinal);
          
          if (vendedor && valorVendaFinal) {
            let valorComissao: number | null = null;

            // Verificar se usa comissão global ou individual
            console.log("[COMISSÃO] usarComissaoFixaGlobal:", vendedor.usarComissaoFixaGlobal);
            
            if (vendedor.usarComissaoFixaGlobal === "true" || vendedor.usarComissaoFixaGlobal === null) {
              console.log("[COMISSÃO] Usando comissão GLOBAL da empresa");
              // Usar comissão global da empresa
              if (empresa?.comissaoFixaGlobal) {
                // Validação robusta: rejeita NaN, Infinity, -Infinity
                const parsed = Number(empresa.comissaoFixaGlobal);
                console.log("[COMISSÃO] Comissão global parsed:", parsed);
                if (Number.isFinite(parsed) && parsed > 0) {
                  valorComissao = parsed;
                  console.log("[COMISSÃO] ✓ Comissão global definida:", valorComissao);
                } else {
                  console.log("[COMISSÃO] ✗ Comissão global inválida (NaN ou ≤ 0)");
                }
              } else {
                console.log("[COMISSÃO] ✗ Empresa sem comissão global configurada");
              }
            } else {
              console.log("[COMISSÃO] Usando comissão INDIVIDUAL do vendedor");
              // Usar comissão individual do vendedor
              if (vendedor.comissaoFixa) {
                // Validação robusta: rejeita NaN, Infinity, -Infinity
                const parsed = Number(vendedor.comissaoFixa);
                console.log("[COMISSÃO] Comissão individual parsed:", parsed);
                if (Number.isFinite(parsed) && parsed > 0) {
                  valorComissao = parsed;
                  console.log("[COMISSÃO] ✓ Comissão individual definida:", valorComissao);
                } else {
                  console.log("[COMISSÃO] ✗ Comissão individual inválida (NaN ou ≤ 0)");
                }
              } else {
                console.log("[COMISSÃO] ✗ Vendedor sem comissão individual configurada");
              }
            }

            // Criar registro de comissão se houver valor definido
            // IMPORTANTE: Usa insertCommissionPaymentSchema para validação completa
            if (valorComissao !== null && valorComissao > 0) {
              const commissionData = insertCommissionPaymentSchema.parse({
                empresaId,
                vendedorId: vendedorIdFinal,
                veiculoId: req.params.id,
                percentualAplicado: "0",
                valorBase: String(valorVendaFinal),
                valorComissao: String(valorComissao),
                status: "A Pagar",
                criadoPor: userId,
              });

              // Converter números de volta para strings para o Drizzle
              const dbData = {
                ...commissionData,
                percentualAplicado: String(commissionData.percentualAplicado),
                valorBase: String(commissionData.valorBase),
                valorComissao: String(commissionData.valorComissao),
              };

              await db.insert(commissionPayments).values([dbData]);

              console.log(`[COMISSÃO] Criada comissão fixa de R$ ${valorComissao.toFixed(2)} para vendedor ${vendedorIdFinal} (valor base: R$ ${valorVendaFinal})`);
            } else {
              console.log(`[COMISSÃO] Nenhuma comissão configurada para o vendedor ${vendedorIdFinal}`);
            }
          }
        } catch (error) {
          console.error("[COMISSÃO] Erro ao criar comissão automática:", error);
          // Não bloqueia a venda se houver erro na comissão
        }
      }

      // Criar histórico apenas se status OU localização física BASE mudaram
      // (mudanças apenas em detail não geram histórico separado)
      if (statusChanged || physicalLocationChanged) {
        const newPhysicalLocation = updates.physicalLocation !== undefined 
          ? updates.physicalLocation 
          : existingVehicle.physicalLocation;
        
        const newPhysicalLocationDetail = updates.physicalLocationDetail !== undefined
          ? updates.physicalLocationDetail
          : existingVehicle.physicalLocationDetail;
        
        const movedAtDate = req.body.moveDate ? new Date(req.body.moveDate) : new Date();
        console.log("[DEBUG] moveDate recebido:", req.body.moveDate);
        console.log("[DEBUG] movedAt criado:", movedAtDate);
        
        await storage.addVehicleHistory({
          vehicleId: req.params.id,
          fromStatus: existingVehicle.status || null,
          toStatus: updates.status || existingVehicle.status,
          fromPhysicalLocation: existingVehicle.physicalLocation || null,
          toPhysicalLocation: newPhysicalLocation,
          fromPhysicalLocationDetail: existingVehicle.physicalLocationDetail || null,
          toPhysicalLocationDetail: newPhysicalLocationDetail,
          userId: req.body.userId || null,
          notes: req.body.moveNotes || req.body.historyNotes || null,
          movedAt: movedAtDate,
        });
      }

      io.emit("vehicle:updated", updatedVehicle);

      res.json(updatedVehicle);
    } catch (error) {
      console.error("Erro ao atualizar veículo:", error);
      res.status(500).json({ error: "Erro ao atualizar veículo" });
    }
  });

  // DELETE /api/vehicles/:id - Deletar veículo (APENAS GERENTE E PROPRIETÁRIO)
  app.delete("/api/vehicles/:id", isAuthenticated, requireProprietarioOrGerente, async (req: any, res) => {
    try {
      const userId = req.user.claims?.id || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (!user?.empresaId) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }
      
      const empresaId = user.empresaId;

      // Validar que o veículo pertence à empresa antes de deletar
      const vehicle = await storage.getVehicle(req.params.id, empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const success = await storage.deleteVehicle(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Erro ao deletar veículo" });
      }

      io.emit("vehicle:deleted", req.params.id);

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao deletar veículo:", error);
      res.status(500).json({ error: "Erro ao deletar veículo" });
    }
  });

  // GET /api/vehicles/:id/history - Buscar histórico do veículo
  app.get("/api/vehicles/:id/history", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const history = await storage.getVehicleHistory(req.params.id);
      
      // Motoristas não devem ver dados financeiros no histórico
      const user = await storage.getUser(userCompany.userId);
      if (user?.role === "motorista") {
        return res.json([]);  // Histórico vazio para motoristas
      }
      
      res.json(history);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      res.status(500).json({ error: "Erro ao buscar histórico" });
    }
  });

  // PUT /api/vehicles/:vehicleId/history/:historyId - Atualizar entrada do histórico
  app.put("/api/vehicles/:vehicleId/history/:historyId", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.vehicleId, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const historyEntry = await storage.getHistoryEntry(req.params.historyId);
      
      if (!historyEntry) {
        return res.status(404).json({ error: "Entrada de histórico não encontrada" });
      }
      
      if (historyEntry.vehicleId !== req.params.vehicleId) {
        return res.status(404).json({ error: "Entrada de histórico não encontrada" });
      }

      // Validar e parsear usando schema específico para updates
      const validatedData = updateVehicleHistorySchema.parse(req.body);
      
      const updates: any = {};
      if (validatedData.toStatus !== undefined) updates.toStatus = validatedData.toStatus;
      if (validatedData.toPhysicalLocation !== undefined) updates.toPhysicalLocation = validatedData.toPhysicalLocation;
      if (validatedData.toPhysicalLocationDetail !== undefined) updates.toPhysicalLocationDetail = validatedData.toPhysicalLocationDetail;
      if (validatedData.notes !== undefined) updates.notes = validatedData.notes;
      if (validatedData.movedAt !== undefined) {
        const parsedDate = new Date(validatedData.movedAt);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ error: "Data inválida fornecida" });
        }
        updates.movedAt = parsedDate;
      }

      const updatedHistory = await storage.updateVehicleHistory(req.params.historyId, req.params.vehicleId, updates);
      
      if (!updatedHistory) {
        return res.status(404).json({ error: "Erro ao atualizar histórico" });
      }

      io.emit("history:updated", { vehicleId: req.params.vehicleId, history: updatedHistory });

      res.json(updatedHistory);
    } catch (error) {
      console.error("Erro ao atualizar histórico:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao atualizar histórico" });
    }
  });

  // GET /api/costs/all - Buscar todos os custos (para análise geral)
  app.get("/api/costs/all", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Verificar se o usuário é dono ou gerente (motoristas não podem ver custos)
      const user = await storage.getUser(userCompany.userId);
      if (user?.role === "motorista") {
        return res.json([]); // Lista de custos vazia para motoristas
      }

      // Buscar custos de veículos com informações do veículo
      const vehicleCostsData = await storage.getAllCostsWithVehicleInfo(userCompany.empresaId);
      
      // Buscar despesas operacionais
      const operExpenses = await db.select().from(operationalExpenses)
        .where(eq(operationalExpenses.empresaId, userCompany.empresaId));
      
      // Buscar observações gerais que têm custo registrado
      const observationsWithCosts = await db.select().from(storeObservations)
        .where(
          and(
            eq(storeObservations.empresaId, userCompany.empresaId),
            isNotNull(storeObservations.expenseCost)
          )
        );
      
      // Combinar os três tipos de custos
      const allCosts = [
        // Custos de veículos (Custos de Preparação)
        ...vehicleCostsData.map(cost => ({
          ...cost,
          source: 'vehicle'
        })),
        // Despesas operacionais
        ...operExpenses.map((expense: any) => ({
          id: expense.id,
          vehicleId: null,
          category: expense.categoria,
          description: expense.descricao,
          value: parseFloat(expense.valor),
          date: expense.dataPagamento,
          paymentMethod: expense.formaPagamento,
          paidBy: expense.observacoes,
          vehicleBrand: null,
          vehicleModel: null,
          vehiclePlate: null,
          source: 'operational'
        })),
        // Observações gerais com custos
        ...observationsWithCosts.map((obs: any) => ({
          id: obs.id,
          vehicleId: null,
          category: obs.category || 'Observação Geral',
          description: obs.expenseDescription || obs.description,
          value: parseFloat(obs.expenseCost),
          date: obs.resolvedAt || obs.createdAt,
          paymentMethod: obs.expensePaymentMethod || 'N/A',
          paidBy: obs.expensePaidBy || null,
          vehicleBrand: null,
          vehicleModel: null,
          vehiclePlate: null,
          source: 'observation'
        }))
      ];
      
      res.json(allCosts);
    } catch (error) {
      console.error("Erro ao buscar todos os custos:", error);
      res.status(500).json({ error: "Erro ao buscar todos os custos" });
    }
  });

  // GET /api/vehicles/:id/costs - Buscar custos do veículo
  app.get("/api/vehicles/:id/costs", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const costs = await storage.getVehicleCosts(req.params.id);
      
      // Motoristas não devem ver dados de custos
      const user = await storage.getUser(userCompany.userId);
      if (user?.role === "motorista") {
        return res.json([]);  // Lista de custos vazia para motoristas
      }
      
      res.json(costs);
    } catch (error) {
      console.error("Erro ao buscar custos:", error);
      res.status(500).json({ error: "Erro ao buscar custos" });
    }
  });

  // POST /api/vehicles/:id/costs - Adicionar custo
  app.post("/api/vehicles/:id/costs", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const costData = insertVehicleCostSchema.parse({
        vehicleId: req.params.id,
        category: req.body.category,
        description: req.body.description,
        value: req.body.value,
        date: new Date(req.body.date),
        paymentMethod: req.body.paymentMethod || "Cartão Loja",
        paidBy: req.body.paidBy || null,
      });

      const cost = await storage.addVehicleCost(costData);

      io.emit("cost:added", cost);

      res.json(cost);
    } catch (error) {
      console.error("Erro ao adicionar custo:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Erro ao adicionar custo" });
    }
  });

  // PATCH /api/vehicles/:id/costs/:costId - Atualizar custo
  app.patch("/api/vehicles/:id/costs/:costId", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const updates: Partial<any> = {};
      
      if (req.body.category !== undefined) updates.category = req.body.category;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.value !== undefined) {
        updates.value = typeof req.body.value === 'string' ? req.body.value : req.body.value.toString();
      }
      if (req.body.date !== undefined) updates.date = new Date(req.body.date);
      if (req.body.paymentMethod !== undefined) updates.paymentMethod = req.body.paymentMethod;
      if (req.body.paidBy !== undefined) updates.paidBy = req.body.paidBy;

      const cost = await storage.updateVehicleCost(req.params.costId, updates);

      if (!cost) {
        return res.status(404).json({ error: "Custo não encontrado" });
      }

      io.emit("cost:updated", cost);

      res.json(cost);
    } catch (error) {
      console.error("Erro ao atualizar custo:", error);
      res.status(500).json({ error: "Erro ao atualizar custo" });
    }
  });

  // DELETE /api/vehicles/:id/costs/:costId - Excluir custo
  app.delete("/api/vehicles/:id/costs/:costId", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const success = await storage.deleteCost(req.params.costId);

      if (!success) {
        return res.status(404).json({ error: "Custo não encontrado" });
      }

      io.emit("cost:deleted", { vehicleId: req.params.id, costId: req.params.costId });

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir custo:", error);
      res.status(500).json({ error: "Erro ao excluir custo" });
    }
  });

  // POST /api/vehicles/:id/images - Adicionar imagens ao veículo
  app.post("/api/vehicles/:id/images", isAuthenticated, upload.array("images", 8), async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Nenhuma imagem enviada" });
      }

      const existingImages = await storage.getVehicleImages(req.params.id);
      const startOrder = existingImages.length;

      const addedImages = [];
      for (let i = 0; i < files.length; i++) {
        const imageUrl = `data:${files[i].mimetype};base64,${files[i].buffer.toString("base64")}`;
        const image = await storage.addVehicleImage({
          vehicleId: req.params.id,
          imageUrl,
          order: startOrder + i,
        });
        addedImages.push(image);

        if (existingImages.length === 0 && i === 0) {
          await storage.updateVehicle(req.params.id, { mainImageUrl: imageUrl });
        }
      }

      io.emit("vehicle:images:updated", req.params.id);

      res.json({ images: addedImages });
    } catch (error) {
      console.error("Erro ao adicionar imagens:", error);
      res.status(500).json({ error: "Erro ao adicionar imagens" });
    }
  });

  // DELETE /api/vehicles/:id/images/:imageId - Remover imagem do veículo
  app.delete("/api/vehicles/:id/images/:imageId", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const success = await storage.deleteVehicleImage(req.params.imageId);
      if (!success) {
        return res.status(404).json({ error: "Imagem não encontrada" });
      }

      let remainingImages = await storage.getVehicleImages(req.params.id);
      
      for (let i = 0; i < remainingImages.length; i++) {
        if (remainingImages[i].order !== i) {
          await storage.updateVehicleImage(remainingImages[i].id, { order: i });
        }
      }
      
      remainingImages = await storage.getVehicleImages(req.params.id);
      
      // A vehicle já foi validada acima, então não precisa passar empresaId novamente
      // mas vamos manter consistência
      if (remainingImages.length > 0) {
        const stillHasCover = remainingImages.find(img => img.imageUrl === vehicle?.mainImageUrl);
        if (!stillHasCover) {
          await storage.updateVehicle(req.params.id, { mainImageUrl: remainingImages[0].imageUrl });
        }
      } else {
        await storage.updateVehicle(req.params.id, { mainImageUrl: null });
      }

      io.emit("vehicle:images:updated", req.params.id);

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao remover imagem:", error);
      res.status(500).json({ error: "Erro ao remover imagem" });
    }
  });

  // PATCH /api/vehicles/:id/images/reorder - Reordenar imagens (primeira vira capa automaticamente)
  app.patch("/api/vehicles/:id/images/reorder", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const { imageOrder } = req.body;
      if (!Array.isArray(imageOrder) || imageOrder.length === 0) {
        return res.status(400).json({ error: "imageOrder inválido" });
      }

      // Validar que todos os IDs de imagem pertencem ao veículo
      const vehicleImages = await storage.getVehicleImages(req.params.id);
      const vehicleImageIds = new Set(vehicleImages.map(img => img.id));
      
      for (const item of imageOrder) {
        if (!vehicleImageIds.has(item.imageId)) {
          return res.status(400).json({ error: "Uma ou mais imagens não pertencem a este veículo" });
        }
      }

      // Atualizar ordem de cada imagem
      for (const item of imageOrder) {
        await storage.updateVehicleImage(item.imageId, { order: item.order });
      }

      // Atualizar mainImageUrl para a primeira imagem (capa)
      const reorderedImages = await storage.getVehicleImages(req.params.id);
      if (reorderedImages.length > 0) {
        const coverImage = reorderedImages.find(img => img.order === 0);
        if (coverImage) {
          await storage.updateVehicle(req.params.id, { mainImageUrl: coverImage.imageUrl });
        }
      }

      io.emit("vehicle:images:updated", req.params.id);

      res.json({ success: true, images: await storage.getVehicleImages(req.params.id) });
    } catch (error) {
      console.error("Erro ao reordenar imagens:", error);
      res.status(500).json({ error: "Erro ao reordenar imagens" });
    }
  });

  // GET /api/metrics - Métricas do dashboard (FILTRADO POR EMPRESA)
  app.get("/api/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.id || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (!user?.empresaId) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const vehicles = await storage.getAllVehicles(user.empresaId);
      
      // Total em estoque = todos exceto Vendido e Arquivado
      const totalVehicles = vehicles.filter(v => 
        v.status !== "Vendido" && v.status !== "Arquivado"
      ).length;
      const readyForSale = vehicles.filter(v => v.status === "Pronto para Venda").length;
      
      // Calcular custo médio por veículo (apenas do mês atual)
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const allCosts = await Promise.all(
        vehicles.map(async (v) => {
          const costs = await storage.getVehicleCosts(v.id);
          return { vehicleId: v.id, costs };
        })
      );
      
      // Calcular custo total de cada veículo no mês atual
      const vehicleCostsThisMonth = allCosts.map(({ vehicleId, costs }) => {
        const monthCosts = costs.filter(cost => {
          const costDate = new Date(cost.date);
          return costDate >= startOfCurrentMonth;
        });
        const totalCost = monthCosts.reduce((sum, cost) => sum + Number(cost.value), 0);
        return { vehicleId, totalCost };
      }).filter(v => v.totalCost > 0); // Apenas veículos com custos
      
      const avgCostCurrentMonth = vehicleCostsThisMonth.length > 0
        ? vehicleCostsThisMonth.reduce((sum, v) => sum + v.totalCost, 0) / vehicleCostsThisMonth.length
        : 0;
      
      const times = vehicles.map(v => {
        const diff = now.getTime() - v.locationChangedAt.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
      });
      const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

      const inProcess = vehicles.filter(v => 
        v.status !== "Pronto para Venda" && 
        v.status !== "Vendido" && 
        v.status !== "Arquivado" &&
        v.status !== "Entrada"
      ).length;

      res.json({
        totalVehicles,
        readyForSale,
        inProcess,
        avgTime: `${avgTime} dias`,
        avgCost: avgCostCurrentMonth >= 1000 
          ? `R$ ${(avgCostCurrentMonth / 1000).toFixed(1)}K`
          : `R$ ${avgCostCurrentMonth.toFixed(2)}`,
      });
    } catch (error) {
      console.error("Erro ao calcular métricas:", error);
      res.status(500).json({ error: "Erro ao calcular métricas" });
    }
  });

  // POST /api/vehicles/:id/generate-ad - Gerar anúncio com OpenAI
  app.post("/api/vehicles/:id/generate-ad", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "Chave da API OpenAI não configurada" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const features = vehicle.features?.join(", ") || "";
      const notes = vehicle.notes || "";
      
      // Pegar custos do veículo para contextualizar o valor
      const costs = await storage.getVehicleCosts(vehicle.id);
      const operationalCosts = costs.reduce((sum, cost) => sum + Number(cost.value), 0);
      const purchasePrice = Number(vehicle.purchasePrice) || 0;
      const totalCosts = purchasePrice + operationalCosts;
      const hasPriceSet = vehicle.salePrice && Number(vehicle.salePrice) > 0;

      const prompt = `Você é um redator de publicidade EXPERT em vendas de carros para a "Capoeiras Automóveis", uma concessionária confiável e estabelecida. 

Crie um anúncio ÚNICO, PERSUASIVO e IRRESISTÍVEL para redes sociais (Instagram/Facebook) para este veículo ESPECÍFICO:

🚗 **${vehicle.brand} ${vehicle.model} ${vehicle.year}**
📍 Cor: ${vehicle.color}
${vehicle.fuelType ? `⛽ ${vehicle.fuelType}` : ''}
${vehicle.kmOdometer ? `📊 ${vehicle.kmOdometer.toLocaleString('pt-BR')} km rodados` : '📊 Baixa quilometragem'}
${features ? `✨ Opcionais: ${features}` : ''}
${notes ? `📝 Detalhes: ${notes}` : ''}

INSTRUÇÕES ESSENCIAIS:
1. Crie um texto EXCLUSIVO baseado nas características ESPECÍFICAS deste ${vehicle.brand} ${vehicle.model}
2. Destaque os DIFERENCIAIS ÚNICOS deste veículo em particular
3. Use uma abordagem EMOCIONAL e PERSUASIVA que conecte com o cliente
4. Inclua 3-4 emojis relevantes para chamar atenção visual
5. Crie um senso de URGÊNCIA e OPORTUNIDADE ÚNICA
6. Termine com um CTA (chamada para ação) forte e direto
7. Mencione "Capoeiras Automóveis" como a loja de confiança
8. NÃO use frases genéricas - seja ESPECÍFICO sobre ESTE carro
9. Máximo de 150 palavras, linguagem natural brasileira
10. ${hasPriceSet ? `Enfatize o excelente custo-benefício` : 'Destaque que o preço é sob consulta para negociação personalizada'}

Gere APENAS o texto do anúncio, sem títulos ou formatação extra.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Você é um copywriter especialista em vendas automotivas com 15 anos de experiência. Você cria anúncios únicos e persuasivos que convertem visualizações em vendas reais. Cada anúncio seu é diferente e personalizado para o veículo específico.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.9,
        max_tokens: 600,
      });

      const adText = completion.choices[0]?.message?.content || "";

      res.json({ adText });
    } catch (error: any) {
      console.error("Erro ao gerar anúncio:", error);
      
      if (error.status === 429 || error.code === 'insufficient_quota') {
        return res.status(429).json({ 
          error: "A chave da API OpenAI está sem créditos. Por favor, adicione créditos na sua conta OpenAI para usar esta funcionalidade." 
        });
      }
      
      if (error.status === 401 || error.code === 'invalid_api_key') {
        return res.status(401).json({ 
          error: "Chave da API OpenAI inválida. Verifique a configuração." 
        });
      }
      
      res.status(500).json({ 
        error: "Erro ao gerar anúncio com IA. Tente novamente mais tarde." 
      });
    }
  });

  // Store Observations endpoints

  // GET /api/store-observations - Listar todas as observações da loja (FILTRADO POR EMPRESA)
  app.get("/api/store-observations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.id || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (!user?.empresaId) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const observations = await storage.getAllStoreObservations(user.empresaId);
      
      // Calcular dias pendentes para cada observação
      const observationsWithDays = observations.map((obs: any) => {
        if (obs.status === "Pendente") {
          const createdDate = new Date(obs.createdAt);
          const now = new Date();
          // Não usar Math.abs - se data futura, considerar 0 dias
          const diffTime = now.getTime() - createdDate.getTime();
          const daysOpen = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
          
          return { ...obs, daysOpen };
        }
        return { ...obs, daysOpen: 0 };
      });
      
      res.json(observationsWithDays);
    } catch (error) {
      console.error("Erro ao buscar observações da loja:", error);
      res.status(500).json({ error: "Erro ao buscar observações da loja" });
    }
  });

  // GET /api/store-observations/:id - Buscar observação por ID
  app.get("/api/store-observations/:id", async (req, res) => {
    try {
      const observation = await storage.getStoreObservation(req.params.id);
      if (!observation) {
        return res.status(404).json({ error: "Observação não encontrada" });
      }
      res.json(observation);
    } catch (error) {
      console.error("Erro ao buscar observação:", error);
      res.status(500).json({ error: "Erro ao buscar observação" });
    }
  });

  // POST /api/store-observations - Criar nova observação
  app.post("/api/store-observations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.id || req.user.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (!user?.empresaId) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }
      
      const empresaId = user.empresaId;

      const observationData = insertStoreObservationSchema.parse({
        ...req.body,
        empresaId,
      });
      const newObservation = await storage.createStoreObservation(observationData);
      
      io.emit("storeObservationCreated", newObservation);
      
      res.status(201).json(newObservation);
    } catch (error) {
      console.error("Erro ao criar observação:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar observação" });
    }
  });

  // PATCH /api/store-observations/:id - Atualizar observação
  app.patch("/api/store-observations/:id", async (req, res) => {
    try {
      const updates = insertStoreObservationSchema.partial().parse(req.body);
      const updatedObservation = await storage.updateStoreObservation(req.params.id, updates);
      
      if (!updatedObservation) {
        return res.status(404).json({ error: "Observação não encontrada" });
      }
      
      io.emit("storeObservationUpdated", updatedObservation);
      
      res.json(updatedObservation);
    } catch (error) {
      console.error("Erro ao atualizar observação:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao atualizar observação" });
    }
  });

  // DELETE /api/store-observations/:id - Deletar observação
  app.delete("/api/store-observations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteStoreObservation(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Observação não encontrada" });
      }
      
      io.emit("storeObservationDeleted", req.params.id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar observação:", error);
      res.status(500).json({ error: "Erro ao deletar observação" });
    }
  });

  // Company Settings endpoints
  
  // GET /api/company-settings - Buscar configurações da empresa
  app.get("/api/company-settings", async (req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      res.status(500).json({ error: "Erro ao buscar configurações" });
    }
  });

  // PATCH /api/company-settings - Atualizar configurações da empresa
  app.patch("/api/company-settings", async (req, res) => {
    try {
      const updatedSettings = await storage.createOrUpdateCompanySettings(req.body);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Erro ao atualizar configurações:", error);
      res.status(500).json({ error: "Erro ao atualizar configurações" });
    }
  });

  // Advanced Settings endpoints (categorias customizadas, origens de leads, etc)
  
  // GET /api/settings/advanced - Buscar configurações avançadas
  app.get("/api/settings/advanced", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }
      
      const settings = await storage.getAdvancedSettings(userCompany.empresaId);
      res.json(settings || {
        categoriasCustos: ["Mecânica", "Estética", "Documentação", "Outros"],
        origensLeads: ["WhatsApp", "Site", "Indicação", "Loja Física", "Redes Sociais", "Telefone"],
      });
    } catch (error) {
      console.error("Erro ao buscar configurações avançadas:", error);
      res.status(500).json({ error: "Erro ao buscar configurações avançadas" });
    }
  });

  // PUT /api/settings/advanced - Atualizar configurações avançadas (Proprietário apenas)
  app.put("/api/settings/advanced", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }
      
      const updatedSettings = await storage.updateAdvancedSettings(userCompany.empresaId, req.body);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Erro ao atualizar configurações avançadas:", error);
      res.status(500).json({ error: "Erro ao atualizar configurações avançadas" });
    }
  });

  // Vehicle Documents endpoints
  
  // GET /api/vehicles/:id/documents - Listar documentos do veículo
  app.get("/api/vehicles/:id/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const documents = await storage.getVehicleDocuments(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error("Erro ao listar documentos:", error);
      res.status(500).json({ error: "Erro ao listar documentos" });
    }
  });

  // POST /api/vehicles/:id/documents - Upload de documento
  app.post("/api/vehicles/:id/documents", isAuthenticated, documentUpload.single("file"), async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const { documentType } = req.body;
      if (!documentType) {
        await fs.unlink(req.file.path);
        return res.status(400).json({ error: "Tipo de documento é obrigatório" });
      }

      const document = await storage.addVehicleDocument({
        vehicleId: req.params.id,
        documentType: documentType as any,
        originalFileName: req.file.originalname,
        storedFileName: req.file.filename,
        storagePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: null,
      });

      io.emit("vehicleDocumentAdded", document);
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Erro ao fazer upload de documento:", error);
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({ error: "Erro ao fazer upload de documento" });
    }
  });

  // GET /api/vehicles/:id/documents/:docId/download - Download de documento
  app.get("/api/vehicles/:id/documents/:docId/download", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const document = await storage.getVehicleDocument(req.params.docId);
      
      if (!document || document.vehicleId !== req.params.id) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }

      res.setHeader("Content-Type", document.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(document.originalFileName)}"`);
      
      const fileStream = createReadStream(document.storagePath);
      
      fileStream.on('error', (err: any) => {
        console.error("Erro ao ler arquivo:", err);
        
        if (res.headersSent) {
          res.destroy();
          return;
        }
        
        if (err.code === 'ENOENT') {
          res.status(404).json({ error: "Arquivo não encontrado no servidor" });
        } else {
          res.status(500).json({ error: "Erro ao ler arquivo" });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error("Erro ao fazer download de documento:", error);
      res.status(500).json({ error: "Erro ao fazer download de documento" });
    }
  });

  // DELETE /api/vehicles/:id/documents/:docId - Deletar documento
  app.delete("/api/vehicles/:id/documents/:docId", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const document = await storage.getVehicleDocument(req.params.docId);
      
      if (!document || document.vehicleId !== req.params.id) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }

      await storage.deleteVehicleDocument(req.params.docId);
      
      try {
        await fs.unlink(document.storagePath);
      } catch (unlinkError: any) {
        if (unlinkError.code !== 'ENOENT') {
          console.error("Erro ao deletar arquivo físico:", unlinkError);
        }
      }

      io.emit("vehicleDocumentDeleted", req.params.docId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar documento:", error);
      res.status(500).json({ error: "Erro ao deletar documento" });
    }
  });

  // GET /api/companies - Listar todas as empresas
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Erro ao listar empresas:", error);
      res.status(500).json({ error: "Erro ao listar empresas" });
    }
  });

  // GET /api/companies/:id - Obter empresa específica
  app.get("/api/companies/:id", async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }
      res.json(company);
    } catch (error) {
      console.error("Erro ao buscar empresa:", error);
      res.status(500).json({ error: "Erro ao buscar empresa" });
    }
  });

  // POST /api/companies - Criar nova empresa
  // POST /api/companies - Criar empresa e vincular ao usuário autenticado
  app.post("/api/companies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.id || req.user.claims?.sub;
      
      // Buscar usuário atual
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      // Criar a empresa
      const company = await storage.createCompany(req.body);
      
      // Vincular empresa ao usuário autenticado e definir como PROPRIETÁRIO
      await storage.upsertUser({
        ...user,
        empresaId: company.id,
        role: "proprietario", // Primeiro usuário é sempre proprietário
      });
      
      io.emit("company:created", company);
      res.status(201).json(company);
    } catch (error) {
      console.error("Erro ao criar empresa:", error);
      res.status(500).json({ error: "Erro ao criar empresa" });
    }
  });

  // PATCH /api/companies/:id - Atualizar empresa (COM VALIDAÇÃO DE PROPRIETÁRIO)
  app.patch("/api/companies/:id", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar que o usuário está editando sua própria empresa
      if (req.params.id !== userCompany.empresaId) {
        return res.status(403).json({ error: "Acesso negado. Você não pode editar outra empresa." });
      }

      // Sanitizar e validar comissãoFixaGlobal rigorosamente
      const updateData = { ...req.body };
      if ('comissaoFixaGlobal' in updateData) {
        if (updateData.comissaoFixaGlobal === null || updateData.comissaoFixaGlobal === '') {
          updateData.comissaoFixaGlobal = null;
        } else {
          const valor = Number(updateData.comissaoFixaGlobal);
          // Validação robusta: rejeita NaN, Infinity, -Infinity, negativos e valores extremos
          if (!Number.isFinite(valor) || valor < 0 || valor > 999999.99) {
            return res.status(400).json({ error: "Comissão fixa global deve ser um número válido entre 0 e R$ 999.999,99" });
          }
          // Armazenar como número, não string
          updateData.comissaoFixaGlobal = valor;
        }
      }

      const company = await storage.updateCompany(req.params.id, updateData);
      if (!company) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }
      
      console.log("[COMPANY] Empresa atualizada:", {
        id: company.id,
        nome: company.nomeFantasia,
        corPrimaria: company.corPrimaria,
        corSecundaria: company.corSecundaria,
      });
      
      io.emit("company:updated", company);
      res.json(company);
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      res.status(500).json({ error: "Erro ao atualizar empresa" });
    }
  });

  // ==================== ROTAS DE GESTÃO DE USUÁRIOS ====================
  
  // GET /api/users - Listar todos os usuários da empresa (só Proprietário)
  app.get("/api/users", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const users = await storage.getAllUsers(userCompany.empresaId);
      
      // Remover informações sensíveis antes de retornar
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        comissaoFixa: user.comissaoFixa,
        usarComissaoFixaGlobal: user.usarComissaoFixaGlobal,
        createdAt: user.createdAt,
        createdBy: user.createdBy,
      }));

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  // POST /api/users - Criar novo usuário (só Proprietário)
  app.post("/api/users", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const { email, firstName, lastName, role, password } = req.body;

      // Validar campos obrigatórios
      if (!email || !firstName || !role || !password) {
        return res.status(400).json({ 
          error: "Campos obrigatórios: email, firstName, role, password" 
        });
      }

      // Verificar se email já existe
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      // Validar role
      const validRoles = ["proprietario", "gerente", "vendedor", "motorista"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Papel inválido" });
      }

      // Hash da senha
      const passwordHash = await bcrypt.hash(password, 10);

      // Criar usuário
      const newUser = await storage.createLocalUser({
        email,
        firstName,
        lastName,
        role,
        passwordHash,
        authProvider: "local",
        empresaId: userCompany.empresaId,
        createdBy: userCompany.userId,
        isActive: "true",
      });

      // Retornar sem informações sensíveis
      res.status(201).json({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      });
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ error: "Erro ao criar usuário" });
    }
  });

  // PATCH /api/users/:id - Atualizar usuário (só Proprietário)
  app.patch("/api/users/:id", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Buscar usuário a ser atualizado
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Verificar se usuário pertence à mesma empresa
      if (targetUser.empresaId !== userCompany.empresaId) {
        return res.status(403).json({ error: "Usuário não pertence a esta empresa" });
      }

      // Evitar que proprietário desative a si mesmo
      if (targetUser.id === userCompany.userId && req.body.isActive === "false") {
        return res.status(400).json({ error: "Você não pode desativar sua própria conta" });
      }

      const { firstName, lastName, role, isActive, comissaoFixa, usarComissaoFixaGlobal } = req.body;
      const updates: any = {};

      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (role !== undefined) {
        const validRoles = ["proprietario", "gerente", "vendedor", "motorista"];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ error: "Papel inválido" });
        }
        updates.role = role;
      }
      if (isActive !== undefined) updates.isActive = isActive;
      
      // Atualizar configurações de comissão
      if (usarComissaoFixaGlobal !== undefined) {
        // Converter boolean para string se necessário
        const value = typeof usarComissaoFixaGlobal === 'boolean' 
          ? (usarComissaoFixaGlobal ? 'true' : 'false')
          : String(usarComissaoFixaGlobal);
        updates.usarComissaoFixaGlobal = value;
      }
      if (comissaoFixa !== undefined) {
        // Validar comissão individual
        if (comissaoFixa === null || comissaoFixa === '') {
          updates.comissaoFixa = null;
        } else {
          const valor = Number(comissaoFixa);
          if (!Number.isFinite(valor) || valor < 0 || valor > 999999.99) {
            return res.status(400).json({ error: "Comissão fixa deve ser um número válido entre 0 e R$ 999.999,99" });
          }
          updates.comissaoFixa = valor;
        }
      }

      const updatedUser = await storage.updateUser(req.params.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: "Erro ao atualizar usuário" });
      }

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // ==================== FIM DAS ROTAS DE GESTÃO DE USUÁRIOS ====================

  // GET /api/backups - Listar todos os backups
  app.get("/api/backups", async (req, res) => {
    try {
      const backups = await listBackups();
      res.json(backups);
    } catch (error) {
      console.error("Erro ao listar backups:", error);
      res.status(500).json({ error: "Erro ao listar backups" });
    }
  });

  // POST /api/backups - Criar backup manual
  app.post("/api/backups", async (req, res) => {
    try {
      const backupPath = await createBackup("manual");
      res.json({ 
        success: true, 
        message: "Backup criado com sucesso",
        path: backupPath 
      });
    } catch (error) {
      console.error("Erro ao criar backup:", error);
      res.status(500).json({ error: "Erro ao criar backup" });
    }
  });

  // GET /api/backups/:filename/download - Download de backup
  app.get("/api/backups/:filename/download", async (req, res) => {
    try {
      const backupPath = await getBackupPath(req.params.filename);
      
      if (!existsSync(backupPath)) {
        return res.status(404).json({ error: "Backup não encontrado" });
      }

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
      
      const fileStream = createReadStream(backupPath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Erro ao fazer download de backup:", error);
      res.status(500).json({ error: "Erro ao fazer download de backup" });
    }
  });

  // FIPE API Routes
  const FIPE_BASE_URL = "https://parallelum.com.br/fipe/api/v1";

  // Helper para normalizar tipo de veículo
  const normalizeVehicleType = (type?: string): string => {
    const normalized = (type || "carros").toLowerCase();
    if (normalized === "motos" || normalized === "moto") return "motos";
    if (normalized === "caminhoes" || normalized === "caminhao") return "caminhoes";
    return "carros"; // Default
  };

  // GET /api/fipe/brands - Listar marcas
  app.get("/api/fipe/brands", async (req, res) => {
    try {
      const vehicleType = normalizeVehicleType(req.query.type as string);
      const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/marcas`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Erro ao buscar marcas FIPE:", error);
      res.status(500).json({ error: "Erro ao buscar marcas" });
    }
  });

  // GET /api/fipe/brands/:brandId/models - Listar modelos por marca
  app.get("/api/fipe/brands/:brandId/models", async (req, res) => {
    try {
      const { brandId } = req.params;
      const vehicleType = normalizeVehicleType(req.query.type as string);
      const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/marcas/${brandId}/modelos`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Erro ao buscar modelos FIPE:", error);
      res.status(500).json({ error: "Erro ao buscar modelos" });
    }
  });

  // GET /api/fipe/brands/:brandId/models/:modelId/years - Listar anos por modelo
  app.get("/api/fipe/brands/:brandId/models/:modelId/years", async (req, res) => {
    try {
      const { brandId, modelId } = req.params;
      const vehicleType = normalizeVehicleType(req.query.type as string);
      const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/marcas/${brandId}/modelos/${modelId}/anos`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Erro ao buscar anos FIPE:", error);
      res.status(500).json({ error: "Erro ao buscar anos" });
    }
  });

  // GET /api/fipe/brands/:brandId/models/:modelId/years/:year/price - Consultar preço FIPE
  app.get("/api/fipe/brands/:brandId/models/:modelId/years/:year/price", async (req, res) => {
    try {
      const { brandId, modelId, year } = req.params;
      const vehicleType = normalizeVehicleType(req.query.type as string);
      const response = await fetch(`${FIPE_BASE_URL}/${vehicleType}/marcas/${brandId}/modelos/${modelId}/anos/${year}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Erro ao consultar preço FIPE:", error);
      res.status(500).json({ error: "Erro ao consultar preço" });
    }
  });

  // POST /api/vehicles/:id/suggest-price - Sugerir preço de venda com IA
  app.post("/api/vehicles/:id/suggest-price", isAuthenticated, async (req: any, res) => {
    const userCompany = await getUserWithCompany(req);
    if (!userCompany) {
      return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: "API key da OpenAI não configurada" });
    }

    try {
      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const costs = await storage.getVehicleCosts(req.params.id);
      const operationalCosts = costs.reduce((sum, cost) => sum + (Number(cost.value) || 0), 0);
      const purchasePrice = Number(vehicle.purchasePrice) || 0;
      const totalCost = purchasePrice + operationalCosts;

      const { fipePrice, targetMarginPercent } = req.body;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `Você é um especialista em precificação de veículos usados. 
Analise as informações abaixo e sugira um preço de venda adequado:

Veículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year}
Cor: ${vehicle.color || "Não especificada"}
Preço de Aquisição (quanto a loja pagou): R$ ${purchasePrice.toFixed(2)}
Custos Operacionais (reparos, higienização, etc): R$ ${operationalCosts.toFixed(2)}
Custo Total Investido: R$ ${totalCost.toFixed(2)}
Preço FIPE (referência de mercado): ${fipePrice ? `R$ ${fipePrice}` : "Não disponível"}
Margem de Lucro Desejada: ${targetMarginPercent || 20}%

Com base nessas informações, sugira:
1. Um preço de venda competitivo considerando o custo, a margem desejada e o valor FIPE
2. Uma breve justificativa (2-3 linhas) da sua sugestão
3. Se o preço sugerido difere muito da FIPE, explique o motivo

Retorne APENAS um JSON válido no formato:
{
  "suggestedPrice": número,
  "reasoning": "texto justificativa"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      console.error("Erro ao sugerir preço:", error);
      res.status(500).json({ error: "Erro ao gerar sugestão de preço" });
    }
  });

  // POST /api/vehicles/:id/generate-ad - Gerar anúncio com IA (3 estilos) - DUPLICADA, REMOVER
  app.post("/api/vehicles/:id/generate-ad-old", isAuthenticated, async (req: any, res) => {
    const userCompany = await getUserWithCompany(req);
    if (!userCompany) {
      return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: "API key da OpenAI não configurada" });
    }

    try {
      // Validar que o veículo pertence à empresa
      const vehicle = await storage.getVehicle(req.params.id, userCompany.empresaId);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado ou não pertence a esta empresa" });
      }

      const { style } = req.body; // "economico", "completo", ou "urgente"

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const styleInstructions = {
        economico: "Foque em economia, baixo custo, oportunidade única. Tom direto e objetivo.",
        completo: "Destaque todos os detalhes, equipamentos, diferenciais. Tom profissional e descritivo.",
        urgente: "Crie senso de urgência, oferta por tempo limitado. Tom persuasivo e chamativo."
      };

      const prompt = `Você é um especialista em copywriting para venda de veículos.
Crie um anúncio profissional e atrativo para o seguinte veículo:

Veículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year}
Cor: ${vehicle.color || "Não especificada"}
${vehicle.salePrice ? `Preço: R$ ${vehicle.salePrice}` : ""}
${vehicle.notes ? `Observações: ${vehicle.notes}` : ""}

Estilo solicitado: ${style || "completo"}
${styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.completo}

Crie:
1. Um título chamativo (max 80 caracteres)
2. Uma descrição completa e atrativa (200-300 palavras)
3. Uma lista de 10 hashtags relevantes (incluindo marca, modelo, ano, características)
4. Um call-to-action final

Retorne APENAS um JSON válido no formato:
{
  "title": "título",
  "description": "descrição completa",
  "hashtags": ["#tag1", "#tag2", ...],
  "callToAction": "texto CTA"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      console.error("Erro ao gerar anúncio:", error);
      res.status(500).json({ error: "Erro ao gerar anúncio" });
    }
  });

  // GET /api/alerts - Sistema de alertas inteligentes
  app.get("/api/alerts", async (req: any, res) => {
    try {
      // Obter informações do usuário e sua role
      const userInfo = await getUserWithCompany(req);
      if (!userInfo) {
        return res.status(403).json({ error: "Usuário não está vinculado a uma empresa" });
      }
      const { empresaId, userId } = userInfo;
      
      // Buscar o usuário completo para obter a role
      const user = await storage.getUser(userId);
      const role = user?.role || "Vendedor";
      
      const companies = await storage.getAllCompanies();
      const company = companies.find(c => c.id === empresaId);
      if (!company) {
        return res.json({ alerts: [] });
      }

      const alertDays = company.alertaDiasParado || 7;

      const vehicles = await storage.getAllVehicles(empresaId);
      const alerts: any[] = [];
      const now = new Date();

      // Atualizar automaticamente contas vencidas antes de buscar alertas
      const { billsPayable } = await import("@shared/schema");
      const { db } = await import("./db");
      const { eq, and, lte } = await import("drizzle-orm");
      
      await db
        .update(billsPayable)
        .set({ status: "vencido" })
        .where(
          and(
            eq(billsPayable.empresaId, empresaId),
            eq(billsPayable.status, "pendente"),
            lte(billsPayable.dataVencimento, now)
          )
        );

      for (const vehicle of vehicles) {
        // Alerta 1: Veículos parados por X dias
        const allHistory = await storage.getAllVehicleHistory();
        const vehicleHistory = allHistory.filter(h => h.vehicleId === vehicle.id);
        const currentStatusEntry = vehicleHistory.find(h => h.toStatus === vehicle.status);
        const statusChangedAt = currentStatusEntry 
          ? (currentStatusEntry.movedAt || currentStatusEntry.createdAt)
          : (vehicle.locationChangedAt || vehicle.createdAt);
        
        const timeDiff = now.getTime() - statusChangedAt.getTime();
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

        if (days >= alertDays && vehicle.status !== "Vendido" && vehicle.status !== "Arquivado") {
          alerts.push({
            id: `parado-${vehicle.id}`,
            type: "warning",
            severity: "medium",
            title: `Veículo parado há ${days} dias`,
            message: `${vehicle.brand} ${vehicle.model} está no status "${vehicle.status}" há ${days} dias`,
            vehicleId: vehicle.id,
            vehicleName: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
            actionUrl: `/veiculo/${vehicle.id}`,
            createdAt: new Date().toISOString(),
          });
        }

        // Alerta 2: Veículos prontos sem foto
        if (vehicle.status === "Pronto para Venda") {
          const images = await storage.getVehicleImages(vehicle.id);
          if (images.length === 0) {
            alerts.push({
              id: `sem-foto-${vehicle.id}`,
              type: "error",
              severity: "high",
              title: "Veículo pronto sem foto",
              message: `${vehicle.brand} ${vehicle.model} está pronto para venda mas não tem fotos`,
              vehicleId: vehicle.id,
              vehicleName: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
              actionUrl: `/veiculo/${vehicle.id}`,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Alerta 3: Veículos prontos sem preço
        if (vehicle.status === "Pronto para Venda" && !vehicle.salePrice) {
          alerts.push({
            id: `sem-preco-${vehicle.id}`,
            type: "error",
            severity: "high",
            title: "Veículo pronto sem preço",
            message: `${vehicle.brand} ${vehicle.model} está pronto para venda mas não tem preço definido`,
            vehicleId: vehicle.id,
            vehicleName: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
            actionUrl: `/veiculo/${vehicle.id}`,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Alerta 4: Contas vencidas (APENAS para Proprietário e Gerente)
      if (role === "proprietario" || role === "gerente") {
        const contasVencidas = await db
          .select()
          .from(billsPayable)
          .where(
            and(
              eq(billsPayable.empresaId, empresaId),
              eq(billsPayable.status, "vencido")
            )
          );

        for (const conta of contasVencidas) {
          const diasVencidos = Math.floor((now.getTime() - new Date(conta.dataVencimento).getTime()) / (1000 * 60 * 60 * 24));
          const tipoConta = conta.tipo === "a_pagar" ? "a pagar" : "a receber";
          
          alerts.push({
            id: `conta-vencida-${conta.id}`,
            type: "error",
            severity: "high",
            title: `Conta ${tipoConta} vencida`,
            message: `${conta.descricao} - R$ ${conta.valor} venceu há ${diasVencidos} dias`,
            actionUrl: "/bills",
            createdAt: new Date().toISOString(),
          });
        }
      }

      res.json({ 
        alerts,
        totalAlerts: alerts.length,
        highSeverity: alerts.filter(a => a.severity === "high").length,
        mediumSeverity: alerts.filter(a => a.severity === "medium").length,
      });
    } catch (error) {
      console.error("Erro ao buscar alertas:", error);
      res.status(500).json({ error: "Erro ao buscar alertas" });
    }
  });

  // ============================================
  // BUSCA FIPE GRATUITA - API Pública Parallelum
  // ============================================
  
  // Cache simples em memória (1 hora)
  const fipeCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 60 * 60 * 1000; // 1 hora

  function getCachedData(key: string) {
    const cached = fipeCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  function setCachedData(key: string, data: any) {
    fipeCache.set(key, { data, timestamp: Date.now() });
  }

  // GET /api/fipe/brands - Lista de marcas
  app.get("/api/fipe/brands", isAuthenticated, async (req: any, res) => {
    try {
      const vehicleType = req.query.type || "carros"; // carros, motos, caminhoes
      const cacheKey = `brands-${vehicleType}`;
      
      const cached = getCachedData(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const response = await fetch(
        `https://parallelum.com.br/fipe/api/v1/${vehicleType}/marcas`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar marcas");
      }

      const data = await response.json();
      setCachedData(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("Erro ao buscar marcas FIPE:", error);
      res.status(500).json({ message: "Erro ao buscar marcas" });
    }
  });

  // GET /api/fipe/models - Lista de modelos de uma marca
  app.get("/api/fipe/models", isAuthenticated, async (req: any, res) => {
    try {
      const vehicleType = req.query.type || "carros";
      const brandCode = req.query.brandCode;

      if (!brandCode) {
        return res.status(400).json({ message: "Código da marca é obrigatório" });
      }

      const cacheKey = `models-${vehicleType}-${brandCode}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const response = await fetch(
        `https://parallelum.com.br/fipe/api/v1/${vehicleType}/marcas/${brandCode}/modelos`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar modelos");
      }

      const data = await response.json();
      setCachedData(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("Erro ao buscar modelos FIPE:", error);
      res.status(500).json({ message: "Erro ao buscar modelos" });
    }
  });

  // GET /api/fipe/years - Lista de anos de um modelo
  app.get("/api/fipe/years", isAuthenticated, async (req: any, res) => {
    try {
      const vehicleType = req.query.type || "carros";
      const brandCode = req.query.brandCode;
      const modelCode = req.query.modelCode;

      if (!brandCode || !modelCode) {
        return res.status(400).json({ 
          message: "Código da marca e modelo são obrigatórios" 
        });
      }

      const cacheKey = `years-${vehicleType}-${brandCode}-${modelCode}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const response = await fetch(
        `https://parallelum.com.br/fipe/api/v1/${vehicleType}/marcas/${brandCode}/modelos/${modelCode}/anos`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar anos");
      }

      const data = await response.json();
      setCachedData(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("Erro ao buscar anos FIPE:", error);
      res.status(500).json({ message: "Erro ao buscar anos" });
    }
  });

  // GET /api/fipe/value - Valor FIPE de um veículo específico
  app.get("/api/fipe/value", isAuthenticated, async (req: any, res) => {
    try {
      const vehicleType = req.query.type || "carros";
      const brandCode = req.query.brandCode;
      const modelCode = req.query.modelCode;
      const yearCode = req.query.yearCode;

      if (!brandCode || !modelCode || !yearCode) {
        return res.status(400).json({ 
          message: "Código da marca, modelo e ano são obrigatórios" 
        });
      }

      const cacheKey = `value-${vehicleType}-${brandCode}-${modelCode}-${yearCode}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const response = await fetch(
        `https://parallelum.com.br/fipe/api/v1/${vehicleType}/marcas/${brandCode}/modelos/${modelCode}/anos/${yearCode}`
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar valor FIPE");
      }

      const data = await response.json();
      setCachedData(cacheKey, data);
      res.json(data);
    } catch (error: any) {
      console.error("Erro ao buscar valor FIPE:", error);
      res.status(500).json({ message: "Erro ao buscar valor FIPE" });
    }
  });

  // ============================================
  // MÓDULO FINANCEIRO (Proprietário/Gerente apenas)
  // ============================================
  app.use("/api/financial", isAuthenticated, financialRoutes);

  // ============================================
  // LEADS E CRM
  // ============================================
  app.use("/api/leads", isAuthenticated, leadsRoutes);

  // ============================================
  // FOLLOW-UPS
  // ============================================
  app.use("/api/followups", isAuthenticated, followupsRoutes);

  // ============================================
  // ACTIVITY LOG (AUDITORIA)
  // ============================================
  app.use("/api/activity", isAuthenticated, activityLogRoutes);

  // ============================================
  // APROVAÇÕES DE CUSTOS
  // ============================================
  app.use("/api/approvals", isAuthenticated, costApprovalsRoutes);

  // ============================================
  // CONTAS A PAGAR E A RECEBER
  // ============================================
  app.use("/api/bills", isAuthenticated, requireProprietario, billsRoutes);

  // ============================================
  // GERENCIAR ACESSOS (Permissões Customizadas - Proprietário apenas)
  // ============================================
  
  // Buscar permissões de um usuário
  app.get("/api/users/:userId/permissions", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userInfo = await getUserWithCompany(req);
      if (!userInfo) {
        return res.status(403).json({ error: "Usuário não está vinculado a uma empresa" });
      }
      const { empresaId } = userInfo;
      const { userId } = req.params;

      const permissions = await storage.getUserPermissions(userId, empresaId);
      
      res.json(permissions || {
        // Valores padrão se não houver permissões customizadas
        userId,
        empresaId,
        acessarDashboard: "true",
        acessarVeiculos: "true",
        acessarCustos: "true",
        acessarAlerts: "true",
        acessarObservacoes: "true",
        acessarConfiguracoes: "false",
        acessarUsuarios: "false",
        acessarFinanceiro: "false",
        acessarDashboardFinanceiro: "false",
        acessarComissoes: "false",
        acessarDespesas: "false",
        acessarRelatorios: "false",
        criarVeiculos: "true",
        editarVeiculos: "true",
        deletarVeiculos: "false",
        verCustosVeiculos: "true",
        editarCustosVeiculos: "true",
        verMargensLucro: "false",
        usarSugestaoPreco: "true",
        usarGeracaoAnuncios: "true",
      });
    } catch (error) {
      console.error("Erro ao buscar permissões do usuário:", error);
      res.status(500).json({ error: "Erro ao buscar permissões" });
    }
  });

  // Atualizar permissões de um usuário
  app.put("/api/users/:userId/permissions", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userInfo = await getUserWithCompany(req);
      if (!userInfo) {
        return res.status(403).json({ error: "Usuário não está vinculado a uma empresa" });
      }
      const { empresaId, userId: proprietarioId } = userInfo;
      const { userId } = req.params;
      const permissions = req.body;

      // Validar que o usuário pertence à mesma empresa
      const targetUser = await storage.getUser(userId);
      if (!targetUser || targetUser.empresaId !== empresaId) {
        return res.status(403).json({ error: "Usuário não pertence a esta empresa" });
      }

      const updated = await storage.updateUserPermissions(userId, empresaId, {
        ...permissions,
        criadoPor: proprietarioId,
      });

      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar permissões do usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar permissões" });
    }
  });

  return httpServer;
}
