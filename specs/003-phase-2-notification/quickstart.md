# Phase 1: Quickstart & Setup Guide (Notification System)

## 1. Expo Configuration
Ensure `expo-notifications` and `expo-task-manager` are properly configured in your `app.json`.

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

## 2. Notification Utils Setup
Create `utils/notifications.ts` to encapsulate all scheduling and cancellation logic.

```typescript
import * as Notifications from 'expo-notifications';

export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleTimerCompletion(taskId: string, title: string, expireAt: Date) {
  // schedule implementation using getTimerNotificationId(taskId)
}

export async function cancelTaskNotification(taskId: string) {
  // cancel implementation using getTimerNotificationId(taskId)
}
```

## 3. Background Task Registration
In your root layout or entry point (e.g., `app/_layout.tsx`), import a file that registers the background task for notification actions.

```typescript
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

TaskManager.defineTask(NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
  if (error) {
    console.error(error);
    return;
  }
  // Handle action via data payload (e.g. Pause, Resume, Reset) and Convex mutation
});

Notifications.registerTaskAsync(NOTIFICATION_TASK);
```

## 4. UI Hook Integration
In `hooks/useTaskTimers.ts`, simply inject the `scheduleTimerCompletion` and `cancelTaskNotification` functions inside the `startTimer`, `pauseTimer`, and `resetTimer` workflows.