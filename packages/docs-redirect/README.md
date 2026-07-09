# @revideo/docs-redirect

A tiny redirect service that replaces the old documentation site at
`docs.re.video`. Every old URL is forwarded with a `301` to its new home under
`https://midrender.com/revideo/docs`.

## How it works

- **`data/old-urls.txt`** — the authoritative list of old paths, a snapshot of
  `docs.re.video`'s `sitemap.xml` (286 URLs).
- **`src/build-map.mjs`** — generates `src/redirects.json` by mapping every old
  path to its new page. It reads the current docs (`packages/docs/src/content`)
  to compute new URLs and to guarantee no redirect points at a 404:
  - prose pages are mapped explicitly (the old Docusaurus site used custom
    `slug`s, and `motion-canvas/*` became `animations/*`);
  - TypeDoc API pages move from `/api/<pkg>/<module>/<Symbol>` to
    `/api-reference/<pkg>/<module>/<kind>/<Symbol>`, resolved by locating each
    symbol in the new tree;
  - anything without an exact new page (a handful of removed API symbols such as
    the `meta` module and `Presenter`) falls back to the closest section index.
- **`src/redirects.json`** — the generated map (committed). Regenerate with
  `npm run build` whenever the docs are restructured.
- **`src/server.mjs`** — a zero-dependency HTTP server that looks up the request
  path and issues the redirect. Unknown paths fall back to the docs home. Runs
  under Node or Bun.

## Usage

```bash
npm run build      # regenerate src/redirects.json from the current docs
npm start          # start the server (PORT env, default 8080)
```

Health check: `GET /healthz` → `200 ok`.

## Deploying

Point `docs.re.video` at this service (any Node/Bun host or container). The
server is stateless and keeps the map in memory. Example:

```bash
PORT=8080 node src/server.mjs
# or
PORT=8080 bun src/server.mjs
```
