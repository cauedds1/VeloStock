import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export type UserRole = "proprietario" | "gerente" | "vendedor" | "motorista";

/**
 * Middleware para verificar se o usuário tem o papel necessário
 * Uso: requireRole(['proprietario', 'gerente'])
 */
export function requireRole(allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verificar se está autenticado
      if (!req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = (req.user as any).claims?.id || (req.user as any).claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "Usuário inválido" });
      }

      // Buscar usuário e verificar papel
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Verificar se usuário está ativo
      if (user.isActive === "false") {
        return res.status(403).json({ error: "Usuário inativo" });
      }

      // Verificar se tem o papel necessário
      if (!user.role || !allowedRoles.includes(user.role as UserRole)) {
        return res.status(403).json({ 
          error: "Acesso negado. Você não tem permissão para acessar este recurso." 
        });
      }

      // Anexar role ao request para uso posterior
      (req as any).userRole = user.role;

      next();
    } catch (error) {
      console.error("Erro no middleware requireRole:", error);
      res.status(500).json({ error: "Erro ao verificar permissões" });
    }
  };
}

/**
 * Middleware para verificar se o usuário é proprietário
 */
export const requireProprietario = requireRole(["proprietario"]);

/**
 * Middleware para verificar se o usuário é proprietário ou gerente
 */
export const requireProprietarioOrGerente = requireRole(["proprietario", "gerente"]);

/**
 * Verifica permissões no código (não middleware)
 */
export function hasPermission(userRole: UserRole | null | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Permissões por recurso
 */
export const PERMISSIONS = {
  // Gestão de usuários
  manageUsers: ["proprietario"],
  
  // Configurações da empresa
  companySettings: ["proprietario"],
  
  // Métricas financeiras completas
  viewFinancialMetrics: ["proprietario", "gerente"],
  
  // Ver custos e margens
  viewCosts: ["proprietario", "gerente"],
  
  // Editar preços
  editPrices: ["proprietario", "gerente"],
  
  // Adicionar custos
  addCosts: ["proprietario", "gerente"],
  
  // Editar veículos
  editVehicles: ["proprietario", "gerente", "vendedor"],
  
  // Atualizar localização física
  updateLocation: ["proprietario", "gerente", "motorista", "vendedor"],
  
  // Upload de fotos
  uploadPhotos: ["proprietario", "gerente", "motorista", "vendedor"],
  
  // Ver veículos
  viewVehicles: ["proprietario", "gerente", "vendedor", "motorista"],
} as const;
