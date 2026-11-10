/**
 * Hardstock runtime audit.
 *
 * Paste into the browser console on a rendered page. It walks computed styles,
 * so it catches radii, blurs and easings that arrive from a framework or a
 * component library rather than from your own source.
 *
 * Returns a summary object and logs offending elements you can click through to.
 */
(() => {
  const findings = [];
  const note = (rule, el, detail) => findings.push({ rule, el, detail });

  const px = (v) => parseFloat(v) || 0;

  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);

    // sharp-corners
    const radii = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'];
    if (radii.some((r) => px(cs[r]) > 0)) note('sharp-corners', el, radii.map((r) => cs[r]).join(' '));

    // zero-blur-shadow
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      for (const layer of cs.boxShadow.split(/,(?![^(]*\))/)) {
        const nums = [...layer.replace(/rgba?\([^)]*\)/g, ' ').matchAll(/(-?\d*\.?\d+)px/g)].map((m) => parseFloat(m[1]));
        if (nums.length >= 3 && nums[2] !== 0) note('zero-blur-shadow', el, layer.trim());
      }
    }

    // no-soft-motion
    if (/blur\(/.test(cs.filter) || /blur\(/.test(cs.backdropFilter || '')) note('no-soft-motion', el, cs.filter + ' ' + cs.backdropFilter);
    const bez = cs.transitionTimingFunction.match(/cubic-bezier\(([^)]+)\)/);
    if (bez) {
      const [, y1, , y2] = bez[1].split(',').map(Number);
      if ([y1, y2].some((v) => v < 0 || v > 1)) note('no-soft-motion', el, cs.transitionTimingFunction);
    }
    const dur = Math.max(...cs.transitionDuration.split(',').map((d) => (d.includes('ms') ? parseFloat(d) / 1000 : parseFloat(d)) || 0));
    if (dur > 0.15) note('no-soft-motion', el, `transition ${cs.transitionDuration}`);

    // real-interactive-elements
    if (cs.cursor === 'pointer' && !el.matches('button, a, input, select, textarea, label, summary, [role="button"], [role="tab"], [role="switch"], [role="link"]')) {
      note('real-interactive-elements', el, el.tagName.toLowerCase());
    }
  }

  // no-emoji, in text content
  const emoji = /\p{Emoji_Presentation}|\uFE0F/u;
  for (const el of document.querySelectorAll('button, a, h1, h2, h3, h4, th, label, [class*="badge"], [class*="label"], [class*="nav"]')) {
    if (emoji.test(el.textContent || '')) note('no-emoji', el, (el.textContent || '').trim().slice(0, 40));
  }

  // one-accent, distinct fills on things that look like primary actions
  const fills = new Set();
  // Primary actions only, matching the static rule. Collecting every button fill
  // reports secondary and danger variants as extra accents.
  for (const el of document.querySelectorAll('[class*="--primary"], [class*="-primary"], [data-variant="primary"]')) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') fills.add(bg);
  }

  if (fills.size > 1) note('one-accent', document.body, `${fills.size} distinct button fills: ${[...fills].join(', ')}`);

  const byRule = findings.reduce((acc, f) => ((acc[f.rule] = (acc[f.rule] || 0) + 1), acc), {});
  console.group('%cHardstock audit', 'font-weight:700');
  if (!findings.length) console.log('No mechanical violations found.');
  for (const [rule, count] of Object.entries(byRule)) {
    console.groupCollapsed(`${rule}: ${count}`);
    findings.filter((f) => f.rule === rule).slice(0, 50).forEach((f) => console.log(f.detail, f.el));
    console.groupEnd();
  }
  console.log('button fills in use:', [...fills]);
  console.log('Manual checks remain: ink on colored fills, no nested cards, status carries a word, Escape closes overlays, narrow-screen behaviour.');
  console.groupEnd();

  return { total: findings.length, byRule, buttonFills: [...fills], findings };
})();
