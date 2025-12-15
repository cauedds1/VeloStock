// In-memory cache para anúncios gerados por veículo
// TTL: 48 horas (economiza créditos da API OpenAI)

interface CachedAd {
  instagram_story: string;
  instagram_feed: string;
  facebook: string;
  olx_title: string;
  whatsapp: string;
  seo_title: string;
  timestamp: number;
}

interface AdCache {
  [vehicleId: string]: CachedAd;
}

const adCache: AdCache = {};
const AD_CACHE_TTL = 48 * 60 * 60 * 1000; // 48 horas em milissegundos

/**
 * Gera chave de cache composta por veículo + idioma
 */
function getCacheKey(vehicleId: string, language: string = "pt-BR"): string {
  return `${vehicleId}:${language}`;
}

/**
 * Obtém anúncio do cache se existir e ainda for válido
 */
export function getAdFromCache(vehicleId: string, language: string = "pt-BR"): CachedAd | null {
  const cacheKey = getCacheKey(vehicleId, language);
  const cached = adCache[cacheKey];
  
  if (!cached) {
    return null;
  }

  // Verificar se expirou (TTL de 48 horas)
  const age = Date.now() - cached.timestamp;
  if (age > AD_CACHE_TTL) {
    // Remover do cache se expirou
    delete adCache[cacheKey];
    return null;
  }

  return cached;
}

/**
 * Salva anúncio em cache
 */
export function saveAdToCache(vehicleId: string, ad: Omit<CachedAd, 'timestamp'>, language: string = "pt-BR") {
  const cacheKey = getCacheKey(vehicleId, language);
  adCache[cacheKey] = {
    ...ad,
    timestamp: Date.now(),
  };
}

/**
 * Limpa cache de um veículo específico (todos os idiomas)
 */
export function clearAdCache(vehicleId: string) {
  Object.keys(adCache).forEach(key => {
    if (key.startsWith(`${vehicleId}:`)) {
      delete adCache[key];
    }
  });
}

/**
 * Limpa todo o cache de anúncios
 */
export function clearAllAdCache() {
  Object.keys(adCache).forEach(key => delete adCache[key]);
}

/**
 * Retorna status do cache (útil para debug)
 */
export function getAdCacheStatus() {
  const entries = Object.keys(adCache).length;
  const details = Object.entries(adCache).map(([vehicleId, ad]) => {
    const age = Date.now() - ad.timestamp;
    const ageHours = Math.floor(age / (60 * 60 * 1000));
    const expiresIn = Math.floor((AD_CACHE_TTL - age) / (60 * 60 * 1000));
    return {
      vehicleId,
      ageHours,
      expiresInHours: expiresIn,
    };
  });

  return {
    totalCachedAds: entries,
    ads: details,
  };
}
