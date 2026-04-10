# Tasks: Phase 2 - Notification System Improvements

**Input**: Design documents from `specs/003-phase-2-notification/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Review feature specifications and implementation plan in `specs/003-phase-2-notification/plan.md`
- [x] T002 Update `app.json` to include `expo-notifications` and `expo-task-manager` plugins

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Create `utils/notifications.ts` and set up standard deterministic identifier helpers (`getTimerNotificationId`, etc.)
- [x] T004 Create `hooks/useNotifications.ts` for managing notification permission requests and current status
- [x] T005 Integrate `hooks/useNotifications.ts` into `app/_layout.tsx` to request permissions gracefully on launch

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Reliable Timer Completion Notification (Priority: P1) 🎯 MVP

**Goal**: Receive a reliable notification the moment the timer reaches zero, even if the app is in the background.

**Independent Test**: Start a short 1-minute timer, background the app, and wait. The notification must appear exactly when the timer hits 0.

### Implementation for User Story 1

- [x] T006 [P] [US1] Implement `scheduleTimerCompletion` and `cancelTaskNotification` in `utils/notifications.ts`
- [x] T007 [US1] Update `hooks/useTaskTimers.ts` to invoke `scheduleTimerCompletion` when a timer starts or resumes
- [x] T008 [US1] Update `hooks/useTaskTimers.ts` to invoke `cancelTaskNotification` when a timer is paused, reset, or the task is deleted
- [x] T009 [US1] Ensure `scheduleTimerCompletion` correctly handles channels and drops deprecated `sticky` / `autoDismiss` properties

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Morning Reminder for Due Tasks (Priority: P1) 🎯 MVP

**Goal**: Daily morning summary at 9:00 AM of tasks scheduled for today.

**Independent Test**: Set device time to 8:59 AM with tasks scheduled for today that are not done. Wait 1 minute and receive the correct summary notification.

### Implementation for User Story 2

- [x] T010 [P] [US2] Implement `scheduleMorningReminder` function in `utils/notifications.ts`
- [x] T011 [US2] Update `app/_layout.tsx` (or a dedicated app state hook) to invoke `scheduleMorningReminder` upon app resume/foreground
- [x] T012 [US2] Update `components/TodoCard.tsx` and `components/TodoInput.tsx` to recalculate morning reminders after task modifications

**Checkpoint**: At this point, User Story 2 should be fully functional and testable independently

---

## Phase 5: User Story 3 - Evening Summary for Missed Tasks (Priority: P1) 🎯 MVP

**Goal**: Evening summary at 8:00 PM of tasks that were overdue or explicitly marked 'not done'.

**Independent Test**: Set device time to 7:59 PM with a mix of overdue tasks and 'not done' tasks. Wait 1 minute and verify the notification accurately counts both categories.

### Implementation for User Story 3

- [x] T013 [P] [US3] Implement `scheduleEveningReminder` function in `utils/notifications.ts`
- [x] T014 [US3] Update `app/_layout.tsx` (or a dedicated app state hook) to invoke `scheduleEveningReminder` upon app resume/foreground
- [x] T015 [US3] Update task modification logic in `components/TodoCard.tsx` to trigger a recalculation of the evening reminder

**Checkpoint**: All P1 user stories should now be independently functional

---

## Phase 6: User Story 4 - Timer Controls in Notification Center (Priority: P2)

**Goal**: Pause, resume, or reset the timer directly from the notification center without having to open the app.

**Independent Test**: Trigger a timer notification, swipe down the OS notification center, and tap the 'Pause' action button. Verify the timer pauses in the app.

### Implementation for User Story 4

- [x] T016 [P] [US4] Define `NOTIFICATION_CATEGORIES` and `TIMER_ACTIONS` (Pause, Resume, Reset) in `utils/notifications.ts`
- [x] T017 [US4] Register `TIMER_ACTIVE` category via `Notifications.setNotificationCategoryAsync` in `app/_layout.tsx`
- [x] T018 [US4] Setup a background task via `TaskManager.defineTask` in `app/_layout.tsx` (or a new file `utils/backgroundTask.ts` imported there)
- [x] T019 [US4] Configure `ConvexHttpClient` inside the background task and execute `api.todos.updateTaskTimer` per action data
- [x] T020 [US4] Map the background task to notification actions via `Notifications.registerTaskAsync` in `app/_layout.tsx`

---

## Phase 7: User Story 5 - Persistent Timer Running Notification (Priority: P3)

**Goal**: See an ongoing notification while a timer is actively counting down, showing the expected completion time.

**Independent Test**: Start a timer and immediately check the notification center to see the ongoing persistent notification.

### Implementation for User Story 5

- [x] T021 [P] [US5] Update `scheduleTimerCompletion` in `utils/notifications.ts` to pass the `TIMER_ACTIVE` category to show expected completion context

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T022 [P] Integrate translations (`i18n.ts`) for notification action buttons and titles during category registration in `app/_layout.tsx`
- [x] T023 [P] Update `hooks/useTaskTimers.ts` to silently fallback to in-app visual timers if notifications are denied (graceful degradation)
- [x] T024 Validate that the background task safely ignores deleted tasks and dismisses notifications without crashing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5, P1)**: All depend on Foundational phase completion
  - Can proceed in parallel
- **User Stories (Phase 6-7, P2/P3)**: Can start after Foundational phase, but might build off US1 (Phase 3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- Foundational tasks (e.g., creating `utils/notifications.ts`) can run concurrently with Setup configurations.
- All P1 User Stories (US1, US2, US3) can be worked on in parallel by different developers once foundations are built.
- Within US4, defining actions can happen in parallel with basic UI bindings.

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3, 4, 5: User Stories 1, 2, 3
4. **STOP and VALIDATE**: Test core reliable timer notifications and daily summaries.
5. Deploy/demo MVP.

### Incremental Delivery

1. Complete Setup + Foundational
2. Implement US1 → Test Timer Completion → Release
3. Implement US2 & US3 → Test Daily Reminders → Release
4. Implement US4 → Test Interactive Notification Buttons → Release
5. Implement US5 → Test Persistent Notification Details → Release