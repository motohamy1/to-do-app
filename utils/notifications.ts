import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';

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

const Notifications = getNotificationsAPI();

// Custom alarm sound name (without extension)
// Android: looks in android/app/src/main/res/raw/alarm_tone.wav
// iOS: looks for alarm_tone.wav in the app bundle
const ALARM_SOUND = Platform.OS === 'android' ? 'alarm_tone' : 'alarm_tone.wav';

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
        sound: ALARM_SOUND,
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
        sound: ALARM_SOUND,
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
        sound: ALARM_SOUND,
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

export async function scheduleTimerNotification(title: string, durationMs: number, isSubtask = false, language: string = 'en'): Promise<string> {
  if (!Notifications) return "";

  const t: any = translations[language as keyof typeof translations] || translations.en;
  
  try {
    const seconds = Math.floor(durationMs / 1000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: isSubtask ? t.notifSubtaskTitle : t.notifTaskTitle,
        body: (isSubtask ? t.notifSubtaskBody : t.notifTaskBody) + `"${title}"`,
        sound: ALARM_SOUND,
        priority: Notifications.AndroidNotificationPriority?.MAX,
        sticky: false,
        autoDismiss: false,
        vibrate: [0, 500, 200, 500, 200, 500],
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds > 0 ? seconds : 1,
        channelId: isSubtask ? 'subtasks' : 'tasks',
      } as any,
    });
    return id;
  } catch (error) {
    console.warn("Error scheduling timer notification:", error);
    return "";
  }
}

export async function cancelNotification(notificationId: string) {
  if (!Notifications || !notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
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
    const now = Date.now();
    // If the reminder time already passed, don't schedule
    if (dueDateMs <= now) return "";

    const secondsFromNow = Math.max(1, Math.floor((dueDateMs - now) / 1000));

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: t.reminderNotifTitle || '⏰ Reminder',
        body: (t.reminderNotifBody || 'Time for: ') + `"${title}"`,
        sound: ALARM_SOUND,
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

export async function scheduleDailyReminders() {
  if (!Notifications) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (
        n.content.title === "Good Morning! 🌅" ||
        n.content.title === "Evening Summary 🌙" ||
        n.content.title === "صباح الخير! 🌅" ||
        n.content.title === "ملخص المساء 🌙"
      ) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Good Morning! 🌅",
        body: "Check your tasks and plan your day.",
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 9,
        minute: 0,
        channelId: 'daily',
      } as any,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Evening Summary 🌙",
        body: "How did you do today? Check off your completed tasks!",
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
        channelId: 'daily',
      } as any,
    });
  } catch (error) {
    console.warn("Error scheduling daily reminders:", error);
  }
}
