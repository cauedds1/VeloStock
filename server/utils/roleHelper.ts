/**
 * Normaliza role removendo acentos e convertendo para minúsculas
 * Garante que comparações de role funcionem corretamente
 */
export function normalizeRole(role: string | undefined | null): string {
  if (!role) return "vendedor";
  return role
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacríticos
}

/**
 * Verifica se um usuário tem um role específico
 */
export function hasRole(role: string | undefined | null, ...requiredRoles: string[]): boolean {
  const normalized = normalizeRole(role);
  return requiredRoles.some(r => normalizeRole(r) === normalized);
}
