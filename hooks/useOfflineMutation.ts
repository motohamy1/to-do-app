import { useMutation } from 'convex/react';
import NetInfo from '@react-native-community/netinfo';
import { pushMutationToQueue, updateCachedQuery } from '@/utils/offlineStorage';

export function useOfflineMutation(mutationFn: any, mutationPath: string) {
  const convexMutation = useMutation(mutationFn);

  return async (
    args: any, 
    options?: {
      optimisticUpdater?: (oldData: any[]) => any[],
      queryKey?: string,
      queryArgs?: any
    }
  ) => {
    const state = await NetInfo.fetch();
    
    if (options?.optimisticUpdater && options?.queryKey) {
      await updateCachedQuery(options.queryKey, options.queryArgs, options.optimisticUpdater);
    }

    if (!state.isConnected) {
      console.log('App is offline. Queuing mutation:', mutationPath);
      await pushMutationToQueue(mutationPath, mutationPath, args);
      return { _id: "temp_" + Date.now() }; 
    } else {
      try {
        return await convexMutation(args);
      } catch (err) {
        console.warn('Network request failed, pushing to offline queue', err);
        await pushMutationToQueue(mutationPath, mutationPath, args);
        return { _id: "temp_" + Date.now() };
      }
    }
  };
}
