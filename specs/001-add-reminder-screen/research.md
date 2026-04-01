# Research: Add Reminder Screen

**Feature Branch**: `001-add-reminder-screen`  
**Date**: 2026-04-01  

## Decision 1: Forced Date Selection
- **Decision**: No default date. The user MUST explicitly select a date before the "Save" button is enabled.
- **Rationale**: Setting a default of "Today" can lead to accidental "immediate" reminders when the user might have intended a different day. Forcing a choice ensures clear intent.
- **Alternatives considered**: 
  - **Fixed Today**: Fast but prone to errors.
  - **Contextual**: Use the Planner's current date (rejected for simplicity and consistent behavior).

## Decision 2: Nearest Minute Rounding
- **Decision**: Set the Unix timestamp's seconds and milliseconds to exactly 0 (or round the nearest whole minute).
- **Rationale**: Humans pick time down to the minute. Fractional minutes in the database can cause off-by-one errors in notification logic or querying.
- **Alternatives considered**: 
  - **Dynamic Seconds**: Leads to non-predictable triggers.

## Decision 3: Native Alert for Duplicates
- **Decision**: Trigger a blocking `Alert.alert` with two options: "Cancel" and "Create Anyway".
- **Rationale**: High-contrast, platform-standard way to interrupt a flow without introducing custom UI complexity.
- **Alternatives considered**: 
  - **Inline Warning**: Easily missed by fast typists.

## Decision 4: Haptic Feedback Integration
- **Decision**: Use `expo-haptics` during the successful creation flow.
- **Rationale**: Elevates the app from "functional" to "premium" by providing tactile confirmation.
- **Alternatives considered**: 
  - **Visual Only**: Standard, but feels less refined.
