# Phase 1: Data Model

## Overview
This phase does not introduce new tables or columns to the Convex database. Instead, it defines strict behavioral constraints on existing fields in the `todos` collection to correctly handle elapsed time and status transitions.

## Existing Schema Constraints to Enforce

### `todos` Collection
- **`timerDuration` (number)**: Total allowed time in milliseconds.
- **`timerStartTime` (number)**: The epoch timestamp when the timer was most recently started.
- **`timeLeftAtPause` (number)**: The remaining time in milliseconds when the timer was paused.

## Behavioral Rules

1. **Duration Edit (Running Task)**
   When `timerDuration` is updated on an `in_progress` task, the elapsed time (`Date.now() - timerStartTime`) must remain constant. To do this, no changes to `timerStartTime` are actually needed, but we must recalculate scheduled notifications to trigger at the new end time. The front-end or notification layer must clear and reschedule the push notification if the duration changes.

2. **Duration Edit (Paused Task)**
   When `timerDuration` is updated on a `paused` task, `timeLeftAtPause` must be adjusted by the exact difference in the duration.
   `newTimeLeftAtPause = Math.max(0, oldTimeLeftAtPause + (newDuration - oldDuration))`

3. **Status Transitions (`not_done` to `in_progress`)**
   When `startTimer` is called, if the status is `paused` OR `not_done`, and `timeLeftAtPause` is set, the system MUST use `timeLeftAtPause` to calculate the `timerStartTime`.
   `newStartTime = Date.now() - (timerDuration - timeLeftAtPause)`

## Migrations
No data migrations are required since the schema is unchanged.
