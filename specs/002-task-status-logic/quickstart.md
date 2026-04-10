# Phase 1: Quickstart (Task Status Logic)

## Overview
This logic handles the correct status transitions of tasks, including timer tracking, past-due logic, and retroactive completions.

## How to Check Task Status (Frontend)

Use the following helper function (to be implemented in a React hook) to determine if a running task has retroactively expired while the app was closed:

```typescript
function checkAndExpireTasks(tasks: Task[], completeTaskMutation: (args: { taskId: string }) => void) {
  const now = Date.now();
  tasks.forEach(task => {
    if (task.status === 'In Progress' && task.timerLastStartedAt && task.timerDuration) {
      const elapsedSinceStart = Math.floor((now - task.timerLastStartedAt) / 1000);
      const totalElapsed = (task.timerElapsed || 0) + elapsedSinceStart;
      
      if (totalElapsed >= task.timerDuration) {
        // Trigger Convex mutation to mark task as Done
        completeTaskMutation({ taskId: task._id });
      }
    }
  });
}
```

## Component Usage

When rendering tasks:
1. **Filter tasks dynamically**: Paused tasks should map to the "All Tasks" group, NOT "In Progress".
2. **Render Completed Tasks**: Render "Done" tasks using `FlashList` or `FlatList` grouped by the day of `completionDate` for performance.
3. **Timer Interface**: Upon setting a `timerDuration`, the UI should immediately reveal the circular timer interface, derived from the `timerDuration` field being present.