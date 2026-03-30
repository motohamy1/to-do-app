import { Platform } from 'react-native';
import Constants from 'expo-constants';

// In SDK 55, executionEnvironment is a string: 'storeClient' | 'standalone' | 'bare'
const isExpoGo = Constants.executionEnvironment === 'storeClient';

function getNotificationsAPI() {
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

if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.warn("Error setting notification handler:", error);
  }
}

export async function requestPermissionsAsync() {
  if (!Notifications) {
    console.warn("Notifications not supported in this environment (likely Expo Go Android).");
    return false;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        // Note: these might not be strongly typed if using require(), but they map to 5 and max
        importance: 5, // AndroidImportance.MAX is 5
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
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

export async function scheduleTimerNotification(title: string, durationMs: number): Promise<string> {
  if (!Notifications) return "";

  try {
    const seconds = Math.floor(durationMs / 1000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Timer Complete! ⏱️",
        body: `Your timer for "${title}" has ended.`,
        sound: true,
        priority: 'high', // AndroidNotificationPriority.HIGH corresponds to 'high' or 'max'
      },
      trigger: {
        seconds: seconds > 0 ? seconds : 1,
      },
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

export async function scheduleDailyReminders() {
  if (!Notifications) return;

  try {
    // Only cancel previously scheduled daily reminders (by identifier prefix),
    // NOT timer notifications — cancelAllScheduled was wiping those too.
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (
        n.content.title === "Good Morning! 🌅" ||
        n.content.title === "Evening Summary 🌙"
      ) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Good Morning! 🌅",
        body: "Check your tasks and plan your day.",
      },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: true,
      },
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Evening Summary 🌙",
        body: "How did you do today? Check off your completed tasks!",
      },
      trigger: {
        hour: 20,
        minute: 0,
        repeats: true,
      },
    });
  } catch (error) {
    console.warn("Error scheduling daily reminders:", error);
  }
}
