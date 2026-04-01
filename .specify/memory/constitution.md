<!--
SYNC IMPACT REPORT
- Version change: [CONSTITUTION_VERSION] → 1.0.0
- Added Principles: I. File-Based Routing, II. Theme Consistency, III. Multi-Language Support, IV. Interaction Quality, V. Shared Backend Persistence
- Added Sections: Platform & Infrastructure Constraints, Development Workflow
- Follow-up TODOs: Initial ratification date 2026-04-01.
-->

# To-Do App Constitution

## Core Principles

### I. File-Based Routing (Expo Router)
Navigation must be managed via `expo-router` in the `app/` directory. New screens or tabs must be added as files or folders within `app/`, ensuring that deep-linking and state preservation are natively supported.
**Rationale**: Simplifies navigation logic and aligns with the modern Expo ecosystem.

### II. Theme Consistency (useTheme)
All UI elements MUST consume colors and styles from the `useTheme` hook. Hardcoded hex values (except for core brand constants) are forbidden in screen components. New screens must support both Light and Dark modes.
**Rationale**: Ensures a professional, high-contrast User Experience (UX) that adheres to user system preferences.

### III. Multi-Language Support (Localization-First)
All user-facing strings MUST be localized using the `useTranslation` hook. Default keys and RTL (Right-to-Left) layout logic (via `isArabic`) must be handled during the screen's creation phase, not as an afterthought.
**Rationale**: Critical for serving both English and Arabic users with a native feel.

### IV. Interaction Quality (Keyboard-Aware & Responsive)
Inputs at the bottom of long lists MUST implement programmatic scrolling (e.g., `scrollToEnd`) to remain visible when the keyboard is active. Use `KeyboardAvoidingView` with platform-specific behavior (`padding` for iOS, dynamic resizing for Android).
**Rationale**: Prevents "invisible typing" and layout occlusion, which are the most common UX friction points on Android.

### V. Shared Backend Persistence (Convex & Hooks)
Screens should not manage complex data syncing manually. Use Convex queries and mutations exclusively for state that needs to persist or sync across tabs. Local UI state (modals, focus) stays in `useState` or `useRef`.
**Rationale**: Guarantees a single source of truth and simplifies the frontend logic.

## Platform & Infrastructure Constraints

The application is built on Expo SDK 55+ and uses Convex for the real-time backend. 
- **Styling**: Prefer vanilla `StyleSheet` with helper functions for dynamic themes.
- **Components**: Reuse `TodoCard`, `TodoInput`, and `TimerModal` where applicable to keep the visual design system unified.
- **Routing**: Tab-based navigation in `app/(tabs)/` is the primary architecture.

## Development Workflow

1. **Plan & Specify**: Create a `plan.md` using the "Spec-Kit" phases before writing code.
2. **Setup Theme & I18n**: Initialize the screen with `useTheme` and `useTranslation`.
3. **Layout & Safe Areas**: Wrap the content in `SafeAreaView` and handle top/bottom safe edges.
4. **Interactive Validation**: Verify keyboard handling and RTL support on both iOS and Android.
5. **Data Integration**: Connect to Convex backend using standard hooks (`useQuery`, `useMutation`).

## Governance

This constitution supersedes all individual developer preferences regarding code structure. Amendments require a version bump and a Sync Impact Report.
- MAJOR: Removal of core stacks (e.g., swapping Convex).
- MINOR: New mandatory UI patterns.
- PATCH: Clarifications on existing rules.

**Version**: 1.0.0 | **Ratified**: 2026-04-01 | **Last Amended**: 2026-04-01
