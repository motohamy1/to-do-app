# Tasks: Phase 1 Critical Data & Sync Fixes

**Input**: Design documents from `/specs/005-phase-1-fixes/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize branch and verify development environment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Verify location and current structure of offline storage hooks and Convex mutations

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - App Loads Quickly Without Internet (Priority: P1) 🎯 MVP

**Goal**: The app loads instantly using cached data even when offline, so that users can view tasks without waiting.

**Independent Test**: Can be tested by opening the app in airplane mode and confirming that cached tasks load immediately without a loading spinner.

### Implementation for User Story 1

- [X] T003 [P] [US1] Update `hooks/useOfflineQuery.ts` to immediately read and return `AsyncStorage` data synchronously on mount
- [X] T004 [US1] Implement automatic cache clearing and empty state when cached data parsing fails or is corrupted in `hooks/useOfflineQuery.ts`
- [X] T005 [US1] Remove blocking network request on initial load for cached lists in `hooks/useOfflineQuery.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Accurate Task Names in Notifications (Priority: P1)

**Goal**: Timer notifications display the actual name of the task instead of "undefined".

**Independent Test**: Can be tested by completing a timer for a specific task and verifying the notification text.

### Implementation for User Story 2

- [X] T006 [P] [US2] Update `utils/notifications.ts` (specifically `scheduleNotificationAsync` calls) to require and correctly pass the task's `text` property as the body of the notification
- [X] T007 [US2] Ensure that if a task is renamed while its timer is running, the scheduled notification is updated dynamically to show the new name in `utils/notifications.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Correct Default Status for New Tasks (Priority: P1)

**Goal**: New tasks and subtasks default to the "not started" state so they appear in the correct section.

**Independent Test**: Can be tested by creating a new task without specifying a status and verifying it appears in the "Not Started" section.

### Implementation for User Story 3

- [X] T008 [P] [US3] Update `convex/todos.ts` mutations (`create` and equivalent subtask mutations) to explicitly enforce `status: "not started"` when status is omitted
- [X] T009 [P] [US3] Update frontend UI components to explicitly set the status to "not started" when creating subtasks from the task detail modal
- [X] T010 [US3] Implement logic to mark the parent task as "in progress" and the new subtask as "not started" if a subtask is added to a "done" parent task

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T011 [P] Run quickstart.md validation steps for offline app load, timer notifications, and default status
- [X] T012 Code cleanup and verify backward compatibility
- [X] T013 Verify Constitution constraints (File-Based Routing, Theme Consistency, Multi-Language Support, Interaction Quality, Shared Backend Persistence)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- Once Foundational phase completes, User Stories 1, 2, and 3 can start in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Stories 1, 2 & 3

```bash
# Launch implementations for all stories together:
Task: "Update hooks/useOfflineQuery.ts to immediately read and return AsyncStorage data synchronously on mount"
Task: "Update utils/notifications.ts to require and correctly pass the task's text property"
Task: "Update convex/todos.ts mutations to explicitly enforce status: 'not started'"
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
5. Each story adds value without breaking previous stories
