import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_PREFERENCE_KEY = 'notificationSoundPreference';

export type NotificationSound = 'default' | 'alarm_tone.wav';

export const getNotificationSound = async (): Promise<NotificationSound> => {
  try {
    const sound = await AsyncStorage.getItem(SOUND_PREFERENCE_KEY);
    if (sound === 'default' || sound === 'alarm_tone.wav') {
      return sound as NotificationSound;
    }
  } catch (error) {
    console.error('Error getting notification sound preference:', error);
  }
  return 'default';
};

export const setNotificationSound = async (sound: NotificationSound): Promise<void> => {
  try {
    await AsyncStorage.setItem(SOUND_PREFERENCE_KEY, sound);
  } catch (error) {
    console.error('Error setting notification sound preference:', error);
  }
};
