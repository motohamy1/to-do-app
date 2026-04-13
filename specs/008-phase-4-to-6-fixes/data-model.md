# Phase 1: Data Model

## User Preferences for Notifications
No major database schema changes are strictly required if we use `AsyncStorage` for device-specific sound preferences. However, if we use the existing `auth.getUserSettings` Convex query, we need to add `notificationSound: v.optional(v.string())` to the schema. 

For the simplest and most robust offline-first implementation:
We will add `notificationSound` to Convex `userSettings` schema, but sync it to `AsyncStorage` (or just read from Convex cache) to allow synchronous access inside `utils/notifications.ts`.

Key-Value definition:
- `notificationSound`: string (e.g., `'default'`, `'alarm_tone.wav'`). Default is `'alarm_tone.wav'`.