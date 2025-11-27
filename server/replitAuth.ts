// OpenID imports DISABLED to prevent DNS lookups in production
// import * as client from "openid-client";
// import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
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

  // Local signup step 1 - Create account and send verification email
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

      // Gerar código antes de enviar
      const code = generateVerificationCode();
      const expiry = getVerificationCodeExpiry();

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
        <p>Verificação de Email</p>
      </div>
      <div class="content">
        <p>Olá <strong>${firstName}</strong>,</p>
        <p>Bem-vindo ao VeloStock! Use o código abaixo para verificar seu email e ativar sua conta:</p>
        
        <div class="code-box">
          <div class="code">${code}</div>
          <div class="expiry">Este código expira em 15 minutos</div>
        </div>

        <p>Se você não criou esta conta, pode ignorar este email. Sua conta está segura.</p>
        
        <div class="footer">
          <p>&copy; 2024 VeloStock. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  </body>
</html>
      `;

      // ENVIAR EMAIL PRIMEIRO
      console.log(`[Signup] Código gerado para ${email}: ${code}`);
      console.log(`[Signup] Enviando email de verificação para ${email}...`);
      
      await sendEmail({
        to: email,
        subject: 'VeloStock - Verificação de Email',
        html: emailHtml,
      });

      console.log(`[Signup] Email enviado com sucesso para ${email}`);

      // SÓ depois de enviar com sucesso, criar o usuário
      const passwordHash = await require('bcrypt').hash(password, 10);
      const newUser = await storage.createLocalUser({
        email,
        firstName,
        lastName,
        passwordHash,
        authProvider: "local",
      });

      // Salvar código no usuário
      await storage.updateUserVerificationCode(newUser.id, code, expiry);

      // User created, but not logged in yet - will verify email first
      return res.status(201).json({ 
        success: true, 
        message: "Conta criada. Verifique seu email para ativar a conta.",
        email: email
      });
    } catch (error) {
      console.error("[Signup] Erro no signup:", error);
      return res.status(500).json({ message: "Erro ao enviar email de verificação" });
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
