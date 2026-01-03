import type {FfmpegExporterOptions, ImageExporterOptions} from '../exporter';
import type {Plugin} from '../plugin';
import type {SceneDescription} from '../scenes';
import type {CanvasColorSpace, Color, MotionBlurConfig, Vector2} from '../types';
import type {Logger} from './Logger';

// TODO(refactor): check if we can get rid of this
export interface Versions {
  core: string;
  two: string | null;
  ui: string | null;
  vitePlugin: string | null;
}

// TODO(refactor): check if we can get rid of this
export function createVersionObject(version: string) {
  return {
    core: version,
    two: version,
    ui: version,
    vitePlugin: version,
  };
}

export type ExporterSettings =
  | {
      name: '@revideo/core/image-sequence';
      options: ImageExporterOptions;
    }
  | {
      name: '@revideo/core/ffmpeg';
      options: FfmpegExporterOptions;
    }
  | {
      name: '@revideo/core/wasm';
    };

// Project settings that are used internally
export interface ProjectSettings {
  shared: {
    background: Color;
    range: [number, number];
    size: Vector2;
  };
  rendering: {
    exporter: ExporterSettings;
    fps: number;
    resolutionScale: number;
    colorSpace: CanvasColorSpace;
    motionBlur?: Partial<MotionBlurConfig>;
  };
  preview: {
    fps: number;
    resolutionScale: number;
  };
}

// Project settings as they are provided by the user (can be serialized)
export interface UserProjectSettings {
  shared: {
    range: [number, number];
    background: string | null; // changed from Color to string
    size: {x: number; y: number}; // changed from Vector2 to object
  };
  rendering: {
    exporter: ExporterSettings;
    fps: number;
    resolutionScale: number;
    colorSpace: CanvasColorSpace;
    motionBlur?: Partial<MotionBlurConfig>;
  };
  preview: {
    fps: number;
    resolutionScale: number;
  };
}

/**
 * Settings that can be passed to the renderVideo / renderPartialVideo functions
 */

export type RenderVideoUserProjectSettings = {
  range?: UserProjectSettings['shared']['range'];
  background?: UserProjectSettings['shared']['background'];
  size?: UserProjectSettings['shared']['size'];

  exporter?: UserProjectSettings['rendering']['exporter'];
  motionBlur?: UserProjectSettings['rendering']['motionBlur'];
};

/**
 * Settings that can be passed to the createProject function
 */

export type PartialUserProjectSettings = {
  shared?: Partial<UserProjectSettings['shared']>;
  rendering?: Partial<UserProjectSettings['rendering']>;
  preview?: Partial<UserProjectSettings['preview']>;
};

export interface UserProject {
  /**
   * The name of the project.
   */
  name?: string;

  /**
   * A list of scene descriptions that make up the project.
   */
  scenes: SceneDescription<any>[];

  /**
   * Default values for project variables.
   *
   * @see https://motioncanvas.io/docs/project-variables
   */
  variables?: Record<string, unknown>;

  /**
   * Enable experimental features.
   *
   * @see https://motioncanvas.io/docs/experimental
   *
   * @experimental
   */
  experimentalFeatures?: boolean;

  /**
   * Settings for the project. This includes shared settings, rendering settings
   * and preview settings.
   *
   * Includes things like the background color, the resolution, the frame rate,
   * and the exporter to use.
   */
  settings?: PartialUserProjectSettings;
}

/**
 * Internal project that includes legacy properties that can't be changed by the user
 * as well as defaulted properties in case the user didn't provide them.
 */
export interface Project extends Omit<UserProject, 'settings'> {
  name: string;
  settings: ProjectSettings;

  /**
   * @deprecated Not exposed in the public API. We set the exporters as plugins
   * which is why we can't delete this yet.
   *
   * // TODO(konsti): get rid of plugins
   *
   * A list of plugins to include in the project.
   *
   * @remarks
   * When a string is provided, the plugin will be imported dynamically using
   * the string as the module specifier. This is the preferred way to include
   * editor plugins because it makes sure that the plugin's source code gets
   * excluded from the production build.
   */
  plugins: Plugin[];

  /**
   * Not exposed in the public API.
   */
  logger: Logger;

  /**
   * Manually set via a constant. This should be automated by reading the
   * package.json files of the packages.
   */
  versions: Versions;
}
