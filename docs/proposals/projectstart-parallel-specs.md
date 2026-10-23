# Proposal: reconcile tech-lead and design-lead before an L build

Proposed 2026-10-23 (Stencil slice 5b retro, approved by the user). This session does not edit ProjectStart (`C:\dev\waan\teams`). The user applies this proposal there, pushes and runs `install.sh`. It concerns the CLAUDE.md template that every project copies.

## What happened

In Stencil slice 5b (an L slice, 60 min), tech-lead's one-pager and design-lead's spec ran in parallel, as the L flow allows ("design-lead spec ∥ data layer"). They disagreed:
- tech-lead cut the side-panel readouts from 5b, and design-lead specced them;
- tech-lead's acceptance criterion kept "the same h1 as before", and design-lead's spec renamed one h1.

The main session built from tech-lead's list without merging the two. design-lead's review then raised the h1 as a Must, and the user had to decide it after the build. tech-lead had also estimated 75 min (about 40 % of it rewriting e2e specs), but the build started on the 60 min budget, so the slice went over twice (+30 min, +15 min).

## Change

**CLAUDE.md template, section "How we work: size every task first"**, add after the paragraph that starts "**Data check** (M and L)":

> **Reconcile before you build** (L, and M when design-lead and tech-lead both run): when tech-lead's plan and design-lead's spec exist, the main session merges their scope and acceptance criteria into one list before any build step, and puts every conflict between them to the user. If tech-lead's estimate is above the budget, say so and ask before the build, not when the budget runs out.

## LESSONS.md row

| Date | Project | What happened | Root cause | Rule | Lives in |
|---|---|---|---|---|---|
| 2026-10-23 | Stencil | Slice 5b (L) went over budget twice (60 + 30 + 15 min), and a design-lead Must (an h1) contradicted tech-lead's acceptance criterion after the build. | tech-lead and design-lead ran in parallel, and their scope and criteria were never merged into one list. The build started on the budget, not on tech-lead's higher estimate (75 min). | Before an L build, the main session merges tech-lead's and design-lead's scope and criteria into one list, puts conflicts to the user, and raises an estimate above the budget before building. | CLAUDE.md template ("How we work") |
