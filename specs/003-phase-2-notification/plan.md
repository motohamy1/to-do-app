# Implementation Plan: Phase 2 - Notification System Improvements

**Branch**: `003-phase-2-notification` | **Date**: 2026-04-10 | **Spec**: [specs/003-phase-2-notification/spec.md](spec.md)
**Input**: Feature specification from `/specs/003-phase-2-notification/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This phase focuses on improving the notification system. The primary requirements include:
1. Reliable timer completion notifications, even when the app is in the background.
2. Daily morning (9:00 AM) and evening (8:00 PM) summary notifications for scheduled, overdue, and not done tasks.
3. Interactive timer controls (Pause, Resume, Reset) directly within the notification center without needing to open the app.
4. Persistent, real-time ongoing notifications while a timer counts down.
Technical approach centers around utilizing `expo-notifications` for background execution, creating channel-based behaviors, and registering native action callbacks to update the frontend state and the Convex database safely.

## Technical Context

**Language/Version**: TypeScript 5.3  
**Primary Dependencies**: React Native, Expo SDK 55+, `expo-notifications`
**Storage**: Convex (Real-time backend), Local Storage for notification IDs
**Testing**: Manual on-device/simulator testing (due to notification center interactions)
**Target Platform**: iOS 15+, Android 13+ (Mobile App)
**Project Type**: Mobile App
**Performance Goals**: Notification delivery latency < 1 second.
**Constraints**: Background task reliability across platforms; dealing with deprecated sticky/autoDismiss notification properties. 
**Scale/Scope**: Local device notification scheduling and channel management.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. File-Based Routing (Expo Router)**: Any new routing or notification deep links must map correctly to existing `app/(tabs)` paths.
- [x] **II. Theme Consistency (useTheme)**: Not directly applicable to native push notifications, but any custom UI triggers will use `useTheme`.
- [x] **III. Multi-Language Support (Localization-First)**: Notification titles, bodies, and action buttons MUST be localized using `i18n.ts`. English and Arabic supported natively.
- [x] **IV. Interaction Quality (Keyboard-Aware & Responsive)**: Native action buttons must execute reliably and quickly update the app state.
- [x] **V. Shared Backend Persistence (Convex & Hooks)**: Updates to task status triggered via notification actions (e.g. Pause, Reset) must mutate data via Convex ensuring cross-device consistency.

## Project Structure

### Documentation (this feature)

```text
specs/003-phase-2-notification/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (generated later)
```

### Source Code (repository root)

```text
api/
└── convex/
    ├── schema.ts
    └── todos.ts

ios/ or android/
└── [Handled by Expo managed workflow]

frontend/
├── app/
│   └── (tabs)/
├── components/
│   ├── TodoCard.tsx
│   ├── TodoInput.tsx
│   └── TimerModal.tsx
├── hooks/
│   ├── useTaskTimers.ts
│   └── useNotifications.ts
└── utils/
    ├── notifications.ts
    └── i18n.ts
```

**Structure Decision**: Extending the existing Mobile + API structure. We will implement `utils/notifications.ts` for scheduling, background action handling, and channel setup. We will hook this into our existing `hooks/useTaskTimers.ts` and UI.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |