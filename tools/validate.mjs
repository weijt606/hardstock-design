#!/usr/bin/env node
/**
 * Hardstock validator.
 *
 * Static check of HTML and CSS against the machine-checkable invariants in
 * design/rules.json. Zero dependencies, Node 18 or newer.
 *
 *   node tools/validate.mjs                    # checks examples/ and dist/
 *   node tools/validate.mjs path/to/page.html  # checks specific files or directories
 *   node tools/validate.mjs --json             # machine-readable output
 *   node tools/validate.mjs --quiet            # errors only, no warnings
 *
 * Exit code is 1 if any error-level finding survives, 2 if a target could not be
 * read, 0 otherwise. A target that cannot be read is a failure, not a pass.
 *
 * Declarations are only read inside real CSS regions (a .css file, a <style>
 * block, a style attribute), so prose that happens to mention a property is not
 * a violation. Custom properties are resolved before checking, because this
 * system keeps its radii and shadows in tokens and a checker that cannot see
 * through var() cannot see this system at all.
 *
 * It still cannot see anything a browser computes. For rendered pages, also run
 * tools/audit.js in the console.
 */

import { readFileSync, readdirSync, statSync, lstatSync, realpathSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTS = new Set(['.html', '.htm', '.css', '.svelte', '.vue', '.jsx', '.tsx']);
const JS_LIKE = new Set(['.jsx', '.tsx', '.vue', '.svelte']);

/* ------------------------------------------------------------------ tokens */

function knownHexes() {
  const set = new Set(['#000000', '#ffffff', '#fff', '#000']);
  for (const f of ['design/tokens.json', 'design/themes.json']) {
    let raw;
    try { raw = readFileSync(join(ROOT, f), 'utf8'); } catch { continue; }
    for (const m of raw.matchAll(/#[0-9a-fA-F]{3,8}/g)) set.add(m[0].toLowerCase());
  }
  return set;
}
const TOKEN_HEXES = knownHexes();

/* ------------------------------------------------------------------ helpers */

const lineIndex = (src) => {
  const starts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1);
  return (pos) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= pos) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
};

/** Blank out a span while keeping every other character at its original index. */
const blank = (arr, from, to) => { for (let i = from; i < to && i < arr.length; i++) if (arr[i] !== '\n') arr[i] = ' '; };

/**
 * Replace CSS comments and quoted strings with spaces, preserving offsets.
 * A commented-out declaration is not a declaration, and neither is a string.
 */
function scrubCss(a, src, from, to) {
  let i = from;
  while (i < to) {
    if (src[i] === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? to : end + 2;
      blank(a, i, stop); i = stop; continue;
    }
    if (src[i] === '"' || src[i] === "'") {
      const q = src[i];
      let j = i + 1;
      while (j < to && src[j] !== q) { if (src[j] === '\\') j++; j++; }
      blank(a, i, Math.min(j + 1, to)); i = j + 1; continue;
    }
    i++;
  }
}

/**
 * The regions of a file that are actually CSS. Everything else is prose, markup
 * or code, and a property name appearing there means nothing.
 */
function cssRegions(src, ext) {
  if (ext === '.css') return [[0, src.length]];
  const out = [];
  for (const m of src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    const start = m.index + m[0].indexOf('>') + 1;
    out.push([start, start + m[1].length]);
  }
  for (const m of src.matchAll(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const body = m[1] !== undefined ? m[1] : m[2];
    const q = m[1] !== undefined ? '"' : "'";
    const start = m.index + m[0].indexOf(q) + 1;
    out.push([start, start + body.length]);
  }
  // styled-components and friends put real CSS inside a tagged template. Without
  // this, a .jsx file is scanned as if it contained no CSS at all.
  if (JS_LIKE.has(ext)) {
    for (const m of src.matchAll(/(?:(?:styled|emotionStyled|tw)(?:\.\w+|\([^)]*\))(?:\.\w+(?:\([^)]*\))?)*|css|createGlobalStyle|keyframes)\s*`([\s\S]*?)`/g)) {
      const start = m.index + m[0].indexOf('`') + 1;
      out.push([start, start + m[1].length]);
    }
  }
  return out;
}

const inRegions = (regions, i) => regions.some(([a, b]) => i >= a && i < b);

/** Iteratively strip balanced function calls: oklch(), color-mix(), calc(), var(). */
function stripFunctions(value) {
  let prev, out = value;
  do { prev = out; out = out.replace(/[\w-]+\([^()]*\)/g, ' '); } while (out !== prev);
  return out;
}

/** Split a value into top-level tokens, keeping function calls intact. */
function topLevelSlots(value) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of value.trim()) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) { if (cur) { out.push(cur); cur = ''; } continue; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const lengths = (s) => [...s.matchAll(/(-?\d*\.?\d+)(px|rem|em|%|vh|vw|pt|cm|mm|in)?\b/g)].map((m) => parseFloat(m[1]));

const isZeroValue = (v) => {
  const c = v.replace(/!important/gi, '').trim();
  if (!c) return true;
  return /^(0(px|rem|em|%|pt)?)(\s+0(px|rem|em|%|pt)?)*$/.test(c);
};

/** Every custom property declared anywhere in the file's CSS. */
function tokenMap(scrubbed, regions) {
  const map = new Map();
  for (const m of scrubbed.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) {
    if (!inRegions(regions, m.index)) continue;
    const list = map.get(m[1]) || [];
    if (!list.includes(m[2].trim())) list.push(m[2].trim());
    map.set(m[1], list);
  }
  return map;
}

/**
 * Every value a declaration could resolve to. A token declared once per theme has
 * one value per theme, and checking only the last one leaves the rest unchecked.
 */
function resolveAll(value, map, depth = 0, seen = new Set()) {
  if (depth > 6 || !/var\(/.test(value)) return [value];
  const m = value.match(/var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/);
  if (!m) return [value];
  // Keyed on the whole value rather than on the token name: keying by name made a
  // second branch at the same depth bail out and hand back an unresolved string,
  // which then looks like a shorter, legal declaration. The per-branch copy below
  // is redundant while the key stays value-based, and is kept as the second half
  // of that guard. Removing either alone has no observable effect.
  if (seen.has(value)) return [value];
  const nextSeen = new Set(seen).add(value);
  const options = map.get(m[1]) || (m[2] !== undefined ? [m[2]] : [m[0]]);
  const out = [];
  for (const opt of options.slice(0, 12)) {
    const next = value.slice(0, m.index) + opt + value.slice(m.index + m[0].length);
    for (const r of resolveAll(next, map, depth + 1, nextSeen)) {
      if (!out.includes(r)) out.push(r);
      if (out.length >= 200) return out; // bound the fan-out instead of pruning by name
    }
  }
  return out.length ? out : [value];
}

/** Spans of :root / @theme / [data-hs-theme] blocks, with balanced braces. */
function tokenBlocks(scrubbed) {
  const spans = [];
  for (const m of scrubbed.matchAll(/(:root|@theme|\[data-hs-theme[^\]]*\])[^{}]*\{/g)) {
    let depth = 0, i = m.index + m[0].length - 1;
    for (; i < scrubbed.length; i++) {
      if (scrubbed[i] === '{') depth++;
      else if (scrubbed[i] === '}') { depth--; if (depth === 0) { i++; break; } }
    }
    spans.push([m.index, i]);
  }
  return spans;
}

/* -------------------------------------------------------------------- rules */

/*
 * The property patterns below are anchored to a declaration boundary AND stop
 * their capture at a brace. These are two halves of one guard, not two features:
 * a selector may contain a property name (.outline-style:focus), and without both
 * halves a match can start in the selector and swallow the declaration after it.
 * Removing either alone has no observable effect because the other covers it;
 * removing both silently disables the rule for that block.
 */
const RADIUS_PROP = /(?:^|[\s;{])(?:-\w+-)?border-(?:(?:top|bottom)-(?:left|right)-|(?:start|end)-(?:start|end)-)?radius\s*:\s*([^;{}]+)/gi;
const SHADOW_PROP = /(?:^|[\s;{])box-shadow\s*:\s*([^;{}]+)/gi;

export function check(src, file) {
  const out = [];
  const at = lineIndex(src);
  const ext = extname(file);
  const add = (level, rule, pos, message) => out.push({ file, line: at(pos), level, rule, message });

  // One pass over one array: scrub comments and strings inside the CSS regions,
  // then blank everything outside them. Splitting per region was quadratic.
  const regions = cssRegions(src, ext).sort((x, y) => x[0] - y[0]);
  const chars = src.split('');
  for (const [a, b] of regions) scrubCss(chars, src, a, b);
  if (ext !== '.css') {
    let cursor = 0;
    for (const [a, b] of regions) { blank(chars, cursor, a); cursor = Math.max(cursor, b); }
    blank(chars, cursor, chars.length);
  }
  const cssOnly = chars.join('');

  const map = tokenMap(cssOnly, regions);

  const shadowBlur = (rawValue, pos, what) => {
    for (const value of resolveAll(rawValue, map)) {
      if (/^\s*(none|inherit|initial|unset)\s*$/i.test(value)) continue;
      for (const layer of value.split(/,(?![^(]*\))/)) {
        // Read the blur by slot rather than by counting numbers. Stripping calc()
        // removes its digits too, which made a legal offset look like a shorter
        // declaration; and an unresolved token in the blur slot has to be caught,
        // because it hides the blur by making the value look shorter and legal.
        const slots = topLevelSlots(layer).filter((t) => !/^inset$/i.test(t));
        const blurSlot = slots[2];
        if (blurSlot === undefined) continue;
        if (/var\(/.test(blurSlot)) {
          add('warn', 'zero-blur-shadow', pos, `${what} has an unresolved token where the blur belongs (${rawValue.trim()}), check it by hand`);
          continue;
        }
        const blur = lengths(blurSlot)[0];
        if (Number.isFinite(blur) && blur !== 0) {
          add('error', 'zero-blur-shadow', pos, `${what} has blur ${blur}, offset shadows only, blur must be 0`);
          return;
        }
      }
    }
  };

  // sharp-corners, including longhand, logical and vendor-prefixed properties
  // Checked against every value the token could hold, so a radius parked in one
  // theme's block is not excused by another theme declaring the same name as 0.
  // The token itself is not judged by its name: a variable called
  // --carousel-round-trip is not a radius, and flagging it was a false positive.
  for (const m of cssOnly.matchAll(RADIUS_PROP)) {
    for (const value of resolveAll(m[1], map)) {
      if (/var\(/.test(value)) {
        add('warn', 'sharp-corners', m.index, `radius resolves to an unknown token (${m[1].trim()}), check it by hand`);
      } else if (!isZeroValue(value)) {
        add('error', 'sharp-corners', m.index, `border-radius resolves to ${value.trim()}, radius is 0 everywhere in Hardstock`);
        break;
      }
    }
  }
  for (const m of src.matchAll(/(?<![\w-])rounded-(?:\[[^\]]+\]|(?!none\b|0\b)(?:sm|md|lg|xl|2xl|3xl|full|t|b|l|r|s|e|tl|tr|bl|br|ss|se|ee|es)(?:-(?:sm|md|lg|xl|2xl|3xl|full|\[[^\]]+\]))?)(?![\w-])/g)) {
    add('error', 'sharp-corners', m.index, `Tailwind class "${m[0]}" adds a radius`);
  }
  for (const m of src.matchAll(/class(?:Name)?\s*=\s*["'][^"']*\brounded\b(?!-)[^"']*["']/g)) {
    add('error', 'sharp-corners', m.index, 'Tailwind class "rounded" adds a radius');
  }

  // zero-blur-shadow, declarations and tokens alike
  for (const m of cssOnly.matchAll(SHADOW_PROP)) shadowBlur(m[1], m.index, 'box-shadow');
  for (const m of src.matchAll(/(?<![\w-])shadow-(?:\[[^\]]+\]|(?:sm|md|lg|xl|2xl|inner))(?![\w-])/g)) {
    add('warn', 'zero-blur-shadow', m.index, `Tailwind class "${m[0]}" is a blurred shadow, use shadow-brutal-*`);
  }

  // no-soft-motion
  for (const m of cssOnly.matchAll(/cubic-bezier\(([^)]+)\)/gi)) {
    const [, y1, , y2] = m[1].split(',').map((n) => parseFloat(n));
    if ([y1, y2].some((v) => Number.isFinite(v) && (v < 0 || v > 1))) {
      add('error', 'no-soft-motion', m.index, `cubic-bezier(${m[1].trim()}) overshoots, easing must stay inside [0,1]`);
    }
  }
  for (const m of cssOnly.matchAll(/scale(?:3d|X|Y|Z)?\(\s*([\d.]+)/gi)) {
    if (parseFloat(m[1]) > 1) add('error', 'no-soft-motion', m.index, `scale(${m[1]}), hover is displacement, never magnification`);
  }
  for (const m of cssOnly.matchAll(/(?:^|[\s;{])scale\s*:\s*([\d.]+)/gi)) {
    if (parseFloat(m[1]) > 1) add('error', 'no-soft-motion', m.index, `scale: ${m[1]}, hover is displacement, never magnification`);
  }
  for (const m of cssOnly.matchAll(/(?:backdrop-)?filter\s*:\s*[^;{}]*\bblur\(/gi)) {
    add('error', 'no-soft-motion', m.index, 'blur filter, nothing in this language is frosted');
  }
  for (const m of cssOnly.matchAll(/transition(?:-duration)?\s*:\s*([^;{}]+)/gi)) {
    const secs = [...m[1].matchAll(/(\d*\.?\d+)(ms|s)\b/g)].map((n) => (n[2] === 'ms' ? +n[1] / 1000 : +n[1]));
    if (secs.some((s) => s > 0.15)) add('warn', 'no-soft-motion', m.index, `transition longer than 0.15s (${m[1].trim()})`);
  }

  // reduced-motion
  if (/@keyframes|animation\s*:|transition\s*:/.test(cssOnly) && !/prefers-reduced-motion/.test(cssOnly)) {
    add('error', 'reduced-motion', 0, 'file animates but never declares a prefers-reduced-motion block');
  }

  // visible-focus: outline removed by any spelling
  for (const m of cssOnly.matchAll(/(?:^|[\s;{])outline(?:-style|-width|-color)?\s*:\s*([^;{}]+)/gi)) {
    for (const raw of resolveAll(m[1], map)) {
      const v = raw.replace(/!important/gi, '').trim().toLowerCase();
      if (/^(none|0|0px|0rem|0em|transparent|hidden)$/.test(v)) {
        add('error', 'visible-focus', m.index, `outline removed (${v}), the ink focus ring is required`);
        break;
      }
    }
  }

  // no-emoji
  for (const m of src.matchAll(/\p{Emoji_Presentation}|\uFE0F/gu)) {
    add('error', 'no-emoji', m.index, 'emoji in markup, use a monoline SVG or an uppercase mono label');
  }

  // one-accent: distinct fills across primary-action rules, ignoring state variants
  const primaryFills = new Map();
  for (const m of cssOnly.matchAll(/([.#][\w-]*(?:btn|button|cta|action)[\w-]*--?primary[\w-]*)([^{]*)\{([^}]*)\}/gi)) {
    if (/[:[]/.test(m[2])) continue; // :hover, :focus, [disabled] are the same accent
    for (const f of m[3].matchAll(/background(?:-color)?\s*:\s*([^;]+)/gi)) {
      primaryFills.set(resolveAll(f[1], map)[0].trim(), m.index);
    }
  }
  if (primaryFills.size > 1) {
    add('error', 'one-accent', [...primaryFills.values()][0], `${primaryFills.size} different primary-action fills: ${[...primaryFills.keys()].join(', ')}`);
  }

  // on-fill-on-neutral: the mistake behind this project's two worst defects.
  // on-fill never flips between themes; the neutral surfaces do. Putting the two
  // together paints dark text on a dark surface the moment a dark theme loads.
  const NEUTRAL = /--[\w-]*(canvas|surface-raised|surface-high|surface-plain|plain|raised|high)\b/;
  for (const m of cssOnly.matchAll(/\{([^{}]*)\}/g)) {
    const body = m[1];
    if (!/color\s*:\s*var\(\s*--[\w-]*on-fill/.test(body)) continue;
    const bg = body.match(/background(?:-color)?\s*:\s*([^;]+)/);
    if (bg && NEUTRAL.test(bg[1])) {
      add('error', 'on-fill-on-neutral', m.index, `on-fill text over ${bg[1].trim()}: on-fill does not flip with the theme, this surface does`);
    }
  }

  // no-hardcoded-hex and its rgb/hsl cousins, outside the token block
  const blocks = tokenBlocks(cssOnly);
  const inTokenBlock = (i) => blocks.some(([a, b]) => i >= a && i < b);
  for (const m of cssOnly.matchAll(/(?<![\w"'=])#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g)) {
    if (inTokenBlock(m.index)) continue;
    if (TOKEN_HEXES.has(m[0].toLowerCase())) continue;
    add('warn', 'no-hardcoded-hex', m.index, `${m[0]} is not a Hardstock token, reference a CSS variable instead`);
  }
  for (const m of cssOnly.matchAll(/\b(rgba?|hsla?|oklch|lab)\(/gi)) {
    if (inTokenBlock(m.index)) continue;
    add('warn', 'no-hardcoded-hex', m.index, `${m[1]}() color outside the token block, reference a CSS variable instead`);
  }

  // JS style objects: camelCase equivalents of the two headline rules
  if (JS_LIKE.has(ext)) {
    for (const m of src.matchAll(/borderRadius\s*:\s*(['"`]?)([^,'"`}\n]+)\1/g)) {
      if (!isZeroValue(String(m[2]))) add('error', 'sharp-corners', m.index, `borderRadius: ${m[2].trim()}, radius is 0 everywhere in Hardstock`);
    }
    for (const m of src.matchAll(/boxShadow\s*:\s*(['"`])([^'"`]*)\1/g)) shadowBlur(m[2], m.index, 'boxShadow');
  }

  return out;
}

/* ---------------------------------------------------------------------- io */

function walk(target, acc = [], seen = new Set()) {
  const st = lstatSync(target);
  if (st.isSymbolicLink()) {
    const real = realpathSync(target);
    if (seen.has(real)) return acc; // symlink loop
    seen.add(real);
    return walk(real, acc, seen);
  }
  if (st.isDirectory()) {
    const real = realpathSync(target);
    if (seen.has(real)) return acc;
    seen.add(real);
    for (const entry of readdirSync(target)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      try { walk(join(target, entry), acc, seen); }
      catch (e) { acc.push({ __unreadable: join(target, entry), reason: e.code || String(e) }); }
    }
  } else if (EXTS.has(extname(target))) acc.push(target);
  return acc;
}

/* Imported as a module, only check() is exposed. Run directly, the CLI takes
   over. realpath on both sides, or an npm bin symlink silently no-ops. */
const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
})();
if (invokedDirectly) main();

function main() {
  const argv = process.argv.slice(2);
  const KNOWN = new Set(['--json', '--quiet', '--help']);
  const unknown = argv.filter((a) => a.startsWith('--') && !KNOWN.has(a));
  if (unknown.length || argv.includes('--help')) {
    console.log('usage: validate.mjs [--json] [--quiet] [files or directories...]');
    if (unknown.length) { console.error(`unknown option(s): ${unknown.join(', ')}`); process.exit(2); }
    process.exit(0);
  }

  const asJson = argv.includes('--json');
  const quiet = argv.includes('--quiet');
  const targets = argv.filter((a) => !a.startsWith('--'));

  let unreadable = [];
  const collected = (targets.length ? targets : [join(ROOT, 'examples'), join(ROOT, 'dist')]).flatMap((t) => {
    try { return walk(t); } catch (e) { unreadable.push({ target: t, reason: e.code || String(e) }); return []; }
  });
  const files = collected.filter((f) => typeof f === 'string');
  unreadable = unreadable.concat(collected.filter((f) => typeof f !== 'string').map((f) => ({ target: f.__unreadable, reason: f.reason })));

  let findings = files.flatMap((f) => check(readFileSync(f, 'utf8'), f));
  if (quiet) findings = findings.filter((f) => f.level === 'error');
  findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));

  const errors = findings.filter((f) => f.level === 'error').length;
  const warns = findings.filter((f) => f.level === 'warn').length;

  if (asJson) {
    console.log(JSON.stringify({ files: files.length, errors, warnings: warns, unreadable, findings }, null, 2));
  } else {
    const rel = (p) => p.replace(ROOT + '/', '');
    let current = null;
    for (const f of findings) {
      if (f.file !== current) { current = f.file; console.log(`\n  ${rel(f.file)}`); }
      const tag = f.level === 'error' ? 'ERROR' : 'WARN ';
      console.log(`    ${tag} ${String(f.line).padStart(4)}  [${f.rule}] ${f.message.replace(/\s+/g, ' ').slice(0, 160)}`);
    }
    for (const u of unreadable) console.log(`\n  UNREADABLE ${u.target} (${u.reason})`);
    console.log(
      `\n  ${files.length} file(s) checked, ${errors} error(s), ${warns} warning(s)` +
      (unreadable.length ? `, ${unreadable.length} unreadable\n` : '') +
      (errors === 0 && !unreadable.length ? '\n  Mechanical invariants hold. Now check the manual list in references/generation-protocol.md.\n' : '\n')
    );
  }

  // An unreadable target is a failure. Reporting zero findings for a path that
  // was never read is how a checker lies.
  process.exit(unreadable.length ? 2 : errors > 0 ? 1 : 0);
}
