# Phase 0: Technical Research & Decisions

## 1. Cascade Deletions: Server-Side vs. Client-Side

**Problem**: When deleting a Sub-Category, we must also delete all its Projects, Project Resources, Project Checklists, and unlink associated Tasks. Doing this sequentially on the client can lead to orphaned data if the app is closed mid-process or loses connectivity.

**Decision**: **Server-Side Mutations (Convex)**.
We will create atomic mutations within `convex/projects.ts` that loop through and delete/unlink children before deleting the parent entity. Convex mutations run atomically within a transaction on the server, guaranteeing that either the full cascade delete succeeds or fails completely without leaving partial state.

## 2. Unlinking vs Deleting Tasks

**Problem**: Tasks are central items. When their parent Project is deleted, should the Task be deleted?

**Decision**: **Unlink Only**. 
As mandated by the feature specification (User Story 1 & Requirement FR-004), Tasks will NOT be deleted. Their `projectId` will simply be set to `undefined` (or a similar unlinked state), moving them back to the general task pool.

## 3. Long-Press Action Menus

**Problem**: How to present "Edit", "Share", "Delete", and "Link Project" consistently across Android and iOS on long press.

**Decision**: **React Native Action Sheets & Custom Modals**. 
We will leverage custom bottom sheet modals (using our existing modal system if one exists, or fallback to an ActionSheet-style implementation) mapped to the `onLongPress` prop of `TouchableOpacity` or `Pressable` wrapper components inside `TodoCard` and `ProjectCard`.

## 4. Safe Destructive Actions (Confirmations)

**Problem**: Accidental deletions need to be blocked.

**Decision**: **React Native Alert API**.
The built-in `Alert.alert()` from React Native provides synchronous, natively-styled confirmation dialogs. We will use `useTranslation()` to inject localized "Are you sure?" titles and button texts ("Cancel", "Delete").

## 5. Offline Capabilities

**Decision**: Standard Convex behavior queues mutations while offline. Long-press actions will visually trigger and queue the deletion/edit mutations in Convex to be executed when connectivity is restored, providing a seamless UX.

## 6. Sharing Implementation

**Decision**: **React Native Share API**.
We will use the standard `Share` module from `react-native` to invoke native share sheets (iOS Share Sheet / Android Intent), formatting the task or project details into a readable string (e.g., `Task: [Name] - Due: [Date]`).