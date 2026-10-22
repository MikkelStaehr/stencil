# Product
<!-- impeccable:product-schema 1 -->

## Status
active
v0.2 in progress

## Product Purpose
Stencil is the frontend standard for every W.A.A.N. project. A project's design and UX decisions are made in one place, seen as live variants side by side, and exported as contracts (DESIGN.md Part B, tokens.json and ux-rules.yaml) that the AI dev team builds and tests against. Every decision can be changed later and exported again.

It will also analyse an existing app and propose a redesign (planned).

## Goals
- A new project's design and UX rules are decided and exported in 30 minutes or less.
- 0 design values are typed by hand: the AI team reads colours, type, spacing and rules from tokens.json and ux-rules.yaml.
- An existing app is analysed into a list of findings and 2–3 redesign directions.

## Users
- The owner, alone at a desk, at the start of a project and whenever a decision changes.
- The AI dev team (ProjectStart's design-lead, ui, tester and reviewer), which reads the exports.

## Non-goals
- Channels, bots and feeds. They belong to Mainframe, the W.A.A.N. control room.
- More than one user, a backend or hosting. Stencil runs locally on one machine.
