import { api } from '@/convex/_generated/api';
import {
  getMutationQueue,
  getIdMappings,
  saveIdMapping,
  removeQueuedMutation,
  bumpQueuedItemRetry,
  setServerClock,
  subscribeToQueue,
} from '@/utils/offlineStorage';
import NetInfo from '@react-native-community/netinfo';
import { useConvex } from 'convex/react';
import { useEffect, useRef } from 'react';

const apiAny = api as any;

const mutationMap: Record<string, any> = {
  // Todos
  'todos:addTodo': apiAny.todos.addTodo,
  'todos:updateTodo': apiAny.todos.updateTodo,
  'todos:updateStatus': apiAny.todos.updateStatus,
  'todos:deleteTodo': apiAny.todos.deleteTodo,
  'todos:deleteChecklistItem': apiAny.todos.deleteChecklistItem,
  'todos:setTimer': apiAny.todos.setTimer,
  'todos:startTimer': apiAny.todos.startTimer,
  'todos:pauseTimer': apiAny.todos.pauseTimer,
  'todos:setTimerRunState': apiAny.todos.setTimerRunState,
  'todos:startSubtaskTimer': apiAny.todos.startSubtaskTimer,
  'todos:pauseSubtaskTimer': apiAny.todos.pauseSubtaskTimer,
  'todos:resetTimer': apiAny.todos.resetTimer,
  'todos:removeTimer': apiAny.todos.removeTimer,
  'todos:linkProject': apiAny.todos.linkProject,
  'todos:linkTask': apiAny.todos.linkTask,

  // Task Checklists
  'todos:addTaskChecklistItem': apiAny.todos.addTaskChecklistItem,
  'todos:toggleTaskChecklistItem': apiAny.todos.toggleTaskChecklistItem,
  'todos:deleteTaskChecklistItem': apiAny.todos.deleteTaskChecklistItem,

  // Spaces / Categories
  'projects:addCategory': apiAny.projects.addCategory,
  'projects:updateCategory': apiAny.projects.updateCategory,
  'projects:deleteCategory': apiAny.projects.deleteCategory,
  'projects:addSubCategory': apiAny.projects.addSubCategory,
  'projects:updateSubCategory': apiAny.projects.updateSubCategory,
  'projects:deleteSubCategory': apiAny.projects.deleteSubCategory,

  // Projects
  'projects:addProject': apiAny.projects.addProject,
  'projects:updateProject': apiAny.projects.updateProject,
  'projects:deleteProject': apiAny.projects.deleteProject,

  // Category Items & Planner Items
  'projects:addCategoryItem': apiAny.projects.addCategoryItem,
  'projects:updateCategoryItem': apiAny.projects.updateCategoryItem,
  'projects:deleteCategoryItem': apiAny.projects.deleteCategoryItem,
  'projects:addPlannerItem': apiAny.projects.addPlannerItem,
  'projects:updatePlannerItem': apiAny.projects.updatePlannerItem,
  'projects:deletePlannerItem': apiAny.projects.deletePlannerItem,

  // Project Checklists & Resources
  'projects:addChecklistItem': apiAny.projects.addChecklistItem,
  'projects:toggleChecklistItem': apiAny.projects.toggleChecklistItem,
  'projects:deleteChecklistItem': apiAny.projects.deleteChecklistItem,
  'projects:addResource': apiAny.projects.addResource,
  'projects:deleteResource': apiAny.projects.deleteResource,

  // Goals & Achievements
  'yearlyGoals:createGoal': apiAny.yearlyGoals.createGoal || apiAny.yearlyGoals.addGoal,
  'yearlyGoals:addGoal': apiAny.yearlyGoals.addGoal || apiAny.yearlyGoals.createGoal,
  'yearlyGoals:addMonthGoal': apiAny.yearlyGoals.addMonthGoal,
  'yearlyGoals:addDayGoal': apiAny.yearlyGoals.addDayGoal,
  'yearlyGoals:updateGoal': apiAny.yearlyGoals.updateGoal,
  'yearlyGoals:deleteGoal': apiAny.yearlyGoals.deleteGoal,
  'yearlyGoals:createAchievement': apiAny.yearlyGoals.createAchievement || apiAny.yearlyGoals.addAchievement,
  'yearlyGoals:addAchievement': apiAny.yearlyGoals.addAchievement || apiAny.yearlyGoals.createAchievement,
  'yearlyGoals:addMonthAchievement': apiAny.yearlyGoals.addMonthAchievement,
  'yearlyGoals:addDayAchievement': apiAny.yearlyGoals.addDayAchievement,
  'yearlyGoals:updateAchievement': apiAny.yearlyGoals.updateAchievement,
  'yearlyGoals:deleteAchievement': apiAny.yearlyGoals.deleteAchievement,

  // Auth / Settings
  'auth:updateSettings': apiAny.auth.updateSettings,
};

const TEMP_ID_RE = /^temp_/;

const isTempIdString = (v: any): v is string => typeof v === 'string' && TEMP_ID_RE.test(v);

// Replace any (persisted-)mapped temp ids inside args with their server ids.
const remapValue = (v: any, map: Record<string, string>): any => {
  if (Array.isArray(v)) return v.map((x) => remapValue(x, map));
  if (v && typeof v === 'object') {
    const out: Record<string, any> = {};
    Object.entries(v).forEach(([k, val]) => {
      out[k] = k !== 'localId' && typeof val === 'string' && /id$/i.test(k) && map[val] ? map[val] : remapValue(val, map);
    });
    return out;
  }
  return v;
};

// Temp ids still present after remapping: the creation mutation that owns them
// must sync first, so dependent items stay deferred (never counted as failed).
const remainingTempIds = (args: any, found: Set<string> = new Set()): Set<string> => {
  if (!args || typeof args !== 'object') return found;
  if (Array.isArray(args)) {
    args.forEach((x) => remainingTempIds(x, found));
    return found;
  }
  Object.entries(args).forEach(([k, val]) => {
    if (k === 'localId') return;
    if (/id$/i.test(k) && isTempIdString(val)) found.add(val);
    else if (val && typeof val === 'object') remainingTempIds(val, found);
  });
  return found;
};

export function useSyncManager() {
  const convex = useConvex();
  const isSyncing = useRef(false);
  const rerunRequested = useRef(false);

  useEffect(() => {
    const run = () => {
      NetInfo.fetch().then((state) => {
        if (state.isConnected) processQueue();
      });
    };

    const unsubNet = NetInfo.addEventListener((state) => {
      if (state.isConnected && !isSyncing.current) {
        processQueue();
      }
    });

    // A mutation can end up queued while the device still reports "connected"
    // (client-side timeout fallback, unresolved temp ids). NetInfo never fires
    // for those, so enqueue itself must also trigger a sync pass.
    const unsubQueue = subscribeToQueue(run);

    // Check on initial mount
    run();

    return () => {
      unsubNet();
      unsubQueue();
    };
  }, [convex]);

  const processQueue = async () => {
    if (isSyncing.current) {
      rerunRequested.current = true;
      return;
    }
    isSyncing.current = true;

    try {
      const queue = await getMutationQueue();
      if (queue.length === 0) {
        isSyncing.current = false;
        return;
      }

      console.log('Syncing offline mutations. Total items:', queue.length);
      const idMap = { ...(await getIdMappings()) };

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        const mutationFn = mutationMap[item.mutationPath];

        if (!mutationFn) {
          console.warn(`No matching convex function found for ${item.mutationPath}, dropping.`);
          await removeQueuedMutation(item.id);
          continue;
        }

        const preparedArgs = remapValue(item.args, idMap);

        // Wait for the creation of referenced docs instead of burning retries.
        const blocking = Array.from(remainingTempIds(preparedArgs)).filter((t) => !idMap[t]);
        if (blocking.length > 0) {
          if (Date.now() - item.timestamp > 10 * 60 * 1000) {
            console.warn(`Dropping ${item.mutationPath}: referenced temp ids never synced:`, blocking);
            await removeQueuedMutation(item.id);
            continue;
          }
          console.warn(`Deferring ${item.mutationPath}: waiting on ${blocking.length} unsynced id(s).`);
          // Keep order: stop the whole pass; later items must not overtake.
          break;
        }

        try {
          const result = await convex.mutation(mutationFn, preparedArgs);
          console.log(`Successfully synced mutation: ${item.mutationPath}`);

          if (result && typeof result === 'object' && typeof (result as any).serverTime === 'number') {
            setServerClock((result as any).serverTime);
          }

          // Record creation mappings so dependent items (this batch or later
          // batches after a restart) can resolve their temp ids.
          if (item.tempId) {
            const serverId = typeof result === 'string' ? result : (result as any)?._id;
            if (serverId && serverId !== item.tempId) {
              idMap[item.tempId] = serverId;
              await saveIdMapping(item.tempId, serverId);
            }
          }

          // Commit removal per item: if the app dies mid-batch, already
          // applied mutations can never be replayed.
          await removeQueuedMutation(item.id);
        } catch (err: any) {
          console.warn(`Failed to sync mutation ${item.mutationPath}`, err);

          item.retryCount = (item.retryCount || 0) + 1;

          if (item.retryCount > 5) {
            console.warn(`Dropping mutation ${item.mutationPath} after exceeding retry limit.`);
            await removeQueuedMutation(item.id);
          } else {
            await bumpQueuedItemRetry(item.id, item.retryCount);
          }

          // Check if network is still connected
          const state = await NetInfo.fetch();
          if (!state.isConnected) {
            console.warn('Network lost during sync. Pausing queue processing.');
            break;
          }
        }
      }
    } catch (err) {
      console.error('Error during offline sync processing', err);
    } finally {
      isSyncing.current = false;
      if (rerunRequested.current) {
        rerunRequested.current = false;
        // Items were enqueued (or retried) mid-batch; run another pass once
        // the current one has fully committed.
        setTimeout(() => processQueue(), 250);
      }
    }
  };
}
