# Hardstock in print

The grammar in `references/design-language.md` did not start on screens. Hard rules, flat
color blocks, square corners, offset shapes standing in for depth, uppercase mono
metadata: this is letterpress, riso, index cards and mid-century poster work, borrowed back
into CSS. Print is where it came from, and it holds up better here than most web design
languages would.

What does not carry over is the implementation. This file gives print its own layer:
physical units, ink economics, composition archetypes, and the mistakes that only exist
once something is actually being cut and printed.

---

## 1. What transfers, and what does not

**Transfers unchanged**: the color roles, the type pairing, the micro-label, square corners,
flat color blocking, the proportional relationships between rule weight, type size and
spacing, the one-accent discipline, the block-tiling approach to composition.

**Does not transfer**: every interaction state in `design/components.json` (hover, focus,
active, disabled), the entire `motion` token group, breakpoints and responsive rules,
`prefers-reduced-motion`, focus rings, keyboard access, `dist/*.css`, `tools/validate.mjs`
and everything in `examples/`. Those fields are marked `webOnly` in the JSON. Skip them.

**Has to be re-derived**: all absolute measurements. A 2px rule means nothing on paper. At
300dpi it is 0.17mm, thin enough that some processes will drop it. Section 2 handles this.

---

## 2. Physical units

Do not convert the pixel values. Re-derive them from the ratios, which is what actually
defines the language.

The web spec sets a 2px rule against 16px body text, a 2px shadow offset, a 4px spacing base
and 24px block padding. As ratios against body size:

| Property | Ratio to body size | Web check |
| --- | --- | --- |
| Rule weight (the workhorse) | body ÷ 8 | 16 ÷ 8 = 2px |
| Shadow offset, small | = rule weight | 2px |
| Shadow offset, medium | 2 × rule weight | 4px |
| Shadow offset, large | 3 × rule weight | 6px |
| Spacing base unit | body ÷ 4 | 4px |
| Block padding | 1.5 × body | 24px |
| Gap between blocks | 3 to 4 × body | 48 to 64px |
| Micro-label size | 0.6 × body | 10px |
| Headline | 3 to 4.5 × body | 48 to 72px |

The headline ratio is the one that does not travel to small formats. Three to four and a
half times body is a poster or page relationship; on a business card it would produce a
36pt name on an 85mm card. For anything smaller than A5, treat the headline as 1.5 to 2
times body and let the micro-label carry the hierarchy instead.

Set body size for the piece, then everything else follows.

| Piece | Body | Rule weight | Shadow (sm) | Spacing base |
| --- | --- | --- | --- | --- |
| Business card, label | 7 to 8pt | 0.9 to 1pt (0.35mm) | 1pt | 2pt |
| A6 postcard, invitation | 8 to 9pt | 1 to 1.1pt (0.4mm) | 1.1pt | 2.2pt |
| A5 or A4 flyer, book page | 9 to 11pt | 1.1 to 1.4pt (0.5mm) | 1.4pt | 2.7pt |
| A3 poster | 14 to 18pt | 1.75 to 2.25pt (0.8mm) | 2.25pt | 4.5pt |
| A2 or A1 poster | 24 to 36pt | 3 to 4.5pt (1.6mm) | 4.5pt | 9pt |
| Large format, signage | scale to viewing distance | body ÷ 8, no ceiling | = rule | body ÷ 4 |

Two adjustments the ratio does not give you:

**Minimum rule weight by process.** Below these, a hairline breaks up or disappears. If the
derived weight is under the floor, raise the rule rather than keep the ratio. These are the
commonly quoted industry floors, not guarantees: press, stock and screen ruling all move
them, so confirm with your printer the same way you would confirm a spot color.

| Process | Minimum |
| --- | --- |
| Offset litho | 0.25pt |
| Digital toner or inkjet | 0.3pt |
| Letterpress | 0.5pt |
| Risograph | 0.5pt |
| Screenprint | 0.75pt to 1pt |

**Tracking on micro-labels.** Small uppercase mono needs more letterspacing on paper than on
a backlit screen. Add 50 to 100 units (0.05 to 0.1em) at label sizes. The web value of
0.05em is a floor, not a target.

---

## 3. Ink and paper

This is where the language gets cheaper in print rather than more expensive, which is
unusual and worth exploiting.

**The canvas token is paper, not ink.** `#faf5e8` is a warm cream. Do not flood the sheet
with a tint to reproduce it. Choose a warm uncoated stock and let the paper be the canvas.
It is cheaper, it feels correct for a language named after card stock, and it gives the ink
the slight bite that flat CMYK on coated never has. Cream, oatmeal, natural and manila
stocks all land in the right place. `cool-lavender` is the one theme that wants a cool white
sheet instead.

**One accent means a two-color job.** The language permits exactly one accent per page. In
print that turns into black plus one spot color, which costs less than four-color and
gives a fully saturated accent that CMYK cannot reach. This is the single biggest reason the
system suits print: the discipline that keeps the screen version clean also keeps the
print version cheap.

**Some accents will disappoint in CMYK, and it is about hue, not saturation.** The coated
four-color gamut is weakest in the blue-green and magenta-violet range, which is where cyan
(`#45c2ea`) and pink (`#ff8db4`) live: both print noticeably duller than the hex suggests.
Orange (`#ff9b5c`) is almost exactly as saturated as cyan and still reproduces well, because
it sits where the CMY inks natively reach. Yellow is a process ink. Lime (`#9fd06a`) is both
low in saturation and in easy territory. Judge a candidate accent by where it sits on the
wheel rather than by how saturated it looks, or you will reject colors that would have been
fine and trust ones that will not be.

If you must run four-color, proof it against your printer's actual profile before committing,
and expect to adjust. If you can run a spot, do. Approximate spot equivalents to start a
conversation with your printer, all needing confirmation against a physical swatch book
rather than a screen:

| Token | Hex | Starting point |
| --- | --- | --- |
| accent, yellow | `#ffc72c` | Pantone 116 or 123 |
| pink | `#ff8db4` | Pantone 210 or 211 |
| cyan | `#45c2ea` | Pantone 306 or 2985 |
| lime | `#9fd06a` | Pantone 366 or 373 |
| orange | `#ff9b5c` | Pantone 1565 |
| lavender | `#b3a4ec` | Pantone 2635 or 271 |

**Black is two different blacks.** Hairline rules and small text run K-only. Four-color
hairlines misregister and fringe, and this language is made almost entirely of hairlines,
so getting this wrong ruins the whole piece rather than one element.

Large solid blocks of ink run as a rich black so they do not read as washed-out grey. There
is no single standard recipe. The widely quoted starting point is around C60 M40 Y40 K100,
a dense black that leans cool because cyan leads the build, and it suits coated stock. A
lighter build closer to C40 M30 Y30 K100 drops total ink coverage from 240% to 200%, which
absorbent uncoated stock handles far better: less show-through, less spread, faster drying.
Note that it is still cyan-led and therefore still slightly cool, just less so. A genuinely
warm black needs magenta and yellow above cyan, something nearer C30 M40 Y50 K100. Pick one
with your printer against their total-ink-coverage limit rather than copying a number out of
a document. Never put small text or a hairline on top of any of them.

**Set hairlines to overprint.** Otherwise a knockout plus any misregistration leaves a white
fringe along the rule, which is the most visible possible failure in a system built from rules.

**The offset shadow and its rule must be the same ink.** The shadow only works because it
sits in exact register behind the element. Split them across two plates and any drift turns
a crisp offset into a smear.

**Risograph deserves a mention.** Flat spot inks, no gradients, hard edges, and a process
whose slight misregistration reads as character rather than error. The language and the
process want the same things.

---

## 4. Trim, bleed and the edge

Hard-edged blocks are unforgiving about cutting, in a way that soft-edged design is not.

- **Bleed 3mm** on any color block that reaches the edge, standard.
- **Keep rules at least 5mm inside the trim, or run them fully off the bleed.** A rule that
  sits parallel to and near the trim edge will read as uneven after cutting, because trim
  tolerance is roughly ±1mm and the eye measures that gap against the rule. There is no
  middle ground: inside with clearance, or off the edge entirely.
- **Inner margin is at least 2 × block padding**, so 3 × body size. Hard-bordered blocks
  crowded against the edge look like a printing error rather than a decision.
- **Bound work**: add gutter allowance before deriving margins, and never let a rule cross
  the gutter on a saddle-stitched piece.
- **Do not scale a finished layout between sizes.** Re-derive from the new body size. Scaling
  keeps the ratios but walks the rule weight through the process minimum without telling you.

---

## 5. Images

- Square crop with a hard rule around it, weight matching everything else. No rounded masks,
  no vignettes, no feathered edges.
- Offset shadow behind the image frame, same ink, same register discipline as section 3.
- Duotone or coarse halftone in the accent ink fits both the look and the two-color economy.
  A full-color photograph inside a two-ink piece breaks the system and the budget at once.
- Cutout subjects on the canvas work well. Soft drop shadows under them do not.

---

## 6. Composition archetypes for print

The screen archetypes in `design/blocks.json` assume scrolling. These are the print
equivalents, and they live in the same file under `printArchetypes`.

- **Poster**: one headline at 3 to 4.5 × body with a single word in an accent block, a mono
  metadata band ruled off at the foot, generous empty paper. One accent, one idea.
- **Editorial spread**: rule-divided column grid, mono running heads, square-cropped images
  with a rule, micro-labels for captions. The rules do the dividing, not white space alone.
- **Card or invitation**: one accent block carrying the key line, mono micro-labels for date
  and place, inner margin at 3 × body. Restraint reads as expensive here.
- **Spec sheet or data card**: a hard-lined table. This is the language's native form and the
  place it beats softer systems outright.
- **Cover**: full-bleed accent field with an ink rule frame inset at least 5mm, title in
  display, everything else mono.
- **Sticker or label**: square, one accent, uppercase mono, rule right to the die line minus
  clearance.
- **Programme or menu**: ruled bands alternating canvas and accent tint, mono for prices and
  times, display for names.

Composition discipline is the same as on screen: mix three or four archetypes across a
multi-page piece, and let hard rules do the partitioning rather than nesting boxes.

---

## 7. Print anti-patterns

Everything in `design/rules.json` still applies. These are additional, and specific to ink.

- **No four-color hairlines or small text.** K-only. This is the one that ruins whole jobs.
- **No large K-only solids.** They read as washed grey next to a rich black.
- **No small text or hairlines over rich black.** Registration will fringe them.
- **No effect-panel drop shadows.** Application shadow effects rasterise with a blur and
  often with transparency flattening artefacts. Draw the offset as a second filled shape.
- **No gradients, no transparency, no blend modes.** Same rule as the screen version, with
  worse consequences: these force flattening and can shift color unpredictably at RIP.
- **No knockout hairlines.** Overprint them.
- **No rule sitting 1 to 4mm from the trim.** Inside with clearance or off the edge.
- **No RGB in the file.** Convert deliberately with a profile, do not let the RIP guess.
- **No scaling a layout to a new size.** Re-derive.

---

## 8. Handoff checklist

Before sending to a printer:

- [ ] Every rule weight is at or above the process minimum in section 2
- [ ] Hairlines and small text are K-only, set to overprint
- [ ] Large ink solids are rich black, with no small text on top of them
- [ ] Offset shadows are drawn shapes in the same ink as their rule, not effects
- [ ] Exactly one accent, and it is a spot color if the budget allows
- [ ] Paper stock chosen to carry the canvas color, not a flood tint
- [ ] 3mm bleed, rules either 5mm inside trim or fully off the edge
- [ ] Color converted with the printer's profile, no RGB left in the file
- [ ] Fonts outlined or embedded, both Space Grotesk and Space Mono licensed for the use
- [ ] A physical proof on the actual stock before the full run, especially for accents

The last one is not optional for anything with a saturated accent. Screens lie about exactly
the colors this palette leans on.
