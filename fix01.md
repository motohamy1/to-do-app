# ToDoIt Bug Fixes - Implementation Plan

## Overview

This document outlines the comprehensive fix plan for the ToDoIt app, addressing issues with task status logic, notification system, and projects page functionality.

---

## Phase 1: Task Status Logic Fixes

**Spec Name:** `002-task-status-logic`  
**Branch:** `002-task-status-logic`

### Issues Addressed

1. Timer completion should mark task as 'done' and show in done section
2. After creating a task, it appears in main page as "not done" with lemon green border card
3. When paused, task should return to default card state/color and move to "All tasks" (not "In Progress")
4. Completed tasks from past days still appear in "Tasks for Today"
5. Completed tasks don't appear in Done section
6. Circular timer not visible immediately after setting timer

### Task Breakdown

| Task ID | Description | File(s) | Priority |
|---------|-------------|---------|----------|
| T1.1 | New tasks default to `not_done` status with lemon green border | `convex/todos.ts`, `components/TodoInput.tsx` | P1 |
| T1.2 | Remove incorrect `not_done` assignment on due date expiry | `components/TodoCard.tsx:188-193` | P1 |
| T1.3 | Fix task categorization - paused tasks go to "All", not "In Progress" | `app/(tabs)/index.tsx:78-121` | P1 |
| T1.4 | Update done section to show completed tasks by day | `app/(tabs)/index.tsx` | P1 |
| T1.5 | Show completed tasks in Planner under their original day | `app/(tabs)/planner.tsx` | P2 |
| T1.6 | Add horizontal flatlist for multiple completed tasks per day | `app/(tabs)/index.tsx` | P2 |
| T1.7 | Fix circular timer visibility after setting timer | `components/TodoCard.tsx` | P2 |

### Implementation Details

#### T1.1 - New Tasks Default to "Not Done" with Lemon Green Border

**Current:** Tasks created default to `not_started` (neutral gray card)  
**Expected:** Tasks should default to `not_done` status with lemon green border card

**Rationale:** 
- A new task that hasn't been started yet but is on the list is considered "not done" (needs action)
- The lemon green border visually indicates urgency/attention needed
- This matches user's expectation that tasks appear ready for action

**Files to modify:**
- `convex/todos.ts` - Change `addTodo` mutation to set `status: "not_done"` by default
- `components/TodoInput.tsx` - Verify `not_done` status is passed on creation

**Code Change in `convex/todos.ts`:**
```ts
// In addTodo mutation, change:
status: args.status || "not_started",

// To:
status: args.status || "not_done",
```

**Expected Card Appearance:**
- Border: Lemon green (#D4F82D)
- Background: Neutral (not red)
- Badge: "Not Done" (or localized equivalent)
- Start button visible (waiting for user to begin)

#### T1.2 - Fix Card States and Color Logic

**Location:** `components/TodoCard.tsx:188-193`, `components/TodoCard.tsx:301-346`

**Issue 1: Due Date Auto-Mark**
The current effect incorrectly auto-marks tasks as 'not_done' when due date passes.

**Solution:** Remove this auto-marking effect. Tasks should only change to 'not_done' when:
- User explicitly marks them
- Or task timer expires and reaches 0 (then marks as 'done', not 'not_done')

**Issue 2: Card Colors by Status**
Update the card styling logic to match new status colors:

| Status | Border Color | Background | Badge |
|--------|--------------|------------|-------|
| `not_done` | Lemon Green (#D4F82D) | Neutral gray | "Not Done" |
| `not_started` | Primary blue | Neutral gray | "Not Started" |
| `in_progress` | Warning orange | Yellow tint | "In Progress" |
| `paused` | Primary blue | Light orange | "Paused" |
| `done` | Success green | Light green | "Done" |

**Remove from `TodoCard.tsx:188-193`:**
```tsx
// DELETE this entire useEffect - causes unwanted auto status change
useEffect(() => {
  if (todo.status === 'not_started' && todo.dueDate && todo.dueDate < Date.now()) {
    updateStatus({ id: todo._id, status: 'not_done' });
  }
}, [todo.status, todo.dueDate, todo._id]);
```

**Update card styling in `TodoCard.tsx:301-346`:**
```tsx
// Add not_done styling with lemon green border
if (todo.status === "not_done") { 
  cardBg = "#F1F5F9";  // Light gray background
  cardBorderColor = "#D4F82D";  // Lemon green border - URGENT/ACTION NEEDED
}
```

#### T1.3 - Fix Task Categorization (Paused → "All", Not "In Progress")

**Location:** `app/(tabs)/index.tsx:78-121`, filter pills logic

**Current Problem:**
When a timer is paused, the task:
- Stays in the "In Progress" filter section
- Shows paused/warning colors

**Expected Behavior:**
When a timer is paused, the task should:
- Move to "All tasks" section (neutral, awaiting user decision)
- Show default/neutral card styling (not warning/in-progress colors)
- User must explicitly resume to put back in "In Progress"

**New Logic:**
1. **"In Progress" filter:** ONLY shows tasks with status `in_progress` (timer actively running)
2. **"All" filter:** Shows ALL tasks regardless of status (not_started, not_done, paused, done)
3. **"Done" filter:** Shows only tasks with status `done`

**Key Code Changes:**

```tsx
// In displayedTodos filter logic (line 150-154):
const displayedTodos = useMemo(() => {
    if (activeFilter === 'Done') return todayTodos.filter(t => t.status === 'done');
    // PAUSED tasks go to "All" - not "In Progress"
    if (activeFilter === 'In Progress') return todayTodos.filter(t => t.status === 'in_progress');
    return todayTodos;  // "All" shows everything
}, [todayTodos, activeFilter]);
```

```tsx
// When timer is paused, update status to 'not_started' (neutral)
// This is handled in convex/todos.ts pauseTimer mutation
// OR we can add a new status 'paused_display' that shows as neutral

// Recommended: Change paused tasks back to 'not_started' when paused
// User can resume to put back to 'in_progress'
```

**Filter Pill Counts Update:**
```tsx
// Update count logic:
const inProgressCount = todayTodos.filter(t => t.status === 'in_progress').length;
// NOTE: Paused tasks are NOT counted in "In Progress"
// They appear in "All" section
```

**Key Changes - Task Grouping:**
```tsx
const { todayTodos, overdueTodos, completedTodos } = useMemo(() => {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const tomorrowStart = todayStart + 86400000;

  const today: any[] = [];      // Tasks for today (any status except done)
  const overdue: any[] = [];     // Past due tasks (not done)
  const completed: any[] = [];   // Completed tasks (grouped by day)

  normalizedTodos.forEach(t => {
    // Task completed today
    const isDoneToday = t.status === 'done' && t.completedAt >= todayStart && t.completedAt < tomorrowStart;
    // Task scheduled for today
    const isScheduledForToday = !t.date || (t.date >= todayStart && t.date < tomorrowStart);
    // Task was due in the past and not done
    const isOverdue = t.date !== undefined && t.date < todayStart && t.status !== 'done';

    if (isDoneToday) {
      completed.push({ ...t, completedDay: todayStart });
    } else if (isScheduledForToday) {
      today.push(t);
    } else if (isOverdue) {
      overdue.push(t);
    }
  });

  return { todayTodos: today, overdueTodos: overdue, completedTodos: completed };
}, [normalizedTodos]);
```

#### T1.4 - Update Done Section to Show Completed Tasks by Day

**Location:** `app/(tabs)/index.tsx`

**Implementation:**
- Create a new "Completed" section that groups completed tasks by their `completedAt` timestamp
- Group by day (same as overdue tasks)
- Show horizontal FlatList for multiple tasks per day

```tsx
{completedTodos.length > 0 && (
  <View style={{ marginTop: 24 }}>
    <Text style={homeStyles.sectionTitleText}>{t.completedSection}</Text>
    {completedByDay.map(({ dayTimestamp, tasks: dayTasks }) => (
      <View key={dayTimestamp}>
        <Text>{formatDayLabel(dayTimestamp)}</Text>
        <FlatList
          horizontal
          data={dayTasks}
          renderItem={({ item }) => <TodoCard todo={item} ... />}
          keyExtractor={item => item._id}
        />
      </View>
    ))}
  </View>
)}
```

#### T1.5 - Show Completed Tasks in Planner

**Location:** `app/(tabs)/planner.tsx`

**Implementation:**
- Modify Planner logic to include completed tasks in their respective day views
- Completed tasks should appear in a distinct "completed" subsection within each day

#### T1.6 - Horizontal FlatList for Multiple Tasks Per Day

**Location:** `app/(tabs)/index.tsx`

**Implementation:**
- Replace vertical list with horizontal FlatList when multiple completed tasks exist for a day
- Use existing card styling with horizontal scroll

#### T1.7 - Fix Circular Timer Visibility

**Location:** `components/TodoCard.tsx`

**Issue:** After setting a timer, the circular timer doesn't appear until the user reopens the task detail page.

**Solution:**
- Ensure `timerDuration` is properly saved to the backend
- Add local state update for immediate UI feedback
- The circular progress should show immediately after `setTimer` mutation completes

---

## Phase 2: Notification System Improvements

**Spec Name:** `003-notification-improvements`  
**Branch:** `003-notification-improvements`

### Issues Addressed

1. Timer completion notifications work inconsistently
2. Need timer controls (play/pause/reset) in notification center
3. Missing "Due Tasks for Today" morning notification
4. Missing "Missed/Not Done Tasks" evening summary notification

### Notification Types

| Notification | Trigger | Time | Purpose |
|--------------|---------|------|---------|
| Timer Completion | Timer reaches 0 | Immediate | Alert user their timed task is complete |
| Due Tasks Today | Daily check | Morning (9:00 AM) | Remind of tasks due today |
| Missed Tasks | Daily check | Evening (8:00 PM) | Summarize not-done and overdue tasks |

### Task Breakdown

| Task ID | Description | File(s) | Priority |
|---------|-------------|---------|----------|
| T2.1 | Update expo-notifications to remove deprecated props | `utils/notifications.ts` | P1 |
| T2.2 | Timer completion notification (reliable firing) | `utils/notifications.ts`, `components/TodoCard.tsx` | P1 |
| T2.3 | "Due Tasks for Today" morning notification | `utils/notifications.ts`, `hooks/useDailyNotifications.ts` | P1 |
| T2.4 | "Missed/Not Done Tasks" evening notification | `utils/notifications.ts`, `hooks/useDailyNotifications.ts` | P1 |
| T2.5 | Add persistent notification while timer runs | `components/TodoCard.tsx`, `hooks/useActiveTimer.ts` | P2 |
| T2.6 | Add native action buttons (Play/Pause/Reset) | `utils/notifications.ts` | P2 |
| T2.7 | Handle notification action callbacks | `app/_layout.tsx` | P2 |

### Implementation Details

#### T2.1 - Fix Deprecated Notification Props

**Location:** `utils/notifications.ts`

**Current (problematic):**
```tsx
sticky: false,
autoDismiss: false,
```

**Problem:** These props are deprecated in newer expo-notifications

**Solution:** Remove deprecated props, use channel-based behavior instead

#### T2.2 - Timer Completion Notification (Reliable Firing)

**Location:** `utils/notifications.ts`, `components/TodoCard.tsx`

**Current Issue:** Timer completion notifications work inconsistently.

**Root Causes:**
1. Deprecated `sticky` and `autoDismiss` props causing silent failures
2. Notification scheduled but not properly linked to timer completion event
3. Missing verification that notification fires when `timeLeft` reaches 0

**Solution:**
```tsx
// utils/notifications.ts - Fix scheduleTimerNotification
export async function scheduleTimerNotification(
  title: string, 
  durationMs: number, 
  taskId: string,
  isSubtask = false, 
  language: string = 'en'
): Promise<string> {
  // ... existing code ...

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: isSubtask ? t.notifSubtaskTitle : t.notifTaskTitle,
      body: (isSubtask ? t.notifSubtaskBody : t.notifTaskBody) + `"${title}"`,
      sound: ALARM_SOUND,
      data: { taskId, type: 'timer_completion' },  // Add data for tracking
      // Remove deprecated props
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.floor(durationMs / 1000)),
      channelId: isSubtask ? 'subtasks' : 'tasks',
    } as any,
  });
  return id;
}
```

**Verification Flow:**
1. When timer starts, schedule completion notification
2. Store notification ID with task
3. On timer complete (in component), verify notification fires
4. Cancel notification if task deleted or timer reset

#### T2.3 - "Due Tasks for Today" Morning Notification

**Location:** `utils/notifications.ts`, new hook `hooks/useDailyNotifications.ts`

**Purpose:** Morning reminder of tasks scheduled for today.

**Trigger:** Daily at 9:00 AM (configurable)

**Logic:**
1. At scheduled time, query tasks where `date` is today AND status is NOT 'done'
2. If tasks exist, send notification listing count and titles
3. If no tasks, optionally skip notification

**Implementation:**
```tsx
// hooks/useDailyNotifications.ts
export function useDailyNotifications() {
  const todos = useOfflineQuery<any[]>('todos', api.todos.get, userId ? { userId } : "skip");
  
  useEffect(() => {
    // Schedule morning notification at app start
    scheduleDueTasksNotification(todos);
  }, [todos]);
}

// utils/notifications.ts
export async function scheduleDueTasksNotification(
  tasks: any[], 
  language: string = 'en'
): Promise<void> {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayEnd = todayStart + 86400000;
  
  // Filter tasks due today that aren't done
  const dueToday = tasks.filter(t => 
    t.date >= todayStart && 
    t.date < todayEnd && 
    t.status !== 'done'
  );
  
  if (dueToday.length === 0) return;
  
  const t = translations[language] || translations.en;
  const taskTitles = dueToday.slice(0, 3).map(t => t.text).join(', ');
  const moreCount = dueToday.length - 3;
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t.dueTasksMorningTitle || "📋 Tasks Due Today",
      body: dueToday.length === 1 
        ? `You have 1 task: ${taskTitles}`
        : `You have ${dueToday.length} tasks: ${taskTitles}${moreCount > 0 ? ` and ${moreCount} more` : ''}`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
      channelId: 'daily',
    } as any,
  });
}
```

#### T2.4 - "Missed/Not Done Tasks" Evening Notification

**Location:** `utils/notifications.ts`, `hooks/useDailyNotifications.ts`

**Purpose:** Evening summary of tasks that weren't completed.

**Trigger:** Daily at 8:00 PM (configurable)

**Logic:**
1. At scheduled time, query tasks where:
   - `date` is before today AND status is NOT 'done' (overdue)
   - OR `status === 'not_done'` (explicitly marked not done)
2. Send notification with count and examples
3. Optionally categorize: overdue vs. not done

**Implementation:**
```tsx
// utils/notifications.ts
export async function scheduleMissedTasksNotification(
  tasks: any[], 
  language: string = 'en'
): Promise<void> {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  
  // Filter overdue and not-done tasks
  const missedTasks = tasks.filter(t => 
    (t.date < todayStart && t.status !== 'done') || 
    t.status === 'not_done'
  );
  
  if (missedTasks.length === 0) return;
  
  const t = translations[language] || translations.en;
  
  const overdue = missedTasks.filter(t => t.date < todayStart && t.status !== 'done');
  const notDone = missedTasks.filter(t => t.status === 'not_done');
  
  let body = '';
  if (overdue.length > 0 && notDone.length > 0) {
    body = `${overdue.length} overdue, ${notDone.length} not done`;
  } else if (overdue.length > 0) {
    body = `${overdue.length} overdue tasks`;
  } else {
    body = `${notDone.length} tasks marked as not done`;
  }
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: t.missedTasksEveningTitle || "📝 Unfinished Tasks",
      body: body,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
      channelId: 'daily',
    } as any,
  });
}
```

#### T2.5 - Persistent Timer Running Notification (Optional Enhancement)

**Location:** `components/TodoCard.tsx`, `hooks/useActiveTimer.ts`

**Purpose:** Show ongoing notification while timer is actively counting down.

**Note:** This is complex to implement reliably. Consider as Phase 2 optional enhancement.

**Flow:**
1. User starts timer → Show notification with task name, time remaining
2. Notification updates every minute or on significant time milestones
3. User can control timer from notification (see T2.6)
4. On pause/complete → Cancel or replace notification

#### T2.3 - Native Action Buttons

**Actions to implement:**
- **Pause:** Pause the running timer
- **Resume:** Resume paused timer
- **Reset:** Reset timer to initial duration

**Location:** `utils/notifications.ts`

```tsx
Notifications.setNotificationCategoryAsync('timer', [
  {
    actionId: 'pause',
    buttonTitle: 'Pause',
    options: { opensApp: false },
  },
  {
    actionId: 'resume',
    buttonTitle: 'Resume',
    options: { opensApp: false },
  },
  {
    actionId: 'reset',
    buttonTitle: 'Reset',
    options: { opensApp: false },
  },
]);
```

#### T2.4 - Handle Notification Action Callbacks

**Location:** `app/_layout.tsx`

```tsx
Notifications.addNotificationResponseReceivedListener(response => {
  const actionId = response.actionIdentifier;
  const taskId = response.notification.request.content.data.taskId;

  switch (actionId) {
    case 'pause':
      pauseTimer({ id: taskId });
      break;
    case 'resume':
      startTimer({ id: taskId });
      break;
    case 'reset':
      resetTimer({ id: taskId });
      break;
  }
});
```

---

## Phase 3: Long Press Options - Comprehensive Fix

**Spec Name:** `004-long-press-functionality`  
**Branch:** `004-long-press-functionality`

### Issues Addressed

Ensure ALL long press action options are functional across the entire app:

1. **Projects Page (`app/(tabs)/projects.tsx`)**
   - Delete Sub-Category → empty onPress handler (line 449)
   - Delete Project (Category Detail) → empty onPress handler (line 483)
   - Delete Project (Sub-Category Detail) → empty onPress handler (line 589)
   - Edit Sub-Category → needs wiring
   - Edit Project → needs wiring
   - Share options → needs verification

2. **Main Page (`app/(tabs)/index.tsx`)**
   - Task long press actions (lines 250, 270, 330)
   - Action modal with Edit, Link Project, Share, Delete options

3. **Planner Page (`app/(tabs)/planner.tsx`)**
   - Task long press actions (lines 256, 292)
   - Delete and other options

4. **Add Page (`app/(tabs)/add.tsx`)**
   - Task long press actions (line 121)

5. **Task Detail Modal (inside TodoCard & ProjectDetailView)**
   - Delete task option (line 848)
   - Delete resource option (line 926)

### Long Press Locations Inventory

| Location | Component | Lines | Missing Functionality |
|----------|-----------|-------|----------------------|
| Projects | SubCategoryCard | 449 | Delete Sub-Category |
| Projects | ProjectGridCard (Category) | 483 | Delete Project |
| Projects | ProjectGridCard (SubCat) | 589 | Delete Project |
| Main Page | TodoCard (today) | 250 | Verify all options work |
| Main Page | TodoCard (done) | 270 | Verify all options work |
| Main Page | TodoCard (overdue) | 330 | Verify all options work |
| Planner | TodoCard | 256, 292 | Verify all options work |
| Add | Task Item | 121 | Verify all options work |
| ProjectDetail | Task Item | 848 | Delete task |
| ProjectDetail | Resource | 926 | Delete resource |

### Task Breakdown

| Task ID | Description | File(s) | Priority |
|---------|-------------|---------|----------|
| T3.1 | Create `deleteSubCategory` mutation | `convex/projects.ts` | P1 |
| T3.2 | Create `deleteProject` mutation | `convex/projects.ts` | P1 |
| T3.3 | Create `editSubCategory` mutation | `convex/projects.ts` | P1 |
| T3.4 | Create `editProject` mutation | `convex/projects.ts` | P1 |
| T3.5 | Wire Delete Sub-Category handler | `app/(tabs)/projects.tsx:449` | P1 |
| T3.6 | Wire Delete Project handler (2 locations) | `app/(tabs)/projects.tsx:483,589` | P1 |
| T3.7 | Wire Edit Sub-Category handler | `app/(tabs)/projects.tsx` | P1 |
| T3.8 | Wire Edit Project handler | `app/(tabs)/projects.tsx` | P1 |
| T3.9 | Verify Main Page long press options | `app/(tabs)/index.tsx` | P1 |
| T3.10 | Verify Planner long press options | `app/(tabs)/planner.tsx` | P1 |
| T3.11 | Verify Add page long press options | `app/(tabs)/add.tsx` | P1 |
| T3.12 | Add confirmation dialogs for all delete actions | All affected files | P2 |
| T3.13 | Add Share functionality for Sub-Categories | `app/(tabs)/projects.tsx` | P2 |

### Implementation Details

#### T3.1 - Create deleteSubCategory Mutation

**Location:** `convex/projects.ts`

**Prerequisites:** Check if `deleteSubCategory` already exists before creating.

```ts
export const deleteSubCategory = mutation({
  args: { id: v.id("projectSubCategories") },
  handler: async (ctx, args) => {
    // Delete all projects in this sub-category first
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_subCategory", (q) => q.eq("subCategoryId", args.id))
      .collect();
    
    for (const project of projects) {
      // Delete project resources
      const resources = await ctx.db
        .query("projectResources")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      for (const res of resources) await ctx.db.delete(res._id);
      
      // Delete project checklists
      const checklists = await ctx.db
        .query("projectChecklists")
        .filter((q) => q.eq(q.field("projectId"), project._id))
        .collect();
      for (const cl of checklists) await ctx.db.delete(cl._id);
      
      // Unlink todos from this project
      const todos = await ctx.db
        .query("todos")
        .filter((q) => q.eq(q.field("projectId"), project._id))
        .collect();
      for (const todo of todos) {
        await ctx.db.patch(todo._id, { projectId: undefined });
      }
      
      await ctx.db.delete(project._id);
    }

    // Delete the sub-category
    await ctx.db.delete(args.id);
  },
});
```

#### T3.2 - Create deleteProject Mutation

**Location:** `convex/projects.ts`

**Prerequisites:** Check if `deleteProject` already exists before creating.

```ts
export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    // 1. Unlink all todos associated with this project
    const todos = await ctx.db
      .query("todos")
      .filter((q) => q.eq(q.field("projectId"), args.id))
      .collect();
    
    for (const todo of todos) {
      await ctx.db.patch(todo._id, { projectId: undefined });
    }

    // 2. Delete all resources
    const resources = await ctx.db
      .query("projectResources")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    
    for (const resource of resources) {
      await ctx.db.delete(resource._id);
    }

    // 3. Delete all checklists
    const checklists = await ctx.db
      .query("projectChecklists")
      .filter((q) => q.eq(q.field("projectId"), args.id))
      .collect();
    
    for (const checklist of checklists) {
      await ctx.db.delete(checklist._id);
    }

    // 4. Delete the project
    await ctx.db.delete(args.id);
  },
});
```

#### T3.3 - Create editSubCategory Mutation

**Location:** `convex/projects.ts`

**Prerequisites:** Check if `updateSubCategory` or `editSubCategory` already exists.

```ts
export const updateSubCategory = mutation({
  args: { 
    id: v.id("projectSubCategories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});
```

#### T3.4 - Create editProject Mutation

**Location:** `convex/projects.ts`

**Note:** `updateProject` mutation likely already exists. Verify before creating.

```ts
// Check if this exists in projects.ts
// export const updateProject = mutation({ ... })
```

#### T3.5-3.8 - Wire Up onPress Handlers

**Location:** `app/(tabs)/projects.tsx`

**Required Mutations to Add:**
```tsx
// At top of component, add:
const deleteSubCategory = useMutation(api.projects.deleteSubCategory);
const deleteProject = useMutation(api.projects.deleteProject);
const updateSubCategory = useMutation(api.projects.updateSubCategory);
const updateProject = useMutation(api.projects.updateProject);
```

**Line 449 - Sub-Category Long Press (Delete):**
```tsx
// BEFORE (broken):
{ label: 'Delete Sub-Category', icon: 'trash-outline', variant: 'destructive', onPress: () => {} }

// AFTER (fixed):
{ 
  label: isArabic ? 'حذف الفئة الفرعية' : 'Delete Sub-Category', 
  icon: 'trash-outline', 
  variant: 'destructive', 
  onPress: () => {
    Alert.alert(
      isArabic ? 'حذف الفئة الفرعية' : 'Delete Sub-Category',
      isArabic ? 'هل أنت متأكد؟ سيتم حذف جميع المشاريع بداخلها.' : 'Are you sure? All projects inside will be deleted.',
      [
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isArabic ? 'حذف' : 'Delete', style: 'destructive', onPress: () => deleteSubCategory({ id: sub._id }) }
      ]
    );
  }
}
```

**Line 449 - Sub-Category Long Press (Edit):**
```tsx
// BEFORE: Edit Sub-Category onPress likely empty or missing

// AFTER:
{ 
  label: isArabic ? 'تعديل الفئة الفرعية' : 'Edit Sub-Category', 
  icon: 'create-outline', 
  onPress: () => onEditSubCategory(sub)  // Already wired to open modal
}
```

**Lines 483 & 589 - Delete Project:**
```tsx
// BEFORE:
{ label: 'Delete Project', icon: 'trash-outline', variant: 'destructive', onPress: () => {} }

// AFTER:
{ 
  label: isArabic ? 'حذف المشروع' : 'Delete Project', 
  icon: 'trash-outline', 
  variant: 'destructive', 
  onPress: () => {
    Alert.alert(
      isArabic ? 'حذف المشروع' : 'Delete Project',
      isArabic ? 'هل أنت متأكد؟ سيتم إلغاء ربط جميع المهام.' : 'Are you sure? All linked tasks will be unlinked.',
      [
        { text: isArabic ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isArabic ? 'حذف' : 'Delete', style: 'destructive', onPress: () => deleteProject({ id: project._id }) }
      ]
    );
  }
}
```

#### T3.9 - Verify Main Page Long Press Options

**Location:** `app/(tabs)/index.tsx`

**Current Implementation:** Uses `ActionModal` with options (lines 368-404)

**Options to verify:**
```tsx
options={[
  { 
    label: isArabic ? 'تعديل التفاصيل' : 'Edit Details', 
    icon: 'create-outline', 
    onPress: () => handleOpenTimerModal(selectedTodoForAction?._id)  // ✓ Wired
  },
  {
    label: isArabic ? 'ربط بمشروع' : 'Link Project',  // ✓ Wired
    icon: 'folder-outline',
    onPress: () => handleOpenProjectModal(selectedTodoForAction?._id)
  },
  { 
    label: isArabic ? 'مشاركة' : 'Share',  // ✓ Wired
    icon: 'share-social-outline', 
    onPress: () => Share.share({ message: `${selectedTodoForAction?.text || 'Untitled'}\n\n${selectedTodoForAction?.description || ''}` }) 
  },
  { 
    label: isArabic ? 'حذف' : 'Delete',  // ✓ Wired
    icon: 'trash-outline', 
    variant: 'destructive',
    onPress: () => {
      if (selectedTodoForAction?._id) {
        deleteTodo({ id: selectedTodoForAction._id });
      }
    }
  }
]}
```

**Status:** All main page long press options appear to be wired correctly.

#### T3.10 - Verify Planner Long Press Options

**Location:** `app/(tabs)/planner.tsx`

**Check lines 256, 292** - verify long press actions open ActionModal with proper options.

#### T3.11 - Verify Add Page Long Press Options

**Location:** `app/(tabs)/add.tsx`

**Check line 121** - verify long press actions are functional.

#### T3.12 - Add Confirmation Dialogs

**Pattern for all destructive actions:**
```tsx
Alert.alert(
  title,           // Localized delete confirmation title
  message,         // Localized warning message
  [
    { text: cancelText, style: 'cancel' },
    { text: deleteText, style: 'destructive', onPress: () => performDelete() }
  ]
);
```

**Locations requiring confirmation dialogs:**
- Delete Sub-Category (projects.tsx:449)
- Delete Project (projects.tsx:483)
- Delete Project (projects.tsx:589)
- Delete Category (projects.tsx:343) - May already have
- Delete Task (main page via ActionModal) - May already have
- Delete Resource (projects.tsx:926) - May already have

#### T3.13 - Add Share for Sub-Categories

**Location:** `app/(tabs)/projects.tsx`

**In Sub-Category long press options (around line 449):**
```tsx
{
  label: isArabic ? 'مشاركة الفئة الفرعية' : 'Share Sub-Category',
  icon: 'share-social-outline',
  onPress: () => Share.share({ message: `Sub-Category: ${sub.name}` })
},
```

---

## Phase 4: Testing & QA (Future)

### Items to Test
- [ ] End-to-end flow: Create task → Set timer → Timer completes → Task marked done
- [ ] Long press flows across all screens
- [ ] Notification delivery on both iOS and Android
- [ ] RTL layout for Arabic language
- [ ] Offline behavior with sync

---

## Suggested Implementation Order

| Phase | Priority | Effort | Risk | Reason |
|-------|----------|--------|------|--------|
| **Phase 3** | 🔴 P1 | Low | Low | Missing implementations (quick win) |
| **Phase 1** | 🔴 P1 | High | Medium | Core functionality broken |
| **Phase 2** | 🟡 P2 | Medium | High | Platform-specific complexity |

### Recommended Timeline

**Week 1:**
- Day 1-2: Phase 3 - Projects CRUD (quick fixes)
- Day 3-4: Phase 1 (T1.1, T1.2) - Critical status fixes
- Day 5: Phase 1 (T1.3, T1.4) - Categorization fixes

**Week 2:**
- Day 1-2: Phase 1 (T1.5, T1.6, T1.7) - Polish
- Day 3-4: Phase 2 (T2.1, T2.2) - Notification basics
- Day 5: Phase 2 (T2.3, T2.4) - Native actions

---

## Verification Checklist

### Phase 1 Verification
- [ ] New task shows lemon green border card (not red, not gray)
- [ ] New task badge shows "Not Done" (not "Not Started")
- [ ] Timer completion → task in Done section
- [ ] Done from detail page → correct status on main page
- [ ] Completed tasks appear under their day in Planner
- [ ] Multiple completed tasks per day → horizontal scroll
- [ ] Paused task shows default/neutral card (not warning colors)
- [ ] Paused task appears in "All tasks" (not "In Progress")
- [ ] Resume action moves task back to "In Progress"

### Phase 2 Verification
- [ ] Timer completion notification fires reliably when timer reaches 0
- [ ] "Due Tasks for Today" notification appears at 9:00 AM (if tasks exist)
- [ ] "Missed/Not Done Tasks" notification appears at 8:00 PM (if tasks exist)
- [ ] Notification content correctly lists task names and counts
- [ ] Notifications don't fire when no relevant tasks exist
- [ ] Pause from notification pauses timer (if T2.6 implemented)
- [ ] Resume from notification resumes timer (if T2.6 implemented)
- [ ] Reset from notification resets timer (if T2.6 implemented)

### Phase 3 Verification
- [ ] **Projects Page:**
  - [ ] Long press Category → Edit works
  - [ ] Long press Category → Delete works (with confirmation)
  - [ ] Long press Category → Share works
  - [ ] Long press Sub-Category → Edit works
  - [ ] Long press Sub-Category → Delete works (with confirmation)
  - [ ] Long press Sub-Category → Share works
  - [ ] Long press Project → Edit works
  - [ ] Long press Project → Delete works (with confirmation)
  - [ ] Long press Project → Share works
- [ ] **Main Page:**
  - [ ] Long press task → Edit Details works
  - [ ] Long press task → Link to Project works
  - [ ] Long press task → Share works
  - [ ] Long press task → Delete works (with confirmation)
- [ ] **Planner Page:**
  - [ ] Long press task → All options work
- [ ] **Add Page:**
  - [ ] Long press task → All options work
- [ ] **Project Detail:**
  - [ ] Long press task → All options work
  - [ ] Long press resource → Delete works
- [ ] **Cascade Deletion:**
  - [ ] Deleting Sub-Category deletes all child Projects
  - [ ] Deleting Project unlinks associated Tasks (doesn't delete)
  - [ ] Deleting Project deletes associated Resources
  - [ ] Deleting Project deletes associated Checklists

---

## File Changes Summary

### Phase 1 Files
1. `convex/todos.ts` - Change default status from `not_started` to `not_done`
2. `components/TodoCard.tsx` - Add lemon green border for `not_done`, remove auto-mark effect, fix paused styling
3. `components/TodoInput.tsx` - Verify `not_done` status on creation
4. `app/(tabs)/index.tsx` - Fix categorization (paused → "All"), add completed section
5. `app/(tabs)/planner.tsx` - Include completed tasks under their day

### Phase 2 Files
6. `utils/notifications.ts` - Fix deprecated props, add timer/daily notifications
7. `utils/i18n.ts` - Add notification title translations
8. `hooks/useDailyNotifications.ts` - NEW: Daily notification scheduling hook
9. `app/_layout.tsx` - Handle notification action callbacks

### Phase 3 Files (NEW)
10. `convex/projects.ts` - Add `deleteSubCategory`, `updateSubCategory` mutations (verify `deleteProject`, `updateProject` exist)
11. `app/(tabs)/projects.tsx` - Wire up ALL long press handlers (lines 343, 449, 483, 589, 926)
12. `app/(tabs)/add.tsx` - Verify long press options work (line 121)
13. `app/(tabs)/planner.tsx` - Verify long press options work (lines 256, 292)
14. `app/(tabs)/index.tsx` - Verify long press options work (lines 250, 270, 330)
