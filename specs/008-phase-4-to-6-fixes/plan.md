# Implementation Plan: Phase 4 to 6 UI and Notification fixes

**Branch**: `008-phase-4-to-6-fixes` | **Date**: 2026-04-12 | **Spec**: `/specs/008-phase-4-to-6-fixes/spec.md`
**Input**: Feature specification from `/specs/008-phase-4-to-6-fixes/spec.md`

## Summary

This feature resolves Phase 4 to 6 UI/UX and notification issues by implementing a focused "To-Do" filter that excludes "done" tasks, introducing an accessible Floating Action Button (FAB) for task creation, and allowing users to customize timer notification sounds via a settings menu.

## Technical Context

**Language/Version**: TypeScript / React Native Expo
**Primary Dependencies**: React Native, Expo (Router, Notifications, Icons), Convex
**Storage**: Convex backend (remote), AsyncStorage (local user preferences)
**Testing**: TypeScript compiler, Manual testing on simulators/devices
**Target Platform**: iOS, Android
**Project Type**: Mobile Application
**Constraints**: Multi-Language Support (I18n), Dark/Light theme support, Offline-capable

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **File-Based Routing (Expo Router)**: Navigation is handled via `expo-router` in `app/`. The Settings feature will reuse `app/(tabs)/settings.tsx`.
- **Theme Consistency (useTheme)**: The FAB must consume colors from `useTheme`.
- **Multi-Language Support (Localization-First)**: "To-Do" and settings labels must be localized using `useTranslation`.
- **Interaction Quality (Keyboard-Aware & Responsive)**: FAB position must not conflict with keyboard or Safe Area insets.
- **Shared Backend Persistence (Convex & Hooks)**: Task status changes are handled by Convex queries. User preferences (notification sound) can be handled via `AsyncStorage` as it's a device-specific local preference.

## Project Structure

### Documentation (this feature)

```text
specs/008-phase-4-to-6-fixes/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/
├── (tabs)/
│   └── index.tsx        # Main screen where FAB and "Today" view changes are needed
│   └── settings.tsx     # Settings screen for notification sound preference
components/
├── FloatingActionButton.tsx # Potential new component
utils/
├── notifications.ts     # Update notification scheduling with sound preference
└── soundPreferences.ts  # Utility for loading/saving sound preference
```

**Structure Decision**: We will keep the UI additions in standard React Native files, ensuring we respect `app/` routing for the settings screen and `components/` for the FAB.

## Complexity Tracking

No constitution violations detected.