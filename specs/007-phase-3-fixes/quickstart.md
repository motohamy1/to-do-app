# Phase 1: Quickstart & Testing Guide

## Overview
This document outlines how to manually test and verify the UI/UX fixes implemented in Phase 3.

## Environment Setup
1. Start the Expo development server: `npx expo start`
2. Run the application on an iOS Simulator and an Android Emulator, or physical devices (this is crucial for keyboard behavior).

## Verification Steps

### 1. Confirm Button with Keyboard Open
1. Open a task to view the `TaskDetailModal`.
2. Tap on the task title to edit it. The keyboard will open.
3. Observe the Confirm/Save button. It should be fully visible.
4. Tap the Confirm/Save button.
5. **Expected Outcome**: The task title updates immediately and the keyboard can either close or stay open based on UX, but the save action must trigger on the *first tap* without requiring a tap to dismiss the keyboard first.

### 2. Note Detail Keyboard Avoidance
1. Navigate to the note-detail screen for any task.
2. Begin typing a long note that exceeds the screen height.
3. **Expected Outcome**: As you reach the bottom of the screen, the `KeyboardAvoidingView` should push the text area up. The active cursor and the text you are typing must never be hidden behind the keyboard. Verify this on both iOS and Android.

### 3. Subtask Creation from Modal
1. Open a task to view the `TaskDetailModal`.
2. Scroll to the subtasks section.
3. Type a name for a new subtask and submit/add it.
4. **Expected Outcome**: The subtask is created successfully, appears in the list within the modal, and explicitly has the status "not_started".