---
name: lifehub-ui
description: LifeHub mobile-first UI rules and design tokens. Trigger: any change under src/client (pages, components, styles), new screens, or UI/UX polish in LifeHub.
---

# LifeHub UI — mobile-first, warm and friendly

Read `AGENTS.md` (UI and accessibility rules) first; this skill adds the visual
direction chosen by the user on 2026-11-18 ("Cálido y amable", phase 21, which
replaced "Neutro sobrio") and the mobile ergonomics every screen must meet. For
broader aesthetic guidance see the `frontend-design` skill, but this brief wins
where they differ: LifeHub is a friendly daily tool, not a marketing page.

## Visual direction

- One family: Inter Variable for everything; headings bold with tight tracking.
  No serif display, no decorative gradients, no emoji icons.
- Warm neutrals (cream `--color-bg`, sand `--color-bg-subtle`) and a terracotta
  accent for the primary action. Dark theme is warm brown, never blue-grey.
- Every section has its own colour (`--color-section-<id>` and `-soft`). Use it
  through `SectionIcon` and `SECTION_TONE` (`components/ui/sectionTone.ts`) for
  navigation, page headers (`<PageHeader {...sectionHeader("/tasks")} />`) and
  home widgets. Never invent a colour for a section outside the tokens.
- Surfaces: `Card` and widgets are soft white with `shadow-sm` and large radii
  (12-24 px); buttons are pills. Lists inside a surface use hairline dividers.
- Sentence case everywhere; no ALL-CAPS labels; no `→` appended to buttons.
- UI copy in Spanish, code and identifiers in English.
- New text colours must keep AA (4.5:1) on `bg`, `bg-elevated` and their soft tone.

## Creating things

- "Crear" (top bar on mobile, sidebar on desktop) opens `CreateMenu`. Actions are
  declared in `app/shortcuts/createActions.ts`. A screen that can create
  something registers it with `useRegisterNewHandler`; the menu reuses that same
  handler through `startNew(path)`, so never duplicate the form logic.

## Tokens and primitives (never hard-code values)

- Colours, radii, shadows, z-index and motion live in
  `src/client/styles/tokens.css`. Use the Tailwind utilities they generate
  (`bg-bg-elevated`, `text-text-muted`, `border-border`, `rounded-md`...).
- Build with `src/client/components/ui/*`: `Button`, `IconButton`, `Input`,
  `Select`, `Dialog`, `Sheet`, `PageHeader`, `PageTabs`, `EmptyState`,
  `Skeleton`, `Card`, `Toast`, `SectionIcon`. Extend a primitive instead of restyling it ad hoc.
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
