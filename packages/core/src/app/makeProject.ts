import DefaultPlugin from '../plugin/DefaultPlugin';
import {Color, Vector2} from '../types';
import {Logger} from './Logger';
import type {Project, UserProject, UserProjectSettings} from './Project';
import {createVersionObject} from './Project';

export const defaultUserProjectSettings: UserProjectSettings = {
  shared: {
    background: 'FFFFFF00',
    range: [0, Infinity],
    size: {x: 1920, y: 1080},
  },
  rendering: {
    exporter: {
      name: '@revideo/core/wasm',
    },
    fps: 30,
    resolutionScale: 1,
    colorSpace: 'srgb',
  },
  preview: {
    fps: 30,
    resolutionScale: 1,
  },
};

export function makeProject(project: UserProject): Project {
  // Don't delete, has side effects
  // TODO(konsti): Figure out how to get rid of this
  void DefaultPlugin;

  const settings = {
    ...defaultUserProjectSettings,
    ...project.settings,
    shared: {
      ...defaultUserProjectSettings.shared,
      ...project.settings?.shared,
    },
    rendering: {
      ...defaultUserProjectSettings.rendering,
      ...project.settings?.rendering,
    },
    preview: {
      ...defaultUserProjectSettings.preview,
      ...project.settings?.preview,
    },
  };

  // Convert background and size to correct types
  const convertedSettings = {
    ...settings,
    shared: {
      ...settings.shared,
      background: new Color(settings.shared.background!),
      size: new Vector2(settings.shared.size),
    },
  };

  return {
    ...project,
    name: project.name ?? 'project',
    settings: convertedSettings,
    plugins: [],
    logger: new Logger(),
    // Placeholder only. The real, per-package versions are resolved from the
    // installed `package.json` files and injected by the vite-plugin's editor
    // entry (the sole consumer, the editor footer). They are never used during
    // a headless render, so we don't try to resolve them here in core.
    versions: createVersionObject('0.0.0'),
  };
}
