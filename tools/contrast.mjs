#!/usr/bin/env node
/**
 * Hardstock contrast checker.
 *
 * Every theme in design/themes.json has to clear the floors in
 * deriveNewTheme.contrastFloor before it ships. This computes WCAG 2.1 relative
 * luminance and reports the ratios, so "the accent is bright enough" is measured
 * rather than asserted.
 *
 *   node tools/contrast.mjs                    # check every shipped theme
 *   node tools/contrast.mjs '#faf5e8' '#1c1915' '#ff8db4'   # check a candidate
 *
 * Exit code is 1 if any floor is missed.
 */

import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { realpathSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export function luminance(hex) {
  if (typeof hex !== 'string') throw new TypeError(`expected a hex color string, got ${typeof hex}`);
  const h = hex.trim().replace(/^#/, '');
  // Alpha cannot participate in a WCAG ratio: the result depends on what is
  // behind it. Rejecting is honest, silently dropping it is not.
  if (/^[0-9a-f]{8}$/i.test(h)) throw new Error(`${hex} carries alpha; composite it against its backdrop first`);
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h)) throw new Error(`${hex} is not a 3 or 6 digit hex color`);
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const r2 = (n) => Math.round(n * 100) / 100;

export function checkTheme(t, floors, muted) {
  const onFill = t.onFill || '#1c1915';
  const rows = [
    ['ink on canvas', contrast(t.ink, t.canvas), floors.inkOnCanvas],
    ['ink on accent', contrast(t.ink, t.accent), floors.inkOnAccent],
    ['ink on surface', contrast(t.ink, t.surfaceRaised), floors.inkOnCanvas],
    ['muted on canvas', contrast(muted, t.canvas), floors.mutedOnCanvas],
  ];
  if (t.surfacePlain && floors.inkOnSurfacePlain) {
    rows.push(['ink on plain', contrast(t.ink, t.surfacePlain), floors.inkOnSurfacePlain]);
  }
  // on-fill on a neutral surface is unreadable by construction in a dark theme, so
  // it is not a floor a theme can clear. That one is a component mistake, and the
  // validator carries it as on-fill-on-neutral.
  // Text on a colored fill is always ink-dark, in every theme including dark ones.
  // Text on a colored fill is on-fill in every theme, so a dark theme's accent is
  // measured against on-fill rather than against its own light ink.
  if (t.dark) rows[1] = ['on-fill on accent', contrast(onFill, t.accent), floors.inkOnAccent];
  return rows;
}

/** Returns the number of missed floors. Prints a report as it goes. */
export function report(argv = []) {
  let failed = 0;
  const line = ([label, ratio, floor]) => {
    const ok = ratio >= floor;
    if (!ok) failed++;
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${label.padEnd(18)} ${r2(ratio).toFixed(2)}:1  (floor ${floor})`);
  };

  const flags = argv.filter((a) => a.startsWith('--'));
  const colors = argv.filter((a) => !a.startsWith('--'));
  const dark = flags.includes('--dark');

  if (colors.length === 1 || colors.length === 2) {
    console.error('usage: contrast.mjs [--dark] <canvas> <ink> <accent> [surface]');
    console.error('       contrast.mjs                     (re-check every shipped theme)');
    return -1; // usage error, not a contrast failure
  }
  if (colors.length >= 3) {
    const [canvas, ink, accent, surface] = colors;
    console.log(`\ncandidate  canvas ${canvas}  ink ${ink}  accent ${accent}${dark ? '  (dark)' : ''}`);
    // A dark candidate has to be judged the way themes.json judges one: muted is
    // the warm variant, and the accent is measured against the dark ink that
    // actually sits on it. Without this, the documented command fails a theme
    // the repository itself ships.
    checkTheme(
      { canvas, ink, accent, surfaceRaised: surface || canvas, dark },
      { inkOnCanvas: 12, inkOnAccent: 4.5, mutedOnCanvas: 4.5 },
      dark ? '#a8a08c' : '#56606b'
    ).forEach(line);
    return failed;
  }

  const themes = JSON.parse(readFileSync(join(ROOT, 'design/themes.json'), 'utf8'));
  const tokens = JSON.parse(readFileSync(join(ROOT, 'design/tokens.json'), 'utf8'));
  const floors = themes.deriveNewTheme.contrastFloor;
  for (const t of themes.themes) {
    const muted = t.mutedText || tokens.color.muted.value;
    console.log(`\n${t.id}`);
    checkTheme(t, floors, muted).forEach(line);
  }
  return failed;
}

/* Imported as a module, only the pure helpers are exposed. */
/* realpath on both sides, or a symlinked invocation silently no-ops. */
const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try { return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href; }
  catch { return false; }
})();
if (invokedDirectly) {
  const failed = report(process.argv.slice(2));
  if (failed >= 0) console.log(failed ? `\n${failed} floor(s) missed\n` : '\nAll contrast floors clear\n');
  process.exit(failed === 0 ? 0 : failed < 0 ? 2 : 1);
}
