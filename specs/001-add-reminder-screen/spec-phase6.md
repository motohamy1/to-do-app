# Feature Specification: Add Reminder Screen (Phase 6: Implementation Mapping)

**Feature Branch**: `001-add-reminder-screen`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: PLAN.md Phase 6: Translate specs into implementation-ready guidance.

## Component Structure

- **`app/add-reminder.tsx`**: Main Screen / Route component.
- **`components/Layout`**: (Optional reuse) For header and footer framing.
- **`components/TodoCard`**: (Optional reuse/refactor) For showing existing items if duplicate check is triggered.

## Implementation Responsibilities

- **Screen Component**: 
  - Manages `useState` for `title` and `date`.
  - Performs the `useMutation(api.todos.addTodo)`.
  - Performs the `useQuery(api.todos.checkDuplicate)` (Optional) or handles it in UI.
  - Controls back-navigation via `router.back()`.
  - Provides conditional rendering based on valid/invisible states.

## Styling & Theme

- **Colors**: Uses `colors.bg`, `colors.surface`, `colors.text`, and `colors.primary`.
- **Spacing**: Uses standard 20px padding (gutter) and 12-16px inter-element spacing.
- **Typography**: Header text should be 20px Bold, Labels should be 12px Semibold.

## Interaction Transitions

- **Auto-focus**: `TextInput` must have `autoFocus={true}`.
- **Picker Interaction**: `@react-native-community/datetimepicker` in 'spinner' mode (iOS) and 'default' mode (Android).
- **Smooth Navigation**: Transition should feel like a modal push.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-601**: System MUST use `useTheme` for all color definitions.
- **FR-602**: System MUST use `useTranslation` for all text labels.
- **FR-603**: System MUST use `Haptics` (expo-vibrate or similar) for clear interaction cues.
- **FR-604**: System MUST have zero console warnings during normal use flows.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-601**: 100% of codebase for this screen follows the project's React component patterns.
- **SC-602**: Memory usage for the new screen stays under 50MB.

## Assumptions

- **Project Core**: Uses the existing application hooks for authentication and persistence.
- **Expo Version**: SDK 55 or compatible.
