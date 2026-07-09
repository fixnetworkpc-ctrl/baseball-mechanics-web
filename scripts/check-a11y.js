/*
 * ARIA regression guard for components whose accessibility lives entirely in
 * markup that no other check would catch.
 *
 * Currently covers <StarRating>, which has two modes with different semantics:
 *   - read-only    -> a single role="img" that states the value
 *   - interactive  -> role="radiogroup" of role="radio" stars, roving tabindex
 * Both were previously broken: read-only rendered five `disabled` buttons that
 * announced as noise and never stated the rating, and interactive had no
 * aria-checked at all, so the current rating was conveyed only by star color.
 *
 * HOW THIS WORKS (it is unusual, and deliberately so):
 * This repo has no test runner, and the component lives on an auth-gated page,
 * so it can't be fetched from the dev server. Instead we transpile the real
 * .tsx with the repo's own `typescript`, stub its `@/lib/utils` import, and
 * server-render it with `react-dom/server` to assert on the emitted HTML.
 * No new dependencies: typescript, react and react-dom are all already present.
 *
 * Two gotchas if you touch this:
 *   - We transpile with the CLASSIC JSX emit (React.createElement), but the
 *     source targets the automatic runtime and never imports React — so we
 *     prepend a `require("react")`. Removing that line reintroduces
 *     `ReferenceError: React is not defined`.
 *   - Non-relative imports must be stubbed or mapped in `resolveOverrides`
 *     below. If StarRating gains an import, add it there.
 *
 * Run: npm run check:a11y
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const req = (m) => require(path.join(ROOT, 'node_modules', m));

const ts = req('typescript');
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');

// Non-relative specifiers used by the component under test.
const resolveOverrides = {
  react: path.join(ROOT, 'node_modules/react'),
};
// `cn` is a trivial classnames join; stub it rather than transpiling utils too.
const stubs = {
  '@/lib/utils': { cn: (...a) => a.filter(Boolean).join(' ') },
};

function loadComponent(relPath) {
  const srcPath = path.join(ROOT, relPath);
  const transpiled = ts.transpileModule(fs.readFileSync(srcPath, 'utf8'), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const code = `const React = require(${JSON.stringify(resolveOverrides.react)});\n${transpiled}`;

  const m = new Module(srcPath, null);
  m.filename = srcPath;
  m.paths = Module._nodeModulePaths(path.dirname(srcPath));

  const originalResolve = Module._resolveFilename;
  const originalLoad = Module._load;
  Module._load = function (request, ...rest) {
    if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
    if (resolveOverrides[request]) return originalLoad.call(this, resolveOverrides[request], ...rest);
    return originalLoad.call(this, request, ...rest);
  };
  try {
    m._compile(code, srcPath);
  } finally {
    Module._load = originalLoad;
    Module._resolveFilename = originalResolve;
  }
  return m.exports;
}

const { StarRating } = loadComponent('src/components/star-rating.tsx');
const html = (props) => renderToStaticMarkup(React.createElement(StarRating, props));

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); console.log(`  ok    ${name}`); pass++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); fail++; }
};
const count = (s, re) => (s.match(re) || []).length;

console.log('\nStarRating — read-only');
const ro = html({ value: 3, readOnly: true });
t('exposes a single role="img"', () => assert.strictEqual(count(ro, /role="img"/g), 1));
t('announces the actual value', () => assert.ok(ro.includes('aria-label="Rating: 3 out of 5 stars"'), ro));
t('renders no buttons', () => assert.ok(!ro.includes('<button'), 'read-only must not render buttons'));
t('star glyphs are aria-hidden', () => assert.strictEqual(count(ro, /aria-hidden/g), 5));
t('unrated announces "not rated"', () => {
  assert.ok(html({ value: 0, readOnly: true }).includes('aria-label="Rating: not rated"'));
});

console.log('\nStarRating — interactive');
const it3 = html({ value: 3, onChange: () => {} });
const radios3 = it3.split('<button').slice(1);
t('wrapper is a radiogroup', () => assert.ok(it3.includes('role="radiogroup"')));
t('renders 5 radios', () => assert.strictEqual(count(it3, /role="radio"/g), 5));
t('exactly one radio is checked', () => assert.strictEqual(count(it3, /aria-checked="true"/g), 1));
t('the checked radio is the 3rd star', () => {
  assert.ok(radios3[2].includes('aria-checked="true"'), '3rd star should be checked');
  assert.ok(radios3[0].includes('aria-checked="false"'), '1st star should not be checked');
});
t('roving tabindex: exactly one tabindex=0', () => assert.strictEqual(count(it3, /tabindex="0"/g), 1));
t('tabindex=0 sits on the selected star', () => assert.ok(radios3[2].includes('tabindex="0"')));
t('stars are never disabled', () => assert.ok(!it3.includes('disabled')));

const it0 = html({ value: 0, onChange: () => {} });
t('unrated: no radio is checked', () => assert.strictEqual(count(it0, /aria-checked="true"/g), 0));
t('unrated: the first star is the focusable one', () => {
  assert.strictEqual(count(it0, /tabindex="0"/g), 1);
  assert.ok(it0.split('<button').slice(1)[0].includes('tabindex="0"'));
});

console.log('\nStarRating — accessible name');
t('defaults to aria-label when no labelledBy', () => {
  assert.ok(it3.includes('aria-label="Rating"'), it3);
  assert.ok(!it3.includes('aria-labelledby'), 'must not emit an empty aria-labelledby');
});
t('labelledBy points the radiogroup at the visible label', () => {
  const named = html({ value: 3, onChange: () => {}, labelledBy: 'rating-label' });
  assert.ok(named.includes('aria-labelledby="rating-label"'), named);
});
t('labelledBy suppresses the duplicate aria-label', () => {
  const named = html({ value: 3, onChange: () => {}, labelledBy: 'rating-label' });
  assert.ok(!/aria-label="Rating"/.test(named), 'aria-label must not co-exist with aria-labelledby');
});
t('read-only still names itself with the value, ignoring labelledBy', () => {
  const roNamed = html({ value: 4, readOnly: true, labelledBy: 'rating-label' });
  assert.ok(roNamed.includes('aria-label="Rating: 4 out of 5 stars"'), roNamed);
  assert.ok(!roNamed.includes('aria-labelledby'), 'read-only name must carry the value');
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
