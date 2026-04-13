# Feature Specification: Phase 1 Critical Data & Sync Fixes

**Feature Branch**: `005-phase-1-fixes`
**Created**: 2026-04-12
**Status**: Draft
**Input**: User description: "create spec to the phase 1 after reading @fix02.md"

## Clarifications
### Session 2026-04-12
- Q: What happens when the offline cached data is corrupted or invalid? → A: Clear cache automatically and show empty state until network returns
- Q: How does system handle notifications if a task was renamed while the timer was running? → A: Notification updates to show the new name dynamically
- Q: What happens if a subtask is created from a task that has already been marked as done? → A: Mark new subtask as "not started" and change Parent to "in progress"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - App Loads Quickly Without Internet (Priority: P1)

As a user, I want the app to load instantly using cached data even when offline, so that I can view my tasks without waiting for an internet connection.

**Why this priority**: It is a critical foundation for UX; a loading indicator blocking the app degrades the experience severely.

**Independent Test**: Can be tested by opening the app in airplane mode and confirming that cached tasks load immediately without a loading spinner.

**Acceptance Scenarios**:

1. **Given** the app has previously cached tasks, **When** I open the app without an internet connection, **Then** the tasks load immediately.
2. **Given** the app has previously cached tasks, **When** I open the app with a slow internet connection, **Then** the cached tasks are shown while fresh data fetches in the background.

---

### User Story 2 - Accurate Task Names in Notifications (Priority: P1)

As a user, I want my timer notifications to display the actual name of the task, so that I know exactly which task was completed.

**Why this priority**: Users rely on notifications to track timer completions; seeing "undefined" instead of the task name is confusing.

**Independent Test**: Can be tested by completing a timer for a specific task and verifying the notification text.

**Acceptance Scenarios**:

1. **Given** a task with a specific text, **When** the task's timer completes, **Then** the notification displays the task's text instead of "undefined".

---

### User Story 3 - Correct Default Status for New Tasks (Priority: P1)

As a user, I want new tasks I create to default to the "not started" state, so they appear in the correct section of my task list.

**Why this priority**: Tasks appearing in the wrong status bucket ("not done") misrepresents progress and confuses users.

**Independent Test**: Can be tested by creating a new task and verifying it appears in the "Not Started" section instead of the "not done" section.

**Acceptance Scenarios**:

1. **Given** the task input field, **When** I create a new task without specifying a status, **Then** the task is assigned the "not started" status.
2. **Given** a new task is created, **When** I view the task list, **Then** the task appears in the "Not Started" section.

### Edge Cases

- **Corrupted Cache:** If the offline cached data is corrupted or invalid, clear the cache automatically and show an empty state until the network returns.
- **Renamed Tasks During Timer:** If a task is renamed while its timer is running, the scheduled notification MUST be updated dynamically to show the new name.
- **Subtask in Done Task:** If a subtask is created from a task that has already been marked as done, mark the new subtask as "not started" and change the parent task to "in progress".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST synchronously load and display cached data before attempting a network fetch on initial load.
- **FR-002**: The system MUST use the correct task name field for timer completion notifications.
- **FR-003**: The system MUST ensure that any task creation calls that do not explicitly specify a status default to "not started".
- **FR-004**: The system MUST explicitly set the status to "not started" when creating subtasks from the task detail modal.

### Key Entities

- **Task**: Represents a single unit of work. Key attributes: text (the name of the task), status (e.g., "not started", "not done").
- **Notification**: Represents a system alert sent to the user when a timer completes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: App initial load time in offline mode is near-instant (under 0.5s) using cached data.
- **SC-002**: 100% of timer completion notifications display the correct task text instead of "undefined".
- **SC-003**: 100% of newly created tasks (both main tasks and subtasks) appear in the "Not Started" section by default.

## Assumptions

- Existing offline storage mechanism successfully returns the correct cached data format.
- All backend functions gracefully handle the "not started" default status.