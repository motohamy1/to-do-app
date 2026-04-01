# Data Model: Add Reminder Screen

**Feature Branch**: `001-add-reminder-screen`  
**Date**: 2026-04-01  

## Entity: Reminder (Internal Name: Todo)

Represents a future task to be reminded about.

| Attribute | Type | Description | Validation |
| :--- | :--- | :--- | :--- |
| `text` | `string` | The title/task description. | Non-empty, no leading/trailing whitespace. |
| `dueDate` | `number` | Unix timestamp in milliseconds. | MUST be >= Current Time + 1 minute. |
| `status` | `string` | Task lifecycle state. | Defaults to `"not_started"`. |
| `userId` | `string` | Owner reference. | Automatically provided by Backend Auth context. |
| `projectId`| `string?` | Optional category reference. | Not used in current MVP. |

## Uniqueness Logic

For the purpose of the **Duplicate Detection** feature:
A reminder is considered a potential duplicate if it matches an existing record's `text` **and** its `dueDate` (nearest-minute match).

## State Transitions

1. **Unsaved Draft**: Local React state held in `useState`. Destroyed on exit/cancel.
2. **Persisted**: Written to Convex `todos` table. Read by Dashboard and Planner.
3. **Completed**: Status updated to `"done"` (out of scope for current branch).
