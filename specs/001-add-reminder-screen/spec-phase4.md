# Feature Specification: Add Reminder Screen (Phase 4: Interaction & State)

**Feature Branch**: `001-add-reminder-screen`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: PLAN.md Phase 4: Describe how the screen behaves in response to user actions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Smart Title Validation (Priority: P1)

As a user, I want the "Save" button to only be active when I have provided a title, so I don't accidentally save an empty reminder.

**Why this priority**: Prevent empty data.

**Independent Test**: Remove all text from the title, tap "Save", and ensure nothing happens (button disabled).

**Acceptance Scenarios**:

1. **Given** the user is typing, **When** the title is empty (including whitespace), **Then** the "Save" button in the footer is visually muted and non-responsive.
2. **Given** at least one non-whitespace character in the title, **When** searching for the save button, **Then** it is visually active and clickable.

---

### User Story 2 - Future-Only Date/Time Selection (Priority: P2)

As a user, I want the system to prevent me from accidentally scheduling a reminder in the past, which would lead to immediate notification errors.

**Why this priority**: Correctness of notifications.

**Independent Test**: Attempt to select a date and time 5 minutes in the past. Ensure the system defaults back to "now" or prevents the selection.

**Acceptance Scenarios**:

1. **Given** the user is opening the date picker, **When** they look at past dates, **Then** those dates are grayed out or the picker snaps back to the current date.
2. **Given** a current date, **When** the user selects a time in the past, **Then** the system provides a warning or resets the time to the nearest future-valid interval.

## State Transitions

- **Initial State**: Empty title, Date = None (must be picked), Time = current + 1 hour (default).
- **Editing State**: Keyboard open, cursor in title field, date/time pickers closed.
- **Picker State**: Native Date/Time UI overlay visible, screen dimmed or blurred (platform dependent).
- **Saving State**: Button shows a loading spinner, inputs are disabled.
- **Error State**: Red border or tooltip for invalid fields (e.g., duplicate title).
- **Duplicate Warning State**: A native `Alert` appears asking for "هل تريد إنشاؤه على أي حال؟".


## Requirements *(mandatory)*

### Functional Requirements

- **FR-401**: System MUST perform a duplicate check against the backend when save is tapped using a native `Alert`.
- **FR-402**: System MUST use native spinners to provide the most familiar interaction pattern.
- **FR-403**: System MUST provide haptic feedback upon successful creation.
- **FR-404**: System MUST ensure that the date and time selection is future-only.
- **FR-405**: System MUST round timestamps to the nearest whole minute.


## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-401**: Zero "empty title" reminders stored in the database via this screen.
- **SC-402**: Average time to resolve a "duplicate reminder" warning is under 5 seconds.

## Assumptions

- **Time Precision**: Precision is required down to the minute.
- **DatePicker Implementation**: Uses `@react-native-community/datetimepicker`.
