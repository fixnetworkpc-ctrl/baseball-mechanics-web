/*
 * WCAG contrast guard for the brand design tokens.
 *
 * Parses src/app/globals.css and asserts that every semantic color clears its
 * required ratio against the surfaces it actually renders on:
 *   - text tokens (badges, delta badges, inline messages) -> 4.5:1 on bg + card
 *   - graphic tokens (nav icon, active bar, focus ring)   -> 3:1   (WCAG 1.4.11)
 *
 * Why this exists: --primary (#c21026) is a *fill* red. On the dark navy surfaces
 * it only reaches ~2.9:1 as text, so red text/icons use --brand-accent instead.
 * Run `npm run check:contrast` after touching any color token.
 */
const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "..", "src", "app", "globals.css");
const css = fs.readFileSync(cssPath, "utf8");

// Anchor to line start so `.dark` inside @custom-variant isn't matched.
const grab = (sel) => {
  const re = new RegExp("^" + sel.replace(".", "\\.") + "\\s*\\{", "m");
  const m = re.exec(css);
  if (!m) throw new Error(`block not found: ${sel}`);
  const s = css.indexOf("{", m.index);
  const e = css.indexOf("}", s);
  return css.slice(s + 1, e);
};
const vars = (block) => {
  const out = {};
  for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    out[m[1]] = m[2].toLowerCase();
  }
  return out;
};

const hex2rgb = (h) => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const lum = (h) => {
  const [r, g, b] = hex2rgb(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT_TOKENS = [
  "--success", "--warning", "--destructive", "--accent-blue",
  "--grade-a", "--grade-b", "--grade-c", "--grade-d", "--grade-f",
];

let failures = 0;
const check = (theme, label, fg, bg, req) => {
  if (!fg || !bg) throw new Error(`missing token for "${label}" in ${theme}`);
  const r = ratio(fg, bg);
  if (r < req) {
    failures++;
    console.error(`FAIL [${theme}] ${r.toFixed(2)} < ${req}  ${label}  (${fg} on ${bg})`);
  }
};

for (const [theme, V] of [["light", vars(grab(":root"))], ["dark", vars(grab(".dark"))]]) {
  const bg = V["--background"];
  const card = V["--card"];
  const sidebar = V["--sidebar"];
  const sideAcc = V["--sidebar-accent"];

  check(theme, "foreground on bg", V["--foreground"], bg, 4.5);
  check(theme, "muted-foreground on bg", V["--muted-foreground"], bg, 4.5);
  check(theme, "muted-foreground on card", V["--muted-foreground"], card, 4.5);
  check(theme, "muted-foreground on sidebar (group heading)", V["--muted-foreground"], sidebar, 4.5);

  for (const t of TEXT_TOKENS) {
    check(theme, `${t} text on bg`, V[t], bg, 4.5);
    check(theme, `${t} text on card`, V[t], card, 4.5);
  }

  check(theme, "brand-accent eyebrow/link on bg", V["--brand-accent"], bg, 4.5);
  check(theme, "brand-accent eyebrow/link on card", V["--brand-accent"], card, 4.5);
  check(theme, "brand-accent nav icon on sidebar-accent", V["--brand-accent"], sideAcc, 3);
  check(theme, "brand-accent active bar on sidebar", V["--brand-accent"], sidebar, 3);

  check(theme, "primary-foreground on primary fill", V["--primary-foreground"], V["--primary"], 4.5);
  check(theme, "focus ring on bg", V["--ring"], bg, 3);
  check(theme, "focus ring on card", V["--ring"], card, 3);
}

if (failures > 0) {
  console.error(`\n${failures} contrast failure(s).`);
  process.exit(1);
}
console.log("All contrast checks pass (light + dark).");
