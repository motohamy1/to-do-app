# Phase 1: Data Model

## Data Types

### Task

```typescript
type TaskStatus = 'Not Started' | 'Not Done' | 'In Progress' | 'Paused' | 'Done';

interface Task {
  _id: string; // Document ID (Id<"tasks"> in Convex)
  _creationTime: number; // Unix timestamp
  title: string;
  status: TaskStatus;
  scheduledDate: number; // Unix timestamp
  completionDate?: number; // Unix timestamp, only present if status is 'Done'
  timerDuration?: number; // Total duration in seconds
  timerElapsed?: number; // Elapsed time in seconds when paused
  timerLastStartedAt?: number; // Unix timestamp when the timer was last resumed
}
```

## State Machine Transitions

1. **Creation**:
   - IF `scheduledDate` > today: `status` = `'Not Started'`
   - IF `scheduledDate` <= today: `status` = `'Not Done'`
2. **Start Timer**:
   - `status` changes to `'In Progress'`
   - `timerLastStartedAt` set to current timestamp.
3. **Pause Timer**:
   - `status` changes to `'Paused'`
   - `timerElapsed` += (current timestamp - `timerLastStartedAt`)
   - `timerLastStartedAt` = `undefined`
4. **Complete Task (Manual or Timer Expiry)**:
   - `status` changes to `'Done'`
   - `completionDate` = current timestamp.

## Convex Schema Changes

- Update the `tasks` schema to support the new `'Not Done'` status in the union of allowed statuses.