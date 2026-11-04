---
name: lifehub-ui
description: LifeHub mobile-first UI rules and design tokens. Trigger: any change under src/client (pages, components, styles), new screens, or UI/UX polish in LifeHub.
---

# LifeHub UI — mobile-first, sober neutral

Read `AGENTS.md` (UI and accessibility rules) first; this skill adds the visual
direction chosen by the user on 2026-11-04 ("Neutro sobrio") and the mobile
ergonomics every screen must meet. For broader aesthetic guidance see the
`frontend-design` skill, but this brief wins where they differ: LifeHub is a
quiet daily tool, not a marketing page.

## Visual direction

- One family: Inter Variable for everything, headings included (semibold,
  tight tracking). No serif display, no decorative gradients, no emoji icons.
- Cool, near-monochrome greys (`--color-bg`, `--color-bg-subtle`,
  `--color-border`) plus a single restrained indigo accent. Colour carries
  meaning (state, priority, chart series), never decoration.
- Hierarchy through spacing and weight, not boxes. Prefer plain lists separated
  by hairline dividers over rows of identical cards. Use `Card` only for a real
  group (a widget, a form section).
- Sentence case everywhere; no ALL-CAPS labels; no `→` appended to buttons.
- UI copy in Spanish, code and identifiers in English.

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
