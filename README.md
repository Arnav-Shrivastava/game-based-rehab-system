# CogniCare: Cognitive & Movement Rehabilitation System

## Overview
CogniCare is an interactive, browser-based hospital rehabilitation platform designed for therapists and patients. It leverages scientifically designed color-based cognitive exercises and computer-vision powered movement games to aid in patient recovery. The system provides extensive session tracking, a comprehensive progress dashboard, and a seamless interface tailored for clinical environments.

## Features
- **Cognitive Games (7 Progressive Levels):** Ranging from simple single-color recognition to complex multi-color tracking and basket-sorting tasks.
- **Movement Games:** Physical rehabilitation tracking utilizing webcam gestures (powered by MediaPipe).
  - *Reach & Pop:* Reach out and pop dynamic targets with your hand.
  - *Trace the Path:* Trace a wavy path on-screen using hand gestures (or mouse fallback) to test motor control and tremor stability.
- **Progress Dashboard & Analytics:** Detailed visualizations of accuracy, reaction time, and path deviation over time. Therapists can filter histories by patient, game type, and date.
- **Patient Management (CRUD):** Secure, local-storage based patient profiles for adding, editing, and managing therapy sessions.
- **Customizable Settings:** Granular control over ball count, size, game difficulty, session duration, and sound feedback. Dark-mode toggle for optimal viewing environments.

## Tech Stack
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6 Modules)
- **Computer Vision:** MediaPipe Hands (Camera, Drawing Utils) for webcam-based hand tracking
- **Data Visualization:** Chart.js for responsive analytics graphs
- **Storage:** HTML5 `localStorage` (No backend database required for local use)

## Folder Structure
```text
.
├── css/
│   ├── reports.css         # Styling for analytics and charts
│   ├── responsive.css      # Mobile & tablet responsiveness
│   ├── style.css           # Global tokens, buttons, and layout
│   └── therapy.css         # Styles specific to the game arena
├── js/
│   ├── app.js              # Dashboard initialization and splash screen
│   ├── dragdrop.js         # Logic for Level 7 basket sorting
│   ├── levels.js           # Cognitive game definitions and instructions
│   ├── patient.js          # Patient CRUD logic
│   ├── reports.js          # Legacy reports page logic
│   ├── settings.js         # Settings & preferences manager
│   ├── storage.js          # LocalStorage abstraction layer
│   ├── therapy.js          # Cognitive session controller
│   ├── ui.js               # Global UI utilities (toasts, dark mode, sound)
│   ├── components/
│   │   └── progress-dashboard.js # New patient analytics dashboard component
│   └── games/
│       ├── movement.js     # Movement games controller (Reach & Pop, Trace)
│       ├── therapy-setup.js# Shared pre-game setup UI
│       └── webcam.js       # MediaPipe camera integration wrapper
├── index.html              # Main landing dashboard
├── movement.html           # Movement games interface
├── patient.html            # Patient management interface
├── reports.html            # Progress dashboard and analytics viewer
├── settings.html           # System configuration interface
└── therapy.html            # Cognitive games interface
```

## Setup & Run Instructions
Because the application uses ES6 modules (`type="module"`) and accesses the webcam, it must be served over HTTP/HTTPS rather than via the `file://` protocol.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Arnav-Shrivastava/game-based-rehab-system.git
   cd game-based-rehab-system
   ```

2. **Start a local HTTP Server:**
   You can use any standard static server. For example:
   - **Using Python 3:**
     ```bash
     python -m http.server 8000
     ```
   - **Using Node.js (http-server):**
     ```bash
     npx http-server -p 8000
     ```

3. **Open the Application:**
   Navigate to `http://localhost:8000` in a modern web browser.
   *Note: Ensure you allow webcam permissions when accessing the Movement Games (`movement.html`).*

## Architecture Diagram
```text
+-----------------------------------------------------------------+
|                         User Interface                          |
|  (index.html, therapy.html, movement.html, reports.html, etc.)  |
+-----------------------------------------------------------------+
          |                       |                       |
          v                       v                       v
+-------------------+   +-------------------+   +-------------------+
|  Patient Config   |   |   Game Engines    |   |    Analytics &    |
|   (patient.js,    |   |   (therapy.js,    |   |     Reporting     |
|   settings.js)    |   |    movement.js)   |   | (progress-dash..) |
+-------------------+   +-------------------+   +-------------------+
          |                       |                       |
          |           +-----------------------+           |
          |           |   Computer Vision     |           |
          |           |  (webcam.js + API)    |           |
          |           +-----------------------+           |
          v                       v                       v
+-----------------------------------------------------------------+
|                       Storage Layer                             |
|               (storage.js -> window.localStorage)               |
+-----------------------------------------------------------------+
```

## Credits
- **Original CogniCare Build:** Designed and built by **Arjya**.
- **Movement Games & Analytics Extension:** Developed to expand the platform's capabilities with physical rehabilitation tracking (MediaPipe) and advanced dashboard analytics.