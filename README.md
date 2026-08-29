# Game-Based Rehabilitation System

**Faculty Project:** Development of an Interactive Game-Based Rehabilitation System
**Guide:** Dr. P. Muthu, Biomedical Engineering, SRMIST
**Project Code:** UR2627BME010 | AY 2026–27

## About

This project extends **CogniCare**(https://github.com/Arjya06/CogniCare), a hospital-focused cognitive rehabilitation platform originally built by **Arjya**. CogniCare uses interactive color-based exercises to support recovery from neurological conditions (stroke, TBI, Parkinson's, dementia, and related conditions) through seven progressive therapy levels, patient management, therapist controls, and performance tracking.

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

| Addition | Files (planned) | Owner |
|---|---|---|
| "Reach & Pop" — webcam hand-tracking movement game | `js/games/reachAndPop.js` | Arnav |
| "Trace the Path" — fine motor control tracing game | `js/games/tracePath.js` | Arjya |
| Progress visualization dashboard | `js/dashboard.js`, `css/dashboard.css` | Arjya |
| Unified menu (Cognitive Games / Movement Games / Dashboard) | `index.html`, `app.js` | Arnav + Arjya |

See `docs/DEVELOPMENT_GUIDE.md` for the full phase-by-phase roadmap, git workflow, and build steps.


## Team

- **Arjya** — original CogniCare platform (patient management, 7 therapy levels, tracking, reports)
- **Arnav** — movement module (Reach & Pop), integration, testing & documentation

## Status

🚧 In active development — continuing and extending Arjya's CogniCare base per Dr. Muthu's project brief.