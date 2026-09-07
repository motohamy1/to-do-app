import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, LayoutAnimation, Platform } from 'react-native';

export interface KeyboardState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
  dismiss: () => void;
}

export function useKeyboard(): KeyboardState {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleKeyboardShow = (e: KeyboardEvent) => {
      const height = e?.endCoordinates?.height ?? 0;
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {
        // Safe fallback if LayoutAnimation is unavailable
      }
      setKeyboardHeight(height);
      setIsKeyboardVisible(height > 0);
    };

    const handleKeyboardHide = () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch {
        // Safe fallback if LayoutAnimation is unavailable
      }
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    const extraSubscriptions: any[] = [];
    if (Platform.OS === 'ios') {
      extraSubscriptions.push(
        Keyboard.addListener('keyboardWillChangeFrame', handleKeyboardShow)
      );
    }

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      extraSubscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible, dismiss: Keyboard.dismiss };
}

export default useKeyboard;
