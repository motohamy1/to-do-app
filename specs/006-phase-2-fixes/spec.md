# Feature Specification: Phase 2 Timer and Status Logic Fixes

**Feature Branch**: `006-phase-2-fixes`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Phase 2 Timer and Status Logic fixes"

## Clarifications

### Session 2026-04-12

- Q: What happens if a user reduces the timer duration to be less than the already elapsed time? → A: Option A: Prevent saving a duration smaller than the elapsed time
- Q: How does the system handle concurrent edits to the timer from different devices? → A: Option A: Last-write-wins (latest request overwrites previous)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preserve Elapsed Time on Timer Edit (Priority: P1)

As a user, when I edit the total duration of a running or paused timer, the time I have already spent should be preserved, rather than the timer resetting from scratch. Furthermore, any scheduled notifications must respect the newly adjusted end time.

**Why this priority**: Preventing loss of tracked time is critical for a time-management application. Users expect duration adjustments to act as additions/subtractions to the total goal, not a complete reset.

**Independent Test**: Can be tested by starting a timer, waiting a few seconds, editing the total duration, and verifying that the remaining time accounts for the elapsed seconds and the notification fires at the correct updated time.

**Acceptance Scenarios**:

1. **Given** a task with a running timer, **When** the user increases the total duration by 10 minutes, **Then** the remaining time should increase by 10 minutes while keeping the elapsed time intact.
2. **Given** a task with a running timer, **When** the duration is changed, **Then** the previous completion notification is cancelled and a new one is scheduled for the correct new completion time.

---

### User Story 2 - Immediate Timer Start from Modal (Priority: P2)

As a user, when I change a task's status to "In Progress" from within the Task Detail Modal, the timer should begin immediately, and this state should be synced automatically with the task card.

**Why this priority**: Reduces friction. Users shouldn't need to exit the modal just to make the timer actually start running.

**Independent Test**: Can be tested by opening a task modal, tapping "In Progress", and observing the timer start counting down immediately both inside the modal and on the main task card without requiring a modal re-entry.

**Acceptance Scenarios**:

1. **Given** an open task detail modal for a task with a duration, **When** the user taps "In Progress", **Then** the timer starts immediately.
2. **Given** the timer was started from the modal, **When** the user closes the modal, **Then** the task card correctly displays the running timer.

---

### User Story 3 - Resume Task After Day Ends (Priority: P2)

As a user, if I leave a task paused at the end of the day (which automatically moves it to "not done" the next day), resuming it should correctly place it back into "in progress" status.

**Why this priority**: Fixes an inconsistent state where resuming a rollover task leaves it in the "not done" section, confusing the user about its actual state.

**Independent Test**: Can be tested by taking a paused task, simulating a day rollover so it becomes "not done", and then tapping to resume it to see if it correctly moves to "in progress".

**Acceptance Scenarios**:

1. **Given** a task is in "not done" status but has paused timer data, **When** the user resumes the task, **Then** the status updates to "in progress" and the timer continues from where it left off.

### Edge Cases

- **Reduced Timer Duration**: The system will prevent saving a duration smaller than the elapsed time to ensure data integrity.
- **Concurrent Edits**: The system handles concurrent timer edits using a last-write-wins approach (whichever request reaches the server last overwrites previous).
- What happens if a task is resumed after multiple days have passed?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST preserve the calculated elapsed time when a user edits the `timerDuration` of an `in_progress` or `paused` task.
- **FR-002**: The system MUST dynamically recalculate `timerStartTime` to reflect duration changes without losing tracked time.
- **FR-003**: The system MUST immediately trigger the `startTimer` action when a user sets a task to `in_progress` from the Task Detail Modal, provided a duration exists.
- **FR-004**: The system MUST transition a task to `in_progress` when it is resumed from a `not_done` state.

### Key Entities

- **Task (Todo)**: Represents a user's actionable item, storing status (`in_progress`, `paused`, `not_done`), `timerDuration`, `timerStartTime`, and `timeLeftAtPause`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of timer edits on running tasks accurately preserve the previously elapsed seconds.
- **SC-002**: 100% of tasks changed to "In Progress" via the modal instantly begin their countdown without further user interaction.
- **SC-003**: 0% of resumed tasks remain stuck in the "not done" section.

## Assumptions

- Users have a stable local clock for accurate elapsed time calculation.
- The `startTimer` mutation is safe to call directly from the modal's state update flow.
- The backend's time resolution (milliseconds) is sufficient for all recalculations.