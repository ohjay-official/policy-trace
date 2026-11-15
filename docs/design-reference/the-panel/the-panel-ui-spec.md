# The Panel: complete UI/UX specification

The full design and interaction spec of The Panel (the-panel-eta.vercel.app), written so you can rebuild it in another project without looking at the original. Every value below is the one in production. Swap the content (names, stages, facts) for your new project and keep the system.

---

## 0. Concept in one paragraph

An editorial "judging paper" site. Off-white paper stock, near-black ink, tight display type and a faint ledger grid. The home page is a pinned, scroll-driven stage. A rounded **window** in the middle of the screen shows the *next* stage of the story, drawn dark and screen-locked behind it. The window tilts toward the mouse in fake 3D. Scrolling, or clicking the window, swells it until it swallows the screen, and the page commits to that stage: a giant condensed title, four fact rows, and a new window onto the stage after. A loading screen with a real-progress counter hands off by flying the logo into the header. Below the stage is calmer editorial content: a stack strip, a giant-word band with a seating chart, rule-line feature cards, an FAQ accordion and a closing call to action. Green appears only where something is scored, red only where points are lost.

### Hard rules (the anti-"AI-made" checklist)
- No purple gradients. No gradients as decoration at all, apart from the header fade.
- **No pill buttons.** Every pressable thing has square corners (border-radius 2px). The only rounded shape is the portal window, which is a picture, not a button style.
- No emoji icons, no custom cursor, no cursor-follower animations.
- No fake reviews, testimonials, user counts or metrics. Illustrations that look like data (a heat grid) carry no numbers and are labelled "Illustration only".
- No em dashes or en dashes anywhere in copy. Use commas, full stops or "to" ("1 to 10").
- No vague hero text. The headline says exactly what the product does for whom.
- Copy is plain, sentence case, active voice. Buttons name the action ("Score a project", not "Get started").
- Motion is tied to the product (the window, the scan) or to a user's action. No fade-up on every section. Scroll reveals run once, short and subtle.
- Every page respects `prefers-reduced-motion`.
- Launch checklist: favicon, privacy policy page, terms page, no "Made with AI" badge, custom domain (optional for hackathons).

---

## 1. Design tokens

### 1.1 Color (CSS custom properties on `:root`)
| Token | Value | Use |
|---|---|---|
| `--fg` | `#0d0c0b` | Ink: text, buttons, rules that matter |
| `--fg-soft` | `rgba(13,12,11,0.64)` | Secondary text |
| `--fg-faint` | `rgba(13,12,11,0.44)` | Tertiary text, captions, labels |
| `--shade` | `#f2f0ec` | Page paper (body background) |
| `--sheet` | `#f8f7f4` | Raised sheets, closed FAQ items |
| `--sheet-2` | `#ebe8e2` | Giant background word, code background |
| `--rule` | `rgba(13,12,11,0.14)` | Hairlines |
| `--rule-2` | `rgba(13,12,11,0.26)` | Stronger hairlines, field borders |
| `--btn` | `#0a0908` | Button fill (hover `#000`) |
| `--signal` | `#76b900` | Green: scored, done, positive |
| `--signal-ink` | `#3f6600` | Green that is readable as text on paper |
| `--signal-wash` | `rgba(118,185,0,0.16)` | Green tint fills |
| `--mark` | `#2a44c9` | Marking blue: in-progress state, tool calls |
| `--correct` | `#c0392b` | Red pen: errors, lost points |
| `--correct-wash` | `rgba(192,57,43,0.10)` | Red tint |

Fact-row values use a darker soft ink, `rgba(13,12,11,0.74)`, for readability.

Dark scene palette (inside the window only):
- Ink `#0d0c0b`, paper `#f2f0ec`, dim `rgba(242,240,236,0.62)`, rule `rgba(242,240,236,0.16)`.
- Bright green `#8fd60f`, red `#ff6b5c`, blue `#a9b8ff`.
- Grid lines `rgba(242,240,236,0.05)` every 48px.

Text selection: background `--fg`, text `--shade`.

### 1.2 Easing
- `--ease: cubic-bezier(0.22, 0.61, 0.36, 1)` for most transitions.
- `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)` for entrances.
- Entrance keyframes use `cubic-bezier(0.22,1,0.36,1)`. The title rise uses `cubic-bezier(0.16,1,0.3,1)`. The logo flight uses `cubic-bezier(0.16,1,0.3,1)`.
- JavaScript tweens use easeInOutCubic: `t<.5 ? 4t³ : 1 - (-2t+2)³/2`.
- Scroll ramps use smoothstep: `t²(3-2t)`.

### 1.3 Typography
Self-host every font (Fontsource npm packages), so the build never depends on Google's servers and visitors' browsers never contact Google:
- `@fontsource-variable/inter-tight`: everything (body, UI, headings).
- `@fontsource-variable/jetbrains-mono`: data, labels, URLs, numbers, step indexes.
- `@fontsource/bebas-neue`: only the giant stage titles and display numerals in scenes.

Stacks:
- Sans: `'Inter Tight Variable','Inter Tight','Helvetica Neue',Helvetica,Arial,sans-serif`
- Mono: `'JetBrains Mono Variable','JetBrains Mono',ui-monospace,Menlo,monospace`
- Display: `'Bebas Neue','Arial Narrow','DejaVu Sans Condensed',sans-serif`

Scale and treatment:
- `body`: 17px, line-height 1.55, letter-spacing -0.006em, weight 400, antialiased.
- `h1`: weight 400, clamp(38px, 6vw, 88px), line-height 0.98, letter-spacing -0.036em, `text-wrap: balance`.
- `h2`: clamp(30px, 4vw, 54px), line-height 1.02, letter-spacing -0.03em, balance.
- `h3`: 22px, weight 500, letter-spacing -0.02em, line-height 1.15.
- Small text 14px. Captions 13 to 14px in `--fg-faint`.
- Headings are big and light (400), never bold. Emphasis comes from size, not weight.
- Never accent one word of a headline in a different color or style.
- No ALL-CAPS eyebrow labels above headings. The only uppercase is the Bebas titles and the loader's "%".

### 1.4 Layout
- Content wrapper `.wrap`: max-width 1200px, centred, side padding `clamp(16px, 3.4vw, 44px)`.
- Section spacing: `padding-top: clamp(96px, 12vw, 160px)`.
- Section head: flex row, space-between, aligned to the bottom. h2 max 16ch on the left, a 16px soft sentence max 40ch on the right, 36px below. Wraps on narrow screens.
- Readable measure for prose: 64ch.
- Radii: buttons and fields 2px, small tiles 3px, sheets and cards 6px, portal window 64px (44px on phones).
- `body { overflow-x: clip }`. Nothing may scroll sideways at 320px. Every grid or flex child gets `min-width: 0`, and wide tables sit in `overflow-x: auto` boxes.

### 1.5 Texture
- **Grain:** an absolutely positioned layer, inset -50%, opacity 0.10, `mix-blend-mode: multiply`, pointer-events none. Background is an inline SVG: `feTurbulence type=fractalNoise baseFrequency=.85 numOctaves=3`, 140×140 tile, rect opacity .5. The `#` in `url(#n)` must be encoded as `%23n`.
- **Ledger grid:** on the stage canvas, ink at alpha 0.045, 1px lines every 48px, aligned so a line passes through the screen centre.

---

## 2. Global chrome

### 2.1 Header
- `position: sticky; top: 0; z-index: 40`.
- Background fades into the page: `linear-gradient(to bottom, rgba(242,240,236,.94) 0%, rgba(242,240,236,.8) 72%, rgba(242,240,236,0) 100%)`. No border, no blur.
- Inner padding: top `max(14px, env(safe-area-inset-top)+12px)`, bottom 14px. Flex, space-between, gap 12px.
- Left: brand = the 22px logo mark plus the name in 15px Inter Tight, letter-spacing -0.012em, gap 9px.
- Right nav: gap `clamp(14px,2.4vw,32px)`. Text links are 14.5px at opacity 0.88, going to 1 with an underline on hover or when current. Last item is the primary button "Score a project" (dark, square), with its text forced white via `-webkit-text-fill-color: #fff` so link colour never bleeds in on iOS Safari.
- At 720px and below, text links hide and only the button remains (38px tall, 16px padding, 13.5px). At 420px and below it is 36px tall, 14px padding, 13px.

### 2.2 Logo mark
- A 32×32 rounded square (rx 5) in `#0d0c0b` holding a 3×3 grid of 5.5px cells (rx 1) at a 7.25px pitch, starting at 6,6.
- Cells are `#5a5752`, except the centre cell (paper `#f2f0ec`) and the bottom-right cell (green `#76b900`). It reads as a rubric with one scored cell.
- The same drawing is the favicon (`app/icon.svg`).

### 2.3 Buttons
- Primary `.btn`: inline-flex centred, height 40px, padding 0 21px, radius 2px, background `#0a0908`, white text, Inter Tight 500 14.5px, letter-spacing -0.008em.
- Border `1px solid rgba(10,9,8,.12)` with an inner top highlight `0 1px 0 rgba(255,255,255,.1) inset`. No wrapping.
- Hover or focus: `translateY(-2px)` and background `#000`. Transition is transform 0.4s and background 0.3s with `--ease`.
- `.btn-lg`: 48px tall, padding 0 27px, 15px text. `.btn-small`: 34px, 0 14px, 13.5px.
- `.btn-quiet` (secondary): transparent, ink text, `--rule-2` border, no shadow, hover tint `rgba(13,12,11,.05)`.
- Disabled: opacity 0.45, cursor progress, no lift.

### 2.4 Links
- Ink colour, 1px underline in `--rule-2` with a 3px offset, turning ink on hover over 0.25s.

### 2.5 Focus
- `:focus-visible { outline: 2px solid var(--fg); outline-offset: 3px }`. Fields replace it with an ink border and a `0 0 0 3px rgba(13,12,11,.08)` ring.

### 2.6 Footer
- Top border `--rule`, margin-top 64px, padding 32px 0 (bottom respects the safe area). Text 13.5px in `--fg-faint`.
- Row 1: brand on the left; links on the right (Score a project, Method, Privacy policy, Terms and conditions, Source code) in `--fg-soft`, no underline, underline on hover, gap 22px.
- Row 2: "Built by [name] for [event], [year]. Open source under the MIT license."
- Row 3: the simulation and no-endorsement disclaimer.

---

## 3. Loading screen (first full page load only)

Markup comes first in `<body>`: a `#boot` overlay containing `#bootLogo` (the mark at 58px) and `#bootCount` (`<span id="bootPct">0</span><span class="pct">%</span>`). It is followed immediately by a plain inline `<script>`, so it runs before the framework hydrates.

A tiny script in `<head>` adds `.js` to `<html>`. The overlay only shows when `.js` is present, so no-JS visitors never get stuck.

**Styles**
- Overlay: fixed, inset 0, z-index 90, background `--shade`, `transition: background-color .9s`.
- Logo: fixed, centred (58×58, negative margins), `transition: transform 1.4s cubic-bezier(.16,1,.3,1)`.
- Counter: fixed, bottom-centre (`bottom: clamp(22px,3.1vh,28px)`).
  - The number is 64px, weight 100 (thin), letter-spacing -0.04em, tabular figures, min-width 2.2ch, right-aligned.
  - The "%" is 24px weight 300 with 6px bottom padding.

**Progress is real, not faked.** The target rises at real milestones and only ever goes up:
- 0.08 at start.
- 0.40 at DOMContentLoaded.
- 0.75 when `document.fonts.ready` resolves.
- 1.00 at `window.load`, or after a 6s safety timeout.

The displayed value lerps toward the target by 0.12 per frame, and is capped by elapsed time so the sequence takes at least about 1.4s and never jumps straight to 100.

**At 100%**
1. The counter gets `.is-leaving`: a 0.75s animation to `opacity:0; filter: blur(7px); translate(-50%,-34px)`.
2. The script measures the header brand mark's rect and the floating logo's rect, then sets the logo's transform to `translate(dx,dy) scale(markWidth/logoWidth)`, so it flies into the header slot over 1.4s.
3. The overlay gets `.is-leaving`: background fades to transparent and pointer-events are turned off.
4. After 1500ms: the overlay gets `.done` (display none), `<html>` gets `data-loaded="1"`, and `window.dispatchEvent(new Event('panel:ready'))` fires.

While `html.js:not([data-loaded])`, the real header mark is `opacity:0`, so there is never a doubled logo.

Reduced motion: no change needed beyond the global rules. The counter still completes.

---

## 4. Home stage: scroll-driven portal travel (the signature piece)

### 4.1 Structure
```
<section class="ph">                     tall scroll track: height 760vh, min-height 4400px,
                                         full-bleed (width 100vw; margin-left calc(50% - 50vw)),
                                         margin-top -76px so it slides under the sticky header
  <div class="ph-stage">                 position sticky, top 0, height 100vh then 100svh,
                                         min-height 560px, overflow hidden, bg --shade
    <canvas class="ph-canvas">           paper, grid and the portal window (DPR up to 2)
    <div class="grain">
    <i class="meter">                    2px ink hairline, top, scaleX(progress), opacity .55
    <nav class="ph-list">                stage index (buttons)
    <div class="ph-chrome">              everything that fades while the window swells
      <div class="ph-portal-wrap">
        <div class="ph-heading">Next: [02] Winners</div>
        <button class="ph-portal">        invisible hit area; its rect positions the canvas window
        <p class="ph-hint">Scroll, or click the window</p>   ("tap" on touch screens)
      <div class="ph-content">           giant title + facts (or intro block)
```

### 4.2 Stages (content model)
An array of stages, each `{ key, scene, title, facts: [[label, value] x4] }`. The first stage is the intro: `{ title: 'Panel', intro: true }`, which shows the headline block instead of facts. The Panel used:

0. **Start**: big title "PANEL". Intro block:
   - h1 "See your score before the judges do."
   - Sub "Paste a hackathon link and your project. The Panel studies the judges and past winners, then scores you on the event's real criteria."
   - Buttons [Score a project] (primary) and [See how it works] (quiet; it scrolls to stage 1).
1. **Event**: Deadline / Tracks / Criteria / Prizes.
2. **Winners**: Studied / MediSimplifier / Injester / Pattern.
3. **Judges**: On the panel / From / Research / Scoring.
4. **Score**: Scale / Checks / Models / Cost.
5. **Fixes**: Moderator / Prediction / Ranking / Export.

Next-heading text: `Next:` on the left, and on the right `[NN]` (2-digit, in brackets) plus the next stage title in **bold 17px**. On the last stage the next title is "Your project", and clicking the window navigates to the tool page.

### 4.3 Scroll math
- `progress` (0..1) = −sectionTop / (sectionHeight − viewportHeight), clamped.
- **Eased catch-up:** each frame, `at += (progress - at) * 0.08`, snapping when the gap is under 0.0004. This turns a jumpy scrub into a smooth glide. (0.08 is the calmer value. The original 0.115 felt about 30% too fast.)
- `UNITS = number of stages` (6). `f = at * UNITS`, `seg = min(floor(f), last)`, `frac = f - seg`.
- For each segment before the last:
  - Expansion `e = smoothstep(clamp((frac - 0.45)/0.55))`, so the first 45% of each segment is reading time and the rest swells the window.
  - Re-open `reopen = seg>0 ? smoothstep(clamp(frac/0.20)) : 1`, so after committing, the new window grows from nothing.
- Last segment: `e = 0`, with re-open as above.
- `maskScale = min(introScale, reopen)`, where `introScale` is a time-based tween from 0 to 1 over 1365ms (easeInOutCubic) that starts on `panel:ready`.
- When `seg` changes, set the current stage, which re-renders title, facts and heading (keyed so their entrance animations replay).
- Chrome fade: `.ph-chrome` opacity = `1 - smoothstep(clamp(e/0.3))`, with visibility hidden below 0.02.
- Meter: `scaleX(at)`.
- Jump to stage i (side index or "See how it works"): `scrollTo({ top: sectionTop + span*((i + (i ? 0.22 : 0))/UNITS), behavior: 'smooth' })`. The 0.22 lands just after the re-open finishes.
- Clicking the window: go to stage current+1, or navigate to the tool on the last stage.

### 4.4 Canvas drawing (every animation frame)
1. Reset the transform to DPR and clear.
2. **Paper:** fill `rgba(242,240,236,1)`, then the ledger grid (ink alpha 0.045, 48px, centre-aligned). Nothing else is ever drawn behind the text. (An earlier version ghosted the current scene behind the page under a 90% wash. It hurt readability and was removed.)
3. Get the portal button's rect relative to the stage. Centre `rc`, size `rw × rh`.
4. Interpolate toward full screen by `e`:
   - `cx = rcx + (W/2 - rcx)*e`, and the same for `cy`.
   - `w = rw + (W - rw)*e`, `h = rh + (H - rh)*e`.
   - `s = e ? 1 : maskScale`, then `w *= s`, `h *= s`.
   - Corner radius `R*(1-e)*s` with R = 64, or 44 under 640px wide.
   - Tilt `rotX*(1-e)`, `rotY*(1-e)`.
5. Build the window path (see 4.5), then:
   - While e < 0.6, fill the path once in ink with `shadowColor rgba(13,12,11, .35*(1-e)*s)`, `shadowBlur 60`, `shadowOffsetY 30`, for a floating-card depth.
   - `clip()`, then draw the **next** stage's pre-rendered scene canvas full-screen at 0,0,W,H. It is screen-locked: the window moves over a stationary picture.
   - Still inside the clip, draw paper and grid at alpha `smoothstep(clamp((e-0.55)/0.45))`, so at full expansion the window is identical to the page and committing is invisible.

### 4.5 Window shape and fake 3D
- **Rounded-rect points:** for each corner, walk the arc in 10 steps (44 points total) of a w×h rect with radius r, clamped to w/2 and h/2, centred on the origin.
  - Corner arcs: `[w/2-r, -h/2+r, -π/2→0]`, `[w/2-r, h/2-r, 0→π/2]`, `[-w/2+r, h/2-r, π/2→π]`, `[-w/2+r, -h/2+r, π→1.5π]`.
- **Projection** (focal 850): with `ax = rx·π/180` and `ay = ry·π/180`:
  - `xx = x·cos(ay)`, `yy = y·cos(ax)`, `z = x·sin(ay) − y·sin(ax)`, `p = 850/(850+z)`.
  - Screen point = `(cx + xx·p, cy + yy·p)`.
- **Pointer tilt** (mouse only, never touch, off with reduced motion):
  - Targets: `rotY = (clientX/innerWidth − .5) × 37.4`, `rotX = (clientY/innerHeight − .5) × −33`.
  - Each frame, with dt clamped to 40ms: `rot += (target − rot) × min(1, dt × 0.0063)`.
  - On pointerleave, targets go to 0.

### 4.6 Scenes (what the window shows)
Each scene is pre-rendered once into an offscreen canvas the size of the stage (DPR up to 2). It is rebuilt after `document.fonts.ready` and on resize (debounced 120ms).

- Background: ink fill plus a dark grid (paper at alpha 0.05, 48px).
- **Readability rule:** each scene draws one compact, complete block centred exactly where the window sits (the portal button's centre), scaled to fit inside it with room for the corners.
  - Design space is 236 × 256.
  - Scale `k = min(windowW × 0.84 / 236, windowH × 0.82 / 256, 1.6)`.
  - Nothing important sits outside that block, so nothing is ever cut by the corners.
- Display text inside a scene shrinks itself to fit: measure, then `size = min(base, base × (236 − 16)/measuredWidth)`.
- Every scene has a mono 12px dim label at the top (y −108) describing it.

The Panel's scenes (design-space coordinates, centred on 0,0):
- **yours:** "YOUR" and "PROJECT" in Bebas, up to 74px, centred. Below them a 5×2 grid of hatched empty cells (40×28, 5px gap). The last column has a 1.5px paper outline (the "overall" column). Label: "An empty scorecard".
- **event:** label "The judging criteria", then four rows separated by hairlines. Each row is a green mono "01" to "04" plus the criterion in 600 16px Inter Tight, wrapped to 196px.
- **winners:** label "A past winner at a Nebius event", then "$320" in green Bebas up to 104px, "MediSimplifier" 700 18px, a two-line dim 14px caption, and the line "It published its full bill." in 600 14px.
- **judges:** label "6 of the 23 judges", then a 2×3 grid of tiles (112×58, gap 8). Each tile has a faint fill, a hairline border, a 16×3 colour stripe by company (Nebius paper, NVIDIA green, Tavily blue), the name in 600 13px and the company in dim 12px.
- **score:** label "Judges by criterion", then column heads Tech / Design / Impact / Idea / All (dim 11px). Below is a 5×5 heat grid (40×28, gap 6) with fills `rgba(118,185,0, .15 + t×.8)`; the last column is outlined in paper. **No numbers.** Footer label "Illustration only".
- **fixes:** label "A ranked fix list", then three rows separated by hairlines. Each row has a red Bebas 34px number and the fix in 600 15px, wrapped to 202px.

### 4.7 Chrome layout (zones that never collide)
**Side index `.ph-list`**
- Absolute, left `clamp(18px,3.4vw,44px)`, top 44%, translateY(−50%).
- Stacked buttons, 32px min height, 15px `--fg-soft`, hover ink.
- The active item is ink, weight 600, with a 9×9 ink square before it (radius 1px), which pops in with scale 0 to 1 over 0.65s.

**Window wrap**
- Absolute, left 50%, top 42%, `translate(-50%,-50%)`, width `min(300px, 24vw)`.
- Button aspect ratio 300/330, transparent, radius 64px. Its focus ring is a 2px ink outline offset 6px.
- Heading: flex space-between, 15px soft, strong 17px 600 ink, 12px below.
- Hint: 13px soft, centred, 14px above. It reads "Scroll, or click the window", switching to "tap" under `@media (hover:none)`.

**Bottom content `.ph-content`**
- Absolute: left and right `clamp(18px,3.4vw,44px)`, bottom `clamp(20px,3.4vh,32px)`.
- Flex, space-between, aligned to the bottom, gap 40px.

**Title `.ph-title`**
- Bebas, uppercase, no wrapping, `clamp(96px,15vw,240px)`, line-height 0.76, margin-bottom −0.05em.
- **Auto-fit:** after render, fonts-ready and resize, the script compares the title's `scrollWidth` with the room it has (container width minus the side block and 40px, or full width when stacked), and scales the font size down by `room/need × 0.98` if it overflows.

**Facts `.ph-facts` (a `<dl>`)**
- Width `min(430px,34vw)`, 15px, line-height 1.45.
- Each row is a grid of 124px + 1fr with a 16px gap and 10px vertical padding, separated by `--rule-2` hairlines (none after the last).
- `dt` is 600 ink. `dd` is `rgba(13,12,11,.74)`.

**Intro block `.ph-intro`**
- Width `min(420px,34vw)`.
- h1 is `clamp(28px,2.7vw,42px)`, weight 500, letter-spacing −0.035em.
- Sub is 16px.
- Actions are 22px below, gap 10px.

### 4.8 Entrances (replay on every stage change)
These run once `.ph-stage.is-ready` is set (on `panel:ready`). The values are already about 30% slower than the first draft.
- Side index: `reveal-side` 1.17s, delay 0.85s, from opacity 0, blur 8px, translate(−20px,−50%).
- Heading and hint: `blur-rise` 1.1s, delay 0.45s, from opacity 0, blur 7px, translateY(18px).
- Title: `title-rise` 1.37s, delay 0.26s, from opacity 0, blur 12px, translateY(42px).
- Facts: `blur-rise` 0.94s, delays 0.59s + i × 0.16s.
- Intro children: `blur-rise` 0.94s, delays 0.59s, 0.75s and 0.91s.

### 4.9 Responsive
- **Height ≤ 760px and width > 640px:**
  - Window top 40%, width `min(250px,22vw)`.
  - Title `clamp(88px,12vw,180px)`.
  - Fact padding 7px.
  - Intro sub hidden.
- **641 to 1100px:** window `min(260px,26vw)`; side blocks `min(380px,40vw)`.
- **641 to 900px:**
  - Side index hidden.
  - Window top 36%, width `min(320px,40vw)`.
  - Content stacks (column, gap 18px), title margin 0, side blocks full width.
  - Title `clamp(88px,16vw,150px)`.
- **≤ 640px:**
  - Window top 33%, width `min(240px,62vw)`, radius 44px.
  - Heading 13/15px, 8px gap. Hint 12px.
  - Content is `display:block` at 16px insets.
  - Title `clamp(76px,24vw,120px)` with 14px below.
  - Facts 14px, rows 112px + 1fr, gap 10, padding 7.
  - Intro h1 26px, sub hidden, buttons 44px and flexing to fill.
- **≤ 640px and height ≤ 760px:**
  - Only the first two facts show.
  - Window `min(200px,54vw)`, top 31%.
  - Title `clamp(68px,20vw,96px)`.
- **QA:** check every stage at 1440×900, 1280×800, 1280×680, 820×1180, 390×844 and 375×667. The window plus its heading and hint must not overlap the title, facts, intro, index or header, and nothing may extend past the right edge.

### 4.10 Reduced motion
No tilt, no entrance animations (everything shows at full opacity), and no transitions on buttons or matrix cells. The scroll stage still works, because the user drives it.

---

## 5. Sections below the stage (home)

### 5.1 Stack strip `.runs-on`
- Margin-top `clamp(48px,6vw,80px)`, top and bottom `--rule` borders.
- Three cells, each a bold-ish 500 19px name with a 14px faint line underneath:
  - "NVIDIA Nemotron / The models that read, judge and moderate"
  - "Nebius Token Factory / Where those models run"
  - "Tavily / Live web pages and search"
- At 760px and up: three columns with vertical dividers and 24×26px padding (the first cell has no left padding). Below that: stacked with dividers between.
- It reveals once on scroll.

### 5.2 Giant-word band with seating chart
- A huge centred word "PANEL": 500 weight, `clamp(88px,21vw,300px)`, line-height 0.8, letter-spacing −0.07em, colour `--sheet-2`, not selectable.
- Over it, a sheet (max 900px, pulled up by −6vw, or −84px at 1400px and above), with:
  - A section head "Who is judging this hackathon" and a right-side note.
  - A grid of every judge. Tiles are auto-fill with min 124px and an 8px gap, a 1px rule border, radius 3, 10/11px padding, paper background. Each has an 18×3 company colour stripe, the name in 13.5px 500, and "Title, Company" in 12px faint.
  - A legend with counts per company (10px squares).
- A caption sits below: "Source: the judges list on [url]. Profiles in a run are simulations…".
- **Motion:**
  - When 20% in view, the seats go from opacity 0.15 / translateY(6px) to full, staggered 40ms each.
  - The sheet drifts with a gentle parallax: translateY of `(0.5 − p) × 0.16 × sheetHeight × 0.5`, where p is the band's progress through the viewport, run through rAF.

### 5.3 Feature row (three "cards" made of rules, not boxes)
- A section head "What the rules page won't tell you".
- Three columns with a 1px ink top border and vertical `--rule` dividers at 900px and up.
- Each has a mono 12.5px faint tag ("Judges", "Past winners", "Fix list"), an h3 at 26px, and a soft paragraph max 36ch.
- **Hover:** a 1px green line wipes across the top edge (scaleX 0 to 1 from the left, 0.5s).
- The cards stagger in at 90ms each, starting 120ms after the section reveals.
- An aside sits below in 15px faint, with a link to the method page.

### 5.4 FAQ "Questions people ask"
- Section head on the left. On the right: "Still unsure? Read the method or open an issue on GitHub."
- A list (max 880px, gap 10px) of items.
  - Each item: 1px `--rule` border, radius 6px, background `--sheet`. Hover border goes to `--rule-2`. An open item gets a `--rule-2` border and a white background.
  - Question: an `<h3>` holding a full-width `<button>` (flex, space-between, padding 20/22px, 600 17px Inter Tight, letter-spacing −0.015em) with `aria-expanded` and `aria-controls`.
  - Icon: a 14px plus drawn from two 2px bars. Open rotates the vertical bar to 0 (it becomes a minus) over 0.35s, and the bars turn `--signal-ink`.
  - Answer region (`role="region"`, `aria-labelledby`): animated with `grid-template-rows: 0fr → 1fr` over 0.4s. The inner wrapper is `overflow:hidden`. The paragraph is 16px, line-height 1.6, `rgba(13,12,11,.72)`, max 70ch, padding 0 22px 22px, and fades and slides in (opacity 0 / −4px to 1 / 0).
- The first two items start open. Multiple items can be open at once.
- At 640px and below: padding 17/16px, question 16px, answer 15px.
- Content rule: every answer must match what the product actually does. No accuracy or cost figures that haven't been measured.

### 5.5 Closing call to action `.cta-band`
- Margin-top `clamp(110px,14vw,180px)`, padding `clamp(40px,6vw,80px) 0`, 1px ink top border.
- Two columns (1fr auto) at 860px and up, aligned to the bottom.
- h2 "Your deadline won't move. Your score still can." at `clamp(36px,5.4vw,76px)`, max 14ch.
- A soft line under it, and a large primary button on the right.

### 5.6 Scroll reveals (all sections above)
- `.js .reveal` starts at opacity 0 / translateY(22px), and goes to `.in` over 0.8s `--ease`.
- It triggers once at 15% visibility via IntersectionObserver, then disconnects.
- Without JS, everything is visible.

---

## 6. Other pages

### 6.1 Page header (Method, Privacy, Terms, Tool)
- Padding top `clamp(48px,7vw,96px)`.
- h1 `clamp(40px,6vw,84px)`.
- Intro paragraph 19px soft, max 52ch.
- Legal pages show "Last updated [date]" in mono 13px faint.

### 6.2 Method page
- Two-column doc layout at 1020px and up (220px + 1fr, gap 72px).
- Left: a sticky "On this page" table of contents (top 90px). It has a 1px rule on the left, 14px faint links, and on hover the link turns ink with an ink left-border segment.
- Headings have ids, with `scroll-margin-top: 90px`.
- Prose is 64ch, soft colour, strong text in ink, h2 at `clamp(26px,2.8vw,36px)` with 64px above.
- Includes a data table of the models (tier / model ID in code / job / price).

### 6.3 Tool page (`/panel`)
- **Notice blocks:** a 2px left border, a light tint and 15px text. The warning variant uses red, for example "Sample mode…".
- **Form sheet:**
  - Labels 500 15px.
  - Inputs: white background, `--rule-2` border, radius 2, 12/13px padding, 16px text. Placeholder at 36% ink. Focus gives an ink border and a soft ring.
  - Two-column rows at 760px and up.
  - Help text 14px faint.
  - Checkbox `accent-color` ink.
  - Actions: a primary button ("Score my project", which reads "Scoring…" while running) and a quiet button ("Fill in [example]").
- **Run steps:**
  - A numbered list with `01`-style mono counters.
  - Each step shows a state word in mono 13px: Waiting (faint), Working (blue, pulsing at 1.1s), or Done (green ink).
  - The step text follows after a colon.
- **Event brief:** a definition list (120px + 1fr). Criteria appear as small square-bordered tags.
- **Scorecard matrix** (judges as rows, criteria as columns, plus Overall):
  - Table with `border-spacing: 4px`. Cells are 54px tall, mono 500 22px, with a 1px rule border.
  - Empty cells are hatched (`repeating-linear-gradient(135deg, #efece6 0 6px, #e7e3dc 6px 7px)`).
  - Filled cells blend from paper `rgb(235,232,226)` toward green `rgb(118,185,0)` by `t = 0.1 + score/10 × 0.9`, with ink text, transitioning over 0.5s.
  - The Overall column has an ink border.
  - The reason shows in the cell's `title`.
- **Past winners table, judge notes, verdict, disagreement transcript, fix table and cost receipt:**
  - Tables have 1px rules, an ink header underline, mono right-aligned numbers, and a row hover tint.
  - **Judge notes:** two columns (260px + 1fr). On the left the name, role and an overall score in mono 32px. On the right the profile, a "take" in 21px, a Likes / Worried by / Change definition list, any missing requirements in red, and numbered source links.
  - **Verdict:** a big mono 96px score with a faint "/100", then the verdict text at `clamp(20px,1.8vw,26px)`. In sample mode the big number is replaced by the word "Sample".
  - **Transcript:** rows of 190px speaker + 1fr line, with the moderator in bold ink.
  - **Cost receipt:** each model with its tier, job and code ID, calls, tokens in/out, time and cost, then a total row with an ink top rule, and a note on the saving from routing versus using the top tier for everything.

---

## 7. Accessibility checklist
- A skip link ("Skip to content") comes first, visually hidden.
- Every interactive element is a real `<button>` or `<a>`, with a visible ink focus ring.
- The canvas and all decorative layers are `aria-hidden`. Every piece of information in the stage also exists as DOM text: title, facts and "Next".
- Stage index buttons use `aria-current="step"`. The window button has an aria-label of "Go to [Next]" or "Score your project".
- The FAQ uses `aria-expanded`, `aria-controls` and `role=region`.
- Results update in an `aria-live="polite"` region.
- Touch targets are at least 36px tall. Safe-area insets are respected in the header, footer and stage.
- Text contrast: body ink on paper, secondary text at 64 to 74% ink, never below 44% for anything meant to be read.

---

## 8. Performance notes
- Scenes are rendered once to offscreen canvases. Each frame is two `drawImage` calls plus a short path.
- DPR is capped at 2.
- The rAF loop runs while the page is open. Scroll and resize listeners are passive and only update a target number.
- No animation libraries. Everything is CSS plus small hooks: IntersectionObserver, requestAnimationFrame and a canvas.
- Fonts are bundled, so there are no external font requests.

---

## 9. Porting to a new project (what to change)
1. Replace the `STATES` array: stage names, four facts each, and which scene each one shows.
2. Write one focus-block drawing per scene in the 236 × 256 design space. Keep each to one complete idea and a label.
3. Recolour the accents if the sponsor isn't NVIDIA. Keep one "positive" colour, one "problem" colour and one "in progress" colour.
4. Replace the judges band with whatever the "people" or "inputs" of the new project are, using real data with a source caption.
5. Rewrite the FAQ from real questions, and keep every answer true.
6. Re-run the six-size overlap check from section 4.9.
