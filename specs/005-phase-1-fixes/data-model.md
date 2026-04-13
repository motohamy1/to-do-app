# Phase 1: Data Model

## Backend Changes (Convex)
- Update `tasks:create` and `tasks:createSubtask` mutations to explicitly enforce `status: "not started"` when the `status` field is omitted or undefined in the payload.

## Frontend State (Offline Cache)
- Adjust the `useCachedTasks` or equivalent custom hook to immediately read from `AsyncStorage`. Ensure the cached data structure maps exactly to what the UI components expect before Convex fetches return.

## Notifications Payload
- Modify the notification scheduling interface to require the `taskText` field, replacing the generic `undefined` text.