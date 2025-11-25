import { useQuery, useMutation } from "@tanstack/react-query";

export interface FipeBrand {
  codigo: string;
  nome: string;
}

export interface FipeModel {
  codigo: number;
  nome: string;
}

export interface FipeYear {
  codigo: string;
  nome: string;
}

export interface FipePrice {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
  MesReferencia: string;
  TipoVeiculo: number;
  SiglaCombustivel: string;
}

// Buscar marcas
export function useFipeBrands(vehicleType: string = "carros") {
  return useQuery<FipeBrand[]>({
    queryKey: ["/api/fipe/brands", vehicleType],
    queryFn: async () => {
      const response = await fetch(`/api/fipe/brands?type=${encodeURIComponent(vehicleType)}`);
      if (!response.ok) throw new Error("Erro ao buscar marcas FIPE");
      return response.json();
    },
  });
}

// Buscar modelos por marca
export function useFipeModels(brandId: string | null, vehicleType: string = "carros") {
  return useQuery<{ modelos: FipeModel[] }>({
    queryKey: ["/api/fipe/brands", brandId, "models", vehicleType],
    queryFn: async () => {
      if (!brandId) throw new Error("Brand ID não fornecido");
      const response = await fetch(`/api/fipe/brands/${brandId}/models?type=${encodeURIComponent(vehicleType)}`);
      if (!response.ok) throw new Error("Erro ao buscar modelos FIPE");
      return response.json();
    },
    enabled: !!brandId,
  });
}

// Buscar anos por modelo
export function useFipeYears(brandId: string | null, modelId: string | null, vehicleType: string = "carros") {
  return useQuery<FipeYear[]>({
    queryKey: ["/api/fipe/brands", brandId, "models", modelId, "years", vehicleType],
    queryFn: async () => {
      if (!brandId || !modelId) throw new Error("Brand ID ou Model ID não fornecido");
      const response = await fetch(`/api/fipe/brands/${brandId}/models/${modelId}/years?type=${encodeURIComponent(vehicleType)}`);
      if (!response.ok) throw new Error("Erro ao buscar anos FIPE");
      return response.json();
    },
    enabled: !!brandId && !!modelId,
  });
}

// Buscar preço
export function useFipePrice(
  brandId: string | null,
  modelId: string | null,
  year: string | null,
  vehicleType: string = "carros"
) {
  return useQuery<FipePrice>({
    queryKey: ["/api/fipe/brands", brandId, "models", modelId, "years", year, "price", vehicleType],
    queryFn: async () => {
      if (!brandId || !modelId || !year) {
        throw new Error("Parâmetros incompletos para consulta FIPE");
      }
      const response = await fetch(
        `/api/fipe/brands/${brandId}/models/${modelId}/years/${year}/price?type=${encodeURIComponent(vehicleType)}`
      );
      if (!response.ok) throw new Error("Erro ao consultar preço FIPE");
      return response.json();
    },
    enabled: !!brandId && !!modelId && !!year,
  });
}

// Utilitário para normalizar strings (remover acentos e case-insensitive)
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacríticos/acentos
}

// Aliases comuns de marcas (bidirecional: tanto a chave quanto os valores podem ser buscados)
const BRAND_ALIASES: Record<string, string[]> = {
  "chevrolet": ["gm", "chevy", "general motors"],
  "volkswagen": ["vw", "volks"],
  "mercedes-benz": ["mercedes", "benz"],
  "land rover": ["landrover"],
  "gm": ["chevrolet", "chevy", "general motors"],
  "vw": ["volkswagen", "volks"],
  "mercedes": ["mercedes-benz", "benz"],
};

// Interface para versão FIPE completa (modelo + ano + combustível)
export interface FipeVersion {
  label: string;          // Ex: "Fiesta 1.5 16V Flex Mec. 5p 2017 Gasolina"
  modelId: number;        // Código do modelo FIPE
  modelName: string;      // Nome completo do modelo
  yearCode: string;       // Código do ano (usado para buscar preço)
  yearLabel: string;      // Ex: "2017 Gasolina" ou "32000-1" 
}

// Hook para buscar TODAS as VERSÕES disponíveis baseado em marca/modelo/ano (texto)
// Retorna lista completa de versões para o usuário selecionar a correta
export function useFipeVehicleVersions(brand?: string, model?: string, year?: number, vehicleType: string = "carros") {
  return useMutation({
    mutationFn: async () => {
      if (!brand || !model || !year) {
        throw new Error("Marca, modelo ou ano não fornecidos");
      }

      // 1. Buscar marcas
      const brandsResponse = await fetch(`/api/fipe/brands?type=${encodeURIComponent(vehicleType)}`);
      if (!brandsResponse.ok) throw new Error("Erro ao buscar marcas");
      const brands: FipeBrand[] = await brandsResponse.json();

      // 2. Encontrar marca correspondente (fuzzy match com aliases e normalização)
      const normalizedBrand = normalizeString(brand);
      
      const matchedBrand = brands.find((b) => {
        const normalizedBrandName = normalizeString(b.nome);
        
        // Match direto (bidirecional)
        if (normalizedBrandName.includes(normalizedBrand) || normalizedBrand.includes(normalizedBrandName)) {
          return true;
        }
        
        // Match por aliases: verificar se input ou FIPE brand contém qualquer alias do mesmo grupo
        for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
          const allVariants = [canonical, ...aliases];
          
          // Verificar se o input do usuário corresponde a algum variant
          const inputMatchesGroup = allVariants.some(v => normalizedBrand.includes(v) || v.includes(normalizedBrand));
          
          // Verificar se a marca FIPE corresponde a algum variant do mesmo grupo
          const fipeMatchesGroup = allVariants.some(v => normalizedBrandName.includes(v) || v.includes(normalizedBrandName));
          
          // Se ambos pertencem ao mesmo grupo de aliases, é um match!
          if (inputMatchesGroup && fipeMatchesGroup) {
            return true;
          }
        }
        
        return false;
      });

      if (!matchedBrand) {
        throw new Error(`Marca "${brand}" não encontrada na tabela FIPE`);
      }

      // 3. Buscar modelos da marca
      const modelsResponse = await fetch(`/api/fipe/brands/${matchedBrand.codigo}/models?type=${encodeURIComponent(vehicleType)}`);
      if (!modelsResponse.ok) throw new Error("Erro ao buscar modelos");
      const modelsData: { modelos: FipeModel[] } = await modelsResponse.json();

      // 4. Encontrar TODOS os modelos correspondentes (não apenas 1)
      const normalizedModel = normalizeString(model);
      
      const candidateModels = modelsData.modelos.filter((m) => {
        const normalizedModelName = normalizeString(m.nome);
        
        // Match exato
        if (normalizedModelName === normalizedModel) return true;
        
        // Match por palavra completa (evita "polo" casar com "apolo")
        const words = normalizedModelName.split(/\s+/);
        if (words.some(word => word === normalizedModel)) return true;
        
        // Match no início
        if (normalizedModelName.startsWith(normalizedModel)) return true;
        
        return false;
      });

      if (candidateModels.length === 0) {
        throw new Error(`Modelo "${model}" não encontrado para a marca ${matchedBrand.nome}`);
      }

      // 5. Para cada modelo candidato, buscar anos disponíveis e filtrar pelo ano desejado
      const allVersions: FipeVersion[] = [];
      
      for (const candidateModel of candidateModels) {
        try {
          // Buscar anos disponíveis para este modelo
          const yearsResponse = await fetch(
            `/api/fipe/brands/${matchedBrand.codigo}/models/${candidateModel.codigo}/years?type=${encodeURIComponent(vehicleType)}`
          );
          
          if (!yearsResponse.ok) continue; // Skip se falhar
          
          const years: FipeYear[] = await yearsResponse.json();
          
          // Filtrar apenas os anos que correspondem ao ano desejado
          const matchingYears = years.filter(y => y.nome.includes(year.toString()));
          
          // Adicionar cada combinação modelo+ano como uma versão
          for (const yearData of matchingYears) {
            allVersions.push({
              label: `${candidateModel.nome} ${yearData.nome}`,
              modelId: candidateModel.codigo,
              modelName: candidateModel.nome,
              yearCode: yearData.codigo,
              yearLabel: yearData.nome,
            });
          }
        } catch (error) {
          // Se falhar para um modelo específico, continua com os outros
          console.error(`Erro ao buscar anos para modelo ${candidateModel.nome}:`, error);
        }
      }

      if (allVersions.length === 0) {
        throw new Error(`Nenhuma versão encontrada para ${matchedBrand.nome} ${model} ${year}`);
      }

      // Ordenar alfabeticamente por label
      allVersions.sort((a, b) => a.label.localeCompare(b.label));

      // Retornar dados para seleção de versão
      return {
        brandId: matchedBrand.codigo,
        brandName: matchedBrand.nome,
        year,
        versions: allVersions,
      };
    },
  });
}

// Hook para consultar preço de uma versão específica
// Uso: const mutation = useFipePriceByVersion(); const result = await mutation.mutateAsync({brandId, modelId, versionCode});
export function useFipePriceByVersion() {
  return useMutation({
    mutationFn: async ({ brandId, modelId, versionCode }: { brandId: string; modelId: string; versionCode: string }) => {
      const priceResponse = await fetch(
        `/api/fipe/brands/${brandId}/models/${modelId}/years/${versionCode}/price`
      );
      if (!priceResponse.ok) throw new Error("Erro ao consultar preço FIPE");
      const priceData: FipePrice = await priceResponse.json();
      return priceData;
    },
  });
}

// DEPRECATED: Hook legado - use useFipeVehicleVersions + useFipePriceByVersion
export function useFipePriceByVehicle(brand?: string, model?: string, year?: number) {
  return useFipeVehicleVersions(brand, model, year);
}
