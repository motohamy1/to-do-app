# Implementation Plan: Long Press Action Fixes

**Branch**: `004-long-press-actions` | **Date**: 2026-04-10 | **Spec**: `/specs/004-long-press-actions/spec.md`
**Input**: Feature specification from `/specs/004-long-press-actions/spec.md`

## Summary

This feature implements the missing long-press actions for projects, sub-categories, and tasks throughout the application. It includes native action menus (bottom sheets/action sheets) offering Edit, Share, Delete, and Link functionalities. Importantly, it mandates safe deletion practices through localized confirmation dialogs and server-side cascade deletes via Convex to prevent orphaned resources.

## Technical Context

**Language/Version**: TypeScript 5.3  
**Primary Dependencies**: React Native, Expo SDK 55+, `expo-router`, Convex  
**Storage**: Convex  
**Testing**: Manual UI verification across devices (iOS/Android)  
**Target Platform**: iOS, Android  
**Project Type**: Mobile App  
**Performance Goals**: Instant modal presentation, graceful UI loading during complex deletions  
**Constraints**: Must handle localized (Arabic/English) action sheets and confirmation dialogs. Actions must work seamlessly within offline/optimistic update frameworks.  
**Scale/Scope**: Affects core entities (Tasks, Projects, Sub-Categories) across multiple screens (`app/(tabs)/projects.tsx`, `planner.tsx`, `index.tsx`, etc.).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **File-Based Routing (Expo Router)**: UI modals and confirmation dialogs will operate within existing screen contexts. Navigation to edit views will leverage `router.push`.
- [x] **Theme Consistency (useTheme)**: All custom action sheets/alerts will utilize dynamic theme colors.
- [x] **Multi-Language Support**: Action labels ("Edit", "Share", "Delete") and confirmation dialogs will be strictly driven by `useTranslation`.
- [x] **Interaction Quality**: Action modals will be highly responsive and tactile.
- [x] **Shared Backend Persistence (Convex)**: Cascade deletions will be implemented entirely as Convex backend mutations to ensure atomic operations and absolute data consistency.

## Project Structure

### Documentation (this feature)

```text
specs/004-long-press-actions/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── convex-mutations.md
└── tasks.md
```

### Source Code (repository root)

```text
convex/
├── projects.ts      # New cascade delete mutations
├── schema.ts        
└── todos.ts         # Update task unlink mutations

app/
└── (tabs)/          # Connect longPress actions to the UI components

components/
├── TodoCard.tsx     # Inject longPress prop
├── ProjectCard.tsx  # Inject longPress prop
└── ActionModal.tsx  # Extensible action sheet component (if needed)
```

**Structure Decision**: The logic will be structured with heavy lifting on the backend (Convex) for mutations, keeping the UI components clean and focused strictly on the presentation of options and localization.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |