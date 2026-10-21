# Proposal: two run-web fixes for the team template

Proposed 2026-10-21 (slice 4a). This session does not edit ProjectStart (`C:\dev\waan\teams`). The user applies this proposal there, pushes and runs `install.sh`. Both changes concern `skills/run-web/`, which every project copies.

## 1. A screenshot for new content in an existing screen (retro)

**`skills/run-web/SKILL.md`**, under `## Rules`, after the rule about UI placed by a data value:

> - New content shown in an existing step or screen (new catalogue entries, new rows, a new section): take one 1280 px shot of it, even when e2e is green. e2e checks sizes and overflow, not empty space.

## 2. serve.sh refuses extra arguments

`serve.sh` reads only `$1` after `--`, so a command passed unquoted as several words loses all but the first, and nothing says so. **`skills/run-web/serve.sh`**, after the line `CMD="${1:-}"`:

```bash
[ $# -le 1 ] || { echo "pass the command as one quoted argument after --" >&2; exit 2; }
```

Stencil's own `serve.sh` gets the same line when the template is next merged.

## LESSONS.md row

| Date | Project | What happened | Root cause | Rule | Lives in |
|---|---|---|---|---|---|
| 2026-10-21 | Stencil | Six new catalogue entries left an empty 312 px column in an existing step. Only the reviewer found it. | The screenshot was skipped because e2e was green, and e2e checks sizes and overflow, not empty space. | New content in an existing screen gets one 1280 px shot, even when e2e is green. | `skills/run-web/SKILL.md` |
