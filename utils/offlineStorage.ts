import AsyncStorage from '@react-native-async-storage/async-storage';

// Global in-memory cache shared across the application
export const memoryCache: Record<string, any> = {};

// ---------------------------------------------------------------------------
// Server-corrected clock
// ---------------------------------------------------------------------------
// Optimistic timer writes used the raw device clock while the server used its
// own, so any device/server skew made timers jump or appear reset. Every timer
// mutation returns `serverTime`; we keep the delta and use `getServerNow()` for
// all timer math so client and server agree.
let clockOffsetMs = 0;

export const setServerClock = (serverTime: number) => {
  if (typeof serverTime === 'number' && isFinite(serverTime)) {
    clockOffsetMs = serverTime - Date.now();
  }
};

export const getServerNow = () => Date.now() + clockOffsetMs;

// ---------------------------------------------------------------------------
// Pending optimistic overlays
// ---------------------------------------------------------------------------
// When fresh Convex subscription data lands, `useOfflineQuery` replaces the
// cache wholesale. Overlays let unacknowledged local mutations survive that
// replacement until the server echoes the same state (or TTL expires).
interface OverlayEntry {
  patch: Record<string, any>;
  ts: number;
}

const OVERLAY_TTL_MS = 120000;
const pendingOverlays: Record<string, OverlayEntry> = {};

export const setPendingOverlay = (id: string, patch: Record<string, any>) => {
  if (!id || id.startsWith('temp_')) return; // temp docs use pendingTempTodos
  const prev = pendingOverlays[id];
  pendingOverlays[id] = { patch: { ...(prev?.patch || {}), ...patch }, ts: Date.now() };
};

export const clearPendingOverlay = (id: string) => {
  delete pendingOverlays[id];
};

const liveOverlay = (id: string): OverlayEntry | undefined => {
  const o = pendingOverlays[id];
  if (!o) return undefined;
  if (Date.now() - o.ts > OVERLAY_TTL_MS) {
    delete pendingOverlays[id];
    return undefined;
  }
  return o;
};

// Clear an overlay once the server has echoed the same values for its keys.
export const reconcileOverlay = (item: any) => {
  if (!item?._id) return;
  const o = pendingOverlays[item._id];
  if (!o) return;
  const echoKeys = ['status', 'timerStartTime', 'timeLeftAtPause', 'completedAt', 'timerDuration'];
  const allMatch = echoKeys.every(
    (k) => o.patch[k] === undefined || item[k] === o.patch[k] ||
      // normalize undefined vs null vs missing timer fields
      (o.patch[k] === undefined && (item[k] === undefined || item[k] === null))
  );
  if (allMatch) delete pendingOverlays[item._id];
};

export const applyOverlay = (item: any) => {
  if (!item?._id) return item;
  const o = liveOverlay(item._id);
  return o ? { ...item, ...o.patch } : item;
};

export const hasOverlay = (id: string) => !!liveOverlay(id);

// ---------------------------------------------------------------------------
// Pending locally-created (temp) documents
// ---------------------------------------------------------------------------
// Optimistic temp docs live in the query cache lists, but any incoming server
// snapshot would blow them away before the queued add ever reaches the server.
// This registry re-injects them into merged query results until the temp id is
// mapped to a real server id.
interface TempEntry {
  item: any;
  ts: number;
  // exact CACHE_ keys whose list this temp doc was prepended to; used to
  // re-inject it when a server snapshot replaces those cached arrays.
  cacheKeys: string[];
}

const TEMP_TTL_MS = 6 * 60 * 60 * 1000;
const pendingTempTodos: Map<string, TempEntry> = new Map();

export const registerPendingTemp = (item: any, cacheKeys: string[] = []) => {
  if (!item?._id) return;
  const prev = pendingTempTodos.get(item._id);
  pendingTempTodos.set(item._id, {
    item: prev ? { ...prev.item, ...item } : item,
    ts: prev?.ts ?? Date.now(),
    cacheKeys: Array.from(new Set([...(prev?.cacheKeys ?? []), ...cacheKeys])),
  });
};

export const getPendingTempTodos = (): any[] => {
  const now = Date.now();
  const alive: any[] = [];
  for (const [id, entry] of pendingTempTodos.entries()) {
    if (now - entry.ts > TEMP_TTL_MS) {
      pendingTempTodos.delete(id);
      continue;
    }
    alive.push(applyOverlay(entry.item));
  }
  return alive;
};

export const getPendingTempTodosForCacheKey = (cacheKey: string): any[] => {
  const now = Date.now();
  const alive: any[] = [];
  for (const [id, entry] of pendingTempTodos.entries()) {
    if (now - entry.ts > TEMP_TTL_MS) {
      pendingTempTodos.delete(id);
      continue;
    }
    if (entry.cacheKeys.includes(cacheKey)) alive.push(applyOverlay(entry.item));
  }
  return alive;
};

export const patchTempTodo = (tempId: string, patch: Record<string, any>) => {
  const entry = pendingTempTodos.get(tempId);
  if (entry) {
    entry.item = { ...entry.item, ...patch };
  }
  setPendingOverlay(tempId, patch); // no-op for temp ids, guarded inside
  // keep cache lists in sync
  Object.keys(memoryCache).forEach((key) => {
    if (key.startsWith('CACHE_todos')) {
      const current = memoryCache[key];
      if (Array.isArray(current)) {
        const idx = current.findIndex((t: any) => t?._id === tempId);
        if (idx >= 0) {
          const next = [...current];
          next[idx] = { ...next[idx], ...patch };
          memoryCache[key] = next;
          AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
        }
      }
    }
  });
  notifyCacheChanged();
};

// Permanently drop a temp doc once its real server id is known.
export const removeTempEntry = async (tempId: string) => {
  if (!tempId) return;
  pendingTempTodos.delete(tempId);
  delete pendingOverlays[tempId];
  Object.keys(memoryCache).forEach((key) => {
    if (key.startsWith('CACHE_todos') || key.startsWith('CACHE_projects') || key.startsWith('CACHE_yearly') || key.startsWith('CACHE_daily') || key.startsWith('CACHE_monthly') || key.startsWith('CACHE_categoryItems') || key.startsWith('CACHE_plannerItems')) {
      const current = memoryCache[key];
      if (Array.isArray(current)) {
        const next = current.filter((t: any) => t?._id !== tempId);
        if (next.length !== current.length) {
          memoryCache[key] = next;
          AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
        }
      } else if (current?._id === tempId) {
        delete memoryCache[key];
        AsyncStorage.removeItem(key).catch(() => {});
      }
    }
  });
  notifyCacheChanged();
};

// ---------------------------------------------------------------------------
// Persistent tempId -> serverId mappings
// ---------------------------------------------------------------------------
// The offline queue lives across app restarts, so id mappings must too; later
// batches can then remap mutations that reference a previously created doc.
const ID_MAP_KEY = 'OFFLINE_ID_MAP';
let idMappings: Record<string, string> = {};
let idMapPromise: Promise<Record<string, string>> | null = null;

export const getIdMappings = async (): Promise<Record<string, string>> => {
  if (idMapPromise) return idMapPromise;
  idMapPromise = AsyncStorage.getItem(ID_MAP_KEY)
    .then((json) => {
      idMappings = json ? JSON.parse(json) : {};
      return idMappings;
    })
    .catch(() => {
      idMappings = {};
      return idMappings;
    });
  return idMapPromise;
};

export const saveIdMapping = async (tempId: string, realId: string) => {
  if (!tempId || !realId || tempId === realId) return;
  const map = await getIdMappings();
  map[tempId] = realId;
  await AsyncStorage.setItem(ID_MAP_KEY, JSON.stringify(map)).catch(() => {});
  await removeTempEntry(tempId);
};

// ---------------------------------------------------------------------------
// Queue mutex
// ---------------------------------------------------------------------------
// Every queue write is a read-modify-write on AsyncStorage. Without
// serialization, a push racing with a sync commit loses one of them.
let queueLock: Promise<any> = Promise.resolve();
export const withQueueLock = <T,>(fn: () => Promise<T>): Promise<T> => {
  const next = queueLock.then(fn, fn);
  queueLock = next.catch(() => {});
  return next;
};

// Subscriber listeners for reactive query re-renders
const listeners = new Set<() => void>();

export const subscribeToCache = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

export const notifyCacheChanged = () => {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.warn('Error in cache subscriber:', e);
    }
  });
};

export const getCacheKey = (queryKey: string, args: any) => {
  return `CACHE_${queryKey}_${JSON.stringify(args || {})}`;
};

export const getCachedQuerySync = (queryKey: string, args: any) => {
  const key = getCacheKey(queryKey, args);
  return memoryCache[key];
};

export const saveCachedQuery = async (queryKey: string, args: any, data: any) => {
  const key = getCacheKey(queryKey, args);
  memoryCache[key] = data;
  notifyCacheChanged();
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to persist query cache to storage', err);
  }
};

export const getCachedQuery = async (queryKey: string, args: any) => {
  const key = getCacheKey(queryKey, args);
  if (memoryCache[key] !== undefined) {
    return memoryCache[key];
  }
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      const parsed = JSON.parse(value);
      memoryCache[key] = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to read query cache from storage', err);
  }
  return null;
};

export const updateCachedQuery = async (
  queryKey: string,
  args: any,
  updater: (oldData: any) => any
) => {
  const key = getCacheKey(queryKey, args);
  let currentData = memoryCache[key];
  if (currentData === undefined) {
    currentData = await getCachedQuery(queryKey, args);
  }
  if (currentData !== undefined && currentData !== null) {
    const updated = updater(currentData);
    await saveCachedQuery(queryKey, args, updated);
  }
};

// --- Mutation Queue Management ---

export interface QueuedMutation {
  id: string;
  tempId?: string;
  mutationKey: string;
  mutationPath: string;
  args: any;
  timestamp: number;
  retryCount?: number;
  // temp ids this item must wait on until they are mapped to server ids
  requiresIds?: string[];
  // items sharing a family collapse: only the latest desired state survives
  coalesceKey?: string;
}

const QUEUE_KEY = 'OFFLINE_MUTATION_QUEUE';

const readQueueRaw = async (): Promise<QueuedMutation[]> => {
  const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
  return queueJson ? JSON.parse(queueJson) : [];
};

const TEMP_ID_RE = /^temp_/;

const collectTempIds = (value: any, found: Set<string>) => {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((v) => collectTempIds(v, found));
    return;
  }
  Object.entries(value).forEach(([key, val]) => {
    // localId is intentionally the temp id (server-side idempotency key), not
    // a dependency that must be remapped before the item can run.
    if (key === 'localId') return;
    if (typeof val === 'string' && TEMP_ID_RE.test(val) && /id$/i.test(key)) {
      found.add(val);
    } else {
      collectTempIds(val, found);
    }
  });
};

// Mutations that express a desired end-state for a doc collapse in the queue:
// the newest one replaces older ones touching the same ids, so a start->pause
// ->resume tap sequence syncs exactly once with the final state instead of
// replaying every intermediate toggle.
const computeCoalesceKey = (mutationPath: string, args: any): string | undefined => {
  const targetId = args?.id || args?.todoId;
  if (mutationPath === 'todos:updateStatus' && targetId) return `status:${targetId}`;
  if (
    (mutationPath === 'todos:startTimer' ||
      mutationPath === 'todos:pauseTimer' ||
      mutationPath === 'todos:startSubtaskTimer' ||
      mutationPath === 'todos:pauseSubtaskTimer' ||
      mutationPath === 'todos:resetTimer') &&
    targetId
  ) {
    return `timerState:${targetId}`;
  }
  if (mutationPath === 'todos:setTimerRunState' && Array.isArray(args?.updates) && args.updates.length > 0) {
    const ids = args.updates.map((u: any) => u?.id).filter(Boolean).sort();
    return `timerState:${ids.join(',')}`;
  }
  return undefined;
};

const idsOfCoalesceKey = (key?: string): string[] => {
  if (!key) return [];
  const idx = key.indexOf(':');
  return idx >= 0 ? key.slice(idx + 1).split(',') : [];
};

export const pushMutationToQueue = (
  mutationKey: string,
  mutationPath: string,
  args: any,
  tempId?: string
): Promise<string | null> =>
  withQueueLock(async () => {
    try {
      const queue = await readQueueRaw();

      const now = Date.now();
      const dupe = queue.find((item) => {
        if (tempId && item.tempId === tempId && item.mutationPath === mutationPath) return true;
        if (item.mutationPath === mutationPath && JSON.stringify(item.args) === JSON.stringify(args)) {
          return now - item.timestamp < 4000;
        }
        return false;
      });

      if (dupe) {
        console.log(`Suppressed duplicate queued mutation: ${mutationPath}`);
        return dupe.id;
      }

      const coalesceKey = computeCoalesceKey(mutationPath, args);
      let nextQueue = queue;
      if (coalesceKey) {
        const newIds = new Set(idsOfCoalesceKey(coalesceKey));
        const tempIds = new Set<string>();
        if (tempId) tempIds.add(tempId);
        collectTempIds(args, tempIds);
        // An older item is superseded when it targets the same doc (or an
        // overlapping set of docs) with a newer desired-state mutation.
        nextQueue = queue.filter((item) => {
          if (!item.coalesceKey) return true;
          const oldIds = new Set(idsOfCoalesceKey(item.coalesceKey));
          for (const t of tempIds) if (oldIds.has(t)) return false;
          for (const id of newIds) if (oldIds.has(id)) return false;
          return true;
        });
      }

      const requires = new Set<string>();
      collectTempIds(args, requires);

      const itemId = Date.now().toString() + Math.random().toString();
      nextQueue.push({
        id: itemId,
        tempId,
        mutationKey,
        mutationPath,
        args,
        timestamp: now,
        retryCount: 0,
        coalesceKey,
        requiresIds: requires.size > 0 ? Array.from(requires) : undefined,
      });
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(nextQueue));
      return itemId;
    } catch (err) {
      console.warn('Failed to push to mutation queue', err);
      return null;
    }
  });

// Remove a single item once it has been successfully applied — the queue must
// never contain mutations the server already processed, even if the app dies
// mid-batch.
export const removeQueuedMutation = (id: string): Promise<void> =>
  withQueueLock(async () => {
    try {
      const queue = await readQueueRaw();
      const next = queue.filter((item) => item.id !== id);
      if (next.length !== queue.length) {
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
      }
    } catch (err) {
      console.warn('Failed to remove queued mutation', err);
    }
  });

export const bumpQueuedItemRetry = (id: string, retryCount: number): Promise<void> =>
  withQueueLock(async () => {
    try {
      const queue = await readQueueRaw();
      const idx = queue.findIndex((item) => item.id === id);
      if (idx >= 0) {
        queue[idx] = { ...queue[idx], retryCount };
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (err) {
      console.warn('Failed to bump queued mutation retry', err);
    }
  });

export const getMutationQueue = (): Promise<QueuedMutation[]> =>
  withQueueLock(async () => {
    try {
      return await readQueueRaw();
    } catch (err) {
      return [];
    }
  });

export const clearMutationQueue = (): Promise<void> =>
  withQueueLock(async () => {
    try {
      await AsyncStorage.removeItem(QUEUE_KEY);
    } catch (err) {}
  });

export const setMutationQueue = (queue: QueuedMutation[]): Promise<void> =>
  withQueueLock(async () => {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn('Failed to set mutation queue', err);
    }
  });

// Remove an optimistic temp entry from all caches matching the given prefixes.
export const rollbackOptimisticEntry = (prefixes: string[], tempId: string) => {
  if (!tempId) return;
  pendingTempTodos.delete(tempId);
  delete pendingOverlays[tempId];
  Object.keys(memoryCache).forEach((key) => {
    if (prefixes.some((p) => key.startsWith(p))) {
      const current = memoryCache[key];
      if (Array.isArray(current)) {
        const updated = current.filter((item: any) => item?._id !== tempId);
        if (updated.length !== current.length) {
          memoryCache[key] = updated;
          AsyncStorage.setItem(key, JSON.stringify(updated)).catch(() => {});
        }
      }
    }
  });
  notifyCacheChanged();
};

// --- Automatic Optimistic Local Store Execution ---

export const applyOptimisticMutation = (mutationPath: string, args: any): any => {
  const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  // Find and update all memoryCache entries matching specific prefixes.
  // Returns the exact keys touched so creates can register themselves for
  // re-injection into those specific query results.
  const updateMatchingCaches = (prefix: string, updater: (val: any) => any): string[] => {
    const touched: string[] = [];
    Object.keys(memoryCache).forEach((key) => {
      if (key.startsWith(prefix)) {
        touched.push(key);
        const current = memoryCache[key];
        if (current !== undefined) {
          const updated = updater(current);
          if (updated !== undefined) {
            memoryCache[key] = updated;
            AsyncStorage.setItem(key, JSON.stringify(updated)).catch(() => {});
          }
        }
      }
    });
    return touched;
  };

  switch (mutationPath) {
    // ─── TODOS ─────────────────────────────────────────────────────────────────
    case 'todos:addTodo': {
      const newTodo = {
        _id: tempId,
        _creationTime: Date.now(),
        ...args,
        status: args.status || 'not_started',
        hashtags: args.hashtags || [],
        text: args.text || '',
        description: args.description || '',
      };

      // Add to todos query cache
      const touchedTodoKeys = updateMatchingCaches('CACHE_todos_', (todosList) => {
        if (!Array.isArray(todosList)) return [newTodo];
        // If it already exists, replace; otherwise prepend
        return [newTodo, ...todosList.filter((t: any) => t._id !== tempId)];
      });

      // If it has a parent, also update getSubtasks cache
      if (args.parentId) {
        const touchedSubKeys = updateMatchingCaches('CACHE_todos.getSubtasks_', (subtasks) => {
          if (!Array.isArray(subtasks)) return [newTodo];
          return [...subtasks.filter((s: any) => s._id !== tempId), newTodo];
        });
        touchedTodoKeys.push(...touchedSubKeys);
      }

      // Save getById cache for immediate detail access
      const getByIdKey = getCacheKey('todos.getById', { id: tempId });
      memoryCache[getByIdKey] = newTodo;
      AsyncStorage.setItem(getByIdKey, JSON.stringify(newTodo)).catch(() => {});

      // Keep it re-injectable into query results that arrive from the server
      // before the queued add is replayed.
      registerPendingTemp(newTodo, [...touchedTodoKeys, getByIdKey]);

      notifyCacheChanged();
      return tempId;
    }

    case 'todos:setTimerRunState': {
      const updates = Array.isArray(args?.updates) ? args.updates : [];
      const applyOne = (update: any) => {
        const patch: Record<string, any> = { status: update.status };
        if (update.status === 'in_progress') {
          patch.timerStartTime =
            typeof update.timerStartTime === 'number' ? update.timerStartTime : getServerNow();
          patch.timeLeftAtPause = undefined;
        } else if (update.status === 'paused') {
          patch.timerStartTime = undefined;
          if (typeof update.timeLeftAtPause === 'number') {
            patch.timeLeftAtPause = update.timeLeftAtPause;
          }
        } else {
          patch.timerStartTime = undefined;
          if (update.status === 'done') patch.completedAt = getServerNow();
        }
        return patch;
      };

      updates.forEach((update: any) => {
        if (!update?.id) return;
        const patch = applyOne(update);
        if (update.id.startsWith('temp_')) {
          patchTempTodo(update.id, patch);
        } else {
          setPendingOverlay(update.id, patch);
        }
      });

      updateMatchingCaches('CACHE_todos_', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((item: any) => {
          const update = updates.find((u: any) => u?.id === item?._id);
          return update ? { ...item, ...applyOne(update) } : item;
        });
      });

      updateMatchingCaches('CACHE_todos.getSubtasks_', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((item: any) => {
          const update = updates.find((u: any) => u?.id === item?._id);
          return update ? { ...item, ...applyOne(update) } : item;
        });
      });

      updateMatchingCaches('CACHE_todos.getById_', (single) => {
        if (!single) return single;
        const update = updates.find((u: any) => u?.id === single._id);
        return update ? { ...single, ...applyOne(update) } : single;
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'todos:updateTodo':
    case 'todos:updateStatus':
    case 'todos:setTimer':
    case 'todos:startTimer':
    case 'todos:pauseTimer':
    case 'todos:startSubtaskTimer':
    case 'todos:pauseSubtaskTimer':
    case 'todos:resetTimer':
    case 'todos:removeTimer':
    case 'todos:linkTask':
    case 'todos:linkProject': {
      const targetId = args.id || args.todoId;
      if (!targetId) break;

      let capturedPatch: Record<string, any> | null = null;
      const OVERLAY_KEYS = ['status', 'timerStartTime', 'timeLeftAtPause', 'completedAt', 'timerDuration', 'timerDirection'];

      const patchTodo = (item: any) => {
        if (item._id !== targetId) return item;
        const updated = { ...item };

        if (mutationPath === 'todos:updateStatus') {
          updated.status = args.status;
          if (args.status === 'done') {
            updated.completedAt = getServerNow();
          } else {
            updated.completedAt = undefined;
          }
        } else if (mutationPath === 'todos:startTimer' || mutationPath === 'todos:startSubtaskTimer') {
          updated.status = 'in_progress';
          updated.timerStartTime = getServerNow();
          if (!updated.timerFirstStartTime) updated.timerFirstStartTime = getServerNow();
          updated.timeLeftAtPause = undefined;
        } else if (mutationPath === 'todos:pauseTimer' || mutationPath === 'todos:pauseSubtaskTimer') {
          updated.status = 'paused';
          if (updated.timerStartTime) {
            const elapsed = getServerNow() - updated.timerStartTime;
            if (updated.timerDirection === 'up') {
              updated.timeLeftAtPause = (updated.timeLeftAtPause || 0) + elapsed;
            } else if (updated.timerDuration) {
              const currentLeft = updated.timeLeftAtPause !== undefined ? updated.timeLeftAtPause : updated.timerDuration;
              updated.timeLeftAtPause = Math.max(0, currentLeft - elapsed);
            }
          }
          updated.timerStartTime = undefined;
        } else if (mutationPath === 'todos:resetTimer') {
          updated.status = 'not_started';
          updated.timerStartTime = undefined;
          updated.timeLeftAtPause = undefined;
        } else if (mutationPath === 'todos:removeTimer') {
          updated.timerDuration = undefined;
          updated.timerDirection = undefined;
          updated.timerStartTime = undefined;
          updated.timeLeftAtPause = undefined;
        } else if (mutationPath === 'todos:setTimer') {
          if (args.duration !== undefined) updated.timerDuration = args.duration;
          if (args.timerDuration !== undefined) updated.timerDuration = args.timerDuration;
          if (args.timerDirection !== undefined) updated.timerDirection = args.timerDirection;
          if (args.timerStartTime !== undefined) updated.timerStartTime = args.timerStartTime;
          if (args.dueDate !== undefined) updated.dueDate = args.dueDate;
          if (args.date !== undefined) updated.date = args.date;
        } else if (mutationPath === 'todos:linkTask' || mutationPath === 'todos:linkProject') {
          updated.categoryId = args.categoryId;
          updated.subCategoryId = args.subCategoryId;
          updated.projectId = args.projectId;
        } else {
          // General updateTodo
          Object.assign(updated, args);
        }

        if (!capturedPatch) {
          capturedPatch = {};
          OVERLAY_KEYS.forEach((k) => {
            if ((updated as any)[k] !== (item as any)[k]) {
              capturedPatch![k] = (updated as any)[k];
            }
          });
        }

        return updated;
      };

      updateMatchingCaches('CACHE_todos_', (list) => {
        if (!Array.isArray(list)) return list;
        let next = list.map(patchTodo);
        // The server `todos` get-query only returns top-level items: mirror
        // that by dropping an item the moment it is nested under a parent.
        if (mutationPath === 'todos:updateTodo' && args.parentId) {
          next = next.filter((t: any) => t._id !== targetId);
        }
        return next;
      });

      updateMatchingCaches('CACHE_todos.getSubtasks_', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map(patchTodo);
      });

      updateMatchingCaches('CACHE_todos.getById_', (single) => {
        if (!single || single._id !== targetId) return single;
        return patchTodo(single);
      });

      // Record the optimistic field changes so they survive a server snapshot
      // replacement until the server echoes them back.
      if (capturedPatch && Object.keys(capturedPatch).length > 0) {
        if (targetId.startsWith('temp_')) {
          patchTempTodo(targetId, capturedPatch);
        } else {
          setPendingOverlay(targetId, capturedPatch);
        }
      }

      notifyCacheChanged();
      return { success: true };
    }

    case 'todos:deleteTodo': {
      const targetId = args.id || args.todoId;
      if (!targetId) break;

      updateMatchingCaches('CACHE_todos_', (list) => {
        if (!Array.isArray(list)) return list;
        // Delete target todo and any nested subtasks
        return list.filter((t: any) => t._id !== targetId && t.parentId !== targetId);
      });

      updateMatchingCaches('CACHE_todos.getSubtasks_', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((t: any) => t._id !== targetId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'todos:deleteChecklistItem': {
      const targetId = args.id || args.todoId;
      if (!targetId) break;

      // The item disappears, but its linked tasks survive (server unlinks them).
      updateMatchingCaches('CACHE_todos_', (list) => {
        if (!Array.isArray(list)) return list;
        return list
          .filter((t: any) => t._id !== targetId)
          .map((t: any) => (t.parentId === targetId ? { ...t, parentId: undefined } : t));
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'todos:addTaskChecklistItem': {
      const newCheck = {
        _id: tempId,
        _creationTime: Date.now(),
        todoId: args.todoId,
        userId: args.userId,
        text: args.text,
        isCompleted: false,
      };

      const touchedCheckKeys = updateMatchingCaches('CACHE_todos.getTaskChecklists_', (list) => {
        if (!Array.isArray(list)) return [newCheck];
        return [...list.filter((i: any) => i._id !== tempId), newCheck];
      });
      registerPendingTemp(newCheck, touchedCheckKeys);

      notifyCacheChanged();
      return tempId;
    }

    case 'todos:toggleTaskChecklistItem': {
      updateMatchingCaches('CACHE_todos.getTaskChecklists_', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((i: any) => (i._id === args.id ? { ...i, isCompleted: !i.isCompleted } : i));
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'todos:deleteTaskChecklistItem': {
      updateMatchingCaches('CACHE_todos.getTaskChecklists_', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((i: any) => i._id !== args.id);
      });

      notifyCacheChanged();
      return { success: true };
    }

    // ─── SPACES & CATEGORIES ───────────────────────────────────────────────────
    case 'projects:addCategory': {
      const newCat = {
        _id: tempId,
        _creationTime: Date.now(),
        ...args,
      };

      const touchedCatKeys = updateMatchingCaches('CACHE_projects.getCategories', (list) => {
        if (!Array.isArray(list)) return [newCat];
        return [...list.filter((c: any) => c._id !== tempId), newCat];
      });

      // Ensure default user query cache key is also seeded if touchedCatKeys was empty
      const defaultUserCatKey = args.userId ? getCacheKey('projects.getCategories', { userId: args.userId }) : 'CACHE_projects.getCategories_{}';
      if (!touchedCatKeys.includes(defaultUserCatKey)) {
        const currentList = memoryCache[defaultUserCatKey];
        const nextList = Array.isArray(currentList) ? [...currentList.filter((c: any) => c._id !== tempId), newCat] : [newCat];
        memoryCache[defaultUserCatKey] = nextList;
        AsyncStorage.setItem(defaultUserCatKey, JSON.stringify(nextList)).catch(() => {});
        touchedCatKeys.push(defaultUserCatKey);
      }

      const getCatKey = getCacheKey('projects.getCategory', { id: tempId });
      memoryCache[getCatKey] = newCat;
      AsyncStorage.setItem(getCatKey, JSON.stringify(newCat)).catch(() => {});

      registerPendingTemp(newCat, [...touchedCatKeys, getCatKey]);

      notifyCacheChanged();
      return tempId;
    }

    case 'projects:updateCategory': {
      const catId = args.id;
      updateMatchingCaches('CACHE_projects.getCategories', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((c: any) => (c._id === catId ? { ...c, ...args } : c));
      });

      updateMatchingCaches('CACHE_projects.getCategory_', (cat) => {
        if (!cat || cat._id !== catId) return cat;
        return { ...cat, ...args };
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'projects:deleteCategory': {
      const catId = args.id;
      updateMatchingCaches('CACHE_projects.getCategories', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((c: any) => c._id !== catId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'projects:addSubCategory': {
      const newSub = {
        _id: tempId,
        _creationTime: Date.now(),
        ...args,
      };

      const touchedSubKeys = updateMatchingCaches('CACHE_projects.getSubCategories', (list) => {
        if (!Array.isArray(list)) return [newSub];
        return [...list.filter((s: any) => s._id !== tempId), newSub];
      });
      registerPendingTemp(newSub, touchedSubKeys);

      notifyCacheChanged();
      return tempId;
    }

    case 'projects:updateSubCategory': {
      const subId = args.id;
      updateMatchingCaches('CACHE_projects.getSubCategories', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((s: any) => (s._id === subId ? { ...s, ...args } : s));
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'projects:deleteSubCategory': {
      const subId = args.id;
      updateMatchingCaches('CACHE_projects.getSubCategories', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((s: any) => s._id !== subId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    // ─── PROJECTS ──────────────────────────────────────────────────────────────
    case 'projects:addProject': {
      const newProj = {
        _id: tempId,
        _creationTime: Date.now(),
        ...args,
      };

      const touchedProjKeys = updateMatchingCaches('CACHE_projects.getProjects', (list) => {
        if (!Array.isArray(list)) return [newProj];
        return [...list.filter((p: any) => p._id !== tempId), newProj];
      });

      const metaKey = getCacheKey('projects.getProjectMetadata', { id: tempId });
      memoryCache[metaKey] = newProj;
      AsyncStorage.setItem(metaKey, JSON.stringify(newProj)).catch(() => {});

      registerPendingTemp(newProj, [...touchedProjKeys, metaKey]);

      notifyCacheChanged();
      return tempId;
    }

    case 'projects:updateProject': {
      const projId = args.id;
      updateMatchingCaches('CACHE_projects.getProjects', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((p: any) => (p._id === projId ? { ...p, ...args } : p));
      });

      updateMatchingCaches('CACHE_projects.getProject', (p) => {
        if (!p || p._id !== projId) return p;
        return { ...p, ...args };
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'projects:deleteProject': {
      const projId = args.id;
      updateMatchingCaches('CACHE_projects.getProjects', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((p: any) => p._id !== projId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    // ─── CATEGORY & PLANNER ITEMS ──────────────────────────────────────────────
    case 'projects:addCategoryItem': {
      const newItem = {
        _id: tempId,
        _creationTime: Date.now(),
        isCompleted: false,
        isExpanded: false,
        ...args,
      };

      const touchedItemKeys = updateMatchingCaches('CACHE_categoryItems', (list) => {
        if (!Array.isArray(list)) return [newItem];
        return [...list.filter((i: any) => i._id !== tempId), newItem];
      });
      registerPendingTemp(newItem, touchedItemKeys);

      notifyCacheChanged();
      return tempId;
    }

    case 'projects:updateCategoryItem': {
      const itemId = args.id;
      updateMatchingCaches('CACHE_categoryItems', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((i: any) => (i._id === itemId ? { ...i, ...args } : i));
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'projects:deleteCategoryItem': {
      const itemId = args.id;
      updateMatchingCaches('CACHE_categoryItems', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((i: any) => i._id !== itemId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'projects:addPlannerItem': {
      const newPlanner = {
        _id: tempId,
        _creationTime: Date.now(),
        isCompleted: false,
        ...args,
      };

      const touchedPlannerKeys = updateMatchingCaches('CACHE_plannerItems', (list) => {
        if (!Array.isArray(list)) return [newPlanner];
        return [...list.filter((i: any) => i._id !== tempId), newPlanner];
      });
      registerPendingTemp(newPlanner, touchedPlannerKeys);

      notifyCacheChanged();
      return tempId;
    }

    case 'projects:updatePlannerItem': {
      const itemId = args.id;
      updateMatchingCaches('CACHE_plannerItems', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((i: any) => (i._id === itemId ? { ...i, ...args } : i));
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'projects:deletePlannerItem': {
      const itemId = args.id;
      updateMatchingCaches('CACHE_plannerItems', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((i: any) => i._id !== itemId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    // ─── PROJECT CHECKLISTS & RESOURCES ────────────────────────────────────────
    case 'projects:addChecklistItem': {
      const newCheck = {
        _id: tempId,
        _creationTime: Date.now(),
        projectId: args.projectId,
        text: args.text,
        isCompleted: false,
      };

      const touchedProjCheckKeys = updateMatchingCaches('CACHE_projects.getProjectChecklists', (list) => {
        if (!Array.isArray(list)) return [newCheck];
        return [...list.filter((i: any) => i._id !== tempId), newCheck];
      });
      registerPendingTemp(newCheck, touchedProjCheckKeys);

      notifyCacheChanged();
      return tempId;
    }

    case 'projects:toggleChecklistItem': {
      const itemId = args.id;
      updateMatchingCaches('CACHE_projects.getProjectChecklists', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((i: any) => (i._id === itemId ? { ...i, isCompleted: !i.isCompleted } : i));
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'projects:deleteChecklistItem': {
      const itemId = args.id;
      updateMatchingCaches('CACHE_projects.getProjectChecklists', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((i: any) => i._id !== itemId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'projects:addResource': {
      const newRes = {
        _id: tempId,
        _creationTime: Date.now(),
        ...args,
      };

      const touchedResKeys = updateMatchingCaches('CACHE_projects.getProjectResources', (list) => {
        if (!Array.isArray(list)) return [newRes];
        return [...list.filter((r: any) => r._id !== tempId), newRes];
      });
      registerPendingTemp(newRes, touchedResKeys);

      notifyCacheChanged();
      return tempId;
    }

    case 'projects:deleteResource': {
      const resId = args.id;
      updateMatchingCaches('CACHE_projects.getProjectResources', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((r: any) => r._id !== resId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    // ─── GOALS & ACHIEVEMENTS ──────────────────────────────────────────────────
    case 'yearlyGoals:createGoal':
    case 'yearlyGoals:addGoal':
    case 'yearlyGoals:addMonthGoal':
    case 'yearlyGoals:addDayGoal': {
      const newGoal = {
        _id: tempId,
        _creationTime: Date.now(),
        isCompleted: false,
        ...args,
      };

      const prependGoal = (list: any) =>
        Array.isArray(list) ? [...list.filter((g: any) => g._id !== tempId), newGoal] : [newGoal];
      const touchedGoalKeys = [
        ...updateMatchingCaches('CACHE_yearlyGoals', prependGoal),
        ...updateMatchingCaches('CACHE_monthlyGoals', prependGoal),
        ...updateMatchingCaches('CACHE_dailyGoals', prependGoal),
      ];
      registerPendingTemp(newGoal, touchedGoalKeys);

      notifyCacheChanged();
      return tempId;
    }

    case 'yearlyGoals:updateGoal': {
      const goalId = args.id;
      updateMatchingCaches('CACHE_yearlyGoals', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((g: any) => (g._id === goalId ? { ...g, ...args } : g));
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'yearlyGoals:deleteGoal': {
      const goalId = args.id;
      updateMatchingCaches('CACHE_yearlyGoals', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((g: any) => g._id !== goalId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'yearlyGoals:createAchievement':
    case 'yearlyGoals:addAchievement':
    case 'yearlyGoals:addMonthAchievement':
    case 'yearlyGoals:addDayAchievement': {
      const newAch = {
        _id: tempId,
        _creationTime: Date.now(),
        isCompleted: false,
        ...args,
      };

      const prependAch = (list: any) =>
        Array.isArray(list) ? [...list.filter((a: any) => a._id !== tempId), newAch] : [newAch];
      const touchedAchKeys = [
        ...updateMatchingCaches('CACHE_yearlyAchievements', prependAch),
        ...updateMatchingCaches('CACHE_monthlyAchievements', prependAch),
        ...updateMatchingCaches('CACHE_dailyAchievements', prependAch),
      ];
      registerPendingTemp(newAch, touchedAchKeys);

      notifyCacheChanged();
      return tempId;
    }

    case 'yearlyGoals:updateAchievement': {
      const achId = args.id;
      updateMatchingCaches('CACHE_yearlyAchievements', (list) => {
        if (!Array.isArray(list)) return list;
        return list.map((a: any) => (a._id === achId ? { ...a, ...args } : a));
      });

      notifyCacheChanged();
      return { success: true };
    }

    case 'yearlyGoals:deleteAchievement': {
      const achId = args.id;
      updateMatchingCaches('CACHE_yearlyAchievements', (list) => {
        if (!Array.isArray(list)) return list;
        return list.filter((a: any) => a._id !== achId);
      });

      notifyCacheChanged();
      return { success: true };
    }

    // ─── AUTH / SETTINGS ───────────────────────────────────────────────────────
    case 'auth:updateSettings': {
      updateMatchingCaches('CACHE_auth.getUserSettings', (settings) => {
        if (!settings) return args;
        return { ...settings, ...args };
      });

      notifyCacheChanged();
      return { success: true };
    }

    default: {
      notifyCacheChanged();
      return tempId;
    }
  }

  return tempId;
};
