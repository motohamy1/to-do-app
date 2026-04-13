# Tasks: Phase 4 to 6 UI and Notification fixes

**Input**: Design documents from `/specs/008-phase-4-to-6-fixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Run TypeScript compiler (`npx tsc --noEmit`) in repository root to verify baseline health

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [X] T002 [P] Create `utils/soundPreferences.ts` to manage device-specific notification sound settings via AsyncStorage

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Active Tasks Focus in Today View (Priority: P1) 🎯 MVP

**Goal**: "Today" section strictly displays non-completed tasks and general filter is renamed to "To-Do".

**Independent Test**: Mark a task as done and verify it immediately disappears from the "Today" section and "To-Do" filter.

### Implementation for User Story 1

- [X] T003 [US1] Modify `app/(tabs)/index.tsx` to explicitly exclude `t.status === 'done'` from the `today` array logic
- [X] T004 [US1] Update `app/(tabs)/index.tsx` to change the filter label from "All" to "To-Do" (and "المهام" for Arabic)
- [X] T005 [US1] Update `displayedTodos` memo in `app/(tabs)/index.tsx` to ensure the "To-Do" filter only shows active tasks

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Accessible Floating Action Button (Priority: P2)

**Goal**: A prominent, floating "Add Task" button is consistently visible at the bottom-right of the screen.

**Independent Test**: View the main task list, see the new FAB, and tap it to open the task creation modal.

### Implementation for User Story 2

- [X] T006 [P] [US2] Create `components/FloatingActionButton.tsx` with absolute positioning (`bottom: 24, right: 24`), applying `colors.primary` or `#D4F82D`
- [X] T007 [US2] Import and render `<FloatingActionButton>` in `app/(tabs)/index.tsx`
- [X] T008 [US2] Connect the FAB `onPress` in `app/(tabs)/index.tsx` to the existing task creation modal state (`isAdding` or similar)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Customizable Notification Sounds (Priority: P3)

**Goal**: Users can choose their preferred notification sound from a settings menu.

**Independent Test**: Navigate to settings, change the sound preference, and wait for a timer to finish to hear the selected sound.

### Implementation for User Story 3

- [X] T009 [P] [US3] Update `utils/notifications.ts` to export `updateNotificationSoundPreference(soundFile: string)` which recreates the Android channel
- [X] T010 [US3] Modify `scheduleTimerCompletion` in `utils/notifications.ts` to read the chosen sound from `utils/soundPreferences.ts`
- [X] T011 [US3] Update `requestPermissionsAsync` in `utils/notifications.ts` to initialize the channel with the saved sound preference
- [X] T012 [US3] Add a sound selection UI (picker or modal) in `app/(tabs)/settings.tsx` to choose between 'default' and 'alarm_tone.wav'
- [X] T013 [US3] Integrate `userSettings` Convex schema update in `convex/schema.ts` to optionally sync `notificationSound` (if user is authenticated)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T014 [P] Run TypeScript compiler (`npx tsc --noEmit`) in repository root to ensure no regressions
- [X] T015 Verify FAB respects keyboard and safe area insets across devices in `app/(tabs)/index.tsx`
- [X] T016 Run validation steps defined in `specs/008-phase-4-to-6-fixes/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS US3
- **User Stories (Phase 3+)**: US1 and US2 can start immediately after Setup. US3 depends on Phase 2.
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### Parallel Opportunities

- T002, T006, T009 can be executed in parallel as they touch different files.
- User Story 1 and User Story 2 can be worked on in parallel by different team members.
