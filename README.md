# Game-Based Rehabilitation System

**Faculty Project:** Development of an Interactive Game-Based Rehabilitation System
**Guide:** Dr. P. Muthu, Biomedical Engineering, SRMIST
**Project Code:** UR2627BME010 | AY 2026–27

## About

This project extends **CogniCare**, a hospital-focused cognitive rehabilitation platform originally built by **Arjya**. CogniCare uses interactive color-based exercises to support recovery from neurological conditions (stroke, TBI, Parkinson's, dementia, and related conditions) through seven progressive therapy levels, patient management, therapist controls, and performance tracking.

This repository continues from that base. The plan is to revamp and extend it into a full game-based rehabilitation system — adding movement-based (webcam-tracked) exercises and a visual progress dashboard, per the project brief from Dr. Muthu.

## Current State (Inherited from Arjya's CogniCare)

The existing codebase is organized as follows:

```
game-based-rehab-system/
├── index.html
├── patient.html
├── reports.html
├── settings.html
├── therapy.html
├── README.md
├── css/
│   ├── style.css
│   ├── responsive.css
│   ├── therapy.css
│   └── reports.css
└── js/
    ├── app.js
    ├── patient.js
    ├── therapy.js
    ├── levels.js
    ├── dragdrop.js
    ├── reports.js
    ├── settings.js
    ├── storage.js
    └── ui.js
```

**Existing features (built by Arjya):**
- Seven progressive color-therapy levels (`levels.js`, `dragdrop.js`, `therapy.js`)
- Patient management — add/edit/delete, profiles, session history (`patient.js`)
- Therapist controls — difficulty, ball size/count, duration, sound, speed (`settings.js`)
- Performance tracking and reports (`reports.js`, `reports.html`, `reports.css`)
- Local data persistence (`storage.js`)
- Responsive, accessible, tablet-friendly UI (`responsive.css`, `ui.js`)

Built with HTML5, CSS3, and vanilla JavaScript (ES6) — no frameworks, no build step.

## What's Being Added

The codebase will go through a **refactoring pass first** (ES6 modules, splitting `therapy.js`, standardized session-saving) before new features are layered on — see `docs/DEVELOPMENT_GUIDE.md` Phase 0b for details. This keeps Arjya's existing logic intact while making it easy to plug in new games.

**Target structure after refactor + new modules:**

```
game-based-rehab-system/
├── index.html
├── patient.html
├── settings.html
├── reports.html
├── therapy.html              (existing cognitive game)
├── movement.html             (NEW — webcam + touch movement games)
├── css/
│   ├── core/                 (style.css, responsive.css)
│   ├── pages/                (reports.css, patient.css)
│   └── games/                (therapy.css, movement.css [NEW])
├── js/
│   ├── core/                 (storage.js, ui.js)
│   ├── config/                (levels.js)
│   ├── pages/                  (app.js, patient.js, settings.js, reports.js)
│   ├── components/              (progress-dashboard.js [NEW])
│   └── games/
│       ├── therapy.js              (existing — cognitive game engine)
│       ├── therapy-setup.js        (NEW — extracted setup UI)
│       ├── dragdrop.js             (existing)
│       ├── webcam.js               (NEW — camera + MediaPipe helper)
│       └── movement.js             (NEW — Reach & Pop + Trace the Path)
└── docs/
    └── DEVELOPMENT_GUIDE.md
```

| Addition | File(s) | Owner |
|---|---|---|
| Webcam helper | `js/games/webcam.js` | Arnav |
| "Reach & Pop" — hand-tracking movement game | `js/games/movement.js`, `movement.html` | Arnav |
| "Trace the Path" — fine motor tracing game | `js/games/movement.js` (2nd mode) | Arjya |
| Progress dashboard | `js/components/progress-dashboard.js` | Arjya |
| Unified menu | `index.html`, `js/pages/app.js` | Arnav + Arjya |

See `docs/DEVELOPMENT_GUIDE.md` for the full phase-by-phase roadmap, git workflow, and AI prompts used to build each piece.

## Running Locally

```bash
git clone https://github.com/Arnav-Shrivastava/game-based-rehab-system.git
cd game-based-rehab-system
python -m http.server 8000
# open http://localhost:8000
```

## Team

- **Arjya** — original CogniCare platform (patient management, 7 therapy levels, tracking, reports)
- **Arnav** — movement module (Reach & Pop), integration, testing & documentation

## Status

🚧 In active development — continuing and extending Arjya's CogniCare base per Dr. Muthu's project brief.