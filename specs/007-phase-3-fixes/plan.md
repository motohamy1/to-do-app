# Implementation Plan: Phase 3 UI/UX - Input & Navigation

**Branch**: `007-phase-3-fixes` | **Date**: 2026-04-12 | **Spec**: [Link](./spec.md)
**Input**: Feature specification from `/specs/007-phase-3-fixes/spec.md`

## Summary

This phase addresses critical UI/UX bugs related to keyboard interaction and task creation. Specifically, it introduces a reliable way to save edits to task titles and timers without dismissing the keyboard, ensures note inputs remain visible above the keyboard using KeyboardAvoidingView, and fixes the broken subtask creation logic in the task detail modal.

## Technical Context

**Language/Version**: TypeScript / React Native (Expo)
**Primary Dependencies**: Expo Router, React Native KeyboardAvoidingView
**Storage**: Convex (Backend), AsyncStorage (Local)
**Testing**: Manual / TypeScript Compiler (`tsc`)
**Target Platform**: iOS and Android
**Project Type**: Mobile Application
**Performance Goals**: 60fps UI interactions
**Constraints**: Offline-capable UI, precise Keyboard behavior across iOS/Android
**Scale/Scope**: Single feature branch targeting local UI components and a specific mutation caller.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **File-Based Routing**: No new screens added, modifying existing components (`TaskDetailModal.tsx`, `note-detail.tsx`).
- [x] **Theme Consistency**: Will ensure the new floating confirm button uses `useTheme` colors.
- [x] **Multi-Language Support**: Ensure new buttons or texts use `useTranslation`.
- [x] **Interaction Quality**: Key focus of this phase. Uses `KeyboardAvoidingView` appropriately.
- [x] **Shared Backend Persistence**: Utilizing Convex mutations for adding subtasks.

## Project Structure

### Documentation (this feature)

```text
specs/007-phase-3-fixes/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── (tabs)/
├── note-detail.tsx
components/
└── TaskDetailModal.tsx
```

**Structure Decision**: Modifying existing React Native components and screens within the `app/` and `components/` directories.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None.