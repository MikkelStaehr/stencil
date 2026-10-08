# Project: Design Wizard v0.1

A desktop wizard where the owner makes a project's design and UX decisions: profile → UX principles (curated laws that become checkable rules) → visual system (font pair, spacing, radius, brand colour → palette with contrast check, density) → live preview → export. Every choice is shown as 2–3 live variants side by side, and every decision can be changed later. It exports DESIGN.md (Part B), tokens.json and ux-rules.yaml, which an AI dev team (the ProjectStart agents) builds and tests against. Single user, one machine. "Done" for v0.1 is the acceptance criteria in `docs/PLAN.md`. Channels, bots and feeds are out of scope; they belong to the later W.A.A.N. control room.

## Stack
- Frontend: Next.js static export (`output: 'export'`, no server code) + Tailwind v4 + shadcn/ui themed from DESIGN.md, in `web/`
- Backend/DB: none. State is one versioned project file (autosaved to localStorage, downloaded with the exports)
- Hosting: none. Local only (see `docs/PLAN.md` for why)
- Package manager: pnpm
- Tests: Vitest (unit + export contract tests) / Playwright for e2e

## Commands
Planned; they exist once slice 1, step 1 has scaffolded `web/`. Run them from `web/`.
- dev: `pnpm dev`   build: `pnpm build`   lint: `pnpm lint`   typecheck: `pnpm typecheck`
- test: `pnpm test`   e2e: `pnpm e2e`   serve (the user's daily instance): `pnpm serve`
- **Run & screenshot:** use the `run-web` skill (`.claude/skills/run-web/`). Never invent a new screenshot method.

## Environment
- Ports: **3000 = the user's dev server, 3110 = design-wizard's own agent port** (each project has its own; run-web, serve-out and Playwright all use 3110). **3210 = the user's daily instance** (`pnpm serve`: static `out/` on 127.0.0.1). Agents never touch 3000, 3210 or another project's port, and never stop another project's server. The daily instance serves the same `out/`, so an agent's `pnpm build` shows up there on the next reload.
- Stop every server you started before the session ends.
- `PYTHONIOENCODING=utf-8` is set. Write commit messages via a file (`git commit -F`), not inline quoting.

## Conventions
- Strict types. No `any` / untyped dict without a comment.
- All project-file reads, writes and parsing go through one data layer: `web/src/data/project/`. The store is the only writer.
- Secrets only in env files or a vault. `.env.example` lists every variable.
- Small commits with conventional-commit messages. Every commit that belongs to a slice ends with a `Slice: <id>` line (the id from `docs/PLAN.md` § Slices).
- Prefer boring **code**. No new dependency without a one-line justification.
- **No silent defaults.** A value that can't be parsed never silently becomes 0 or empty. Missing is `null`, not 0. Collectors count and log unparseable values per run, and fail loudly above a threshold. Key derived values get sanity bounds; implausible values are flagged, not used.
- **Zero vs. missing per field.** Decide per field whether 0 is a valid value, and document it next to the field (schema comment or type). Missing is always `null`; 0 means a real zero only where the field allows it.
- **Contract tests across language boundaries.** Data that crosses a language boundary (e.g. Python writes JSON, the web parses it) gets a contract test: the consumer's fixture is the producer's real output, including edge cases.
- **External input is messy.** Numbers may arrive as text, with dot or comma decimals; junk rows exist. Parse defensively and test it.
- **Real-data fixtures.** Features that read external data are also tested against a current slice of real data (anonymised if the repo is public). Refresh it when the source changes (new block, season, file).
- Every data view can be rendered in its empty / stale / error states via a dev fixture flag (e.g. `DEV_FIXTURE=empty`), so those states can be screenshotted without breaking the database.
- Store external source rows raw once (e.g. a `raw jsonb` column) so new views don't need new migrations.
- **Local only, no third-party requests.** The app makes zero requests to hosts other than localhost, including fonts: variant fonts are committed OFL woff2 files (each with its licence) loaded with the FontFace API, and chrome fonts load via `next/font/local`.
- **Variants never inherit the chrome.** Sample components inside a plate read only `--v-*` custom properties, and a test enforces it.
- **Export formats are contracts.** The project file, tokens.json and ux-rules.yaml all carry `schemaVersion`. Exports are byte-stable (no timestamps) and covered by golden contract tests. Changing a format means bumping the version.
- **No default fills an open decision.** Export is blocked while any decision is `null`, and the open decisions are listed by name. Radius 0 is a valid value.
- **Owners before callers.** A module that `docs/ARCHITECTURE.md` §4 names as the owner of a calculation or decision is built before any code that needs its answer. No inline stand-ins. (Retro slice 1: the exporters grew a partial export gate because `domain/decisions.ts` didn't exist yet.)
- **One transition for the snapshot.** Every store action that changes `resolved` goes through the one `transition()` in `web/src/data/project/store.ts`, and each action has a test (`tests/unit/store-transitions.test.ts`) that a kept snapshot survives it, or is replaced only as documented. (Retro slice 3b: snapshot bugs in three slices running, each from an action that re-implemented the rule.)
- **Store invariants, not only per-action tests.** A new store action is added to the action list in `web/tests/unit/store-invariants.test.ts`. That test runs seeded random sequences of every action and, after each step, checks with the parser as the oracle that the autosave is valid and the snapshot consistent. (Retro slice 3c: per-action tests never covered sequences across an open decision.) The runs also vary the environment, not only the action order: storage that fails, a frozen clock and a clock that goes back. (Retro slice 3d: a failed save read "up to date", because every run had working storage and a clock that only moved forward.)
- Curated content (UX laws, font catalogue) is static typed content in the repo, changed by commit. Project files store only ids, and an unknown id is a loud error.
- Public repo: fixtures are fictional, and real project files are gitignored.

## First deploy (before any push that can deploy)
1. **Protection first:** turn on access protection (e.g. Vercel Authentication, All Deployments) before the host is connected or before the first push. Verify a logged-out request gets 401 or a login redirect.
2. Build settings: Root Directory and framework preset match the app folder, not the repo root.
3. Env vars: server-side names only (never `NEXT_PUBLIC_` for secrets), Production scope only, and a separate revocable key for the host.
4. Scheduled jobs: their secrets are in CI **before** the first milestone, and the job has run green once. The workflow's **first step is `check-config`**: it validates every variable of every step and lists all problems at once (names and reason, never values). `.env.example` gives the exact format for both the local env file and CI secrets (no quotes in secrets, decimal point not comma). Run the workflow by hand right after adding the secrets.
5. Auth provider: new sign-ups off if the app is single-user.
6. Public repo: nothing with real personal data is committed (samples, fixtures, screenshots go in `.gitignore` or are anonymised).

## Orientation
- `docs/ARCHITECTURE.md` is a one-page map of folders, data flow and commands. Agents read it **instead of scanning the repo**. Update it when structure changes.

## Design
- `DESIGN.md` is the contract, owned by `design-lead`. Part A (guardrails) is fixed; Part B (direction) is this product's identity.
- UI must express Part B. Correct but generic is not done. The UI library is always themed from DESIGN.md tokens.
- No DESIGN.md yet? Run `design-lead` Mode 0 first.

## How we work: size every task first
Before starting, the main session states the **size (S/M/L), the steps and the time budget** to the user. The user can change it.
If a budget is exceeded, **stop and ask**. Never keep running.
At every step boundary the main session compares elapsed agent time with the budget. At 100%, stop and ask before the next step.
**Migrations go live together with the code that writes them:** apply the migration → push the code → run the job. No scheduled or manual job runs in between.
Reading agents (`tester`, `reviewer`, `security`) run on a **committed** state, and no agent edits files while they run.
`∥` means the steps run in parallel.
`docs/PLAN.md` lists every slice and task in a `## Slices` table (`id | title | size`); ids are unique and lowercase (e.g. `3a`). Status is never written in the table; it is derived from git.

| Size | When | Steps | Budget (agent time) |
|---|---|---|---|
| **S** | Text, colour, layout in an existing component; no new data | Main session (or `ui`) + one 390px screenshot. `reviewer` only if the diff is > ~50 lines | 10 min |
| **M** | New component or view on data that already exists | Data check ∥ `design-lead` spec-lite → build → `reviewer` ∥ `security` (security only if data/access changed) | 30 min |
| **L** | New data + new screen, or a new module | `tech-lead` one-pager → data check + **one** migration → `design-lead` spec ∥ data layer → `ui` build → `design-lead` review (Must only) → `ui` polish → **commit** → `tester` ∥ `reviewer` ∥ `security` on that commit | 60 min |
| **Project start** | New repo | `tech-lead` + `architect` → `design-lead` Mode 0 → write `docs/ARCHITECTURE.md` | 45 min |

**Data check** (M and L): list every value the screen shows and mark it *exists / missing*. All missing data goes into **one** migration before any UI is built.

**Research first, ask after.** Before asking the user a technical question, research it and bring numbers.

## Status to the user
- Before each step: what, which agent, and an estimated time.
- Agents over ~10 min: give a short status when they return. Run long agents in the background where possible.

## Definition of done
- **S:** it works, the screenshot looks right, lint and typecheck pass.
- **M:** plus tests for new logic, and `reviewer` has approved.
- **L:** plus `tester` PASS on every acceptance criterion, no open **Must** from `design-lead`, and `security` approved if relevant.
- **Milestone:** plus the production pipeline (scheduled jobs, deploy) has run green end-to-end at least once.

## Retro: how the team learns
After every L task, and whenever something went wrong, the main session writes a retro of max 5 lines:
1. What went wrong (or cost the most time)
2. Root cause
3. The rule that prevents it, and **which file it belongs in** (agent file, this template, a skill)

The user approves. Then:
- **Project-specific rules** go into this repo's CLAUDE.md.
- **Rules for every project** are only *proposed* here: exact wording, target file, and a `LESSONS.md` row. **This session never edits ProjectStart** (`C:\dev\waan\teams`: the team's agents, templates and skills). The user applies the proposal there in a separate session, pushes, and runs `install.sh`.

A lesson that only lives in a chat is lost.

## Development team (user-level subagents in ~/.claude/agents/)
`tech-lead` · `architect` · `design-lead` · `ui` · `tester` · `reviewer` · `security` · `debugger`.
Agents are called only as listed in the size table, plus `debugger` when the cause of a failure is unclear.
**Install new agents before starting the session.** Agents added mid-session aren't loaded until the next one.

## Non-goals
- No premature scaling. Optimise when a measurement says so.
- No rewrites for style. Preserve working behaviour.
- No process for its own sake. If a step adds nothing for this task, skip it and say so.
