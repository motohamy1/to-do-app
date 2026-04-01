# Quickstart: Add Reminder Screen

**Feature Branch**: `001-add-reminder-screen`  
**Date**: 2026-04-01  

## Verification Scenarios

### Scenario 1: Standard Creation
1. Open the "Add Reminder" button on the Dashboard.
2. Confirm the title field is **focused and keyboard is open**.
3. Type `"Gym Session"`.
4. Tap the Select Date icon and pick **Tomorrow**.
5. Tap the Select Time icon and pick **08:00 AM**.
6. Tap the **"Save"** button.
7. Observe the **Haptic Vibration**.
8. Observe redirection to Dashboard and presence of "Gym Session" in the list.

### Scenario 2: Validation Check (Empty Title)
1. Open the creation screen.
2. Leave the title empty.
3. Observe the **"Save"** button is visually disabled (low opacity) and non-responsive.

### Scenario 3: Duplicate Warning
1. Create a reminder `"Pay Bills"` for today at 5:00 PM.
2. Re-create the **exact same** reminder (exact text, exact minute).
3. Observe the **Native Alert** appearing with the message: `"هل تريد إنشاؤه على أي حال؟"`.
4. Tap **"Cancel"** and ensure no second reminder is created.
5. Tap **"Create Anyway"** and ensure both instances now exist in the backend.

### Scenario 4: RTL Alignment
1. Toggle the system language to **Arabic**.
2. Open the creator from the Planner tab.
3. Observe the **"Close"** icon is on the opposite side of the English layout.
4. Verify text alignment in the title input is **Right-Aligned**.
