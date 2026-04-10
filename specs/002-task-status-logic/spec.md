# Feature Specification: Task Status Logic Fixes

**Feature Branch**: `002-task-status-logic`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "Implement Phase 1: Task Status Logic Fixes from fix01.md"

## Clarifications

### Session 2026-04-10

- Q: Are both 'Not Started' and 'Not Done' statuses used? → A: 'Not Started' is for future tasks, 'Not Done' is for present/overdue tasks.
- Q: How to handle expired timers while the app is closed? → A: Calculate elapsed time on next app launch and transition retroactively.
- Q: What happens if you resume a timer for a past-due task? → A: Resumes normally, task remains "In Progress" despite past due date.
- Q: How to handle >50 completed tasks in the scroll list? → A: Display all completed tasks using a virtualized/lazy-loaded list.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clear New Task Status (Priority: P1)

As a user, when I create a new task, I want to clearly see that it is pending action (not done) and visually highlighted, so that it grabs my attention.

**Why this priority**: Essential for the core task creation flow to clearly indicate to users what needs attention.

**Independent Test**: Can be independently tested by creating a new task and verifying its initial status and card styling.

**Acceptance Scenarios**:

1. **Given** I am on the main task view, **When** I add a new task, **Then** it appears with a "Not Done" badge and a distinctive lemon green border.
2. **Given** a newly created task, **When** its scheduled due date passes, **Then** its status does not automatically or unexpectedly change unless I take action or a timer expires.

---

### User Story 2 - Logical Paused Task Handling (Priority: P1)

As a user, when I pause a running task timer, I want the task to return to a neutral state and move out of my "In Progress" view, so that I only see actively running tasks in that filter.

**Why this priority**: Critical for accurate task categorization and keeping the user focused on truly active work.

**Independent Test**: Can be tested by starting a task timer, pausing it, and checking the task's filter categorization and visual styling.

**Acceptance Scenarios**:

1. **Given** a task is running and showing in "In Progress", **When** I pause the timer, **Then** the task card resets to a neutral color styling.
2. **Given** a paused task, **When** I view my task filters, **Then** the task is no longer listed under "In Progress" and is properly categorized under "All tasks".

---

### User Story 3 - Automatic Timer Completion (Priority: P1)

As a user, when my task timer reaches zero, I want the task to automatically be marked as completed and moved to the Done section, so I don't have to manually update it.

**Why this priority**: Automating completion reduces friction and builds trust in the timer mechanism.

**Independent Test**: Can be tested by letting a task timer expire and observing the resulting state and categorization.

**Acceptance Scenarios**:

1. **Given** a running task timer, **When** the timer completes (reaches 0), **Then** the task is automatically marked as "Done".
2. **Given** an automatically completed task, **When** I view my tasks, **Then** the task immediately appears in the appropriate completed section.

---

### User Story 4 - Viewing Completed Tasks by Day (Priority: P2)

As a user, I want to see my completed tasks logically grouped by the day they were finished, separated from pending tasks, and properly integrated into both the main and Planner views.

**Why this priority**: Helps users reflect on past achievements and maintains an organized visual history of work.

**Independent Test**: Can be tested by completing tasks on different days and checking the layout in both the main dashboard and Planner tab.

**Acceptance Scenarios**:

1. **Given** multiple completed tasks from different days, **When** I view the main dashboard, **Then** they appear in a "Done" section organized by day, presented in a horizontally scrolling list.
2. **Given** past completed tasks, **When** I view "Tasks for Today", **Then** completed tasks from previous days do not incorrectly appear there.
3. **Given** I view the Planner, **When** I look at a specific day, **Then** completed tasks for that day are visible under a designated "completed" sub-section.

---

### User Story 5 - Immediate Timer Visibility (Priority: P2)

As a user, when I set a duration for a task timer, I want to immediately see the circular timer interface, so that I know the timer is ready to run without needing to reopen the task.

**Why this priority**: Provides immediate feedback, improving the user experience and interaction flow.

**Independent Test**: Can be tested by setting a timer duration and verifying the UI updates immediately.

**Acceptance Scenarios**:

1. **Given** I am configuring a task, **When** I set a timer duration and save, **Then** the circular timer interface appears immediately on the task card.

### Edge Cases

- **Resuming past-due tasks**: If a user pauses a timer, changes the due date to yesterday, and resumes, the timer resumes normally and the task remains "In Progress" without blocking.
- **Expired timer while app closed**: System calculates elapsed time upon the next app launch and transitions the task to "Done" retroactively if the timer expired during the offline period.
- **Large volume of completed tasks**: If there are many completed tasks on a single day, the horizontal list will display all of them using a virtualized/lazy-loaded component to ensure performance does not degrade.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST default newly created tasks scheduled for today or past dates to a "Not Done" state (with visual emphasis), while future tasks default to "Not Started".
- **FR-002**: System MUST automatically update a task's status to "Done" when its associated timer expires.
- **FR-003**: System MUST categorize paused tasks in a neutral "All Tasks" group rather than "In Progress".
- **FR-004**: System MUST display completed tasks separated by completion day in the main view using a horizontally scrollable component.
- **FR-005**: System MUST display completed tasks under their original completion day in the Planner view.
- **FR-006**: System MUST show the timer interface immediately after a user sets a timer duration.
- **FR-007**: System MUST NOT automatically transition a task's status to "Not Done" solely based on an expired due date.

### Key Entities

- **Task**: Represents a single item of work, with properties including status (not started [future tasks], not done [present/overdue tasks], in progress, paused, done), scheduled date, and completion date.
- **Timer**: Represents the active duration tracking associated with a task, holding properties like time remaining and running state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created tasks visibly display as "Not Done" and require explicit user action to start.
- **SC-002**: 100% of tasks with expired timers transition to "Done" automatically without manual intervention.
- **SC-003**: Users can successfully locate completed tasks grouped by day in both the main view and Planner, without any completed tasks appearing in "Tasks for Today" unless completed today.
- **SC-004**: Pausing a task immediately removes it from the active/in-progress visual state and categorization.

## Assumptions

- Users are familiar with basic task management concepts (Not Started, In Progress, Paused, Done).
- The application already has a data persistence layer for tracking task state and timestamps.
- Existing task cards have support for dynamic UI styling (borders, badges, colors) based on the task's state.
- The Planner view already exists and supports grouped daily task visualization.