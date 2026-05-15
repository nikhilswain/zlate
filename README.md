# Zlate

A visual project tracker for indie developers juggling multiple client projects in parallel.

Think of it as a calendar where the whole point is **at-a-glance presence**: assign a project to a date range, the cells fill with its color, and the calendar becomes a map of who's getting your time this week, month, or year.

Not a productivity tool. No checklists, no progress bars, no streaks. Just colored date ranges with subtle visual evolution as time passes.

## What it does

- **Three views** — Month grid, Week (tall cells), and a Year heatmap GitHub-style.
- **Two render modes** — Pills (named bars stacked in a cell) or Painted (full-cell color bands).
- **Past vs. future at a glance** — past days fade to 60% opacity so you can tell what's done from what's ahead, without losing color identity.
- **Multiple projects per day** — overlap is the point. Cells show up to three projects directly; the rest live in a click-to-open day-overflow popover.
- **Focus mode** — click projects in the sidebar to toggle them into a focused set. Calendar shows only those projects until you clear focus.
- **Keyboard shortcuts** — `←` / `→` to navigate, `V` to cycle views, `M` to toggle render mode, `Esc` to close anything open.
- **Local-first** — everything lives in IndexedDB (via Dexie), so it works offline and loads instantly. Project records are soft-deleted with tombstones, designed for future sync.

## Tech

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Dexie + `dexie-react-hooks` for IndexedDB
- Zustand for ephemeral UI state
- Framer Motion for animations
- date-fns

## Running it

```bash
npm install
npm run dev
```

Opens on [http://localhost:3002](http://localhost:3002). On first load you'll see three seeded demo projects anchored to the current month so the calendar isn't empty.

## Why "Zlate"

Like *slate*, but for tracking. A clean board you fill with colored chunks of time.
