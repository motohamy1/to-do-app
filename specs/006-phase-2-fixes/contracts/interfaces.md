# Phase 1: API & Interface Contracts

## Context
This document defines the backend behavior constraints for Phase 2 timer logic fixes. No new APIs or endpoints are required; instead, the mutations `setTimer` and `startTimer` are modified.

## `setTimer` Mutation
**Path:** `convex/todos.ts`

**Input:**
```text
{
  id: Id<"todos">,
  duration?: number,
  ... // other existing arguments
}
```

**New Behavioral Contract:**
When `duration` is provided, the mutation must fetch the existing task.
If `task.timerDuration` exists:
1. `diff = args.duration - task.timerDuration`
2. If the task status is `paused` and `task.timeLeftAtPause !== undefined`:
   - Compute `newTimeLeftAtPause = Math.max(0, task.timeLeftAtPause + diff)`
   - Set `timeLeftAtPause = newTimeLeftAtPause`

If the task status is `in_progress`, the actual elapsed time remains implicitly accurate via `timerStartTime`. However, to prevent a case where `diff` is negative and remaining time becomes less than 0, the front-end or backend must safely clamp `remaining`. (The frontend hook `useTaskTimers.ts` already clamps with `Math.max(0, ...)`).

## `startTimer` Mutation
**Path:** `convex/todos.ts`

**Input:**
```typescript
{
  id: Id<"todos">
}
```

**New Behavioral Contract:**
When starting the timer, it must resume from `timeLeftAtPause` if the task was previously paused, EVEN IF the current status is `not_done` (e.g. from day rollover).

```typescript
let newStartTime = Date.now();
if (
  (todo.status === "paused" || todo.status === "not_done") && 
  todo.timeLeftAtPause !== undefined && 
  todo.timerDuration
) {
    newStartTime = Date.now() - (todo.timerDuration - todo.timeLeftAtPause);
}

await ctx.db.patch(args.id, { 
  status: "in_progress",
  timerStartTime: newStartTime,
  timeLeftAtPause: undefined 
});
```

## Frontend Hooks (`TaskDetailModal.tsx`)
**Contract:**
When a user selects "In Progress" status pill via `setStatus('in_progress')`:
- Verify if `todo?.timerDuration > 0`.
- If yes, invoke `startTimer({ id: currentTodoId })`.
- This ensures the timer starts immediately without waiting for modal dismissal.
