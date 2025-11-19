import type { Request, Response, NextFunction } from "express";

import { storage } from "../storage";

/**
 * Middleware centralizado que extrai userId, empresaId e role do usuário autenticado
 * CRITICAL: Busca SEMPRE do banco de dados, NUNCA confia no JWT
 * Rejeita requisições se o usuário não estiver vinculado a uma empresa
 */
export async function requireCompanyUser(req: any, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.claims?.id || req.user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    // CRITICAL: Buscar usuário completo DO BANCO (não confiar no JWT)
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    if (!user.empresaId) {
      return res.status(403).json({ error: "Usuário não está vinculado a uma empresa" });
    }
    
    // Verificar se usuário está ativo
    if (user.isActive === "false") {
      return res.status(403).json({ error: "Usuário inativo" });
    }
    
    // CRITICAL: Adiciona informações DO BANCO ao request (não do JWT)
    req.companyUser = {
      userId,
      empresaId: user.empresaId, // Do banco, não do JWT
      role: user.role || "vendedor", // Do banco, não do JWT
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
    
    next();
  } catch (error) {
    console.error("Erro no middleware requireCompanyUser:", error);
    res.status(500).json({ error: "Erro ao validar usuário" });
  }
}

/**
 * Helper para verificar se uma entidade pertence à mesma empresa
 */
export function assertSameCompany(entityEmpresaId: string, userEmpresaId: string) {
  if (entityEmpresaId !== userEmpresaId) {
    throw new Error("FORBIDDEN: Entidade não pertence à sua empresa");
  }
}

/**
 * Helper para verificar se o usuário é dono/criador da entidade
 */
export function assertOwnership(entityUserId: string, userId: string) {
  if (entityUserId !== userId) {
    throw new Error("FORBIDDEN: Você não tem permissão para acessar esta entidade");
  }
}

/**
 * Verifica se o usuário pode acessar dados de outro usuário
 * Regras:
 * - Proprietário: pode ver tudo da empresa
 * - Gerente: pode ver tudo da empresa
 * - Vendedor/Motorista: só pode ver seus próprios dados
 */
export function canAccessUserData(
  requesterRole: string, 
  requesterUserId: string, 
  targetUserId: string
): boolean {
  // Proprietário e Gerente podem ver dados de qualquer usuário da empresa
  if (requesterRole === "proprietario" || requesterRole === "gerente") {
    return true;
  }
  
  // Vendedores e Motoristas só podem ver seus próprios dados
  return requesterUserId === targetUserId;
}

/**
 * Middleware que restringe acesso apenas ao próprio usuário
 * (a menos que seja Proprietário ou Gerente)
 */
export function requireOwnDataOrManager(req: any, res: Response, next: NextFunction) {
  const { role, userId } = req.companyUser;
  const targetUserId = req.params.userId || req.query.userId || req.body.userId;
  
  if (!canAccessUserData(role, userId, targetUserId)) {
    return res.status(403).json({ 
      error: "Você só pode acessar seus próprios dados" 
    });
  }
  
  next();
}
