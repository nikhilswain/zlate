# Zlate — Architecture

> A complete, from-scratch description of how Zlate is built. Read top-to-bottom to understand the system; each section is also self-contained for reference. If you wanted to reimplement Zlate, this document plus the schema in `supabase/schema.sql` is enough to do it.

---

## 1. What Zlate is

Zlate is a **visual project tracker for indie developers**. You create projects with a name, a color, an optional emoji icon, and a **date range**; the projects are painted onto a **calendar** (month / week / year views) so you can see, at a glance, what you're working on over time. You can attach a short **day note** to any project on any day.

The defining product decisions:

- **Local-first.** All your data lives in the browser (IndexedDB). The app works fully offline, with no account required. There is no server round-trip to read or write your data.
- **No accounts, no passwords, no email.** Cross-device sync is opt-in and uses an **anonymous account + pairing code** model (like linking a second device to a messaging app), so there is nothing to remember and no PII to leak.
- **Sync is a convenience layer, not the source of truth.** The browser is authoritative. The server is a dumb, multi-tenant row store that exists only to shuttle data between your devices.
- **Quiet, fast UI.** Everything is reactive (the calendar re-renders the instant data changes), animated with restraint, and themeable (dark/light) with no flash-of-wrong-theme on load.

---

## 2. Tech stack and why

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, RSC) | File-based routing for the handful of sync API routes; modern React 19 support; deploys cleanly to the edge via OpenNext. |
| UI runtime | **React 19** | Latest hooks (`useSyncExternalStore`), strict-mode correctness. |
| Local persistence | **Dexie 4** (IndexedDB) + **dexie-react-hooks** | A typed, transactional wrapper over IndexedDB. `useLiveQuery` gives reactive reads — components re-render automatically on any data change. This is the backbone of the local-first model. |
| Ephemeral UI state | **Zustand 5** | Tiny in-memory store for "which panel is open" type state that should *not* persist. |
| Styling | **Tailwind CSS v4** (CSS-first, `@theme`) | No JS config file; design tokens are CSS custom properties, which makes runtime theming trivial. |
| Animation | **Framer Motion 12** | View transitions, panel slides, staggered calendar fills. |
| Icons | **lucide-react** | |
| Dates | **date-fns 4** | All calendar grid math (start/end of week/month/year, `addDays`, etc.). |
| Date picker | **react-day-picker 10** | The custom range picker in the project create/edit flows. |
| Backend (sync only) | **Cloudflare Workers** via **@opennextjs/cloudflare** + **Supabase (Postgres)** | The whole Next app (SSR + API routes) runs as one Worker at the edge; Supabase is the Postgres store, accessed only server-side with the service-role key. |

---

## 3. High-level topology

There are **three independent state systems in the browser** and a thin server tier:

```
┌─────────────────────────────── Browser ───────────────────────────────┐
│                                                                        │
│  Dexie / IndexedDB  ←─ AUTHORITATIVE local store (projects, notes,     │
│        ▲                 settings, sync metadata). Survives reload.    │
│        │ useLiveQuery (reactive reads)                                 │
│        │ thin write fns (createProject, upsertDayNote, …)              │
│        ▼                                                               │
│  React components ── read Dexie reactively, read/write Zustand         │
│        ▲                                                               │
│        │                                                               │
│  Zustand (useUIStore) ← EPHEMERAL UI state: which panel/popover is     │
│                          open, the navigated date, focus filter.       │
│                          Resets on reload.                             │
│                                                                        │
│  localStorage["zlate.theme"] ← single key, a boot-time cache of the    │
│                          theme so the first paint isn't wrong.         │
│                                                                        │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ fetch /api/sync/*  (only when syncing)
                                 ▼
┌──────────────── Cloudflare Worker (.open-next/worker.js) ──────────────┐
│  • Static assets (.open-next/assets) served at the CDN edge            │
│  • SSR + /api/sync/* route handlers run here (nodejs_compat)           │
│  • Rate-limit bindings: PAIRING_LIMIT (per IP), SYNC_LIMIT (per acct)  │
│  • Secrets: SUPABASE_URL, SUPABASE_SECRET_KEY                          │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ supabase-js (service role, bypasses RLS)
                                 ▼
┌──────────────────────────── Supabase (Postgres) ──────────────────────┐
│  accounts · pairing_codes · projects · day_notes · settings           │
│  Multi-tenant by account_id. RLS enabled, zero policies (anon denied;  │
│  service_role bypasses).                                               │
└────────────────────────────────────────────────────────────────────────┘
```

The key mental model: **the browser owns the data; the server is an optional mailbox.** If you never set up sync, the server tier is never contacted and the app is 100% local.

---

## 4. Data model

All types live in `types/project.ts`.

### Project
```ts
type Project = {
  id: string;            // crypto.randomUUID()
  name: string;
  icon?: string;         // emoji, optional
  baseColor: string;     // hex, used to paint the calendar
  description?: string;  // ≤ 280 chars
  startDate: Date;       // normalized to local midnight
  endDate: Date;         // normalized to local midnight
  createdAt: Date;
  updatedAt: Date;       // the LWW clock
  deletedAt: Date | null;// null = live; Date = tombstoned (soft delete)
};
```

### DayNote
```ts
type DayNote = {
  id: string;            // crypto.randomUUID()
  projectId: string;     // FK → Project.id
  dateKey: string;       // "YYYY-MM-DD" in LOCAL time
  text: string;          // ≤ 280 chars
  createdAt: Date;
  updatedAt: Date;       // LWW clock
  deletedAt: Date | null;// soft delete
};
```

### Settings (singleton)
```ts
type Theme = "dark" | "light";
type RenderMode = "pills" | "painted";
type CalendarView = "month" | "week" | "year";
type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun=0 … Sat=6

type Settings = {
  id: "singleton";       // there is exactly one row
  theme: Theme;
  renderMode: RenderMode;
  view: CalendarView;
  weekStartsOn: WeekStartsOn;
  sidebarCollapsed: boolean;
  updatedAt: Date;       // LWW clock (DEFAULT is new Date(0) so any real edit wins)
};
```

### SyncMeta (singleton)
```ts
type SyncMeta = {
  id: "meta";
  accountId: string | null;       // null = sync not set up; otherwise the bearer token
  lastSyncedAt: string | null;    // ISO; the pull/push cursor
  lastSyncFailedAt: string | null;// ISO of last failed attempt
  lastSyncError: string | null;   // user-facing message
  isOffline: boolean;             // last failure was due to being offline
};
```

Notes that matter:

- **Tombstones, not hard deletes.** Deleting anything sets `deletedAt` (and bumps `updatedAt`). The row stays in IndexedDB forever (until a wipe). This is what lets deletes propagate through sync as ordinary LWW writes. The trade-off is that tombstones accumulate (see §13).
- **`updatedAt` is the universal Lamport-ish clock.** Every entity carries it; every merge decision is "newer `updatedAt` wins." (Client-stamped — see the clock-skew note in §10.)
- **Dates are local-time, midnight-normalized.** `startDate`/`endDate` are pushed to `00:00:00` local (`normalizeDay`). Day notes are keyed by a **local** `"YYYY-MM-DD"` string (`toDateKey`), not UTC — so a note created "today" stays on the cell the user clicked regardless of timezone.
- **`SyncMeta` stores ISO strings, not `Date`s** (unlike every other entity), because they're cursors/timestamps that are only ever compared or sent over the wire.

---

## 5. Persistence layer (Dexie / IndexedDB)

### The database (`lib/db.ts`)

`class ZlateDB extends Dexie`, database name `"zlate"`, exported as the singleton `db`. Four tables, with additive schema versions:

| Version | Change | Stores (`.stores({...})`) |
|---|---|---|
| 1 | initial | `projects: "id, startDate, endDate, createdAt, deletedAt"`, `settings: "id"` |
| 2 | add day notes | `+ dayNotes: "id, projectId, dateKey, [projectId+dateKey], updatedAt, deletedAt"` |
| 3 | add sync | `+ syncMeta: "id"` |

There are **no `.upgrade()` callbacks** — every version only *adds* a store, so Dexie migrates automatically. The compound index `[projectId+dateKey]` is the hot path for "get the note for this project on this day."

### The write-function pattern

UI code never touches `db` directly for writes. It calls thin domain functions, each of which: validates/normalizes, stamps `updatedAt`, performs one Dexie op, and **schedules an auto-sync**. The full surface:

- `lib/projects.ts` — `createProject`, `updateProject`, `softDeleteProject` (cascades to its day notes), plus `MAX_DESCRIPTION_CHARS = 280` and the private `normalizeDay`.
- `lib/dayNotes.ts` — `toDateKey`, `getDayNote`, `upsertDayNote` (creates / updates / soft-deletes-on-empty), `softDeleteDayNote`, `softDeleteDayNotesForProject` (the cascade target), plus `MAX_DAY_NOTE_CHARS = 280`.
- `lib/settings.ts` — `SETTINGS_ID = "singleton"`, `DEFAULT_SETTINGS` (with `updatedAt: new Date(0)`), `updateSettings` (read-merge-stamp-put).

`upsertDayNote` encodes a small but important rule: writing **empty text** to an existing note **soft-deletes it**; writing identical text is a **no-op** (so it doesn't spuriously bump `updatedAt` and trigger a sync).

### Reactive reads (`hooks/`)

Every read goes through `useLiveQuery` (from `dexie-react-hooks`), which subscribes to Dexie's change feed and re-renders on any mutation to the queried tables. The hooks also apply the **"hide tombstones"** rule in application code (Dexie can't do partial-index filtering):

| Hook | Returns | Notes |
|---|---|---|
| `useProjects()` | `Project[]` | all live projects, sorted by `createdAt` asc |
| `useProjectsOnDay(day)` | `Project[]` | live projects active on `day`, then narrowed by the focus filter |
| `useSettings()` | `Settings` | `{ ...DEFAULT_SETTINGS, ...persisted }` — never undefined |
| `useDayNote(projectId, dateKey)` | `DayNote \| null \| undefined` | `undefined` = loading, `null` = none, else the note |
| `useProjectDayNotes(projectId)` | `DayNote[]` | live notes for a project, newest `dateKey` first |

### Export / import (`lib/exportImport.ts`)

A full local backup/restore that predates sync and shares its merge logic:

- `buildExport(appVersion)` → an `ExportFile` `{ schemaVersion: 2, exportedAt, app: "zlate", appVersion, projects, dayNotes, settings }`. Includes tombstones so deletes round-trip.
- `downloadExport(file)` → triggers a `zlate-backup-YYYY-MM-DD.json` download.
- `applyImport(rawJson)` → validates (`app === "zlate"`, exact `schemaVersion`), revives ISO date strings back to `Date` (throwing on malformed), then runs the **same LWW merge** as sync inside one Dexie transaction. It merges on top of local state — it does **not** wipe first.
- `wipeAllData()` → clears `projects`, `dayNotes`, deletes the settings singleton, clears `syncMeta`, all in one transaction.

### The shared merge (`lib/mergeRows.ts`)

`mergeRowsIntoDexie({ projects, dayNotes, settings })` is the single LWW merge used by **both** import and sync-pull. For each incoming row: if no local row exists → insert; else if `incoming.updatedAt > existing.updatedAt` (strictly) → full-row replace; else → skip. Ties go to local. Tombstones are merged identically (a newer tombstone replaces a live row, propagating the delete). The caller must wrap it in a `db.transaction("rw", …)`.

---

## 6. State management — the persistent/ephemeral boundary

This separation is deliberate and worth internalizing:

- **Dexie = persistent truth.** Projects, notes, settings, sync metadata. Read via `useLiveQuery`, written via the domain functions. Survives reload and is what gets synced.
- **Zustand (`store/useUIStore.ts`) = ephemeral UI state.** What's on screen *right now*: the navigated `currentDate`, which panel/popover/modal is open, the project focus filter, the in-flight sync flag. Resets on reload by design.
- **localStorage (`zlate.theme`) = a one-key boot cache.** Not a state system so much as a hint so the first paint uses the right theme (see §9).

`useUIStore` holds: `currentDate`, `selectedProjectId`, `selectedDayNote`, `popoverAnchor`, `dayOverflowPopover`, `focusedProjectIds` (a `Set`), `projectIdPendingDelete`, `mobileSidebarOpen`, `settingsOpen`, `wipeAllOpen`, `pairingCodeModalOpen`, `syncInFlight`, and their actions.

**Mutual exclusivity** is enforced in the store actions themselves: opening any primary surface (`setSelectedProjectId`, `openDayNote`, `openCreatePopover`, `openDayOverflowPopover`, `openSettings`) zeroes out the others in one `set({…})`. So you can never have, say, the create popover and the settings panel open at once.

---

## 7. UI / rendering layer

### Component tree

`app/page.tsx` renders `<AppShell />`. `AppShell` (`components/shell/AppShell.tsx`) is a flex row that mounts every top-level surface as a sibling (so they can use `fixed` positioning freely):

```
AppShell
├── ProjectSidebar        — project list, focus filter, theme/settings footer (+ sync dot)
├── CalendarShell         — nav header + animated view area
│   ├── MonthView         — 7-col grid padded to full weeks
│   ├── WeekView          — single 7-col row
│   └── YearHeatmap       — scrollable year heatmap
├── CreateProjectPopover  — anchored form to make a project
├── DayOverflowPopover    — "all projects on this day" list
├── ProjectDetailPanel    — right panel: day-note view OR project-settings view
├── ProjectDeleteModal    — type-the-name confirm
├── SettingsPanel         — preferences / sync / data / danger
├── WipeAllDataModal      — type-"wipe all data" confirm
├── PairingCodeModal      — enter a 6-char sync code
├── KeyboardShortcuts     — headless global keydown
└── SyncAutoTriggers      — headless auto-sync wiring
```

### The calendar (the heart of the app)

`CalendarShell` owns the nav header and swaps between three views based on `settings.view`. Grid construction uses date-fns and respects `weekStartsOn`:

- **MonthView** — `startOfWeek(startOfMonth)` … `endOfWeek(endOfMonth)` gives a clean N×7 grid (4–6 rows); rows share height via `gridTemplateRows: repeat(weekCount, minmax(0,1fr))`.
- **WeekView** — a single week, 7 cells stretched to full height.
- **YearHeatmap** — ~53 week-columns × 7 day-rows (transposed on mobile); cell size computed via `ResizeObserver`; clicking a cell drills into month view at that date.

**How projects get painted onto days.** Each `DayCell` calls `useProjectsOnDay(day)`, which returns the live projects whose `[startDate, endDate]` range covers that day (further narrowed if a focus filter is active). There is **no cross-day spanning DOM element** — instead *every* day in a project's range independently renders that project. Two render modes:

- **`pills`** (default, `MultiProjectFill`) — up to `MAX_PILLS = 3` small colored pills stacked at the bottom of the cell; a "+N more" button opens the overflow popover beyond that. Pills animate in with a per-day stagger.
- **`painted`** (`PaintedFill`) — up to `MAX_BANDS = 6` color bands flood the whole cell; the date number overlays with a `readableTextColor(...)` computed for contrast (`lib/contrast.ts`, WCAG luminance).

**Day notes are not badged on the grid.** You reach a note by clicking a pill/band, which calls `openDayNote(projectId, toDateKey(day))` and opens `ProjectDetailPanel` in day-note mode.

**Transitions.** `CalendarShell` keys the animated view container by a `periodKey`; `AnimatePresence mode="wait"` crossfades on view change and slides left/right on date navigation (direction from the sign of the date delta). Honors `prefers-reduced-motion`.

### Panels, popovers, modals

All are opened/closed through `useUIStore` actions and animated with Framer Motion (right-side panels on desktop become bottom sheets on mobile). Highlights:

- **CreateProjectPopover / DayOverflowPopover** — `fixed`-positioned, measured with `ResizeObserver`, flip/clamp to stay on-screen; bottom sheets on mobile.
- **ProjectDetailPanel** — dual-mode: `DayNoteView` (textarea that commits on blur/unmount, char-counter, delete) or `ProjectSettingsView` (edit name/desc/color/icon/range, list this project's notes, delete). Auto-closes if the project gets tombstoned (it's a `useLiveQuery` on that project).
- **Destructive modals** (`ProjectDeleteModal`, `WipeAllDataModal`) — require typing an exact phrase, with paste/drop blocked; sit at the top z-layer.

### Keyboard shortcuts (`components/shell/KeyboardShortcuts.tsx`)

Headless global listener (ignores typing into inputs and any modifier-key combos):

- `←` / `→` — navigate by month/week/year (per current view)
- `v` — cycle view; `m` — toggle render mode (no-op in year view)
- `Esc` — a **priority cascade** that dismisses the most-foreground surface first: wipe modal → pairing modal → delete modal → create popover → overflow popover → settings → day note → project panel → mobile sidebar → clear focus.

### Responsive

`hooks/useIsMobile.ts` uses `useSyncExternalStore` over a `(max-width: 767px)` media query, but seeds its first snapshot from the `data-vp` attribute the boot script set — so even the first render is correct, no layout flash.

---

## 8. Theming (no flash-of-wrong-theme)

Theming is a small, two-part dance between a synchronous boot script and a reactive applier:

1. **Boot script** (`app/layout.tsx`, injected via `next/script` `strategy="beforeInteractive"`, so it runs before any paint):
   ```js
   (function () { try {
     var d = document.documentElement;
     d.dataset.vp = matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop';
     var t = localStorage.getItem('zlate.theme');
     if (t === 'light' || t === 'dark') d.dataset.theme = t;
   } catch (e) {} })();
   ```
   It sets `<html data-theme="…">` (and `data-vp`) from the localStorage cache before React loads. `<html suppressHydrationWarning>` covers the intentional attribute mismatch.

2. **`ThemeApplier`** (headless client component) subscribes to `useSettings()` (Dexie). Whenever the persisted theme changes, it writes `document.documentElement.dataset.theme` and mirrors it to `localStorage["zlate.theme"]`. So Dexie is the source of truth; localStorage is just the boot cache.

**Tokens (Tailwind v4, CSS-first).** `app/globals.css` does `@import "tailwindcss";` (no JS config). A `@theme` block registers semantic tokens (`--color-bg`, `--color-surface`, `--color-surface-elevated`, `--color-overlay`, `--color-fg`, `--color-fg-muted`, `--color-fg-subtle`, `--color-fg-on-fill`, `--color-border`, `--color-border-subtle`, `--color-ring`, `--font-sans`, plus `--ease-out-expo`/`--ease-in-expo`). These point at primitive `--bg`, `--fg`, … variables that are swapped by `:root[data-theme="dark"]` (default) and `:root[data-theme="light"]` rule blocks. So `bg-bg`, `text-fg-muted`, `border-border` etc. resolve at build time while the actual color flips at runtime by attribute. There is **no `.dark` class and no `prefers-color-scheme`** — switching is purely `data-theme`.

---

## 9. Sync architecture

Sync is opt-in and layered on top of the local-first core without changing it. There were two phases: **Phase 1** (manual sync + identity) and **Phase 2** (auto-sync). The client engine is `lib/sync.ts`; the auto-trigger scheduler is `lib/syncTriggers.ts`.

### Identity: anonymous account + pairing codes

No usernames, passwords, or email. Instead:

1. **Set up sync** → `POST /api/sync/register` inserts an empty `accounts` row and returns its `accountId` (a UUID). The client stores it in `syncMeta.accountId`. **That UUID is the bearer token** for all subsequent sync calls (`Authorization: Bearer <uuid>`), verified by a live DB lookup each request.
2. **Pair another device** → `POST /api/sync/pair/create` mints a 6-char code (unambiguous alphabet, 5-minute TTL) tied to the account.
3. On the second device, **Enter pairing code** → `POST /api/sync/pair/redeem` *atomically* claims the code (`UPDATE … WHERE used_at IS NULL AND expires_at > now() RETURNING …`, so two racers can't both win) and returns the same `accountId`. The new device adopts it and resets its cursor (`lastSyncedAt = null`) so its next sync pulls the whole account.
4. The host can poll `GET /api/sync/pair/status?code=…` to auto-dismiss the code screen once it's consumed.

Security profile: the `accountId` is a long-lived bearer credential — same threat model as a session cookie. There is intentionally no password recovery in this design (see §13).

### The sync protocol: push-then-pull with a cursor

`syncNow()` (in `lib/sync.ts`) does, in order:

1. **Push.** Send every *local* row whose `updatedAt` is newer than the cursor (`lastSyncedAt`), wire-formatted. The server applies LWW per row.
2. **Pull.** `GET /api/sync/pull?since=<cursor>`; the server returns only rows whose `updated_at > since`. Merge them locally via `mergeRowsIntoDexie` inside a transaction.
3. Advance the cursor to the server's returned `serverTime` and clear any failure state.

**This is delta sync, not full sync.** The whole dataset transfers only when the cursor is `null` — i.e. the first sync after setup, or right after pairing a new device. Steady-state syncs move only what changed (often nothing).

**Clock-skew buffer.** Timestamps are client-stamped, but the cursor advances to *server* time. To avoid a slow client clock causing a row to fall in the gap and be skipped forever, both the push filter and the pull `?since` subtract a **5-minute buffer** (`CLOCK_SKEW_BUFFER_MS`). The extra rows this pulls in are cheaply discarded by LWW. Offline edits are unaffected because the cursor only advances on a *successful* sync — so an offline edit keeps its `updatedAt > lastSyncedAt` relationship no matter how long you're offline.

**Wire format (`lib/wireFormat.ts`).** Translates camelCase ↔ snake_case (`baseColor`↔`base_color`, `dateKey`↔`date_key`, `weekStartsOn`↔`week_starts_on`, …) and serializes `Date`→ISO string / revives ISO→`Date` (throwing on malformed). `undefined` optionals become `null` on the wire and back. `settings` has no `id` on the wire (the singleton key is re-applied client-side).

### Auto-sync (Phase 2): `lib/syncTriggers.ts`

A pure, framework-agnostic scheduler exposing `scheduleAutoSync(delayMs)`. It owns:

- a **debounce** timer (a later call resets it — coalesces bursts),
- a **5-second throttle** (`THROTTLE_MS`): a trigger landing within 5s of the last sync is **rescheduled** for when the window clears, *not dropped* (so a reconnect/visibility sync isn't lost),
- an **offline gate** (`navigator.onLine`),
- a **single-flight** guard (a module-level promise so two triggers never run overlapping syncs),
- and an **account check** (no-op if sync isn't set up).

It's driven from two places:

- **Every write** calls `scheduleAutoSync(WRITE_DEBOUNCE_MS)` (5s) after a successful Dexie write — so editing coalesces into one sync ~5s after you stop.
- **`hooks/useSyncAutoTriggers.ts`** (mounted once via the headless `SyncAutoTriggers` in `AppShell`) wires browser events: a **boot** sync 500ms after mount, **`visibilitychange`→visible** (returning to the tab), **`online`** (reconnect), and logs **`offline`**.

### Retry, failure state, and indicators

- `syncWithRetry()` wraps `syncNow` for auto-triggers: **transient** errors (network/`429`/`5xx`) wait 10s and retry **once**; **non-transient** (`4xx`) don't retry. If it's already offline it skips the wasted 10s wait. On terminal failure it persists `setSyncFailure(message, isOffline)`. The **manual "Sync now"** button uses raw `syncNow` (single attempt, instant feedback).
- Failure state lives on the `SyncMeta` row (`lastSyncFailedAt`/`lastSyncError`/`isOffline`); success calls `clearSyncFailure()`.
- **Indicators:** a 6px dot on the sidebar Settings gear — **red** for a real failure, **amber** when offline. In Settings → Sync: a subtle "Syncing…" label during background syncs (mirrored by the `syncInFlight` Zustand flag, flipped in `syncNow`'s `try/finally`) and an inline failure/offline banner with a **Retry now** button.

---

## 10. Backend

### Cloudflare Worker (OpenNext)

The whole Next.js app is compiled by `opennextjs-cloudflare build` into `.open-next/`:

- `.open-next/worker.js` — one Worker serving SSR + all `/api/sync/*` routes (under `nodejs_compat`).
- `.open-next/assets/` — static client bundles/CSS served directly from Cloudflare's asset edge (no Worker invocation), bound as `ASSETS`.
- `next.config.ts` calls `initOpenNextCloudflareForDev()` so `getCloudflareContext()` (and thus the rate-limit bindings) also work in `next dev`.

`wrangler.jsonc` highlights: `compatibility_flags: ["nodejs_compat"]`, `observability.enabled: true`, a `WORKER_SELF_REFERENCE` service binding, and two **rate-limit bindings**:

- `PAIRING_LIMIT` — 10 requests / 60s, keyed by **IP**, on all three `pair/*` endpoints.
- `SYNC_LIMIT` — 60 requests / 60s, keyed by **accountId**, on `push` and `pull`.

### API routes (`app/api/sync/*`)

All export `runtime = "nodejs"` and `dynamic = "force-dynamic"`, and use the service-role Supabase client. Data routes authenticate with `Authorization: Bearer <accountId-uuid>` (regex-validated, then a live `accounts` lookup).

| Route | Method | Purpose |
|---|---|---|
| `register` | POST | Create an anonymous account, return its `accountId`. |
| `pair/create` | POST | Mint a 6-char, 5-min pairing code for the bearer account. |
| `pair/redeem` | POST | Atomically claim a code; return the owning `accountId`. |
| `pair/status` | GET | `{ exists, used, expired }` for host polling. |
| `push` | POST | Apply incoming rows with server-side LWW; return applied counts. |
| `pull` | GET | Return rows changed since `?since`, plus `serverTime`. |

Server-side glue: `lib/supabase.ts` (cached service-role client reading `SUPABASE_URL` + `SUPABASE_SECRET_KEY`, no session/JWT), `lib/cloudflareEnv.ts` (gets bindings + `checkRateLimit`, with a dev fallback that allows all), `lib/apiError.ts` (logs the real error, returns a sanitized message — raw detail only appended in dev).

### Supabase schema (`supabase/schema.sql`)

Five tables, multi-tenant by `account_id`:

- `accounts(account_id uuid pk default gen_random_uuid(), created_at)` — opaque identity.
- `pairing_codes(code pk, account_id fk, expires_at, used_at)` + index on `expires_at`.
- `projects` / `day_notes` — composite PK `(account_id, id)`, all the entity columns, `deleted_at` for tombstones, and an index `(account_id, updated_at)` that powers the delta-pull query.
- `settings` — PK `account_id` (one row per account).

All foreign keys are `ON DELETE CASCADE` from `accounts`, so deleting an account purges everything. The file also **explicitly GRANTs** CRUD to `service_role` on all five tables (Supabase's newer API-key system doesn't always auto-grant), and **enables RLS with zero policies**: `service_role` bypasses RLS so the API works, while `anon`/`authenticated` are denied by default — defense-in-depth if a publishable key ever leaks.

---

## 11. Build, run, deploy

**Local dev**
```bash
npm install
# .env.local:
#   SUPABASE_URL=https://<ref>.supabase.co
#   SUPABASE_SECRET_KEY=<service-role secret>
npm run dev            # next dev -p 3002 (Turbopack)
```
Without `.env.local`, the app still runs fully (local-first); only the sync API routes fail.

**Supabase setup**: create a project, run `supabase/schema.sql` in the SQL editor (tables + grants + RLS), grab the project URL and the **secret** API key.

**Cloudflare deploy**
```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
npm run deploy         # opennextjs-cloudflare build && … deploy
```
`npm run preview` does the same build and runs it locally in the Workers runtime. Rate-limit bindings are declared in `wrangler.jsonc`.

`@/*` is aliased to the repo root (`tsconfig.json`). ESLint is standalone (`npm run lint`, flat config extending `eslint-config-next`); note that Next 16 no longer runs ESLint during `next build`, so the build gate is TypeScript only.

---

## 12. Reimplementing from scratch — suggested order

1. **Scaffold** Next.js 16 (App Router) + TypeScript + Tailwind v4 (`@import "tailwindcss"`, `@theme` tokens, `data-theme` light/dark). Add the boot script + `ThemeApplier`.
2. **Data model & Dexie** (`types/project.ts`, `lib/db.ts` with the four stores). Build the domain write functions and the `useLiveQuery` hooks. At this point you have a working, persistent, offline app shell.
3. **UI**: Zustand UI store (with mutual exclusivity), the `AppShell` tree, the calendar (`CalendarShell` + month/week/year + the two fill modes), sidebar, the create/edit/note panels, keyboard shortcuts.
4. **Export/import** (`exportImport.ts` + `mergeRows.ts`) — this also gives you the LWW merge you'll reuse for sync.
5. **Sync backend**: Supabase schema (tables + grants + RLS), the six API routes, the service-role client, rate-limit bindings; deploy on Cloudflare via OpenNext.
6. **Sync client**: `wireFormat.ts`, `sync.ts` (register/pair/redeem/status + push-then-pull with the cursor and skew buffer), `syncMeta.ts`.
7. **Auto-sync**: `syncTriggers.ts` (debounce/throttle/single-flight/offline), `useSyncAutoTriggers`, write-function trigger calls, `syncWithRetry`, and the failure/offline/in-flight indicators.

The ordering matters: steps 1–4 are a complete product on their own; 5–7 are the optional sync layer that never alters the local-first guarantees.

---

## 13. Known limitations & future work

- **Tombstones accumulate.** Soft-deleted rows live forever locally and ride along in pulls. A periodic **tombstone sweep** (server cron + client prune) is planned.
- **Client-stamped timestamps + 5-min skew buffer.** Clocks off by more than 5 minutes can miss writes. The real fix is **server-stamped `updated_at`** (a future refactor).
- **Settings is whole-row LWW.** Two devices editing *different* settings fields concurrently → the loser's entire row is clobbered. Accepted trade-off.
- **No account recovery.** Losing every device's `accountId` orphans the server data (still there, unreachable). **Email-based recovery** is a deferred, separate design.
- **`accountId` is a long-lived bearer token.** Anyone who obtains it has full read/write — same as a leaked session cookie.
- **Push reads the whole local table into memory** to compute the delta (a local IndexedDB cost, not network). Fine at current scale; an indexed `where(updatedAt).above(cursor)` query is the obvious optimization if local data grows large.

---

*Last updated for **0.6.0** (Sync Phase 2 — auto-sync). See `CHANGELOG.md` for the release history.*
