# Feature Specification: Add Reminder Screen (Phase 1: Discovery & Intent)

**Feature Branch**: `001-add-reminder-screen`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "Discovery & Intent for the Add Reminder screen: Define user needs, entry points, and success criteria for a focused reminder creation experience."

## Clarifications

### Session 2026-04-01

- Q: What should happen if a user attempts to create a reminder with the exact same title and time? → A: Warn User (Option B): Highlight that a similar reminder exists before saving.
- Q: Should the screen allow the user to select and save a date/time that has already passed? → A: Disallow Past (Option B): Only current and future dates are valid.
- Q: When entering from the Dashboard or Planner, what should be the default date? → A: No Default (Option C): Force user to pick a date manually.
- Q: How should the timestamp seconds be handled? → A: Nearest Rounding (Option C): Round to the nearest whole minute.
- Q: Clarify the Arabic phrasing for the duplicate warning. → A: Correct to "هل تريد إنشاؤه على أي حال؟" (create it anyway).
- Q: Is reminder editing out of scope for this branch? → A: Strictly Out (Option A).
- Q: Should the duplicate warning be an Alert or inline? → A: Native Alert (Option A).




## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Appointment/Reminder Entry (Priority: P1)

As a busy user, I want to quickly capture a task with a specific date and time so that I don't forget it, without being distracted by other complex features.

**Why this priority**: This is the core engine of the reminder feature. Without a fast, reliable way to entry data, the utility of the app drops significantly.

**Independent Test**: Can be tested by navigating to the "Add Reminder" screen, entering "Doctor Appointment", selecting tomorrow at 10:00 AM, and hitting "Save". The app should return to the previous screen and the task should be visible in the list.

**Acceptance Scenarios**:

1. **Given** the user is on the Dashboard, **When** they tap the "Add Reminder" entry point, **Then** a dedicated, empty creation screen appears.
2. **Given** a valid title and date/time are entered, **When** the user taps "Save", **Then** the reminder is persisted and the user is navigated back to the Dashboard.
3. **Given** a partially filled form, **When** the user taps "Cancel" or "Back", **Then** the system prompts for confirmation if changes will be lost (or simply discards if empty).

---

### User Story 2 - Immediate Feedback and Validation (Priority: P2)

As a user, I want to know immediately if I've made an error (like forgetting a title) so that I can correct it before trying to save.

**Why this priority**: Good UX prevents frustration. Validation ensures data integrity.

**Independent Test**: Attempt to save a reminder with an empty title. The save button should be disabled or an error message should appear.

**Acceptance Scenarios**:

1. **Given** an empty title input, **When** looking at the action footer, **Then** the "Save" button is visually disabled.
2. **Given** an invalid date (e.g., in the past if not allowed), **When** selecting the date, **Then** the system provides a visual cue or prevents selection of past times.

---

### Edge Cases

- **Keyboard Occlusion**: What happens when the user is typing the title on a small Android device? The system MUST ensure the date/time selectors and the save button remain accessible or scrollable.
- **Arabic Localization (RTL)**: How does the layout handle Right-to-Left orientation for Arabic users? Icon positions and text alignment MUST flip correctly.
- **Empty State**: What does the screen look like the first time it opens? Default values (e.g., Today, current hour + 1) SHOULD be pre-selected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a high-focus text input for the reminder title.
- **FR-002**: System MUST integrate native platform Date and Time pickers (iOS/Android).
- **FR-003**: System MUST prevent saving a reminder with an empty title.
- **FR-004**: System MUST allow users to cancel and return to the previous screen without saving.
- **FR-005**: All UI labels and placeholders MUST be localized for English and Arabic.
- **FR-006**: The screen MUST adapt its layout for RTL (Right-to-Left) languages automatically.
- **FR-007**: System MUST persist the reminder to the remote backend upon successful submission.
- **FR-008**: System MUST detect identical title and timestamp pairs and warn the user before saving a potential duplicate.
- **FR-009**: System MUST prevent the selection or saving of a reminder date/time that is in the past.




### Key Entities

- **Reminder**: Represents a future task. Attributes: `text` (String), `dueDate` (Timestamp), `status` (Enum), `userId` (ID).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete the "Add Reminder" flow (from entry point to saved state) in under 15 seconds on average.
- **SC-002**: 100% of reminders saved via this screen correctly trigger the established notification logic (if enabled).
- **SC-003**: Zero reports of "keyboard covering the save button" on supported Android devices.
- **SC-004**: 100% parity in functionality between English and Arabic localizations.

## Assumptions

- **Existing Infrastructure**: Uses the existing application hooks for theme, translation, and authentication.
- **Platform Parity**: Uses platform-native date and time picker components for a seamless feel.
- **Single Source of Truth**: Reminders are stored using the common task data schema.

- **Navigation**: Accessed via a new button on the Dashboard or Planner tabs.
