# Phase 0: Research & Technical Decisions

## Overview
This document outlines the technical research and decisions made for the "Task Status Logic Fixes" feature (Branch `002-task-status-logic`).

## Technical Unknowns & Decisions

### 1. Handling Timer Expiry When App is Closed
- **Problem**: Mobile OSs heavily restrict background execution, making reliable trigger-based actions (like changing task status to "Done" exactly when a timer expires) difficult and error-prone.
- **Decision**: Calculate the elapsed time dynamically on the next app launch or resume event. If the calculated time exceeds the timer duration, transition the task state to "Done" retroactively and sync with Convex.
- **Why**: Avoids unreliable background tasks, ensuring state correctness whenever the user interacts with the app again.

### 2. Differentiating "Not Started" and "Not Done"
- **Problem**: Ambiguity between when a task should be "Not Started" versus "Not Done".
- **Decision**: 
  - `Not Started`: Applied to tasks scheduled for a **future** date.
  - `Not Done`: Applied to tasks scheduled for **today or past** dates (overdue).
- **Why**: Provides a clear and simple data model and aligns with user expectations for visual warnings on actionable items without adding unnecessary rules.

### 3. Displaying Large Volumes of Completed Tasks
- **Problem**: Rendering many completed tasks horizontally can cause performance degradation (e.g., frame drops below 60fps) if a basic `ScrollView` is used.
- **Decision**: Utilize a virtualized list component (such as `FlatList` or `FlashList` from Shopify) for rendering the completed tasks grouped by day.
- **Why**: Meets the 60fps performance goal mandated by the Constitution while cleanly handling unlimited amounts of completed tasks.

### 4. Resuming Past-Due Tasks
- **Problem**: Should users be blocked from resuming a paused task if its due date is in the past?
- **Decision**: Allow the task to resume normally. It remains in the "In Progress" state despite being past the due date.
- **Why**: Enforces a simple interaction model. User intent to run a timer overrides past-due warnings, avoiding UI clutter or friction.

## Conclusion
All technical ambiguities identified in the feature specification have been resolved. The chosen approaches rely on frontend calculations (for elapsed time), standard virtualized lists (for performance), and clear state definitions, which seamlessly integrate with the existing React Native/Convex architecture.