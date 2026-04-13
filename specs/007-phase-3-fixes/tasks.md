# Tasks: Phase 3 UI/UX - Input & Navigation

**Input**: Design documents from `/specs/007-phase-3-fixes/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup & Foundational

**Purpose**: Project initialization and basic verification before UI changes

- [X] T001 Verify project compiles and runs locally (`npx tsc --noEmit`) before making UI changes

---

## Phase 2: User Story 1 - Confirm Task Details with Keyboard Open (Priority: P1)

**Goal**: Allow users to confirm task title/timer changes without dismissing the keyboard first.

**Independent Test**: Open a task, edit the title, and tap the confirm button while the keyboard is open to save changes in a single action.

### Implementation for User Story 1

- [X] T002 [US1] Remove `onBlur={saveText}` from the Title `TextInput` in `components/TaskDetailModal.tsx` to prevent save conflicts.
- [X] T003 [US1] Set `blurOnSubmit={false}` on the Title `TextInput` in `components/TaskDetailModal.tsx` so the keyboard stays open when submitting if needed.
- [X] T004 [US1] Set `keyboardShouldPersistTaps="handled"` on the wrapping `ScrollView` in `components/TaskDetailModal.tsx` to ensure button taps are registered immediately.
- [X] T005 [US1] Add a dedicated Confirm/Save button attached to the top edge of the keyboard in `components/TaskDetailModal.tsx` that calls the save function.
- [X] T006 [US1] Update the save logic in `components/TaskDetailModal.tsx` to revert to the previous valid title if the user clears the title completely and hits confirm.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 3: User Story 3 - Create Subtasks from Detail Modal (Priority: P1)

**Goal**: Restore the ability to create subtasks from the task detail modal context.

**Independent Test**: Open task detail, enter subtask name, add it, verify it appears in the list with "not_started" status.

### Implementation for User Story 3

- [X] T007 [US3] Update the `addTodo` mutation call inside `components/TaskDetailModal.tsx` when adding a subtask to explicitly pass `status: "not_started"`.
- [X] T008 [US3] Ensure the newly created subtask correctly appears in the UI list within `components/TaskDetailModal.tsx`.

**Checkpoint**: User Stories 1 AND 3 should both work independently.

---

## Phase 4: User Story 2 - Write Notes Unobstructed by Keyboard (Priority: P2)

**Goal**: Allow writing/editing long notes without the keyboard covering the text in the note-detail view.

**Independent Test**: Type a long note in `app/note-detail.tsx` and verify the text input remains visible above the keyboard.

### Implementation for User Story 2

- [X] T009 [P] [US2] Wrap the main container in `app/note-detail.tsx` with a `KeyboardAvoidingView` configured with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`.
- [X] T010 [US2] Adjust `keyboardVerticalOffset` in `app/note-detail.tsx` appropriately to prevent layout jumping.
- [X] T011 [US2] Ensure tapping outside the text area in `app/note-detail.tsx` dismisses the keyboard immediately (e.g., using `TouchableWithoutFeedback` with `Keyboard.dismiss`).

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation.

- [X] T012 Run TypeScript compiler (`npx tsc --noEmit`) to verify no type errors were introduced in `components/TaskDetailModal.tsx` or `app/note-detail.tsx`.
- [X] T013 Verify the implementation meets the specification's acceptance criteria using `specs/007-phase-3-fixes/quickstart.md`.
- [X] T014 Execute Speckit post-hooks if `.specify/extensions.yml` exists.