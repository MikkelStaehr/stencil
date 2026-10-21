# Proposal: design-lead reads Stencil's INSPIRATION.md

Proposed 2026-10-21 (slice 4a). This session does not edit ProjectStart (`C:\dev\waan\teams`). The user applies this proposal there, pushes and runs `install.sh`.

Stencil now keeps one list of inspiration links, `INSPIRATION.md` in the Stencil repo root. It is split by motion shelf: Apps (Applications, Web applications) and Websites (Website/Design). Each line says what the link is good for, whether it is free or paid, and its licence. design-lead in other projects doesn't know the file exists yet.

## Change

**`agents/design-lead.md`**, directly after the paragraph that starts "When `design/tokens.json` exists, the project's design was decided in Stencil":

> Before you write a spec for a website or a new screen, read Stencil's `INSPIRATION.md` (`C:\dev\waan\stencil\INSPIRATION.md`). Use the section for the project's shelf: Apps for Applications and Web applications, Websites for Website/Design. Never copy code from a link marked inspiration only, and check the licence of each component before you copy any code.

## LESSONS.md row

| Date | Project | What happened | Root cause | Rule | Lives in |
|---|---|---|---|---|---|
| 2026-10-21 | Stencil | Inspiration links lived in chats and bookmarks, so a website spec started from nothing. | Nothing told design-lead where references for each kind of project are kept. | design-lead reads Stencil's `INSPIRATION.md`, in the section for the project's shelf, before it writes a spec for a website or a new screen. | `agents/design-lead.md` |
