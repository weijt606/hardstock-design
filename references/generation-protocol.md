# Generation protocol

The procedure an agent follows to produce a Hardstock surface. It is deliberately ordered:
tokens before layout, layout before components, components before motion. Reversing the order
is how pages end up with correct colors and wrong bones.

---

## Step 0. Read the brief, then pick

Answer three questions before writing anything.

| Question | Source | Output |
| --- | --- | --- |
| Which theme? | `design/themes.json` | one theme id |
| Which page type? | `design/blocks.json` -> `pageRecipes` | an ordered list of block archetypes |
| Which stack? | see `references/adapting.md` | vanilla CSS, Tailwind v4, or a port |

Defaults when the brief does not say: theme `paper-yellow`, stack vanilla, recipe `landing`
for a marketing page and `app-shell` for a tool.

State the three choices out loud before generating. A wrong theme caught in one sentence is
cheaper than a wrong theme caught in 400 lines of CSS.

---

## Step 1. Lay the token and base layer first

Either link `dist/hardstock.css`, or inline the `:root` block plus the base layer from it.
Never begin with components. Never write a hex value inside a component rule.

The base layer is six things, and every one of them gets skipped by someone porting this
in a hurry:

1. `*,::before,::after { border-radius: 0 }`
2. `::selection` in accent with ink text
3. Square ink scrollbar
4. `:focus-visible` ink outline
5. Links in ink, not blue
6. `prefers-reduced-motion` shutting off animation and transition

Without these the components can be pixel-correct and the page will still feel slightly off.

---

## Step 2. Block out the page before styling anything

Write the page as bordered regions with no content: sidebar, top bar, main, footer, or
hero, strip, grid, CTA. Confirm the structure reads correctly in grey boxes.

- Tile regions. Do not nest them.
- Content converges at 64rem unless a block is intentionally full bleed.
- The main column of an app shell gets `minmax(380px, 1fr)`.

---

## Step 3. Fill with components

Use the classes in `dist/hardstock.css` or the contracts in `design/components.json`.
Every interactive or grouped element gets: 2px ink border, square corners, `shadow-sm`,
ink text on whatever fill it carries.

Composition discipline while filling:

- One accent. Primary buttons and hero highlights only.
- Categorical colors go on avatars, badges and category chips, nowhere else.
- Every colored status carries a word.
- Micro-labels in uppercase mono anywhere metadata appears.

---

## Step 4. Motion last

Press on buttons, lift on linked cards, float on decorative avatars. Easing
`cubic-bezier(0.4, 0, 0.2, 1)`, duration at most 0.15s. Nothing else moves.

---

## Step 5. Validate before declaring it done

```bash
node tools/validate.mjs path/to/page.html
```

The validator is zero dependency and checks the mechanical rules: non-zero radii, blurred
shadows, overshoot easing, scale transforms, backdrop blur, emoji in markup, a missing
reduced-motion block, and hex literals outside the token block.

For a rendered page, paste `tools/audit.js` into the browser console. It walks computed
styles, which catches radii and blurs that arrive from a framework rather than your source.

Then check by hand what a parser cannot:

- [ ] Text on every colored fill is ink, never grey and never white
- [ ] Exactly one accent is used for primary actions
- [ ] No card contains another card
- [ ] Every colored status also carries a word or a monoline icon
- [ ] Tab order is visible and complete; overlays close on Escape
- [ ] At 768px and 375px, columns collapse or scroll rather than crushing
- [ ] Three to four block archetypes are in play, none used more than twice
- [ ] No emoji anywhere in the chrome

---

## Common failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Looks like generic SaaS | A component library leaked its radii | Add the global radius reset, check computed styles |
| Looks flat and lifeless | Shadows omitted, or blur applied | Restore offset shadows at `sm` on every raised element |
| Looks noisy | More than one accent | Demote the extras to categorical use |
| Looks auto-generated | One archetype repeated down the page | Rewrite with three to four from `blocks.json` |
| Breaks on a laptop screen | Fixed multi-column with no floor | `minmax(380px, 1fr)` plus horizontal scroll |
| Dark theme looks dead | Cool grey or pure black canvas | Warm black `#18150f`, warm white ink, accent unchanged |

---

## Prompt template

For handing this to another agent in one message:

```
Build <page> using the Hardstock design language.

Tokens:     design/tokens.json (or link dist/hardstock.css)
Theme:      <theme id> from design/themes.json
Blocks:     <archetype list> from design/blocks.json
Components: design/components.json
Rules:      design/rules.json, every error-level invariant is mandatory

Order: tokens and base layer, then bordered region layout, then components, then motion.
Then run node tools/validate.mjs on the result and fix everything it reports.
```
