# Feature Specification: Phase 3 UI/UX - Input & Navigation

**Feature Branch**: `007-phase-3-fixes`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "phase 3 from @fix02.md after deep understand it"

## Clarifications

### Session 2026-04-12

- Q: What should happen if the user clears the title completely and taps the confirm button? → A: Revert to the previous valid title and close the keyboard
- Q: Where exactly should the new confirm button be positioned when the keyboard is open? → A: Attached directly to the top edge of the keyboard
- Q: If the user taps outside the text area in the note-detail screen, what should happen to the keyboard? → A: The keyboard is dismissed immediately

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirm Task Details with Keyboard Open (Priority: P1)

Users need to be able to confirm changes to a task's title and timer settings without having to dismiss the keyboard first, reducing friction during task editing.

**Why this priority**: The keyboard blocking essential confirmation actions is a significant usability issue that frustrates users, interrupts their workflow, and makes saving changes cumbersome.

**Independent Test**: Can be fully tested by opening a task detail, editing the title while the keyboard is visible, and tapping a dedicated confirm button that remains accessible above the keyboard to save the changes in a single action.

**Acceptance Scenarios**:

1. **Given** a user is editing a task title or timer in the detail modal and the device keyboard is open, **When** they look at the screen, **Then** a confirm button must be clearly visible and accessible.
2. **Given** the device keyboard is open and the confirm button is visible, **When** the user taps the confirm button, **Then** the changes are saved successfully without requiring a separate, preceding tap to dismiss the keyboard.

---

### User Story 2 - Write Notes Unobstructed by Keyboard (Priority: P2)

Users need to be able to write and edit long notes in the note-detail view without the keyboard covering the text they are actively typing.

**Why this priority**: The core functionality of taking task-related notes is severely impacted if users cannot see the bottom lines of text they are typing.

**Independent Test**: Can be fully tested by navigating to the note-detail page, typing enough text to reach the bottom of the screen, and verifying that the view automatically scrolls or adjusts its layout so the active text input area is never hidden by the keyboard.

**Acceptance Scenarios**:

1. **Given** a user is typing a long entry on the note-detail page, **When** the text reaches the lower portion of the screen where the keyboard sits, **Then** the text input area must dynamically adjust its position so the active line remains fully visible above the keyboard.

---

### User Story 3 - Create Subtasks from Detail Modal (Priority: P1)

Users need to be able to successfully create new subtasks directly from the task detail modal.

**Why this priority**: Subtask creation within the task detail modal is currently broken. Fixing this restores the ability for users to break down their tasks effectively without leaving the context of the main task view.

**Independent Test**: Can be fully tested by opening a task detail, entering a subtask name into the subtask creation input, and adding it, then verifying it appears correctly in the subtask list.

**Acceptance Scenarios**:

1. **Given** a user is viewing a task in the task detail modal, **When** they enter a new subtask name and submit it, **Then** the subtask is created successfully and explicitly defaults to a "not started" status.
2. **Given** a user has created a subtask from the modal, **When** the modal reloads or the user returns to it, **Then** the new subtask is visibly listed under the parent task.

---

### Edge Cases

- What happens if the user attempts to confirm an empty task title while the keyboard is open? (Expected: The system will revert to the previous valid title and close the keyboard).
- How does the system handle extremely long notes when the keyboard is toggled open and closed repeatedly? (Expected: The scroll position is maintained smoothly without jumping erratically).
- What happens if the network is disconnected when the user tries to create a subtask from the modal? (Expected: The subtask creation request is cached locally and the UI reflects the expected state immediately, synchronizing when the network returns).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an explicit confirm button attached directly to the top edge of the device keyboard in the task detail modal whenever the keyboard is active.
- **FR-002**: The system MUST register interactions with the confirm button on the first tap, overriding default behaviors that would otherwise just dismiss the keyboard.
- **FR-003**: The system MUST dynamically adjust the viewport layout in the note-detail screen to ensure the keyboard never obscures the active text input area.
- **FR-003b**: The system MUST immediately dismiss the keyboard if the user taps outside the text input area in the note-detail screen.
- **FR-004**: The system MUST successfully process subtask creation requests originating from the task detail modal.
- **FR-005**: The system MUST explicitly assign a default status of "not started" to all subtasks created from the task detail modal.

### Key Entities

- **Task / Subtask**: Inherits existing fields. When created from the modal, its relationship to the parent task must be preserved and its initial state explicitly defined.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can save edits to a task while the keyboard is open in a single tap, eliminating the previous two-tap requirement.
- **SC-002**: 100% of actively typed text in the note-detail page remains visible above the keyboard at all times across varying screen sizes.
- **SC-003**: 100% success rate for creating subtasks directly from the task detail modal interface.

## Assumptions

- Target mobile platforms (iOS and Android) support standard viewport adjustment behaviors that can be leveraged without custom native code.
- The confirm button design will natively follow the application's existing visual design language.
- Subtasks created from the modal are governed by the same data structure constraints as tasks/subtasks created from the main list views.