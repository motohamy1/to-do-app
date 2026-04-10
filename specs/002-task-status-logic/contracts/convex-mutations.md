# Phase 1: Interface Contracts

## Convex Backend Mutations & Queries

The frontend will interact with the Convex backend using the following expected mutations and queries:

### Queries

#### `getTasks`
- **Description**: Fetches all tasks for the user.
- **Arguments**: None (or user auth context).
- **Returns**: `Task[]`

### Mutations

#### `createTask`
- **Description**: Creates a new task.
- **Arguments**:
  - `title`: `string`
  - `scheduledDate`: `number`
  - `timerDuration` (optional): `number`
- **Behavior**: Sets initial `status` to `'Not Started'` or `'Not Done'` based on `scheduledDate`.

#### `updateTaskStatus`
- **Description**: Updates the status of an existing task.
- **Arguments**:
  - `taskId`: `string` (Id<"tasks">)
  - `status`: `TaskStatus`
- **Behavior**: Used for generic status transitions (e.g., from 'Not Done' to 'Not Started' if rescheduled).

#### `startTimer`
- **Description**: Starts or resumes a task's timer.
- **Arguments**:
  - `taskId`: `string`
- **Behavior**: Sets `status` to `'In Progress'` and `timerLastStartedAt` to the current timestamp.

#### `pauseTimer`
- **Description**: Pauses a running timer.
- **Arguments**:
  - `taskId`: `string`
- **Behavior**: Sets `status` to `'Paused'`, increments `timerElapsed` by `now - timerLastStartedAt`, and unsets `timerLastStartedAt`.

#### `completeTask`
- **Description**: Marks a task as done.
- **Arguments**:
  - `taskId`: `string`
- **Behavior**: Sets `status` to `'Done'` and records the `completionDate`.

### Assumptions
- Timestamps are provided and stored as Unix epoch time (milliseconds).
- Convex handles the server-side timestamp logic for mutations where appropriate (using `Date.now()`).