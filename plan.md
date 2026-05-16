# Zlate — Build Spec

A visual project tracker for indie developers juggling multiple client projects in parallel. The calendar is the entire product: you assign a project to a date range, the cells fill with that project's color, and the calendar becomes an at-a-glance map of who's getting your time this month.

**This is not a productivity tool.** No checklists, no progress percentages, no blockers, no analytics dashboards. Just colored date ranges on a calendar, with subtle visual evolution as time passes.

## Target user

A freelance/indie developer running 2–5 client projects at once. They want to glance at their calendar and instantly see: "this week is mostly Shopify, next week shifts to Creazilla, and there's a three-day overlap." That's the entire job.

## Core mental model

- A **project** has a name, optional icon, and a **color family** (one user-picked base color, with lighter and darker tones auto-derived via HSL math).
- A project is assigned to a **continuous date range** (start date → end date).
- A day cell displays the colors of every project active on that day.
- Past days render in the **darker tone** of each project's color family. Today and future days render in the **base tone**.
- That's the only temporal evolution. No fading, no desaturation, no warning states for missed days.

## Data model

```tsx
type Project = {
  id: string             // UUID, generated client-side via crypto.randomUUID()
  name: string
  icon?: string          // emoji or lucide icon name
  baseColor: string      // hex, user-picked
  lightTone: string      // auto-derived: HSL lightness +12
  darkTone: string       // auto-derived: HSL lightness -18, saturation -10
  startDate: Date
  endDate: Date
  createdAt: Date        // used as z-order / pill-stack order
  updatedAt: Date        // bumped on any edit; reserved for future sync conflict resolution
  deletedAt: Date | null // soft-delete; null = active. Reserved for future sync.
}

type RenderMode = 'pills' | 'painted'
type CalendarView = 'month' | 'week' | 'year'

type AppState = {
  projects: Project[]
  selectedProjectId: string | null   // for focus mode
  view: CalendarView
  renderMode: RenderMode             // default: 'pills'
  currentDate: Date
}
```

Persist `projects` to **IndexedDB via Dexie**. Persist UI state (`renderMode`, `view`) to localStorage — it's small, synchronous, and doesn't need migrations. Color tones are derived programmatically on project creation — the user picks one color, the app generates the family. Do not hardcode palettes.

### Dexie setup

```tsx
// lib/db.ts
import Dexie, { Table } from 'dexie'

export class ZlateDB extends Dexie {
  projects!: Table<Project, string>  // primary key is string (UUID)

  constructor() {
    super('zlate')
    this.version(1).stores({
      // 'id' is primary key; the rest are indexed for range queries.
      // deletedAt is indexed so we can cheaply filter out soft-deleted rows.
      projects: 'id, startDate, endDate, createdAt, deletedAt',
    })
  }
}

export const db = new ZlateDB()
```

- **IDs are UUIDs**, generated client-side with `crypto.randomUUID()`. Never auto-increment — it would collide with server-generated IDs once sync is added.
- **Soft-delete pattern.** "Deleting" a project sets `deletedAt = new Date()` rather than calling `db.projects.delete(id)`. All queries filter `where('deletedAt').equals(null)` (or use a `liveQuery` with an in-memory filter). When sync arrives, the server learns about deletes from the tombstone rows. Sweep tombstones older than ~30 days in a periodic cleanup, post-sync.
- **Always bump `updatedAt`** on any field change. Treat it as immutable from outside the store layer.
- **React integration:** use `dexie-react-hooks` and `useLiveQuery` so the UI reacts to DB changes automatically. The Zustand store holds only ephemeral UI state (`selectedProjectId`, hover states, popover anchors) — not the project list. Project data flows directly from Dexie → React via `useLiveQuery`.

## Primary interaction — create a project

1. User clicks any day on the calendar (clicks the date number in Painted mode, or empty cell space in Pills mode — see "Click rules" below).
2. A floating popover appears anchored to that cell containing: name input, color picker, optional icon picker, and a date range selector pre-filled with `{ start: clickedDay, end: clickedDay + 7 }`.
3. Quick-select chips above the date inputs: **Today only · 7 days · 14 days · 30 days · Custom**.
4. On save, the date range fills with the project's color, animated cell-by-cell from start to end with a ~20ms stagger.
5. Editing: click any existing project (pill or painted region) → detail panel slides in with name, color, icon, date range, and delete button.

No drag-to-paint. The click → set-range flow is the entire creation interaction.

## Calendar views (all three required)

- **Month** — default. Standard 7-column grid, generous spacing, cells large enough to render multi-project compositions cleanly.
- **Week** — taller cells, more breathing room. Useful when projects overlap heavily.
- **Year heatmap** — GitHub-contributions style. Each day is a small square (~12px). Pills are never rendered at this scale; each cell shows a single fill in the color of the project with the **longest overlap** on that day. If multiple projects tie, the one created first wins. This view is for shape-of-the-year reading, not for inspecting individual days — clicking a cell jumps to month view focused on that day.

Transitions between views use Framer Motion shared-layout animation (`layoutId`) so cells morph rather than fade-swap.

## Day cell rendering — two modes

The user toggles between **Pills** (default) and **Painted** modes via a toolbar control next to the view switcher. The choice persists across sessions.

### Pills mode

- **Empty day:** neutral cell background, just the date number.
- **N projects:** stack of horizontal pills, ordered by `createdAt` ascending (oldest on top).
    - Pill: ~20px tall, full width of the cell's padding box, 4px border-radius.
    - Background: project's `baseColor` for today/future, `darkTone` for past days.
    - Text color: project's darkest stop on light backgrounds (`Pink 900` on `Pink 200`), or `rgba(255,255,255,0.7)` when background is already dark.
    - Content: small color dot (or icon if set) + project name, truncated with ellipsis.
    - Font: 10.5px, weight 500.
- **Cap at 3 visible pills**, then a `+N more` row that opens a popover listing all projects on that day. Resizing pills to fit more is explicitly rejected — predictable beats adaptive.

### Painted mode

- **Empty day:** identical to Pills mode — neutral cell, date number only.
- **Any N projects:** cell is divided into **N equal-height horizontal bands**, each filled with one project's color. 1 project = full cell, 2 = 50/50 stacked, 3 = 33.3% each stacked top-to-bottom, and so on.
    - Band color: project's `baseColor` for today/future, `darkTone` for past days.
    - Ordered by `createdAt` ascending (oldest project = topmost band). This matches the pill stack order in Pills mode, so toggling between modes preserves visual hierarchy.
    - No gaps between bands, no internal borders — they butt up against each other and the cell's `border-radius` clips them cleanly.
- **Date number:** absolutely positioned top-left of the cell. Always sits over the first (topmost) project's band, so its color is deterministic: that project's darkest stop. No per-cell contrast math.
- **Cap at 6 visible bands.** If a day has 7+ projects, show 5 equal bands plus a narrow neutral-gray strip at the bottom edge labeled `+N` — tapping it opens a popover listing every project on that day.

### Today indicator (both modes)

A 1.5px ring in the foreground neutral color. No pulse, no glow, no animation. The ring is the entire signal.

- **Pills mode:** implemented as a `border` on the cell.
- **Painted mode:** implemented as a `box-shadow: 0 0 0 1.5px` outside the cell, so it doesn't eat into the band fills.

## Click rules

Two interactions, two rules per mode. Consistent meaning across modes.

| Mode | Open project | New project on day |
| --- | --- | --- |
| Pills | Click a pill | Click empty cell space |
| Painted | Click any colored region (fill or bar) | Click the date number |

Hover state on any clickable element: subtle brightness bump (~5%) and a 0.5px outline that fades in. No scale transforms — they make the calendar feel jittery in dense layouts.

## Focus mode

- Click a project in the sidebar → all other projects across the entire calendar dim to ~15% opacity. Selected project stays at full opacity.
- Click the same project again, click empty space, or press `Esc` to exit.
- Transition: 250ms opacity ease-out. Don't animate other properties.

## Daily notes

A short-form log of what happened on a specific day for a specific project. Project-level fields (name, color, icon, description, dates) describe the project as a whole; daily notes capture the day-by-day texture inside it.

### Data model

```tsx
type DayNote = {
  id: string             // UUID
  projectId: string
  dateKey: string        // YYYY-MM-DD, locale-independent
  text: string           // ≤ 280 chars
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null // soft-delete; reserved for future sync
}
```

- New Dexie table `dayNotes` with a compound `[projectId+dateKey]` index so we can look up "the note for project X on day Y" cheaply.
- One note per `(projectId, dateKey)` pair, enforced in code (upsert by compound key).
- Notes are editable for **any day** — past, today, or future. No date restrictions.

### Detail panel — two modes

A single right-side panel renders one of two layouts based on which entry point fired:

- **Day mode** — opened by clicking a pill or band in the calendar, or by clicking a note row in Project mode.
  - Header: large date title (`Saturday · May 16`) with the project shown below as a small colored chip. Clicking the chip switches to Project mode.
  - Body: a single autoFocused `textarea` with placeholder `What did you work on?` and a reused `CharCounter` (max 280). Commits to Dexie on blur (consistent with the rest of the panel).
- **Project mode** — opened by clicking the gear icon in a sidebar row.
  - Header: project name + color swatch (no date).
  - Body: existing fields (name, icon, color, dates, description, delete).
  - New `Notes (N)` section after the existing fields — list of every day-note for this project, latest first, each row showing the date and a one-line snippet. Clicking a row switches the panel to Day mode for that date.

Visual differentiation is **structural**, not chromatic: date-first header for Day mode, project-first header for Project mode. No background tinting.

### Sidebar — gear icon

The per-row affordance becomes `[focus toggle | gear | trash]`. The gear opens Project mode for that project; the trash and focus toggle keep their current behaviour. Both gear and trash are revealed on row hover.

### Calendar indicator

Deliberately skipped. There is no always-on dot or marker on the calendar grid indicating "this day has a note". Discoverability happens through the Notes list inside Project mode. If we want a global indicator later, it'll be a single toggle in settings rather than per-project configuration.

### Click rules update

Clicking a pill or band — which previously opened the detail panel in Project mode — now opens it in **Day mode** for that pill's project and that day. Project mode is reachable from the chip inside Day mode, or directly from the sidebar gear icon.

## Empty state

First open: empty calendar, no modals, no tutorials, no sample data. A small hint floats near the top of the calendar:

> *Click any day to start a project.*
> 

Hint fades out after the first project is created.

## Visual language

- Cinematic, calm, atmospheric. Soft gradients sparingly, ambient shadows, generous whitespace.
- **Reject:** neon, heavy glassmorphism, SaaS card stacks, dashboard density, decorative animation.
- Background: deep neutral. Near-black (`#0a0a0c`) for dark mode, near-white (`#fafaf8`) for light mode. Projects pop against it.
- Typography: one clean sans-serif (Inter). Two weights only — 400 regular, 500 medium. No 600+.
- Motion easing: prefer `[0.16, 1, 0.3, 1]` (expo-out) for entrances, `[0.7, 0, 0.84, 0]` (expo-in) for exits. Durations 200–300ms for UI, 400–500ms for view transitions.
- Every animation must have a reason. No decorative motion.

## Component architecture

```
app/
  page.tsx                       // main layout, sidebar + calendar shell
components/
  CalendarShell.tsx              // view switcher + render-mode toggle + nav
  MonthView.tsx
  WeekView.tsx
  YearHeatmap.tsx
  DayCell.tsx                    // owns click zones, hosts MultiProjectFill
  MultiProjectFill.tsx           // pure visual: takes Project[] + mode + isPast
  ProjectSidebar.tsx             // list, focus mode triggers
  CreateProjectPopover.tsx       // anchored to clicked cell
  ProjectDetailPanel.tsx         // panel shell; switches between Day mode and Project mode
  FocusModeOverlay.tsx
lib/
  db.ts                          // Dexie instance + schema (projects, dayNotes, settings)
  projects.ts                    // CRUD helpers: createProject, updateProject, softDeleteProject
  dayNotes.ts                    // upsertDayNote, softDeleteDayNote, MAX_DAY_NOTE_CHARS
  colorTones.ts                  // HSL math for light/dark derivation
  dateRange.ts                   // range overlap, isPast, dominant-project
hooks/
  useProjects.ts                 // wraps useLiveQuery, filters out soft-deleted
  useProjectsOnDay.ts            // returns Project[] active on a given date
  useDayNote.ts                  // single note for (projectId, dateKey)
  useProjectDayNotes.ts          // all notes for a project, latest first
store/
  useUIStore.ts                  // zustand: selectedProjectId, view, renderMode (mirrored to localStorage)
```

## Tech stack

- Next.js (App Router) + TypeScript
- TailwindCSS
- Framer Motion
- **Dexie + dexie-react-hooks** for IndexedDB persistence
- **Zustand** for ephemeral UI state only (selection, focus mode, popover anchors). Project data lives in Dexie, not Zustand.
- date-fns
- `uuid` package or native `crypto.randomUUID()` for ID generation

Frontend-only. No backend, no auth, no API calls. The data layer is built to be sync-ready: UUIDs, `updatedAt`, soft-deletes.

## Build priority (ranked, in order)

1. **Visual identity of a filled calendar in Pills mode** — three projects, a few overlap days, looks gorgeous before anything else works.
2. **Create/edit project flow** — the popover, the quick-range chips, project detail panel.
3. **Past-day darkening via color tones** — the one piece of temporal evolution.
4. **Painted mode** — the second render mode, with toolbar toggle.
5. **Week view + Year heatmap** — with shared-layout transitions between views.
6. **Focus mode.**
7. **Polish pass** — micro-interactions, hover states, keyboard shortcuts (`←`/`→` for nav, `V` to cycle view, `M` to toggle render mode, `Esc` to exit focus/popovers).

When a tradeoff arises, the higher-priority item wins.

## Explicitly out of scope

Completion toggles, progress percentages, blockers, missed-day warnings, productivity analytics, streaks, particle effects, sound, drag-to-paint, multi-select, recurring projects, tags, search, undo/redo, sharing, exports. Do not add these even if they seem like obvious next steps. Ship the smaller thing first.