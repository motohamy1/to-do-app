import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveCachedQuery = async (queryKey: string, args: any, data: any) => {
  try {
    const key = `CACHE_${queryKey}_${JSON.stringify(args || {})}`;
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save query cache', err);
  }
};

export const getCachedQuery = async (queryKey: string, args: any) => {
  try {
    const key = `CACHE_${queryKey}_${JSON.stringify(args || {})}`;
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return JSON.parse(value);
    }
  } catch (err) {
    console.warn('Failed to get query cache', err);
  }
  return null;
};

export const updateCachedQuery = async (queryKey: string, args: any, updater: (oldData: any[]) => any[]) => {
  try {
    const data = await getCachedQuery(queryKey, args);
    if (data !== null) {
      const updated = updater(data);
      await saveCachedQuery(queryKey, args, updated);
    }
  } catch (err) {
    console.warn('Failed to optimistically update cache', err);
  }
};

export const pushMutationToQueue = async (mutationKey: string, mutationPath: string, args: any) => {
  try {
    const queueJson = await AsyncStorage.getItem('OFFLINE_MUTATION_QUEUE');
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({
      id: Date.now().toString() + Math.random().toString(),
      mutationKey,
      mutationPath,
      args,
      timestamp: Date.now()
    });
    await AsyncStorage.setItem('OFFLINE_MUTATION_QUEUE', JSON.stringify(queue));
  } catch (err) {
    console.warn('Failed to push to mutation queue', err);
  }
};

export const getMutationQueue = async () => {
  try {
    const queueJson = await AsyncStorage.getItem('OFFLINE_MUTATION_QUEUE');
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (err) {
    return [];
  }
};

export const clearMutationQueue = async () => {
  try {
    await AsyncStorage.removeItem('OFFLINE_MUTATION_QUEUE');
  } catch (err) {}
};
