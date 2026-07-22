# CLAUDE.md

Internal **Campaign Target-URL Generator** ("Ziel-URL Generator"): a web app that builds campaign tracking URLs with auto-assigned sequential tracking IDs. Internal tool, gated by a shared password rather than real authentication (see "Access control" below).

## Commands

```bash
npm run dev        # start dev server (http://localhost:3000)
npm run build      # production build
npm run db:setup   # initialize/migrate SQLite DB and apply seed data
npm run lint       # ESLint
```

## Tech stack

- Next.js (App Router) + TypeScript (strict mode)
- SQLite at `./data/app.db`, accessed via Drizzle ORM with `better-sqlite3`
- Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) for styling and components (Radix primitives, generated into `components/ui/`)
- `papaparse` for all CSV parsing (never hand-rolled splitting)
- `qrcode` for client-side QR code PNG generation (no server round-trip)

## Domain model & terminology

A generated target URL looks like:

```
https://www.example.de/lp/page.html?tid=12948&campid=1203&siteid=104&meid=29
```

| Param    | Meaning                           | Format             | Managed by          |
| -------- | --------------------------------- | ------------------ | ------------------- |
| `tid`    | Tracking-ID, has optional note    | sequential 5-digit | app (auto-assigned) |
| `campid` | Campaign-ID                       | sequential 4-digit | admin UI            |
| `siteid` | Site-ID (where campaign runs)     | sequential 3-digit | admin UI            |
| `meid`   | Medium-ID (e.g. Text Ad, QR-Code) | sequential 2-digit | admin UI            |

- Campaigns are displayed as `<campid> / <Mandant> - <name> - <MM/YYYY>` (e.g. `1203 / VKB - PHV Sommer - 08/2026`; falls back to `<campid> / <name> - <MM/YYYY>` for legacy campaigns saved before Mandant existed, which have `mandantid = NULL`); sites and mediums as `<id> / <name>`. Tracking-IDs follow the same convention: `<tid>` alone, or `<tid> / <note>` when a note is set (e.g. `12952 / test`). Note the date is still **stored/validated** as `MM.JJJJ` (period) — only the composed display string (`formatCampaign`/`formatCampaignPeriod` in `lib/format.ts`) renders it with a slash; the SAINT export (`lib/saint.ts`) has its own independent `.`→`/` conversion for the external Adobe format and is intentionally untouched by this.
- **Mandant (required, per-campaign):** the client/business unit a campaign belongs to (e.g. "VKB", "UKV", "URV", "AOK NW", "AOK NO"), admin-managed like campaigns/sites/mediums via the "Mandanten" tab. Selected from a dropdown when creating/editing a campaign (`campaigns.mandantid`, FK to `mandanten.mandantid`); undeletable if any campaign still references it. Not part of the URL query params — it only affects how the campaign is displayed/labeled.
- Tables: `tids`, `campaigns`, `mandanten`, `sites`, `mediums`, `site_mediums` (medium↔site restriction, see below), plus a `settings` table (holds the tid start value).
- **`vkclkid` (optional, per-site):** some ad platforms offer their own click-ID macro (e.g. Google Ads ValueTrack `{campaignid}_{adgroupid}_{creative}`, Facebook `{{ad.id}}`). Each site can have one template string, configured inline in the "Sites" admin tab (`components/admin/SitesManager.tsx`, alongside the site name) and stored on `sites.vkclkid_template`. If set, it's appended as the URL's last query param (`&vkclkid=<template>`); if not set for the selected site, nothing is appended. The template is resolved purely from the chosen `siteid` — there's no per-generation input for it, and no separate "Klick-IDs" tab (it's a site attribute, not its own entity).
- **Medium↔Site restriction (optional, per-medium):** a medium can be restricted to a subset of sites via the `site_mediums` join table, configured as a checkbox list per medium in the "Medien" admin tab (`setMediumSites` action). A medium with no rows there is unrestricted and stays selectable for every site — this keeps mediums created before the feature existed working unchanged. `lib/site-mediums.ts` holds the pure `isMediumAllowedForSite`/`filterMediumsForSite` logic (framework-free, like `url-builder.ts`); the Generator's single-URL and bulk-upload forms use it to filter the Medium dropdown by the selected Site, and `app/actions/generator.ts`/`app/actions/bulk.ts` re-check it server-side so an invalid site/medium pairing can't be submitted by bypassing the UI.

## Critical invariants — never violate

1. **ID assignment is transactional.** Every tid/campid/siteid/meid is assigned as `max(existing) + 1` **inside a single DB transaction** (bulk uploads: all rows in one transaction). Never compute an ID in one query and insert it in another outside a transaction.
2. **IDs are immutable.** Admin edits may change names/dates/Mandant assignment only, never IDs.
3. **Query parameter order is fixed:** `tid`, `campid`, `siteid`, `meid`, then `vkclkid` last if the site has a template configured.
4. **URL building uses the `URL` API**, never string concatenation. Existing query params are appended to with `&`; fragments (`#...`) stay at the very end — after `vkclkid` too. Base URLs already containing any reserved param (`tid`, `campid`, `siteid`, `meid`, `vkclkid`) are rejected.
5. **Referenced master data is undeletable.** Campaigns/sites/mediums with existing tid references cannot be deleted — return an explanatory error.
6. **Bulk imports are all-or-nothing.** Validation preview first; if any row has an error, nothing is written.
7. **`vkclkid` placeholders stay unencoded.** Platform macros use literal `{...}`/`{{...}}` braces that must survive percent-encoding untouched (see `encodeVkclkidTemplate` in `lib/url-builder.ts`) — the rest of the template is percent-encoded normally.

## History (Verlauf)

- The generator and the history table live on the same page (`/`, `app/(app)/page.tsx`) — generator on top, history below — not separate routes/tabs.
- `components/VerlaufTable.tsx` paginates client-side at 50 rows per page, with search (tid, note, URL) and from/to date filters; changing a filter resets to page 1. CSV and SAINT exports always cover the full filtered result set, not just the current page.
- Each row has a "QR-Code" button (`components/QrCodeButton.tsx`) that generates a 500×500 black/white PNG for that row's `generatedUrl` client-side via `qrcode` and downloads it as `qr-tid-<tid>.png`. `lib/download.ts`'s `downloadDataUrl` triggers the browser download from the generated data URL (sibling to `downloadTextFile`, which is for text/CSV content).
- Admins get an extra "Löschen" column (`deleteTid` in `app/actions/admin.ts`, `<Button variant="destructive">` per row). Unlike campaigns/sites/mediums, a tid has nothing referencing it, so there's no undeletable-if-referenced guard — deletion is immediate. It's also a deliberate product decision that deletion does **not** retire the number: ID assignment stays `max(existing) + 1` (invariant 1) unchanged, so deleting the highest tid frees that exact number for the next generation to reuse.
- Because `/` (unlike `/admin/*`) is reachable by both roles, `deleteTid` can't lean on `middleware.ts`'s route-based admin gating the way every other `app/actions/admin.ts` mutation does — it reads the session cookie and checks `role === "admin"` itself before touching the DB, on top of the UI hiding the button for non-admins.

## Target-URL reachability check

- Clicking "URL generieren" first runs a server-side HTTP reachability check (`checkTargetUrl` in `app/actions/generator.ts`, using `lib/http-check.ts`'s `checkUrlStatus`) against a **preview** of the tracking URL — built with a placeholder `tid`, since the real one is only assigned transactionally at insert time (invariant 1) — before any tid is consumed. `checkUrlStatus` tries HEAD first, falls back to GET on a 405 or a HEAD-level network failure, and never throws: an 8s timeout (`AbortSignal.timeout`), non-2xx status, and DNS/network errors all resolve to `{ ok: false, status, error? }` rather than rejecting.
- If the check succeeds, the tid is generated immediately, same as before this feature. If it fails, `GeneratorForm` shows an inline confirmation ("Die Ziel-URL scheint nicht erreichbar zu sein … Trotzdem eine Tracking-ID dafür generieren?") with "Trotzdem generieren" / "Abbrechen" — cancelling consumes no tid. Either way the same check result (reused, not re-fetched) is shown next to the generated URL once it exists, so the user always sees the reachability status of what they just created.
- Single-URL Generator only — bulk uploads (`app/actions/bulk.ts`) don't run this check.

## Config folder (config/) vs. data/export/ backup

- SQLite (`./data/app.db`) is the single source of truth for all reads and writes — the config invariants above (transactional ID assignment, undeletable references) all depend on that. Two CSV locations exist around it, with **no overlap in who writes them**:
  - `config/*.csv` — **git-tracked, developer-authored seed defaults.** Never written by the running app. Read once by `lib/db/init.ts`'s seed step (`readConfigSeedRows`, via `parseCsv`) when bootstrapping an **empty** table: if `config/<table>.csv` exists and is non-empty, its rows (including their IDs) become the seed data instead of the small hardcoded defaults. This only ever runs once per table (guarded by `SELECT COUNT(*)`), so editing `config/` after first boot does nothing on its own — it only matters for a fresh `./data/app.db`. Seeding order matters for FK integrity: mandanten → sites → mediums (+ site_mediums) → campaigns. There is no `config/tids.csv` — a fresh DB always starts with zero generated tracking-IDs.
  - `data/export/*.csv` — **gitignored, app-written live backup**, colocated with `data/app.db` so it shares the same persisted volume/lifecycle. `lib/backup-sync.ts`'s `writeBackupSnapshot()` re-exports the full current `mandanten`/`sites`/`mediums`/`campaigns`/`tids` tables (plus each medium's site restriction, nested as a comma-joined `siteIds` cell, e.g. `103,104`) using the same semicolon-separated, UTF-8-BOM `unparseCsv` helper as every other export in the app — so it's easy to open in (German) Excel for inspection/disaster-recovery, but it is never read back by the app. Called from `revalidateAdmin()` in `app/actions/admin.ts` (every admin mutation, including `deleteTid`) and directly from `generateUrl`/`bulkGenerate` after a tid is inserted. It's best-effort — a write failure is logged, never surfaced as an action error, since the DB write already succeeded and is authoritative.
- CSV exports triggered from the admin tabs themselves remain separate, user-initiated downloads (`unparseCsv`/`downloadTextFile`) — unrelated to both `config/` and `data/export/`.

## Conventions

- **UI language is German** (labels, buttons, errors: "Kampagne", "Ziel-URL", "URL generieren", "Kopieren", "Verlauf", "Verwaltung"). Code, comments, commit messages: English.
- All mutations go through server actions (or route handlers) — never assign IDs or build final URLs client-side.
- CSV exports: semicolon separator, UTF-8 **with BOM** (German Excel compatibility). CSV imports: auto-detect `;` and `,`.
- Validation errors are shown inline in German with a concrete reason, never as generic failures.
- Show admin warning banners when an ID range nears exhaustion (meid > 89, siteid > 899, campid > 8999, tid > 89999).

## UI components (shadcn/ui)

- Build UI from shadcn/ui primitives in `components/ui/` (Button, Input, Label, Select, Table, Card, Tabs, Alert, etc.) instead of raw `<button>`/`<input>`/`<table>` elements.
- Add new primitives with **`npx shadcn add <component>`** (no `@latest`/version tag). The CLI is pinned in `devDependencies` to the `2.x` line, which targets Tailwind v3 (HSL CSS variables, no JS config needed beyond `tailwind.config.ts`). `shadcn@3+`/`@latest` generates Tailwind v4-only utility syntax (`size-*`, `not-*`/`in-*` variants, `oklch()` colors) that silently breaks on this project's Tailwind v3 setup — do not bump the `shadcn` devDependency across that major version boundary without also migrating the whole project to Tailwind v4.
- `components.json` configures the CLI; `lib/utils.ts` holds the `cn()` helper (clsx + tailwind-merge) used to merge Tailwind classes.
- Theme colors are CSS variables defined in `app/globals.css` (`--primary`, `--destructive`, etc.) and mapped in `tailwind.config.ts`; prefer semantic tokens (`bg-primary`, `text-destructive`) over hardcoded `slate-*`/`brand-*` colors in new code.
- Destructive actions (delete campaign/site/medium) use `<Button variant="destructive">`; secondary actions use `variant="outline"` or `variant="secondary"`.

## Access control

- Not real authentication — just enough to keep this internal tool from being stumbled upon, per explicit product decision. There is no user database, hashing, or session expiry beyond the cookie itself.
- Two shared passwords, defined in `lib/auth-config.ts` (`AUTH_PASSWORDS.user` / `AUTH_PASSWORDS.admin`) — change them there to rotate. Whichever password is entered on `/login` determines the role; there is no separate role selector.
- `middleware.ts` redirects any request without a valid `zug_session` cookie to `/login`, and redirects `user`-role requests away from `/admin/*`. `app/actions/auth.ts` holds the `login`/`logout` server actions that set/clear the cookie.
- Authenticated routes (`/`, `/admin/*`) live under the `app/(app)/` route group, whose layout reads the role cookie and passes it to `NavBar` (hides "Verwaltung" for non-admins). `/login` sits outside that group and has no nav chrome.

## Structure

- `app/(app)/` — authenticated routes: `/` (generator + history on one page), `/admin` (Kampagnen | Mandanten | Sites | Medien; the Sites tab also holds the vkclkid template per site)
- `app/login/` — password prompt, outside the authenticated route group
- `config/` — git-tracked seed defaults for a fresh install, see "Config folder vs. data/export/ backup" above
- `data/export/` — gitignored, app-written live CSV backup (mirrors current DB state), see "Config folder vs. data/export/ backup" above
- `lib/db/` — Drizzle schema, migrations, seed
- `lib/backup-sync.ts` — writes the `data/export/*.csv` backup after admin mutations and tid generation/deletion
- `lib/url-builder.ts` — pure URL construction + validation logic (keep framework-free and unit-testable)
- `lib/site-mediums.ts` — pure medium↔site restriction logic (framework-free, mirrors `url-builder.ts`)
- `lib/http-check.ts` — server-side HTTP reachability probe (`checkUrlStatus`), used by the Generator's preflight check, see "Target-URL reachability check" above
- `lib/csv.ts` — CSV import/export helpers
- `lib/download.ts` — client-only browser download helpers (`downloadTextFile` for CSV/text, `downloadDataUrl` for generated binary content like QR PNGs)
- `lib/auth.ts` / `lib/auth-config.ts` — role/cookie helpers and the gate passwords
- `components/VerlaufTable.tsx` — paginated history table (search, date filters, CSV/SAINT export, per-row QR code, admin-only per-row delete)
- `components/ui/` — shadcn/ui primitives (generated; edit sparingly, prefer composing over modifying)

## Testing changes

After changes to ID assignment, URL building, or CSV logic, verify manually: generate a single URL (tid increments correctly), run a bulk upload with one invalid row (nothing is imported), and export the history (opens correctly in Excel).

After changes touching mediums or sites, also verify: restrict a medium to one site in the Medien tab, confirm the Generator's Medium dropdown hides it for other sites, and confirm a bulk upload row pairing that medium with a different site is rejected server-side (all-or-nothing still holds).

After changes touching campaigns, Mandanten, or the backup export, also verify: create a Mandant, create a campaign selecting it, confirm the composed display (`<campid> / <Mandant> - <name> - MM/YYYY`) shows up correctly in the Generator dropdown and the Verlauf table, and confirm `data/export/campaigns.csv`/`data/export/mandanten.csv` (etc.) were rewritten to reflect the change while `config/campaigns.csv`/`config/mandanten.csv` stay untouched.

After changes touching the Generator form or URL building, also verify the reachability check: a reachable target URL generates a tid immediately with no prompt; an unreachable one shows the confirmation prompt and consumes no tid on "Abbrechen"; and "Trotzdem generieren" then assigns the next tid as normal.

After changes touching tid creation or deletion, also verify: generating a URL updates `data/export/tids.csv`; as an admin, deleting a tid from the Verlauf table removes it from both the table and `data/export/tids.csv`; and the "Löschen" column/button is absent entirely when logged in as `user`.
