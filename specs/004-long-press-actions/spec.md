# Feature Specification: Long Press Action Fixes

**Feature Branch**: `004-long-press-actions`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: User description: "Phase 3 from fix01.md"

## Clarifications

### Session 2026-04-10
- Q: Task Unlinking via Link Project → A: The "Link Project" modal should include a clear "Unlink" or "None" option.
- Q: Category Deletions Scope → A: Exclude Category deletions from this phase; focus only on Sub-Categories and Projects.
- Q: Share Action Data Format → A: Share all details including sub-items and full checklist contents.
- Q: UI Feedback during Cascade Deletions → A: Rely on optimistic UI updates; hide the item immediately and process deletion in the background.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Projects and Sub-Categories via Long Press (Priority: P1)

Users need to manage their projects and sub-categories efficiently by long-pressing items on the Projects page. This allows them to edit details, share projects, or delete them without navigating deep into menus.

**Why this priority**: Core management features are currently broken or unwired, preventing users from organizing or cleaning up their project structures.

**Independent Test**: Can be independently tested by navigating to the Projects tab, long-pressing a project or sub-category, and successfully triggering the edit modal, share sheet, or delete confirmation dialog.

**Acceptance Scenarios**:

1. **Given** the user is on the Projects tab, **When** they long-press a Sub-Category and tap "Edit", **Then** the edit modal should appear.
2. **Given** the user is on the Projects tab, **When** they long-press a Project and tap "Share", **Then** the native share sheet should open with project details.
3. **Given** the user is on the Projects tab, **When** they long-press a Sub-Category and tap "Delete", **Then** a confirmation dialog should appear, and upon confirming, the sub-category and all its child projects should be deleted.
4. **Given** the user is on the Projects tab, **When** they delete a Project, **Then** all associated resources and checklists are deleted, and tasks linked to it are unlinked (not deleted).

---

### User Story 2 - Manage Tasks via Long Press Across All Screens (Priority: P1)

Users expect a consistent experience when long-pressing a task regardless of which screen they are on (Main, Planner, Add Page, or Project Details). The action modal should provide options to Edit, Link to Project, Share, or Delete the task.

**Why this priority**: Task management is the core of the app. Inconsistent or broken task actions across different screens disrupt the user workflow.

**Independent Test**: Can be tested by creating a task and long-pressing it from the Main page, Planner page, and Add page to ensure the same functional action modal appears.

**Acceptance Scenarios**:

1. **Given** the user is on the Main or Planner page, **When** they long-press a task, **Then** an action modal with Edit, Link Project, Share, and Delete options appears.
2. **Given** the user selects "Link Project" from the long-press menu, **Then** the project linking modal should open for that task, providing an explicit "Unlink" or "None" option.
3. **Given** the user selects "Delete" from the task long-press menu or detail modal, **Then** a confirmation dialog appears, and upon confirming, the task is deleted.

---

### User Story 3 - Safe Destructive Actions (Priority: P2)

Users need a safeguard against accidental deletions. Any long-press action that deletes data (Task, Resource, Project, or Sub-Category) must require explicit confirmation.

**Why this priority**: Accidental data loss causes severe user frustration. It's essential but slightly less critical than getting the actions wired in the first place.

**Independent Test**: Can be tested by attempting to delete any entity and verifying that a localized confirmation dialog is presented before the deletion occurs.

**Acceptance Scenarios**:

1. **Given** the user selects a "Delete" action for any item, **When** the action is triggered, **Then** a localized alert dialog (e.g., Arabic/English) asks for confirmation.
2. **Given** the confirmation dialog is open, **When** the user taps "Cancel", **Then** no data is deleted and the menu closes.

### Edge Cases

- What happens when a user deletes a sub-category containing dozens of projects? The app will rely on optimistic UI updates to hide the item immediately, while the complex cascade deletion runs securely in the background.
- How does the system handle sharing when the device has no configured sharing targets (e.g., simulators)? It should degrade gracefully without crashing.
- What happens if a user long-presses an item while offline? The UI should still show the modal, but offline mutations must queue properly to execute when back online.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide fully functional "Delete", "Edit", and "Share" options when long-pressing a Sub-Category.
- **FR-002**: System MUST provide fully functional "Delete", "Edit", and "Share" options when long-pressing a Project (both in Category and Sub-Category views).
- **FR-003**: System MUST execute a cascade delete when a Sub-Category is deleted: removing all its projects, project resources, and project checklists, and unlinking all associated tasks.
- **FR-004**: System MUST execute a cascade delete when a Project is deleted: removing its resources and checklists, and unlinking all associated tasks.
- **FR-005**: System MUST show the standard Task Action Modal (Edit, Link Project, Share, Delete) when a task is long-pressed on the Main page, Planner page, and Add page.
- **FR-006**: System MUST provide a functional "Delete" option for tasks and resources within the Task/Project Detail Modals.
- **FR-007**: System MUST display a localized (English/Arabic) confirmation alert before executing any delete action.
- **FR-008**: System MUST format shared payload to include all item details, including sub-items and full checklist contents.

### Key Entities

- **Category**: Top-level grouping. Excluded from long-press deletions in this phase.
- **Task (Todo)**: The central item to be managed. Can be unlinked from projects if the parent project is deleted.
- **Project**: Contains resources and checklists. Links to tasks. Deleting it cleans up its children and unlinks tasks.
- **Sub-Category**: Groups multiple projects. Deleting it cascades deletion to all contained projects.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of "empty" or unwired long-press actions identified in the Phase 3 audit are functional.
- **SC-002**: Cascade deletions complete successfully without leaving orphaned project resources or checklists in the database.
- **SC-003**: No app crashes occur when performing long-press actions on any of the designated screens.
- **SC-004**: All destructive actions require exactly one explicit user confirmation step before data is mutated.

## Assumptions

- The app uses an existing offline mutation system that handles network connectivity states.
- The UI framework provides native capabilities for confirmation dialogs and sharing.
- Localization is accessible and previously implemented.
