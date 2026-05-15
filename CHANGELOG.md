# Changelog

## 0.1.0 — Initial build

### Foundation

- Scaffolded on Next.js 16.2.6 (App Router) + React 19 + TypeScript + Tailwind CSS v4.
- Pinned `turbopack.root` in `next.config.ts` to silence a workspace-root warning caused by a stray parent-directory lockfile.
- Installed runtime deps: `dexie`, `dexie-react-hooks`, `zustand`, `date-fns`, `framer-motion`, `lucide-react`.
- Dev server bound to port `3002` via `dev` and `start` npm scripts.

### Data model

- `Project` type with `id` (UUID), `name`, `icon?`, `baseColor`, `description?`, `startDate`, `endDate`, `createdAt`, `updatedAt`, `deletedAt`.
- `Settings` singleton row with `theme`, `renderMode`, `view`, `weekStartsOn`.
- Dexie v1 schema (`zlate` DB) with `projects` and `settings` tables.
- CRUD helpers in `lib/projects.ts`: `createProject`, `updateProject`, `softDeleteProject`. Dates normalized to start-of-day on write; updates bump `updatedAt`.
- **Soft-delete pattern** — deletes set `deletedAt` rather than removing the row. Tombstones preserved for future sync.
- All UI state persisted to Dexie (no `localStorage`). Ephemeral state (current date, focus set, popover anchors) lives in Zustand.

### Theme

- Dark and light themes with Google-Calendar-soft palette (`#1f1f1f` / `#ffffff` surfaces, not too contrasty).
- Tailwind v4 `@theme` tokens scoped to `[data-theme="dark|light"]` on `<html>`.
- Manual toggle persists to Dexie. `ThemeApplier` client component applies `data-theme` on mount.
- Inter font, two weights only (400/500).

### Calendar — Month view

- 7-column grid, week start configurable (default Monday).
- `DayCell` renders date number + content. Today's cell ringed with a 1.5px outset outline at 2px offset (doesn't crowd pill content).
- Uniform 120px row height via `auto-rows`.
- Days outside the current month dimmed to 40%.

### Calendar — Pills render mode

- Up to **3 pills** stacked at the bottom of each cell.
- Pill: 20px tall, colored bar with project icon (emoji) or color dot + project name truncated.
- Cap exceeded → `+N more` button opens the **Day Overflow Popover** listing every active project; clicking one opens the detail panel.

### Calendar — Painted render mode

- Cell divided into equal horizontal bands, one per project, ordered by `createdAt` ascending.
- Cap at 6 visible bands; overflow rendered as a narrow neutral `+N` strip that opens the same overflow popover.
- Date number absolutely positioned top-left with **auto-contrast text color** computed from the top band's `baseColor`.
- Toolbar toggle in the calendar header switches Pills ↔ Painted; persisted to Dexie.

### Calendar — Week view

- 7 columns × one row of tall (420px) cells.
- Shares the same `DayCell` rendering; reuses Pills or Painted depending on current setting.
- Prev/next nav advances by week instead of month.

### Calendar — Year heatmap

- 53-week × 7-day grid in a single CSS grid (month labels and squares share column tracks, so DEC aligns under DEC).
- **20px squares**, each split into up to 3 mini bands ordered by `createdAt` — at-a-glance "I worked on multiple things this day."
- Out-of-year leading/trailing weeks rendered at 18% opacity for context.
- Past days at 60% opacity (same as Pills/Painted).
- Stagger animation per week column on mount.
- Click any in-year cell → jumps to month view focused on that day.

### Year heatmap tooltip

- Custom animated tooltip (Framer Motion) replacing native `title` attributes.
- Lists **every active project** on the hovered day, with color dot + name. Date header at top.
- Flips above/below the cell based on viewport room (no clipping near top edge).
- Two-element architecture (positioning wrapper + animated inner) so Framer Motion's transform doesn't fight inline positioning.

### Past-day visual treatment

- **Final approach: opacity 0.6** on past pills, bands, and heatmap cells. Color identity preserved (still the same green / blue / orange), just less present.
- Previous experiments — `darkTone` color swap and `saturate(0.35) brightness(0.92)` filter — both rejected for making past pills read as different projects.
- `darkTone` / `lightTone` fields and `lib/colorTones.ts` removed entirely after switching to opacity.

### Pill text contrast

- WCAG-linear relative luminance (sRGB-correct), threshold `0.49`.
- Above threshold → black text (`rgba(0,0,0,0.88)`), below → white (`rgba(255,255,255,0.95)`).
- Tuned so vivid colors (red, orange, green, blue, pink) get white; pale ones (yellow, lime, amber, slate) get black.
- Shared via `lib/contrast.ts`; used in Pills, Painted bands, Day Overflow Popover, and the heatmap tooltip dot.

### Curated palette + emoji set

- 16-color project palette and 12 emoji set extracted to `lib/palette.ts` and shared by the create popover, detail panel, and other UI.
- Slate swapped from borderline `#94a3b8` to darker `#64748b` to land solidly in the white-text-contrast zone.

### Project creation flow

- Click any empty cell space (Pills) or the date number (Painted) → `CreateProjectPopover` anchored to the cell.
- Form fields: name input (autoFocus, Enter submits), 16-color palette, optional emoji icon, quick-range chips (`Today only` / `7d` / `14d` / `30d` / `Custom`).
- Custom range opens two `<input type="date">` fields with auto-swap if start > end.
- Hand-rolled positioning via `getBoundingClientRect()`: prefer right of cell, flip left if no room, clamp to viewport.
- Click outside / Esc dismisses; Save closes popover and triggers staggered fade-in across the new project's day range.

### Project detail panel

- Right-side sheet, 360px wide, slides in via Framer Motion `expo-out` easing.
- Editable name, **description**, color, icon, date range. Each field commits to Dexie on blur (name/description) or on select (color/icon).
- Click any pill or band on the calendar → opens detail panel for that project. Clicking another pill switches projects.
- Click outside the panel or `Esc` closes it.

### Description field

- Textarea, 4 rows fixed, `resize-none`, scrolls internally if content overflows.
- Hard char limit **280** (Twitter-classic) via `maxLength`.
- **Circular char counter** SVG in the textarea's bottom-right corner:
  - Ring fills clockwise as count grows.
  - Gray under 80%, **amber** when ≤ 20 chars remaining (with numeric counter), **red** at limit.
  - Smooth `stroke-dashoffset` transition.

### Deletion — typed-name confirmation modal

- Triggered from sidebar trash icon (per project, hover-revealed) or from the detail panel footer.
- Centered modal with backdrop blur, animated `scale + fade` entrance.
- "Type **{project name}** to confirm" — match required is **case-sensitive** and exact (`confirm === project.name`).
- Delete button disabled until match.
- **Paste and drop blocked** on the input (`onPaste`/`onDrop` preventDefault) — user must actually type the name.
- Enter submits when valid.
- On confirm: removes the project ID from the focus set if present, clears any open detail panel, soft-deletes the record.

### Focus mode (multi-toggle filter)

- Sidebar project rows are now toggle buttons (`aria-pressed`).
- Clicking adds/removes the project from a `Set<string>` of focused IDs in Zustand.
- When the set is non-empty: calendar (all views) shows **only** those projects. Other projects hidden entirely (not dimmed) per design discussion.
- Sidebar visually highlights focused projects (`bg-fg/[0.08]`) and dims non-focused rows to 50% (still clickable to add).
- "Clear" link appears in the sidebar header when any project is focused.

### Day overflow popover

- One popover handles both Pills `+N more` and Painted `+N` strip overflows.
- Header: weekday + date label, close button.
- Body: scrollable list of every active project on that day rendered as colored pill buttons.
- Clicking a project in the popover sets `selectedProjectId` (opens detail panel) and dismisses the popover.
- Past days dim the popover pills too.

### Stagger animation

- Pills and Painted bands fade + slide-in with a **20 ms per-day delay** computed from `(day - project.startDate)`.
- Animations replay on every mount — page reload, month change, view switch — so the calendar always "paints" in.
- Earlier `SESSION_START` gate (only animate newly-created projects) removed in favor of replay-on-mount.

### Keyboard shortcuts

- Global handler mounted in `AppShell`:
  - `←` / `→` — previous / next (month / week / year based on current view).
  - `V` — cycle view (Month → Week → Year → Month).
  - `M` — toggle render mode (Pills ↔ Painted; no-op in Year view).
  - `Esc` — closes overlays in priority order: delete modal → create popover → day overflow popover → detail panel → clear focus.
- Suppressed when focus is inside an `INPUT`, `TEXTAREA`, `SELECT`, or `contentEditable` element (except for `Esc`).

### Hover affordance

- Pills get an inset 1px white-ish ring on hover.
- Painted bands get a 2px inset ring.
- Both transition smoothly via `transition-shadow duration-200`. Coexists with the past-opacity treatment.

### Demo seed

- `lib/seed.ts` inserts three overlapping projects on first load when the DB is empty — Shopify rebrand, Creazilla site, Inkspur API.
- Anchored to the current month so the calendar is filled out of the box; created with staggered `createdAt` so stack order is meaningful immediately.

### Component layout

```
app/
  layout.tsx          # theme provider, font, seed-on-empty
  page.tsx            # mounts <AppShell />
  globals.css         # @theme tokens + light/dark variants
components/
  shell/              # AppShell, ThemeApplier, ThemeToggle, KeyboardShortcuts
  calendar/           # CalendarShell, MonthView, WeekView, YearHeatmap, DayCell, MultiProjectFill, PaintedFill
  projects/           # ProjectSidebar, CreateProjectPopover, DayOverflowPopover, ProjectDetailPanel, ProjectDeleteModal, CharCounter
lib/                  # db, projects, settings, palette, contrast, dateRange, seed
hooks/                # useProjects, useProjectsOnDay, useSettings
store/                # useUIStore (Zustand)
types/                # project.ts
```
