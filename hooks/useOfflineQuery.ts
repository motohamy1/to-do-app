import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import NetInfo from '@react-native-community/netinfo';
import { getCachedQuery, saveCachedQuery } from '@/utils/offlineStorage';

const memoryCache: Record<string, any> = {};

export function useOfflineQuery<T = any>(queryKey: string, queryFn: any, args?: any): T | undefined {
  const convexData = useQuery(queryFn, args);
  const cacheKey = `CACHE_${queryKey}_${JSON.stringify(args || {})}`;
  
  const [offlineData, setOfflineData] = useState<any>(memoryCache[cacheKey]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    NetInfo.fetch().then(state => setIsOffline(!state.isConnected));
    const unsub = NetInfo.addEventListener(state => setIsOffline(!state.isConnected));
    return unsub;
  }, []);

  useEffect(() => {
    if (memoryCache[cacheKey] !== undefined) {
      if (offlineData === undefined) {
        setOfflineData(memoryCache[cacheKey]);
      }
      return;
    }

    import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem(cacheKey).then(value => {
        if (value) {
          try {
            const parsed = JSON.parse(value);
            memoryCache[cacheKey] = parsed;
            setOfflineData(parsed);
          } catch (e) {
            AsyncStorage.removeItem(cacheKey);
            memoryCache[cacheKey] = [];
            setOfflineData([]);
          }
        } else {
          memoryCache[cacheKey] = [];
          setOfflineData([]);
        }
      }).catch(() => {
        memoryCache[cacheKey] = [];
        setOfflineData([]);
      });
    });
  }, [cacheKey]);

  useEffect(() => {
    if (convexData !== undefined) {
      memoryCache[cacheKey] = convexData;
      setOfflineData(convexData);
      saveCachedQuery(queryKey, args, convexData);
    }
  }, [convexData, cacheKey]);

  if (isOffline) {
    return offlineData !== undefined ? offlineData : ([] as unknown as T); 
  }

  if (convexData === undefined && offlineData !== undefined) {
     return offlineData; 
  }

  return convexData !== undefined ? convexData : offlineData;
}
