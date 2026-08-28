# ForgeTrack — UI/UX Experience Specification

**Document:** `UI_UX_SPECIFICATION.md`  
**Version:** 1.0  
**Status:** Implementation-ready handoff for a coding agent  
**Scope:** Frontend UI/UX and interaction system  
**Backend:** Must consume the existing ForgeTrack PRD, architecture, database schema, API specification, AI specification, and engineering standards  
**Visual UI:** This document intentionally defines the visual/interaction system; exact artwork can be created or replaced by the implementation agent.

---

# 0. READ THIS FIRST

Before writing frontend code, the coding agent MUST read:

1. `PRD.md`
2. `ARCHITECTURE.md`
3. `DATABASE_SCHEMA.md`
4. `API_SPECIFICATION.md`
5. `AI_FEATURE_SPECIFICATION.md`
6. `ENGINEERING_STANDARDS.md`
7. `IMPLEMENTATION_PHASES.md`
8. This file: `UI_UX_SPECIFICATION.md`

Do not implement this as a generic admin dashboard.

ForgeTrack is a **serious engineering product wrapped in a small, friendly, playful visual world**.

The target feeling is:

> "This is a powerful issue tracker, but it feels alive."

The user-provided visual references establish two important directions:

- The Bugzilla reference establishes the functional category: issue tracking, search, dense engineering information, products/components and bug workflows.
- The second reference establishes the desired emotional direction: illustrated, friendly, colorful, slightly funky, character-led, clean navigation and playful visual storytelling.

Do NOT copy the reference site's branding, illustrations, logo, layout, or proprietary artwork. Use it only as inspiration for the emotional direction.

---

# 1. PRODUCT EXPERIENCE GOAL

ForgeTrack should feel:

- adorable
- clever
- slightly funky
- modern
- expressive
- fast
- polished
- developer-friendly
- trustworthy
- scalable to serious engineering teams

It should NOT feel:

- childish
- cartoonish everywhere
- like a game
- visually chaotic
- like an old enterprise application
- like a generic Tailwind dashboard
- like a direct Bugzilla clone

### Core design principle

**"Serious engineering underneath. Tiny bugs on top."**

The playfulness is a layer on top of a strong information architecture.

---

# 2. DESIGN PRIORITIES

Priority order:

1. Usability
2. Information hierarchy
3. Accessibility
4. Performance
5. Interaction feedback
6. Brand personality
7. Decorative animation

If a playful effect harms usability, remove/reduce it.

---

# 3. VISUAL DIRECTION

## 3.1 Overall aesthetic

Use a clean editorial SaaS aesthetic with occasional illustrated elements.

Visual ingredients:

- warm neutral background
- strong dark text
- one recognizable signature accent
- small colorful status accents
- rounded but not excessively rounded surfaces
- thin borders
- soft shadows
- occasional hand-drawn/organic shapes
- small bug illustrations
- subtle motion
- tiny surprises

The UI should feel more like a polished creative software product than a traditional project-management dashboard.

---

# 4. COLOR SYSTEM

Use semantic tokens rather than hardcoding colors throughout components.

Suggested initial palette:

```text
--background: warm off-white
--foreground: deep charcoal
--surface: white
--surface-muted: warm gray
--border: soft gray
--primary: energetic chartreuse/lime
--primary-foreground: near-black

--accent-purple: soft electric purple
--accent-blue: friendly sky blue
--accent-coral: warm coral
--accent-yellow: sunny yellow
--accent-mint: mint

--success: green
--warning: amber
--danger: coral/red
--info: blue
```

The exact hex values are implementation choices.

### Rule

Color should communicate meaning in combination with:
- icon
- text
- shape
- label

Never use color as the only status indicator.

---

# 5. TYPOGRAPHY

Recommended:

### UI
Inter, Geist, or Plus Jakarta Sans.

### Display / expressive headings
Space Grotesk or another geometric display sans.

### Technical
JetBrains Mono.

Typography hierarchy:

```text
Display
Page title
Section heading
Card heading
Body
Secondary text
Caption
Metadata
Monospace technical data
```

Avoid overly decorative fonts for functional UI.

---

# 6. SHAPE LANGUAGE

Use a consistent radius system:

```text
xs: 6px
sm: 8px
md: 12px
lg: 16px
xl: 22px
pill: 999px
```

Cards should generally use 12–16px.

Large hero/empty-state surfaces can use 20–24px.

Avoid putting every piece of information inside an individual rounded card.

---

# 7. THE FORGETTABLE PART: MAKE THE BUG THE CHARACTER

ForgeTrack needs a recognizable bug mascot.

## 7.1 Bug personality

The bug is:

- curious
- harmless
- slightly mischievous
- helpful
- expressive

Never make it scary or realistic.

## 7.2 Bug states

Create reusable SVG/CSS/React states:

```text
bug-idle
bug-hover
bug-happy
bug-thinking
bug-confused
bug-running
bug-sleeping
bug-fixed
bug-error
bug-party
```

The same mascot should appear throughout the product.

---

# 8. CUSTOM BUG CURSOR

This is a major signature interaction.

## 8.1 Desktop behavior

On pointer-capable desktop devices:

- hide the native cursor only where safe
- render a small custom bug cursor
- track pointer position using `requestAnimationFrame`
- keep cursor rendering independent from React re-render cycles
- use CSS transform for movement
- use GPU-friendly transforms
- do not cause layout reflow

Suggested cursor size:

```text
Default: 22–28px
Hover: 28–34px
Pressed: 24–28px
```

The cursor must remain visually unobtrusive.

## 8.2 Cursor states

### Default
Tiny idle bug.

### Hoverable element
Bug becomes interested.

Possible effects:
- eyes look toward target
- antennae move
- tiny scale increase
- small bounce
- subtle accent ring

### Button hover
Bug can slightly rotate or "lean" toward the button.

### Click
Bug briefly compresses/squashes and springs back.

### Destructive action
Bug changes to a cautious/confused expression.

### Successful action
Bug briefly celebrates.

## 8.3 Never break these cases

The custom cursor must automatically disable on:

- touch devices
- coarse pointer devices
- accessibility configurations where pointer replacement is inappropriate
- reduced-motion environments if animation would be excessive

The native cursor must remain available as a fallback.

## 8.4 Cursor implementation abstraction

Create:

```text
CursorProvider
BugCursor
CursorInteractionLayer
useCursorState()
usePointerTarget()
```

Do not scatter cursor logic across individual buttons.

---

# 9. SOUND SYSTEM

Sound is optional enhancement, not required for core functionality.

The product should remain completely usable with sound disabled.

## 9.1 Required sounds

At minimum:

```text
hover.wav
click.wav
success.wav
error.wav
notification.wav
```

The user specifically requested:

- one sound when hovering over a button/link
- a different sound when clicking

These should be extremely short and subtle.

Suggested personality:

Hover:
- tiny soft "tick/chirp"

Click:
- slightly deeper "pop/click"

Avoid:
- loud arcade sounds
- long sounds
- annoying repetitive effects
- copyrighted sound effects without appropriate licensing

## 9.2 Browser audio restrictions

Do NOT attempt to autoplay audio on initial page load.

Audio should be initialized after a user interaction because browsers can block autoplay.

Implement:

```text
SoundManager
useSound()
SoundSettings
AudioContext initialization
```

## 9.3 Sound preferences

Provide:

```text
Sound: On / Off
Volume: 0–100
```

Default:
- subtle sound enabled only after the first user gesture, if the platform permits
- otherwise gracefully remain silent until interaction

Persist preference locally.

## 9.4 Hover sound throttling

Do not play a sound continuously while moving across a component.

Recommended:

- play once on pointerenter
- do not replay until pointer leaves and re-enters
- provide a small global throttle to prevent rapid-fire sounds

For menus with many rows, consider hover sound only for primary interactive controls rather than every table row.

---

# 10. REDUCED MOTION

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

When enabled:

- disable cursor animation
- disable decorative parallax
- reduce transitions
- disable looping mascot animations
- keep state changes immediate or minimally animated

Sound should remain separately controllable.

---

# 11. GLOBAL APPLICATION SHELL

The authenticated application should use:

```text
┌──────────────────────────────────────────────────────────┐
│ Top Bar                                                   │
├───────────────┬──────────────────────────────────────────┤
│               │                                          │
│ Sidebar       │ Main Content                             │
│               │                                          │
│               │                                          │
│               │                                          │
└───────────────┴──────────────────────────────────────────┘
```

## 11.1 Top bar

Contains:

- ForgeTrack logo
- workspace/project switcher
- global search
- create button
- notifications
- help/command menu
- user avatar/menu

On smaller screens:

- logo
- search
- create
- avatar

## 11.2 Sidebar

Primary navigation:

```text
Overview
Issues
My Work
Projects
Releases
Reports
Automation
Integrations
AI
Settings
```

The sidebar should support:

- expanded mode
- collapsed mode
- mobile drawer

Do not hide important navigation only behind hover.

---

# 12. DASHBOARD / OVERVIEW

The dashboard should not be a wall of charts.

Top area:

```text
Good morning, [Name] 👋
Here's what needs your attention.
```

Then:

- Open issues
- Issues assigned to me
- Blocked issues
- Due soon
- Recent activity

Then a visual work stream.

## 12.1 Dashboard personality

The bug mascot can appear in small contexts:

Example:

```text
23 issues need attention

[small bug holding magnifying glass]
"Let's squash a few."
```

Keep this subtle.

## 12.2 Dashboard widgets

Recommended:

1. My workload
2. Recently updated issues
3. Priority distribution
4. Sprint/release health
5. Unassigned issues
6. Blocked issues
7. AI suggestions
8. Activity feed

Widgets must be rearrangeable only if that feature is included in the backend/product scope.

---

# 13. ISSUE LIST — CORE EXPERIENCE

This is one of the most important screens.

Use a dense but clean table/list.

Columns:

```text
ID
Status
Priority
Title
Project
Component
Assignee
Reporter
Updated
```

Optional columns:
- Labels
- Sprint
- Due date
- AI confidence
- SLA

## 13.1 Row behavior

Hover:

- slight surface shift
- ID becomes more prominent
- actions appear

Do NOT animate entire rows aggressively.

Click:

- open issue
- preserve current filters/search state

## 13.2 Bulk actions

When selected:

```text
Assign
Change status
Change priority
Add label
Move
Link
Close
More...
```

Show a floating/inline bulk action bar.

---

# 14. ISSUE DETAIL — HERO SCREEN

Issue detail should feel like the heart of ForgeTrack.

Layout:

```text
Breadcrumbs

BUG-1042
Fix authentication timeout

[Status] [Priority] [Labels] [Actions]

Main issue content                    Sidebar
─────────────────────                 ───────────────
Description                           Assignee
Attachments                           Reporter
Activity                              Component
Comments                              Milestone
AI insights                           Due date
Linked issues                         Estimate
Related issues                        Metadata
```

## 14.1 Issue header

Include:

- issue key
- title
- status
- priority
- labels
- project
- quick actions

Actions:

```text
Edit
Assign
Change status
Duplicate
Link
Watch
More
```

## 14.2 Status transition

Make status transitions visually understandable.

Example:

```text
OPEN → IN PROGRESS → RESOLVED → CLOSED
```

Use a compact animated transition indicator.

The bug can react:

- Open: curious
- In progress: working
- Resolved: happy
- Closed: sleeping

---

# 15. ISSUE CREATION

Creation should be extremely fast.

Primary trigger:

```text
+ Create issue
```

Shortcut:

```text
C
```

Open a large modal or dedicated composer.

Fields:

```text
Project
Issue type
Title
Description
Priority
Assignee
Component
Labels
Milestone
Attachments
```

AI assistance may suggest:

- issue type
- component
- priority
- labels
- possible duplicate issues

Suggestions must be clearly labeled as AI suggestions.

Never silently change user input.

---

# 16. ISSUE DESCRIPTION EDITOR

Use a Markdown-capable editor.

Support:

- Markdown
- code blocks
- syntax highlighting
- mentions
- issue references
- links
- checklists
- attachments
- drag/drop images

Preview mode:

```text
Write | Preview
```

The editor should feel fast and calm.

---

# 17. COMMENTS / ACTIVITY

Use a chronological timeline.

Example:

```text
10:32 AM

[Avatar]
Alex changed status
OPEN → IN PROGRESS

12:04 PM

[Avatar]
Priya commented

"Investigating the timeout..."

2:10 PM

[Bug icon]
AI detected 3 potentially related issues.
```

System events should visually differ from human comments.

---

# 18. SEARCH

Global search is a first-class feature.

Shortcut:

```text
/
```

or

```text
Ctrl/Cmd + K
```

Search should support:

- issue key
- title
- description
- comments
- project
- labels
- people
- semantic/AI search if enabled

Search UI:

```text
Search ForgeTrack...

Recent
Suggested
Issues
Projects
People
```

Use keyboard navigation.

---

# 19. COMMAND PALETTE

Implement a command palette.

Shortcut:

```text
Ctrl/Cmd + K
```

Commands:

```text
Create issue
Search issues
Open my issues
Go to project
Change theme
Toggle sound
Toggle cursor effects
Open settings
Open keyboard shortcuts
```

This makes the product feel significantly more advanced than a traditional tracker.

---

# 20. FILTER BUILDER

Issue search/filtering should have a friendly visual builder.

Example:

```text
Status       is       Open
AND
Assignee     is       Me
AND
Priority     is       High
```

Provide:
- chips
- autocomplete
- saved searches
- share search
- URL state

Advanced users can use a query syntax.

---

# 21. PROJECT PAGE

Project page should provide:

Header:

```text
Project name
Description
Members
Repository
Release
```

Tabs:

```text
Overview
Issues
Board
Releases
Reports
Activity
Settings
```

---

# 22. KANBAN / BOARD VIEW

Optional alternative to list view.

Columns:

```text
Backlog
Open
In Progress
Review
Resolved
```

Cards should show:

- issue key
- title
- priority
- assignee
- labels

Drag/drop must have:

- clear drop target
- small animation
- optimistic UI where safe
- rollback on failure

Do not make cards overly large.

---

# 23. RELEASES

Release page:

```text
v2.4.0

Progress ━━━━━━━━━━━ 78%

32 / 41 issues resolved

Open
In Progress
Resolved
Blocked
```

Use a tiny bug illustration around progress milestones.

---

# 24. REPORTS / ANALYTICS

Reports should be clean and useful.

Suggested:

- issue count over time
- resolution time
- reopened issues
- backlog trend
- priority distribution
- component health
- release health
- team workload

Charts should use restrained motion.

On initial render:
- animate once
- never continuously animate charts

---

# 25. AI EXPERIENCE

AI must feel integrated, not bolted on.

Use a visual distinction such as:

```text
✨ AI suggestion
```

Do not make the entire application glow with AI styling.

## AI components

### Duplicate detection

When creating/editing:

```text
Possible duplicates

3 similar issues found

[BUG-1021]
[BUG-987]
[BUG-814]
```

### Triage

```text
AI suggestion

Component: Authentication
Priority: High
Labels: backend, timeout

[Accept] [Edit] [Dismiss]
```

### Summary

Issue sidebar:

```text
✨ AI summary

Users experience authentication
timeouts after prolonged inactivity.
```

Every AI suggestion should allow:
- accept
- edit
- dismiss

---

# 26. NOTIFICATIONS

Notifications should be grouped:

```text
Today
Yesterday
Earlier
```

Types:

- assignment
- mention
- comment
- status change
- watched issue
- automation
- release
- AI suggestion

Unread state should be obvious without excessive red badges.

---

# 27. TOAST SYSTEM

Use toasts for:

- saved
- updated
- copied
- assigned
- deleted
- failed

Example:

```text
✓ Issue updated

BUG-1042 is now In Progress
```

The bug mascot can appear as a tiny icon for positive events.

Avoid giant success modals for ordinary actions.

---

# 28. EMPTY STATES

Empty states are a major opportunity for personality.

Example:

```text
       [sleeping bug]

No issues here.

Either everything is beautifully quiet,
or the bugs are hiding.

[Create issue]
```

Other examples:

No notifications:

```text
[bug sleeping]

Nothing buzzing right now.
```

No search results:

```text
[confused bug + magnifying glass]

No bugs found.

Try changing your filters.
```

Empty states must still clearly explain what happened and what to do next.

---

# 29. ERROR STATES

Error pages should be friendly without making light of serious failures.

Example:

```text
[bug looking confused]

Something went sideways.

We couldn't load this page.

[Try again]
```

For destructive/system failures, use clear language first and decoration second.

---

# 30. LOADING STATES

Avoid generic spinners everywhere.

Use skeletons for:
- tables
- cards
- issue details

Use tiny bug animation only for larger transitions.

Example:

```text
Loading issues...
[small walking bug]
```

Never create a long blocking animation.

---

# 31. 404 PAGE

Suggested:

```text
404

This bug wandered off.

The page you're looking for
couldn't be found.

[Go home] [Go back]

[small bug walking away]
```

---

# 32. SETTINGS

Settings navigation:

```text
Profile
Appearance
Notifications
Sound
Cursor
Keyboard shortcuts
Projects
Workflow
Custom fields
Integrations
API
Security
Audit log
```

## Appearance settings

```text
Theme
○ Light
○ Dark
○ System

Motion
○ Full
○ Reduced

Sound
○ On
○ Off

Cursor
○ Bug
○ Default
```

This makes the personality optional rather than forced.

---

# 33. DARK MODE

Dark mode should not simply invert colors.

Use:

- deep charcoal background
- slightly lighter surfaces
- carefully adjusted borders
- softened accent colors

Maintain the playful identity without excessive neon.

---

# 34. RESPONSIVE DESIGN

Breakpoints should be based on layout needs rather than device names.

### Desktop

Full:
- sidebar
- top bar
- dense tables
- multi-column issue detail

### Tablet

- collapsible sidebar
- reduced table columns
- stacked issue metadata

### Mobile

- bottom/slide-out navigation
- cards instead of dense tables where necessary
- issue detail becomes single-column
- sticky create/action button
- no custom cursor
- no hover-only functionality

---

# 35. MOBILE ISSUE DETAIL

Order:

```text
Issue key + title
Status / priority
Primary actions
Description
Attachments
Activity
Comments
Metadata
Linked issues
```

Avoid forcing users to scroll through a desktop-style sidebar.

---

# 36. MICRO-INTERACTIONS

Use subtle interactions:

### Buttons
- hover lift: 1–2px
- tiny scale: 1.01–1.02
- click compression: 0.98

### Cards
- border/surface transition

### Dropdowns
- fade + translate 4–8px

### Modals
- opacity + translate/scale very slightly

### Tabs
- animated active indicator

### Checkboxes
- short check animation

### Status change
- small transition animation

Do not animate everything.

---

# 37. PAGE TRANSITIONS

Use subtle transitions when changing major pages.

Recommended:
- opacity
- 4–10px vertical movement

Duration:
- approximately 150–250ms

Avoid dramatic page transitions in an engineering tool.

---

# 38. HOVER "SURPRISES"

Use tiny moments of personality sparingly.

Examples:

Hovering the logo:
- bug peeks around it

Hovering an empty-state bug:
- bug looks toward pointer

Hovering "Closed":
- sleeping bug briefly wakes

Hovering AI:
- tiny sparkle

These should never interfere with interaction.

---

# 39. EASTER EGGS

Optional, hidden and non-essential.

Examples:

- clicking the bug logo repeatedly causes a tiny bug parade
- after resolving a batch of issues, a tiny celebration animation
- keyboard shortcut opens a "bug mode"

Rules:
- no blocking
- no sound required
- respect reduced motion
- never interfere with workflows

---

# 40. ACCESSIBILITY

Required:

- semantic HTML
- keyboard navigation
- visible focus rings
- ARIA labels where needed
- accessible dialogs
- accessible menus
- accessible tooltips
- screen-reader announcements for important state changes
- minimum reasonable contrast
- no hover-only essential information
- no sound-only feedback
- no animation-only feedback

Keyboard focus must remain visible even when custom cursor is active.

---

# 41. KEYBOARD SHORTCUTS

Recommended:

```text
C           Create issue
/           Focus search
G then I    Go to issues
G then P    Go to projects
G then M    Go to my work
Ctrl/Cmd+K  Command palette
Esc         Close modal/palette
?           Shortcut help
```

Shortcut system should be centralized.

Create:

```text
KeyboardShortcutProvider
useShortcut()
ShortcutHelpModal
```

---

# 42. COMPONENT ARCHITECTURE

Suggested frontend structure:

```text
src/
  app/
  components/
    ui/
    layout/
    issue/
    project/
    dashboard/
    search/
    command/
    ai/
    charts/
    mascot/
    cursor/
    sound/
  hooks/
  lib/
    api/
    audio/
    cursor/
    keyboard/
    accessibility/
  pages/
  stores/
  styles/
```

Use reusable primitives.

Do not create separate one-off implementations for the same interaction.

---

# 43. CORE COMPONENT INVENTORY

Build these reusable components first:

```text
AppShell
TopBar
Sidebar
MobileNav
Button
IconButton
Input
Textarea
Select
Combobox
Badge
StatusBadge
PriorityBadge
Avatar
Tooltip
Popover
DropdownMenu
Dialog
Drawer
Tabs
Toast
CommandPalette
DataTable
Pagination
FilterBuilder
SearchBar
IssueRow
IssueCard
IssueHeader
IssueMeta
IssueActivity
CommentComposer
MarkdownEditor
AttachmentList
EmptyState
ErrorState
Skeleton
Progress
ChartCard
AIInsight
BugMascot
BugCursor
SoundProvider
```

---

# 44. STATE MANAGEMENT

Separate:

### Server state
Issues, projects, users, comments, notifications, analytics.

### UI state
Modal open/closed, selected rows, sidebar state, cursor state.

### Preferences
Theme, sound, cursor mode, reduced motion.

Do not store server data permanently in UI state without reason.

---

# 45. PERFORMANCE REQUIREMENTS

Custom interactions must not make the tracker slow.

Targets:

- cursor movement must not trigger React render on every pointer event
- use `requestAnimationFrame`
- virtualize very large issue lists
- lazy-load heavy charts
- lazy-load AI panels if appropriate
- optimize mascot SVGs
- compress audio
- preload only tiny critical assets
- avoid huge background videos

Do not use canvas/WebGL for the entire UI.

---

# 46. AUDIO PERFORMANCE

Sound files should be:

- short
- compressed
- local
- licensed appropriately
- loaded lazily or as tiny assets

Suggested maximum:
- hover: < 100 KB
- click: < 100 KB
- success/error: < 150 KB

Actual format can be:
- WebAudio-compatible small assets
- OGG/WebM where appropriate
- MP3 fallback where needed

---

# 47. CURSOR PERFORMANCE

Implementation requirements:

```text
pointermove
    ↓
requestAnimationFrame
    ↓
update transform
    ↓
GPU compositing
```

Do NOT:

```text
pointermove
    ↓
setState()
    ↓
React render
    ↓
DOM update
```

for every pointer movement.

Use refs/direct DOM transforms or an equivalent high-performance mechanism.

---

# 48. DESIGN TOKENS

Centralize:

```text
colors
spacing
radius
shadows
typography
z-index
motion duration
motion easing
```

Example spacing:

```text
4
8
12
16
20
24
32
40
48
64
```

---

# 49. Z-INDEX PLAN

Use explicit layers:

```text
base
sticky navigation
dropdown
popover
tooltip
modal backdrop
modal
command palette
toast
cursor
```

The custom cursor must never appear behind normal UI accidentally.

---

# 50. INTERACTION PRIORITY

Every important action should have:

1. visual feedback
2. state feedback
3. error feedback
4. keyboard equivalent where reasonable

For example:

Click "Assign":

```text
click
→ button/loading state
→ API request
→ success state
→ toast
→ issue metadata updates
```

---

# 51. OPTIMISTIC UI

Use optimistic updates for safe actions:

- assigning issue
- changing status
- adding label
- toggling watch
- starring/saving

Do not use optimistic updates where rollback could cause serious confusion.

---

# 52. DESTRUCTIVE ACTIONS

For:

- delete
- bulk close
- mass assignment
- destructive automation

Require appropriate confirmation.

Confirmation dialog:

```text
Are you sure?

This will close 24 issues.

[Cancel] [Close 24 issues]
```

Do not make destructive buttons playful.

---

# 53. COPYWRITING STYLE

Voice:

- concise
- friendly
- confident
- technical when needed
- occasionally playful

Good:

```text
3 bugs need your attention.
```

Better:

```text
3 bugs are buzzing around your queue.
```

Avoid:

```text
OMG!!! BUGS EVERYWHERE!!! 😂
```

The product is not a joke.

---

# 54. UI STATES EVERY COMPONENT MUST SUPPORT

For interactive/server-driven components, consider:

```text
default
hover
focus
active
disabled
loading
success
error
empty
selected
keyboard-focused
mobile
dark mode
reduced motion
```

---

# 55. TESTING REQUIREMENTS

The frontend implementation must include tests for:

### Cursor
- appears on desktop
- disabled on touch
- reduced motion behavior
- target hover detection
- click state

### Sound
- hover plays once
- click plays separate sound
- sound can be disabled
- audio autoplay restrictions handled
- rapid hovering does not spam audio

### Navigation
- keyboard navigation
- command palette
- route preservation

### Issue list
- filters
- pagination
- bulk actions
- loading/error/empty states

### Issue detail
- status transition
- comments
- assignment
- attachments

---

# 56. BROWSER / DEVICE FALLBACK

The UI must still be fully functional if:

- JavaScript animation fails
- audio fails
- custom cursor fails
- SVG animation fails
- browser blocks audio
- reduced motion is enabled
- user is on touch device

Progressive enhancement is mandatory.

---

# 57. WHAT NOT TO BUILD

Do not add:

- huge 3D scenes
- full-screen animated backgrounds
- constantly moving bugs
- loud sound effects
- excessive gradients
- crypto/web3 styling
- glassmorphism everywhere
- giant dashboard cards
- unnecessary AI chat occupying the entire screen
- hover-only essential actions
- heavy video backgrounds

ForgeTrack must remain an engineering tool.

---

# 58. IMPLEMENTATION ORDER FOR UI

Implement in this order:

## UI-01 Foundation
- design tokens
- fonts
- global CSS
- theme system
- base primitives

## UI-02 App shell
- sidebar
- top bar
- routing
- responsive shell

## UI-03 Interaction layer
- cursor provider
- bug cursor
- sound provider
- keyboard shortcut provider
- command palette

## UI-04 Issue list
- search
- filters
- table
- pagination
- bulk actions

## UI-05 Issue creation
- composer
- Markdown editor
- attachments
- AI suggestions

## UI-06 Issue detail
- header
- metadata
- activity
- comments
- linked issues

## UI-07 Dashboard
- widgets
- activity
- workload
- release health

## UI-08 Project / board
- project pages
- Kanban

## UI-09 Reports
- charts
- analytics

## UI-10 Notifications / AI
- notifications
- AI panels
- duplicate suggestions
- summaries

## UI-11 Settings
- theme
- sound
- cursor
- shortcuts
- preferences

## UI-12 Polish
- animations
- empty states
- error states
- mascot states
- accessibility
- performance

---

# 59. CODING AGENT IMPLEMENTATION RULES

The coding agent MUST:

1. Read all project specification documents before coding.
2. Treat the API specification as the source of truth for backend communication.
3. Never invent API response shapes when the specification defines them.
4. Keep UI components independent from API implementation details.
5. Create reusable components before building pages.
6. Use semantic HTML.
7. Make all core interactions keyboard accessible.
8. Respect reduced motion.
9. Make sound optional.
10. Make the cursor optional.
11. Ensure the product remains fully usable without either sound or custom cursor.
12. Do not use placeholder lorem ipsum.
13. Use realistic issue/project/user data for development fixtures.
14. Implement loading, error, empty and success states.
15. Do not hardcode production data.
16. Do not introduce unnecessary dependencies.
17. Optimize pointer interaction carefully.
18. Test desktop and mobile behavior.
19. Do not allow the playful layer to compromise information density.
20. Preserve URL state for searches and filters where applicable.

---

# 60. ACCEPTANCE CRITERIA

The UI is considered complete only when:

### Visual
- [ ] Looks clearly different from legacy Bugzilla
- [ ] Feels friendly and memorable
- [ ] Does not look childish
- [ ] Has consistent typography
- [ ] Has consistent spacing
- [ ] Has coherent light/dark themes

### Cursor
- [ ] Bug cursor works on desktop
- [ ] Hover behavior works
- [ ] Click behavior works
- [ ] Disabled on touch
- [ ] Reduced-motion compliant
- [ ] Does not cause performance issues

### Sound
- [ ] Hover and click sounds are different
- [ ] Sound can be disabled
- [ ] Browser autoplay restrictions handled
- [ ] Sounds are subtle
- [ ] No sound is required for understanding state

### Core tracker
- [ ] Dashboard
- [ ] Issue list
- [ ] Search
- [ ] Filter builder
- [ ] Create issue
- [ ] Issue detail
- [ ] Comments
- [ ] Assignment
- [ ] Status changes
- [ ] Labels
- [ ] Projects
- [ ] Releases
- [ ] Reports
- [ ] Notifications
- [ ] Settings

### Quality
- [ ] Responsive
- [ ] Keyboard accessible
- [ ] Screen-reader considerations implemented
- [ ] Loading states
- [ ] Error states
- [ ] Empty states
- [ ] Reduced motion
- [ ] Performance reviewed

---

# 61. FINAL EXPERIENCE TEST

Before considering the UI finished, ask:

> If I remove the bug mascot, custom cursor, colors and sounds, is the underlying issue tracker still excellent?

If NO:
- fix the UX.

Then ask:

> If I add the playful layer back, does ForgeTrack feel immediately recognizable?

If NO:
- strengthen the brand character and micro-interactions.

The desired final result is:

**Bugzilla's engineering depth + modern SaaS usability + a tiny amount of delightful personality.**

---

# 62. IMPORTANT: DO NOT OVERDO IT

The requested "funky" direction should be approximately:

```text
Engineering seriousness   ████████████████░░░░
Playfulness                ██████░░░░░░░░░░░░
Animation                  █████░░░░░░░░░░░░░
Illustration               ██████░░░░░░░░░░░░
Sound                      ███░░░░░░░░░░░░░░░
```

This is intentionally restrained.

The user should smile occasionally, not feel like they entered a children's game.

---

# 63. RECOMMENDED FIRST SCREEN EXPERIENCE

After login:

```text
┌──────────────────────────────────────────────────────────┐
│ ForgeTrack     Search...       + Create    🔔    Avatar │
├───────────────┬──────────────────────────────────────────┤
│ Overview      │                                          │
│ Issues        │  Good morning, Vaishnav 👋              │
│ My Work       │                                          │
│ Projects      │  12 issues need your attention.         │
│ Releases      │                                          │
│ Reports       │  ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│ Automation    │  │ My Work │ │ Blocked │ │ Due Soon │ │
│ AI            │  └─────────┘ └─────────┘ └──────────┘ │
│ Settings      │                                          │
│               │  Recent activity                         │
│               │  ──────────────────────────────────────  │
│               │  BUG-1042  Authentication timeout        │
│               │  BUG-1038  Search indexing              │
│               │  BUG-1031  Mobile notification          │
│               │                                          │
│               │                         [tiny bug]       │
└───────────────┴──────────────────────────────────────────┘
```

The bug cursor should be visible immediately on desktop, but the interface itself should remain calm.

---

# 64. DELIVERABLES EXPECTED FROM THE CODING AGENT

The coding agent should produce:

```text
Frontend application
Reusable component system
Responsive layouts
Theme system
Bug mascot system
Custom cursor system
Sound system
Keyboard shortcut system
Command palette
Issue management UI
Project UI
Dashboard
Reports
Notifications
AI UI
Settings
Accessibility implementation
Tests
Storybook or equivalent component preview if already supported by project conventions
```

No final UI should depend on manually editing individual pages to change theme, cursor, sound, or animation behavior.

Everything should be controlled through reusable providers, hooks, components and design tokens.
