# Feature Specification: Add Reminder Screen (Phase 7: Validation & Review)

**Feature Branch**: `001-add-reminder-screen`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: PLAN.md Phase 7: Ensure the feature matches the spec before merge.

## Validation Checklist

### Layout & Appearance (P1)
- [ ] UI colors match themed constants.
- [ ] Spacing (20px gutters) is consistent.
- [ ] Safe Area (top/bottom) is respected.
- [ ] Dark Mode and Light Mode are visually correct.
- [ ] RTL (Arabic) flips the layout (Close button and icons).

### Logic & Behavior (P1)
- [ ] Title input auto-focuses on open.
- [ ] Date picker requires explicit user selection (no default).
- [ ] Time picker defaults to (Current Time + 1 Hour).
- [ ] "Save" is disabled if the title is empty.
- [ ] Haptics fire upon successful creation.
- [ ] Duplicate warning uses a native `Alert` with "هل تريد إنشاؤه على أي حال؟".


### Edge Case Verification (P2)
- [ ] Keyboard does not cover the "Save" button on Android.
- [ ] Date/Time cannot be picked for the past.
- [ ] Duplicate warning appears for identical title/time.

## Success Criteria Review

### Measurable Outcomes
- [ ] (SC-001) Creation flow < 15 seconds.
- [ ] (SC-002) 100% notification trigger parity.
- [ ] (SC-003) No "keyboard occlusion" reported.
- [ ] (SC-004) 100% Arabic text/layout parity.

---

## Final Review Confirmation

**PR Readiness**:
1. All specs for Phases 1-6 are finalized.
2. Code matches all functional requirements (FR).
3. Branch satisfies all success criteria (SC).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-701**: 100% of P1 checklist items must be passed.
- **SC-702**: All unit/integration tests must pass before merge.

## Assumptions

- **QA Environment**: Verification occurs on both iOS Simulator (iPhone 15) and Android Emulator (Pixel 7).
- **Backend Status**: Convex is synced and schema is up to date.
