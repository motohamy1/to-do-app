# Phase 1: Data Model

## Overview
Phase 3 involves primarily UI and UX adjustments. There are no changes to the backend database schema. However, there is a specific payload structure change when calling the existing backend mutation to create a subtask.

## Existing Schema References
- **`todos` table**:
  - `status`: String (e.g., `"not_started"`, `"in_progress"`, `"paused"`, `"done"`, `"not_done"`)
  - `parentId`: Optional String (References another `todo` ID)

## Mutation Payload Update
When creating a subtask via `addTodo` in `TaskDetailModal.tsx`, the payload must explicitly include the status:
```typescript
addTodo({
  userId: string,
  text: string,
  parentId: string, // ID of the current task
  projectId?: string,
  timerDuration?: number,
  status: "not_started" // Explicitly required for subtasks
});
```

## Security & Constraints
- No changes to authentication or authorization.
- The `status: "not_started"` constraint ensures that new subtasks do not inherit completed states from their parent tasks or bypass workflow logic.