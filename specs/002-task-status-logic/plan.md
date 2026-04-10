# Implementation Plan: Task Status Logic Fixes

**Branch**: `002-task-status-logic` | **Date**: 2026-04-10 | **Spec**: [specs/002-task-status-logic/spec.md](specs/002-task-status-logic/spec.md)
**Input**: Feature specification from `specs/002-task-status-logic/spec.md`

## Summary

This feature resolves bugs and ambiguities in the task status logic, ensuring that tasks correctly transition between "Not Started", "Not Done", "In Progress", "Paused", and "Done". It involves UI updates to clearly reflect these states, automatic completion when timers expire, proper categorization of paused tasks, displaying completed tasks by day using virtualized lists, and immediate timer visibility upon setting.

## Technical Context

**Language/Version**: TypeScript / React Native (Expo)
**Primary Dependencies**: Expo SDK 55+, expo-router, React Native (FlatList/FlashList)
**Storage**: Convex (Shared Backend Persistence)
**Testing**: React Native Testing Library / Jest
**Target Platform**: iOS and Android Mobile App
**Project Type**: Mobile App
**Performance Goals**: 60 fps for list scrolling (using virtualized lists for completed tasks)
**Constraints**: Keyboard-Aware & Responsive, Localized (useTranslation)
**Scale/Scope**: Updating core task model and related UI components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **[X] I. File-Based Routing (Expo Router)**: UI navigation not largely affected, but any new views will follow expo-router conventions.
- **[X] II. Theme Consistency (useTheme)**: UI updates for status badges (e.g., lemon green border for "Not Started", neutral colors for "Paused") will use `useTheme` hooks. No hardcoded hex values.
- **[X] III. Multi-Language Support (Localization-First)**: New labels ("Not Done", "Not Started", "Paused") will use `useTranslation`.
- **[X] IV. Interaction Quality (Keyboard-Aware & Responsive)**: Modals/Inputs involved in task creation or timer setting will retain keyboard-aware properties.
- **[X] V. Shared Backend Persistence (Convex & Hooks)**: Changes to task state (e.g., retroactive timer completion, status updates) will be synchronized via Convex mutations.

## Project Structure

### Documentation (this feature)

```text
specs/002-task-status-logic/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
convex/
├── schema.ts
├── tasks.ts

app/
├── (tabs)/
│   ├── index.tsx
│   ├── planner.tsx

components/
├── TodoCard.tsx
├── TodoInput.tsx
├── TimerModal.tsx
```

**Structure Decision**: The mobile application leverages Expo Router within the `app/` directory and custom UI elements in `components/`. The backend is a real-time Convex database in the `convex/` directory.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*(No violations expected)*