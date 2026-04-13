# Phase 1: Interfaces & Contracts

## Notification Utility (`utils/notifications.ts`)
We will export a new function to update the channel when the sound preference changes:
`updateNotificationSoundPreference(soundFile: string)` which returns a Promise void.

## Settings UI (`app/(tabs)/settings.tsx`)
A new `SettingItem` of type `'picker'` or a modal selector that allows choosing between "Default" and "Alarm Tone".