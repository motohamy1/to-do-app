# Feature Specification: Notification System Improvements

**Feature Branch**: `003-phase-2-notification`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: User description: "Phase 2: Notification System Improvements"

## Clarifications

### Session 2026-04-10
- Q: Timer Timezone Changes → A: Timers use absolute time and fire exactly after the duration, ignoring timezone changes.
- Q: Daily Notifications on Force-Quit → A: Pre-scheduled notifications fire normally based on the last known device state.
- Q: Action on Deleted Task → A: The background task ignores the action and dismisses the notification.
- Q: Denied Notification Permissions → A: Silently fall back to in-app visual timers only; no system notifications.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Timer Completion Notification (Priority: P1)

As a user running a task timer, I want to receive a reliable notification the moment the timer reaches zero, so that I know my time block is complete even if the app is in the background.

**Why this priority**: Core functionality of a pomodoro/timer app. The current implementation sometimes fails silently due to deprecated push notification properties.

**Independent Test**: Start a short 1-minute timer, background the app, and wait. The notification must appear exactly when the timer hits 0.

**Acceptance Scenarios**:

1. **Given** an active timer is running, **When** the timer duration reaches 0, **Then** a system notification immediately triggers with the task title.
2. **Given** a timer is running, **When** the task is deleted or the timer is reset before 0, **Then** the scheduled notification is cancelled and does not fire.

---

### User Story 2 - Morning Reminder for Due Tasks (Priority: P1)

As a user, I want a daily morning summary at 9:00 AM of tasks scheduled for today, so that I can plan my day effectively.

**Why this priority**: Drives daily user engagement and helps users stay on track with their scheduled work.

**Independent Test**: Set device time to 8:59 AM with tasks scheduled for today that are not done. Wait 1 minute and receive the correct summary notification.

**Acceptance Scenarios**:

1. **Given** the user has tasks scheduled for today that are not 'done', **When** the time reaches 9:00 AM, **Then** a notification fires listing the count and titles of up to 3 due tasks.
2. **Given** the user has no tasks scheduled for today, **When** the time reaches 9:00 AM, **Then** no notification fires.

---

### User Story 3 - Evening Summary for Missed Tasks (Priority: P1)

As a user, I want an evening summary at 8:00 PM of tasks that were overdue or explicitly marked 'not done', so I know what needs to be rescheduled.

**Why this priority**: Helps users wrap up their day and prevents tasks from falling through the cracks.

**Independent Test**: Set device time to 7:59 PM with a mix of overdue tasks and 'not done' tasks. Wait 1 minute and verify the notification accurately counts both categories.

**Acceptance Scenarios**:

1. **Given** the user has overdue tasks (past date, not done) or tasks marked 'not done', **When** the time reaches 8:00 PM, **Then** a notification fires summarizing the count of overdue and/or not done tasks.
2. **Given** all tasks for the past and present are marked 'done', **When** the time reaches 8:00 PM, **Then** no notification fires.

---

### User Story 4 - Timer Controls in Notification Center (Priority: P2)

As a user with an active timer, I want to pause, resume, or reset the timer directly from the notification center without having to open the app.

**Why this priority**: Reduces friction for common timer actions, enhancing the UX, but not strictly required for the timer to function.

**Independent Test**: Trigger a timer notification, swipe down the OS notification center, and tap the 'Pause' action button. Verify the timer pauses in the app.

**Acceptance Scenarios**:

1. **Given** a timer notification is displayed, **When** the user taps "Pause", **Then** the active timer is paused in the background.
2. **Given** a paused timer notification is displayed, **When** the user taps "Resume", **Then** the timer resumes counting down.
3. **Given** a timer notification is displayed, **When** the user taps "Reset", **Then** the timer resets to its initial duration.

---

### User Story 5 - Persistent Timer Running Notification (Priority: P3)

As a user, I want to see an ongoing notification while a timer is actively counting down, showing the time remaining.

**Why this priority**: Optional enhancement. It is complex to implement reliably on all mobile platforms.

**Independent Test**: Start a timer and immediately check the notification center to see the ongoing persistent notification.

**Acceptance Scenarios**:

1. **Given** the user starts a timer, **When** the timer is running, **Then** a persistent notification shows the task name and time remaining, updating periodically.

### Edge Cases

- **Timer Timezone Changes**: Timers use absolute time and fire exactly after the duration, ignoring timezone changes.
- **Daily Notifications on Force-Quit**: Pre-scheduled OS-level notifications fire normally based on the last known device state before the app was closed.
- **Action on Deleted Task**: The background task safely ignores the action and dismisses the notification if the task was deleted on another device.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST reliably deliver a notification when a task timer reaches zero.
- **FR-002**: System MUST schedule a daily notification at 9:00 AM summarizing tasks due today (not done).
- **FR-003**: System MUST schedule a daily notification at 8:00 PM summarizing overdue tasks and tasks explicitly marked 'not done'.
- **FR-004**: System MUST cancel pending timer notifications if the corresponding task timer is reset, paused, or the task is deleted.
- **FR-005**: System MUST provide native notification action buttons (Pause, Resume, Reset) for timer-related notifications.
- **FR-006**: System MUST correctly handle the callbacks from native notification action buttons to update the timer state in the app.
- **FR-007**: System MUST use channel-based behavior for notifications and remove deprecated `sticky` and `autoDismiss` properties.
- **FR-008**: System MUST gracefully handle denied notification permissions by silently falling back to in-app visual timers without blocking the user.

### Key Entities

- **Task**: The core entity. Notifications depend on its `date`, `status`, and timer state.
- **NotificationSchedule**: Represents the scheduled delivery of a notification (Timer completion, Daily Morning, Daily Evening).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Timer completion notifications have a near 100% delivery rate when the app is backgrounded and the timer reaches 0.
- **SC-002**: Daily notifications (9 AM and 8 PM) trigger reliably on days where matching tasks exist.
- **SC-003**: Native action buttons (Pause/Resume/Reset) successfully update the timer state without requiring the user to bring the app to the foreground.

## Assumptions

- Operating system permissions for notifications are already granted by the user, or the app gracefully requests them.
- The device timezone and clock are accurate for daily 9 AM and 8 PM triggers.
- The Expo notifications library handles the background delivery mechanisms appropriately once scheduled correctly.