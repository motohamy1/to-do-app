# ToDoIt 👋

A premium, localized, and feature-rich To-Do & Planner application built with **Expo**, **React Native**, and **Convex**. 

ToDoIt is designed to provide a seamless productivity experience with focus on premium aesthetics, real-time synchronization, and powerful task management.

---

## ✨ Key Features

- **🏆 Comprehensive Task Management**: Create tasks with detailed descriptions, priority levels, and due dates.
- **🔳 Nested Subtasks**: Break down complex goals into smaller, manageable subtasks with their own statuses and timers.
- **⏱️ Integrated Timers**: Track time spent on tasks and subtasks directly within the app to boost focus and productivity.
- **🗓️ Daily Planner**: A dedicated space to organize your day, manage reminders, and stay on top of your schedule.
- **📁 Project Organization**: Group tasks into projects for better categorical focus and tracking.
- **🔔 Premium Notifications**: Never miss a deadline with localized alerts and custom alarm tones.
- **🌓 Dark Mode & RTL Support**: Full support for automatic theme switching and Right-to-Left (RTL) languages like Arabic.
- **⚡ Real-time Sync**: Powered by Convex, your data stays in sync across all your devices instantly.

---

## 🛠️ Tech Stack

- **Frontend**: [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **Backend/Database**: [Convex](https://www.convex.dev/) (Real-time database & serverless backend)
- **State Management**: Convex Hooks & React State
- **Localization**: `i18next` & `react-i18next`
- **Styling**: Vanilla React Native Styles with custom theme hooks
- **Persistence**: `expo-secure-store`

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (LTS)
- [Expo Go](https://expo.dev/go) on your mobile device or an emulator (Android Studio / Xcode)

### 2. Installation
Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd to-do-app
npm install
```

### 3. Setup Backend (Convex)
The project uses Convex for its backend. Initialize your Convex project by running:

```bash
npx convex dev
```
Follow the prompts to link the project to your Convex account. This will start a local backend development environment.

### 4. Start the Application
In a separate terminal, start the Expo development server:

```bash
npx expo start -c
```

---

## 📱 Project Structure

- `app/`: Contains the Expo Router screen definitions and tabs.
- `components/`: Reusable UI components (TodoCard, TaskDetailModal, ActionModal, etc.).
- `convex/`: Backend schema and serverless functions (todos, projects, etc.).
- `hooks/`: Custom React hooks for theming, auth, and state.
- `assets/`: Images, icons, and custom sound files.
- `utils/`: Helper functions, localization setup, and notification logic.

---

## 🌐 Localization

ToDoIt is built to be accessible globally. Current supported languages:
- **English** (en)
- **Arabic** (ar) - with full RTL layout support.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

Developed with ❤️ by [dr-tohamy](https://github.com/dr-tohamy)
