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
 * Obtém anúncio do cache se existir e ainda for válido
 */
export function getAdFromCache(vehicleId: string): CachedAd | null {
  const cached = adCache[vehicleId];
  
  if (!cached) {
    return null;
  }

  // Verificar se expirou (TTL de 48 horas)
  const age = Date.now() - cached.timestamp;
  if (age > AD_CACHE_TTL) {
    // Remover do cache se expirou
    delete adCache[vehicleId];
    return null;
  }

  return cached;
}

/**
 * Salva anúncio em cache
 */
export function saveAdToCache(vehicleId: string, ad: Omit<CachedAd, 'timestamp'>) {
  adCache[vehicleId] = {
    ...ad,
    timestamp: Date.now(),
  };
}

/**
 * Limpa cache de um veículo específico
 */
export function clearAdCache(vehicleId: string) {
  delete adCache[vehicleId];
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
