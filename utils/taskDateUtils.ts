/**
 * Task Date Utilities with 7:00 AM Extended Day Cutoff (Night-Owl Boundary)
 * 
 * Rules:
 * 1. If a task was created/scheduled on Day D and finished on Day D+1 before 7:00 AM,
 *    it belongs to Day D (the previous day).
 * 2. If tasks of Day D are not checked as done before 7:00 AM of Day D+1,
 *    they are considered "not done" for Day D.
 */

export const DAY_CUTOFF_HOUR = 7; // 07:00 AM

/**
 * Returns the standard start-of-day (00:00:00.000) timestamp for a given time.
 */
export const startOfDay = (ts: number): number => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Checks if a day's working window has closed.
 * Day D closes at 7:00 AM on Day D+1 (i.e. dayStart + 24h + 7h).
 */
export const isDayPastCutoff = (dayStart: number, now: number = Date.now()): boolean => {
  const dayCutoff = dayStart + 86400000 + DAY_CUTOFF_HOUR * 3600000;
  return now > dayCutoff;
};

/**
 * Determines the effective calendar day (startOfDay timestamp) that a task belongs to.
 * 
 * 1. Completed Tasks (`status === 'done'`):
 *    - If `completedAt` is in the early morning before 7:00 AM, it maps to the previous day
 *      (the day the task was scheduled or created).
 *    - If `completedAt` is >= 7:00 AM, it maps to that same calendar day.
 * 
 * 2. Active Tasks:
 *    - Uses `task.date` if set.
 *    - Otherwise uses `task._creationTime`.
 *    - Fallback: `defaultDay` (defaults to startOfDay(Date.now())).
 */
export const getEffectiveTaskDay = (
  task: {
    status?: string;
    isCompleted?: boolean;
    completedAt?: number;
    date?: number;
    dueDate?: number;
    _creationTime?: number;
  },
  defaultDay: number = startOfDay(Date.now())
): number => {
  // If task has an explicit scheduled date, that date is always its primary calendar day anchor
  if (task.date !== undefined) {
    return startOfDay(task.date);
  }

  // If task has a due date but no explicit date, use due date
  if (task.dueDate !== undefined) {
    return startOfDay(task.dueDate);
  }

  const isDone = task.status === 'done' || task.isCompleted;

  if (isDone && task.completedAt) {
    const compDate = new Date(task.completedAt);
    const compDayStart = startOfDay(task.completedAt);

    if (compDate.getHours() < DAY_CUTOFF_HOUR) {
      // Completed before 7:00 AM -> belongs to the previous day
      const creationDay = task._creationTime ? startOfDay(task._creationTime) : undefined;

      if (creationDay !== undefined && creationDay < compDayStart) {
        return creationDay;
      }
      return compDayStart - 86400000;
    }

    return compDayStart;
  }

  // Active / pending task without date
  if (task._creationTime) {
    return startOfDay(task._creationTime);
  }

  return defaultDay;
};
