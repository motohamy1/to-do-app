# Implementation Plan: Add Reminder Screen

**Feature Branch**: `001-add-reminder-screen`  
**Status**: Draft  
**Related Specs**: [Phase 1-7 Specs in phases/ directory]

## Technical Context

| Category | Choice | Reasoning |
| :--- | :--- | :--- |
| **Framework** | React Native (Expo SDK 55) | Project standard. |
| **Navigation** | `expo-router` | File-based routing in `app/`. |
| **Backend** | Convex | Shared backend for persistence and real-time sync. |
| **UI Components** | `SafeAreaView`, `TextInput`, `Alert` | Standard React Native components for optimal platform feel. |
| **Pickers** | `@react-native-community/datetimepicker` | Native date/time interaction quality. |
| **Haptics** | `expo-haptics` | Enhanced feedback on success. |

---

## Constitution Check

| Principle | Status | Implementation Details |
| :--- | :--- | :--- |
| **I. File-Based Routing** | ✅ Compliant | New route at `app/add-reminder.tsx`. |
| **II. Theme Consistency** | ✅ Compliant | Strictly consuming `useTheme` for all colors. |
| **III. Multi-Language** | ✅ Compliant | Using `useTranslation` and `isArabic` for RTL flipping. |
| **IV. Interaction Quality** | ✅ Compliant | `KeyboardAvoidingView` + `scrollToEnd` on title focus. |
| **V. Shared Persistence** | ✅ Compliant | Using Convex `addTodo` mutation and a new `checkDuplicate` query. |

---

## Implementation Gates

- [x] **Theme Audit**: Screen MUST support both light/dark modes.
- [x] **RTL Audit**: Screen MUST flip icons and text alignment for Arabic.
- [x] **Validation**: "Save" MUST be disabled if title is empty.
- [x] **Accessibility**: Buttons MUST have accessible labels and sufficient touch targets.
- [x] **Performance**: Navigation transition SHOULD be under 300ms.

---

## Phase 0: Outline & Research (Consolidated)

All critical ambiguities were resolved in the clarification session. No further research agents are required.

- **Decision 1**: No default date. The user is forced to pick a date to ensure intentional scheduling.
- **Decision 2**: Round timestamps to the **nearest minute**. This prevents accidental sub-minute discrepancies between the UI and backend triggers.
- **Decision 3**: Use a **Native Alert** for duplicate detection. This avoids cluttering the UI while providing a firm blocking point for high-consequence duplicate actions.

---

## Phase 1: Design & Data Model

### Data Schema (`convex/schema.ts`)
The `todos` table already exists. No schema changes are required for the standard flow.
- `text`: string
- `dueDate`: number (Unix timestamp in ms)
- `status`: string (default 'not_started')
- `userId`: string (auth reference)

### Contract: Convex Query (`api.todos.checkDuplicate`)
- **Inputs**: `text` (string), `dueDate` (number)
- **Output**: Boolean or existing todo record.

---

## Phase 2: Implementation Steps

### 1. Setup & Localization
- [ ] Register new strings in `utils/i18n.ts`: `addReminder`, `reminderTitle`, `selectDate`, `selectTime`, `duplicateWarningTitle`, `duplicateWarningBody`.

### 2. UI Foundation (`app/add-reminder.tsx`)
- [ ] Create basic layout with `SafeAreaView` and themed `View`.
- [ ] Implement `Header` with `isArabic` support for back-button placement.
- [ ] Add `TextInput` for title with `autoFocus` and `useRef` for programmatic interaction.

### 3. Date & Time Interaction
- [ ] Integrate `@react-native-community/datetimepicker`.
- [ ] Logic for opening/closing pickers and updating local `useState`.
- [ ] Validation: Prevent picking past times.

### 4. Backend Persistence
- [ ] Integrate Convex `useMutation`.
- [ ] Implement `onSave` logic: (Check Duplicate → Show Alert → Persist → Navigate Back).

### 5. Polish & Verification
- [ ] Implement `KeyboardAvoidingView` logic.
- [ ] Add `expo-haptics` success feedback.
- [ ] Audit RTL layout for consistency.

---

## Phase 3: Reporting & Handoff

Upon completion, common scenarios from `quickstart.md` will be verified to ensure a premium feel.
- **T01**: Create "Doctor Appointment" for tomorrow 10am.
- **T02**: Attempt duplicate creation.
- **T03**: Attempt creation without title.
