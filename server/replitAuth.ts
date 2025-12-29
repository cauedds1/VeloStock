// OpenID imports DISABLED to prevent DNS lookups in production
// import * as client from "openid-client";
// import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { setupLocalAuth } from "./localAuth";
import { getDatabaseUrl } from "./config/database";
import { generateVerificationCode, getVerificationCodeExpiry } from "./utils/verificationCode";
import { sendEmail } from "./utils/replitmail";

// OAuth COMPLETELY DISABLED - No OIDC config to prevent DNS lookups
// const getOidcConfig = ... (removed to prevent helium DNS lookup)

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: getDatabaseUrl(),
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Only use secure cookies in production (HTTPS)
  const isProduction = process.env.NODE_ENV === "production";
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: sessionTtl,
    },
  });
}

// OAuth helper functions DISABLED
// function updateUserSession(...) { ... }
// async function upsertUser(...) { ... }

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup local authentication (email/password)
  setupLocalAuth();

  // Google OAuth COMPLETELY DISABLED - all OAuth code removed to prevent DNS lookups
  console.log("[AUTH] Google OAuth disabled. Using email/password authentication only.");

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Local signup - Create account (email verification DISABLED temporarily)
  app.post("/api/auth/signup-step1", async (req, res, next) => {
    // SECURITY: Permite criação de conta apenas se não houver usuários cadastrados (primeiro admin)
    // ou se houver um segredo de convite válido no corpo da requisição
    const { email, password, firstName, lastName, inviteCode } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    try {
      const hasUsers = (await db.select({ count: sql<number>`count(*)` }).from(users))[0].count > 0;
      
      const MASTER_INVITE_CODE = process.env.ADMIN_INVITE_CODE || "velostock-admin-2024";

      if (hasUsers && inviteCode !== MASTER_INVITE_CODE) {
        console.log(`[SECURITY] Tentativa de signup negada para ${email} - Sem código de convite válido`);
        return res.status(403).json({ 
          message: "O cadastro público está desativado. Use um código de convite ou entre em contato com o administrador." 
        });
      }
    } catch (err) {
      console.error("[Signup Security Check] Error:", err);
      return res.status(500).json({ message: "Erro interno de segurança" });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
    }

    try {
      // Checar se email já existe
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      // Criar usuário diretamente (verificação de email DESATIVADA)
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await storage.createLocalUser({
        email,
        firstName,
        lastName,
        passwordHash,
        authProvider: "local",
      });

      // Marcar email como verificado automaticamente
      await storage.verifyUserEmail(newUser.id);

      console.log(`[Signup] Conta criada com sucesso para ${email} (verificação de email desativada)`);

      // Retornar sucesso - usuário pode fazer login imediatamente
      return res.status(201).json({ 
        success: true, 
        message: "Conta criada com sucesso! Você já pode fazer login.",
        email: email,
        skipVerification: true
      });
    } catch (error: any) {
      console.error("[Signup] Erro no signup:", error);
      return res.status(500).json({ message: "Erro ao criar conta", details: error?.message });
    }
  });

  // SECURITY: Rate limiting para login - máximo 5 tentativas por 15 minutos por IP
  const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
  const MAX_LOGIN_ATTEMPTS = 5;
  const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos
  
  // Limpar tentativas antigas periodicamente (a cada hora)
  setInterval(() => {
    const now = Date.now();
    const entries = Array.from(loginAttempts.entries());
    for (const [ip, data] of entries) {
      if (now > data.blockedUntil + BLOCK_DURATION) {
        loginAttempts.delete(ip);
      }
    }
  }, 60 * 60 * 1000);

  // Local login endpoint
  app.post("/api/auth/login", (req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    const { email, password } = req.body;
    
    // SECURITY: Verificar rate limit
    const attempts = loginAttempts.get(clientIp);
    const now = Date.now();
    
    if (attempts) {
      if (now < attempts.blockedUntil) {
        const waitMinutes = Math.ceil((attempts.blockedUntil - now) / 60000);
        console.log(`[SECURITY] IP ${clientIp} bloqueado por ${waitMinutes} min (tentativas: ${attempts.count})`);
        return res.status(429).json({ 
          message: `Muitas tentativas de login. Aguarde ${waitMinutes} minuto(s) antes de tentar novamente.` 
        });
      }
      // Reset se o bloqueio expirou
      if (now >= attempts.blockedUntil) {
        loginAttempts.delete(clientIp);
      }
    }
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }
    
    passport.authenticate("local-login", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer login" });
      }
      if (!user) {
        // SECURITY: Registrar tentativa falha
        const currentAttempts = loginAttempts.get(clientIp) || { count: 0, blockedUntil: 0 };
        currentAttempts.count++;
        
        if (currentAttempts.count >= MAX_LOGIN_ATTEMPTS) {
          currentAttempts.blockedUntil = now + BLOCK_DURATION;
          console.log(`[SECURITY] IP ${clientIp} BLOQUEADO após ${currentAttempts.count} tentativas falhas de login para: ${email}`);
        } else {
          console.log(`[SECURITY] Tentativa de login falha #${currentAttempts.count} de IP ${clientIp} para: ${email}`);
        }
        
        loginAttempts.set(clientIp, currentAttempts);
        return res.status(401).json({ message: info?.message || "Email ou senha incorretos" });
      }
      
      // Login bem sucedido - limpar tentativas
      loginAttempts.delete(clientIp);
      
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao fazer login" });
        }
        console.log(`[SECURITY] Login bem sucedido: ${email} de IP ${clientIp}`);
        return res.json({ success: true });
      });
    })(req, res, next);
  });

  // Google OAuth DISABLED - all routes removed
  app.get("/api/auth/google", (req, res) => {
    return res.status(503).json({ 
      message: "Autenticação com Google não está disponível. Use email e senha." 
    });
  });

  app.get("/api/callback", (req, res) => {
    return res.redirect("/login?error=oauth_disabled");
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // OAuth token refresh DISABLED - only local auth supported
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // SECURITY: Verificar se usuário ainda está ativo no banco
  // Isso previne que ex-funcionários desativados continuem acessando o sistema
  const userId = (req.user as any).claims?.id || (req.user as any).claims?.sub;
  if (userId) {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        // Usuário foi deletado - forçar logout
        req.logout(() => {});
        return res.status(401).json({ message: "Sessão inválida. Faça login novamente." });
      }
      if (user.isActive === "false") {
        // Usuário foi desativado - forçar logout
        req.logout(() => {});
        return res.status(403).json({ message: "Sua conta foi desativada. Entre em contato com o administrador." });
      }
    } catch (error) {
      console.error("[SECURITY] Erro ao verificar status do usuário:", error);
      // Em caso de erro, permite continuar para não bloquear toda a aplicação
    }
  }
  
  return next();
};
