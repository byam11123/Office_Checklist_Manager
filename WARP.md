# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Frontend-only SPA built with Vite (vanilla JS, HTML, CSS). No backend service in this repo.
- State is managed in src/main.js via a simple appState object and DOM-driven views toggled by showView().
- Persistence uses browser localStorage (key: "checklistSubmissions").
- Google Sheets sync is automatic on every submission and on supervisor verification via a deployed Google Apps Script Web App.

Common commands
- Install dependencies (npm lockfile present):
  - npm ci  (preferred for CI/reproducible installs)
  - npm install  (for local dev)
- Start dev server (Vite):
  - npm run dev
- Build for production (outputs to dist/):
  - npm run build
- Preview built app locally:
  - npm run preview
- Open without dev server (static file):
  - Open index.html directly in a browser (as described in README). Some features still use localStorage + fetch(no-cors) and work without a server.
- Linting: not configured in this repo.
- Tests: none configured in this repo.

Architecture and key files
- index.html
  - Declares all app “views” (login, dashboard, checklist, history, verification) in a single page and loads /src/main.js.
- src/main.js
  - OPENING_CHECKLIST and CLOSING_CHECKLIST are the task sources.
  - View management: showView(), backToDashboard(); dynamic rendering via renderChecklist().
  - Submission flow: handleSubmitChecklist() collects task states, writes to localStorage, then calls syncSingleSubmissionToSheets(payload).
  - Verification flow (supervisor): showVerifyView() and submitVerification() augment the latest submission and re-sync.
  - Google Sheets integration: GOOGLE_SHEETS_CONFIG is hardcoded and initialized at load; syncSingleSubmissionToSheets() POSTs a JSON payload (mode: no-cors) to the Apps Script URL.
- google-apps-script.js
  - Backend script for Google Apps Script Web App. Creates/maintains two sheets ("Summary", "Task Details"), appends rows, applies formatting, and uses a script lock for concurrency.
  - Expects the payload shape produced by src/main.js (date, submittedAt, user, role, checklistType, counts, loginTime, tasks[], supervisor fields, isVerification).
- vite.config.ts
  - Uses @tailwindcss/vite plugin; base set to '/', build outputs to dist/.
- vercel.json
  - SPA rewrite: all routes rewrite to "/" when deployed on Vercel.

Development notes for agents
- Google Sheets configuration is defined in src/main.js under GOOGLE_SHEETS_CONFIG and auto-written to localStorage on load. If credentials change, update them there and keep README/Docs in sync.
- If you alter the payload fields in syncSingleSubmissionToSheets(), reflect corresponding changes in google-apps-script.js (headers and row construction) to avoid breaking sync.
- The app intentionally uses localStorage for persistence and works without a server; Vite is used for local dev and production builds.

Key documentation to reference
- README.md: Feature overview, quick start (open index.html), default login (password: demo123), data flow, customization points, troubleshooting.
- GOOGLE_SHEETS_SETUP.md: Step-by-step setup for Apps Script and expected sheet structure.
- IMPLEMENTATION_SUMMARY.md and FINAL_UPDATE.md: Context on the auto-sync implementation and where credentials live in src/main.js.
