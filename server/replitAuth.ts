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
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
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
    } catch (error) {
      console.error("[Signup] Erro no signup:", error);
      return res.status(500).json({ message: "Erro ao criar conta" });
    }
  });

  // Local login endpoint
  app.post("/api/auth/login", (req, res, next) => {
    // Server-side validation
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }
    
    passport.authenticate("local-login", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer login" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Email ou senha incorretos" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao fazer login" });
        }
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
  
  // Local auth only - no token refresh needed
  return next();
};
