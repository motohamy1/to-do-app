# Phase 1: Interface Contracts (Convex Backend)

The notification system runs locally on the device, but the Notification Action buttons (Pause, Resume, Reset) execute within a background task context. This means the background task must mutate the data directly in the Convex backend without relying on the active React component tree or UI hooks.

## 1. Background Client Initialization
To mutate data in the background, we must instantiate a standalone Convex client within the task manager callback, since standard React hooks (`useMutation`) are not available outside of a React component.

```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Ensure your CONVEX_URL is available globally or via environment variables
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || "";
export const backgroundConvexClient = new ConvexHttpClient(convexUrl);
```

## 2. Required Mutations (Reused from Phase 1)
We will rely on the existing Phase 1 mutations to update timer states.

```typescript
// Example usage in the background task:
await backgroundConvexClient.mutation(api.todos.updateTaskTimer, {
  taskId: actionData.taskId,
  timerStatus: "paused",
  // timerRemaining calculation based on elapsed time since last unpause
});
```

## 3. Consistency Guarantee
Because the background action mutates the backend directly, any active app screens observing that task via `useQuery` will instantly reflect the paused/resumed/reset state once the device connects to the internet or comes to the foreground. This satisfies the Constitution's **Shared Backend Persistence** requirement.