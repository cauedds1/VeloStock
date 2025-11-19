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
export function useFipeBrands() {
  return useQuery<FipeBrand[]>({
    queryKey: ["/api/fipe/brands"],
    queryFn: async () => {
      const response = await fetch("/api/fipe/brands");
      if (!response.ok) throw new Error("Erro ao buscar marcas FIPE");
      return response.json();
    },
  });
}

// Buscar modelos por marca
export function useFipeModels(brandId: string | null) {
  return useQuery<{ modelos: FipeModel[] }>({
    queryKey: ["/api/fipe/brands", brandId, "models"],
    queryFn: async () => {
      if (!brandId) throw new Error("Brand ID não fornecido");
      const response = await fetch(`/api/fipe/brands/${brandId}/models`);
      if (!response.ok) throw new Error("Erro ao buscar modelos FIPE");
      return response.json();
    },
    enabled: !!brandId,
  });
}

// Buscar anos por modelo
export function useFipeYears(brandId: string | null, modelId: string | null) {
  return useQuery<FipeYear[]>({
    queryKey: ["/api/fipe/brands", brandId, "models", modelId, "years"],
    queryFn: async () => {
      if (!brandId || !modelId) throw new Error("Brand ID ou Model ID não fornecido");
      const response = await fetch(`/api/fipe/brands/${brandId}/models/${modelId}/years`);
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
  year: string | null
) {
  return useQuery<FipePrice>({
    queryKey: ["/api/fipe/brands", brandId, "models", modelId, "years", year, "price"],
    queryFn: async () => {
      if (!brandId || !modelId || !year) {
        throw new Error("Parâmetros incompletos para consulta FIPE");
      }
      const response = await fetch(
        `/api/fipe/brands/${brandId}/models/${modelId}/years/${year}/price`
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

// Aliases comuns de marcas
const BRAND_ALIASES: Record<string, string[]> = {
  "chevrolet": ["gm", "chevy"],
  "volkswagen": ["vw"],
  "mercedes-benz": ["mercedes"],
  "land rover": ["landrover"],
};

// Hook para buscar preço FIPE automaticamente baseado em marca/modelo/ano (texto)
export function useFipePriceByVehicle(brand?: string, model?: string, year?: number) {
  return useMutation({
    mutationFn: async () => {
      if (!brand || !model || !year) {
        throw new Error("Marca, modelo ou ano não fornecidos");
      }

      // 1. Buscar marcas
      const brandsResponse = await fetch("/api/fipe/brands");
      if (!brandsResponse.ok) throw new Error("Erro ao buscar marcas");
      const brands: FipeBrand[] = await brandsResponse.json();

      // 2. Encontrar marca correspondente (fuzzy match com aliases e normalização)
      const normalizedBrand = normalizeString(brand);
      
      const matchedBrand = brands.find((b) => {
        const normalizedBrandName = normalizeString(b.nome);
        
        // Match direto
        if (normalizedBrandName.includes(normalizedBrand) || normalizedBrand.includes(normalizedBrandName)) {
          return true;
        }
        
        // Match por aliases
        for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
          if (normalizedBrandName.includes(canonical)) {
            if (aliases.some(alias => normalizedBrand.includes(alias))) {
              return true;
            }
          }
        }
        
        return false;
      });

      if (!matchedBrand) {
        throw new Error(`Marca "${brand}" não encontrada na tabela FIPE`);
      }

      // 3. Buscar modelos da marca
      const modelsResponse = await fetch(`/api/fipe/brands/${matchedBrand.codigo}/models`);
      if (!modelsResponse.ok) throw new Error("Erro ao buscar modelos");
      const modelsData: { modelos: FipeModel[] } = await modelsResponse.json();

      // 4. Encontrar modelo correspondente (fuzzy match com normalização)
      const normalizedModel = normalizeString(model);
      
      const matchedModel = modelsData.modelos.find((m) => {
        const normalizedModelName = normalizeString(m.nome);
        return normalizedModelName.includes(normalizedModel) || normalizedModel.includes(normalizedModelName);
      });

      if (!matchedModel) {
        throw new Error(`Modelo "${model}" não encontrado para a marca ${matchedBrand.nome}`);
      }

      // 5. Buscar anos disponíveis
      const yearsResponse = await fetch(
        `/api/fipe/brands/${matchedBrand.codigo}/models/${matchedModel.codigo}/years`
      );
      if (!yearsResponse.ok) throw new Error("Erro ao buscar anos");
      const years: FipeYear[] = await yearsResponse.json();

      // 6. Encontrar ano correspondente (pode vir como "2025-1" ou "2025")
      const matchedYear = years.find(
        (y) => y.nome.includes(year.toString()) || y.codigo.includes(year.toString())
      );

      if (!matchedYear) {
        throw new Error(`Ano ${year} não encontrado para ${matchedBrand.nome} ${matchedModel.nome}`);
      }

      // 7. Buscar preço FIPE
      const priceResponse = await fetch(
        `/api/fipe/brands/${matchedBrand.codigo}/models/${matchedModel.codigo}/years/${matchedYear.codigo}/price`
      );
      if (!priceResponse.ok) throw new Error("Erro ao consultar preço");
      const priceData: FipePrice = await priceResponse.json();

      return priceData;
    },
  });
}
