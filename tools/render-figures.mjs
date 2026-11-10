#!/usr/bin/env node
/**
 * Renders every figure in screens/ from design/themes.json and design/tokens.json.
 *
 *   node tools/render-figures.mjs
 *
 * The figures are documentation, so they must not drift from the tokens they
 * document. Generating them means a theme change or a token change reaches the
 * pictures too. Zero dependencies, same as everything else here.
 *
 * SVG text falls back to system fonts wherever Space Grotesk and Space Mono are
 * not installed, so nothing is laid out tight against a measured string.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'screens');

const themes = JSON.parse(readFileSync(join(ROOT, 'design/themes.json'), 'utf8'));
const tokens = JSON.parse(readFileSync(join(ROOT, 'design/tokens.json'), 'utf8'));

const T = Object.fromEntries(themes.themes.map((t) => [t.id, t]));
const CAT = tokens.color.categorical;
const MUTED = tokens.color.muted.value;

/* ------------------------------------------------------------- primitives */

// Values reach XML attributes, so quotes have to go too or a theme value can
// close the attribute and inject one of its own.
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** A Hardstock surface: 2px ink border, square corners, zero-blur offset shadow. */
function block(x, y, w, h, { fill = 'none', ink = '#1c1915', off = 2, sw = 2 } = {}) {
  const f = esc(fill), k = esc(ink);
  const shadow = off > 0 ? `<rect x="${x + off}" y="${y + off}" width="${w}" height="${h}" fill="${k}"/>` : '';
  return `${shadow}<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" stroke="${k}" stroke-width="${sw}"/>`;
}

function text(x, y, s, { font = 'd', size = 14, weight = 400, fill = '#1c1915', anchor = 'start', track = 0 } = {}) {
  const fam = font === 'm'
    ? '"Space Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
    : font === 'b'
      ? 'ui-sans-serif, system-ui, -apple-system, sans-serif'
      : '"Space Grotesk", system-ui, -apple-system, sans-serif';
  const tr = track ? ` letter-spacing="${track}"` : '';
  return `<text x="${x}" y="${y}" font-family='${fam}' font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${tr}>${esc(s)}</text>`;
}

/** Uppercase mono micro-label, the system's signature move. */
const label = (x, y, s, fill = MUTED, size = 10) => text(x, y, String(s).toUpperCase(), { font: 'm', size, weight: 700, fill, track: 1 });

/**
 * label defaults to on-fill dark, which is right on a colored fill and wrong on a
 * neutral surface in a dark theme. Callers pass `label` for neutral buttons.
 */
function button(x, y, w, h, s, { fill, ink = '#1c1915', off = 2, size = 13, label = '#1c1915' } = {}) {
  return block(x, y, w, h, { fill, ink, off }) + text(x + w / 2, y + h / 2 + size * 0.36, s, { size, weight: 700, fill: label, anchor: 'middle' });
}

function badge(x, y, s, { fill, ink = '#1c1915', w = null } = {}) {
  const width = w ?? Math.max(46, String(s).length * 7 + 16);
  return block(x, y, width, 18, { fill, ink }) + text(x + 7, y + 12.5, String(s).toUpperCase(), { font: 'm', size: 9, weight: 700, track: 1 });
}

function avatar(x, y, size, initial, fill, ink = '#1c1915') {
  return block(x, y, size, size, { fill, ink }) + text(x + size / 2, y + size / 2 + size * 0.18, initial, { size: size * 0.42, weight: 700, anchor: 'middle' });
}

function svg(w, h, body, { bg = '#ffffff', title = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<rect width="${w}" height="${h}" fill="${bg}"/>
${body}
</svg>
`;
}

const write = (name, content) => { writeFileSync(join(OUT, name), content); console.log(`  ${name}  ${(content.length / 1024).toFixed(1)}kb`); };

/* --------------------------------------------------------- figure: landing */

/**
 * A marketing page, which is what most people build first. Nav, hero with a
 * single accent mark, two calls to action, then numbered blocks. The same
 * function renders every theme, which is the point being demonstrated.
 */
function landing(themeId) {
  const t = T[themeId];
  const ink = t.ink, canvas = t.canvas, raised = t.surfaceRaised, accent = t.accent;
  const plain = t.surfacePlain || '#ffffff';
  const mute = t.mutedText || MUTED;
  const W = 900, H = 480, mid = W / 2;
  let s = '';

  s += block(1, 1, W - 2, H - 2, { fill: canvas, ink, off: 0 });

  // nav
  s += block(20, 20, 24, 24, { fill: accent, ink });
  s += text(56, 39, 'Hardstock', { size: 17, weight: 700, fill: ink });
  // Lay the nav out by measured advance and right-align it against the CTA,
  // otherwise a fixed step leaves "components" crowding its neighbour.
  const navItems = ['grammar', 'components', 'print'];
  const GAP = 30, CH = 7.25;
  const navWidth = navItems.reduce((w, n) => w + n.length * CH, 0) + GAP * (navItems.length - 1);
  let navX = 724 - navWidth;
  for (const n of navItems) {
    s += text(navX, 39, n, { font: 'm', size: 12, fill: ink });
    navX += n.length * CH + GAP;
  }
  s += button(748, 18, 130, 30, 'Read the spec', { fill: accent, ink, size: 12 });
  s += `<line x1="1" y1="64" x2="${W - 1}" y2="64" stroke="${ink}" stroke-width="2"/>`;

  // hero
  s += block(mid - 118, 100, 236, 24, { fill: t.dark ? raised : '#ffffff', ink });
  s += text(mid, 116, 'NEO-BRUTALIST DESIGN LANGUAGE', { font: 'm', size: 10, weight: 700, fill: ink, anchor: 'middle', track: 1 });

  s += text(mid, 176, 'Taste is not a vibe.', { size: 40, weight: 700, fill: ink, anchor: 'middle' });
  // the accent mark: one word, highlighted, never two
  s += block(mid - 128, 194, 256, 44, { fill: accent, ink, off: 0, sw: 0 });
  s += text(mid, 227, 'Write it down.', { size: 40, weight: 700, fill: '#1c1915', anchor: 'middle' });

  s += text(mid, 264, 'Exact values, an explicit line between what may move and what may not,', { font: 'b', size: 14, fill: mute, anchor: 'middle' });
  s += text(mid, 284, 'and rules a machine can check. Screen and print.', { font: 'b', size: 14, fill: mute, anchor: 'middle' });

  s += button(mid - 158, 310, 150, 38, 'Get started', { fill: accent, ink, size: 14 });
  s += button(mid + 8, 310, 150, 38, 'See the rules', { fill: plain, ink, size: 14, label: ink });

  // numbered blocks
  s += `<line x1="1" y1="386" x2="${W - 1}" y2="386" stroke="${ink}" stroke-width="2"/>`;
  s += `<rect x="2" y="388" width="${W - 4}" height="${H - 390}" fill="${raised}"/>`;
  const cols = [
    ['01', 'The grammar', 'Hard borders, offset shadows,', 'square corners, one accent.'],
    ['02', 'The skin', 'Three variables move. Canvas,', 'ink, accent. Nothing else.'],
    ['03', 'The proof', 'A validator that fails the build,', 'and a test that proves it fires.'],
  ];
  cols.forEach(([n, title, l1, l2], i) => {
    const x = 30 + i * 292;
    // On-fill only where the square carries the accent; a neutral fill takes ink.
    s += block(x, 408, 26, 26, { fill: i === 0 ? accent : plain, ink });
    s += text(x + 13, 426, n, { font: 'm', size: 11, weight: 700, fill: i === 0 ? '#1c1915' : ink, anchor: 'middle' });
    s += text(x + 38, 421, title, { size: 15, weight: 700, fill: ink });
    s += text(x + 38, 440, l1, { font: 'b', size: 11.5, fill: ink });
    s += text(x + 38, 456, l2, { font: 'b', size: 11.5, fill: ink });
  });

  return svg(W, H, s, { bg: '#ffffff', title: `Hardstock landing page in the ${themeId} theme` });
}

/* ------------------------------------------------------- figure: dashboard */

/**
 * An app shell, the other thing this language gets used for. A console with
 * metrics and a table rather than a chat client: the point is the shell, the
 * hard-lined table and the status badges, not any particular product shape.
 */
function dashboard(themeId) {
  const t = T[themeId];
  const ink = t.ink, canvas = t.canvas, raised = t.surfaceRaised, accent = t.accent;
  const plain = t.surfacePlain || '#ffffff';
  const mute = t.mutedText || MUTED;
  const W = 900, H = 440, SB = 200;
  let s = '';

  s += block(1, 1, W - 2, H - 2, { fill: canvas, ink, off: 0 });
  s += `<rect x="2" y="2" width="${SB - 2}" height="${H - 4}" fill="${raised}"/>`;
  s += `<line x1="${SB}" y1="1" x2="${SB}" y2="${H - 1}" stroke="${ink}" stroke-width="2"/>`;

  s += block(20, 20, 24, 24, { fill: accent, ink });
  s += text(56, 39, 'Hardstock', { size: 17, weight: 700, fill: ink });

  s += label(20, 82, 'Console', mute);
  s += block(20, 92, 160, 30, { fill: accent, ink });
  s += text(32, 112, 'Overview', { font: 'm', size: 13, fill: '#1c1915' });
  ['Runs', 'Tokens', 'Themes', 'Settings'].forEach((n, i) => {
    s += text(32, 146 + i * 28, n, { font: 'm', size: 13, fill: ink });
  });

  // top bar
  s += text(224, 40, 'Overview', { size: 16, weight: 700, fill: ink });
  s += badge(770, 20, 'all green', { fill: CAT.lime, ink, w: 104 });
  s += `<line x1="${SB + 1}" y1="64" x2="${W - 1}" y2="64" stroke="${ink}" stroke-width="2"/>`;

  // stat strip
  s += `<line x1="${SB + 1}" y1="150" x2="${W - 1}" y2="150" stroke="${ink}" stroke-width="2"/>`;
  s += `<rect x="${SB + 1}" y="66" width="${W - SB - 2}" height="84" fill="${raised}"/>`;
  [['7', 'Themes'], ['15', 'Invariants'], ['0px', 'Radius'], ['0', 'Dependencies']].forEach(([n, l], i) => {
    const x = SB + 60 + i * 170;
    s += text(x, 110, n, { size: 30, weight: 700, fill: ink, anchor: 'middle' });
    s += text(x, 130, l.toUpperCase(), { font: 'm', size: 10, weight: 700, fill: mute, anchor: 'middle', track: 1 });
  });

  // table
  const tx = 224, ty = 178, tw = 652;
  s += block(tx, ty, tw, 210, { fill: plain, ink, off: 0 });
  s += `<rect x="${tx + 1}" y="${ty + 1}" width="${tw - 2}" height="30" fill="${raised}"/>`;
  s += `<line x1="${tx}" y1="${ty + 31}" x2="${tx + tw}" y2="${ty + 31}" stroke="${ink}" stroke-width="2"/>`;
  ['Check', 'Scope', 'Last run', 'State'].forEach((h, i) => {
    s += text(tx + 16 + i * 165, ty + 21, h.toUpperCase(), { font: 'm', size: 10, weight: 700, fill: ink, track: 1 });
  });
  const rows = [
    ['sharp-corners', 'screen', '09:14', 'pass', CAT.lime],
    ['zero-blur-shadow', 'screen', '09:14', 'pass', CAT.lime],
    ['contrast floors', '7 themes', '09:14', 'pass', CAT.lime],
    ['k-only hairlines', 'print', 'manual', 'review', CAT.yellow],
    ['physical proof', 'print', 'pending', 'blocked', CAT.pink],
  ];
  rows.forEach(([name, scope, when, state, fill], i) => {
    const ry = ty + 31 + i * 35;
    if (i) s += `<line x1="${tx}" y1="${ry}" x2="${tx + tw}" y2="${ry}" stroke="${ink}" stroke-width="1"/>`;
    s += text(tx + 16, ry + 23, name, { font: 'm', size: 12.5, fill: ink });
    s += text(tx + 181, ry + 23, scope, { font: 'b', size: 12.5, fill: ink });
    s += text(tx + 346, ry + 23, when, { font: 'm', size: 12.5, fill: mute });
    s += badge(tx + 511, ry + 9, state, { fill, ink, w: 62 });
  });

  return svg(W, H, s, { bg: '#ffffff', title: `Hardstock console in the ${themeId} theme` });
}

/* --------------------------------------------------------- figure: anatomy */

function anatomy() {
  const ink = '#1c1915', accent = T['paper-pink'].accent, raised = T['paper-pink'].surfaceRaised;
  const W = 900, H = 360;
  let s = `<rect width="${W}" height="${H}" fill="#fff8f4"/>`;
  const x = 300, y = 96, w = 300, h = 150;

  // the specimen
  s += block(x, y, w, h, { fill: raised, ink });
  s += label(x + 24, y + 34, 'Open task', MUTED);
  s += text(x + 24, y + 62, 'One block', { size: 20, weight: 700 });
  s += text(x + 24, y + 84, 'Tiled, never nested.', { font: 'b', size: 13 });
  s += button(x + 24, y + 100, 80, 30, 'Take it', { fill: accent, ink });

  const lead = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${ink}" stroke-width="1" stroke-dasharray="3 3"/>`;
  const dot = (cx, cy) => `<rect x="${cx - 2.5}" y="${cy - 2.5}" width="5" height="5" fill="${ink}"/>`;

  // 1 border
  s += lead(x, y + 20, 150, y + 20) + dot(x, y + 20);
  s += label(24, y + 12, '01  Border');
  s += text(24, y + 32, '2px solid ink, on every', { font: 'b', size: 13 });
  s += text(24, y + 50, 'grouped or interactive thing', { font: 'b', size: 13 });

  // 2 shadow
  s += lead(x + w + 2, y + h + 2, x + w + 90, y + h + 40) + dot(x + w + 2, y + h + 2);
  s += label(x + w + 60, y + h + 60, '02  Shadow');
  s += text(x + w + 60, y + h + 80, 'Offset 2px down and right.', { font: 'b', size: 13 });
  s += text(x + w + 60, y + h + 98, 'Blur is always zero.', { font: 'b', size: 13 });

  // 3 corner. The leader runs to the left of the caption so it never crosses it.
  const cx = x + w, cy = y;
  s += `<path d="M${cx - 26} ${cy} L${cx} ${cy} L${cx} ${cy + 26}" stroke="${accent}" stroke-width="4" fill="none"/>`;
  s += lead(cx + 2, cy, cx + 54, cy - 26) + dot(cx, cy);
  s += label(cx + 62, cy - 32, '03  Corner');
  s += text(cx + 62, cy - 12, 'Radius 0, everywhere.', { font: 'b', size: 13 });
  s += text(cx + 62, cy + 6, 'Avatars and toggles too.', { font: 'b', size: 13 });

  // 4 padding. An L-shaped corner guide, so the dashes do not run through the copy.
  const px = x + 24, py = y + 16;
  s += `<path d="M${px} ${py + 46} L${px} ${py} L${px + 70} ${py}" fill="none" stroke="${ink}" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>`;
  s += `<path d="M${x} ${py + 24} L${px} ${py + 24}" stroke="${ink}" stroke-width="1"/>`;
  s += `<path d="M${x + 4} ${py + 20} L${x} ${py + 24} L${x + 4} ${py + 28}" fill="none" stroke="${ink}" stroke-width="1"/>`;
  s += `<path d="M${px - 4} ${py + 20} L${px} ${py + 24} L${px - 4} ${py + 28}" fill="none" stroke="${ink}" stroke-width="1"/>`;
  s += lead(x + 12, py + 24, 150, y + h + 46) + dot(x + 12, py + 24);
  s += label(24, y + h + 62, '04  Padding');
  s += text(24, y + h + 82, '24px, from a 4px base scale', { font: 'b', size: 13 });

  s += label(24, 36, 'Anatomy of one block', ink, 12);
  return svg(W, H, s, { bg: '#fff8f4', title: 'Anatomy of a Hardstock block: 2px ink border, zero-blur offset shadow, square corners, 24px padding' });
}

/* ------------------------------------------------------- figure: elevation */

function elevation() {
  const ink = '#1c1915', accent = T['paper-pink'].accent;
  const W = 900, H = 330;
  let s = `<rect width="${W}" height="${H}" fill="#fff8f4"/>`;

  s += label(24, 36, 'Shadow scale, blur always zero', ink, 12);
  const steps = [['xs', 1, 'pressed, tooltips'], ['sm', 2, 'cards, buttons'], ['md', 4, 'hover, toasts'], ['lg', 6, 'hero, modals']];
  steps.forEach(([name, off, use], i) => {
    const x = 24 + i * 175, y = 66;
    s += block(x, y, 130, 76, { fill: '#ffffff', ink, off });
    s += text(x + 65, y + 44, `${off}px`, { size: 20, weight: 700, anchor: 'middle' });
    s += label(x, y + 104, name, ink);
    s += text(x, y + 122, use, { font: 'b', size: 12, fill: MUTED });
  });

  s += `<line x1="24" y1="196" x2="${W - 24}" y2="196" stroke="${ink}" stroke-width="2"/>`;
  s += label(24, 226, 'Press: displacement, never scale', ink, 12);

  const states = [['default', 0, 2], ['hover', 2, 1], ['active', 2, 0]];
  states.forEach(([name, shift, off], i) => {
    const x = 430 + i * 160, y = 240;
    s += button(x + shift, y + shift, 110, 34, 'Take it', { fill: accent, ink, off });
    s += label(x, y + 56, name, MUTED);
  });
  s += text(24, 252, 'translate(2px, 2px) while the', { font: 'b', size: 13 });
  s += text(24, 270, 'shadow shrinks, then sits flat.', { font: 'b', size: 13 });
  s += text(24, 288, 'No spring, no magnification.', { font: 'b', size: 13, fill: MUTED });

  return svg(W, H, s, { bg: '#fff8f4', title: 'Shadow scale and button press states' });
}

/* ------------------------------------------------------------ figure: type */

function type() {
  const ink = '#1c1915';
  const W = 900, H = 340;
  let s = `<rect width="${W}" height="${H}" fill="#fff8f4"/>`;

  s += label(24, 36, 'Three families, one job each', ink, 12);

  s += label(24, 74, 'Display  ·  Space Grotesk', MUTED);
  s += text(24, 116, 'Headlines and buttons', { size: 34, weight: 700 });

  s += `<line x1="24" y1="152" x2="${W - 24}" y2="152" stroke="${ink}" stroke-width="1"/>`;
  s += label(24, 168, 'Mono  ·  Space Mono', MUTED);
  s += text(24, 200, '09:14   #releases   ASSIGNED   0.5mm', { font: 'm', size: 20 });
  s += text(24, 222, 'badges, timestamps, status, labels', { font: 'b', size: 12, fill: MUTED });

  s += `<line x1="24" y1="242" x2="${W - 24}" y2="242" stroke="${ink}" stroke-width="1"/>`;
  s += label(24, 270, 'Body  ·  system sans', MUTED);
  s += text(24, 296, 'Deliberately anonymous. The pair above carries the voice.', { font: 'b', size: 15 });

  // scale ladder
  const ladder = [['12', 12], ['16', 16], ['24', 24], ['36', 36], ['48', 48]];
  let lx = 560;
  s += label(560, 74, 'Scale', MUTED);
  ladder.forEach(([n, sz]) => {
    s += text(lx, 120, 'Aa', { size: sz, weight: 700 });
    s += label(lx, 136, n, MUTED, 9);
    lx += sz * 1.5 + 14;
  });

  return svg(W, H, s, { bg: '#fff8f4', title: 'Hardstock type system: Space Grotesk display, Space Mono metadata, system sans body' });
}

/* ------------------------------------------------------ figure: components */

function components() {
  const t = T['paper-pink'];
  const ink = t.ink, accent = t.accent;
  const W = 900, H = 420;
  let s = `<rect width="${W}" height="${H}" fill="${t.canvas}"/>`;

  s += label(24, 36, 'Components', ink, 12);

  // buttons
  s += label(24, 68, 'Buttons', MUTED);
  s += button(24, 80, 100, 34, 'Primary', { fill: accent, ink });
  s += button(136, 80, 110, 34, 'Secondary', { fill: '#ffffff', ink });
  s += block(258, 80, 90, 34, { fill: 'none', ink, off: 0 }) + text(303, 101, 'Ghost', { size: 13, weight: 700, anchor: 'middle' });

  // badges
  s += label(400, 68, 'Status, always with a word', MUTED);
  s += badge(400, 84, 'online', { fill: CAT.lime, ink });
  s += badge(470, 84, 'pending', { fill: CAT.yellow, ink });
  s += badge(548, 84, 'failed', { fill: CAT.pink, ink });
  s += badge(614, 84, 'queued', { fill: CAT.cyan, ink });

  // inputs
  s += `<line x1="24" y1="152" x2="${W - 24}" y2="152" stroke="${ink}" stroke-width="1"/>`;
  s += label(24, 172, 'Field', MUTED);
  s += block(24, 182, 240, 38, { fill: '#ffffff', ink, off: 0 });
  s += text(38, 206, 'builder', { font: 'b', size: 14, fill: MUTED });

  s += label(290, 172, 'Invalid', MUTED);
  s += block(290, 182, 240, 38, { fill: '#ffffff', ink: CAT.pink, off: 0 });
  s += text(304, 206, 'not-a-key', { font: 'b', size: 14 });
  s += text(290, 236, 'Must be 32 characters.', { font: 'm', size: 11 });

  // square controls
  s += label(560, 172, 'Square controls', MUTED);
  s += block(560, 184, 18, 18, { fill: accent, ink });
  s += `<rect x="565" y="189" width="8" height="8" fill="${ink}"/>`;
  s += text(586, 198, 'checkbox', { font: 'b', size: 13 });
  s += block(560, 214, 44, 24, { fill: CAT.lime, ink });
  s += `<rect x="584" y="218" width="16" height="16" fill="${ink}"/>`;
  s += text(614, 231, 'toggle, no pill', { font: 'b', size: 13 });

  // avatars
  s += label(760, 172, 'Avatars', MUTED);
  ['B', 'R', 'O'].forEach((i, n) => { s += avatar(760 + n * 44, 182, 36, i, [CAT.cyan, CAT.lavender, CAT.orange][n], ink); });
  s += text(760, 236, 'square, never round', { font: 'b', size: 12, fill: MUTED });

  // table
  s += `<line x1="24" y1="272" x2="${W - 24}" y2="272" stroke="${ink}" stroke-width="1"/>`;
  s += label(24, 302, 'Table, a hard-lined grid', MUTED);
  const tx = 24, ty = 314, tw = 520;
  s += block(tx, ty, tw, 86, { fill: '#ffffff', ink, off: 0 });
  s += `<rect x="${tx + 1}" y="${ty + 1}" width="${tw - 2}" height="26" fill="${t.surfaceRaised}"/>`;
  s += `<line x1="${tx}" y1="${ty + 27}" x2="${tx + tw}" y2="${ty + 27}" stroke="${ink}" stroke-width="2"/>`;
  ['Agent', 'Task', 'State'].forEach((h, i) => { s += label(tx + 14 + i * 175, ty + 18, h, ink, 10); });
  [['builder', 'Extract tokens', 'done', CAT.lime], ['reviewer', 'Audit shadows', 'blocked', CAT.pink]].forEach((r, i) => {
    const ry = ty + 27 + i * 30;
    if (i) s += `<line x1="${tx}" y1="${ry}" x2="${tx + tw}" y2="${ry}" stroke="${ink}" stroke-width="1"/>`;
    s += text(tx + 14, ry + 20, r[0], { font: 'b', size: 13 });
    s += text(tx + 189, ry + 20, r[1], { font: 'b', size: 13 });
    s += badge(tx + 364, ry + 7, r[2], { fill: r[3], ink });
  });

  // tabs
  s += label(590, 302, 'Tabs', MUTED);
  ['Spec', 'Print', 'Rules'].forEach((n, i) => {
    const x = 590 + i * 86;
    s += block(x, 314, 88, 32, { fill: i === 0 ? accent : '#ffffff', ink, off: i === 0 ? 2 : 0 });
    s += text(x + 44, 335, n, { size: 13, weight: 700, anchor: 'middle' });
  });
  s += text(590, 378, 'Abutting blocks, active fill', { font: 'b', size: 12, fill: MUTED });
  s += text(590, 394, 'carries the state.', { font: 'b', size: 12, fill: MUTED });

  return svg(W, H, s, { bg: t.canvas, title: 'Hardstock component gallery: buttons, badges, fields, square controls, avatars, table, tabs' });
}

/* ---------------------------------------------------------- figure: blocks */

function blocks() {
  const t = T['paper-pink'];
  const ink = t.ink, accent = t.accent, raised = t.surfaceRaised;
  const W = 900, H = 400;
  let s = `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
  s += label(24, 34, 'Block archetypes: mix three or four, repeat none more than twice', ink, 12);

  const cw = 200, ch = 128;
  const cells = [
    ['Hero', (x, y) => {
      let g = `<rect x="${x + 26}" y="${y + 30}" width="60" height="9" fill="${accent}" stroke="${ink}" stroke-width="1.5"/>`;
      g += `<rect x="${x + 26}" y="${y + 50}" width="148" height="14" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
      g += `<rect x="${x + 26}" y="${y + 70}" width="100" height="8" fill="${ink}" opacity="0.15"/>`;
      g += `<rect x="${x + 26}" y="${y + 88}" width="46" height="16" fill="${accent}" stroke="${ink}" stroke-width="1.5"/>`;
      return g;
    }],
    ['Workspace', (x, y) => {
      let g = `<rect x="${x + 20}" y="${y + 26}" width="46" height="82" fill="${raised}" stroke="${ink}" stroke-width="1.5"/>`;
      g += `<rect x="${x + 26}" y="${y + 34}" width="34" height="9" fill="${accent}" stroke="${ink}" stroke-width="1"/>`;
      g += `<rect x="${x + 72}" y="${y + 26}" width="108" height="82" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
      g += `<line x1="${x + 72}" y1="${y + 44}" x2="${x + 180}" y2="${y + 44}" stroke="${ink}" stroke-width="1.5"/>`;
      return g;
    }],
    ['Feed', (x, y) => {
      let g = '';
      for (let i = 0; i < 3; i++) {
        const yy = y + 30 + i * 27;
        g += `<rect x="${x + 26}" y="${yy}" width="18" height="18" fill="${[CAT.cyan, CAT.lavender, CAT.lime][i]}" stroke="${ink}" stroke-width="1.5"/>`;
        g += `<rect x="${x + 52}" y="${yy + 3}" width="${110 - i * 18}" height="6" fill="${ink}" opacity="0.2"/>`;
        g += `<rect x="${x + 52}" y="${yy + 13}" width="${74 + i * 12}" height="5" fill="${ink}" opacity="0.12"/>`;
      }
      return g;
    }],
    ['Pricing', (x, y) => {
      let g = '';
      for (let i = 0; i < 3; i++) {
        const xx = x + 22 + i * 54;
        g += `<rect x="${xx}" y="${y + 28 + (i === 1 ? -6 : 0)}" width="46" height="${76 + (i === 1 ? 12 : 0)}" fill="${i === 1 ? raised : 'none'}" stroke="${ink}" stroke-width="1.5"/>`;
        if (i === 1) g += `<rect x="${xx + 8}" y="${y + 78}" width="30" height="12" fill="${accent}" stroke="${ink}" stroke-width="1"/>`;
      }
      return g;
    }],
    ['Stat strip', (x, y) => {
      let g = `<line x1="${x + 12}" y1="${y + 40}" x2="${x + cw - 12}" y2="${y + 40}" stroke="${ink}" stroke-width="2"/>`;
      g += `<line x1="${x + 12}" y1="${y + 96}" x2="${x + cw - 12}" y2="${y + 96}" stroke="${ink}" stroke-width="2"/>`;
      g += `<rect x="${x + 12}" y="${y + 41}" width="${cw - 24}" height="55" fill="${raised}"/>`;
      for (let i = 0; i < 4; i++) {
        g += `<rect x="${x + 24 + i * 44}" y="${y + 54}" width="24" height="14" fill="${ink}" opacity="0.25"/>`;
        g += `<rect x="${x + 24 + i * 44}" y="${y + 74}" width="30" height="5" fill="${ink}" opacity="0.12"/>`;
      }
      return g;
    }],
    ['Steps', (x, y) => {
      let g = '';
      for (let i = 0; i < 3; i++) {
        const yy = y + 28 + i * 28;
        g += `<rect x="${x + 26}" y="${yy}" width="18" height="18" fill="${i === 0 ? accent : 'none'}" stroke="${ink}" stroke-width="1.5"/>`;
        if (i < 2) g += `<line x1="${x + 35}" y1="${yy + 18}" x2="${x + 35}" y2="${yy + 28}" stroke="${ink}" stroke-width="1.5"/>`;
        g += `<rect x="${x + 54}" y="${yy + 5}" width="${104 - i * 14}" height="7" fill="${ink}" opacity="0.18"/>`;
      }
      return g;
    }],
    ['Comparison table', (x, y) => {
      let g = `<rect x="${x + 20}" y="${y + 26}" width="160" height="82" fill="none" stroke="${ink}" stroke-width="1.5"/>`;
      g += `<rect x="${x + 21}" y="${y + 27}" width="158" height="18" fill="${raised}"/>`;
      g += `<line x1="${x + 20}" y1="${y + 45}" x2="${x + 180}" y2="${y + 45}" stroke="${ink}" stroke-width="1.5"/>`;
      for (let i = 1; i < 3; i++) g += `<line x1="${x + 20}" y1="${y + 45 + i * 21}" x2="${x + 180}" y2="${y + 45 + i * 21}" stroke="${ink}" stroke-width="1"/>`;
      for (let i = 1; i < 3; i++) g += `<line x1="${x + 20 + i * 53}" y1="${y + 27}" x2="${x + 20 + i * 53}" y2="${y + 108}" stroke="${ink}" stroke-width="1"/>`;
      return g;
    }],
    ['Poster (print)', (x, y) => {
      let g = `<rect x="${x + 52}" y="${y + 22}" width="96" height="90" fill="${t.canvas}" stroke="${ink}" stroke-width="1.5"/>`;
      g += `<rect x="${x + 62}" y="${y + 36}" width="60" height="12" fill="${accent}" stroke="${ink}" stroke-width="1"/>`;
      g += `<rect x="${x + 62}" y="${y + 52}" width="46" height="12" fill="none" stroke="${ink}" stroke-width="1"/>`;
      g += `<line x1="${x + 62}" y1="${y + 92}" x2="${x + 138}" y2="${y + 92}" stroke="${ink}" stroke-width="1.5"/>`;
      g += `<rect x="${x + 62}" y="${y + 98}" width="40" height="5" fill="${ink}" opacity="0.3"/>`;
      return g;
    }],
  ];

  cells.forEach(([name, draw], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 24 + col * (cw + 18), y = 52 + row * (ch + 46);
    s += block(x, y, cw, ch, { fill: '#ffffff', ink, off: 2 });
    s += draw(x, y);
    s += label(x, y + ch + 20, name, ink);
  });

  return svg(W, H, s, { bg: '#ffffff', title: 'Hardstock block archetypes: hero, workspace, feed, pricing, stat strip, steps, comparison table, print poster' });
}

/* ---------------------------------------------------------- figure: themes */

function themesFigure() {
  const list = themes.themes;
  const cols = 3, cw = 280, chh = 120, gap = 20;
  const rows = Math.ceil(list.length / cols);
  const W = cols * cw + (cols + 1) * gap - gap + 20;
  const H = rows * (chh + 35) + 20;
  let s = `<rect width="${W}" height="${H}" fill="#ffffff"/>`;

  list.forEach((t, i) => {
    const x = 10 + (i % cols) * (cw + gap), y = 10 + Math.floor(i / cols) * (chh + 35);
    const ink = t.ink, mute = t.mutedText || MUTED;
    s += block(x, y, cw, chh, { fill: t.canvas, ink });
    s += text(x + 16, y + 30, t.id, { size: 15, weight: 700, fill: ink });
    s += text(x + 16, y + 48, `${t.canvas} · ${t.ink} · ${t.accent}`, { font: 'm', size: 9, fill: mute });
    s += block(x + 16, y + 60, 24, 24, { fill: t.surfaceRaised, ink, off: 0 });
    s += `<rect x="${x + 48}" y="${y + 60}" width="24" height="24" fill="${ink}"/>`;
    s += block(x + 80, y + 60, 24, 24, { fill: t.accent, ink, off: 0 });
    s += button(x + 16, y + 94, 72, 24, 'Action', { fill: t.accent, ink, size: 11 });
    s += badge(x + 100, y + 97, 'online', { fill: CAT.lime, ink });
  });

  return svg(W, H, s, { bg: '#ffffff', title: `${list.length} Hardstock themes` });
}

/* ------------------------------------------------------------------- main */

console.log('rendering figures from design/themes.json + design/tokens.json');
write('preview.svg', landing('paper-pink'));
write('landing-yellow.svg', landing('paper-yellow'));
write('landing-dark.svg', landing('night-yellow'));
write('dashboard.svg', dashboard('paper-yellow'));
write('anatomy.svg', anatomy());
write('elevation.svg', elevation());
write('type.svg', type());
write('components.svg', components());
write('blocks.svg', blocks());
write('themes.svg', themesFigure());
console.log('done');
