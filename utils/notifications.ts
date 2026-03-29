import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

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
        shouldShowBanner: true,
        shouldShowList: true,
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
        type: 'timeInterval', // SchedulableTriggerInputTypes.TIME_INTERVAL
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
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Good Morning! 🌅",
        body: "Check your tasks and plan your day.",
      },
      trigger: {
        type: 'daily', // SchedulableTriggerInputTypes.DAILY
        hour: 9,
        minute: 0,
      },
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Evening Summary 🌙",
        body: "How did you do today? Check off your completed tasks!",
      },
      trigger: {
        type: 'daily',
        hour: 20,
        minute: 0,
      },
    });
  } catch (error) {
    console.warn("Error scheduling daily reminders:", error);
  }
}
