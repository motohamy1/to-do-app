# Phase 1: Quickstart & Testing

## Overview
This document outlines the testing procedures to verify the Phase 2 fixes for timer and status logic.

## Prerequisites
1. Ensure the Expo development server is running (`npx expo start`).
2. Ensure the Convex backend is running (`npx convex dev`).
3. Connect a physical device or emulator to test push notifications and UI changes.

## Verification Scenarios

### Scenario 1: Timer Duration Edit (Preserves Elapsed Time)
**Objective**: Ensure changing the total duration of an active or paused timer does not lose tracked time.
1. Open a task and set a timer for 10 minutes.
2. Start the timer and wait for 1 minute (or pause it after 1 minute).
3. Tap "Change Timer" and update the duration to 20 minutes.
4. **Verification**: The timer should now show ~19 minutes remaining, rather than resetting to 20. The elapsed 1 minute must be preserved.

### Scenario 2: Immediate Timer Start from Modal
**Objective**: Ensure the timer starts immediately when "In Progress" is tapped in the modal.
1. Open a task that has a set duration but is currently `not_started`.
2. Tap the "In Progress" status pill.
3. **Verification**: The timer should immediately begin counting down inside the modal, without requiring the user to close and reopen the modal or tap the Play button explicitly.

### Scenario 3: Resume Task After Day Ends
**Objective**: Ensure resuming a paused task that rolled over to `not_done` works correctly.
1. Create a task, set a timer, start it, and then pause it.
2. Manually change the task's status to `not_done` (simulating the end-of-day rollover) either via UI if possible, or directly in the Convex dashboard.
3. Tap the Play/Resume button on the task.
4. **Verification**: The task should transition to `in_progress` and the timer should resume counting from where it was paused, instead of resetting the timer completely.

## Final Sign-off
After successful manual verification, check the server logs in Convex dashboard to ensure no unexpected errors are thrown during the `setTimer` and `startTimer` mutations.
