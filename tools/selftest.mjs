#!/usr/bin/env node
/**
 * Proves the checkers fire, and keeps proving it.
 *
 * Three generations of this file have been defeated in review:
 *   1. Asserting a rule name appeared. Deleting a whole check still passed.
 *   2. Asserting rule, level and a minimum count. A dead branch of a rule was
 *      covered by a live sibling in the same fixture filling the quota.
 *   3. Never running the CLI, so exit codes and flag handling had no coverage.
 *
 * So: exact counts, one fixture per concern, a clean fixture that must stay
 * silent, and the command line exercised as a subprocess.
 *
 *   node tools/selftest.mjs
 */

import { readFileSync, readdirSync, statSync, mkdtempSync, symlinkSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check } from './validate.mjs';
import { report, checkTheme } from './contrast.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath;

/**
 * Exact counts, not minimums. A minimum lets one spelling of a rule die while a
 * sibling spelling in the same file keeps the total up, which is how the
 * Tailwind arbitrary-value regression survived a whole release.
 */
const FIXTURES = [
  ['violations.html', [
    ['sharp-corners', 'error', 6],
    ['zero-blur-shadow', 'error', 2],
    ['zero-blur-shadow', 'warn', 2],
    ['no-soft-motion', 'error', 4],
    ['no-soft-motion', 'warn', 1],
    ['reduced-motion', 'error', 1],
    ['visible-focus', 'error', 2],
    ['no-emoji', 'error', 1],
    ['one-accent', 'error', 1],
    ['no-hardcoded-hex', 'warn', 2],
  ]],
  ['bypasses.html', [
    ['sharp-corners', 'error', 6],
    ['zero-blur-shadow', 'error', 1],
    ['zero-blur-shadow', 'warn', 2],
    ['visible-focus', 'error', 3],
    ['no-soft-motion', 'error', 2],
  ]],
  ['css-in-js.jsx', [
    ['sharp-corners', 'error', 3],
    ['zero-blur-shadow', 'error', 3],
    ['no-soft-motion', 'error', 1],
    ['no-soft-motion', 'warn', 1],
    ['visible-focus', 'error', 1],
    ['reduced-motion', 'error', 1],
    ['no-hardcoded-hex', 'warn', 1],
  ]],
  ['theme-shadowed.css', [
    ['sharp-corners', 'error', 2],
    ['zero-blur-shadow', 'error', 2],
    ['visible-focus', 'error', 1],
  ]],
  ['on-fill.html', [
    ['on-fill-on-neutral', 'error', 2],
  ]],
];

let failed = 0;
const ok = (label) => console.log(`  pass  ${label}`);
const bad = (label, detail) => { failed++; console.log(`  FAIL  ${label}${detail ? ': ' + detail : ''}`); };

const walk = (dir, acc = []) => {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (['.html', '.css'].includes(extname(entry))) acc.push(p);
  }
  return acc;
};

// 1. every fixture must trip exactly what it targets
console.log('\nfixtures must trip exactly the expected rules');
for (const [name, expected] of FIXTURES) {
  const p = join(ROOT, 'tools/fixtures', name);
  const found = check(readFileSync(p, 'utf8'), p);
  const tally = new Map();
  for (const f of found) tally.set(`${f.rule}|${f.level}`, (tally.get(`${f.rule}|${f.level}`) || 0) + 1);
  for (const [rule, level, want] of expected) {
    const got = tally.get(`${rule}|${level}`) || 0;
    got === want ? ok(`${name} ${rule} (${level}) x${got}`)
                 : bad(`${name} ${rule} (${level})`, `expected exactly ${want}, got ${got}`);
  }
  // Findings nobody asked for are regressions too: a rule that starts
  // false-positiving on a fixture would otherwise go unnoticed.
  const unexpected = [...tally.keys()].filter((k) => !expected.some(([r, l]) => `${r}|${l}` === k));
  unexpected.length === 0 ? ok(`${name} no unexpected findings`)
                          : bad(`${name} unexpected findings`, unexpected.join(', '));
}

// 2. legal CSS must stay silent, so no rule can pass by being indiscriminate
console.log('\nclean fixture must not false-positive');
const cleanPath = join(ROOT, 'tools/fixtures/clean.html');
const clean = check(readFileSync(cleanPath, 'utf8'), cleanPath);
const MUST_NOT_FIRE = ['sharp-corners', 'zero-blur-shadow', 'no-soft-motion', 'visible-focus', 'reduced-motion', 'one-accent', 'no-emoji', 'on-fill-on-neutral'];
const falsePositives = clean.filter((f) => MUST_NOT_FIRE.includes(f.rule));
falsePositives.length === 0
  ? ok('no false positives on legal CSS')
  : bad('clean fixture', falsePositives.map((f) => `${f.rule}@${f.line} ${f.message}`).join(' | '));
clean.filter((f) => f.level === 'error').length === 0 ? ok('zero errors') : bad('clean fixture', 'unexpected errors');

// 3. shipped files stay clean
console.log('\nshipped files must be clean');
for (const dir of ['examples', 'dist']) {
  for (const p of walk(join(ROOT, dir))) {
    const errs = check(readFileSync(p, 'utf8'), p).filter((f) => f.level === 'error');
    errs.length ? bad(p.replace(ROOT + '/', ''), errs.map((e) => `${e.rule}@${e.line}`).join(', '))
                : ok(p.replace(ROOT + '/', ''));
  }
}

// 4. the stylesheets must agree with design/themes.json, colors and shadows both.
//    This is the check that would have caught two themes shipping out of seven.
console.log('\nstylesheets must define every theme in design/themes.json');
const themes = JSON.parse(readFileSync(join(ROOT, 'design/themes.json'), 'utf8')).themes;
for (const [file, prefix, keys] of [
  ['dist/hardstock.css', '--hs-', { canvas: 'canvas', ink: 'ink', surfaceRaised: 'surface-raised', surfaceHigh: 'surface-high', surfacePlain: 'surface-plain', mutedText: 'muted', accent: 'accent' }],
  ['dist/hardstock.theme.css', '--color-', { canvas: 'canvas', ink: 'ink', surfaceRaised: 'raised', surfaceHigh: 'high', surfacePlain: 'plain', mutedText: 'muted', accent: 'accent' }],
]) {
  const css = readFileSync(join(ROOT, file), 'utf8');
  for (const t of themes) {
    const block = css.match(new RegExp(`\\[data-hs-theme="${t.id}"\\][^{]*\\{([^}]*)\\}`));
    if (!block) { bad(`${file} ${t.id}`, 'no theme block'); continue; }
    const wrong = Object.entries(keys)
      .filter(([jsonKey, cssKey]) => t[jsonKey] && !new RegExp(`${prefix}${cssKey}\\s*:\\s*${t[jsonKey]}\\b`, 'i').test(block[1]))
      .map(([jsonKey]) => `${jsonKey}=${t[jsonKey]}`);
    // A dark theme in the Tailwind build must restate the shadow tokens, or the
    // offset shadow is drawn in the light ink and disappears entirely.
    if (t.dark && file.endsWith('theme.css')) {
      const missingShadows = ['xs', 'sm', 'md', 'lg'].filter((k) => !new RegExp(`--shadow-brutal-${k}\\s*:`).test(block[1]));
      if (missingShadows.length) wrong.push(`shadow tokens not restated: ${missingShadows.join(', ')}`);
    }
    wrong.length ? bad(`${file} ${t.id}`, `missing or stale: ${wrong.join(', ')}`) : ok(`${file} ${t.id}`);
  }
}

// 5. every shipped theme must clear its contrast floors, and the report must
//    actually cover the neutral surface. Nothing measured that pair for two
//    releases, and both of the worst defects lived there.
console.log('\nthemes must clear their contrast floors');
const missed = report();
missed ? bad('contrast floors', `${missed} missed`) : ok('all themes');

const themeFloors = JSON.parse(readFileSync(join(ROOT, 'design/themes.json'), 'utf8')).deriveNewTheme.contrastFloor;
for (const t of themes) {
  const labels = checkTheme(t, themeFloors, t.mutedText).map((r) => r[0]);
  const required = ['ink on canvas', 'ink on accent', 'ink on surface', 'muted on canvas', 'ink on plain'];
  const missing = required.filter((r) => !labels.some((l) => l.includes(r.replace('ink on ', ''))));
  missing.length ? bad(`contrast coverage ${t.id}`, `not measured: ${missing.join(', ')}`) : ok(`contrast coverage ${t.id}`);
}

// 6. the command line itself: exit codes, flags, and unreadable targets. None of
//    this is reachable by importing check(), and all of it has been broken before.
console.log('\ncommand line must behave');
const run = (script, args) => spawnSync(NODE, [join(ROOT, 'tools', script), ...args], { encoding: 'utf8' });
const cli = [
  ['validate clean exits 0', () => run('validate.mjs', [join(ROOT, 'tools/fixtures/clean.html')]).status === 0],
  ['validate violations exits 1', () => run('validate.mjs', [join(ROOT, 'tools/fixtures/violations.html')]).status === 1],
  ['validate missing path exits 2', () => run('validate.mjs', [join(ROOT, 'no/such/path')]).status === 2],
  ['validate unknown flag exits 2', () => run('validate.mjs', ['--nope']).status === 2],
  ['validate --json emits parsable json', () => {
    const r = run('validate.mjs', ['--json', join(ROOT, 'tools/fixtures/violations.html')]);
    try { return JSON.parse(r.stdout).errors > 0; } catch { return false; }
  }],
  ['contrast all themes exits 0', () => run('contrast.mjs', []).status === 0],
  ['contrast --dark accepts the dark theme', () => run('contrast.mjs', ['--dark', '#18150f', '#f6eedb', '#ffc72c']).status === 0],
  ['contrast without --dark rejects it', () => run('contrast.mjs', ['#18150f', '#f6eedb', '#ffc72c']).status === 1],
  ['contrast bad arity exits 2', () => run('contrast.mjs', ['#fff', '#000']).status === 2],
  // Assert the reason, not just the failure: without the alpha guard the value
  // still fails validation, so a status check alone proves nothing.
  ['contrast rejects alpha hex by name', () => {
    const r = run('contrast.mjs', ['#faf5e8', '#1c1915', '#ffc72cff']);
    return r.status !== 0 && /alpha/i.test(r.stderr + r.stdout);
  }],
];

// A directory holding something unreadable must fail, not quietly report success
// for the files it did manage to read. Built here rather than committed, so the
// repository carries no broken symlink.
const tmp = mkdtempSync(join(tmpdir(), 'hardstock-selftest-'));
try {
  writeFileSync(join(tmp, 'real.css'), '.a { border-radius: 7px; }');
  symlinkSync(join(tmp, 'does-not-exist'), join(tmp, 'dangling.css'));
  cli.push(['validate reports an unreadable entry as exit 2', () => run('validate.mjs', [tmp]).status === 2]);

  // An npm bin is a symlink. Both entry points resolve the main module through
  // realpath, and both have silently no-opped before.
  for (const script of ['validate.mjs', 'contrast.mjs']) {
    const link = join(tmp, `link-${script}`);
    symlinkSync(join(ROOT, 'tools', script), link);
    cli.push([`${script} still runs when invoked through a symlink`, () => {
      const r = spawnSync(NODE, [link, ...(script === 'validate.mjs' ? [join(ROOT, 'tools/fixtures/violations.html')] : [])], { encoding: 'utf8' });
      return (r.stdout + r.stderr).trim().length > 0;
    }]);
  }
} catch { /* a platform without symlinks simply skips these */ }
for (const [label, fn] of cli) {
  let pass = false;
  try { pass = fn(); } catch (e) { pass = false; }
  pass ? ok(label) : bad(label);
}

rmSync(tmp, { recursive: true, force: true });

console.log(failed ? `\n${failed} check(s) failed\n` : '\nAll checks passed\n');
process.exit(failed ? 1 : 0);
