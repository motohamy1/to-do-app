# Phase 1: Contracts

## `createTask` & `createSubtask` Mutation Signature
```typescript
interface CreateTaskArgs {
  text: string;
  parentId?: Id<"tasks">;
  status?: "not started" | "in progress" | "done"; // Enforced default: "not started"
  // other fields...
}
```

## `scheduleNotification` Function Signature
```typescript
interface ScheduleNotificationArgs {
  title: string;
  body: string; // MUST contain the actual task `text`
  taskId: Id<"tasks">;
  trigger: any;
}
```