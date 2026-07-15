# Releasing

Packages are published by `.github/workflows/publish.yml` (`workflow_dispatch`,
inputs `releaseType` = `release` | `canary`, and `version`). It runs
`lerna publish` under **fixed versioning** — every package shares one version
(`lerna.json`) — and authenticates to npm via **OIDC trusted publishing**, so no
npm token is involved. Requires npm ≥ 11.5.1 (the workflow installs it).

**Always canary first.** A full release moves the `latest` tag and tags/commits
git — there's no clean undo. Publish a canary, run the [smoke test](#smoke-test)
against it, and only cut the full release once it's green.

## Canary

For testing unreleased changes before a full release. Dispatch the workflow from
any branch (usually the feature branch you want to test):

```
releaseType = canary
version     = <ignored for canary, but the form requires a value>
```

Runs `lerna publish --canary --force-publish`. Publishes `X.Y.Z-alpha.<build>`
to the `canary` dist-tag. No git commit or tag is created — canaries are
disposable, so cut as many as you need.

**Test it.** Scaffold a fresh project and point it at the canary, then run the
[smoke test](#smoke-test):

```
npm create @revideo@canary -- --default
cd my-revideo-project
npx npm-check-updates '/@revideo/' --target newest --install   # or hand-edit deps to @canary
```

Note the exact canary version from the workflow log (e.g. `0.11.1-alpha.1187`)
and confirm the installed packages match it before testing — a stale cache can
otherwise mask the change you're verifying.

## Full release

`main` is protected (PR-only, `enforce_admins`, squash-only merges), so lerna
cannot push its version commit directly to `main`. Release from a dedicated
branch instead and merge back via PR.

1. **Examples submodule.** `packages/create/examples` is a git submodule
   (`midrender/examples`) whose example `package.json`s pin exact `@revideo/*`
   versions. `@revideo/create` ships this directory in its npm tarball
   (`files: ["index.js", "examples"]`), so scaffolded projects install whatever
   these files pin. `lerna` does **not** touch the submodule (separate repo), so
   bump it by hand or `npm create` installs the old versions.

   In `packages/create/examples`, branch off the previous release branch and
   bump every pinned `@revideo/*` dep to `X.Y.Z`:

   ```
   git checkout -b release-X.Y.Z origin/release-<prev>
   # every "0.10.4" in these files is an @revideo dep — safe to replace wholesale
   perl -pi -e 's/"<prev>"/"X.Y.Z"/g' $(git ls-files '*package.json')
   git commit -am "chore: bump @revideo deps to X.Y.Z" && git push -u origin release-X.Y.Z
   ```

   Note the resulting commit SHA — the superproject pointer is updated to it in
   the next step.

2. **Prep commit** — branch `release-X.Y.Z` off `main`, one commit:
   - submodule pointer `packages/create/examples` → the new examples commit
   - `packages/cli/src/index.ts` → `const VERSION = 'X.Y.Z'`

   (`lerna` bumps every `package.json` + the lockfile itself; only these two
   hand-maintained spots are left.)

3. **Publish** — dispatch the workflow **from `release-X.Y.Z`**:

   ```
   releaseType = release
   version     = X.Y.Z
   ```

   Runs `lerna publish --force-publish --exact X.Y.Z`: versions all packages,
   commits `ci(release): X.Y.Z`, tags `vX.Y.Z`, pushes to the release branch,
   and publishes to the `latest` dist-tag with provenance.

4. **Merge** — squash-merge `release-X.Y.Z` → `main`. The squash folds the prep
   and `ci(release)` commits into one; `vX.Y.Z` still points at the published
   commit on the release branch.

Then run the [smoke test](#smoke-test) once more against `@latest` to confirm
the published release.

## Smoke test

Run against a canary before releasing, and against `@latest` after. Scaffold a
fresh project (`@canary` or `@latest` as appropriate) and check all three paths
end to end:

```
cd my-revideo-project
npm install                        # installs cleanly, deps resolve to the version under test
npm run render                     # → output/video.mp4 (non-empty, a few seconds long)
npm start                          # editor dev server boots
```

- **Install** — `npm ls @revideo/core` reports the expected version, no peer/resolution errors.
- **Render** — `npm run render` exits 0 and writes a playable `output/video.mp4`.
  This is the headless path (Puppeteer + Vite + ffmpeg); a hang here means
  editor-only code leaked into the render bundle.
- **Editor** — `npm start` serves the editor (`http://localhost:9000`, HTTP 200)
  and the per-scene plugins resolve (`/@id/@revideo/2d/editor` → HTTP 200). The
  footer should show the version under test.
