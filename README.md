# Zlate

A visual project tracker for indie developers juggling multiple client projects in parallel.

Think of it as a calendar where the whole point is **at-a-glance presence**: assign a project to a date range, the cells fill with its color, and the calendar becomes a map of who's getting your time this week, month, or year.

Not a productivity tool. No checklists, no progress bars, no streaks. Just colored date ranges with subtle visual evolution as time passes.

## What it does

- **Three views** — Month grid, Week (tall cells), and a Year heatmap (GitHub-style on desktop, transposed to flow vertically on mobile).
- **Two render modes** — Pills (named bars stacked in a cell) or Painted (full-cell color bands).
- **Past vs. future at a glance** — past days fade to 60% opacity so you can tell what's done from what's ahead, without losing color identity.
- **Multiple projects per day** — overlap is the point. Cells show up to three projects; the rest live in a click-to-open day-overflow sheet.
- **Daily notes** — click a pill on any day to write a short log of what you did. One note per (project, day), 280 chars, with all notes for a project listed in its settings panel.
- **Focus mode** — toggle projects in the sidebar to filter the calendar down to just those.
- **Adaptive sidebar** — full project rows when expanded (230 px), a 56 px rail of colored circles when collapsed, or an off-canvas drawer on mobile.
- **Mobile-friendly** — single-breakpoint responsive design at `< 768 px`. Sidebar becomes a drawer, all overlays become bottom sheets, the year heatmap transposes 90° to flow down the page, and horizontal swipes navigate.
- **Scroll to navigate** — wheel or trackpad swipe on the calendar advances/retreats the period. One gesture = one period change (gesture-end debouncing handles trackpad inertia).
- **Calendar fits the viewport** — Month and Week views distribute rows evenly so 5- and 6-week months both fit without scrolling.
- **Keyboard shortcuts** — `←` / `→` to navigate, `V` to cycle views, `M` to toggle render mode, `Esc` to close anything open.
- **Local-first** — everything lives in IndexedDB (via Dexie), so it works offline and loads instantly. Records are soft-deleted with tombstones; the data model is sync-ready for a future Supabase backend.

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
