import { applyOptimisticMutation, getIdMappings, pushMutationToQueue, removeQueuedMutation, removeTempEntry, rollbackOptimisticEntry, saveIdMapping, setServerClock, updateCachedQuery } from '@/utils/offlineStorage';
import NetInfo from '@react-native-community/netinfo';
import { useMutation } from 'convex/react';

// Reactive network state tracker
let _isConnected = true;
NetInfo.addEventListener((state) => {
  _isConnected = state.isConnected ?? true;
});

// Initial network fetch
NetInfo.fetch().then((state) => {
  _isConnected = state.isConnected ?? true;
});

const recentMutations = new Map<string, { timestamp: number; result: any }>();

// Volatile fields differ between two taps of the "same" action, so they must
// be excluded from the duplicate-tap hash or rapid-tap suppression never hits.
const VOLATILE_ARG_KEYS = new Set(['timerStartTime', 'localId', 'timestamp']);

function hashArgs(args: any): string {
  if (!args || typeof args !== 'object') return JSON.stringify(args);
  const clean: Record<string, any> = {};
  Object.keys(args)
    .sort()
    .forEach((k) => {
      if (!VOLATILE_ARG_KEYS.has(k)) clean[k] = args[k];
    });
  return JSON.stringify(clean);
}

function findTempIds(value: any, found: Set<string> = new Set()): Set<string> {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) {
    value.forEach((v) => findTempIds(v, found));
    return found;
  }
  Object.entries(value).forEach(([key, val]) => {
    // localId is deliberately the temp id itself (the server's idempotency key)
    if (key === 'localId') return;
    if (typeof val === 'string' && val.startsWith('temp_') && /id$/i.test(key)) {
      found.add(val);
    } else {
      findTempIds(val, found);
    }
  });
  return found;
}

// Replace temp ids with their synced server equivalents (recursively).
async function remapArgs(args: any): Promise<any> {
  if (!args || typeof args !== 'object') return args;
  const map = await getIdMappings();
  const temps = Array.from(findTempIds(args));
  if (temps.length === 0) return args;
  const resolve = (v: any): any => {
    if (Array.isArray(v)) return v.map(resolve);
    if (v && typeof v === 'object') {
      const out: Record<string, any> = {};
      Object.entries(v).forEach(([k, val]) => {
        out[k] =
          k !== 'localId' && typeof val === 'string' && /id$/i.test(k) && map[val]
            ? map[val]
            : resolve(val);
      });
      return out;
    }
    return v;
  };
  return resolve(args);
}

// Create mutations across the app; each gets the optimistic temp id injected
// as `localId` so a queued replay can never insert a second copy server-side.
const CREATE_MUTATION_RE = /^(todos|projects|yearlyGoals):(add|create)/;

export function useOfflineMutation(mutationFn: any, mutationPath: string) {
  const convexMutation = useMutation(mutationFn);

  return async (
    rawArgs: any,
    options?: {
      optimisticUpdater?: (oldData: any[]) => any[];
      queryKey?: string;
      queryArgs?: any;
    }
  ) => {
    // Rapid duplicate tap suppression (1000ms window)
    const mutationHash = `${mutationPath}_${hashArgs(rawArgs)}`;
    const last = recentMutations.get(mutationHash);
    if (last && Date.now() - last.timestamp < 1000) {
      console.log(`Debounced rapid duplicate mutation tap: ${mutationPath}`);
      return last.result;
    }

    // Carry any previously-synced temp ids forward as real server ids.
    const args = await remapArgs(rawArgs);

    // 1. Apply explicit custom optimistic updater if provided
    if (options?.optimisticUpdater && options?.queryKey) {
      await updateCachedQuery(options.queryKey, options.queryArgs, options.optimisticUpdater);
    }

    // 2. Apply automatic built-in optimistic update to local store
    const optimisticResult = applyOptimisticMutation(mutationPath, args);
    const createdTempId = typeof optimisticResult === 'string' ? optimisticResult : undefined;
    const tempId = createdTempId || (optimisticResult && optimisticResult._id) || `temp_${Date.now()}`;
    const fallbackResult = createdTempId
      ? createdTempId
      : { _id: tempId, id: tempId, ...(typeof optimisticResult === 'object' ? optimisticResult : {}) };

    recentMutations.set(mutationHash, { timestamp: Date.now(), result: fallbackResult });
    if (recentMutations.size > 100) {
      const now = Date.now();
      recentMutations.forEach((val, key) => {
        if (now - val.timestamp > 5000) recentMutations.delete(key);
      });
    }

    // Creation mutations carry the optimistic temp id as an idempotency key so
    // a queued replay can never insert a second copy server-side.
    let serverArgs = args;
    if (createdTempId && CREATE_MUTATION_RE.test(mutationPath)) {
      serverArgs = { ...args, localId: createdTempId };
    }

    // Queue when offline, or when args still reference a temp id the server
    // has never seen (an online call would only fail v.id validation).
    const map = await getIdMappings();
    const unresolvedTemps = Array.from(findTempIds(serverArgs)).filter((t) => !map[t]);
    const needsQueue = !_isConnected || unresolvedTemps.length > 0;

    const enqueue = async (): Promise<any> => {
      await pushMutationToQueue(mutationPath, mutationPath, serverArgs, createdTempId);
      return fallbackResult;
    };

    if (needsQueue) {
      console.log(`${_isConnected ? 'Un-synced temp ids; ' : 'Offline: '}Queuing mutation:`, mutationPath);
      return enqueue();
    }

    // 3. If online, race the Convex mutation against a 4000ms timeout so slow
    // networks / hanging WebSockets can't freeze the UI.
    const serverResultPromise = convexMutation(serverArgs);

    // If this call later succeeds after timing out below, clean up the
    // queued copy so the sync loop can never replay a duplicate create.
    const pendingQueueRef: { current: string | null } = { current: null };
    serverResultPromise.then(
      async (res: any) => {
        try {
          if (res && typeof res === 'object' && typeof res.serverTime === 'number') {
            setServerClock(res.serverTime);
          }
          const realId = typeof res === 'string' ? res : res?._id;
          if (createdTempId && realId && realId !== createdTempId) {
            await saveIdMapping(createdTempId, realId);
          }
          if (pendingQueueRef.current) {
            await removeQueuedMutation(pendingQueueRef.current);
            pendingQueueRef.current = null;
          }
        } catch (e) {
          console.warn('Late-resolve queue cleanup failed', e);
        }
      },
      () => {}
    );

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 4000);
      });

      const result = await Promise.race([serverResultPromise, timeoutPromise]);

      if (result && typeof result === 'object' && typeof (result as any).serverTime === 'number') {
        setServerClock((result as any).serverTime);
      }

      if (createdTempId) {
        const realId = typeof result === 'string' ? result : (result as any)?._id;
        if (realId && realId !== createdTempId) {
          await saveIdMapping(createdTempId, realId);
        }
      }
      // For updates, the overlay is cleared by echo-reconciliation in
      // useOfflineQuery (or its TTL), not here: the ack can arrive before the
      // subscription has shipped the new state.

      return result !== undefined ? result : fallbackResult;
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      const isNetworkIssue =
        msg === 'NETWORK_TIMEOUT' ||
        !_isConnected ||
        /network|offline|transport|websocket|fetch failed|client is closed|socket|timed? ?out|unavailable|ENOTFOUND|ECONNRESET|EAI_AGAIN|50[234]/i.test(msg);

      // Real server-side rejections (validation, auth, app errors) must surface
      // to the caller instead of being silently queued forever.
      if (!isNetworkIssue) {
        console.error(`Mutation ${mutationPath} rejected by Convex:`, msg);
        if (createdTempId) {
          if (mutationPath.startsWith('yearlyGoals:') && /Goal/.test(mutationPath)) {
            rollbackOptimisticEntry(
              ['CACHE_yearlyGoals', 'CACHE_monthlyGoals', 'CACHE_dailyGoals'],
              createdTempId
            );
          } else if (mutationPath.startsWith('yearlyGoals:') && /Achievement/.test(mutationPath)) {
            rollbackOptimisticEntry(
              ['CACHE_yearlyAchievements', 'CACHE_monthlyAchievements', 'CACHE_dailyAchievements'],
              createdTempId
            );
          } else {
            await removeTempEntry(createdTempId);
          }
        }
        throw err;
      }

      // On network timeout or connection drop, queue for background sync. The
      // server call's late success (if any) is reconciled by the `.then` above
      // (id mapping + queue item removal), so replays are idempotent.
      console.warn(`Mutation ${mutationPath} deferred to offline queue (Network condition: ${msg})`);
      const itemId = await pushMutationToQueue(mutationPath, mutationPath, serverArgs, createdTempId);
      pendingQueueRef.current = itemId;
      return fallbackResult;
    }
  };
}
