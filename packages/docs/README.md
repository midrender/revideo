# @revideo/docs

The documentation site for Revideo, powering [docs.re.video](https://docs.re.video).
It is a [Next.js](https://nextjs.org) app built with [Nextra 4](https://nextra.site).

## Background

Docs used to live in this repository as a Docusaurus site. As part of the 0.10
refactor the old docs became incompatible with Revideo, so they were moved to a
separate repository (`midrender/docs`) and migrated to Nextra. This package is
that Next app, inlined back into the monorepo so the docs live next to the code
again.

The original Docusaurus source and the one-time Docusaurus→Nextra conversion
script remain in the `midrender/docs` repository (in its `docs-old/` and
`scripts/` directories). Content is now edited directly under `src/content/`;
the conversion script is no longer part of the normal workflow.

## Development

From the repository root:

```bash
npm run docs:dev     # start the dev server
npm run docs:build   # production build
npm run docs:start   # serve the production build
```

Or from this directory: `npm run dev` / `npm run build` / `npm run start`.

Documentation content lives in `src/content/` (MDX). App shell, layout, and
routing live in `src/app/`.

## Status

This is a work in progress — the content is migrated but the site chrome is
still largely the Nextra starter template. Remaining work before it can replace
the frozen Docusaurus site at docs.re.video:

- [ ] Replace the Nextra starter branding in `src/app/layout.tsx` (navbar logo,
      metadata, banner, footer, `docsRepositoryBase`/edit links)
- [ ] Build a real landing page (`src/app/page.tsx` is still a placeholder)
- [ ] Fix the sidebar order
- [ ] Add redirects from the old Docusaurus URL structure
- [ ] Fix the preview of Revideo code samples
- [ ] Enable search (pagefind)
- [ ] Add analytics
- [ ] Add a sitemap
- [ ] Refresh outdated content for the current (0.10+) API and regenerate the
      API reference
- [ ] Cut `docs.re.video` DNS over to this deployment once ready
