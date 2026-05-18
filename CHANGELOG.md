# Changelog

## 0.4.0 — Settings panel

### Settings

- New right-side panel (bottom sheet on mobile), reached via a **Settings** entry in the sidebar footer. Both expanded and rail sidebar layouts get the entry — expanded shows a labeled pill, rail shows the gear icon stacked above the theme toggle. Esc / click-outside dismisses. Mutually exclusive with the project detail panel via Zustand state — opening one closes the other.
- **Preferences** — Theme (mirrors the sidebar toggle; both stay in sync via Dexie) and Week starts on (Sun / Mon). `weekStartsOn` had no UI before; now it does. The `ThemeToggle` moved from the expanded sidebar header to a new sidebar footer next to the Settings button, matching the rail layout's footer-as-utility-bar pattern.
- **Data: Export + Import** — Export bundles every project, every day note, and the settings singleton into a single JSON blob with a schema version, the app version, and a timestamp. Download filename is `zlate-backup-YYYY-MM-DD.json`. Import accepts the same shape, validates `schemaVersion`, and upserts by `id` with **last-write-wins on `updatedAt`** inside a single Dexie transaction — same semantics future sync will use, so the merge logic is reusable. Tombstones (`deletedAt`) round-trip so deletes propagate. Inline status toast on success (auto-fades after 3 s); inline red message on parse/validation error. Re-selecting the same file works (input value reset to `""` after pick).
- **Danger zone: Wipe all data** — destructive confirmation modal mirroring the Project Delete modal pattern exactly. Typed-phrase confirmation (`wipe all data`), paste and drop blocked on the input, Enter submits when valid. Clears `projects`, `dayNotes`, and the settings singleton row in a single transaction. Settings recreates from `DEFAULT_SETTINGS` on next read via the existing fallback in `useSettings`, so the UI reverts to defaults without any reload.
- Esc priority cascade extended: Wipe modal → Delete modal → Create popover → Day overflow popover → **Settings panel** → Day note → Project panel → mobile sidebar → clear focus. Destructive modals sit at the top of the cascade; settings between popovers and detail panels.

### Internal

- New `lib/exportImport.ts` — pure functions (`buildExport`, `applyImport`, `wipeAllData`, `downloadExport`), no React dependency. Reusable when sync ships. Invalid-date strings throw `ImportError` rather than silently corrupting the LWW merge.
- New `components/settings/SettingsPanel.tsx` and `components/settings/WipeAllDataModal.tsx`. Both follow the existing `ProjectDetailPanel` / `ProjectDeleteModal` idioms for animation, mobile-vs-desktop layout swap, and click-outside semantics.
- `store/useUIStore.ts` gains `settingsOpen` and `wipeAllOpen` flags with the matching open/close/cancel actions. The four existing panel/popover openers now clear `settingsOpen` for mutual exclusivity. `closeSettings()` cascades to close the wipe modal too.
- `ProjectDetailPanel`'s click-outside guard now also bails when the wipe modal or settings panel is open, so clicking inside either doesn't accidentally close the panel underneath.

## 0.3.0 — Mobile first-paint, calendar transitions, range picker

### Mobile first-paint (flicker fix)

- Inline boot script in `<head>` sets `data-vp` (`mobile` / `desktop`) and `data-theme` on `<html>` **before** any React code runs. Eliminates the desktop-flash-then-mobile-render visible on mobile cold loads — by the time the first paint happens, the document already knows what viewport it's in and what theme it should be.
- `useIsMobile()` rewritten to seed its first client snapshot from the `data-vp` attribute rather than calling `matchMedia` directly. Keeps SSR and CSR in sync; no one-frame post-hydration repaint.
- `ThemeApplier` now mirrors the active theme to `localStorage` so the boot script can read it on the next page load (the source of truth is still Dexie).
- **Sidebar and calendar header migrated from JS-branched layouts to CSS-driven responsive layouts.** Both desktop and mobile markup render to the DOM; visibility flips at the `md` breakpoint via `hidden md:flex` / `md:hidden contents`. Previously the `if (isMobile) return <Mobile/>` early-return ran after hydration, so the wrong layout flashed first.
- **Pills markup unified into one tree** with responsive Tailwind utilities (icons/labels conditionally rendered via `md:` classes) instead of two separate component branches. Stagger ceiling lowered to **0.5s** so heavily-loaded days don't have animations dragging on.

### Calendar transitions

- New `usePrefersReducedMotion()` hook — mirrors the `useIsMobile` pattern (subscribes to the media query via `useSyncExternalStore`). Honored throughout the animation system; when reduced motion is on, transitions degrade to a plain fade.
- **Period navigation (Prev / Next month, week, year) now slides + fades.** Direction is computed from the date delta sign — forward slides left, backward slides right.
- **View-mode switching (Month ↔ Week ↔ Year) stays as a pure crossfade.** The layouts are too structurally different for a slide to feel natural; the fade reads as "swap modes," not "scrub through time."
- Composite `periodKey` (`month:2026-04`, `week:<timestamp>`, `year:2026`) drives `AnimatePresence mode="wait"`. Same period, no animation; different period, animate. Avoids the previous behavior where every internal re-render triggered a fade.
- Year heatmap's per-week stagger is now capped at **0.6s total** (`Math.min(0.6, weekIdx * STAGGER_PER_WEEK)`) so a full year doesn't take 8 seconds to paint in.

### Range calendar picker

- Native `<input type="date">` fields in `CreateProjectPopover` (Custom range branch) and `ProjectSettingsView` (Range field) replaced with a custom-skinned **react-day-picker** v10 calendar that matches the dark-by-default aesthetic of the rest of the app.
- Preset chips (`Today only` / `7d` / `14d` / `30d` / `Custom`) preserved in the create popover; the calendar only renders when `Custom` is selected.
- **Live-bound to the project's chosen color.** `--zl-accent` (solid), `--zl-accent-soft` (20% alpha via `color-mix(in srgb, color 20%, transparent)`), and `--zl-accent-text` (WCAG-contrast pick via `readableTextColor`) are injected as CSS vars on the wrapper. Picking a new color updates the selection band and endpoint pills immediately while the calendar is open.
- Skin scoped via `.rdp-zlate .rdp-root` (specificity 0,2,0) so it beats the library's default `.rdp-root` declarations. Inline `style` on a parent wrapper does **not** win — the library's `.rdp-root { --rdp-accent-color: blue }` has higher specificity than a style attribute on an ancestor, so the extra class is required to override.
- Range middle paints the full cell with the soft accent. Endpoints render as solid pills with a **half-cell gradient bridge** (`linear-gradient(to right, transparent 50%, var(--zl-accent-soft) 50%)` on `range_start`, mirrored on `range_end`) so the band visually connects to the pill without an ugly seam.
- "Today" (when not selected) gets a small accent dot under the number via `::after`, instead of the library's default outline ring.
- Calendar fills its container width edge-to-edge. First fix attempt added `table-layout: fixed` on the grid but didn't move the needle — the real cause was `.rdp-months` being `display: flex` so `width: 100%` on `.rdp-month` is ignored along the main axis. Real fix: `flex: 1 1 100%; min-width: 0` on `.rdp-month`.
- Default color swatch on Create flipped from `PALETTE[5]` (green) to `PALETTE[0]` so a fresh project always starts on the first color in the palette.
- `ProjectSettingsView` commits the new range immediately when both endpoints are set — no save button, consistent with how color and icon already commit on select.

### Bug fixes

- `ProjectRangeCalendar` initial implementation had a stray `div` token before the closing `/>` (TS2322); cleaned up during the skin rebuild.

## 0.2.0 — Daily notes, sidebar collapse, mobile

### Daily notes

- New Dexie table `dayNotes` with `{ id, projectId, dateKey, text, createdAt, updatedAt, deletedAt }` and a compound `[projectId+dateKey]` index. Dexie version bumped to 2; existing DBs migrate cleanly via additive schema.
- Project detail panel now has two modes selected by entry point:
  - **Day mode** — opened by clicking any pill or band on the calendar. Date-first header (`Saturday · May 16`), small clickable project chip below, autoFocused 4-row textarea with the existing circular char counter (cap 280).
  - **Project mode** — opened by the gear icon in a sidebar row. Project-first header, existing name/description/color/icon/date fields, plus a new `Notes (N)` section listing every day-note for the project (newest first). Clicking a note jumps to Day mode for that date.
- One panel shell, two layouts. Visual differentiation is structural (date-first vs project-first), not chromatic.
- Save behavior: auto-save on blur **and** on unmount, so closing via Esc, click-outside, panel-mode switch, or jumping to a different day all commit any pending text. `upsertDayNote` is idempotent so the safety-net commit is harmless on the normal blur path.
- Per-note trash button in the Day mode footer (only visible when the note exists). No confirmation modal — day notes are quick to re-write, unlike a full project delete.
- Soft-deleting a project cascades to soft-delete all of its day notes.

### Sidebar collapse

- New `sidebarCollapsed: boolean` field on the Settings singleton, persisted via Dexie.
- **Rail mode** — 56 px wide. Vertical stack of 36 px colored circles (emoji-on-color if the project has an icon, solid color otherwise). Focused projects get a ring outline; non-focused dim to 50 % opacity. Theme toggle pinned at the bottom; expand chevron at the top; mini × button at the top when focus is active.
- Per-circle hover tooltip uses `position: fixed` + portal-style placement so it escapes the aside's `overflow: hidden`. Left-pointing arrow matches the heatmap tooltip visually.
- Width animates 230 ↔ 56 via CSS `transition: width 320ms`; inner content swaps via Framer `AnimatePresence` opacity fade.
- Expanded width slimmed from 260 → 230 px.

### Calendar layout

- Month and Week views now fit the viewport — no vertical scroll. Rows distribute equally via `grid-template-rows: repeat(N, minmax(0, 1fr))`. `minmax(0, 1fr)` (not plain `1fr`) is the key trick: it lets rows shrink below their content size, and the cells' existing `overflow-hidden` handles any clipping.
- Calendar shell's view container kept `overflow-auto` for the Year heatmap (which can still scroll horizontally on narrow desktops), and gained `min-h-0` so flex children can actually shrink.

### Navigation — wheel / trackpad

- Scroll on the calendar viewport advances the period (Month ± 1 month, Week ± 1 week, Year ± 1 year). Down = next, up = previous. Horizontal swipes also count.
- **Gesture-end debouncing** (200 ms silence threshold) instead of a leading-edge throttle. A long trackpad swipe with its 500–1000 ms inertia tail counts as one gesture; only fires nav once. Was throttle-based first, but the throttle let inertia tails sneak through.
- **Year view splits axis-wise**: vertical-dominant wheel events navigate the year; horizontal-dominant fall through to the browser's native horizontal scroll so the heatmap can still pan on narrow viewports.
- Uses native `addEventListener('wheel', ..., { passive: false })` rather than React's synthetic `onWheel` because we need `preventDefault()` to stop page scroll — React's synthetic wheel listeners are forced-passive.

### Year heatmap auto-fit

- Cell size is now computed via `ResizeObserver` to fill exactly the available container width. Adjusts when the sidebar collapses/expands or the window resizes.
- Clamp range: `[10, 22] px` on desktop (53 columns), `[24, 48] px` on mobile (7 columns transposed).
- Dropped the GitHub-style every-other day-label convention — all seven labels (`Mo, Tu, We, Th, Fr, Sa, Su`) now show, on both desktop and mobile, for consistency with the rest of the UI.

### Week start

- Default flipped from Monday (`weekStartsOn: 1`) to Sunday (`weekStartsOn: 0`). All three views read from the same Settings field, so the one-line change propagates without per-view code edits.

### Mobile responsiveness

Single breakpoint at `< 768 px` via a `useIsMobile()` hook using `useSyncExternalStore` (avoids the one-frame layout flash that plain `useState + useEffect` produces on post-hydration mounts).

- **Sidebar** becomes an off-canvas drawer (~280 px wide) sliding from the left with a backdrop. Hamburger button in the header opens it. Backdrop tap / Esc / any project-row action all auto-close. Esc priority order in keyboard shortcuts updated.
- **Header** reflows to two rows on mobile: row 1 is `[☰] Title` + `[‹ Today ›]`, row 2 is the segmented view switcher + render-mode toggle.
- **All five overlays as bottom sheets** — Project Detail panel (both Day and Project modes), Day Overflow popover, Create Project popover, Delete Project modal, and (by extension) Day Note view. Each slides up from the bottom with rounded top corners, a drag-handle indicator, and a backdrop blur. Same animation timing (~0.28 s with `[0.16, 1, 0.3, 1]` expo-out) across all five.
- **Pills mode pills** render as bare colored bars (`h-3`, no icon, no text) on mobile. Identity comes from color alone. `+N more` shortens to `+N`. Painted mode is unchanged — full-cell bands already worked at any width.
- **Year heatmap transposed 90°** on mobile. Desktop is `53 weeks × 7 days` running left-to-right; mobile is `7 days × 53 weeks` running top-to-bottom. Day labels (Mo–Su) across the top, month labels in the leftmost column on rows where a new month begins. Scrolls vertically; no hover tooltip (tap navigates to month).
- **Touch swipe-to-nav** replaces wheel-nav on mobile. Horizontal-dominant swipes ≥ 50 px navigate (left = next, right = previous, page-flip metaphor). Vertical-dominant swipes pass through to native scroll. Max gesture duration 600 ms to filter out long drags.
- **Drawer row actions** (gear, trash) are always visible on mobile with larger tap targets (15 px icons, ~37–40 px wide buttons). Hover-revealed on desktop unchanged.

### Bug fixes

- `ProjectDeleteModal` — split into outer (handles open/close state from Zustand) and a keyed inner (`key={project.id}`) so React re-mounts the inner with fresh `useState("")` each time. Eliminates the React 19 "Calling setState synchronously within an effect" warning that fired when `setConfirm("")` ran inside an effect keyed on `pendingId`.
- `CreateProjectPopover` and `DayOverflowPopover` — wrapped in `AnimatePresence` and split into outer/inner so the `exit` prop on the motion content actually plays. Previously the components just returned `null` when the anchor cleared, so close was instant.
- `CreateProjectPopover` color picker — `useState(PALETTE[5])` was inferring the literal `"#22c55e"` type (because `PROJECT_PALETTE` is declared `as const`), so `setColor(otherColor)` failed at compile time. Fixed by explicitly typing `useState<string>(...)`.
- `ProjectDetailPanel` `useLiveQuery` callback returned `... | null`, which doesn't satisfy `useLiveQuery`'s callback signature. Returned `undefined` instead.

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
