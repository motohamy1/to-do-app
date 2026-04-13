# Phase 0: Research & Unknowns

## 1. Offline Loading Logic
**Question**: How is offline data currently cached, and why is the initial load blocked?
**Finding/Plan**: It's likely using `AsyncStorage` or a custom cache alongside Convex. The fix will involve returning the cached data immediately in the hook (e.g. `useQuery`) and updating it asynchronously when Convex fetches complete, rather than waiting for the network on app start.

## 2. Timer Notifications
**Question**: Why does the notification say "undefined"?
**Finding/Plan**: The task's `text` property is likely not being passed correctly to the scheduling function (e.g., `Notifications.scheduleNotificationAsync`). The fix requires ensuring the task name is correctly passed when the timer is initiated or completed.

## 3. Task Default Status
**Question**: Where does the default status originate? Frontend or Backend?
**Finding/Plan**: The `status` might be an optional field in the Convex schema. When it's missing, the frontend might default to "not done". The fix is to update both the UI components (especially subtask creation) and the Convex mutations to explicitly default to "not started" when `status` is undefined.

**Conclusion**: All unknowns have clear paths to resolution. Proceed to Phase 1 (Data Model & Interfaces).