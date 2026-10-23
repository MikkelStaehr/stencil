# Proposal: Mainframe reads any Stencil schema version ≥ 1 (Mainframe slice 5d)

Proposed 2026-10-23 by Stencil (labs programme, docs/PLAN.md). This session does not edit Mainframe (`C:\dev\waan\app`); the user runs this as Mainframe's slice 5d in a Mainframe session. **It must be live before Stencil's slice 5g** (the v2 bundle), so a v2 export never reaches a Mainframe that refuses it.

## Why

Stencil's 5g bumps the project file, tokens.json and ux-rules.yaml to v2 in one go: the Stencil name and file extension, motion part B (`profile.kind`, `resolved.motion`, a `reduced-motion` check kind) and colour shades 50–950. Later versions (type scales with `clamp()`, new colour roles) will follow. Mainframe today recognises each file by version 1 exactly, so every bump would break its Design tab and need a Mainframe change in step. After this slice, a Stencil bump never needs one again.

What Mainframe matches today (`web/src/lib/design/export.ts`):

| Line | Today | Breaks on |
|---|---|---|
| 18 | provenance `Part B exported by Design Wizard from \`design/<slug>.dwproj.json\`` | the new name and extension |
| 24 | ux-rules.yaml starts with `schemaVersion: 1\n` | ux-rules v2 |
| 33 | `format === "design-wizard-project" && schemaVersion === 1` | project file v2, a new format id |
| 34–35 | tokens.json `$extensions["com.github.mikkelstaehr.design-wizard"].schemaVersion === 1` | tokens v2, a new namespace |

## The rule (the user, 2026-10-23)

1. **Read any `schemaVersion` that is an integer ≥ 1.** A missing, non-integer or < 1 version is still an error, listed by file.
2. **Show what it knows, and say "newer format" about the rest.** When a file's version is higher than the newest Mainframe knows, the Design tab shows every part it can read and one line per file: "tokens.json uses a newer Stencil format (v3); Mainframe shows what it knows." Unknown keys are never an error and never silently dropped from what it passes on.
3. **Write only versions it knows.** If Mainframe writes or merges any of these files (check `merge.ts`), it refuses to write a file whose version is higher than the newest it knows, and says why, so it never downgrades a file or loses fields it doesn't understand.
4. **Recognise both names.** Accept the old and the new identifiers side by side:

| | Old (v1) | New (v2, proposed; the user confirms before Mainframe 5d) |
|---|---|---|
| Project file `format` | `design-wizard-project` | `stencil-project` |
| tokens.json namespace | `com.github.mikkelstaehr.design-wizard` | `com.github.mikkelstaehr.stencil` |
| Provenance line | `Part B exported by Design Wizard from \`design/<slug>.dwproj.json\`` | `Part B exported by Stencil from \`design/<slug>.stencil.json\`` |
| ux-rules.yaml | first line `schemaVersion: <n>` | unchanged |

The DESIGN.md safety checks (no HTML, no setext heading) and the ux-rules.yaml check (no anchors or aliases) stay exactly as they are. The four-file rule stays: Stencil's coming brand board (slice 5i) is not one of the four files.

## Tests (Mainframe)

- The current v1 fixtures (`web/src/lib/design/__fixtures__/stencil/`) still pass unchanged.
- A v2-shaped fixture, made by hand until Stencil's 5g exists: a v1 golden with `schemaVersion: 2`, the new identifiers and one unknown key per file. It is read, the unknown key is passed on, and the tab shows no "newer format" line once v2 is known.
- A v3 fixture: read, and each file shows the "newer format" line.
- Invalid versions (`0`, `"2"`, `1.5`, missing) are errors that name the file.
- If Mainframe writes these files: a v3 file is never written back.
- **After Stencil's 5g:** the hand-made v2 fixture is replaced by Stencil's real v2 goldens (a consumer's fixture is the producer's real output).

## Size

About M for Mainframe (one parser, its fixtures and one line of UI per file), plus Mainframe's security review, because DESIGN.md reaches agents as instructions.
