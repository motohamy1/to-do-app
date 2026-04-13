# Phase 1: Interface Contracts

## Context
Since this feature revolves around UI bug fixes, the contracts define the expected behavior of the UI components and the arguments passed to existing hooks.

## UI Component Behaviors

### `TaskDetailModal.tsx`
1. **Title TextInput**:
   - `blurOnSubmit`: `false`
   - `onSubmitEditing`: Calls save function.
   - Removed `onBlur` autosave to prevent conflicts.

2. **ScrollView Wrapping Modal Content**:
   - `keyboardShouldPersistTaps`: `"handled"`

3. **Confirm Button**:
   - **Visibility**: Always visible or dynamically visible when the title/timer is being edited.
   - **Interaction**: Must trigger the save function on the first tap while the keyboard is open.

### `app/note-detail.tsx`
1. **KeyboardAvoidingView**:
   - `behavior`: `Platform.OS === 'ios' ? 'padding' : 'height'`
   - `keyboardVerticalOffset`: Tuned per platform to ensure the text input is never obscured.

## Backend Mutation Calls
- **`addTodo`**: Must be invoked with `status: "not_started"` when creating a subtask inside the `TaskDetailModal.tsx`.