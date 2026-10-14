# PantherMUNC Conference Management System

Conference management system/chair software for [PantherMUNC](https://panthermunc.org), modeled after MUNCommand-style dais software. Built for roll call, motion tracking, document management, and Excel export.

## Features

- **Roll Call** — Present / Present & Voting with quorum detection
- **Motions** — All PantherMUNC motion types with disruptivity ordering
- **Documents** — Working papers, draft resolutions, sponsors, signatories, author panels
- **Delegate Management** — Add countries, track position paper status (EPP/LPP)
- **Stats** — Speaking events, points, Excel export per committee or full conference

## Design

- **Colors:** Purple and white (PantherMUNC branding)
- **Font:** Georgia throughout

## Getting Started

```bash
cd panthermunc-command
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy to any Node.js host (Vercel, Netlify, etc.) or serve statically after `npm run build`:

```bash
npm run build
npm start
```

## Data Storage

Conference data is stored in a server database and synced per committee. Use **Export All Excel** or **Export All Conference Logs** on the Manage Conference page for backups.

## Excel Export

Each committee export includes sheets for:
- Committee Info
- Delegate Stats
- Motions (current queue and archived queues)
- Motion Queues (speaker lists, voting speakers, presentation/Q&A delegates)
- Speaking Events
- Points
- Documents
- Roll Call
Full conference export includes all committees.
