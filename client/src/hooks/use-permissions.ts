import { useAuth } from "./useAuth";

export type UserRole = "proprietario" | "gerente" | "vendedor" | "motorista";

/**
 * Hook para verificar permissões do usuário
 */
export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;

  const isProprietario = role === "proprietario";
  const isGerente = role === "gerente";
  const isVendedor = role === "vendedor";
  const isMotorista = role === "motorista";

  // Funções de verificação de permissão
  const can = {
    // Gestão de usuários
    manageUsers: isProprietario,
    
    // Configurações da empresa
    companySettings: isProprietario,
    
    // Métricas financeiras completas
    viewFinancialMetrics: isProprietario || isGerente,
    
    // Ver custos e margens
    viewCosts: isProprietario || isGerente,
    
    // Editar preços
    editPrices: isProprietario || isGerente,
    
    // Adicionar custos
    addCosts: isProprietario || isGerente,
    
    // Editar veículos (TODOS podem editar)
    editVehicles: true,
    
    // Excluir veículos (APENAS Gerente e Proprietário)
    deleteVehicles: isProprietario || isGerente,
    
    // Atualizar localização física
    updateLocation: true, // Todos podem
    
    // Upload de fotos
    uploadPhotos: true, // Todos podem
    
    // Ver veículos
    viewVehicles: true, // Todos podem
    
    // Ver dashboard
    viewDashboard: isProprietario || isGerente || isVendedor,
  };

  return {
    role,
    isProprietario,
    isGerente,
    isVendedor,
    isMotorista,
    can,
  };
}

/**
 * Helper para exibir nomes amigáveis dos papéis
 */
export function getRoleName(role: UserRole | null | undefined): string {
  switch (role) {
    case "proprietario":
      return "Proprietário";
    case "gerente":
      return "Gerente";
    case "vendedor":
      return "Vendedor";
    case "motorista":
      return "Motorista";
    default:
      return "Usuário";
  }
}

/**
 * Helper para obter badge de cor por papel
 */
export function getRoleBadgeColor(role: UserRole | null | undefined): string {
  switch (role) {
    case "proprietario":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "gerente":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "vendedor":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "motorista":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}
