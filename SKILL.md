---
name: hardstock-design
description: Design or restyle anything in the Hardstock design language, a neo-brutalist system built on hard ink rules, zero-blur offset shadows, square corners everywhere, a warm paper canvas, the Space Grotesk and Space Mono pairing, and exactly one saturated accent. Covers both screen and print. On screen use it for agent workspaces, multi-agent consoles, chat and channel interfaces, developer tools, dashboards, and marketing or product pages that should feel built and physical rather than like another rounded-corner SaaS template. In print use it for posters, editorial spreads, cards and invitations, spec sheets, covers, labels, menus and programmes. Ships machine-readable tokens, seven tested themes, component contracts, block archetypes for both media, a drop-in stylesheet for vanilla CSS or Tailwind v4, a physical-unit derivation and ink guide for print, and a zero-dependency validator that mechanically enforces the machine-checkable subset of the screen rules.
---

# Hardstock

A design language, packaged so an agent can apply it the same way twice.

Everything visual comes from `design/*.json` and `dist/hardstock.css`. Do not invent values.
When you need a decision this file does not cover, read the reference file it points to
rather than guessing.

**Decide the medium first.** Screen and print share the grammar and the palette, and share
nothing below that. If the work is printed, read `references/print.md` before anything else:
pixel values, interaction states, motion, breakpoints and the validator do not apply, and
measurements are re-derived from ratios rather than converted.

## The one-paragraph version

Warm cream canvas. One warm near-black ink that draws every border, every shadow, every
piece of text. Every grouped or interactive element enclosed in a 2px ink border, casting a
zero-blur shadow offset down and right. Square corners everywhere with no exceptions.
Space Grotesk for headings and buttons, Space Mono for badges, timestamps and labels, a
neutral sans for body copy. Exactly one saturated accent per page. Motion is displacement,
never blur, scale or spring.

## Files, in the order you need them

| File | What it holds |
| --- | --- |
| `design/tokens.json` | Every color, type, space, border, shadow and motion value |
| `design/themes.json` | Seven tested themes plus the recipe for deriving a new one |
| `design/components.json` | Component contracts: anatomy, chrome, all five states |
| `design/blocks.json` | Page-level archetypes, page recipes, and `printArchetypes` |
| `design/rules.json` | The invariants, plus `printInvariants` and which ids are screen-only |
| `references/print.md` | The print layer. Read it first for anything on paper |
| `dist/hardstock.css` | Drop-in stylesheet, zero dependency, all components |
| `dist/hardstock.theme.css` | The same tokens as a Tailwind v4 `@theme` block |
| `references/generation-protocol.md` | The step-by-step build procedure. Follow it in order |
| `references/design-language.md` | Full spec and the reasoning behind each rule |
| `references/adapting.md` | Porting to other stacks, deriving themes, extending components |
| `examples/` | Working app shell, landing page, and component gallery |
| `screens/` | Token-accurate SVG previews to compare a draft against |
| `tools/validate.mjs` | Static checker for the mechanical rules. Run it on your output |
| `tools/contrast.mjs` | Contrast floors. Run it before shipping any new theme |

## How to use this skill, on screen

1. **Choose three things and say them out loud**: a theme id from `design/themes.json`,
   a block sequence from `design/blocks.json` (`pageRecipes` has defaults per page type),
   and a stack. Defaults are `paper-yellow`, `landing` or `app-shell`, vanilla CSS.
2. **Lay the token and base layer first.** Link `dist/hardstock.css`, or inline its `:root`
   block and base layer. Never write a hex value inside a component rule.
3. **Block out bordered regions before styling anything.** Tile them. Never nest them.
4. **Fill with components** from `design/components.json`, then add motion last.
5. **Validate**: `node tools/validate.mjs <file>`, then walk the manual checklist in
   `references/generation-protocol.md`. Fix everything it reports before saying you are done.

Full detail is in `references/generation-protocol.md`. Read it before generating a whole page.

## How to use this skill, in print

1. **Pick the piece and set a body size** from `design/tokens.json` `print.bodySizeByPiece`.
2. **Derive every measurement** from `print.derivation`. Rule weight is body divided by 8,
   shadow offset equals rule weight, spacing base is body divided by 4, block padding is
   1.5 times body. Never convert the pixel values, and never scale a finished layout to a
   new size.
3. **Check the rule weight against the process floor** in `print.minimumRuleWeight`. If the
   derived weight falls under it, raise the rule rather than preserve the ratio.
4. **Choose paper, then ink.** The canvas token is a stock choice, not a flood tint. One
   accent means black plus one spot, which is cheaper than four-color and more saturated.
5. **Compose** from `design/blocks.json` `printArchetypes`.
6. **Check against `printInvariants`** in `design/rules.json` and the handoff checklist at
   the end of `references/print.md`. K-only overprinting hairlines and drawn offset shadows
   are the two that ruin whole jobs.

`references/print.md` is the full layer, including CMYK gamut limits, spot starting points,
trim clearance and images.

## Non-negotiable

These are the rules that decide whether the result is this language or a different one.
`design/rules.json` is authoritative; this is the short list.

- `border-radius` is 0 on every element, including avatars, toggles, radios and modals.
- Every `box-shadow` has a blur of 0. Depth is displacement.
- Text on any colored fill is ink, in light and dark themes both. Never grey, never white.
- Exactly one accent per page. The accent is brand, never semantics. Status colors come
  from `color.semantic`.
- No card inside a card. Regions are separated by hard borders, not by layering.
- No bounce, spring, overshoot easing, scale-up, or blur transition of any kind.
- No emoji. Monoline SVG at 1.5 to 2px stroke, or an uppercase mono label.
- A `prefers-reduced-motion` block, a visible `:focus-visible` ink ring, and a word or icon
  alongside every colored status. These are requirements, not polish.

In print, drop the four screen-only items (motion, reduced-motion, focus ring, interactive
elements) and add `printInvariants`: K-only overprinting hairlines, rich black for large
solids only, offset shadows drawn as shapes rather than effects, rule weights above the
process floor, and rules either 5mm inside the trim or fully off the bleed.

## Common failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Reads as generic SaaS | A library leaked its radii | Global radius reset, then check computed styles |
| Reads as flat and dead | Shadows missing or blurred | Offset `shadow-sm` on every raised element |
| Reads as noisy | More than one accent | Demote the extras to categorical use |
| Reads as auto-generated | One archetype repeated down the page | Three to four archetypes from `blocks.json` |
| Dark theme looks lifeless | Pure black or cool grey canvas | Warm black `#18150f`, warm white ink, accent unchanged |
