# Tasks: Add Reminder Screen

**Input**: Design documents from `specs/001-add-reminder-screen/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Manual verification via `quickstart.md` and `spec.md` acceptance scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Create initial route file `app/add-reminder.tsx` with basic component structure
- [x] T002 [P] Export new translation keys for "Add Reminder", "Title", "Date", "Time", "Save", "Cancel" in `assets/locales/en.json` and `assets/locales/ar.json` (Implemented in `utils/i18n.ts`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Ensure `Todo` (Reminder) interface in `types/todo.ts` supports `dueDate` (number) and `status` (string) (Verified in `convex/schema.ts`)
- [x] T004 Verify Convex schema in `convex/schema.ts` has a `todos` table with `text` (string), `dueDate` (number), and `status` (string)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Reminder Entry (Priority: P1) 🎯 MVP

**Goal**: Users can enter a title, pick a date/time, and save a reminder to the backend.

**Independent Test**: Open the "Add Reminder" screen, enter "Doctor Appointment", select a future date and time, and tap "Save". The app should return to the Dashboard and the task should be visible in the list.

### Implementation for User Story 1

- [x] T005 [US1] Create the styled layout for `app/add-reminder.tsx` using `useTheme` and `useTranslation`
- [x] T006 [US1] Implement title text input with auto-focus in `app/add-reminder.tsx`
- [x] T007 [US1] Integrate `@react-native-community/datetimepicker` for Date selection in `app/add-reminder.tsx`
- [x] T008 [US1] Integrate `@react-native-community/datetimepicker` for Time selection in `app/add-reminder.tsx`
- [x] T009 [US1] Implement `useMutation` to persist the reminder to Convex in `app/add-reminder.tsx`
- [x] T010 [US1] Implement navigation back to the Dashboard after successful save in `app/add-reminder.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Validation & Feedback (Priority: P2)

**Goal**: Prevent invalid data and warn about duplicates.

**Independent Test**: Attempt to save with an empty title (button should be disabled). Attempt to save a duplicate reminder (warning modal should appear).

### Implementation for User Story 2

- [x] T011 [US2] Implement button-disabled state when title is empty in `app/add-reminder.tsx`
- [x] T012 [US2] Implement duplicate detection logic and show a warning modal before saving in `app/add-reminder.tsx`
- [x] T013 [US2] Add validation logic to the date/time picker to prevent selecting past times in `app/add-reminder.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T014 [P] Implement programmatic scroll-to-bottom for the title input to prevent keyboard occlusion in `app/add-reminder.tsx`
- [x] T015 [P] Audit and refine Layout/Icons for Arabic RTL support on the new screen in `app/add-reminder.tsx`
- [x] T016 [P] Add Haptic Feedback (`expo-haptics`) on successful reminder save in `app/add-reminder.tsx`
- [x] T017 Run final verification against `quickstart.md` scenarios

---

## Phase 6: Refinements (Post-Clarification)

**Purpose**: Align with specific clarifications made during the session.

- [x] T018 [US1] Remove default date from state to force explicit user selection in `app/add-reminder.tsx`
- [x] T019 [US1] Implement nearest-minute rounding logic for `dueDate` in `app/add-reminder.tsx`
- [x] T020 [US2] Update Arabic duplicate alert string to "هل تريد إنشاؤه على أي حال؟" in `app/add-reminder.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Phase 5)**: Depends on all desired user stories being complete
- **Refinements (Phase 6)**: Final tweaks after core logic is solid.

### Parallel Opportunities

- T001 and T002 can run in parallel.
- Once Phase 2 is done, US1 and US2 implementation can proceed in parallel if needed (though sequential is safer for a single file).
- All Polish tasks (T014-T016) can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: Verify a reminder can be created and saved.
4. Proceed to US2.
