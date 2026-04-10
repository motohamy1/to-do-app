# Phase 1: API & Mutation Contracts

## 1. `projects.deleteSubCategory`

**Type**: `mutation`
**Path**: `convex/projects.ts`
**Purpose**: Deletes a sub-category and recursively deletes all dependent projects.

### Input
```typescript
{
  id: v.id("projectSubCategories")
}
```

### Side Effects
- Resolves and deletes `projectSubCategories` record.
- Iterates over all `projects` matching `subCategoryId`.
  - For each project, deletes `projectChecklists` and `projectResources`.
  - Sets `projectId: undefined` on `todos` for that project.
  - Deletes the `projects` record.

### Output
```typescript
Promise<null> // Throws error if record not found or not authorized.
```

---

## 2. `projects.deleteProject`

**Type**: `mutation`
**Path**: `convex/projects.ts`
**Purpose**: Deletes a specific project and cleans up its linked entities.

### Input
```typescript
{
  id: v.id("projects")
}
```

### Side Effects
- Resolves and deletes `projects` record.
- Deletes all `projectChecklists` matching `projectId`.
- Deletes all `projectResources` matching `projectId`.
- Modifies all `todos` matching `projectId` to have `projectId: undefined`.

### Output
```typescript
Promise<null> // Throws error if record not found or not authorized.
```

---

## 3. `todos.deleteTodo` (Existing/Updated)

**Type**: `mutation`
**Path**: `convex/todos.ts`
**Purpose**: Allows deleting a specific task from long press menus.

### Input
```typescript
{
  id: v.id("todos")
}
```

### Output
```typescript
Promise<null>
```