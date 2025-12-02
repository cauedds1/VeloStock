import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import { z } from "zod";
import { insertVehicleSchema, insertVehicleCostSchema, insertStoreObservationSchema, updateVehicleHistorySchema, insertCommissionPaymentSchema, insertReminderSchema, commissionsConfig, commissionPayments, users, companies, storeObservations, operationalExpenses } from "@shared/schema";
import { isNotNull } from "drizzle-orm";
import OpenAI from "openai";
import path from "path";
import fs from "fs/promises";
import { existsSync, createReadStream } from "fs";
import { createBackup, listBackups, getBackupPath } from "./backup";
import { requireProprietario, requireProprietarioOrGerente, requireFinancialAccess, PERMISSIONS } from "./middleware/roleCheck";
import bcrypt from "bcrypt";
import financialRoutes from "./routes/financial";
import leadsRoutes from "./routes/leads";
import followupsRoutes from "./routes/followups";
import activityLogRoutes from "./routes/activityLog";
import costApprovalsRoutes from "./routes/costApprovals";
import billsRoutes from "./routes/bills";
import { registerAIRoutes } from "./routes/ai";
import { registerAdminRoutes } from "./routes/admin";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { generateVerificationCode, getVerificationCodeExpiry } from "./utils/verificationCode";
import { sendEmail } from "./utils/replitmail";

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

  // POST /api/auth/verify-signup-email - Verificar email no signup
  app.post('/api/auth/verify-signup-email', async (req: any, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: "Email e código são obrigatórios" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Usuário não encontrado" });
      }

      if (user.verificationCode !== code) {
        return res.status(400).json({ message: "Código inválido" });
      }

      if (!user.verificationCodeExpiry || new Date() > user.verificationCodeExpiry) {
        return res.status(400).json({ message: "Código expirado" });
      }

      // Marcar email como verificado
      await storage.updateUser(user.id, {
        emailVerified: "true",
      });

      // Limpar código
      await storage.updateUserVerificationCode(user.id, null as any, null as any);

      res.json({ message: "Email verificado com sucesso" });
    } catch (error) {
      console.error("Erro ao verificar email:", error);
      res.status(500).json({ message: "Erro ao verificar email" });
    }
  });

  // POST /api/auth/resend-signup-code - Reenviar código de verificação no signup
  app.post('/api/auth/resend-signup-code', async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Usuário não encontrado" });
      }

      // Gerar novo código
      const code = generateVerificationCode();
      const expiry = getVerificationCodeExpiry();
      await storage.updateUserVerificationCode(user.id, code, expiry);

      // Enviar email
      const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(to right, #9333ea, #22c55e); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      .code-box { background: white; border: 2px solid #9333ea; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
      .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #9333ea; font-family: monospace; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>VeloStock</h1></div>
      <div class="content">
        <p>Seu novo código de verificação:</p>
        <div class="code-box">
          <div class="code">${code}</div>
          <p>Válido por 15 minutos</p>
        </div>
      </div>
    </div>
  </body>
</html>
      `;

      await sendEmail({
        to: email,
        subject: 'VeloStock - Novo Código de Verificação',
        html: emailHtml,
      });

      res.json({ message: "Código reenviado com sucesso" });
    } catch (error) {
      console.error("Erro ao reenviar código:", error);
      res.status(500).json({ message: "Erro ao reenviar código" });
    }
  });

  // POST /api/auth/forgot-password - Enviar código de recuperação
  app.post('/api/auth/forgot-password', async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }

      console.log(`[ForgotPassword] Buscando usuário com email: ${email}`);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`[ForgotPassword] Email não encontrado: ${email}`);
        // Segurança: retorna sucesso mesmo se email não existe
        return res.json({ message: "Se o email existir, um código será enviado" });
      }

      console.log(`[ForgotPassword] Usuário encontrado: ${user.id}, gerando código...`);

      // Gerar código e expiração
      const code = generateVerificationCode();
      const expiry = getVerificationCodeExpiry();
      
      await storage.updateUserVerificationCode(user.id, code, expiry);
      console.log(`[ForgotPassword] Código salvo para usuário ${user.id}: ${code}`);

      // Enviar email
      const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(to right, #9333ea, #22c55e); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .header h1 { margin: 0; font-size: 28px; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      .code-box { background: white; border: 2px solid #9333ea; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
      .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #9333ea; font-family: monospace; }
      .expiry { color: #666; font-size: 14px; margin-top: 15px; }
      .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #999; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>VeloStock</h1>
        <p>Recuperação de Senha</p>
      </div>
      <div class="content">
        <p>Olá <strong>${user.firstName || 'usuário'}</strong>,</p>
        <p>Recebemos uma solicitação para redefinir sua senha. Use o código abaixo para continuar:</p>
        
        <div class="code-box">
          <div class="code">${code}</div>
          <div class="expiry">Este código expira em 15 minutos</div>
        </div>

        <p>Se você não solicitou essa recuperação, pode ignorar este email. Sua conta está segura.</p>
        
        <div class="footer">
          <p>&copy; 2024 VeloStock. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  </body>
</html>
      `;

      console.log(`[ForgotPassword] Enviando email para ${email}...`);
      const emailResult = await sendEmail({
        to: email,
        subject: 'VeloStock - Recuperação de Senha',
        html: emailHtml,
      });
      console.log(`[ForgotPassword] Email enviado com sucesso:`, emailResult);

      res.json({ message: "Código enviado para seu email" });
    } catch (error) {
      console.error("Erro ao enviar código:", error);
      res.status(500).json({ message: `Erro ao enviar código: ${error}` });
    }
  });

  // POST /api/auth/verify-reset-code - Verificar código
  app.post('/api/auth/verify-reset-code', async (req: any, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        return res.status(400).json({ message: "Email e código são obrigatórios" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      if (user.verificationCode !== code) {
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      if (!user.verificationCodeExpiry || new Date() > user.verificationCodeExpiry) {
        return res.status(400).json({ message: "Código expirado" });
      }

      // Código válido
      res.json({ message: "Código verificado com sucesso" });
    } catch (error) {
      console.error("Erro ao verificar código:", error);
      res.status(500).json({ message: "Erro ao verificar código" });
    }
  });

  // POST /api/auth/resend-reset-code - Reenviar código de reset de senha
  app.post('/api/auth/resend-reset-code', async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email é obrigatório" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Usuário não encontrado" });
      }

      // Gerar novo código
      const code = generateVerificationCode();
      const expiry = getVerificationCodeExpiry();
      await storage.updateUserVerificationCode(user.id, code, expiry);

      // Enviar email
      const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(to right, #9333ea, #22c55e); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      .code-box { background: white; border: 2px solid #9333ea; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
      .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #9333ea; font-family: monospace; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>VeloStock</h1><p>Recuperação de Senha</p></div>
      <div class="content">
        <p>Seu novo código de verificação:</p>
        <div class="code-box">
          <div class="code">${code}</div>
          <p>Válido por 15 minutos</p>
        </div>
      </div>
    </div>
  </body>
</html>
      `;

      await sendEmail({
        to: email,
        subject: 'VeloStock - Novo Código de Recuperação',
        html: emailHtml,
      });

      res.json({ message: "Código reenviado com sucesso" });
    } catch (error) {
      console.error("Erro ao reenviar código:", error);
      res.status(500).json({ message: "Erro ao reenviar código" });
    }
  });

  // POST /api/auth/reset-password - Redefinir senha
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({ message: "Email, código e nova senha são obrigatórios" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Email não encontrado" });
      }

      // Validar código
      if (user.verificationCode !== code) {
        return res.status(400).json({ message: "Código inválido" });
      }

      if (!user.verificationCodeExpiry || new Date() > user.verificationCodeExpiry) {
        return res.status(400).json({ message: "Código expirado" });
      }

      // Fazer hash da nova senha
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Atualizar usuário
      await storage.updateUser(user.id, {
        passwordHash,
      });

      // Limpar código de verificação
      await storage.updateUserVerificationCode(user.id, null as any, null as any);

      res.json({ message: "Senha redefinida com sucesso" });
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      res.status(500).json({ message: "Erro ao redefinir senha" });
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
        salePrice: req.body.salePrice != null && req.body.salePrice !== "" ? req.body.salePrice : null,
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

  // POST /api/vehicles/import - Importar veículos em massa via Excel/CSV
  app.post("/api/vehicles/import", isAuthenticated, upload.single("file"), async (req: any, res) => {
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
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      // Verificar tamanho do arquivo (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "Arquivo muito grande. Máximo 5MB" });
      }

      // Importar xlsx dinamicamente
      const XLSX = await import("xlsx");
      
      // Ler o arquivo
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (rawData.length === 0) {
        return res.status(400).json({ error: "Planilha vazia" });
      }

      if (rawData.length > 500) {
        return res.status(400).json({ error: "Máximo de 500 veículos por importação" });
      }

      // Mapeamento de colunas PT-BR para campos do sistema
      const columnMapping: Record<string, string> = {
        "Marca": "brand",
        "marca": "brand",
        "MARCA": "brand",
        "Modelo": "model",
        "modelo": "model",
        "MODELO": "model",
        "Ano": "year",
        "ano": "year",
        "ANO": "year",
        "Cor": "color",
        "cor": "color",
        "COR": "color",
        "Placa": "plate",
        "placa": "plate",
        "PLACA": "plate",
        "Tipo": "vehicleType",
        "tipo": "vehicleType",
        "TIPO": "vehicleType",
        "Status": "status",
        "status": "status",
        "STATUS": "status",
        "Preço Compra": "purchasePrice",
        "Preco Compra": "purchasePrice",
        "preco compra": "purchasePrice",
        "Preço de Compra": "purchasePrice",
        "Preço Venda": "salePrice",
        "Preco Venda": "salePrice",
        "preco venda": "salePrice",
        "Preço de Venda": "salePrice",
        "KM": "kmOdometer",
        "km": "kmOdometer",
        "Quilometragem": "kmOdometer",
        "quilometragem": "kmOdometer",
        "Combustível": "fuelType",
        "Combustivel": "fuelType",
        "combustivel": "fuelType",
        "Localização": "physicalLocation",
        "Localizacao": "physicalLocation",
        "localizacao": "physicalLocation",
        "Detalhes": "physicalLocationDetail",
        "detalhes": "physicalLocationDetail",
        "Detalhes Localização": "physicalLocationDetail",
        "Observações": "notes",
        "Observacoes": "notes",
        "observacoes": "notes",
        "Notas": "notes",
      };

      // Validar formato de placa (aceita com ou sem hífen)
      const plateRegex = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/i;

      // Status permitidos na importação
      const allowedStatuses = ["Entrada", "Em Reparos", "Em Higienização", "Pronto para Venda"];
      
      // Tipos de veículo permitidos
      const allowedTypes = ["Carro", "Moto"];

      // Combustíveis permitidos
      const allowedFuelTypes = ["Gasolina", "Etanol", "Flex", "Diesel", "Elétrico", "Híbrido", "GNV", ""];

      const currentYear = new Date().getFullYear();
      const results: { success: boolean; line: number; data?: any; error?: string }[] = [];
      const importedVehicles: any[] = [];
      const seenPlates = new Set<string>();

      // Buscar placas existentes no banco
      const existingVehicles = await storage.getAllVehicles(empresaId);
      const existingPlates = new Set(existingVehicles.map(v => v.plate.toUpperCase().replace("-", "")));

      // Processar cada linha
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        const lineNumber = i + 2; // +2 porque Excel começa em 1 e tem cabeçalho
        
        // Mapear colunas para campos
        const mappedRow: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          const mappedKey = columnMapping[key] || key;
          mappedRow[mappedKey] = value;
        }

        const errors: string[] = [];

        // Validar campos obrigatórios
        if (!mappedRow.brand || String(mappedRow.brand).trim() === "") {
          errors.push("Marca é obrigatória");
        }
        if (!mappedRow.model || String(mappedRow.model).trim() === "") {
          errors.push("Modelo é obrigatório");
        }
        if (!mappedRow.year) {
          errors.push("Ano é obrigatório");
        }
        if (!mappedRow.color || String(mappedRow.color).trim() === "") {
          errors.push("Cor é obrigatória");
        }
        if (!mappedRow.plate || String(mappedRow.plate).trim() === "") {
          errors.push("Placa é obrigatória");
        }

        // Validar formato da placa
        const plate = String(mappedRow.plate || "").toUpperCase().trim();
        if (plate && !plateRegex.test(plate)) {
          errors.push(`Formato de placa inválido: ${plate}`);
        }

        // Verificar duplicata de placa no arquivo
        const normalizedPlate = plate.replace("-", "");
        if (seenPlates.has(normalizedPlate)) {
          errors.push(`Placa ${plate} duplicada no arquivo`);
        }
        seenPlates.add(normalizedPlate);

        // Verificar duplicata de placa no banco
        if (existingPlates.has(normalizedPlate)) {
          errors.push(`Placa ${plate} já existe no sistema`);
        }

        // Validar ano
        const year = parseInt(String(mappedRow.year));
        if (isNaN(year) || year < 1900 || year > currentYear + 1) {
          errors.push(`Ano inválido: ${mappedRow.year} (deve estar entre 1900 e ${currentYear + 1})`);
        }

        // Validar tipo de veículo
        const vehicleType = String(mappedRow.vehicleType || "Carro").trim();
        if (vehicleType && !allowedTypes.includes(vehicleType)) {
          errors.push(`Tipo inválido: ${vehicleType} (use: ${allowedTypes.join(", ")})`);
        }

        // Validar status
        const status = String(mappedRow.status || "Entrada").trim();
        if (status && !allowedStatuses.includes(status)) {
          errors.push(`Status inválido: ${status} (use: ${allowedStatuses.join(", ")})`);
        }

        // Validar preços
        if (mappedRow.purchasePrice) {
          const price = parseFloat(String(mappedRow.purchasePrice).replace(/[^\d.,]/g, "").replace(",", "."));
          if (isNaN(price) || price < 0) {
            errors.push(`Preço de compra inválido: ${mappedRow.purchasePrice}`);
          }
        }
        if (mappedRow.salePrice) {
          const price = parseFloat(String(mappedRow.salePrice).replace(/[^\d.,]/g, "").replace(",", "."));
          if (isNaN(price) || price < 0) {
            errors.push(`Preço de venda inválido: ${mappedRow.salePrice}`);
          }
        }

        // Validar KM
        if (mappedRow.kmOdometer) {
          const km = parseInt(String(mappedRow.kmOdometer).replace(/\D/g, ""));
          if (isNaN(km) || km < 0) {
            errors.push(`Quilometragem inválida: ${mappedRow.kmOdometer}`);
          }
        }

        // Validar combustível
        const fuelType = String(mappedRow.fuelType || "").trim();
        if (fuelType && !allowedFuelTypes.includes(fuelType)) {
          errors.push(`Combustível inválido: ${fuelType}`);
        }

        if (errors.length > 0) {
          results.push({
            success: false,
            line: lineNumber,
            error: errors.join("; "),
          });
        } else {
          // Preparar dados para inserção
          const vehicleData = {
            empresaId,
            brand: String(mappedRow.brand).trim(),
            model: String(mappedRow.model).trim(),
            year: parseInt(String(mappedRow.year)),
            color: String(mappedRow.color).trim(),
            plate: plate.includes("-") ? plate : `${plate.slice(0, 3)}-${plate.slice(3)}`,
            vehicleType: vehicleType || "Carro",
            status: status || "Entrada",
            physicalLocation: mappedRow.physicalLocation ? String(mappedRow.physicalLocation).trim() : null,
            physicalLocationDetail: mappedRow.physicalLocationDetail ? String(mappedRow.physicalLocationDetail).trim() : null,
            purchasePrice: mappedRow.purchasePrice ? parseFloat(String(mappedRow.purchasePrice).replace(/[^\d.,]/g, "").replace(",", ".")) : null,
            salePrice: mappedRow.salePrice ? parseFloat(String(mappedRow.salePrice).replace(/[^\d.,]/g, "").replace(",", ".")) : null,
            kmOdometer: mappedRow.kmOdometer ? parseInt(String(mappedRow.kmOdometer).replace(/\D/g, "")) : null,
            fuelType: fuelType || null,
            notes: mappedRow.notes ? String(mappedRow.notes).trim() : null,
          };

          try {
            const vehicle = await storage.createVehicle(vehicleData as any);
            importedVehicles.push(vehicle);
            existingPlates.add(normalizedPlate); // Adicionar à lista para evitar duplicatas
            results.push({
              success: true,
              line: lineNumber,
              data: vehicle,
            });
          } catch (err: any) {
            if (err.code === '23505') {
              results.push({
                success: false,
                line: lineNumber,
                error: `Placa ${plate} já existe no sistema`,
              });
            } else {
              results.push({
                success: false,
                line: lineNumber,
                error: `Erro ao inserir: ${err.message}`,
              });
            }
          }
        }
      }

      // Emitir eventos WebSocket para veículos criados
      for (const vehicle of importedVehicles) {
        io.emit("vehicle:created", vehicle);
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      res.json({
        success: true,
        message: `${successCount} veículos importados com sucesso. ${errorCount} erros.`,
        imported: successCount,
        errors: errorCount,
        details: results,
      });
    } catch (error: any) {
      console.error("Erro ao importar veículos:", error);
      res.status(500).json({ error: `Erro ao processar arquivo: ${error.message}` });
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

      // Calcular margem média (lucro sobre venda dos carros vendidos)
      const soldVehicles = vehicles.filter(v => v.status === "Vendido");
      let margemLucro = 0;
      
      if (soldVehicles.length > 0) {
        let totalRevenue = 0;
        let totalCosts = 0;
        
        for (const vehicle of soldVehicles) {
          const salePrice = Number(vehicle.salePrice) || 0;
          const purchasePrice = Number(vehicle.purchasePrice) || 0;
          
          // Buscar custos do veículo
          const vehicleCosts = await storage.getVehicleCosts(vehicle.id);
          const operationalCosts = vehicleCosts.reduce((sum, cost) => sum + Number(cost.value), 0);
          
          totalRevenue += salePrice;
          totalCosts += purchasePrice + operationalCosts;
        }
        
        if (totalRevenue > 0) {
          const profit = totalRevenue - totalCosts;
          margemLucro = (profit / totalRevenue) * 100;
        }
      }

      res.json({
        totalVehicles,
        readyForSale,
        inProcess,
        avgTime: `${avgTime} dias`,
        avgCost: avgCostCurrentMonth >= 1000 
          ? `R$ ${(avgCostCurrentMonth / 1000).toFixed(1)}K`
          : `R$ ${avgCostCurrentMonth.toFixed(2)}`,
        resultados: {
          margemLucro: Math.max(margemLucro, 0), // Nunca retorna valor negativo em exibição
        }
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

  // GET /api/store-observations/:id - Buscar observação por ID (COM VALIDAÇÃO DE EMPRESA)
  app.get("/api/store-observations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      const observation = await storage.getStoreObservation(req.params.id);
      if (!observation) {
        return res.status(404).json({ error: "Observação não encontrada" });
      }
      
      // Validar que a observação pertence à empresa do usuário
      if (observation.empresaId !== userCompany.empresaId) {
        return res.status(403).json({ error: "Observação não pertence a esta empresa" });
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

  // PATCH /api/store-observations/:id - Atualizar observação (COM VALIDAÇÃO DE EMPRESA)
  app.patch("/api/store-observations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Verificar se a observação existe e pertence à empresa
      const existingObservation = await storage.getStoreObservation(req.params.id);
      if (!existingObservation) {
        return res.status(404).json({ error: "Observação não encontrada" });
      }
      
      if (existingObservation.empresaId !== userCompany.empresaId) {
        return res.status(403).json({ error: "Observação não pertence a esta empresa" });
      }

      const updates = insertStoreObservationSchema.partial().parse(req.body);
      const updatedObservation = await storage.updateStoreObservation(req.params.id, updates);
      
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

  // DELETE /api/store-observations/:id - Deletar observação (COM VALIDAÇÃO DE EMPRESA)
  app.delete("/api/store-observations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Verificar se a observação existe e pertence à empresa
      const existingObservation = await storage.getStoreObservation(req.params.id);
      if (!existingObservation) {
        return res.status(404).json({ error: "Observação não encontrada" });
      }
      
      if (existingObservation.empresaId !== userCompany.empresaId) {
        return res.status(403).json({ error: "Observação não pertence a esta empresa" });
      }

      await storage.deleteStoreObservation(req.params.id);
      
      io.emit("storeObservationDeleted", req.params.id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar observação:", error);
      res.status(500).json({ error: "Erro ao deletar observação" });
    }
  });

  // Company Settings endpoints
  
  // GET /api/company-settings - Buscar configurações da empresa (COM AUTENTICAÇÃO)
  app.get("/api/company-settings", isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings || {});
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      res.status(500).json({ error: "Erro ao buscar configurações" });
    }
  });

  // PATCH /api/company-settings - Atualizar configurações da empresa (COM AUTENTICAÇÃO E PERMISSÃO)
  app.patch("/api/company-settings", isAuthenticated, requireProprietario, async (req: any, res) => {
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
        localizacoes: ["Matriz", "Filial", "Pátio Externo", "Oficina"],
        prazoPreparacaoVeiculo: 7,
        prazoValidadeOrcamento: 30,
        prazoAlertaVeiculoParado: 7,
        notificacoesVeiculosParados: 1,
        notificacoesPrazos: 1,
        avisosCustosAltos: 1,
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

  // POST /api/settings/backup - Fazer backup dos dados
  app.post("/api/settings/backup", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }
      
      // Aqui você poderia implementar lógica de backup real
      // Por agora, apenas retornamos sucesso simulado
      console.log(`[BACKUP] Backup solicitado para empresa ${userCompany.empresaId}`);
      
      res.json({ 
        success: true, 
        message: "Backup realizado com sucesso",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Erro ao fazer backup:", error);
      res.status(500).json({ error: "Erro ao fazer backup" });
    }
  });

  // POST /api/settings/clean-old-data - Limpar dados antigos
  app.post("/api/settings/clean-old-data", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }
      
      // Aqui você poderia implementar lógica de limpeza real
      // Por agora, apenas retornamos sucesso simulado
      console.log(`[CLEAN] Limpeza de dados antigos solicitada para empresa ${userCompany.empresaId}`);
      
      res.json({ 
        success: true, 
        message: "Limpeza de dados antigos concluída com sucesso"
      });
    } catch (error) {
      console.error("Erro ao limpar dados:", error);
      res.status(500).json({ error: "Erro ao limpar dados antigos" });
    }
  });

  // POST /api/auth/change-password - Alterar senha do usuário
  // Rate limiting simples: máximo 5 tentativas por minuto por usuário
  const passwordChangeAttempts = new Map<string, { count: number; resetAt: number }>();
  
  app.post("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.claims?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      
      // Rate limiting check
      const now = Date.now();
      const attempts = passwordChangeAttempts.get(userId);
      if (attempts) {
        if (now < attempts.resetAt) {
          if (attempts.count >= 5) {
            const waitSeconds = Math.ceil((attempts.resetAt - now) / 1000);
            return res.status(429).json({ 
              error: `Muitas tentativas. Aguarde ${waitSeconds} segundos.` 
            });
          }
        } else {
          passwordChangeAttempts.delete(userId);
        }
      }
      
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
      }
      
      // Validações de força da senha
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "A nova senha deve ter pelo menos 8 caracteres" });
      }
      
      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos uma letra maiúscula" });
      }
      
      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos uma letra minúscula" });
      }
      
      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos um número" });
      }
      
      if (currentPassword === newPassword) {
        return res.status(400).json({ error: "A nova senha deve ser diferente da senha atual" });
      }
      
      const user = await storage.getUser(userId as string) as any;
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      // Verificar se o usuário tem senha definida (autenticação local)
      if (!user.passwordHash) {
        return res.status(400).json({ 
          error: "Este usuário usa autenticação externa. Não é possível alterar a senha aqui." 
        });
      }
      
      // Verificar senha atual
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        // Incrementar tentativas falhas
        const currentAttempts = passwordChangeAttempts.get(userId);
        if (currentAttempts && now < currentAttempts.resetAt) {
          currentAttempts.count++;
        } else {
          passwordChangeAttempts.set(userId, { count: 1, resetAt: now + 60000 }); // 1 minuto
        }
        return res.status(400).json({ error: "Senha atual incorreta" });
      }
      
      // Hash da nova senha com custo maior para mais segurança
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(userId as string, { passwordHash: hashedPassword });
      
      // SECURITY: Invalidar todas as outras sessões deste usuário
      // Isso previne que sessões antigas continuem ativas após mudança de senha
      await storage.invalidateUserSessions(userId as string);
      
      // Limpar tentativas após sucesso
      passwordChangeAttempts.delete(userId);
      
      console.log(`[SECURITY] Senha alterada com sucesso para usuário ${userId}`);
      
      res.json({ success: true, message: "Senha alterada com sucesso. Você será desconectado de outros dispositivos." });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  // ===== PROFILE ENDPOINTS =====

  // PATCH /api/profile - Atualizar perfil do usuário (nome, sobrenome)
  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.claims?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const { firstName, lastName } = req.body;
      
      const updates: any = {};
      if (firstName !== undefined) {
        if (firstName.length < 2) {
          return res.status(400).json({ error: "Nome deve ter pelo menos 2 caracteres" });
        }
        updates.firstName = firstName;
      }
      if (lastName !== undefined) {
        if (lastName.length < 2) {
          return res.status(400).json({ error: "Sobrenome deve ter pelo menos 2 caracteres" });
        }
        updates.lastName = lastName;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Nenhum dado para atualizar" });
      }

      const updatedUser = await storage.updateUser(userId, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      console.log(`[PROFILE] Perfil atualizado para usuário ${userId}`);
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        profileImageUrl: updatedUser.profileImageUrl,
      });
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  // PATCH /api/profile/email - Alterar email do usuário
  app.patch("/api/profile/email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.claims?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Email inválido" });
      }

      // Verificar se email já está em uso por outro usuário
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: "Este email já está em uso" });
      }

      const updatedUser = await storage.updateUser(userId, { email });
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      console.log(`[PROFILE] Email alterado para usuário ${userId}: ${email}`);
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        profileImageUrl: updatedUser.profileImageUrl,
      });
    } catch (error) {
      console.error("Erro ao alterar email:", error);
      res.status(500).json({ error: "Erro ao alterar email" });
    }
  });

  // PATCH /api/profile/password - Alterar senha via perfil
  // Reutiliza o mesmo rate limiting de alteração de senha
  app.patch("/api/profile/password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.claims?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // Rate limiting check (reutiliza o mesmo Map do change-password)
      const now = Date.now();
      const attempts = passwordChangeAttempts.get(userId);
      if (attempts) {
        if (now < attempts.resetAt) {
          if (attempts.count >= 5) {
            const waitSeconds = Math.ceil((attempts.resetAt - now) / 1000);
            return res.status(429).json({ 
              error: `Muitas tentativas. Aguarde ${waitSeconds} segundos.` 
            });
          }
        } else {
          passwordChangeAttempts.delete(userId);
        }
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
      }

      // Validações de força da senha
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "A nova senha deve ter pelo menos 8 caracteres" });
      }
      
      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos uma letra maiúscula" });
      }
      
      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos uma letra minúscula" });
      }
      
      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos um número" });
      }

      const user = await storage.getUser(userId) as any;
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      if (!user.passwordHash) {
        return res.status(400).json({ 
          error: "Este usuário usa autenticação externa. Não é possível alterar a senha aqui." 
        });
      }

      // Verificar senha atual
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        // Incrementar tentativas falhas
        const currentAttempts = passwordChangeAttempts.get(userId);
        if (currentAttempts && now < currentAttempts.resetAt) {
          currentAttempts.count++;
        } else {
          passwordChangeAttempts.set(userId, { count: 1, resetAt: now + 60000 }); // 1 minuto
        }
        return res.status(400).json({ error: "Senha atual incorreta" });
      }

      // Hash da nova senha com custo maior para mais segurança
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(userId, { passwordHash: hashedPassword });

      // SECURITY: Invalidar todas as outras sessões deste usuário
      await storage.invalidateUserSessions(userId);
      
      // Limpar tentativas após sucesso
      passwordChangeAttempts.delete(userId);

      console.log(`[SECURITY] Senha alterada via perfil para usuário ${userId}`);
      
      res.json({ success: true, message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  // Configurar multer para upload de foto de perfil
  const profilePhotoStorage = multer.memoryStorage();
  const profilePhotoUpload = multer({
    storage: profilePhotoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Apenas imagens são permitidas"));
      }
    },
  });

  // POST /api/profile/photo - Upload de foto de perfil
  app.post("/api/profile/photo", isAuthenticated, profilePhotoUpload.single("photo"), async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.claims?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem enviada" });
      }

      // Validar tipo de arquivo (já validado pelo multer, mas reforçamos)
      const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP." });
      }

      // Validar tamanho (máximo 2MB para fotos de perfil para evitar banco muito grande)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (req.file.size > maxSize) {
        return res.status(400).json({ error: "A imagem deve ter no máximo 2MB" });
      }

      // Converter para base64 para armazenar no banco
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      
      const updatedUser = await storage.updateUser(userId, { 
        profileImageUrl: base64Image 
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      console.log(`[PROFILE] Foto de perfil atualizada para usuário ${userId}`);
      
      res.json({
        id: updatedUser.id,
        profileImageUrl: updatedUser.profileImageUrl,
      });
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      res.status(500).json({ error: "Erro ao fazer upload da foto de perfil" });
    }
  });

  // DELETE /api/profile/photo - Remover foto de perfil
  app.delete("/api/profile/photo", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims?.sub || req.user.claims?.id;
      if (!userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      const updatedUser = await storage.updateUser(userId, { 
        profileImageUrl: null 
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      console.log(`[PROFILE] Foto de perfil removida para usuário ${userId}`);
      
      res.json({ success: true, message: "Foto removida com sucesso" });
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      res.status(500).json({ error: "Erro ao remover foto de perfil" });
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

  // ============================================
  // REMINDERS (Lembretes - Isolados por Usuário)
  // ============================================

  // GET /api/reminders - Listar lembretes globais do usuário (pessoais)
  app.get("/api/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Buscar APENAS os lembretes do usuário logado (sem vehicleId = globais)
      const userReminders = await storage.getUserReminders(userCompany.userId, userCompany.empresaId);
      const globalReminders = userReminders.filter((r: any) => !r.vehicleId || r.vehicleId === "");
      
      res.json(globalReminders);
    } catch (error) {
      console.error("Erro ao listar lembretes:", error);
      res.status(500).json({ error: "Erro ao listar lembretes" });
    }
  });

  // POST /api/reminders - Criar novo lembrete global (para todos os usuários)
  app.post("/api/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Validar dados do lembrete
      const validated = insertReminderSchema.parse({
        ...req.body,
        empresaId: userCompany.empresaId,
        vehicleId: "", // Lembrete global, não vinculado a veículo
        userId: userCompany.userId, // FORÇA o userId do usuário logado
      });

      const reminder = await storage.createReminder(validated as any);

      // Emitir notificação APENAS para este usuário específico
      io.to(`user:${userCompany.userId}`).emit("reminderCreated", reminder);
      
      res.status(201).json(reminder);
    } catch (error: any) {
      console.error("Erro ao criar lembrete:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar lembrete" });
    }
  });

  // PATCH /api/reminders/:reminderId - Atualizar lembrete global (APENAS se for o dono)
  app.patch("/api/reminders/:reminderId", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Buscar o lembrete
      const allReminders = await storage.getUserReminders(userCompany.userId, userCompany.empresaId);
      const reminder = allReminders.find((r: any) => r.id === req.params.reminderId);

      if (!reminder) {
        return res.status(404).json({ error: "Lembrete não encontrado" });
      }

      // GARANTIR que o usuário só pode editar seus próprios lembretes
      if (reminder.userId !== userCompany.userId) {
        return res.status(403).json({ error: "Você não tem permissão para editar este lembrete" });
      }

      // Atualizar o lembrete
      const updated = await storage.updateReminder(req.params.reminderId, req.body);

      // Emitir notificação APENAS para o dono do lembrete
      io.to(`user:${userCompany.userId}`).emit("reminderUpdated", updated);
      
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar lembrete:", error);
      res.status(500).json({ error: "Erro ao atualizar lembrete" });
    }
  });

  // DELETE /api/reminders/:reminderId - Deletar lembrete global (APENAS se for o dono)
  app.delete("/api/reminders/:reminderId", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Buscar o lembrete
      const allReminders = await storage.getUserReminders(userCompany.userId, userCompany.empresaId);
      const reminder = allReminders.find((r: any) => r.id === req.params.reminderId);

      if (!reminder) {
        return res.status(404).json({ error: "Lembrete não encontrado" });
      }

      // GARANTIR que o usuário só pode deletar seus próprios lembretes
      if (reminder.userId !== userCompany.userId) {
        return res.status(403).json({ error: "Você não tem permissão para deletar este lembrete" });
      }

      await storage.deleteReminder(req.params.reminderId);

      // Emitir notificação APENAS para o dono do lembrete
      io.to(`user:${userCompany.userId}`).emit("reminderDeleted", req.params.reminderId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar lembrete:", error);
      res.status(500).json({ error: "Erro ao deletar lembrete" });
    }
  });

  // GET /api/vehicles/:id/reminders - Listar lembretes do veículo (APENAS do usuário logado)
  app.get("/api/vehicles/:id/reminders", isAuthenticated, async (req: any, res) => {
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

      // Buscar APENAS os lembretes do usuário logado
      const reminders = await storage.getVehicleReminders(req.params.id);
      const userReminders = reminders.filter((r: any) => r.userId === userCompany.userId);
      
      res.json(userReminders);
    } catch (error) {
      console.error("Erro ao listar lembretes:", error);
      res.status(500).json({ error: "Erro ao listar lembretes" });
    }
  });

  // POST /api/vehicles/:id/reminders - Criar novo lembrete (APENAS para o usuário logado)
  app.post("/api/vehicles/:id/reminders", isAuthenticated, async (req: any, res) => {
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

      // Validar dados do lembrete
      const validated = insertReminderSchema.parse({
        ...req.body,
        empresaId: userCompany.empresaId,
        vehicleId: req.params.id,
        userId: userCompany.userId, // FORÇA o userId do usuário logado
      });

      const reminder = await storage.createReminder(validated as any);

      // Emitir notificação APENAS para este usuário específico
      io.to(`user:${userCompany.userId}`).emit("reminderCreated", reminder);
      
      res.status(201).json(reminder);
    } catch (error: any) {
      console.error("Erro ao criar lembrete:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Dados inválidos", details: error.errors });
      }
      res.status(500).json({ error: "Erro ao criar lembrete" });
    }
  });

  // PATCH /api/vehicles/:id/reminders/:reminderId - Atualizar lembrete (APENAS se for o dono)
  app.patch("/api/vehicles/:id/reminders/:reminderId", isAuthenticated, async (req: any, res) => {
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

      // Buscar o lembrete
      const allReminders = await storage.getVehicleReminders(req.params.id);
      const reminder = allReminders.find((r: any) => r.id === req.params.reminderId);

      if (!reminder) {
        return res.status(404).json({ error: "Lembrete não encontrado" });
      }

      // GARANTIR que o usuário só pode editar seus próprios lembretes
      if (reminder.userId !== userCompany.userId) {
        return res.status(403).json({ error: "Você não tem permissão para editar este lembrete" });
      }

      // Atualizar o lembrete
      const updated = await storage.updateReminder(req.params.reminderId, req.body);

      // Emitir notificação APENAS para o dono do lembrete
      io.to(`user:${userCompany.userId}`).emit("reminderUpdated", updated);
      
      res.json(updated);
    } catch (error) {
      console.error("Erro ao atualizar lembrete:", error);
      res.status(500).json({ error: "Erro ao atualizar lembrete" });
    }
  });

  // DELETE /api/vehicles/:id/reminders/:reminderId - Deletar lembrete (APENAS se for o dono)
  app.delete("/api/vehicles/:id/reminders/:reminderId", isAuthenticated, async (req: any, res) => {
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

      // Buscar o lembrete
      const allReminders = await storage.getVehicleReminders(req.params.id);
      const reminder = allReminders.find((r: any) => r.id === req.params.reminderId);

      if (!reminder) {
        return res.status(404).json({ error: "Lembrete não encontrado" });
      }

      // GARANTIR que o usuário só pode deletar seus próprios lembretes
      if (reminder.userId !== userCompany.userId) {
        return res.status(403).json({ error: "Você não tem permissão para deletar este lembrete" });
      }

      await storage.deleteReminder(req.params.reminderId);

      // Emitir notificação APENAS para o dono do lembrete
      io.to(`user:${userCompany.userId}`).emit("reminderDeleted", req.params.reminderId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Erro ao deletar lembrete:", error);
      res.status(500).json({ error: "Erro ao deletar lembrete" });
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
        customPermissions: user.customPermissions,
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
      const validRoles = ["proprietario", "gerente", "financeiro", "vendedor", "motorista"];
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

      const { firstName, lastName, role, isActive, comissaoFixa, usarComissaoFixaGlobal, customPermissions } = req.body;
      const updates: any = {};

      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (role !== undefined) {
        const validRoles = ["proprietario", "gerente", "financeiro", "vendedor", "motorista"];
        if (!validRoles.includes(role)) {
          return res.status(400).json({ error: "Papel inválido" });
        }
        updates.role = role;
      }
      if (isActive !== undefined) updates.isActive = isActive;
      if (customPermissions !== undefined) updates.customPermissions = customPermissions;
      
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

      // SECURITY: Se o usuário foi desativado, invalidar todas as sessões dele
      // Isso garante que ex-funcionários não continuem logados
      if (isActive === "false" && targetUser.isActive !== "false") {
        await storage.invalidateUserSessions(req.params.id);
        console.log(`[SECURITY] Usuário ${req.params.id} desativado - todas as sessões invalidadas`);
      }

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        customPermissions: updatedUser.customPermissions,
        comissaoFixa: updatedUser.comissaoFixa,
        usarComissaoFixaGlobal: updatedUser.usarComissaoFixaGlobal,
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // DELETE /api/users/:id - Remover usuário permanentemente (só Proprietário)
  app.delete("/api/users/:id", isAuthenticated, requireProprietario, async (req: any, res) => {
    try {
      const userCompany = await getUserWithCompany(req);
      if (!userCompany) {
        return res.status(403).json({ error: "Usuário não vinculado a uma empresa" });
      }

      // Buscar usuário a ser removido
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Verificar se usuário pertence à mesma empresa
      if (targetUser.empresaId !== userCompany.empresaId) {
        return res.status(403).json({ error: "Usuário não pertence a esta empresa" });
      }

      // Evitar que proprietário delete a si mesmo
      if (targetUser.id === userCompany.userId) {
        return res.status(400).json({ error: "Você não pode remover sua própria conta" });
      }

      // Evitar deletar outro proprietário
      if (targetUser.role === "proprietario") {
        return res.status(400).json({ error: "Não é possível remover outro proprietário" });
      }

      // SECURITY: Invalidar todas as sessões do usuário antes de deletar
      await storage.invalidateUserSessions(req.params.id);
      console.log(`[SECURITY] Usuário ${req.params.id} será deletado - sessões invalidadas`);

      // Deletar usuário do banco
      await db.delete(users).where(eq(users.id, req.params.id));

      res.json({ success: true, message: "Usuário removido com sucesso" });
    } catch (error) {
      console.error("Erro ao remover usuário:", error);
      res.status(500).json({ error: "Erro ao remover usuário" });
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
  // CONTAS A PAGAR E A RECEBER (Proprietário e Financeiro)
  // ============================================
  app.use("/api/bills", isAuthenticated, requireFinancialAccess, billsRoutes);

  // AI Routes
  registerAIRoutes(app);

  // Admin Routes
  registerAdminRoutes(app);

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
