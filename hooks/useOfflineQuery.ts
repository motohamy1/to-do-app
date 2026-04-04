import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import NetInfo from '@react-native-community/netinfo';
import { getCachedQuery, saveCachedQuery } from '@/utils/offlineStorage';

export function useOfflineQuery<T = any>(queryKey: string, queryFn: any, args?: any): T | undefined {
  const convexData = useQuery(queryFn, args);
  const [offlineData, setOfflineData] = useState<any>(undefined);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    NetInfo.fetch().then(state => setIsOffline(!state.isConnected));
    const unsub = NetInfo.addEventListener(state => setIsOffline(!state.isConnected));
    return unsub;
  }, []);

  useEffect(() => {
    getCachedQuery(queryKey, args).then(cached => {
       if (cached !== null && offlineData === undefined) {
          setOfflineData(cached);
       }
    });
  }, [queryKey, JSON.stringify(args)]);

  useEffect(() => {
    if (convexData !== undefined) {
      setOfflineData(convexData);
      saveCachedQuery(queryKey, args, convexData);
    }
  }, [convexData, queryKey, JSON.stringify(args)]);

  if (isOffline) {
    return offlineData; 
  }

  if (convexData === undefined && offlineData !== undefined) {
     return offlineData; 
  }

  return convexData;
}
