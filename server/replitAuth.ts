import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { setupLocalAuth } from "./localAuth";

const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL || "https://replit.com/oidc";
    const replId = process.env.REPL_ID;
    
    if (!replId) {
      console.error("[AUTH] REPL_ID not found in environment variables");
      throw new Error("REPL_ID is required for OAuth configuration");
    }
    
    try {
      return await client.discovery(
        new URL(issuerUrl),
        replId
      );
    } catch (error) {
      console.error("[AUTH] Failed to configure OIDC:", error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
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

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  
  // Only update refresh_token if a new one is provided
  // (subsequent OAuth refreshes may not return a new refresh_token)
  if (tokens.refresh_token) {
    user.refresh_token = tokens.refresh_token;
  }
  
  user.expires_at = user.claims?.exp;
  
  // Normalize claims: ensure 'id' field exists for consistency with local auth
  if (user.claims && !user.claims.id) {
    user.claims.id = user.claims.sub;
  }
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    authProvider: "google",
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup local authentication (email/password)
  setupLocalAuth();

  // Disable Google OAuth to avoid DNS/network issues during initialization
  // Only local email/password authentication is enabled
  const config = null;
  console.log("[AUTH] Google OAuth disabled. Using email/password authentication only.");

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to get valid domain from request
  const getValidDomain = (req: any): string => {
    // Lista de domínios inválidos que devem ser ignorados
    const invalidDomains = ["localhost", "hello", "hélio", "helium"];
    
    // 1. Try x-forwarded-host header (common in production/proxy environments)
    const forwardedHost = req.get("x-forwarded-host");
    if (forwardedHost && !invalidDomains.includes(forwardedHost)) {
      return forwardedHost;
    }
    
    // 2. Try host header
    const hostHeader = req.get("host");
    if (hostHeader && !invalidDomains.includes(hostHeader) && !hostHeader.includes("localhost:")) {
      return hostHeader.replace(/:\d+$/, ""); // Remove port if present
    }
    
    // 3. Try request hostname
    if (req.hostname && !invalidDomains.includes(req.hostname)) {
      return req.hostname;
    }
    
    // 4. Fallback to REPLIT_DOMAINS environment variable
    if (process.env.REPLIT_DOMAINS) {
      return process.env.REPLIT_DOMAINS;
    }
    
    // 5. Last resort fallback
    console.warn("[AUTH] Could not determine valid domain, using fallback");
    return "localhost:5000";
  };

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    if (!config) {
      throw new Error("OAuth configuration not available");
    }
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Local signup endpoint
  app.post("/api/auth/signup", (req, res, next) => {
    // Server-side validation
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
    
    passport.authenticate("local-signup", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao criar conta" });
      }
      if (!user) {
        return res.status(400).json({ message: info?.message || "Erro ao criar conta" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao fazer login" });
        }
        return res.status(201).json({ success: true });
      });
    })(req, res, next);
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

  // Google OAuth endpoint (only if config is available)
  app.get("/api/auth/google", (req, res, next) => {
    if (!config) {
      return res.status(503).json({ 
        message: "Autenticação com Google não está disponível no momento. Use email e senha." 
      });
    }
    const domain = getValidDomain(req);
    ensureStrategy(domain);
    passport.authenticate(`replitauth:${domain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    if (!config) {
      return res.redirect("/login?error=oauth_unavailable");
    }
    const domain = getValidDomain(req);
    ensureStrategy(domain);
    passport.authenticate(`replitauth:${domain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const domain = getValidDomain(req);
    req.logout(() => {
      if (config && process.env.REPL_ID) {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID,
            post_logout_redirect_uri: `${req.protocol}://${domain}`,
          }).href
        );
      } else {
        // Fallback to simple redirect if OAuth is not available
        res.redirect("/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Local auth doesn't have expires_at, so skip token refresh check
  if (!user.expires_at) {
    return next();
  }

  // OAuth token refresh logic
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
