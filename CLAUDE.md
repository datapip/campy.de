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

- Campaigns are displayed as `<campid> / <name> - <MM.YYYY>` (e.g. `1203 / PHV Sommer - 08.2026`); sites and mediums as `<id> / <name>`.
- Tables: `tids`, `campaigns`, `sites`, `mediums`, plus a `settings` table (holds the tid start value).
- **`vkclkid` (optional, per-site):** some ad platforms offer their own click-ID macro (e.g. Google Ads ValueTrack `{campaignid}_{adgroupid}_{creative}`, Facebook `{{ad.id}}`). Each site can have one template string, configured in the "Klick-IDs" admin tab and stored on `sites.vkclkid_template`. If set, it's appended as the URL's last query param (`&vkclkid=<template>`); if not set for the selected site, nothing is appended. The template is resolved purely from the chosen `siteid` — there's no per-generation input for it.

## Critical invariants — never violate

1. **ID assignment is transactional.** Every tid/campid/siteid/meid is assigned as `max(existing) + 1` **inside a single DB transaction** (bulk uploads: all rows in one transaction). Never compute an ID in one query and insert it in another outside a transaction.
2. **IDs are immutable.** Admin edits may change names/dates only, never IDs.
3. **Query parameter order is fixed:** `tid`, `campid`, `siteid`, `meid`, then `vkclkid` last if the site has a template configured.
4. **URL building uses the `URL` API**, never string concatenation. Existing query params are appended to with `&`; fragments (`#...`) stay at the very end — after `vkclkid` too. Base URLs already containing any reserved param (`tid`, `campid`, `siteid`, `meid`, `vkclkid`) are rejected.
5. **Referenced master data is undeletable.** Campaigns/sites/mediums with existing tid references cannot be deleted — return an explanatory error.
6. **Bulk imports are all-or-nothing.** Validation preview first; if any row has an error, nothing is written.
7. **`vkclkid` placeholders stay unencoded.** Platform macros use literal `{...}`/`{{...}}` braces that must survive percent-encoding untouched (see `encodeVkclkidTemplate` in `lib/url-builder.ts`) — the rest of the template is percent-encoded normally.

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
- Authenticated routes (`/`, `/verlauf`, `/admin/*`) live under the `app/(app)/` route group, whose layout reads the role cookie and passes it to `NavBar` (hides "Verwaltung" for non-admins). `/login` sits outside that group and has no nav chrome.

## Structure

- `app/(app)/` — authenticated routes: `/` (generator), `/verlauf` (history), `/admin` (Kampagnen | Sites | Medien | Klick-IDs)
- `app/login/` — password prompt, outside the authenticated route group
- `lib/db/` — Drizzle schema, migrations, seed
- `lib/url-builder.ts` — pure URL construction + validation logic (keep framework-free and unit-testable)
- `lib/csv.ts` — CSV import/export helpers
- `lib/auth.ts` / `lib/auth-config.ts` — role/cookie helpers and the gate passwords
- `components/ui/` — shadcn/ui primitives (generated; edit sparingly, prefer composing over modifying)

## Testing changes

After changes to ID assignment, URL building, or CSV logic, verify manually: generate a single URL (tid increments correctly), run a bulk upload with one invalid row (nothing is imported), and export the history (opens correctly in Excel).
