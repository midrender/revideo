import type {Project, RenderVideoUserProjectSettings} from '@revideo/core';
import {
  Color,
  Renderer,
  Vector2,
  getFullRenderingSettings,
} from '@revideo/core';

declare global {
  interface Window {
    onRenderComplete: () => void;
    onRenderFailed: (msg: string) => void;
  }
}

/**
 * Render the project.
 */
export const render = async (
  project: Project,
  workerId: number,
  totalNumOfWorkers: number,
  hiddenFolderId: string,
  overwriteRenderSettings: RenderVideoUserProjectSettings,
) => {
  try {
    const renderer = new Renderer(project);

    // Range calculation
    const range =
      overwriteRenderSettings.range ?? project.settings.shared.range;

    const {firstGlobalFrame, lastGlobalFrame} =
      await getGlobalFirstAndLastFrame(project, renderer, range[0], range[1]);

    const {firstWorkerFrame, lastWorkerFrame} =
      await getWorkerFirstAndLastFrame(
        firstGlobalFrame,
        lastGlobalFrame,
        workerId,
        totalNumOfWorkers,
      );

    const renderSettingsFromProject = getFullRenderingSettings(project);

    // Overwrite settings with user provided settings
    let background = renderSettingsFromProject.background;
    if (overwriteRenderSettings.background) {
      background = new Color(overwriteRenderSettings.background);
    }

    let size = renderSettingsFromProject.size;
    if (overwriteRenderSettings.size) {
      size = new Vector2(
        overwriteRenderSettings.size.x,
        overwriteRenderSettings.size.y,
      );
    }

    // Combine settings
    const combinedSettings = {
      ...renderSettingsFromProject,
      name: project.name,
      hiddenFolderId: hiddenFolderId,
      ...overwriteRenderSettings,
      background,
      size,
      range: [
        renderer.frameToTime(firstWorkerFrame),
        renderer.frameToTime(lastWorkerFrame),
      ] as [number, number],
      // Ensure motion blur is passed through (user settings take precedence)
      motionBlur:
        overwriteRenderSettings.motionBlur ??
        renderSettingsFromProject.motionBlur,
    };

    await renderer.render(combinedSettings);
    window.onRenderComplete();
  } catch (e: any) {
    window.onRenderFailed(e.message);
  }
};

/**
 * Calculate the first and last "global" frame, i.e. frame independent of worker
 */
async function getGlobalFirstAndLastFrame(
  project: Project,
  renderer: Renderer,
  startSecondFromUser: number,
  endSecondFromUser: number,
) {
  const firstGlobalFrame = renderer.timeToFrame(startSecondFromUser);
  let lastGlobalFrame: number;

  // If end value is provided by user, lastFrame can be obtained.
  if (isFinite(endSecondFromUser)) {
    lastGlobalFrame = renderer.timeToFrame(endSecondFromUser);
  } else {
    // Otherwise, endSecondFromUser is infinity, so lastGlobalFrame is the duration of the video.
    const settings = {
      ...getFullRenderingSettings(project),
      name: project.name,
    };
    lastGlobalFrame = await renderer.getNumberOfFrames(settings);
  }

  return {firstGlobalFrame, lastGlobalFrame};
}

async function getWorkerFirstAndLastFrame(
  firstGlobalFrame: number,
  lastGlobalFrame: number,
  workerId: number,
  totalNumOfWorkers: number,
) {
  const videoDurationInFrames = lastGlobalFrame - firstGlobalFrame;
  const framesPerWorker = Math.ceil(videoDurationInFrames / totalNumOfWorkers);

  const offset = workerId === 0 ? 0 : 1;
  const firstWorkerFrame =
    firstGlobalFrame + framesPerWorker * workerId + offset;
  const lastWorkerFrame = Math.min(
    firstWorkerFrame + framesPerWorker - offset,
    lastGlobalFrame,
  );

  return {firstWorkerFrame, lastWorkerFrame};
}
