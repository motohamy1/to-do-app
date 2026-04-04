import { useEffect, useRef } from 'react';
import { useConvex } from 'convex/react';
import NetInfo from '@react-native-community/netinfo';
import { getMutationQueue, clearMutationQueue } from '@/utils/offlineStorage';
import { api } from '@/convex/_generated/api';

const apiAny = api as any;

const mutationMap: Record<string, any> = {
  // Todos
  "todos:addTodo": apiAny.todos.addTodo,
  "todos:updateTodo": apiAny.todos.updateTodo,
  "todos:updateStatus": apiAny.todos.updateStatus,
  "todos:deleteTodo": apiAny.todos.deleteTodo,
  "todos:setTimer": apiAny.todos.setTimer,
  "todos:startTimer": apiAny.todos.startTimer,
  "todos:pauseTimer": apiAny.todos.pauseTimer,
  "todos:startSubtaskTimer": apiAny.todos.startSubtaskTimer,
  "todos:pauseSubtaskTimer": apiAny.todos.pauseSubtaskTimer,
  "todos:linkProject": apiAny.todos.linkProject,
  
  // Projects
  "projects:addProject": apiAny.projects.addProject || apiAny.projects?.add,
  "projects:deleteProject": apiAny.projects.deleteProject,
  
  // Auth
  "auth:updateSettings": apiAny.auth.updateSettings,
};

export function useSyncManager() {
  const convex = useConvex();
  const isSyncing = useRef(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      if (state.isConnected && !isSyncing.current) {
        processQueue();
      }
    });
    // Check on initial mount
    NetInfo.fetch().then(state => {
        if (state.isConnected) processQueue();
    });
    return unsub;
  }, [convex]);

  const processQueue = async () => {
    isSyncing.current = true;
    try {
      const queue = await getMutationQueue();
      if (queue.length === 0) {
        isSyncing.current = false;
        return;
      }

      console.log('Syncing offline mutations. Total:', queue.length);
      for (const item of queue) {
        const mutationFn = mutationMap[item.mutationPath];
        if (mutationFn) {
          try {
             await convex.mutation(mutationFn, item.args);
          } catch (err) {
             console.warn(`Failed to sync mutation ${item.mutationPath}`, err);
          }
        } else {
             console.warn(`No matching convex function found for ${item.mutationPath}`);
        }
      }
      // If we finished attempting all, we clear the queue. 
      // Individual failures are logged but we clear to prevent endless loops on bad requests
      await clearMutationQueue();
      console.log('Sync complete!');
    } catch (err) {
      console.error('Error during sync processing', err);
    } finally {
      isSyncing.current = false;
    }
  };
}
