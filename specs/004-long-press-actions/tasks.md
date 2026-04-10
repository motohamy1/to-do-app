---
description: "Task list for feature implementation"
---

# Tasks: Long Press Action Fixes

**Input**: Design documents from `/specs/004-long-press-actions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] Add localization keys (`longPressActions.*`, `alerts.*`) to `utils/i18n.ts` and language files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Implement `deleteProject` atomic mutation in `convex/projects.ts` handling resource/checklist cleanup and task unlinking
- [x] T003 Implement `deleteSubCategory` atomic mutation in `convex/projects.ts` handling cascading deletion of child projects
- [x] T004 Verify/update `deleteTodo` mutation in `convex/todos.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manage Projects and Sub-Categories via Long Press (Priority: P1) 🎯 MVP

**Goal**: Users can edit details, share projects, or delete them without navigating deep into menus.

**Independent Test**: Can be independently tested by navigating to the Projects tab, long-pressing a project or sub-category, and successfully triggering the edit modal, share sheet, or delete confirmation dialog.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create a generic Action Sheet or utilize existing modal for Project/Sub-Category long-press actions in `components/ProjectCard.tsx`
- [x] T006 [P] [US1] Implement native `Share` integration for projects in `components/ProjectCard.tsx`
- [x] T007 [US1] Add `onLongPress` wrapper to Project/Sub-Category items in `components/ProjectCard.tsx` to trigger the Action Sheet
- [x] T008 [US1] Connect "Edit" action to the appropriate project/sub-category edit modal
- [x] T009 [US1] Connect "Delete" action to `deleteProject` and `deleteSubCategory` mutations with localized `Alert.alert` confirmation

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Manage Tasks via Long Press Across All Screens (Priority: P1)

**Goal**: Consistent long-press task actions (Edit, Link Project, Share, Delete) across Main, Planner, Add Page, and Project Details.

**Independent Test**: Can be tested by creating a task and long-pressing it from the Main page, Planner page, and Add page to ensure the same functional action modal appears.

### Implementation for User Story 2

- [x] T010 [P] [US2] Enhance task sharing payload to include sub-items and full checklist contents in `components/TodoCard.tsx`
- [x] T011 [P] [US2] Update project linking modal (e.g. `components/TaskDetailModal.tsx` or separate modal) to include an explicit "Unlink" or "None" option
- [x] T012 [US2] Add `onLongPress` to `components/TodoCard.tsx` across the app to invoke the Task Action Modal
- [x] T013 [US2] Connect "Edit", "Link Project", "Share", and "Delete" actions in the Task Action Modal to their respective handlers

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Safe Destructive Actions (Priority: P2)

**Goal**: Users need a safeguard against accidental deletions for any entity.

**Independent Test**: Can be tested by attempting to delete any entity and verifying that a localized confirmation dialog is presented before the deletion occurs.

### Implementation for User Story 3

- [x] T014 [US3] Ensure `Alert.alert` localized confirmations are strictly integrated for Task deletion in Task Detail Modals (`components/TaskDetailModal.tsx`)
- [x] T015 [US3] Verify offline mutation queuing gracefully handles long-press deletions

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T016 [P] Verify optimistic UI properly hides deleted sub-categories immediately while background cascade runs
- [x] T017 Code cleanup and refactoring in `components/TodoCard.tsx` and `components/ProjectCard.tsx`