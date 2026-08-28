# ForgeTrack — Coding Agent UI Build Brief

## Mission

Build the ForgeTrack frontend using `UI_UX_SPECIFICATION.md` plus the existing project specification files.

The UI should be:

**adorable + slightly funky + eye-catching + professional + information-dense + fast**

Do NOT build a generic admin dashboard.

## Required personality

The visual identity is based around a friendly bug character.

Use the bug for:
- custom desktop cursor
- empty states
- loading moments
- success feedback
- AI hints
- 404
- small decorative moments

Keep the bug illustrations simple and vector-like.

## Signature interactions

### 1. Bug cursor
Desktop pointer becomes a small bug.

States:
- idle
- hover
- click
- success
- caution/error

Use high-performance pointer tracking.

Never run React state updates on every pointermove.

### 2. Hover sound
When entering an interactive primary control:
- play a tiny subtle sound
- play once per pointer entry

### 3. Click sound
On activation:
- play a different short sound

Sound must be optional and disabled gracefully if browser policy blocks audio.

### 4. Accessibility
Custom cursor and sound are enhancements.

The application MUST remain fully usable with:
- native cursor
- no sound
- reduced motion
- keyboard
- screen reader
- mobile/touch

## Visual reference interpretation

The uploaded reference with the illustrated orange character establishes the desired emotional direction:

- friendly
- illustrated
- warm
- playful
- expressive
- slightly quirky

The uploaded Bugzilla reference establishes the functional baseline:

- issue list
- search
- project/product hierarchy
- issue metadata
- engineering workflows

Do not copy either site's exact branding or artwork.

## Build sequence

1. Inspect all existing project files.
2. Read all ForgeTrack specification documents.
3. Inspect existing frontend stack.
4. Implement design tokens.
5. Implement base UI primitives.
6. Implement AppShell.
7. Implement theme.
8. Implement cursor/sound providers.
9. Implement command palette/shortcuts.
10. Implement issue list.
11. Implement issue creation.
12. Implement issue detail.
13. Implement project/board views.
14. Implement dashboard.
15. Implement reports.
16. Implement notifications.
17. Implement AI UI.
18. Implement settings.
19. Add responsive behavior.
20. Add loading/error/empty states.
21. Add accessibility.
22. Add tests.
23. Run production build and fix issues.

## Critical rule

Do not sacrifice tracker usability for visual effects.

The product should feel like:

> A great engineering issue tracker that happens to have a personality.

Not:

> A cartoon website with an issue tracker attached.
