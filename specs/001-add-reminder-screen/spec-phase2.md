# Feature Specification: Add Reminder Screen (Phase 2: User Flow Definition)

**Feature Branch**: `001-add-reminder-screen`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: PLAN.md Phase 2: Map how users move into, through, and out of the Add Reminder screen.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Standard Creation Path (Priority: P1)

As a user, I want to initiate a reminder from the Dashboard, fill in the details, and return to see it in my list.

**Why this priority**: Primary happy path for the feature.

**Independent Test**: Navigate to Dashboard > Tap 'Add' > fill "Test" > Save > Observe redirection to Dashboard and new item presence.

**Acceptance Scenarios**:

1. **Given** the user is on the Dashboard or Planner, **When** they tap the 'Add Reminder' button, **Then** the Add Reminder screen is pushed onto the navigation stack.
2. **Given** the Add Reminder screen is active, **When** the user completes the form and taps 'Save', **Then** the screen pops from the stack and the underlying list (Dashboard/Planner) refreshes.

---

### User Story 2 - Cancellation & Flow Abandonment (Priority: P2)

As a user, I want to be able to leave the creation screen if I change my mind, ensuring no partial data is saved.

**Why this priority**: Essential for user control and data hygiene.

**Independent Test**: Enter some text, tap 'Cancel', and verify the screen closes and no new task appears in the backend.

**Acceptance Scenarios**:

1. **Given** the user has entered text or changed dates, **When** they tap 'Close' or 'Cancel', **Then** the system pops the screen and discards the draft.
2. **Given** the form is entirely empty, **When** the user navigates back, **Then** the screen closes without a confirmation prompt.

## Flow Steps

1. **Entry**: User taps FAB or "Add Reminder" button in Header.
2. **Input**: Title field auto-focuses. User types title.
3. **Selection**: User taps Date/Time fields to open platform-native spinners.
4. **Validation**: "Save" button enables once a non-empty title is present.
5. **Completion**: User taps "Save". System performs backend mutation.
6. **Exit**: Screen closes (Navigator pop). Return to previous view.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-201**: System MUST support entry from both the Dashboard tab and the Planner tab.
- **FR-202**: System MUST use a modal or stack push transition for the screen entry.
- **FR-203**: System MUST auto-focus the title input upon screen entry.
- **FR-204**: System MUST perform an optimistic update or a clean refresh upon return to the previous screen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-201**: 100% of successful "Save" actions return the user to their starting screen (Dashboard or Planner).
- **SC-202**: 100% of "Cancel" actions result in zero data persistence.

## Assumptions

- **Navigation Logic**: The app uses `expo-router` for stack management.
- **Auth State**: User is authenticated before reaching this screen.
