# Implementation Plan: Phase 2 Timer and Status Logic Fixes

**Branch**: `006-phase-2-fixes` | **Date**: 2026-04-12 | **Spec**: [specs/006-phase-2-fixes/spec.md](specs/006-phase-2-fixes/spec.md)
**Input**: Feature specification from `specs/006-phase-2-fixes/spec.md`

## Summary

This phase focuses on fixing timer and status logic issues: preserving elapsed time when a user edits the total duration of a running or paused timer, enabling immediate timer start when changing a task to "In Progress" from the modal, and automatically transitioning a paused task to "In Progress" if it is resumed after moving to "Not Done" at the end of a day.

## Technical Context

**Language/Version**: TypeScript / React Native (Expo SDK 55+)
**Primary Dependencies**: Expo, React Native, React
**Storage**: Convex backend, AsyncStorage / Memory Cache for offline
**Testing**: Manual testing and TypeScript compilation checks
**Target Platform**: iOS and Android
**Project Type**: Mobile Application
**Performance Goals**: Instant UI updates for timer actions
**Constraints**: Robust offline caching, precise timer recalculation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. File-Based Routing**: No new routes added.
- [x] **II. Theme Consistency**: No UI style changes.
- [x] **III. Multi-Language Support**: Ensure any new user-facing strings use `useTranslation`.
- [x] **IV. Interaction Quality**: Ensure immediate feedback when starting the timer from modal.
- [x] **V. Shared Backend Persistence**: Use Convex mutations (`startTimer`, updates) properly.

## Project Structure

### Documentation (this feature)

```text
specs/006-phase-2-fixes/
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
├── todos.ts

components/
├── TaskDetailModal.tsx
├── TodoCard.tsx

hooks/
├── useTaskTimers.ts
```

**Structure Decision**: The changes will primarily affect the React Native components (`TaskDetailModal.tsx`), hooks (`useTaskTimers.ts`), and the Convex backend mutations (`todos.ts`).
