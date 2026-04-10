# Tasks: Task Status Logic Fixes

**Input**: Design documents from `specs/002-task-status-logic/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and context readiness

- [x] T001 Review feature specifications and implementation plan in `specs/002-task-status-logic/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Update `TaskStatus` type and `Task` interface in `convex/schema.ts`
- [x] T003 [P] Update `tasks` table schema in `convex/schema.ts` to include `'Not Done'` status
- [x] T004 Update `createTask`, `updateTaskStatus`, `startTimer`, `pauseTimer`, and `completeTask` mutations in `convex/tasks.ts` to support new fields

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Clear New Task Status (Priority: P1) 🎯 MVP

**Goal**: Visually differentiate new tasks based on scheduled date and highlight 'Not Done' tasks.

**Independent Test**: Can be independently tested by creating a new task and verifying its initial status and card styling.

### Implementation for User Story 1

- [x] T005 [P] [US1] Implement date-based status logic in `createTask` mutation in `convex/tasks.ts`
- [x] T006 [P] [US1] Add localization keys for "Not Done", "Not Started", "Paused" in the translation files
- [x] T007 [US1] Update `components/TodoCard.tsx` to display 'Not Done' badge and lemon green border using `useTheme`
- [x] T008 [US1] Apply `useTranslation` for new status labels in `components/TodoCard.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Logical Paused Task Handling (Priority: P1)

**Goal**: Paused tasks return to a neutral state and move out of "In Progress" view.

**Independent Test**: Can be tested by starting a task timer, pausing it, and checking the task's filter categorization and visual styling.

### Implementation for User Story 2

- [x] T009 [P] [US2] Update `components/TodoCard.tsx` to reset to neutral color styling when status is 'Paused'
- [x] T010 [US2] Update task filtering logic in `app/(tabs)/index.tsx` to exclude 'Paused' from "In Progress" list
- [x] T011 [US2] Ensure 'Paused' tasks appear in "All tasks" filter in `app/(tabs)/index.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Automatic Timer Completion (Priority: P1)

**Goal**: Tasks automatically complete when timer expires, even if app was closed.

**Independent Test**: Can be tested by letting a task timer expire and observing the resulting state and categorization.

### Implementation for User Story 3

- [x] T012 [P] [US3] Create `checkAndExpireTasks` helper function in a new file `hooks/useTaskTimers.ts`
- [x] T013 [US3] Integrate `useTaskTimers.ts` in `app/(tabs)/index.tsx` to calculate elapsed time on app mount/resume
- [x] T014 [US3] Update `components/TodoCard.tsx` to automatically call `completeTask` when an active timer reaches 0
- [x] T015 [US3] Ensure UI correctly moves automatically completed tasks to the "Done" section in `app/(tabs)/index.tsx`

**Checkpoint**: All P1 user stories should now be independently functional

---

## Phase 6: User Story 4 - Viewing Completed Tasks by Day (Priority: P2)

**Goal**: See completed tasks grouped by day in virtualized lists.

**Independent Test**: Can be tested by completing tasks on different days and checking the layout in both the main dashboard and Planner tab.

### Implementation for User Story 4

- [x] T016 [P] [US4] Implement `FlashList` or `FlatList` for horizontal "Done" section in `app/(tabs)/index.tsx`
- [x] T017 [US4] Group completed tasks by completion day in `app/(tabs)/index.tsx`
- [x] T018 [P] [US4] Update `app/(tabs)/planner.tsx` to show completed tasks under their original completion day
- [x] T019 [US4] Ensure past completed tasks are excluded from "Tasks for Today" in `app/(tabs)/index.tsx`

---

## Phase 7: User Story 5 - Immediate Timer Visibility (Priority: P2)

**Goal**: See timer interface immediately after setting duration.

**Independent Test**: Can be tested by setting a timer duration and verifying the UI updates immediately.

### Implementation for User Story 5

- [x] T020 [P] [US5] Update `components/TodoInput.tsx` to show circular timer when `timerDuration` is set before saving
- [x] T021 [US5] Ensure timer interface reflects in `components/TodoCard.tsx` instantly after task creation

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T022 [P] Verify keyboard-aware behavior and safe areas in `components/TodoInput.tsx` and `components/TimerModal.tsx`
- [x] T023 [P] Verify UI changes support both Light and Dark modes via `useTheme` in updated components
- [x] T024 Validate end-to-end task state transitions (Not Started -> In Progress -> Paused -> Done) across the app

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1/US2 but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2)
- **User Story 5 (P2)**: Can start after Foundational (Phase 2)

### Within Each User Story

- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch Foundational setup and translation tasks together:
Task: "Update TaskStatus type and Task interface in convex/schema.ts"
Task: "Add localization keys for 'Not Done', 'Not Started', 'Paused' in the translation files"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 & 2
   - Developer B: User Story 3
   - Developer C: User Story 4 & 5
3. Stories complete and integrate independently