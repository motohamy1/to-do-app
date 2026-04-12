import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';
import { getNotificationSound, NotificationSound } from './soundPreferences';

export const getTimerNotificationId = (taskId: string) => `timer_${taskId}`;
export const getMorningNotificationId = () => `daily_morning_9am`;
export const getEveningNotificationId = () => `daily_evening_8pm`;

export interface TimerNotificationData {
  taskId: string;
  durationMinutes: number;
}

export const NOTIFICATION_CATEGORIES = {
  TIMER_ACTIVE: 'TIMER_ACTIVE',
} as const;

export const TIMER_ACTIONS = {
  PAUSE: 'pause_timer',
  RESUME: 'resume_timer',
  RESET: 'reset_timer',
} as const;

const isExpoGo = Constants.executionEnvironment === 'storeClient';

function getNotificationsAPI(): typeof NotificationsType | null {
  if (isExpoGo && Platform.OS === 'android') {
    return null;
  }
  try {
    return require('expo-notifications');
  } catch (e) {
    console.warn("Failed to load expo-notifications:", e);
    return null;
  }
}

export const Notifications = getNotificationsAPI();

// Get current preferred sound
const getAlarmSound = async () => {
  const soundPref = await getNotificationSound();
  return soundPref === 'default' ? true : (Platform.OS === 'android' ? 'alarm_tone' : 'alarm_tone.wav');
};

export async function updateNotificationSoundPreference(soundFile: NotificationSound) {
  if (!Notifications || Platform.OS !== 'android') return;

  const androidSound = soundFile === 'default' ? true : 'alarm_tone';
  const channelIds = ['tasks', 'subtasks', 'reminders'];
  for (const id of channelIds) {
    try {
      await Notifications.deleteNotificationChannelAsync(id);
    } catch (_) {}
  }

  await Notifications.setNotificationChannelAsync('tasks', {
    name: 'Task Timers',
    importance: Notifications.AndroidImportance.MAX,
    sound: androidSound,
    enableVibrate: true,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    lightColor: '#FF231F7C',
    enableLights: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  } as any);

  await Notifications.setNotificationChannelAsync('subtasks', {
    name: 'Subtask Timers',
    importance: Notifications.AndroidImportance.MAX,
    sound: androidSound,
    enableVibrate: true,
    vibrationPattern: [0, 400, 150, 400, 150, 400],
    lightColor: '#D4F82D',
    enableLights: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  } as any);

  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.MAX,
    sound: androidSound,
    enableVibrate: true,
    vibrationPattern: [0, 500, 200, 500, 200, 500],
    lightColor: '#FF5C77',
    enableLights: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  } as any);
}

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority?.MAX,
      } as any),
    });
  } catch (error) {
    console.warn("Error setting notification handler:", error);
  }
}

export async function requestPermissionsAsync() {
  if (!Notifications) {
    console.warn("Notifications bypassed for Expo Go Android.");
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      const activeSound = await getAlarmSound();
      // IMPORTANT: Delete existing channels first so they get recreated 
      // with the new alarm sound. Android caches channel settings permanently.
      const channelIds = ['tasks', 'subtasks', 'reminders', 'daily'];
      for (const id of channelIds) {
        try {
          await Notifications.deleteNotificationChannelAsync(id);
        } catch (_) {
          // Channel may not exist yet, that's fine
        }
      }

      // Task timer completion channel — ALARM-LEVEL urgency
      await Notifications.setNotificationChannelAsync('tasks', {
        name: 'Task Timers',
        importance: Notifications.AndroidImportance.MAX,
        sound: activeSound,
        enableVibrate: true,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#FF231F7C',
        enableLights: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      } as any);

      // Subtask timer completion channel — HIGH urgency
      await Notifications.setNotificationChannelAsync('subtasks', {
        name: 'Subtask Timers',
        importance: Notifications.AndroidImportance.MAX,
        sound: activeSound,
        enableVibrate: true,
        vibrationPattern: [0, 400, 150, 400, 150, 400],
        lightColor: '#D4F82D',
        enableLights: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      } as any);

      // Reminders channel — ALARM-LEVEL urgency
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.MAX,
        sound: activeSound,
        enableVibrate: true,
        vibrationPattern: [0, 500, 200, 500, 200, 500],
        lightColor: '#FF5C77',
        enableLights: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      } as any);

      // Daily summaries — normal importance with default sound
      await Notifications.setNotificationChannelAsync('daily', {
        name: 'Daily Summaries',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 250, 150, 250],
        lightColor: '#4A90D9',
        enableLights: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.warn("Error requesting notification permissions:", error);
    return false;
  }
}

import { translations } from './i18n';

export async function scheduleTimerCompletion(
  taskId: string,
  text: string, 
  durationMs: number, 
  isSubtask = false, 
  language: string = 'en'
): Promise<string> {
  if (!Notifications) return "";

  const t: any = translations[language as keyof typeof translations] || translations.en;
  
  try {
    const activeSound = await getAlarmSound();
    const seconds = Math.floor(durationMs / 1000);
    const identifier = getTimerNotificationId(taskId);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: isSubtask ? t.notifSubtaskTitle : t.notifTaskTitle,
        body: (isSubtask ? t.notifSubtaskBody : t.notifTaskBody) + `"${text}"`,
        sound: activeSound,
        priority: Notifications.AndroidNotificationPriority?.MAX,
        vibrate: [0, 500, 200, 500, 200, 500],
        categoryIdentifier: NOTIFICATION_CATEGORIES.TIMER_ACTIVE,
        data: { taskId, durationMinutes: Math.round(durationMs / 60000) } as TimerNotificationData,
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds > 0 ? seconds : 1,
        channelId: isSubtask ? 'subtasks' : 'tasks',
      } as any,
    });
    return identifier;
  } catch (error) {
    console.warn("Error scheduling timer notification:", error);
    return "";
  }
}

export async function updateTimerNotificationText(
  taskId: string,
  newText: string,
  isSubtask = false,
  language: string = 'en'
) {
  if (!Notifications) return;
  const identifier = getTimerNotificationId(taskId);
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduled.find(n => n.identifier === identifier);
    if (existing) {
      const t: any = translations[language as keyof typeof translations] || translations.en;
      await Notifications.cancelScheduledNotificationAsync(identifier);
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          ...existing.content,
          title: isSubtask ? t.notifSubtaskTitle : t.notifTaskTitle,
          body: (isSubtask ? t.notifSubtaskBody : t.notifTaskBody) + `"${newText}"`,
        } as any,
        trigger: existing.trigger as any,
      });
    }
  } catch (error) {
    console.warn("Error updating timer notification:", error);
  }
}

export async function cancelTaskNotification(taskId: string) {
  if (!Notifications || !taskId) return;

  try {
    const identifier = getTimerNotificationId(taskId);
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.log("Error cancelling notification:", error);
  }
}

/**
 * Schedule a notification for a specific reminder at its due date/time.
 */
export async function scheduleReminderNotification(
  title: string,
  dueDateMs: number,
  language: string = 'en'
): Promise<string> {
  if (!Notifications) return "";

  const t: any = translations[language as keyof typeof translations] || translations.en;

  try {
    const activeSound = await getAlarmSound();
    const now = Date.now();
    // If the reminder time already passed, don't schedule
    if (dueDateMs <= now) return "";

    const secondsFromNow = Math.max(1, Math.floor((dueDateMs - now) / 1000));

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: t.reminderNotifTitle || '⏰ Reminder',
        body: (t.reminderNotifBody || 'Time for: ') + `"${title}"`,
        sound: activeSound,
        priority: Notifications.AndroidNotificationPriority?.MAX,
        sticky: false,
        autoDismiss: false,
        vibrate: [0, 500, 200, 500, 200, 500],
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsFromNow,
        channelId: 'reminders',
      } as any,
    });
    return id;
  } catch (error) {
    console.warn("Error scheduling reminder notification:", error);
    return "";
  }
}

export async function scheduleMorningReminder(todos: any[], language: string = 'en') {
  if (!Notifications) return;

  try {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const tomorrowStart = todayStart + 86400000;

    const todayTasks = todos.filter(t => {
      if (t.status === 'done') return false;
      return !t.date || (t.date >= todayStart && t.date < tomorrowStart);
    });
    
    const count = todayTasks.length;

    if (count === 0) {
      await Notifications.cancelScheduledNotificationAsync(getMorningNotificationId());
      return;
    }

    const body = count === 1 ? `You have 1 task scheduled for today.` : `You have ${count} tasks scheduled for today.`;

    await Notifications.scheduleNotificationAsync({
      identifier: getMorningNotificationId(),
      content: {
        title: "Good Morning! 🌅",
        body,
        sound: 'default',
        categoryIdentifier: 'daily',
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
        channelId: 'daily',
      } as any,
    });
  } catch (error) {
    console.warn("Error scheduling morning reminder:", error);
  }
}

export async function scheduleEveningReminder(todos: any[], language: string = 'en') {
  if (!Notifications) return;

  try {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const missedTasks = todos.filter(t => {
      if (t.status === 'done') return false;
      if (t.status === 'not_done') return true;
      if (t.date !== undefined && t.date < todayStart) return true;
      return false;
    });
    
    const count = missedTasks.length;

    if (count === 0) {
      await Notifications.cancelScheduledNotificationAsync(getEveningNotificationId());
      return;
    }

    const body = count === 1 ? `You missed 1 task. Let's plan for tomorrow!` : `You missed ${count} tasks. Let's plan for tomorrow!`;

    await Notifications.scheduleNotificationAsync({
      identifier: getEveningNotificationId(),
      content: {
        title: "Evening Summary 🌙",
        body,
        sound: 'default',
        categoryIdentifier: 'daily',
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
        channelId: 'daily',
      } as any,
    });
  } catch (error) {
    console.warn("Error scheduling evening reminder:", error);
  }
}
