# The Hardstock design language

The full specification. `design/*.json` holds the same content in machine-readable form;
this file explains the reasoning, which is the part that survives when you change stacks.

---

## 1. The three layers

Reusing a design language means knowing which parts are load-bearing and which are paint.
Hardstock splits into three layers, and only the middle one is meant to move.

**Layer 0, the grammar. Never changes.**

- Every grouped or interactive element is enclosed by a 2px ink border.
- Every raised element casts a zero-blur offset shadow in ink.
- Every corner is square.
- Type is a three-family system: a geometric display face, a mono face for metadata, a neutral body face.
- Depth is displacement. Motion is displacement. Nothing blurs, nothing scales, nothing springs.
- Text on a colored fill is always the ink color.

Change any of these and you are no longer making a Hardstock surface. You are making
something else, probably the same thing everyone else is making.

**Layer 1, the skin. Swap freely.**

Three variables: `canvas`, `ink`, `accent`, plus the two surface fills derived from canvas.
`design/themes.json` ships seven tested combinations and the recipe for deriving more.
This is where a product gets its personality without leaving the language.

Layer 0 is also medium-independent. It is stated here in CSS terms because that is where
most of it gets used, but the grammar predates screens and returns to paper without
translation. What changes across media is the implementation, not the language. See
`references/print.md`.

**Layer 2, the composition. Choose per page.**

Which block archetypes appear, in what order, how often. `design/blocks.json` is the
vocabulary. Most bad generated pages fail here rather than at the token level: correct
colors, correct borders, and then twelve identical feature tiles stacked down the page.

---

## 2. Why it looks like this

The style is neo-brutalism, descended from architectural brutalism: exposed structure,
no ornament, function stated plainly. On the web it shows up as hard borders, offset
shadows, square corners, saturated accents, and a refusal of the frosted-glass gradient
that most product UI has converged on.

The mainstream alternative communicates lightness: soft shadows, generous radii, translucency,
elements that seem to hover. Hardstock communicates weight. Things sit on the page. They have
edges. They cast a shadow the way a sticker or a stamped card does.

That matters when the interface is about work rather than about a marketing impression, and
it matters especially for products built around AI agents, where the design problem is convincing
someone that a software teammate has presence. A soft floating card says "widget." A bordered
block with a hard shadow says "object on a desk."

Adopt it when you want a product to feel made rather than assembled. Skip it when the
context calls for restraint or invisibility: dense financial terminals, medical tooling, or
anything that has to disappear behind its content.

---

## 3. Color

One dark, one canvas, one accent, plus a categorical set that never carries brand meaning.

| Role | Default | Rule |
| --- | --- | --- |
| `ink` | `#1c1915` | Text, every border, every shadow, focus ring, scrollbar. Warm near-black, never `#000`. |
| `canvas` | `#faf5e8` | Page background. Warm cream. |
| `surface.raised` | `#f4ecd8` | Panels and cards on canvas. |
| `surface.high` | `#fdf9ef` | Second elevation. |
| `surface.plain` | `#ffffff` | Inputs, secondary buttons, table bodies. |
| `muted` | `#56606b` | Secondary text and placeholders only. |
| `accent` | `#ffc72c` | Primary actions and highlights. Exactly one per page. |

Categorical: pink `#ff8db4`, lavender `#b3a4ec`, cyan `#45c2ea`, orange `#ff9b5c`,
lime `#9fd06a`, coral `#f36a5a`, sage `#92c4a0`. These identify agents, categories, and
status. They are never a second brand color.

Semantic mapping: success is lime, danger is pink, info is cyan, warning is yellow.
The accent is brand, not meaning. If your accent happens to be yellow, warnings still read
as warnings because they carry a word, not because of the fill.

Two hard rules that do most of the work:

- **Ink on every fill.** Text on yellow, pink, cyan or lime is `#1c1915`, in light and dark
  themes both. Grey on a saturated fill fails contrast and looks washed out.
- **One dark.** Borders, shadows, body text, focus rings and scrollbars all use the same ink.
  The system reads as coherent because there is nothing to be incoherent about.

Contrast in the default theme, measured by `tools/contrast.mjs` rather than estimated: ink
on canvas is 18.04:1, ink on the yellow accent is 13.19:1, muted on canvas is 5.73:1. That
last number is why muted is restricted to secondary text. Run the tool rather than trusting
these figures; if they ever disagree, the tool is right.

---

## 4. Type

- **Display**, Space Grotesk. Headings, buttons, names, large numbers. Weights 400 to 700.
- **Mono**, Space Mono. Badges, timestamps, status, eyebrows, labels, table headers,
  anything that reads as machine-adjacent. Weights 400 and 700.
- **Body**, the system sans stack. Deliberately anonymous. The pair above carries the voice.

The micro-label is the signature move: 10px, weight 700, uppercase, mono, line-height 1.
It appears in every badge, pill, eyebrow and table header, and it is what stops the page
from reading as a generic sans-serif template.

Scale, base 16px: 12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72. Headings tighten as they
grow (30px at 1.2, 48px and up at 1.0). Body copy sits at 1.5.

Both faces load from Google Fonts in one request, or self-host the woff2 files for a build
with zero external dependencies.

---

## 5. Structure

**Radius: 0.** Everywhere. Avatars, toggles, radio inputs, pills, modals, images. Include
`*,::before,::after{border-radius:0}` in the base layer so a component library cannot leak
its defaults in.

**Borders:** 2px solid ink is the workhorse. 1px for table row separators and internal
rules, 4px for the rare emphatic divide.

**Shadows:** offset only, blur always 0.

| Token | Value | Use |
| --- | --- | --- |
| `xs` | `1px 1px 0` | Pressed state, tooltips, toggle knobs |
| `sm` | `2px 2px 0` | Cards, buttons, badges, avatars |
| `md` | `4px 4px 0` | Hover lift, toasts |
| `lg` | `6px 6px 0` | Hero blocks, modals |

**Spacing:** 4px base, scale 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Card padding 24.
Gap between page blocks 48 to 64. Content converges at 64rem.

**Layering:** flat. Canvas holds bordered blocks; blocks hold content. A card inside a card
is a bug. When a block needs internal division, draw a 2px rule.

---

## 6. Motion

Duration 0.15s, hover 0.1s, easing `cubic-bezier(0.4, 0, 0.2, 1)`.

- **Press:** `translate(2px, 2px)` while the shadow shrinks to `xs`, then flat on `:active`.
  The element visibly moves toward the page. This is the one interaction everybody notices.
- **Lift:** `translate(-2px, -2px)` while the shadow grows to `md`. For linked cards.
- **Float:** `translateY(-6px)` over 4 seconds, decorative avatars only.

Forbidden: bounce, spring, overshoot easing, scale above 1, blur or backdrop-filter
transitions, fade-and-zoom entrances. A `prefers-reduced-motion` block turns all of it off.

---

## 7. Icons

Monoline SVG. `stroke: currentColor`, stroke width 1.5 to 2, round caps and joins, no fill,
24px grid. Lucide and Feather drop in directly. Frame an icon in a 2px ink square when it
needs a container.

No emoji. They are round and multicolor and they undo the system on contact. Geometric
characters (arrows, a multiplication sign) are fine as text.

---

## 8. Components

`design/components.json` is the contract table; `dist/hardstock.css` is the implementation.
The shared chrome is: 2px ink border, radius 0, `shadow-sm`, ink text on any fill.

Component notes worth stating in prose:

- **Buttons** press in, they do not glow. Primary is the accent fill, secondary is plain white.
- **Badges always carry a word.** A lime pill on its own is not a status; `ONLINE` on a lime
  pill is. This is a colorblindness requirement, not a style preference.
- **Avatars are squares.** Cropped square, one categorical fill, optional slight rotation in
  decorative contexts. A circular avatar is the single most common way this language gets
  diluted.
- **Toggles have rectangular tracks and square knobs.** A pill toggle imports the entire
  visual language it came from.
- **Tables are hard-lined grids**, not stacks of rounded rows.
- **Modals do not blur their backdrop.** The overlay is translucent ink. Escape closes,
  clicking outside closes, focus stays inside.
- **Loading is a bordered skeleton block**, not a spinner. A spinner is a circle.
- **Empty states are never blank.** A blank region reads as a bug to users, every time.

---

## 9. Layout and blocks

Components make elements. Blocks make pages. `design/blocks.json` lists the archetypes:
hero, workspace, feed, pricing, stat strip, feature grid, comparison table, steps, FAQ,
logo wall, CTA, empty.

Composition rules:

1. Mix three to four archetypes on a long page.
2. Repeat none more than twice.
3. Separate blocks with a hard border or 48 to 64px of canvas, never by nesting.
4. The feature grid is allowed once. It is the block that makes pages look auto-generated.

---

## 10. Responsive

Hard-bordered multi-column layouts fail badly on narrow screens: fixed columns compress into
vertical slivers, badges wrap into stacked characters, side panels overlap the main region.

- Give the main column `minmax(380px, 1fr)` and let the page scroll horizontally rather than
  crushing it.
- Below 1100px narrow the sidebar. Below 900px collapse secondary columns into a toggle.
  On mobile the sidebar becomes a drawer.
- Badges get `white-space: nowrap` and `flex-shrink: 0`. Search fields get
  `flex: 0 1 200px; min-width: 0`.
- Card grids use `repeat(auto-fill, minmax(260px, 1fr))`.
- Scrolling regions inside a flex column need `flex: 1; min-height: 0; overflow: auto`,
  otherwise the hard border stops where the content stops and the block looks broken.

---

## 11. Accessibility

High contrast makes this language accessible almost by default, which is exactly why the
remaining gaps get skipped. All of these are required:

- `prefers-reduced-motion` disables float, pulse and every transform transition.
- Status is never color alone. Every colored state carries a word or a monoline icon.
- Contrast meets WCAG AA. Muted text is restricted to secondary information.
- `:focus-visible` draws a 2px ink outline at 2px offset, globally, never removed.
- Interactive elements are real `button` and `a` elements. Overlays close on Escape and
  trap focus.
- Icon buttons get `aria-label`; decorative icons get `aria-hidden`; fields get real labels.

---

## 12. Print

The grammar did not start on screens, and it goes back to paper without translation. What
does not travel is the implementation: every interaction state, the whole motion group,
breakpoints, focus rings, and every absolute pixel value.

Measurements are re-derived from ratios rather than converted. The web spec is a 2px rule
against 16px body, so the rule is body divided by 8, the small shadow offset equals the rule
weight, the spacing base is body divided by 4, and block padding is 1.5 times body. Set a
body size for the piece and the rest follows.

Two things become true in print that are not true on screen. The canvas token stops being an
ink and becomes a paper choice, which is both cheaper and more correct for a language named
after card stock. And the one-accent rule turns into a two-color job, black plus one spot,
which costs less than four-color and reaches saturations CMYK cannot. The discipline that
keeps the screen version clean is the same discipline that keeps the printed version cheap.

`references/print.md` has the full layer: unit derivation, process minimums, ink and paper,
trim, composition archetypes, print-specific anti-patterns and a handoff checklist.

## 13. Lineage

Hardstock is neo-brutalist web design, which takes its name and its ethics from
architectural brutalism: exposed structure, no ornament, function stated plainly. The idiom
is public and long predates this repository, and plenty of people have built in it.

What is particular here is not the style. It is the decision to write the style down all the
way: to fix exact values instead of ranges, to state which parts may move and which may not,
to give the rules to a machine that can check them, and to keep going until the same brief
produces the same result twice. Every value in this repository was set deliberately and
tested by building with it.

The documentation, stylesheets, tooling and examples are original work, MIT licensed.
