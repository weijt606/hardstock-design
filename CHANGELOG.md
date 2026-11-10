# Changelog

## 1.2.0, public release (2026-11-10)

The version number stays at 1.2.0. These changes landed between the 1.2.0 tag and the first
public release.

Changed:

- **Palette retuned.** Every color value moved slightly: ink is now `#1c1915`, the paper
  canvas `#faf5e8`, the yellow accent `#ffc72c`, and the categorical, semantic, tint and
  dark-theme values shifted with them. All seven themes were re-checked against their
  contrast floors (ink on canvas 16.09:1). The figures in `screens/` were regenerated.

Fixed:

- **Borders and shadows ignored a theme set on `<body>`.** `--hs-border*` and `--hs-shadow-*`
  were declared only on `:root`, and a `var()` inside a custom property resolves on the
  element that declares it, so they stayed in the default ink. With
  `<body data-hs-theme="night-yellow">`, the setup the README shows, every border and offset
  shadow was drawn near-black on the warm-black canvas and disappeared. They are now
  declared on `:root, [data-hs-theme]`, so they follow whichever element carries the theme.
  Light themes were unaffected because they share the same ink. The Tailwind build restates
  its shadows inside each theme block and was not affected.
- The self-test now fails if any token built from a themed value is declared without
  `[data-hs-theme]`.

## 1.2.0 (2026-08-11)

An independent QA pass, a red-team pass and a code review found defects in 1.1.0 that the
project's own tooling had been unable to see. Several of them were in the tooling.

Fixed, correctness:

- **Dark theme text was unreadable on neutral surfaces.** `.hs-btn` and `.hs-badge` applied
  `--hs-on-fill` (which never flips) to `--hs-surface-plain` (which does), so in
  `night-yellow` a secondary button measured 1.10:1 and a ghost button 1.00:1. On-fill now
  belongs only to the colored variants; neutral surfaces take ink. The same bug had been
  baked into the dark-theme figure the README displays.
- **`npx hardstock-validate` was a silent no-op.** npm installs `bin` as a symlink, and Node
  resolves the main module through realpath while `process.argv[1]` keeps the link path, so
  the entry-point guard never matched and the CLI exited 0 without checking anything. Both
  sides now go through realpath.
- **`dist/hardstock.theme.css` shipped two themes out of seven** while the docs promised
  parity with the vanilla stylesheet, and it had no on-fill token at all, so Tailwind users
  inheriting body color got 1.29:1 text on a yellow button. All seven themes are present,
  `--color-on-fill` exists, and the component recipe in the header uses it.
- `.hs-overlay` set `display: grid`, which outranks the UA sheet's `[hidden]`, so the
  component gallery rendered a modal over the page on load. `[hidden]` is now enforced.
- Toggle knob used ink, which vanished against lime in the dark theme (1.49:1), and sat
  flush against the track edge when on. It uses on-fill and a symmetric position now.
- `appearance: none` gained its `-webkit-` prefix, without which Safari 15.3 and earlier
  fall back to rounded native controls, breaking the first invariant in the system.

Fixed, tooling that could not see the system it validates:

- **The validator was blind to token-level violations.** Putting a blur in `--hs-shadow-md`
  and a radius in a custom property passed every check, which matters because this system
  keeps its radii and shadows in tokens. It now builds a token map, resolves `var()`, and
  checks custom properties directly.
- **The validator read prose as CSS.** A paragraph mentioning a property was reported as a
  violation, and the greedy capture spilled the rest of the line into the message.
  Declarations are now only read inside real CSS regions, with comments and strings scrubbed.
- **The self-test proved almost nothing.** It asserted that a rule name appeared somewhere,
  so deleting an entire check, or downgrading its errors to warnings, still passed. It now
  asserts rule, level and count, runs a clean fixture that must produce no false positives,
  and verifies both stylesheets still match `design/themes.json`. Seven mutations that
  previously passed now fail.
- A target that could not be read was silently dropped and still reported success. Unreadable
  targets now exit 2.
- Longhand and logical radius properties, Tailwind arbitrary values, `outline: 0px`, and the
  standalone `scale` property were all bypasses. `oklch()`, `color-mix()` and `calc()` in a
  shadow were false positives. One-accent flagged `:hover` variants as second accents and
  missed any class not containing `btn`.
- `tools/contrast.mjs` had no dark branch in candidate mode, so the command the docs teach
  failed a theme the repository ships. It also accepted 8-digit hex and silently dropped
  alpha. Both fixed; invalid input now throws.
- `tools/audit.js` collected button fills and never asserted on them.
- `package.json` omitted `examples/` and `screens/`, so an npm install produced a README full
  of broken images and scripts that crashed.

Fixed, documentation that overstated:

- Space Grotesk is by Florian Karsten. It was credited to Colophon Foundry, who made Space
  Mono. Getting an attribution wrong inside an attribution section is the worst place for it.
- The stated contrast figures (roughly 15:1 and 11:1) were about 20 percent off the values
  the repository's own checker reports (18.04:1 and 13.19:1).
- "The validator checks most of them" became the actual count: eight of fifteen, with the
  seven that need human eyes named.
- The print layer now says the process minimums are commonly quoted floors rather than
  guarantees, gives both rich black recipes with the reason to choose between them, limits
  the CMYK gamut warning to the two accents it actually applies to, and notes that the
  headline ratio does not travel to formats smaller than A5.

Also changed, presentation:

- The lead figure was an app shell with channels and direct messages, which read as a
  specific chat product rather than as a design language. It is now a landing page: nav,
  hero with a single accent mark, two calls to action, numbered blocks. The theme comparison
  uses the same page, so the figure demonstrates a theme swap rather than a second product.
- The app-shell case is still shown, as a console with a stat strip and a hard-lined status
  table. That is the shape this grammar is actually good at, and it borrows nobody's product.
- Nav items in the generated figures are laid out by measured advance instead of a fixed
  step, and the numbered blocks take ink on neutral fills, which was the same on-fill bug as
  the buttons, one figure further along.

Fixed again, after the review round found defects in the fixes above:

- **The toggle knob bug moved rather than went away.** Pinning the knob to on-fill
  fixed the on state and broke the off state, 1.49:1 becoming 1.10:1. The knob now takes its
  color from whatever it currently sits on. Same mistake, third occurrence, which is why it
  is now a validator rule rather than a thing to remember.
- **New rule `on-fill-on-neutral`.** on-fill never flips between themes; the neutral surfaces
  do. Pairing them caused every dark-theme contrast defect this project has had, and nothing
  measured that pair. The validator now refuses the combination outright, and
  `tools/contrast.mjs` measures ink against `surface.plain` for every theme.
- **The Tailwind arbitrary-value shadow check never ran.** Its regex ended in `\b` after a
  `]`, an assertion that can never hold, and the fixture's neighbouring `shadow-lg` kept the
  count up so the self-test stayed green. Fixtures are now one concern per file with exact
  counts, because a minimum count lets a dead branch hide behind a live sibling.
- **CSS-in-JS coverage had regressed below the previous release.** Scanning only real CSS
  regions is right, but a tagged template is a real CSS region. Restored, along with
  single-quoted `style` attributes.
- **Token resolution was flat, last declaration wins.** In a stylesheet organised by themes
  that left every theme but one unchecked. It now checks every value a token can hold.
- **Radius tokens were judged by their name**, so `--carousel-round-trip` was a violation.
  That heuristic is gone; resolution at the point of use covers the real cases.
- **A property name inside a selector swallowed the declaration after it**, silently
  disabling the rule for that block. Value captures now stop at a brace.
- **Scrubbing was quadratic**, 12.4 seconds on a 4000-element page. One pass now, 0.04s.
- `tools/audit.js` reported every button fill as a separate accent, so it fired on this
  repository's own component gallery. Narrowed to primary variants, matching the static rule.
- `tools/contrast.mjs` had the same symlink entry-point bug that `validate.mjs` had; only
  half of it had been fixed.
- Rich black: the lighter build was described as suiting a warm sheet, but it is still
  cyan-led and therefore still cool. The honest reason is total ink coverage, 240% to 200%.
  A genuinely warm black needs magenta and yellow above cyan.
- The CMYK warning blamed saturation. Orange measures 90.7% saturation against cyan's 89.5%
  and still prints fine, because the gamut problem is about hue, not saturation.
- The coverage qualifier had been fixed in the README body but not in the `SKILL.md`
  description or the README's opening paragraph, which are what most readers see first.
- `--dark` existed but appeared in no document, so anyone following the docs to derive a dark
  theme would get a misleading result.

The self-test now asserts exact counts across five purpose-built fixtures, exercises the
command line as a subprocess for exit codes and flags, builds a temporary directory with an
unreadable entry and a symlinked invocation, and checks that the contrast report actually
covers the neutral surface. Of eighteen fresh mutations, sixteen are caught; the two that are
not are redundant defenses whose removal is caught when both are removed together.

Fixed again, after the re-review found defects in the fixes to the fixes:

- **`deref()` was never updated for the multi-value token map.** Its `String.replace`
  callback returned an array, which stringified into `"none,0"` and matched nothing, so any
  focus or outline token redeclared per theme was silently ignored. The weaker of the two
  resolution paths is now deleted outright; there is one.
- **`resolveAll` shared its visited-set across branches**, so the second branch returned an
  unresolved string, which simply looks like a shorter and legal declaration. Keyed on the
  whole value and copied per branch now.
- **Blur was read by counting numbers**, and stripping `calc()` removed its digits, so a
  blur hidden inside `calc()` or behind an unresolved token read as a legal three-value
  shadow. It is read by slot position now, with a warning when the blur slot holds a token
  this file cannot resolve.
- The token-shadowing fixture only planted bad values *before* their good twins, so it
  guarded against resolving the first candidate but not against reverting to the old
  last-declaration-wins map. It now plants both orders.
- `on-fill-on-neutral` existed in the validator but not in `design/rules.json`, so the
  implementation had a rule the registry did not know about. Registered; the counts are now
  nine machine-checkable of sixteen.
- The self-test now fails on findings nobody asked for, not just on missing ones. That check
  immediately caught a new false positive in the warning added two paragraphs above.
- `styled.div.attrs({})`, `emotionStyled()` and `tw.div` are ordinary in real code and were
  not recognised as CSS regions.
- `onFill` had been added to all seven themes and read by nothing. The dark theme's accent
  is measured against it now, which is what actually sits on that fill.

Of twenty fresh mutations, seventeen are caught. The three that are not are two halves of a
paired guard and one of their siblings: removing either half alone has no observable effect
because the other covers it, and removing both is caught. That is what defense in depth looks
like under mutation testing, and splitting the pairs apart to make the number nicer would
make the code more fragile, not less.

Added:

- `surfacePlain` and `mutedText` are now real fields on every theme. They existed only in the
  CSS, so a theme derived by following the documentation inherited white inputs on a dark
  canvas.
- Every theme block in both stylesheets restates every value instead of leaning on `:root`
  inheritance, so one block is a complete theme and a partial block cannot pass for one.

## 1.1.0 (2026-08-11)

A pink theme, a contrast checker that had to exist before it could ship, and figures that
show the language instead of describing it.

Added:

- `paper-pink`, a seventh theme. The canvas carries a blush cast and `surface.raised` is
  pulled further toward the accent, so it reads pink at a glance rather than only at the
  buttons. Ink on the accent measures 7.79:1.
- `tools/contrast.mjs`, a WCAG relative-luminance checker. It reports every shipped theme
  against the floors in `deriveNewTheme.contrastFloor`, or checks a candidate palette before
  you commit to it. Wired into `tools/selftest.mjs`, so a theme that misses a floor fails
  the test run.
- `tools/render-figures.mjs`, which generates every figure in `screens/` from
  `design/themes.json` and `design/tokens.json`. Documentation figures drift from the thing
  they document unless they are derived from it, so these are derived from it.
- Six new figures: block anatomy, the shadow scale with press states, the type system, a
  component gallery, block archetypes, and one screen rendered across three themes.
  The README now shows the grammar, the components and the composition rules.

Fixed:

- `deriveNewTheme.verify` pointed at `node tools/validate.mjs --theme`, a flag that never
  existed. It now names the real command.
- `tools/contrast.mjs` ran its CLI and called `process.exit` when imported. Guarded, the same
  way `tools/validate.mjs` is.

## 1.0.0 (2026-08-11)

First release.

Most design systems ship colors and components and hope the taste comes along with them.
This one writes the taste down: exact values, an explicit line between what may move and
what may not, and rules handed to a machine that can check them.

Included:

- `design/` as the machine-readable source of truth: tokens, six themes, component
  contracts, block archetypes, and the invariants split by whether a machine can check them
  and by which medium they apply to.
- The three-layer model in `references/design-language.md`: a grammar that never changes, a
  skin of three swappable variables, and a composition layer chosen per page. This is what
  makes the language reusable rather than a single look.
- `dist/hardstock.css`, a zero-dependency drop-in stylesheet with all components and all six
  themes, and `dist/hardstock.theme.css` for Tailwind v4.
- `references/print.md`, a full second implementation layer for paper: measurement derived
  from ratios rather than converted from pixels, minimum rule weights per printing process,
  paper and ink (the canvas token becomes a stock choice, one accent becomes a two-color
  job), CMYK gamut limits with spot starting points, trim clearance, images, seven
  composition archetypes, print anti-patterns, and a handoff checklist.
- `tools/validate.mjs`, a static checker for the mechanical invariants, plus
  `tools/audit.js` for computed styles in a live page and `tools/selftest.mjs`, which proves
  the checker fires against a deliberately broken fixture.
- `references/generation-protocol.md`, the ordered build procedure, with a failure-mode
  table and a paste-ready prompt.
- `references/adapting.md`, covering other stacks, design tools, native targets, deriving a
  new theme, and extending the component set.
- Working examples: an app shell, a landing page, and a component gallery with a live theme
  switcher.
- `SKILL.md`, so the repository doubles as a Claude Code skill.

Known limit: the validator checks screen output only. Nothing checks a print file
automatically, and no checklist replaces a physical proof.
