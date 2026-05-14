import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook useDataCache - Gestiona caché local con invalidación
 * Evita requests duplicados en corto tiempo
 */
export function useDataCache(cacheTimeMs = 300000) { // 5 minutos por defecto
  const cacheRef = useRef({});
  const timestampsRef = useRef({});

  const getFromCache = useCallback((key) => {
    const now = Date.now();
    const cachedTime = timestampsRef.current[key];

    // Si existe en caché y no ha expirado
    if (cacheRef.current[key] && cachedTime && (now - cachedTime < cacheTimeMs)) {
      return {
        data: cacheRef.current[key],
        isCached: true,
        age: now - cachedTime,
      };
    }

    return null;
  }, [cacheTimeMs]);

  const setInCache = useCallback((key, data) => {
    cacheRef.current[key] = data;
    timestampsRef.current[key] = Date.now();
  }, []);

  const invalidateCache = useCallback((key) => {
    if (key) {
      delete cacheRef.current[key];
      delete timestampsRef.current[key];
    } else {
      // Invalidar todo
      cacheRef.current = {};
      timestampsRef.current = {};
    }
  }, []);

  const getCacheAge = useCallback((key) => {
    const cachedTime = timestampsRef.current[key];
    if (!cachedTime) return null;
    return Date.now() - cachedTime;
  }, []);

  return {
    getFromCache,
    setInCache,
    invalidateCache,
    getCacheAge,
  };
}

/**
 * Hook useAutoRefresh - Actualización automática cada X segundos
 */
export function useAutoRefresh(callback, intervalMs = 30000, enabled = true) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const refresh = async () => {
      setIsRefreshing(true);
      try {
        await callback();
        setLastRefresh(Date.now());
      } catch (error) {
        console.error('Error en refresh automático:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Refresh inmediato al activar
    refresh();

    // Configurar intervalo
    intervalRef.current = setInterval(refresh, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [callback, intervalMs, enabled]);

  const manualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await callback();
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Error en refresh manual:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [callback]);

  const toggleRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else {
      const refresh = async () => {
        setIsRefreshing(true);
        try {
          await callback();
          setLastRefresh(Date.now());
        } catch (error) {
          console.error('Error en refresh:', error);
        } finally {
          setIsRefreshing(false);
        }
      };
      intervalRef.current = setInterval(refresh, intervalMs);
    }
  }, [callback, intervalMs]);

  return {
    isRefreshing,
    lastRefresh,
    manualRefresh,
    toggleRefresh,
    isEnabled: !!intervalRef.current,
  };
}
