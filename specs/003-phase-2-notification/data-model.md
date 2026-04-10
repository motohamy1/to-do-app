# Phase 1: Data Model (Notification System)

## Local State & Interfaces

No major additions to the Convex database schema are strictly required since notifications are scheduled locally on the device. However, to cancel and update notifications reliably, we will use deterministic string identifiers tied to the task context.

### 1. Deterministic Notification Identifiers
Instead of storing random notification IDs returned by the OS, we will generate deterministic IDs based on the task `_id`.

```typescript
export const getTimerNotificationId = (taskId: string) => `timer_${taskId}`;
export const getMorningNotificationId = () => `daily_morning_9am`;
export const getEveningNotificationId = () => `daily_evening_8pm`;
```

### 2. Notification Action Data Payload
When a background task is triggered by a notification action, it needs the `taskId` and necessary context.

```typescript
export interface TimerNotificationData {
  taskId: string; // Type as Id<"todos"> in actual implementation
  durationMinutes: number;
}
```

### 3. Notification Categories & Actions
We define standard string constants for categories and actions.

```typescript
export const NOTIFICATION_CATEGORIES = {
  TIMER_ACTIVE: 'TIMER_ACTIVE',
} as const;

export const TIMER_ACTIONS = {
  PAUSE: 'pause_timer',
  RESUME: 'resume_timer',
  RESET: 'reset_timer',
} as const;
```

## Backend Schema Additions (Convex)
*No changes needed. We will reuse the existing `Task` schema from Phase 1 (`status`, `timerStatus`, `timerRemaining`, etc).*