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
};

export const checklistCategories = {
  pneus: "PNEUS",
  interior: "INTERIOR / BANCOS",
  somEletrica: "SOM / ELÉTRICA",
  lataria: "LATARIA / PINTURA",
  documentacao: "DOCUMENTAÇÃO"
} as const;

export const checklistItems = {
  pneus: ["Pneus Dianteiros", "Pneus Traseiros"],
  interior: ["Limpeza", "Estado dos bancos", "Tapetes", "Porta-objetos"],
  somEletrica: ["Funcionamento do som", "Vidros elétricos", "Ar-condicionado", "Travas elétricas"],
  lataria: ["Arranhões", "Amassados", "Pintura desbotada"],
  documentacao: ["Documento do veículo", "IPVA", "Licenciamento"]
} as const;

export function normalizeChecklistData(rawChecklist: any): ChecklistData {
  const normalized: ChecklistData = {
    pneus: [],
    interior: [],
    somEletrica: [],
    lataria: [],
    documentacao: []
  };

  if (!rawChecklist) return normalized;

  for (const category of Object.keys(checklistCategories) as Array<keyof typeof checklistCategories>) {
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
export function getCategoryPresence(rawChecklist: any): Record<keyof ChecklistData, boolean> {
  const presence: Record<string, boolean> = {};
  
  // Se não é um objeto válido, todas as categorias são false
  if (!rawChecklist || typeof rawChecklist !== 'object' || Array.isArray(rawChecklist)) {
    for (const category of Object.keys(checklistCategories)) {
      presence[category] = false;
    }
    return presence as Record<keyof ChecklistData, boolean>;
  }

  for (const category of Object.keys(checklistCategories)) {
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

export function getChecklistStats(checklist: ChecklistData, rawChecklist: any) {
  let totalItems = 0;
  let checkedItems = 0;
  let attentionItems = 0;
  let pendingItems = 0;

  // Obter quais categorias foram explicitamente definidas no raw data
  const categoryPresence = getCategoryPresence(rawChecklist);

  // Contar itens de categorias que foram iniciadas (mesmo que vazias)
  for (const category of Object.keys(checklistCategories) as Array<keyof ChecklistData>) {
    // Só contar se a categoria foi definida no raw data
    if (categoryPresence[category]) {
      const expectedItems = checklistItems[category] || [];
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
export function hasChecklistStarted(rawChecklist: any): boolean {
  if (!rawChecklist || typeof rawChecklist !== 'object' || Array.isArray(rawChecklist)) {
    return false;
  }
  
  const presence = getCategoryPresence(rawChecklist);
  return Object.values(presence).some(v => v === true);
}
