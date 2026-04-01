# Feature Specification: Add Reminder Screen (Phase 3: Layout & Structure)

**Feature Branch**: `001-add-reminder-screen`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: PLAN.md Phase 3: Define the screen’s structural layout in a platform-agnostic way.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Header Controls (Priority: P1)

As a user, I want a clear header that clearly labels the screen and provides a direct "Close" or "Cancel" action.

**Why this priority**: Navigability and clarity.

**Independent Test**: Identify the 24x24 icon button in the top left and ensure it is labeled "Close" or similar.

**Acceptance Scenarios**:

1. **Given** the user is at the top of the screen, **When** they look at the header, **Then** they see "Add Reminder" as the main headline.
2. **Given** the user wants to leave, **When** they tap the header close button, **Then** the screen dismisses.

---

### User Story 2 - Section Visibility (Priority: P2)

As a user, I want all elements of the creation form to be visible on one Screen without needing extensive scrolling, where possible.

**Why this priority**: Speed and focus.

**Independent Test**: Measure the layout on standard devices (iPhone 14/15, Pixel 7) to ensure the Title, Date, Time, and Save button are on screen at once.

**Acceptance Scenarios**:

1. **Given** the screen is open, **When** the keyboard is NOT visible, **Then** all regions (Title, Date, Time, Footer) are fully visible.
2. **Given** the keyboard IS visible, **When** typing in the title, **Then** the primary "Save" button remains accessible or is brought into view by scrolling.

## Screen Anatomy

- **Header**: Text label and 'X' close button.
- **Region 1: Focus Input**: Large single-line text input for title.
- **Region 2: Selectors**: Two rows of interactive labels (Date and Time).
- **Region 3: Visual Indicators**: Icons for calendar and clock to reinforce selection types.
- **Footer**: Primary high-contrast button for "Save", secondary for "Cancel".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-301**: System MUST wrap the layout in a `SafeAreaView` to respect platform notches and home indicators.
- **FR-302**: System MUST use a `KeyboardAvoidingView` or similar to handle text input and button accessibility.
- **FR-303**: System MUST support localized layouts (flip icons and text for Arabic).
- **FR-304**: System MUST use the theme-defined colors for high-contrast visibility (dark/light mode).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-301**: 100% of primary UI elements (title, date picker, save button) are visible on screens with at least 600px height.
- **SC-302**: Transition animations between screen entry and exit happen within 300ms.

## Assumptions

- **Theme Consistency**: Uses the same typography and spacing as the Dashboard.
- **Icon Set**: Uses `Ionicons` (standard for the project).
