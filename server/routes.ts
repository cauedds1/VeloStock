import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { insertVehicleSchema, insertVehicleCostSchema, insertStoreObservationSchema } from "@shared/schema";
import OpenAI from "openai";
import path from "path";
import fs from "fs/promises";
import { existsSync, createReadStream } from "fs";

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

export async function registerRoutes(app: Express): Promise<Server> {
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

  // GET /api/vehicles - Listar todos os veículos
  app.get("/api/vehicles", async (req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      
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
          
          return {
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
        })
      );
      
      res.json(vehiclesWithImages);
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);
      res.status(500).json({ error: "Erro ao buscar veículos" });
    }
  });

  // GET /api/vehicles/:id - Buscar veículo por ID
  app.get("/api/vehicles/:id", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado" });
      }
      
      const images = await storage.getVehicleImages(vehicle.id);
      res.json({ ...vehicle, images });
    } catch (error) {
      console.error("Erro ao buscar veículo:", error);
      res.status(500).json({ error: "Erro ao buscar veículo" });
    }
  });

  // POST /api/vehicles - Criar novo veículo
  app.post("/api/vehicles", upload.array("images", 8), async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.parse({
        brand: req.body.brand,
        model: req.body.model,
        year: parseInt(req.body.year),
        color: req.body.color,
        plate: req.body.plate,
        vehicleType: req.body.vehicleType || "Carro",
        status: req.body.status || "Entrada",
        physicalLocation: req.body.physicalLocation || null,
        physicalLocationDetail: req.body.physicalLocationDetail || null,
        kmOdometer: req.body.kmOdometer != null && req.body.kmOdometer !== "" ? parseInt(req.body.kmOdometer) : null,
        fuelType: req.body.fuelType || null,
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

      const updatedVehicle = await storage.getVehicle(vehicle.id);
      const images = await storage.getVehicleImages(vehicle.id);
      
      res.json({ ...updatedVehicle, images });
    } catch (error) {
      console.error("Erro ao criar veículo:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar veículo" });
    }
  });

  // PATCH /api/vehicles/:id - Atualizar veículo
  app.patch("/api/vehicles/:id", async (req, res) => {
    try {
      const existingVehicle = await storage.getVehicle(req.params.id);
      if (!existingVehicle) {
        return res.status(404).json({ error: "Veículo não encontrado" });
      }

      const updates = req.body;
      
      // Detectar mudanças significativas em status ou localização física base
      const statusChanged = Object.prototype.hasOwnProperty.call(updates, "status") && 
        updates.status !== existingVehicle.status;
      const physicalLocationChanged = Object.prototype.hasOwnProperty.call(updates, "physicalLocation") && 
        updates.physicalLocation !== existingVehicle.physicalLocation;

      // Atualizar locationChangedAt apenas quando status muda
      if (statusChanged) {
        updates.locationChangedAt = new Date();
      }

      const updatedVehicle = await storage.updateVehicle(req.params.id, updates);

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

  // DELETE /api/vehicles/:id - Deletar veículo
  app.delete("/api/vehicles/:id", async (req, res) => {
    try {
      const success = await storage.deleteVehicle(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Veículo não encontrado" });
      }

      io.emit("vehicle:deleted", req.params.id);

      res.json({ success: true });
    } catch (error) {
      console.error("Erro ao deletar veículo:", error);
      res.status(500).json({ error: "Erro ao deletar veículo" });
    }
  });

  // GET /api/vehicles/:id/history - Buscar histórico do veículo
  app.get("/api/vehicles/:id/history", async (req, res) => {
    try {
      const history = await storage.getVehicleHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      res.status(500).json({ error: "Erro ao buscar histórico" });
    }
  });

  // PUT /api/vehicles/:vehicleId/history/:historyId - Atualizar entrada do histórico
  app.put("/api/vehicles/:vehicleId/history/:historyId", async (req, res) => {
    try {
      const historyEntry = await storage.getHistoryEntry(req.params.historyId);
      
      if (!historyEntry) {
        return res.status(404).json({ error: "Entrada de histórico não encontrada" });
      }
      
      if (historyEntry.vehicleId !== req.params.vehicleId) {
        return res.status(404).json({ error: "Entrada de histórico não encontrada" });
      }

      const updates: any = {};
      
      if (req.body.toStatus !== undefined) updates.toStatus = req.body.toStatus;
      if (req.body.toPhysicalLocation !== undefined) updates.toPhysicalLocation = req.body.toPhysicalLocation;
      if (req.body.toPhysicalLocationDetail !== undefined) updates.toPhysicalLocationDetail = req.body.toPhysicalLocationDetail;
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.movedAt !== undefined) updates.movedAt = new Date(req.body.movedAt);

      const updatedHistory = await storage.updateVehicleHistory(req.params.historyId, req.params.vehicleId, updates);
      
      if (!updatedHistory) {
        return res.status(404).json({ error: "Erro ao atualizar histórico" });
      }

      io.emit("history:updated", { vehicleId: req.params.vehicleId, history: updatedHistory });

      res.json(updatedHistory);
    } catch (error) {
      console.error("Erro ao atualizar histórico:", error);
      res.status(500).json({ error: "Erro ao atualizar histórico" });
    }
  });

  // GET /api/costs/all - Buscar todos os custos (para análise geral)
  app.get("/api/costs/all", async (req, res) => {
    try {
      const costs = await storage.getAllCosts();
      res.json(costs);
    } catch (error) {
      console.error("Erro ao buscar todos os custos:", error);
      res.status(500).json({ error: "Erro ao buscar todos os custos" });
    }
  });

  // GET /api/vehicles/:id/costs - Buscar custos do veículo
  app.get("/api/vehicles/:id/costs", async (req, res) => {
    try {
      const costs = await storage.getVehicleCosts(req.params.id);
      res.json(costs);
    } catch (error) {
      console.error("Erro ao buscar custos:", error);
      res.status(500).json({ error: "Erro ao buscar custos" });
    }
  });

  // POST /api/vehicles/:id/costs - Adicionar custo
  app.post("/api/vehicles/:id/costs", async (req, res) => {
    try {
      const costData = insertVehicleCostSchema.parse({
        vehicleId: req.params.id,
        category: req.body.category,
        description: req.body.description,
        value: Math.round(req.body.value * 100),
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
  app.patch("/api/vehicles/:id/costs/:costId", async (req, res) => {
    try {
      console.log('[PATCH Cost] Recebido:', req.body.value, 'centavos');
      
      const updates: Partial<any> = {};
      
      if (req.body.category !== undefined) updates.category = req.body.category;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.value !== undefined) updates.value = req.body.value;
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

  // POST /api/vehicles/:id/images - Adicionar imagens ao veículo
  app.post("/api/vehicles/:id/images", upload.array("images", 8), async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado" });
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
  app.delete("/api/vehicles/:id/images/:imageId", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado" });
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
      
      const updatedVehicle = await storage.getVehicle(req.params.id);
      if (remainingImages.length > 0) {
        const stillHasCover = remainingImages.find(img => img.imageUrl === updatedVehicle?.mainImageUrl);
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

  // GET /api/metrics - Métricas do dashboard
  app.get("/api/metrics", async (req, res) => {
    try {
      const vehicles = await storage.getAllVehicles();
      
      const totalVehicles = vehicles.length;
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
        const totalCost = monthCosts.reduce((sum, cost) => sum + cost.value, 0) / 100;
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
  app.post("/api/vehicles/:id/generate-ad", async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "Chave da API OpenAI não configurada" });
      }

      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado" });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const features = vehicle.features?.join(", ") || "";
      const notes = vehicle.notes || "";
      
      // Pegar custos do veículo para contextualizar o valor
      const costs = await storage.getVehicleCosts(vehicle.id);
      const totalCosts = costs.reduce((sum, cost) => sum + cost.value, 0);
      const hasPriceSet = vehicle.salePrice && vehicle.salePrice > 0;

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

  // GET /api/store-observations - Listar todas as observações da loja
  app.get("/api/store-observations", async (req, res) => {
    try {
      const observations = await storage.getAllStoreObservations();
      
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
  app.post("/api/store-observations", async (req, res) => {
    try {
      const observationData = insertStoreObservationSchema.parse(req.body);
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

  // Vehicle Documents endpoints
  
  // GET /api/vehicles/:id/documents - Listar documentos do veículo
  app.get("/api/vehicles/:id/documents", async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado" });
      }

      const documents = await storage.getVehicleDocuments(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error("Erro ao listar documentos:", error);
      res.status(500).json({ error: "Erro ao listar documentos" });
    }
  });

  // POST /api/vehicles/:id/documents - Upload de documento
  app.post("/api/vehicles/:id/documents", documentUpload.single("file"), async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: "Veículo não encontrado" });
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
  app.get("/api/vehicles/:id/documents/:docId/download", async (req, res) => {
    try {
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
  app.delete("/api/vehicles/:id/documents/:docId", async (req, res) => {
    try {
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

  return httpServer;
}
