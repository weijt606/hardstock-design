# Adapting Hardstock

How to move the language into a stack it does not ship for, and how to extend it without
breaking it.

---

## Vanilla HTML and CSS

The intended default for tools, dashboards, prototypes and single-file deliverables.

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap">
<link rel="stylesheet" href="hardstock.css">
...
<body data-hs-theme="paper-yellow">
```

No build step, no package manager. `python3 -m http.server` serves it. For a fully offline
build, self-host the two woff2 files and drop the Google Fonts link.

---

## Tailwind CSS v4

```css
@import "./hardstock.theme.css";
```

Components then read as utilities: `bg-accent border-2 border-ink shadow-brutal-sm font-display`.

Two things to watch:

- Preflight and most component libraries reintroduce radii. `hardstock.theme.css` carries one
  `!important` radius reset for exactly this reason. Do not remove it.
- Shadow tokens embed a literal color, so a dark theme has to restate them. The theme file
  does this under `[data-hs-theme="night-yellow"]`.

Tailwind v3 users: move the `@theme` values into `theme.extend` in `tailwind.config.js`,
map shadows into `boxShadow`, and set `borderRadius.DEFAULT` to `0px`.

---

## React, Vue, Svelte

The language is pure CSS, so any of these works. Import `dist/hardstock.css` once at the
app root and write components against the class contracts, or generate framework components
from `design/components.json`.

Actively avoid shadcn/ui, MUI, Chakra and their peers. Their defaults are rounded corners,
blurred shadows and spring animation, which means adopting them turns into overriding them
one property at a time. Building twelve primitives from `components.json` is less work than
fighting a design system that disagrees with yours.

---

## Design tools

`design/tokens.json` maps directly onto Figma variables and Style Dictionary:

- `color.*` becomes color variables
- `type.scale.*` becomes text styles, pairing each size with its line height
- `shadow.*` becomes effect styles, blur locked at 0
- `space.scale` becomes spacing variables

Set the corner radius default to 0 in the component library so a designer cannot round
something by muscle memory.

---

## Porting to native and non-web targets

The grammar translates because it is about structure rather than about CSS:

- iOS and Android: 2px stroke, 0 corner radius, offset shadow drawn as a second filled
  rectangle behind the view (most shadow APIs only produce blurred shadows).
- Terminal and TUI: the language degrades unusually well. Box-drawing characters are the
  borders, and one accent maps to one ANSI color.
- Print: it came from stamps, index cards and letterpress, so it goes home well. It also
  needs its own layer, because pixel measurements, CMYK gamut, ink registration and trim
  tolerance have no screen equivalent. That layer is `references/print.md`, and it is the
  one port covered in full rather than sketched.

---

## Deriving a new theme

Change `canvas`, `ink`, `accent`, and the two surface fills. Nothing else.

1. Pick an accent bright enough that ink text on it clears 4.5:1. Verify it, do not assume it.
   Deep saturated accents fail this and are the most common reason a custom theme looks wrong.
2. Keep the canvas near-white with a hue cast. A fully saturated canvas collapses the
   block structure, because the borders stop being the thing that separates regions.
3. Derive `surface.raised` by nudging canvas a few percent toward the accent hue, and
   `surface.high` by nudging it toward white.
4. Keep ink in the canvas hue family. Warm canvas gets warm ink.
5. For a dark theme, swap canvas and ink but keep both in the same temperature. Warm black
   `#18150f` with warm white `#f6eedb`. Never `#000`, never cool grey. The accent does not
   change, and text on colored fills stays dark.
6. Leave the categorical palette alone. It carries status and identity, not brand.

Check it before you commit to it, and pass `--dark` for a dark candidate or the accent is
measured against the wrong ink:

```bash
node tools/contrast.mjs [--dark] <canvas> <ink> <accent> [surface]
```

Add the result to `design/themes.json` as a `[data-hs-theme="..."]` block, restating every
value rather than relying on the `:root` defaults, and it composes with everything already
shipped. `tools/selftest.mjs` will hold both stylesheets to it.

---

## Extending the component set

Before adding a component, check whether an existing one covers it. If it does not:

1. Start from `sharedChrome`: 2px ink border, radius 0, `shadow-sm`, ink on fill.
2. Choose fills from the token set. Never introduce a color.
3. Define all five states: default, hover, active, focus, disabled.
4. Write the contract into `design/components.json` before writing the CSS. The contract is
   what other agents read.
5. Run `tools/validate.mjs` over the implementation.

If a new component seems to need a rounded corner, a blur, or a second accent, the component
is wrong, not the rule. Every one of those requests so far has turned out to be a component
borrowed from a different language.

---

## What not to change

Restating, because this is where forks drift:

- Border width, shadow blur, corner radius, the type pairing, the easing curve, ink on fills.
- One accent per page.
- The accent is brand, never semantics.

Everything else is yours.
