# PantherMUNC Command

Conference management tool for [PantherMUNC](https://panthermunc.org), modeled after MUNCommand-style dais software. Built for roll call, motion tracking, document management, dual scoring (judge + dais), and Excel export.

## Features

- **Roll Call** — Present / Present & Voting with quorum detection (Rules 1–2)
- **Motions** — All PantherMUNC motion types with disruptivity ordering (Rule 3)
- **Documents** — Working papers, draft resolutions, sponsors, signatories, author panels (Rules 12–15)
- **Delegate Management** — Add countries, track position paper status (EPP/LPP)
- **Scoring** — Separate judge and dais rubrics (GA & Crisis), composite scores, discrepancy/tie detection per Awards Policies AP.1
- **Stats & Export** — Speaking events, points, awards preview, Excel export per committee or full conference

## Design

- **Colors:** Purple and white (PantherMUNC branding)
- **Font:** Arial throughout

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

For **panthermunc.org**, you can host this as a subdomain (e.g. `command.panthermunc.org`) alongside your Google Sites page.

## Data Storage

Conference data is stored in a server database and synced per committee. Use **Export All Excel** or **Export All Conference Logs** on the Manage Conference page for backups and the Secretary of Analytics spreadsheet workflow (AP.1.7).

## Excel Export

Each committee export includes sheets for:
- Delegate Stats
- Motions
- Documents
- Roll Call
- Awards Preview

Full conference export includes all committees.

## Rules Reference

Built-in support aligns with PantherMUNC Rules of Procedure and Awards Policies provided in the parent directory.
