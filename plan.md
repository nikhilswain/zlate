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

## Calendar fits the viewport

The calendar grid never scrolls vertically. Month and Week views fill the available height — rows distribute evenly via `grid-template-rows: repeat(N, minmax(0, 1fr))`. A 6-week month gets shorter rows than a 5-week month; both fit the same viewport. Cells clip overflowing content rather than expanding.

Year heatmap is the one exception: it can be wider than the viewport on narrow screens and uses horizontal scroll as its primary panning affordance.

## Navigation

Three input paths, all mapped to the same `nav(direction)` helper:

- **Keyboard.** `←` / `→` step one period (month / week / year) at a time.
- **Toolbar.** Header buttons `‹` / `›` do the same. `Today` jumps to the current date.
- **Wheel / trackpad.** Scrolling inside the calendar viewport advances the period — **down = next, up = previous**. Horizontal swipes also count, so `→` swipe = next.

### Wheel-nav details

- Listener is attached to the calendar viewport only, so the sidebar's project list, the detail panel's notes section, the day-overflow popover, and any other scrollable region keep their normal behaviour.
- **Gesture-end debouncing.** Fire on the first event of a gesture, then ignore everything until the wheel goes quiet for 200 ms. Every incoming event resets that quiet timer, so a long trackpad swipe — including its 500–1000 ms inertia tail — counts as a single gesture no matter how long it lasts. Once the trackpad is genuinely silent for 200 ms, the next event starts a fresh gesture. A leading-edge time throttle wasn't enough: inertia events fire continuously every ~16 ms, so they squeeze through any short throttle and rack up multiple navs from one swipe.
- **Year view splits axis-wise.** Vertical-dominant wheel events navigate the year (`|deltaY| ≥ |deltaX|`); horizontal-dominant events fall through to the browser's native horizontal scroll so users can still pan the heatmap.
- Uses native `addEventListener('wheel', ..., { passive: false })` rather than React's synthetic `onWheel`, because we need `preventDefault()` to stop the page from scrolling — and React's synthetic wheel listeners are forced-passive.

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

## Mobile responsiveness

Below `768px` everything reflows. Above is the existing desktop layout. Single breakpoint, no in-between "tablet" tier — Tailwind's `md:` prefix is the boundary, gated in code by a small `useIsMobile()` hook (`matchMedia('(max-width: 767px)')`).

### Shell

- **Sidebar becomes an off-canvas drawer.** Hidden by default. A hamburger button in the header opens it. Drawer slides from the left at ~280 px wide over a full-screen backdrop. Tap backdrop or press Esc to close. No rail mode on mobile — the 56 px rail still consumes real estate that phones can't spare.
- **Header reflows to two rows.**
  - Row 1: `[☰] Title` on the left, `[‹ Today ›]` on the right
  - Row 2: `[Month | Week | Year]` segmented control + render mode toggle (still hidden in Year view)

### Calendar — pills compaction

In Pills mode on mobile, pill rendering drops the icon **and** the project name. Each pill is a thin coloured bar only — identity comes from colour alone. The `+N more` overflow button shortens to `+N`. Painted mode is unchanged: full-cell bands already work at any cell width.

### Calendar — view-specific behaviour

- **Month view**: cells fit naturally in 7 narrow columns at mobile width. Date number stays at 11 px; cell padding reduced. Pills use the bar-only treatment above. Painted mode is unchanged.
- **Week view**: keeps 7 horizontal columns (no agenda re-layout). Pills get the same bar-only treatment. Vertical scroll inside each cell already handles overflow on tall content.
- **Year heatmap**: **rotated 90° on mobile.** The desktop grid is `weeks × 7 days` running left-to-right (Jan → Dec horizontally). On mobile the grid is **transposed**: 7 day columns at the top (Mon → Sun running across), weeks stacked vertically, month labels in a sticky left strip. Phones are taller than wide — letting the year flow down the page is the natural fit. Scrolls vertically (53 weeks × ~40 px cell ≈ 2.1 K px). Implemented as a parallel render path inside `YearHeatmap`, not a CSS `rotate` — text and click areas stay normal-axis.
- **Heatmap tooltip on mobile**: skipped. Tap already navigates to that month, which is the primary affordance; a tap-and-hold gesture is too undiscoverable to bother with.

### Overlays

All become bottom sheets or full-screen modals on mobile:

- **Project detail panel**: slides up from the bottom instead of from the right. Full-width, ~75% viewport height max, swipe-down or backdrop-tap to dismiss. Day mode and Project mode reuse the same shell.
- **Create project popover**: bottom sheet on mobile, same pattern as the detail panel. Anchored positioning makes no sense at phone width, and bottom-sheet consistency across all mobile overlays beats a one-off centered modal.
- **Day overflow popover**: bottom sheet (same pattern as detail panel).
- **Delete modal**: gets `max-w-[90vw]` so the fixed 400 px width doesn't overflow narrow viewports.

### Interactions

- **Wheel-to-nav** (mouse/trackpad) is desktop-only. On mobile, a horizontal swipe on the calendar grid navigates. Reuse the gesture-end debouncing model but listen on `touchstart` / `touchmove` / `touchend`. Vertical swipes still scroll the page / the heatmap.
- **Hover-only affordances become always-visible.** Sidebar drawer rows show gear and trash icons by default (no `opacity-0 group-hover:opacity-100`). The rail's per-circle hover tooltip doesn't apply — sidebar is a drawer, not a rail.

### Touch targets

- Icon buttons: minimum 36 × 36 px tap area (via padding when the icon itself is smaller).
- Sidebar drawer rows: `py-3` → ~44 px tall.
- Pills get `min-height: 24px` on mobile — tight but workable. Painted bands are tap-friendly regardless.

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

## Roadmap

Status of major post-0.2.0 milestones. Final spec lives in `docs/superpowers/specs/`; user-visible changes land in `CHANGELOG.md`.

### ✅ Settings UI (shipped in 0.4.0)

Right-side panel reached from the sidebar footer. Preferences (theme + week starts on), Data (export / import / wipe), Danger zone. See `docs/superpowers/specs/2026-05-18-settings-panel-design.md`.

### ✅ Sync — Phase 1 (shipped in 0.5.0, polished in 0.5.1)

Cross-device sync over Supabase + Cloudflare Workers, with **anonymous account + pairing code** identity (no usernames, no passwords, no email). Manual "Sync now" button + auto-sync immediately after pairing/setup. Full spec: `docs/superpowers/specs/2026-05-18-sync-phase-1-design.md`.

Key design choices that landed:
- `accountId` (UUID) is the bearer token. Stored in a new local-only `syncMeta` Dexie table.
- 6-character pairing codes from a 32-char unambiguous alphabet, 5-min TTL, single-use, crypto-random, atomic-redeem.
- Service-role API routes only; service_role bypasses RLS, but RLS is enabled with no policies as defense in depth.
- LWW-on-`updatedAt` merge, shared with the existing import logic via `lib/mergeRows.ts`.
- 5-minute clock-skew buffer on both push filter and pull cursor so client/server time drift doesn't drop writes.

### 🚧 Sync — Phase 2 (designed, implementation pending)

Background auto-sync that doesn't nag. Triggers on app boot, on tab visibility, and debounced 5 s after local writes. One delayed retry on transient failure. Failure indicator dot on the sidebar Settings entry (red for real failures, gray-amber for offline). Subtle "Syncing…" text in the SyncSection during in-flight syncs. Online/offline detection via `navigator.onLine` + the `online` event. Offline edits work natively via the existing cursor-on-success design — no separate queue. See `docs/superpowers/specs/2026-05-19-sync-phase-2-design.md`.

### Other things still worth revisiting

- **Email recovery for sync accounts.** Phase 2 still has zero password recovery — if every paired device wipes its `accountId`, the server data is orphaned. A future spec adds an optional `email` column to `accounts` + a magic-link sign-in for restore. Schema is already prepared.
- **Server-stamped `updated_at`** instead of client-stamped. Eliminates clock-skew issues entirely (the 5-min buffer is a workaround). Worth doing if skew ever becomes a real problem.
- **Tombstone sweep cron** server-side to purge old `deletedAt` rows.
- **Search** — find a project / note across the whole DB. Reasonable to revisit once notes accumulate.
- **Device management UI** — list of paired devices, "Sign out other devices," last-seen timestamps. Requires a new `devices` table.

## Explicitly out of scope

Completion toggles, progress percentages, blockers, missed-day warnings, productivity analytics, streaks, particle effects, sound, drag-to-paint, multi-select, recurring projects, tags, search, undo/redo, sharing, exports. Do not add these even if they seem like obvious next steps. Ship the smaller thing first.