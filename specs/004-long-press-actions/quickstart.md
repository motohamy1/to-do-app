# Phase 1: Quickstart & Setup Guide

## Step-by-Step Integration

### 1. UI Component Setup
1. Open `components/ProjectCard.tsx` and `components/TodoCard.tsx`.
2. Locate the root `TouchableOpacity` or `Pressable` wrapper.
3. Attach the `onLongPress` prop:
   ```tsx
   <TouchableOpacity 
     onPress={handlePress}
     onLongPress={() => openActionSheet(item)}
   >
     {/* ... */}
   </TouchableOpacity>
   ```

### 2. Localization Configuration
Update `utils/i18n.ts` or your localization files (e.g., `locales/en.json`, `locales/ar.json`) with new keys:
- `longPressActions.edit`: "Edit"
- `longPressActions.share`: "Share"
- `longPressActions.delete`: "Delete"
- `longPressActions.linkProject`: "Link Project"
- `longPressActions.cancel`: "Cancel"
- `alerts.confirmDeleteTitle`: "Confirm Deletion"
- `alerts.confirmDeleteMessage`: "Are you sure you want to delete this item? This cannot be undone."

### 3. Implementing the Actions
- Import the standard `Share` module from `react-native` for the Share action.
- Import `Alert` from `react-native` for the Delete confirmation.
- Use `router.push()` to route to the relevant Edit screen or Modal.

### 4. Background / Data Integration
- Update your `useMutation` hooks to point to the newly updated backend functions: `api.projects.deleteProject` and `api.projects.deleteSubCategory`.