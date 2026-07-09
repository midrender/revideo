// Generates redirects.json: a map from every old docs.re.video path to its new
// URL under https://midrender.com/revideo/docs.
//
// Inputs:
//   - data/old-urls.txt          the authoritative list of old paths (a snapshot
//                                of docs.re.video's sitemap.xml)
//   - ../docs/src/content/**     the current Nextra docs, used both to compute
//                                new URLs and to validate that every target
//                                actually exists (so we never emit a redirect to
//                                a 404).
//
// Run: npm run build  (from packages/docs-redirect)

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {basename, dirname, join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OLD_URLS = join(here, '..', 'data', 'old-urls.txt');
const CONTENT_DIR = join(here, '..', '..', 'docs', 'src', 'content');
const OUT = join(here, 'redirects.json');

const TARGET_ORIGIN = 'https://midrender.com';
const NEW_BASE = '/revideo/docs';

// The old Docusaurus site used custom `slug` frontmatter, so old prose URLs
// don't match the folder tree. This maps each old slug to its new
// content-relative route (no extension). Derived from the archived Docusaurus
// frontmatter; the only structural rename was `motion-canvas/*` -> `animations/*`
// (plus `intro` -> the docs home). Every target is validated below.
const PROSE = {
  '/3d-animations-with-threejs':
    'guide/designing-animations/3d-animations-with-threejs',
  '/api/player-react/player': 'api-reference/player-react/player',
  '/api/renderer/renderVideo': 'api-reference/renderer/renderVideo',
  '/changing-object-size-over-time-with-signals':
    'code-snippets/changing-object-size-over-time-with-signals',
  '/code-animations': 'animations/code-animations',
  '/common-issues/ffmpeg': 'common-issues/ffmpeg',
  '/common-issues/slow-rendering': 'common-issues/slow-rendering',
  '/configuration': 'animations/configuration',
  '/custom-components': 'animations/custom-components',
  '/custom-font': 'animations/custom-font',
  '/decoders': 'guide/performance/decoders',
  '/designing-animations': 'guide/designing-animations/designing-animations',
  '/emojis': 'guide/designing-animations/emojis',
  '/experimental': 'animations/experimental',
  '/ffmpeg/concatenateMedia': 'api-reference/revideo-ffmpeg/concatenate-media',
  '/ffmpeg/mergeAudioWithVideo':
    'api-reference/revideo-ffmpeg/merge-audio-with-video',
  '/filters-and-effects': 'animations/filters-and-effects',
  '/flow': 'animations/flow',
  '/hierarchy': 'animations/hierarchy',
  '/hls-video': 'code-snippets/hls-video',
  '/installation-and-setup': 'guide/installation-and-setup',
  '/layouts': 'animations/layouts',
  '/logging': 'animations/logging',
  '/logical-separation': 'guide/designing-animations/logical-separation',
  '/moving-manipulating-objects': 'code-snippets/moving-objects',
  '/node-parent-reloading': 'guide/performance/node-parent-reloading',
  '/parameterized-video': 'guide/parameterized-video',
  '/platform/introduction': 'platform/introduction',
  '/platform/render-endpoint': 'platform/render-endpoint',
  '/positioning': 'animations/positioning',
  '/preview-with-player': 'guide/building-webapps/using-the-player',
  '/project-structure': 'guide/project-structure',
  '/project-variables': 'animations/project-variables',
  '/random-values': 'animations/random',
  '/references': 'animations/references',
  '/render-endpoint': 'guide/building-webapps/rendering-endpoint',
  '/renderer/renderPartialVideo': 'api-reference/renderer/renderPartialVideo',
  '/rendering-in-production': 'guide/building-webapps/deploy-rendering-service',
  '/rendering-videos': 'guide/rendering-videos',
  '/rive-animations': 'guide/designing-animations/rive-animations',
  '/saas-template': 'guide/building-webapps/saas-template',
  '/shaders': 'animations/shaders',
  '/signals': 'animations/signals',
  '/spawners': 'animations/spawners',
  '/streaming-text': 'code-snippets/streaming-text',
  '/time-events': 'animations/time-events',
  '/transitions': 'animations/transitions',
  '/transparent-video': 'code-snippets/transparent-video',
  '/tweening': 'animations/tweening',
  '/understanding-scene-flow': 'guide/understanding-scene-flow',
};

// Docusaurus auto-generated `/category/*` landing pages. Only the root and
// `api-reference` sections have index pages in the new docs, so the rest point
// at a representative leaf page in the same section (closest guess).
const CATEGORY = {
  '/category/api-reference': 'api-reference',
  '/category/usage-guide': 'guide/installation-and-setup',
  '/category/motion-canvas-guide': 'animations/flow',
  '/category/designing-videos':
    'guide/designing-animations/designing-animations',
  '/category/building-web-apps': 'guide/building-webapps/rendering-endpoint',
  '/category/code-snippets': 'code-snippets/moving-objects',
  '/category/common-issues': 'common-issues/ffmpeg',
  '/category/get-help': 'get-help/discord',
  '/category/performance-considerations': 'guide/performance/decoders',
  '/category/platform': 'platform/introduction',
  '/category/revideoffmpeg': 'api-reference/revideo-ffmpeg/concatenate-media',
  '/category/revideoplayer-react': 'api-reference/player-react/player',
  '/category/revideorenderer': 'api-reference/renderer/renderVideo',
  '/category/upgrading': 'upgrading/from_0.2.x_to_0.3',
};

// TypeDoc symbol pages moved from /api/<pkg>/<module>/<Symbol> to
// /api-reference/<pkg>/<module>/<kind>/<Symbol>. We resolve <kind> by locating
// the symbol in the new tree.
const API_KINDS = [
  'classes',
  'functions',
  'interfaces',
  'type-aliases',
  'enumerations',
  'variables',
];

/** Recursively collect every doc route (content-relative, no extension). */
function collectRoutes(dir) {
  const routes = new Set();
  const walk = current => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.mdx?$/.test(entry)) {
        let route = relative(CONTENT_DIR, full).replace(/\.mdx?$/, '');
        route = route.replace(/(^|\/)index$/, ''); // index -> its folder
        routes.add(route);
      }
    }
  };
  walk(dir);
  return routes;
}

// The TypeDoc API pages (api-reference/**) are generated by the docs build
// (`npm run api:generate` in packages/docs) and are NOT committed to git. If this
// script runs where the docs content is missing or incomplete (e.g. a standalone
// deploy of this service), regenerating would silently drop every /api/* redirect
// to the docs home. Guard against that by keeping the committed redirects.json
// rather than overwriting it with a broken map.
function keepCommittedOrFail(reason) {
  console.warn(`[build-map] ${reason}`);
  if (existsSync(OUT)) {
    console.warn(
      `[build-map] keeping the committed ${basename(OUT)} unchanged.`,
    );
    process.exit(0);
  }
  console.error(
    `[build-map] no existing ${basename(OUT)} to preserve. Run the docs build ` +
      `(npm run api:generate in packages/docs) before generating the map.`,
  );
  process.exit(1);
}

if (!existsSync(CONTENT_DIR)) {
  keepCommittedOrFail(`docs content dir not found at ${CONTENT_DIR}.`);
}
const routes = collectRoutes(CONTENT_DIR);
const apiPageCount = [...routes].filter(r =>
  r.startsWith('api-reference/'),
).length;
if (apiPageCount < 200) {
  keepCommittedOrFail(
    `docs content looks incomplete: found ${apiPageCount} api-reference ` +
      `pages (expected 400+); the generated TypeDoc pages are probably missing.`,
  );
}

const has = route => routes.has(route);
const toUrl = route => TARGET_ORIGIN + NEW_BASE + (route ? '/' + route : '');

/** Find the new route for an old TypeDoc symbol, else null. */
function resolveApiSymbol(pkg, mod, symbol) {
  for (const kind of API_KINDS) {
    const candidate = `api-reference/${pkg}/${mod}/${kind}/${symbol}`;
    if (has(candidate)) return candidate;
  }
  return null;
}

const oldPaths = readFileSync(OLD_URLS, 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean);

const redirects = {};
const fallbacks = []; // old paths that couldn't map exactly (closest guess used)
const missingTargets = []; // sanity: a mapping pointed at a non-existent page

function record(oldPath, route, {fallback = false} = {}) {
  // Every target must be a real route. The docs home ('') and 'api-reference'
  // both resolve via their index pages, so has() already returns true for them.
  if (!has(route)) missingTargets.push(`${oldPath} -> ${route}`);
  redirects[oldPath] = toUrl(route);
  if (fallback) fallbacks.push(`${oldPath} -> /${route}`);
}

for (const oldPath of oldPaths) {
  // 1. Specials.
  if (oldPath === '/' || oldPath === '/search') {
    record(oldPath, '');
    continue;
  }
  // 2. Prose pages (must run before generic /api handling).
  if (PROSE[oldPath]) {
    record(oldPath, PROSE[oldPath]);
    continue;
  }
  // 3. Category landing pages.
  if (CATEGORY[oldPath]) {
    record(oldPath, CATEGORY[oldPath]);
    continue;
  }
  // 3.5 Identity: pages that kept their path (old URL == a real new route).
  // Covers Docusaurus pages that used the default folder path instead of a
  // custom slug (e.g. /get-help/discord, /upgrading/*).
  if (has(oldPath.slice(1))) {
    record(oldPath, oldPath.slice(1));
    continue;
  }
  // 4. TypeDoc API pages.
  if (oldPath.startsWith('/api/')) {
    const parts = oldPath.slice(1).split('/'); // ['api', pkg, mod?, symbol?]
    const [, pkg, mod, symbol] = parts;
    if (parts.length === 2) {
      // /api/<pkg> package index
      record(
        oldPath,
        has(`api-reference/${pkg}`) ? `api-reference/${pkg}` : '',
        {
          fallback: !has(`api-reference/${pkg}`),
        },
      );
    } else if (parts.length === 3) {
      // /api/<pkg>/<module> module index
      if (has(`api-reference/${pkg}/${mod}`)) {
        record(oldPath, `api-reference/${pkg}/${mod}`);
      } else if (has(`api-reference/${pkg}`)) {
        record(oldPath, `api-reference/${pkg}`, {fallback: true});
      } else {
        record(oldPath, '', {fallback: true});
      }
    } else {
      // /api/<pkg>/<module>/<symbol>
      const resolved = resolveApiSymbol(pkg, mod, symbol);
      if (resolved) {
        record(oldPath, resolved);
      } else if (has(`api-reference/${pkg}/${mod}`)) {
        record(oldPath, `api-reference/${pkg}/${mod}`, {fallback: true});
      } else if (has(`api-reference/${pkg}`)) {
        record(oldPath, `api-reference/${pkg}`, {fallback: true});
      } else {
        record(oldPath, '', {fallback: true});
      }
    }
    continue;
  }
  // 5. Anything else: send to the docs home (closest guess).
  record(oldPath, '', {fallback: true});
}

// Emit sorted for stable diffs.
const sorted = Object.fromEntries(
  Object.keys(redirects)
    .sort()
    .map(k => [k, redirects[k]]),
);
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n');

// Report.
console.log(`old URLs:        ${oldPaths.length}`);
console.log(`redirects:       ${Object.keys(redirects).length}`);
console.log(
  `exact:           ${Object.keys(redirects).length - fallbacks.length}`,
);
console.log(`closest-guess:   ${fallbacks.length}`);
if (fallbacks.length) {
  console.log('\nclosest-guess redirects (no exact new page):');
  for (const f of fallbacks) console.log(`  ${f}`);
}
if (missingTargets.length) {
  console.error('\nERROR: mappings point at non-existent pages:');
  for (const m of missingTargets) console.error(`  ${m}`);
  process.exit(1);
}
console.log(`\nwrote ${relative(join(here, '..', '..', '..'), OUT)}`);
