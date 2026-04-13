# Comprehensive Bug Fix Plan - Phase-Based Implementation

## Overview

This document outlines a phased approach to fixing 13 identified issues in the todo app. Each phase is designed to be implemented independently with clear dependencies.

---

## Phase Dependencies

```
Phase 1 (Foundation) ───► Phase 2 (Timer Logic)
        │                      │
        ▼                      ▼
Phase 3 (UI/UX) ◄───────► Phase 4 (Display)
        │
        ▼
Phase 5 (FAB)
        │
        ▼
Phase 6 (Notifications)  ← ← Independent
```

---

# Phase 1: Critical Data & Sync Fixes (Foundation)

**Priority: CRITICAL** - Fixes core data issues affecting all functionality

## Issues Addressed

### 1.1 Notification Shows "undefined" Task Name

**Problem:** Notification says "✅ Main Task Completed" but task name shows as "undefined"

**Root Cause:** In `hooks/useTaskTimers.ts` line 26, timer notification uses `todo.title` but task field is `todo.text`

**Files to Modify:**
- `hooks/useTaskTimers.ts`

**Fix:**
```typescript
// Line 26: Change from todo.title to todo.text
scheduleTimerCompletion(todo._id, todo.text, remaining);
```

---

### 1.2 App Requires Internet on First Load

**Problem:** App shows loading indicator until internet connection, downgrading UX

**Root Cause:** `useOfflineQuery` doesn't return cached data synchronously

**Files to Modify:**
- `hooks/useOfflineQuery.ts`
- `utils/offlineStorage.ts`

**Fix:**
```typescript
// In useOfflineQuery.ts - implement cache-first strategy
export function useOfflineQuery<T>(queryKey: string, queryFn: any, args: any) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Load cached data IMMEDIATELY (synchronous if available)
    const loadCache = async () => {
      const cached = await getCachedQuery(queryKey, args);
      if (cached !== null) {
        setData(cached);
        setLoading(false); // Already have data to show
      }
    };
    loadCache();
    
    // 2. Then fetch from network in background
    // ... existing network logic ...
    
  }, [queryKey, args]);
  
  return data;
}
```

---

### 1.3 New Tasks Default to "not done"

**Problem:** Newly created tasks appear in "not done" section instead of "not started"

**Root Cause:** Status passed incorrectly from some callers

**Files to Modify:**
- `convex/todos.ts` - verify addTodo mutation default
- `TodoInput.tsx` - verify status passed

**Current State:** `convex/todos.ts` already has correct default (line 79-81):
```typescript
let finalStatus = args.status;
if (!finalStatus) {
  finalStatus = "not_started";
}
```

**Verification Needed:** Ensure all callers either pass `status: "not_started"` or don't pass status at all.

---

## Testing Checklist for Phase 1

- [ ] Create new task → appears in "Not Started" section
- [ ] Open app airplane mode → loads cached data immediately
- [ ] Timer completes → notification shows correct task name

---

# Phase 2: Timer & Status Logic (Core Functionality)

**Priority: HIGH** - Fixes timer behavior and status management

## Issues Addressed

### 2.1 Resume Task After Day Ends

**Problem:** Task paused at end of day, when resumed stays in "not done" section

**Expected:** When resuming a paused/not_done task, it should go to "in_progress"

**Files to Modify:**
- `convex/todos.ts` - `startTimer` mutation

**Fix:**
```typescript
export const startTimer = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) return;
    
    let newStartTime = Date.now();
    let statusToSet = "in_progress";
    
    if (todo.status === "paused" && todo.timeLeftAtPause !== undefined && todo.timerDuration) {
        newStartTime = Date.now() - (todo.timerDuration - todo.timeLeftAtPause);
    } else if (todo.status === "not_done") {
        // Resume a not_done task should go to in_progress
        statusToSet = "in_progress";
    }

    await ctx.db.patch(args.id, { 
      status: statusToSet,
      timerStartTime: newStartTime,
      timeLeftAtPause: undefined 
    });
  },
});
```

---

### 2.2 Timer Edit Resets Instead of Calculating

**Problem:** Editing timer while running resets timer instead of adjusting for elapsed time, and the task still send notification according to the old timer finished although i edit the time

**Expected:** Increase/decrease duration while preserving elapsed time

**Files to Modify:**
- `components/TaskDetailModal.tsx` - `handleSaveCustomTimer`
- `convex/todos.ts` - `setTimer` mutation

**Fix in TaskDetailModal.tsx:**
```typescript
const handleSaveCustomTimer = () => {
  const h = parseInt(hours) || 0;
  const m = parseInt(minutes) || 0;
  const newMs = (h * 3600 + m * 60) * 1000;
  
  if (currentTodoId && todo) {
    // Calculate already spent time
    let elapsed = 0;
    if (todo.status === 'in_progress' && todo.timerStartTime) {
      elapsed = Date.now() - todo.timerStartTime;
    } else if (todo.status === 'paused' && todo.timeLeftAtPause !== undefined) {
      elapsed = (todo.timerDuration || 0) - todo.timeLeftAtPause;
    }
    
    // Adjust timerStartTime to account for duration change
    const durationDiff = newMs - (todo.timerDuration || 0);
    const newTimerStartTime = durationDiff !== 0 && todo.timerStartTime
      ? todo.timerStartTime - durationDiff
      : todo.timerStartTime;
      
    setTimer({ 
      id: currentTodoId, 
      duration: newMs,
      timerStartTime: newTimerStartTime
    });
  }
  setIsEditingTimer(false);
};
```

**Fix in convex/todos.ts - setTimer mutation:**
Add `timerStartTime` as optional parameter:
```typescript
export const setTimer = mutation({
  args: { 
    id: v.id("todos"), 
    duration: v.optional(v.number()),
    timerDirection: v.optional(v.string()),
    timerStartTime: v.optional(v.number()),
    dueDate: v.optional(v.number()), 
    date: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    // ... existing validation ...
    await ctx.db.patch(args.id, { 
      ...(args.duration !== undefined && { timerDuration: args.duration }),
      ...(args.timerDirection !== undefined && { timerDirection: args.timerDirection }),
      ...(args.timerStartTime !== undefined && { timerStartTime: args.timerStartTime }),
      ...(args.dueDate !== undefined && { dueDate: args.dueDate }),
      ...(args.date !== undefined && { date: args.date })
    });
  },
});
```

---

### 2.3 Timer Sync Between Modal and Card

**Problem:** Change status in modal doesn't start timer; must enter modal again to start

**Files to Modify:**
- `components/TaskDetailModal.tsx`

**Fix:**
```typescript
// Status button: when "In Progress" tapped, start timer immediately
<TouchableOpacity
  onPress={() => {
    setStatus('in_progress');
    if (currentTodoId) {
      if (todo?.timerDuration && todo.timerDuration > 0) {
        startTimer({ id: currentTodoId }); // Start timer immediately
      } else {
        updateStatus({ id: currentTodoId, status: 'in_progress' });
      }
    }
  }}
>
```

---

## Testing Checklist for Phase 2

- [ ] Pause task, let day pass, resume → task in "in_progress"
- [ ] Edit timer +10min while running → preserves elapsed time
- [ ] Tap "In Progress" in modal → timer starts, card shows running

---

# Phase 3: UI/UX - Input & Navigation

**Priority: HIGH** - Fixes keyboard and input issues

## Issues Addressed

### 3.1 Keyboard Blocks Confirm in Task Detail

**Problem:** Can't confirm title/timer because keyboard hides confirm button, the confirm button appears but when i try to press it, it doesn't take any action until i hide the keyboard first

**Files to Modify:**
- `components/TaskDetailModal.tsx`

**Fix:**
1. Remove `onBlur={saveText}` from title input
2. Add explicit confirm button that works with keyboard visible
3. Set `keyboardShouldPersistTaps="handled"` on ScrollView
4. Use `blurOnSubmit={false}` to keep keyboard

```typescript
<TextInput
  style={[styles.titleInput, { color: colors.text }]}
  value={editText}
  onChangeText={setEditText}
  onSubmitEditing={() => {
    saveText();
  }}
  blurOnSubmit={false}  // Keep keyboard visible
  // Remove onBlur handler - save handled by explicit button
/>
```

Add floating confirm button that persists above keyboard.

---

### 3.2 Keyboard Blocks Note Input

**Problem:** In note-detail page, keyboard hides writing area

**Files to Modify:**
- `app/note-detail.tsx`

**Fix:**
```typescript
return (
  <KeyboardAvoidingView 
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -110}
  >
    <ScrollView contentContainerStyle={styles.container}>
      {/* Input with proper scroll adjustment */}
    </ScrollView>
  </KeyboardAvoidingView>
);
```

Also ensure floating action buttons use InputAccessoryView or remain visible.

---

### 3.3 Subtask Creation in Detail Page

**Problem:** Creating subtask in detail modal doesn't work

**Files to Modify:**
- `components/TaskDetailModal.tsx`

**Fix:** Ensure `addTodo` is called with explicit status
```typescript
const handleAddSubtask = () => {
  if (newSubtaskText.trim() && userId && currentTodoId) {
    addTodo({
      userId: userId!,
      text: newSubtaskText.trim(),
      parentId: currentTodoId!,
      projectId: todo?.projectId,
      ...(newSubDuration && { timerDuration: newSubDuration }),
      status: "not_started", // Explicit default
    });
    setNewSubtaskText("");
  }
};
```

---

## Testing Checklist for Phase 3

- [ ] Type title, keyboard visible → can tap confirm
- [ ] Open note, type → input visible above keyboard
- [ ] Add subtask in detail modal → appears in list

---

# Phase 4: Task Grouping & Display

**Priority: HIGH** - Fixes task list display

## Issues Addressed

### 4.1 Done Tasks Still in Today Section

**Problem:** Tasks completed today still appear in "Today" alongside active tasks

**Files to Modify:**
- `app/(tabs)/index.tsx`

**Fix:**
```typescript
// In normalizedTodos filtering - only add non-done to today
if (t.status === 'done') {
  // Only add to groupedDoneTodos
  if (isDoneToday) {
    // Optional: show in "Completed Today" section
  }
} else {
  // Today section: only NOT done tasks
  if (isScheduledForToday) {
    today.push(t);
  }
}
```

---

### 4.2 Rename "All" to "To-Do"

**Problem:** "All" filter shows all tasks including done

**Expected:** "To-Do" should show not_started + not_done (active tasks only)

**Files to Modify:**
- `app/(tabs)/index.tsx`

**Fix:**
```typescript
// Line 220-227
const filterLabel = filter === 'All' ? (isArabic ? 'المهام' : 'To-Do') : 
                  filter === 'In Progress' ? t.inProgress : t.done;

// In displayedTodos filtering
const displayedTodos = useMemo(() => {
    if (activeFilter === 'To-Do') {
        // Show not_started + not_done (active tasks)
        return todayTodos.filter(t => t.status !== 'done');
    }
    if (activeFilter === 'In Progress') return todayTodos.filter(t => t.status === 'in_progress');
    return todayTodos;
}, [todayTodos, activeFilter]);
```

---

## Testing Checklist for Phase 4

- [ ] Mark task done → moves to Done section only
- [ ] "To-Do" filter → shows not_started + not_done

---

# Phase 5: Floating Action Button

**Priority: MEDIUM** - Design improvement

## Issue Addressed

### 5.1 FAB Button Design

**Problem:** Add task button is a text link at bottom of list

**Expected:** Floating circle button, lemon green (#D4F82D), dark plus icon, bottom-right

**Files to Modify:**
- `components/TodoInput.tsx`
- `assets/styles/home.styles.ts`

**Fix in home.styles.ts:**
```typescript
addButtonFloating: {
  position: 'absolute',
  bottom: 24,
  right: 24,
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: '#D4F82D',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 6,
  zIndex: 100,
},
```

**Fix in TodoInput.tsx:**
- Always render FAB (not conditional on isAdding)
- On press: set isAdding(true) or directly show TaskDetailModal for new task

---

## Testing Checklist for Phase 5

- [ ] FAB visible bottom-right, green circle
- [ ] Tap opens add task interface

---

# Phase 6: Notifications (Advanced)

**Priority: MEDIUM** - Enhancement

## Issue Addressed

### 6.1 Notification Sound Not Changeable

**Problem:** Notification uses hardcoded alarm sound

**Expected:** User can select sound in settings

**Files to Modify:**
- `utils/notifications.ts`
- `app/(tabs)/settings.tsx` (or create settings component)

**Fix:**
```typescript
// 1. Store user preference
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SOUND_KEY = 'notificationSound';

// Get user preference
export async function getNotificationSound(): Promise<string> {
  const sound = await AsyncStorage.getItem(NOTIFICATION_SOUND_KEY);
  return sound || ALARM_SOUND;
}

// 2. Update channel creation to use user preference
export async function requestPermissionsAsync() {
  // ... existing channel setup ...
  const userSound = await getNotificationSound();
  
  await Notifications.setNotificationChannelAsync('tasks', {
    name: 'Task Timers',
    importance: Notifications.AndroidImportance.MAX,
    sound: userSound,  // Use user preference
    // ...
  });
}

// 3. Update notification scheduling
export async function scheduleTimerCompletion(...) {
  const sound = await getNotificationSound();
  await Notifications.scheduleNotificationAsync({
    content: {
      sound: sound,  // User's selected sound
      // ...
    }
  });
}
```

**Settings UI:** Add sound picker in settings with options:
- Default
- Alarm Tone (current)
- Chime
- Custom (if supporting custom sounds)

---

## Testing Checklist for Phase 6

- [ ] Settings shows sound options
- [ ] Selected sound plays in notification

---

# Implementation Order Summary

| Phase | Priority | Issues | Estimated Complexity |
|-------|----------|--------|-------------------|
| 1 | Critical | 3 | Low |
| 2 | High | 3 | Medium |
| 3 | High | 3 | Medium |
| 4 | High | 2 | Low |
| 5 | Medium | 1 | Low |
| 6 | Medium | 1 | Medium |

---

# File Index

| File | Phases |
|------|--------|
| `hooks/useTaskTimers.ts` | 1 |
| `hooks/useOfflineQuery.ts` | 1 |
| `convex/todos.ts` | 2, 3 |
| `components/TaskDetailModal.tsx` | 2, 3 |
| `app/note-detail.tsx` | 3 |
| `app/(tabs)/index.tsx` | 4 |
| `components/TodoInput.tsx` | 5 |
| `assets/styles/home.styles.ts` | 5 |
| `utils/notifications.ts` | 6 |
| `app/(tabs)/settings.tsx` | 6 |