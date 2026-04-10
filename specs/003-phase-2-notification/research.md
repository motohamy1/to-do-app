# Phase 0: Research & Technical Decisions (Notification System)

## Technical Unknowns & Solutions

### 1. Reliable Timer Completion Notifications in Background
- **Problem**: Current implementation sometimes fails due to deprecated push notification properties. Timers counting down locally in `useTaskTimers.ts` don't trigger alerts reliably when the app is suspended.
- **Research**: `expo-notifications` allows scheduling local notifications based on a time trigger (`Notifications.scheduleNotificationAsync`).
- **Decision**: When a timer is started or resumed, we calculate the absolute `expiryTime`. We schedule a notification for exactly that time. If the user pauses or resets the timer, or deletes the task, we cancel that scheduled notification using `Notifications.cancelScheduledNotificationAsync`. This guarantees delivery even if the app is backgrounded.

### 2. Daily Morning & Evening Reminders
- **Problem**: Need to calculate the correct tasks for "today" (9:00 AM) and "overdue/not done" (8:00 PM) reliably every day.
- **Research**: True background background fetching using `expo-background-fetch` can be unreliable due to OS-level battery optimizations. Purely local scheduling is highly reliable.
- **Decision**: Since we cannot guarantee a background sync without a remote push server, we will aggressively recalculate and locally schedule/re-schedule the next pending 9:00 AM and 8:00 PM notifications whenever the app is opened, resumed, or a task is mutated. This provides high confidence that the next reminder is accurate based on the latest state of the local device.

### 3. Notification Action Buttons (Pause, Resume, Reset)
- **Problem**: Need interactive buttons directly on the notification that affect the app state.
- **Research**: `expo-notifications` supports Notification Categories. We can set a category identifier (e.g., `TIMER_ACTIVE`) with actions: `pause`, `resume`, `reset`. Responding to these requires a background task handler.
- **Decision**: 
  - Register the category `TIMER_ACTIVE` with actions on app startup. 
  - Use `expo-task-manager` and `Notifications.registerTaskAsync` to handle action responses in the background. 
  - The background task will receive the action identifier and the associated task ID in the notification data, and perform a Convex mutation to update the task state immediately, bypassing the need to open the app UI.

### 4. Persistent Timer Running Notification
- **Problem**: A constantly updating "time remaining" notification requires a foreground service on Android, and Live Activities on iOS.
- **Research**: Standard `expo-notifications` local scheduling cannot update every second dynamically without significant battery drain and OS-level restrictions.
- **Decision**: Implementing true persistent second-by-second updates via pure JS with Expo managed workflow is highly brittle. We will implement a standard completion notification and actions as a baseline. The persistent notification could simply be a standard scheduled notification with a category identifier showing the expected completion time. 

### 5. Multi-Language Support for Actions
- **Decision**: Since notification categories are registered at app launch, they must be registered with translated strings. If the user's language preference changes, we must re-register the categories dynamically with the new translations.

## Decisions Summary
1. Use purely local `expo-notifications` scheduling (`scheduleNotificationAsync`) for timers and daily reminders to ensure high delivery rates.
2. Aggressively re-schedule daily reminders locally upon any relevant task state change.
3. Use Notification Categories for Pause/Resume/Reset actions.
4. Handle notification actions in a background task via `expo-task-manager` to execute Convex mutations without bringing the app to the foreground.