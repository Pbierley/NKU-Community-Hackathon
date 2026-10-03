# Norse Mobile Campus — Design System v3 (Premium Modern)

> Strict source of truth for all UI work in this project.
> Goals: premium, calm, professional. No visual slop: no pure-black text,
> no harsh shadows, no pill-everywhere, no centered walls of text,
> no decorative meta-notes, no redundant screen titles.
> Stack: semantic HTML5 + Tailwind CSS (CDN) + vanilla JS (`navigateTo()`).
> Two fonts max. Base viewport: 390px mobile, responsive up to desktop frame.

## Changelog (v2 → v3 — as built)

- App shell is responsive: `w-full max-w-[480px] md:max-w-[560px]`,
  `h-[100dvh] md:h-[92dvh]`, framed `rounded-2xl` on desktop, full-bleed on
  mobile. No fixed `max-w-md h-screen` shell.
- Brand uses the real `logo.avif` asset everywhere (login hero `h-16`,
  home/events headers `h-10`). Every logo is a button → `home-screen`.
  Text-badge logos are gone.
- Login has no OS status bar (no time / signal / battery). Top breathing
  room (`pt-12`) replaces it.
- Microcopy cull: no "2-Step Onboarding Architecture", no "Step 1 of 2",
  no "Almost Done", no feed-explainer paragraphs. Keep the `Registration`
  status badge and the Duo MFA footer.
- Register: Major is a free-text input, not a select. Interests are
  per-color with custom add (see §6).
- Events: no filter chips. Cards carry only the category tag (no `EVENT n`,
  no save/bookmark). Attending counts are now Register buttons.
- Account screen is titled `Account` (not "Account summary"): no ID Card,
  no "Back to Home" — single full-width Edit Profile + header back arrow.
- Home: map is the hero (`flex-1 min-h-0`), search floats inside the map
  (navigation-only), no "Explore campus" title block, featured events are a
  compact horizontal snap rail.

## 1. Spacing & Whitespace (4pt / 8pt system)

- Base unit is 4px. Use only multiples of 4 / 8 from the Tailwind scale.
- Allowed: `4, 8, 12, 16, 24, 32, 48` → `p-1, p-2, p-3, p-4, p-6, p-8, p-12`
  and matching `m-*, gap-*, space-*`. No arbitrary values like `13px`, `px-3.5`.
- Card padding: cards use `p-6` (24px) minimum, large summary cards `p-8`
  (32px). Compact rail cards (featured events) use `p-4` (16px) so the map
  keeps the majority of home height.
- Buttons are roomy: primary actions are `h-14` (56px) with `px-8`,
  never cramped `h-10` primaries. Secondary rows are minimum `h-12` (48px).
- Grouping rule:
  - Related elements (label + input, icon + line): `gap-2` (8px) / `space-y-2`.
  - Sections inside a card: `space-y-4` (16px).
  - Unrelated blocks (form → action, list → footer): `space-y-6` / `space-y-8`
    and `mt-8` separators. When in doubt, add more air between groups,
    less air inside groups.
- Screen side margin is `px-6` (24px); dense rails/lists may use `px-4`.
  Section stack is `space-y-6` (event list uses `space-y-4`).

## 2. Typography (hierarchy + readability)

- Font families (max 2):
  1. `Inter` — all UI, headings, body.
  2. System fallback — `ui-sans-serif, system-ui, sans-serif`.
  - No other families. No decorative/display fonts.
- Scale (mobile):
  - H1: `text-3xl (30px), font-extrabold (800), tracking-tight, leading-[1.2]`.
    One per screen, left-aligned. Screens that are tools, not documents
    (Home map, Events list), carry NO H1 — the header + context is enough.
  - H2: `text-xl (20px), font-bold (700), tracking-tight, leading-[1.3]`.
    Section headers. Left-aligned.
  - H3 / card titles: `text-base (16px), font-bold, leading-[1.4]`.
  - Body: `text-[15px], font-normal/medium, leading-[1.6]`.
  - Small / meta (dates, subtitles): `text-[13px], text-muted, leading-[1.5]`.
  - Micro label (eyebrows, field labels): `text-[11px], font-bold, tracking-[0.06em], uppercase`.
- Body line-height is `1.5` minimum, `1.6` preferred. Never tight body copy.
- Tabular numbers for times/counts/years: `tnum` class.
- Emphasis via weight + color, not size alone. Links are semibold + underline
  with `underline-offset-2`.
- Microcopy rule: no meta helper notes. Never document the IA in the UI
  ("…Architecture", "Step n of n", "Almost Done") and never explain the
  taxonomy inline ("Interests power your feed…"). If it doesn't help the
  user act, delete it.

## 3. Color & Contrast (60-30-10)

- Distribution:
  - 60% — neutral app background: `#F9FAFB` (gray-50) / `#F3F4F6` page wash.
  - 30% — secondary surfaces: pure `#FFFFFF` cards, sheets, headers.
  - 10% — primary accent: NKU Gold `#FFC72C`. Gold is for primary actions,
    the registered state, and tiny markers only. Never large gold panels,
    never gold body text on white.
- Text (never pure black):
  - Primary text / headings: `#111827` (gray-900).
  - Body text: `#374151` (gray-700).
  - Secondary text (dates, subtitles, placeholders): `#6B7280` (gray-500).
  - Faint captions only: `#9CA3AF` (gray-400). Minimum 12px when used.
- Borders / dividers: `#e5e7eb` (gray-200), 1px. No dark borders for structure.
  Focus ring is `2px #FFC72C` outer + `#111827` inner edge.
- Category / interest tints (flat, dark text, 6px radius):
  - Amber: bg `#FFFBEB`, text `#92400E`, border `#FDE68A` (Sports, Athletics-adjacent).
  - Purple: bg `#F5F3FF`, text `#5B21B6`, border `#DDD6FE` (Arts).
  - Blue: bg `#EFF6FF`, text `#1D4ED8`, border `#BFDBFE` (Music, Athletics).
  - Green: bg `#ECFDF5`, text `#047857`, border `#A7F3D0` (Tech, Career).
  - Red: bg `#FEF2F2`, text `#B91C1C`, border `#FECACA` (custom overflow).
  - Fuchsia: bg `#FDF4FF`, text `#A21CAF`, border `#F0ABFC` (custom overflow).
- Contrast: body text on white ≥ 4.5:1. Gold `#FFC72C` always pairs with
  `#111827` text/icons, never white text on gold.
- Dark surfaces: when a dark fill is needed, use `#111827`, never `#000000`.
  No `#000000` anywhere in UI.

## 4. Depth & Borders (soft, quiet elevation)

- Banned: pure-black shadows (`#000`, opaque), gold glows,
  `shadow-2xl` on cards, stacked multiple shadows on one element.
- Allowed elevation (one per element):
  - Card resting: `0 12px 32px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)`.
    Token name: `shadow-card`.
  - Raised only (drawer, toast, floating action/search): same token + 1px
    `#e5e7eb` border. Scrim is `rgba(17,24,39,0.45)` with 8px blur.
- Borders: `1px solid #e5e7eb` on all cards, inputs, sheets.
  Selected/accent edge may be `1px solid #FFC72C` on one element per screen
  max (e.g., the featured event card). No double borders.
- Radius (consistent, 6–12px; no pill-everywhere):
  - Cards, sheets, map, app frame: `rounded-xl` (12px), frame `rounded-2xl`.
  - Buttons, inputs, search, zoom controls: `rounded-lg` (8px).
  - Chips, tags, badges: `rounded-md` (6px).
  - Avatars / status dots / home indicator only: `rounded-full` (exception).
  - No `rounded-full` buttons/inputs/chips. No save/bookmark icon buttons.

## 5. Layout (left-aligned, readable measure, responsive shell)

- Shell: `body` centers the app (`flex justify-center`, ambient `#E9EAEC`
  backdrop). App is `w-full max-w-[480px] md:max-w-[560px]`,
  `h-[100dvh]` mobile and `md:h-[92dvh]` desktop with `dvh` fallback.
  Scroll regions need `min-h-0` / `min-w-0` to flex correctly at any height.
- Left-align by default. Headers, titles, forms, lists, footers are
  `text-left / items-start / justify-start`. Do not center large blocks.
  Centering is allowed only for: avatar rows, empty states (max 2 lines),
  the 28px home indicator, and the transient toast.
- Text-heavy blocks are capped at ~65 characters (`max-w-[65ch]`).
- Home is map-first: header → map (`flex-1 min-h-0`, the dominant block) →
  compact featured rail. No title block above the map. Search floats inside
  the map (`absolute top-4 inset-x-4`), navigation-only
  ("Where to? Halls, lots, shuttles" + Go arrow button).
- Events is list-first: header → sticky search subheader (`border-b`) →
  scrolling cards. No H1, no subtitle, no filter chips.
- Vertical order per screen: header → content → primary action in thumb
  zone (lower 45%) → quiet footer. One primary action per screen.
- Icons: 16–20px, 1.8px stroke, `currentColor` or `#6B7280`. No emoji as icons.
  No OS chrome (no fake time/signal/battery bars); use real top padding.

## 6. Screen inventory (as built — keep in sync)

- `login-screen` (visible initially): logo button (`h-16`) → home; H1
  university name + portal line; Login/Register segmented tabs; email +
  password fields (show/hide); gold LOGIN → home; "Make Account" → register;
  Duo MFA footer. No status bar.
- `register-screen`: back arrow + `Make account` H1 + `Registration` badge;
  Step 1 Credentials card (Name + password inputs); Step 2 Profile &
  Interests card (Year select, Major **text input**, interest pills +
  type-to-add row); FINISH → home.
- `home-screen`: header (menu → drawer, logo → home, avatar → account);
  hero map with floating navigation search, pins (Griffin Hall, Truist
  Arena, Student Union Plaza, Student Union card, Loch Norse, user dot),
  zoom/locate controls; compact featured snap rail → events.
- `nav-drawer`: overlay + slide-in panel; user block; Home / EVENTS (12 New)
  / MY Engagement; Campus resources; Sign Out → login.
- `events-screen`: header; sticky search subheader (no filters); cards with
  category tag only, title, venue line, date row + Register button;
  sticky `+ MAKE POST` (toast in prototype).
- `profile-screen` titled `Account`: avatar, name, email, class badge, Year
  / Major rows, Interests chips, single full-width Edit Profile. Header
  back arrow → home. No ID Card, no second back button.
- Routing: `navigateTo(screenId)` hides all `.app-screen` and shows target;
  `nav-drawer` is an overlay exception. Escape returns to last screen.

## 7. Tokens (Tailwind)

```js
colors: {
  nku: '#FFC72C',       // 10% accent: primary actions, registered state
  nkuDeep: '#EAB308',   // primary hover
  ink: '#111827',       // primary text / dark fills (never #000)
  body: '#374151',      // body copy
  muted: '#6B7280',     // secondary copy
  faint: '#9CA3AF',     // captions only
  line: '#e5e7eb',      // all borders
  canvas: '#F9FAFB',    // 60% background
  wash: '#F3F4F6',      // wells, unselected chips
}
boxShadow: {
  card: '0 12px 32px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)',
}
```

## 8. Component rules (apply everywhere)

- Logo button: `<button onclick="navigateTo('home-screen')">` wrapping
  `<img src="logo.avif" class="h-16|h-10 w-auto rounded-lg">`. Always home.
- Primary button: `h-14 px-8 rounded-lg bg-nku text-[#111827] font-bold
  text-[15px] shadow-card`. Hover `#EAB308`. No glow, no pill.
- Secondary button: `h-14 px-8 rounded-lg bg-[#111827] text-white font-semibold`.
- Register button (event cards): `text-[13px] font-bold rounded-md px-4 py-2`,
  default `bg-ink text-white`; registered `bg-nku text-ink` + `Registered ✓`.
  Toggles in place via `toggleRegister()`.
- Text button: `font-semibold underline underline-offset-2`, left-aligned.
- Input: `h-14 px-4 rounded-lg bg-white border border-line text-[15px]
  text-[#111827] leading-[1.6]`. Label above is micro uppercase `#374151`.
  Major on register is a text input (`placeholder="e.g. Cybersecurity"`).
- Floating map search: `absolute top-4 inset-x-4 h-14 bg-white border
  border-line rounded-lg px-4 shadow-card`, navigation placeholder + ink Go
  arrow button (`w-10 h-10 rounded-md`).
- Card: `bg-white border border-line rounded-xl p-6 shadow-card`.
  Large card: `p-8`. Compact rail card: `p-4`.
- Interest pill: `rounded-md px-3 py-2 text-[12px] font-semibold`, each with
  its own tint stored in `data-c` (amber/purple/blue/green + red/fuchsia
  overflow for custom). `toggleInterest()` swaps between the tint and the
  unselected `bg-wash` style — never a monochrome selected state.
- Custom interest add: `h-12` text input + ink `Add` button; Enter submits;
  names are trimmed, capitalized, deduped case-insensitively, colors cycle
  `interestPalette`; count + FINISH label update via existing hooks.
- Event card: `rounded-xl p-6`, category tag only in header row, title,
  venue line, `border-t` footer row with date left + Register right.
  No numbers, no save icons, no attending counts, no filters above.
- Chip (only where chips remain, e.g. auth tabs): `rounded-md px-3 py-2
  text-[12px] font-semibold`. Selected `bg-[#111827] text-white`,
  unselected `bg-wash text-body`.
- Avatar: circle with initials, `#111827` fill + white text, or tinted fill
  with `#111827` icon.

## Anti-slop checklist (must pass before shipping)

- [ ] No `#000000` / `text-black` / `bg-black` in code.
- [ ] No `rounded-full` except avatars/dots/indicator.
- [ ] No `shadow-2xl`, no gold glow, only `shadow-card`.
- [ ] No `text-center / items-center` on text blocks.
- [ ] Body copy has `leading-[1.5]` or `leading-[1.6]`.
- [ ] Cards are `p-6+` (rail cards `p-4`), buttons are `h-14 px-8`.
- [ ] Only `Inter` + system fonts. No emoji icons.
- [ ] Gold is ≤10%: actions + registered state + tiny accents only.
- [ ] No OS status bar, no meta-notes, no redundant screen H1s on Home/Events.
- [ ] No filter chips / event numbers / save buttons / attending counts on Events.
- [ ] Real `logo.avif` everywhere a logo appears, always linking home.
- [ ] Account screen: titled `Account`, no ID Card, no duplicate back button.
- [ ] Register: Major is a text input; interests are per-color + user-addable.
- [ ] Shell is responsive (`480px → 560px`, `100dvh → 92dvh`); map dominates Home.
