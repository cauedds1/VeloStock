export type ChecklistItem = {
  item: string;
  observation?: string;
};

export type ChecklistData = {
  pneus: ChecklistItem[];
  interior: ChecklistItem[];
  somEletrica: ChecklistItem[];
  lataria: ChecklistItem[];
  documentacao: ChecklistItem[];
  equipamentos: ChecklistItem[];
};

export type VehicleType = "Carro" | "Moto";

// Categorias para CARROS
export const checklistCategoriesCarro = {
  pneus: "PNEUS",
  interior: "INTERIOR / BANCOS",
  somEletrica: "SOM / ELÉTRICA",
  lataria: "LATARIA / PINTURA",
  documentacao: "DOCUMENTAÇÃO",
  equipamentos: "EQUIPAMENTOS DE SEGURANÇA"
} as const;

export const checklistItemsCarro = {
  pneus: ["Pneus Dianteiros", "Pneus Traseiros"],
  interior: ["Limpeza", "Estado dos bancos", "Tapetes", "Porta-objetos"],
  somEletrica: ["Funcionamento do som", "Vidros elétricos", "Ar-condicionado", "Travas elétricas"],
  lataria: ["Arranhões", "Amassados", "Pintura desbotada", "Faróis/Lanternas"],
  documentacao: ["Documento do veículo", "IPVA", "Licenciamento"],
  equipamentos: ["Macaco", "Chave de Roda", "Triângulo"]
} as const;

// Categorias para MOTOS
export const checklistCategoriesMoto = {
  pneus: "PNEUS",
  interior: "BANCO / ESTOFAMENTO",
  somEletrica: "SISTEMA ELÉTRICO",
  lataria: "CARENAGENS / PINTURA",
  documentacao: "DOCUMENTAÇÃO",
  equipamentos: "EQUIPAMENTOS DE SEGURANÇA"
} as const;

export const checklistItemsMoto = {
  pneus: ["Pneu Dianteiro", "Pneu Traseiro", "Calibragem"],
  interior: ["Limpeza", "Estado do banco", "Apoio para passageiro"],
  somEletrica: ["Faróis", "Lanterna", "Setas", "Bateria", "Painel"],
  lataria: ["Carenagens", "Tanque", "Arranhões", "Amassados", "Pintura"],
  documentacao: ["Documento do veículo", "IPVA", "Licenciamento"],
  equipamentos: ["Macaco", "Chave de Roda", "Triângulo"]
} as const;

// Função helper para obter categorias baseado no tipo
export function getChecklistCategories(vehicleType: VehicleType = "Carro") {
  return vehicleType === "Moto" ? checklistCategoriesMoto : checklistCategoriesCarro;
}

// Função helper para obter itens baseado no tipo
export function getChecklistItems(vehicleType: VehicleType = "Carro") {
  return vehicleType === "Moto" ? checklistItemsMoto : checklistItemsCarro;
}

// Mantém para compatibilidade (usa padrão de carro)
export const checklistCategories = checklistCategoriesCarro;
export const checklistItems = checklistItemsCarro;

export function normalizeChecklistData(rawChecklist: any, vehicleType: VehicleType = "Carro"): ChecklistData {
  const normalized: ChecklistData = {
    pneus: [],
    interior: [],
    somEletrica: [],
    lataria: [],
    documentacao: [],
    equipamentos: []
  };

  if (!rawChecklist) return normalized;

  const categories = getChecklistCategories(vehicleType);

  for (const category of Object.keys(categories) as Array<keyof typeof categories>) {
    const categoryData = rawChecklist[category];
    
    // Só processar se a categoria foi definida no raw data (não undefined/null)
    if (categoryData !== undefined && categoryData !== null) {
      if (Array.isArray(categoryData)) {
        normalized[category] = categoryData
          .filter(item => item !== null && item !== undefined)
          .map(item => {
            if (typeof item === 'string') {
              return { item };
            }
            if (typeof item === 'object' && item.item) {
              return {
                item: item.item,
                observation: item.observation || undefined
              };
            }
            return null;
          })
          .filter((item): item is ChecklistItem => item !== null);
      } else {
        // Se não é array mas foi definido, tratar como array vazio iniciado
        normalized[category] = [];
      }
    }
  }

  return normalized;
}

// Helper para verificar se uma categoria foi explicitamente definida no raw data
export function getCategoryPresence(rawChecklist: any, vehicleType: VehicleType = "Carro"): Record<keyof ChecklistData, boolean> {
  const presence: Record<string, boolean> = {};
  const categories = getChecklistCategories(vehicleType);
  
  // Se não é um objeto válido, todas as categorias são false
  if (!rawChecklist || typeof rawChecklist !== 'object' || Array.isArray(rawChecklist)) {
    for (const category of Object.keys(categories)) {
      presence[category] = false;
    }
    return presence as Record<keyof ChecklistData, boolean>;
  }

  for (const category of Object.keys(categories)) {
    presence[category] = rawChecklist.hasOwnProperty(category) && 
                         rawChecklist[category] !== undefined && 
                         rawChecklist[category] !== null;
  }

  return presence as Record<keyof ChecklistData, boolean>;
}

export function getChecklistItemStatus(
  category: keyof ChecklistData,
  itemName: string,
  checklist: ChecklistData
): 'checked' | 'attention' | 'pending' {
  const categoryItems = checklist[category] || [];
  const foundItem = categoryItems.find(ci => ci.item === itemName);
  
  if (!foundItem) return 'pending';
  if (foundItem.observation && foundItem.observation.trim().length > 0) return 'attention';
  return 'checked';
}

export function getChecklistStats(checklist: ChecklistData, rawChecklist: any, vehicleType: VehicleType = "Carro") {
  let totalItems = 0;
  let checkedItems = 0;
  let attentionItems = 0;
  let pendingItems = 0;

  // Obter quais categorias foram explicitamente definidas no raw data
  const categoryPresence = getCategoryPresence(rawChecklist, vehicleType);
  
  // Usar os itens corretos baseado no tipo de veículo
  const items = getChecklistItems(vehicleType);
  const categories = getChecklistCategories(vehicleType);

  // Contar itens de categorias que foram iniciadas (mesmo que vazias)
  for (const category of Object.keys(categories) as Array<keyof ChecklistData>) {
    // Só contar se a categoria foi definida no raw data
    if (categoryPresence[category]) {
      const expectedItems = items[category] || [];
      totalItems += expectedItems.length;

      for (const itemName of expectedItems) {
        const status = getChecklistItemStatus(category, itemName, checklist);
        if (status === 'checked') checkedItems++;
        else if (status === 'attention') attentionItems++;
        else pendingItems++;
      }
    }
  }

  return {
    totalItems,
    checkedItems,
    attentionItems,
    pendingItems,
    completionPercentage: totalItems > 0 ? Math.round(((checkedItems + attentionItems) / totalItems) * 100) : 0
  };
}

// Helper para verificar se um veículo tem checklist iniciado
export function hasChecklistStarted(rawChecklist: any, vehicleType: VehicleType = "Carro"): boolean {
  if (!rawChecklist || typeof rawChecklist !== 'object' || Array.isArray(rawChecklist)) {
    return false;
  }
  
  // Verificar se há PELO MENOS UM ITEM marcado (não apenas categorias vazias)
  const categories = getChecklistCategories(vehicleType);
  
  for (const category of Object.keys(categories)) {
    const categoryData = rawChecklist[category];
    
    // Se a categoria existe e é um array
    if (Array.isArray(categoryData)) {
      // Verificar se tem pelo menos um item marcado
      const hasItems = categoryData.some((item: any) => {
        // Item pode ser string (formato legado) ou objeto
        if (typeof item === 'string') return true;
        if (typeof item === 'object' && item !== null && item.item) return true;
        return false;
      });
      
      if (hasItems) return true;
    }
  }
  
  return false;
}
