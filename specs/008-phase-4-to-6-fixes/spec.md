# Feature Specification: Phases 4 to 6 UI and Notification fixes

**Feature Branch**: `008-phase-4-to-6-fixes`
**Created**: 2026-04-12
**Status**: Draft
**Input**: User description: "Phases 4 to 6 UI and Notification fixes"

## Clarifications

### Session 2026-04-12

- Q: If the user's device is set to silent/vibrate mode when the custom notification sound is supposed to play, should the notification bypass the silent mode or respect it? → A: Respect the device's silent/vibrate settings (standard behavior).
- Q: What happens if a selected custom notification sound file is missing or fails to load on the device? Should it fall back to the system default silently? → A: Fall back to the system default sound silently.
- Q: How does the system handle tasks that are marked as "done" offline and then synced; do they correctly disappear from the "Today" view once the sync resolves? → A: They disappear immediately locally and sync in the background.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Active Tasks Focus in Today View (Priority: P1)

As a user, I want the "Today" section to only display tasks that are not yet completed, and I want the general task filter to be called "To-Do" (showing only active tasks), so that I can focus purely on pending work without being distracted by tasks I have already finished.

**Why this priority**: Core productivity hinges on focusing on what needs to be done. Mixing completed tasks with active ones creates mental clutter and reduces the utility of the "Today" view.

**Independent Test**: Can be tested independently by marking a task as done and verifying it immediately disappears from the "Today" section and "To-Do" filter, moving exclusively to a completed/done section.

**Acceptance Scenarios**:

1. **Given** a task scheduled for today is marked as "done", **When** viewing the "Today" list, **Then** the task should not appear in the "Today" section but should appear in the "Done" section.
2. **Given** the user opens the filter menu, **When** viewing the available filters, **Then** the previous "All" filter should be renamed to "To-Do" (or the localized equivalent, e.g., "المهام" in Arabic).
3. **Given** the "To-Do" filter is active, **When** viewing the task list, **Then** only active tasks (status "not_started" and "not_done") should be visible, and "done" tasks must be hidden.

---

### User Story 2 - Accessible Floating Action Button (Priority: P2)

As a user, I want a prominent, floating "Add Task" button consistently visible at the bottom-right of my screen, rather than a text link at the end of my task list, so that I can quickly add new tasks without having to scroll to the bottom.

**Why this priority**: Adding tasks is the most frequent action in a to-do app. Reducing the friction to add a task by making the button universally accessible improves the overall user experience significantly.

**Independent Test**: Can be tested independently by opening the app, seeing the new floating button, and tapping it to ensure it opens the task creation interface.

**Acceptance Scenarios**:

1. **Given** the user is viewing the main task list, **When** they look at the bottom right corner, **Then** they should see a circular, lemon-green floating action button with a dark plus icon.
2. **Given** the floating action button is visible, **When** the user taps it, **Then** the task creation interface (Task Detail Modal) should open immediately.
3. **Given** a long list of tasks, **When** the user scrolls, **Then** the floating action button must remain fixed in the bottom-right corner of the screen.

---

### User Story 3 - Customizable Notification Sounds (Priority: P3)

As a user, I want the ability to choose my preferred notification sound from a settings menu, rather than being forced to use a hardcoded alarm sound, so that my task timer alerts suit my personal preference.

**Why this priority**: While not critical to core task management, personalization of alerts is a highly requested feature that significantly enhances user satisfaction, especially for features like timers that interrupt the user.

**Independent Test**: Can be tested independently by navigating to settings, changing the sound preference, and waiting for a timer to finish to hear the newly selected sound.

**Acceptance Scenarios**:

1. **Given** the user navigates to the Settings screen, **When** viewing the options, **Then** there should be a setting to choose the notification sound (e.g., Default, Alarm Tone, Chime).
2. **Given** the user selects a new notification sound in Settings, **When** a task timer completes, **Then** the notification should play the newly selected sound instead of the default.
3. **Given** the app is closed and reopened, **When** checking the notification settings, **Then** the user's previously selected sound preference should be remembered.

### Edge Cases

- If the user's device is set to silent/vibrate mode, the notification must respect the device's settings (standard behavior) and not play out loud.
- If a selected custom notification sound file is missing or fails to load, the system must fall back to the system default sound silently.
- When tasks are marked as "done" offline, they must disappear immediately from the "Today" view locally and sync their status in the background.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST filter out tasks with status "done" from the "Today" display section.
- **FR-002**: System MUST rename the "All" filter label to "To-Do" (and preserve Arabic localization "المهام").
- **FR-003**: System MUST ensure the "To-Do" filter strictly displays only tasks that are NOT "done" (i.e., "not_started" or "not_done").
- **FR-004**: System MUST render a Floating Action Button (FAB) anchored to the bottom-right corner of the main task list screen.
- **FR-005**: System MUST open the task creation modal/interface when the FAB is pressed.
- **FR-006**: System MUST provide a UI in the settings for the user to select their preferred timer notification sound.
- **FR-007**: System MUST persist the user's notification sound preference across app sessions.
- **FR-008**: System MUST schedule local notifications using the specific sound file chosen by the user.

### Key Entities

- **Task (Todo)**: The core entity. Its `status` field directly dictates visibility in the "Today" section and "To-Do" filter.
- **User Preferences**: A key-value store (e.g., AsyncStorage) that holds the user's chosen notification sound identifier.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of "done" tasks are successfully hidden from the "Today" view and "To-Do" filter.
- **SC-002**: Task creation initiation time is reduced (users don't need to scroll to the bottom to find the add button).
- **SC-003**: Users can successfully change and save their notification sound preference, and the new sound plays on timer completion.

## Assumptions

- We assume the existing UI framework supports fixed positioning for the Floating Action Button without interfering with safe area insets.
- We assume that the local notification library (Expo Notifications) supports specifying custom sound files or built-in system sounds dynamically during channel creation and notification scheduling on both iOS and Android.
- We assume that the required sound files (if custom) are already bundled with the app assets, or we are relying on system-provided sounds like 'default'.