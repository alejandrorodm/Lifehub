---
name: lifehub-ui
description: LifeHub mobile-first UI rules and design tokens. Trigger: any change under src/client (pages, components, styles), new screens, or UI/UX polish in LifeHub.
---

# LifeHub UI — mobile-first, paper and ink

Read `AGENTS.md` (UI and accessibility rules) first; this skill adds the visual
direction chosen by the user on 2026-11-19 ("Papel y tinta", phase 24, which
replaced "Cálido y amable") and the mobile ergonomics every screen must meet. For
broader aesthetic guidance see the `frontend-design` skill, but this brief wins
where they differ: LifeHub is a calm daily tool, not a marketing page. The
user's goal: professional, relaxed and never looking AI-generated.

## Visual direction

- Paper and ink: near-neutral paper (`--color-bg` #f7f7f5, white surfaces), ink
  text, and ONE pine-green accent (`--color-accent`) for the primary action,
  focus and the active nav item. Dark theme is neutral graphite, never blue-grey
  or brown.
- Sections have no colour of their own. They are recognised by their lucide
  icon (monochrome, `strokeWidth` 1.75) and name. Do not reintroduce per-section
  tints, coloured icon tiles or rainbow navigation.
- One family: Inter Variable; headings semibold with tight tracking. Hierarchy
  comes from size and weight, not colour. Today's date is the one large
  typographic moment of the app; keep the rest quiet.
- Surfaces are flat: `Card` is a white panel with a 1px border, no shadow.
  Shadows only for things that float (menus, dialogs, toasts). Radii are small
  (4-8 px; 12 px for sheets). Buttons are rectangular (`rounded-md`), not pills.
- Prefer structure over boxes: sections separated by a heading and a hairline
  (`border-b border-border`) instead of a card per widget; groups of figures in
  one panel divided by hairlines instead of a card per figure. Tabs are
  underlined (`PageTabs`).
- Empty blocks inside a page can be one line of text; full-screen empty states
  use `EmptyState` (plain icon, no tinted tile).
- Sentence case everywhere; no ALL-CAPS labels; no `→` appended to buttons; no
  middle-dot meta strings.
- UI copy in Spanish, code and identifiers in English.
- New text colours must keep AA (4.5:1) on `bg`, `bg-elevated` and `bg-subtle`.

## Creating things

- "Crear" (top bar on mobile, sidebar on desktop) opens `CreateMenu`, a plain
  list. Actions are declared in `app/shortcuts/createActions.ts`. A screen that
  can create something registers it with `useRegisterNewHandler`; the menu
  reuses that same handler through `startNew(path)`, so never duplicate the
  form logic.

## Tokens and primitives (never hard-code values)

- Colours, radii, shadows, z-index and motion live in
  `src/client/styles/tokens.css`. Use the Tailwind utilities they generate
  (`bg-bg-elevated`, `text-text-muted`, `border-border`, `rounded-md`...).
- Build with `src/client/components/ui/*`: `Button`, `IconButton`, `Input`,
  `Select`, `Dialog`, `Sheet`, `PageHeader`, `PageTabs`, `EmptyState`,
  `Skeleton`, `Card`, `Toast`. Extend a primitive instead of restyling it ad hoc.
- Icons: `lucide-react` only, `aria-hidden` when next to text, `aria-label` on
  icon-only buttons.

## Mobile ergonomics (checklist for every screen)

1. Touch targets at least 44x44 px on mobile (`Button` and `IconButton` already
   grow below `md`). Never place two icon buttons closer than 8 px.
2. Form fields use a 16 px font on mobile (prevents iOS zoom); `Input` handles it.
3. Content gutter is `px-4` on mobile, `md:px-6` from tablet up. No horizontal
   page scroll at 360 px; long rows truncate or wrap.
4. Primary action reachable by the thumb: bottom of the screen or the page
   header, never only in a desktop sidebar or hover-only menu.
5. Nothing important behind hover. Row actions must be visible or reachable by
   tap (overflow menu) on touch screens.
6. Respect safe areas: fixed bottom UI adds `pb-[env(safe-area-inset-bottom)]`;
   scrollable content reserves space for the bottom nav (`AppShell` does it).
7. Long forms and detail panels open in `Sheet` (bottom sheet on mobile);
   short confirmations in `Dialog`.
8. Every list has loading (`Skeleton`), empty (`EmptyState` with a real action)
   and error states. Destructive actions confirm or offer undo via the toast.

## Verification

- `npm run typecheck && npm run lint && npm test` before closing a task.
- Look at the result: Playwright screenshots at 390x844 (Mobile) and 1280x800
  (Desktop), in light and dark themes, for every screen you touched.
- `tests/e2e/a11y.spec.ts` (axe) must stay green.
