# My Bike Tracker

A mobile-first installable PWA for tracking income within individual fuel purchase cycles.

## Features
- Start a new fuel cycle with each fuel purchase.
- Daily income entries are linked to the active cycle.
- Starting a new cycle closes the previous one after confirmation.
- Cycle history, monthly summary and comparison chart.
- Edit/delete income, edit fuel purchase details.
- IndexedDB persistence, JSON backup/restore and CSV income export.
- Service worker for offline use after first successful load.

## Run locally
A service worker and PWA install require localhost or HTTPS. From this folder run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy
Upload the project files to a GitHub repository and import that repository into Vercel (or another static host). No build command is needed; set the output directory to `.` if requested. Open the deployed HTTPS URL on Android Chrome and choose Install app / Add to Home Screen.

## Data
Data is stored locally in IndexedDB in the browser profile on this device. Use Settings > JSON Backup regularly. Restoring a backup replaces current app data.

## Calculation note
“Income after fuel cost” = income recorded in the relevant period/cycle minus fuel purchases recorded in that period/cycle. Since personal riding fuel consumption is not tracked, this is not actual net profit.
