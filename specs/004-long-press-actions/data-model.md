# Phase 1: Data Model & Transitions

## 1. Domain Entities Affected

The schema definition (in `convex/schema.ts`) remains largely unchanged. The updates involve complex data transitions (mutations) over the following entities:

1.  **Task (`todos`)**: Unlinked by setting `projectId: undefined`.
2.  **Project (`projects`)**: Deleted completely. Its children (Checklists, Resources) are wiped.
3.  **Sub-Category (`projectSubCategories`)**: Deleted completely. Its child Projects are cascaded (and their children in turn are cascaded).
4.  **Category (`projectCategories`)**: Out of scope for this feature's deletions.

## 2. State Transitions

### Task Transition
- **From**: `{ ..., projectId: "some_id" }`
- **To**: `{ ..., projectId: undefined }`
- **Trigger**: Deletion of the parent `Project`.

### Project Deletion
- **From**: Existing Record
- **To**: Deleted.
- **Side-Effects**: 
  - Delete all `projectResources` where `projectId == [deleted_project_id]`
  - Delete all `projectChecklists` where `projectId == [deleted_project_id]`
  - Update all `todos` where `projectId == [deleted_project_id]` -> `projectId = undefined`

### Sub-Category Deletion
- **From**: Existing Record
- **To**: Deleted.
- **Side-Effects**:
  - For each `Project` where `subCategoryId == [deleted_sub_cat_id]`:
    - Trigger "Project Deletion" side-effects.
    - Delete the `Project`.

## 3. Storage & Schema Enhancements

No database schema enhancements (`convex/schema.ts`) are necessary for this feature, as we are strictly augmenting the backend business logic operating on the current schema. All mutation logic will be constrained within `convex/projects.ts` and `convex/todos.ts`.