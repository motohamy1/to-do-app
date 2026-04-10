import { useState, useEffect } from 'react';
import { requestPermissionsAsync, Notifications } from '../utils/notifications';

export function useNotifications() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    async function initNotifications() {
      if (!Notifications) {
        setHasPermission(false);
        return;
      }
      
      // First check existing status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      // If already granted, just set it and return
      if (existingStatus === 'granted') {
        setHasPermission(true);
        return;
      }
      
      // Otherwise, we wait for requestPermissionsAsync to handle the request 
      // and channel setups
      const granted = await requestPermissionsAsync();
      setHasPermission(granted);
    }

    initNotifications();
  }, []);

  return { hasPermission };
}
