import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { scheduleTimerCompletion, cancelTaskNotification } from '../utils/notifications';
import { isDayPastCutoff, startOfDay } from '../utils/taskDateUtils';
import { getServerNow, patchTempTodo } from '../utils/offlineStorage';

const isTempId = (id: any) => typeof id === 'string' && id.startsWith('temp_');

export function useTaskTimers(todos: any[] | undefined, updateStatus: any) {
  const appState = useRef(AppState.currentState);
  const todosRef = useRef(todos);
  const scheduledNotifications = useRef(new Map<string, string>());

  useEffect(() => {
    todosRef.current = todos;
    
    if (!todos || !Array.isArray(todos)) return;

    const activeTaskIds = new Set<string>();

    todos.forEach((todo) => {
      activeTaskIds.add(todo._id);
      if (todo.status === 'in_progress' && todo.timerStartTime && todo.timerDuration && todo.timerDirection !== 'up') {
        const elapsed = getServerNow() - todo.timerStartTime;
        const remaining = Math.max(0, todo.timerDuration - elapsed);
        
        if (remaining > 0) {
           const lastScheduled = scheduledNotifications.current.get(todo._id);
           const scheduleKey = `${todo.timerStartTime}-${todo.timerDuration}`;
           if (lastScheduled !== scheduleKey) {
             if (lastScheduled) {
               cancelTaskNotification(todo._id);
             }
             scheduleTimerCompletion(todo._id, todo.text, remaining);
             scheduledNotifications.current.set(todo._id, scheduleKey);
           }
        }
      } else {
        if (scheduledNotifications.current.has(todo._id)) {
          cancelTaskNotification(todo._id);
          scheduledNotifications.current.delete(todo._id);
        }
      }
    });

    for (const [taskId] of scheduledNotifications.current.entries()) {
      if (!activeTaskIds.has(taskId)) {
        cancelTaskNotification(taskId);
        scheduledNotifications.current.delete(taskId);
      }
    }
  }, [todos]);

  useEffect(() => {
    // Guard against the 1s sweeper re-dispatching the same auto-status change
    // on every tick while the server echo is still in flight.
    const autoDispatched = new Set<string>();

    const dispatchAutoStatus = (id: string, status: string) => {
      const key = `${id}:${status}`;
      if (autoDispatched.has(key)) return;
      autoDispatched.add(key);
      Promise.resolve(updateStatus({ id, status })).catch(() => {
        autoDispatched.delete(key);
      });
    };

    const checkTasks = (currentTodos: any[]) => {
      if (!currentTodos || !Array.isArray(currentTodos)) return;

      const now = Date.now();
      const serverTime = getServerNow();
      currentTodos.forEach((todo) => {
        try {
          if (todo.status === 'done' && autoDispatched.has(`${todo._id}:done`)) {
            autoDispatched.delete(`${todo._id}:done`); // re-arm if reopened later
          }
          if ((todo.status === 'not_done' || todo.status === 'done') && autoDispatched.has(`${todo._id}:not_done`)) {
            autoDispatched.delete(`${todo._id}:not_done`);
          }

          // 1. Timer expiry → done (count-down only)
          if (todo.status === 'in_progress' && todo.timerStartTime && todo.timerDuration) {
            if (todo.timerDirection !== 'up') {
              const elapsed = serverTime - todo.timerStartTime;
              const remaining = Math.max(0, todo.timerDuration - elapsed);

              if (remaining === 0) {
                if (isTempId(todo._id)) {
                  patchTempTodo(todo._id, { status: 'done', completedAt: now, timerStartTime: undefined });
                } else {
                  dispatchAutoStatus(todo._id, 'done');
                }
                return;
              }
            }
          }

          // 2. Deadline passed without completion → not_done.
          // Honors the 7:00 AM extended-day cutoff: a task from "today" stays
          // alive until 7 AM of the next day, so a timer that crosses midnight
          // is never force-reset to not_done.
          if (
            (todo.status === 'not_started' || todo.status === 'in_progress' || todo.status === 'paused') &&
            todo.dueDate
          ) {
            if (isDayPastCutoff(startOfDay(todo.dueDate), now)) {
              if (isTempId(todo._id)) {
                patchTempTodo(todo._id, { status: 'not_done', timerStartTime: undefined });
              } else {
                dispatchAutoStatus(todo._id, 'not_done');
              }
            }
          }
        } catch (err) {
          // One failing task must never abort the sweep for the rest.
          console.warn('checkTasks failed for todo', todo?._id, err);
        }
      });
    };

    // Initial check
    if (todosRef.current) {
      checkTasks(todosRef.current);
    }

    // Periodic check: the countdown must complete (status → done) even while
    // the app sits open in the foreground, not only on resume/mount.
    const interval = setInterval(() => {
      if (todosRef.current) {
        checkTasks(todosRef.current);
      }
    }, 1000);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (todosRef.current) {
          checkTasks(todosRef.current);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [updateStatus]);
}
