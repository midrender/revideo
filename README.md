<br/>
<p align="center">
  <a href="https://midrender.com/revideo">
    <img width="600" alt="Revideo" src="./logo.svg">
  </a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@revideo/core"><img src="https://img.shields.io/npm/v/@revideo/core?style=flat" alt="npm version"></a>
  <a href="https://github.com/midrender/revideo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat" alt="MIT license"></a>
  <a href="https://discord.com/invite/JDjbfp6q2G"><img src="https://img.shields.io/discord/1071029581009657896?style=flat&logo=discord&logoColor=fff&color=404eed" alt="discord"></a>
</p>
<br/>

# Revideo

Revideo is a rendering engine for creating videos in code. You describe a scene
in TypeScript — shapes, text, media, and animation — and Revideo renders it to a
video file. It ships a headless render API for generating videos
programmatically and a React player for previewing scenes in the browser.

A scene is plain TypeScript, so Claude or Codex can produce one from a prompt.

Revideo borrows concepts from Remotion and Rive, but is, in its core, zero dep.

It's the engine behind [Midrender](https://midrender.com).

<br/>

## Getting Started

Create a project:

```bash
npm init @revideo@latest
```

A scene is a generator function. The example below adds a `<RubiksCube/>`
component and animates a scramble:

```tsx
import {makeScene2D} from '@revideo/2d';
import {createRef, waitFor} from '@revideo/core';

import {RubiksCube} from './rubiks-cube';

export default makeScene2D('scramble', function* (view) {
  view.fill('#0d0d12');

  const cube = createRef<RubiksCube>();
  view.add(<RubiksCube ref={cube} size={620} />);

  yield* waitFor(0.5);
  yield* cube().scramble(18); // 18 animated quarter-turns
});
```

The cube is a single self-contained component
([`rubiks-cube.tsx`](./packages/template/src/rubiks-cube.tsx)): 54 stickers in
3D, orthographically projected in a custom `draw()`, with each quarter-turn
animated by interpolating a rotation about the turning layer's axis.

![A Rubik's cube scrambling itself](./packages/template/scramble.gif)

Render it from the command line with
[`renderVideo()`](https://docs.re.video/renderer/renderVideo/).

<br/>

## Capabilities

- **Headless rendering** — render a project to a file with `renderVideo()`, or
  expose a rendering endpoint from your project with the
  [CLI](https://docs.re.video/render-endpoint). It runs anywhere Node and a
  headless browser run, including serverless platforms like Google Cloud Run
  ([example](https://github.com/midrender/examples/tree/main/google-cloud-run)).
- **Parallelized rendering** — split a render across workers to cut wall-clock
  time ([details](https://github.com/midrender/revideo/pull/74)).
- **Browser preview** — the React
  [`<Player/>`](https://docs.re.video/preview-with-player) renders scenes in the
  browser and accepts dynamic inputs, so the same project drives both preview
  and final render.
- **Media and audio** — `<Video/>` and `<Audio/>` components with audio export
  and frame-accurate synchronization.

See the [documentation](https://docs.re.video/) for the full API.

<br/>

## Telemetry

Revideo anonymously counts how many videos are rendered, via
[PostHog](https://github.com/PostHog/posthog). The implementation is in
[`packages/telemetry`](https://github.com/midrender/revideo/tree/main/packages/telemetry).
Disable it with an environment variable:

```bash
DISABLE_TELEMETRY=true
```

## License

MIT — see [LICENSE](./LICENSE).

## Links

[Documentation](https://docs.re.video/) · [Midrender](https://midrender.com) ·
[Discord](https://discord.com/invite/JDjbfp6q2G)
