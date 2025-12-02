export function isAdminAuthenticated(req: any, res: any, next: any) {
  if (!req.session?.adminId) {
    return res.status(401).json({ error: "Não autenticado como admin" });
  }
  next();
}

export function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.adminId) {
    return res.status(403).json({ error: "Acesso de admin necessário" });
  }
  next();
}
