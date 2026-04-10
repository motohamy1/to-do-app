import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { scheduleMorningReminder, scheduleEveningReminder } from '../utils/notifications';

export function useDailyReminders(todos: any[] | undefined, language: string = 'en') {
  const appState = useRef(AppState.currentState);
  const todosRef = useRef(todos);

  useEffect(() => {
    todosRef.current = todos;
    if (todos && Array.isArray(todos)) {
      scheduleMorningReminder(todos, language);
      scheduleEveningReminder(todos, language);
    }
  }, [todos, language]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (todosRef.current && Array.isArray(todosRef.current)) {
          scheduleMorningReminder(todosRef.current, language);
          scheduleEveningReminder(todosRef.current, language);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [language]);
}
