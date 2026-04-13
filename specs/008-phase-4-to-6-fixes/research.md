# Phase 0: Research & Unknowns Resolution

## 1. "Today" View and "To-Do" Filter
- **Current State**: `app/(tabs)/index.tsx` uses an `activeFilter` state defaulting to `'All'`. When `'All'` is selected, it displays tasks but doesn't fully filter out `'done'` tasks from the "Today" section if they are scheduled for today.
- **Resolution**: We need to update the `['All', 'In Progress', 'Done']` options so the label for `'All'` becomes `'To-Do'`. We must ensure the `Today` filtering logic in `index.tsx` explicitly excludes `t.status === 'done'`. 

## 2. Floating Action Button (FAB)
- **Current State**: Task addition is currently triggered elsewhere (e.g., via a button or link).
- **Resolution**: Add a FAB component inside `app/(tabs)/index.tsx` using `absolute` positioning (`bottom: 24, right: 24`). It should be colored with `colors.primary` and have a `+` icon, invoking the task creation modal.

## 3. Notification Sounds
- **Current State**: `utils/notifications.ts` hardcodes `ALARM_SOUND = Platform.OS === 'android' ? 'alarm_tone' : 'alarm_tone.wav'`.
- **Resolution**:
  - We will introduce a new user preference `notificationSound` (e.g., stored in AsyncStorage or Convex `userSettings`). For offline-first capability, AsyncStorage is safest for synchronous reads during notification scheduling.
  - In `requestPermissionsAsync` and `scheduleTimerCompletion`, we will dynamically read the preferred sound (e.g., `'default'` vs `'alarm_tone.wav'`).
  - Android requires deleting and recreating the notification channel to change sounds. We already have logic that deletes existing channels (`'tasks'`, etc.) in `requestPermissionsAsync`, so updating the channel's `sound` parameter will work on the next initialization.