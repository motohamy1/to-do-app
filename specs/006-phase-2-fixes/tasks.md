# Tasks: Phase 2 Timer and Status Logic fixes

**Input**: Design documents from `specs/006-phase-2-fixes/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/interfaces.md`, `quickstart.md`

## Phase 1: Setup

**Purpose**: Project initialization and basic structure

- [X] T001 Verify Expo and Convex development environments are running (no specific file)

## Phase 2: Foundational

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T002 Review `convex/todos.ts` and `components/TaskDetailModal.tsx` to understand current state
- [X] T003 [P] Verify clamping logic in `hooks/useTaskTimers.ts` correctly handles remaining time edge cases

## Phase 3: User Story 1 - Preserve Elapsed Time on Timer Edit (Priority: P1) 🎯 MVP

**Goal**: Preserve the already elapsed time when a user edits the total duration of a running or paused timer, rather than resetting from scratch. Handle edge cases (prevent smaller duration than elapsed).

**Independent Test**: Can be tested by starting a timer, waiting a few seconds, editing the total duration, and verifying that the remaining time accounts for the elapsed seconds and the notification fires at the correct updated time.

### Implementation for User Story 1

- [X] T004 [US1] Update `setTimer` mutation in `convex/todos.ts` to calculate `diff = args.duration - task.timerDuration`
- [X] T005 [US1] Adjust `timeLeftAtPause` by `diff` if task is `paused` in `convex/todos.ts`
- [X] T006 [US1] Prevent saving a duration smaller than the elapsed time in `convex/todos.ts` to handle "Reduced Timer Duration" edge case
- [X] T007 [US1] Ensure concurrent timer edits are handled gracefully using last-write-wins in `convex/todos.ts`
- [X] T008 [US1] Update `components/TaskDetailModal.tsx` and/or `utils/notifications.ts` to clear and reschedule push notifications if the duration of an active timer changes

## Phase 4: User Story 2 - Immediate Timer Start from Modal (Priority: P2)

**Goal**: When changing a task's status to "In Progress" from the modal, the timer begins immediately and syncs with the task card.

**Independent Test**: Can be tested by opening a task modal, tapping "In Progress", and observing the timer start counting down immediately both inside the modal and on the main task card.

### Implementation for User Story 2

- [X] T009 [P] [US2] Update `setStatus` handler in `components/TaskDetailModal.tsx` to check if `todo?.timerDuration > 0`
- [X] T010 [US2] Automatically trigger `startTimer({ id: currentTodoId })` when setting status to `in_progress` inside `components/TaskDetailModal.tsx`

## Phase 5: User Story 3 - Resume Task After Day Ends (Priority: P2)

**Goal**: Resuming a task that was paused but moved to "not done" at the end of the day should correctly place it back into "in progress" status and preserve elapsed time.

**Independent Test**: Can be tested by taking a paused task, simulating a day rollover so it becomes "not done", and then tapping to resume it to see if it correctly moves to "in progress".

### Implementation for User Story 3

- [X] T011 [P] [US3] Update `startTimer` mutation in `convex/todos.ts` to allow resuming if `status` is `paused` OR `not_done`
- [X] T012 [US3] Calculate `newStartTime = Date.now() - (todo.timerDuration - todo.timeLeftAtPause)` when resuming from `not_done` inside `convex/todos.ts`

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, cleanup, and validation across all stories

- [X] T013 Run TypeScript compiler using `npx tsc --noEmit` in terminal to verify no type errors were introduced
- [X] T014 Run through Quickstart scenarios to validate all acceptance criteria manually via Expo app

## Dependencies

- **US1** depends on Foundational tasks.
- **US2** can be implemented parallel to US1.
- **US3** depends on US1 (`setTimer` adjustments might relate, but mostly independent backend mutation changes).
- **Polish** depends on all User Stories being completed.

## Implementation Strategy

1. Begin with US1 (MVP) as it is the most critical fix for data integrity.
2. Proceed to US2 and US3, which enhance user experience and fix edge case bugs.
3. Conduct final polish and comprehensive testing of timer behaviors.