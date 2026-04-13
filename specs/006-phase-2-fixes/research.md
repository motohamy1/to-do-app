# Phase 0: Technical Research

## Current Implementations & Findings

### 1. Timer Editing & Elapsed Time Preservation
**Current Behavior:** 
In `convex/todos.ts`, the `setTimer` mutation simply overwrites `timerDuration` with the new value. It does not adjust `timerStartTime` or `timeLeftAtPause`. As a result, if a timer is running (`in_progress`) or paused (`paused`), modifying the total duration either effectively resets the timer logic or causes the elapsed time to calculate incorrectly (or even result in a negative remaining time if not bounded).

**Required Changes:**
When `setTimer` is called with a new `duration`, we need to check the current task state:
- If `in_progress`, we calculate `elapsed = Date.now() - timerStartTime`. Then we can keep `elapsed` the same but adjust `timerStartTime` slightly if needed? Actually, `elapsed` depends purely on `Date.now() - timerStartTime`. If we change `duration`, `elapsed` doesn't change, but `remaining = duration - elapsed` changes. Wait! The issue says "timer resetting from scratch". Why would it reset?
Wait, if `timerStartTime` remains the same, `elapsed` is preserved. Maybe the UI resets it?
Let's look at `useTaskTimers.ts`. It uses `timerStartTime` and `timerDuration`. If `timerDuration` changes, `remaining = timerDuration - elapsed`. This doesn't reset.
But wait! If they edit the duration, how is it edited in `TaskDetailModal.tsx`?
When they click "Save Custom Timer", it calls `setTimer({ id: currentTodoId, duration: ms })`.
If `setTimer` just patches `timerDuration`, why does it "reset from scratch"?
Ah, maybe `TaskDetailModal.tsx` or `setTimer` doesn't preserve `timeLeftAtPause`? 
If paused: `timeLeftAtPause` is the remaining time. If we increase `duration` by 10m, we should increase `timeLeftAtPause` by 10m. Currently, `setTimer` does not adjust `timeLeftAtPause`. So if it was paused with 5m left out of 10m, and we change duration to 20m, it still has 5m left, effectively discarding the 10m added!
We must adjust `timeLeftAtPause` in `setTimer` if it exists.

### 2. Immediate Timer Start from Modal
**Current Behavior:**
In `TaskDetailModal.tsx`, clicking the "In Progress" status pill triggers `startTimer({ id: currentTodoId })`. However, if the user *just* added a timer and it hasn't synced, or if there's a lag, the UI might not reflect it immediately. Actually, the acceptance criteria states: "100% of tasks changed to 'In Progress' via the modal instantly begin their countdown without further user interaction."
Wait, if `timerStartTime` is not set yet, or we need to ensure the local state updates. Is there a gap?
Also, `TaskDetailModal.tsx` updates `status` to `in_progress` locally using `setStatus('in_progress')`. It calls `startTimer`. `startTimer` sets `status` to `in_progress` and `timerStartTime` to `Date.now()`.

### 3. Resume Task After Day Ends (Not Done to In Progress)
**Current Behavior:**
In `startTimer`, the start time is calculated as:
```typescript
    let newStartTime = Date.now();
    if (todo.status === "paused" && todo.timeLeftAtPause !== undefined && todo.timerDuration) {
        newStartTime = Date.now() - (todo.timerDuration - todo.timeLeftAtPause);
    }
```
If a task is `not_done`, `todo.status === "paused"` evaluates to false. Thus, `newStartTime` becomes `Date.now()` (resetting the timer completely) instead of preserving `timeLeftAtPause`.

**Required Changes:**
Update `startTimer` to check `if ((todo.status === "paused" || todo.status === "not_done") && todo.timeLeftAtPause !== undefined && todo.timerDuration)` to allow resuming with the previously saved `timeLeftAtPause`.

## Conclusion
We have identified the backend gaps causing the timer resets and incorrect resume logic. We can proceed to Phase 1 (Data Model & Contracts).
