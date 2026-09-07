import { getServerNow } from './offlineStorage';

export interface TimerDoc {
  _id: string;
  status?: string;
  parentId?: string;
  timerDuration?: number;
  timerDirection?: string;
  timerStartTime?: number;
  timeLeftAtPause?: number;
}

export interface RunUpdate {
  id: string;
  status: string;
  timerStartTime?: number | null;
  timeLeftAtPause?: number | null;
}

export const hasTimer = (t: TimerDoc): boolean =>
  t.timerDirection === 'up' || !!t.timerDuration;

// Every value is computed once, on the device, in server-corrected time, and
// then stored verbatim by `todos:setTimerRunState`. Replays can't recompute it
// against a later clock, so offline start/pause sequences survive sync.
export function startUpdate(t: TimerDoc): RunUpdate {
  const now = getServerNow();
  let startTime = now;
  if ((t.status === 'paused' || t.status === 'not_done') && t.timeLeftAtPause !== undefined) {
    if (t.timerDirection === 'up') {
      startTime = now - t.timeLeftAtPause;
    } else if (t.timerDuration) {
      startTime = now - (t.timerDuration - t.timeLeftAtPause);
    }
  }
  return { id: t._id, status: 'in_progress', timerStartTime: startTime };
}

export function pauseUpdate(t: TimerDoc): RunUpdate | null {
  if (t.status !== 'in_progress' || !t.timerStartTime) return null;
  const now = getServerNow();
  const elapsed = Math.max(0, now - t.timerStartTime);
  if (t.timerDirection === 'up') {
    return { id: t._id, status: 'paused', timeLeftAtPause: elapsed };
  }
  if (!t.timerDuration) return null;
  return { id: t._id, status: 'paused', timeLeftAtPause: Math.max(0, t.timerDuration - elapsed) };
}

// Parent pause cascades to running subtasks (mirrors the old server-side
// cascade, but with values frozen at action time).
export function buildPauseUpdates(parent: TimerDoc, subtasks: TimerDoc[]): RunUpdate[] {
  const updates: RunUpdate[] = [];
  const pu = pauseUpdate(parent);
  if (pu) updates.push(pu);
  subtasks.forEach((s) => {
    const su = pauseUpdate(s);
    if (su) updates.push(su);
  });
  return updates;
}

// Subtask start auto-starts the parent when it has a timer and isn't running.
export function buildSubtaskStartUpdates(sub: TimerDoc, parent?: TimerDoc | null): RunUpdate[] {
  const updates = [startUpdate(sub)];
  if (parent && parent.status !== 'in_progress' && hasTimer(parent)) {
    updates.push(startUpdate(parent));
  }
  return updates;
}

// Subtask pause pauses the parent when no sibling keeps running.
export function buildSubtaskPauseUpdates(
  sub: TimerDoc,
  siblings: TimerDoc[],
  parent?: TimerDoc | null
): RunUpdate[] {
  const updates: RunUpdate[] = [];
  const su = pauseUpdate(sub);
  if (su) updates.push(su);
  const anyStillRunning = siblings.some(
    (s) => s._id !== sub._id && s.status === 'in_progress' && s.timerStartTime
  );
  if (!anyStillRunning && parent) {
    const pu = pauseUpdate(parent);
    if (pu) updates.push(pu);
  }
  return updates;
}
