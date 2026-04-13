# Phase 0: Research & Unknowns

## Context
This document resolves technical unknowns for the "Phase 3 UI/UX - Input & Navigation" feature.

## Investigated Areas

### 1. Keyboard Blocking Confirm Button
- **Issue**: The confirm button is inaccessible or non-responsive when the keyboard is open. Users have to dismiss the keyboard first.
- **Root Cause**: The scroll view dismisses the keyboard on tap, and `blurOnSubmit` might be set to `true`. Also, `onBlur` might be handling the save action, conflicting with an explicit "Save" button press.
- **Solution**: 
  - Remove `onBlur={saveText}` from the title input.
  - Add a dedicated confirm button that floats above the keyboard or is part of an `InputAccessoryView` (or simply placed intelligently with absolute positioning and high z-index).
  - Set `keyboardShouldPersistTaps="handled"` on the `ScrollView` or wrapping touchable area so that the button tap is registered immediately.
  - Set `blurOnSubmit={false}` on the `TextInput`.

### 2. Keyboard Obscuring Notes Input
- **Issue**: In `app/note-detail.tsx`, the keyboard covers the text area when writing long notes.
- **Root Cause**: Missing or improperly configured `KeyboardAvoidingView`.
- **Solution**: Wrap the main view in `KeyboardAvoidingView`. Use `behavior="padding"` for iOS and `behavior="height"` for Android. Configure `keyboardVerticalOffset` based on the platform and headers (e.g., `0` for iOS, `-110` or appropriate value for Android).

### 3. Subtask Creation Logic
- **Issue**: Adding a subtask from the task detail modal fails or behaves incorrectly.
- **Root Cause**: The `addTodo` mutation is likely called without an explicit `status` field, or the component state management for new subtasks is flawed.
- **Solution**: Ensure the `addTodo` mutation explicitly passes `status: "not_started"` when creating a subtask from `TaskDetailModal.tsx`, as previously established in Phase 1 that new subtasks must be `not_started`.

## Conclusion
The technical path is clear and entirely UI-focused. No new libraries are required; native React Native components (`KeyboardAvoidingView`, `ScrollView` props) and the existing Convex mutation (`addTodo`) will be used.