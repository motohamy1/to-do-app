import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';
import { TIMER_ACTIONS, TimerNotificationData } from './notifications';
import { Id } from '../convex/_generated/dataModel';

export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Initialize Convex client for background execution
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || "https://dummy-fallback.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background task error:', error);
    return;
  }
  
  if (data) {
    const notificationData = data as any;
    const actionIdentifier = notificationData.actionIdentifier;
    const actionData = notificationData.notification?.request?.content?.data as TimerNotificationData;

    if (!actionData?.taskId) {
      if (notificationData.notification?.request?.identifier) {
        await Notifications.dismissNotificationAsync(notificationData.notification.request.identifier);
      }
      return;
    }

    try {
      const taskId = actionData.taskId as Id<"todos">;
      
      // Verify if task still exists
      const task = await convex.query(api.todos.getById, { id: taskId });
      if (!task) {
         await Notifications.dismissNotificationAsync(notificationData.notification.request.identifier);
         return;
      }

      if (actionIdentifier === TIMER_ACTIONS.PAUSE) {
        await convex.mutation(api.todos.pauseTimer, { id: taskId });
      } else if (actionIdentifier === TIMER_ACTIONS.RESUME) {
        await convex.mutation(api.todos.startTimer, { id: taskId });
      } else if (actionIdentifier === TIMER_ACTIONS.RESET) {
        await convex.mutation(api.todos.updateStatus, { id: taskId, status: 'not_started' });
      }
      
      await Notifications.dismissNotificationAsync(notificationData.notification.request.identifier);
    } catch (e) {
      console.error('Failed to handle notification action:', e);
    }
  }
});