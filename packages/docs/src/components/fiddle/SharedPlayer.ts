import {parser as javascript} from '@lezer/javascript';
import type {View2D} from '@revideo/2d';
import type {
  Player as PlayerType,
  Project,
  SceneDescription,
  Stage as StageType,
  ThreadGeneratorFactory,
} from '@revideo/core';

type Setter = (value: PlayerType | null) => void;
type FiddleScene = SceneDescription<ThreadGeneratorFactory<View2D>>;

let CoreModule: typeof import('@revideo/core') | null = null;
let ProjectInstance: Project | null = null;
let PlayerInstance: PlayerType | null = null;
let StageInstance: StageType | null = null;
let CurrentSetter: Setter | null = null;
let CurrentParent: HTMLElement | null = null;
let CurrentRatio = 0;

export function disposePlayer(setter: Setter) {
  if (CurrentSetter !== setter || !ProjectInstance) return;
  PlayerInstance?.deactivate();
  CurrentSetter = null;
  CurrentParent = null;
  StageInstance?.finalBuffer.remove();
}

export function updatePlayer(description: FiddleScene) {
  if (!PlayerInstance) return;
  PlayerInstance.playback.reload({
    config: description.config,
    stack: description.stack,
  } as never);
}

export async function borrowPlayer(
  setter: Setter,
  parent: HTMLDivElement,
  ratio: number,
): Promise<PlayerType> {
  if (setter === CurrentSetter) return PlayerInstance!;
  if (
    StageInstance &&
    CurrentParent &&
    StageInstance.finalBuffer.parentElement === CurrentParent
  ) {
    CurrentParent?.removeChild(StageInstance.finalBuffer);
  }
  CurrentSetter?.(null);
  CurrentSetter = setter;
  CurrentParent = parent;

  if (!ProjectInstance) {
    // The revideo runtime is intentionally not bundled with the docs. It is
    // loaded at runtime through the import map injected in the root layout,
    // which points at the ESM bundles copied into public/modules.
    CoreModule = await import(/* webpackIgnore: true */ '@revideo/core');
    const {makeScene2D, Code, LezerHighlighter} = await import(
      /* webpackIgnore: true */ '@revideo/2d'
    );
    const {Player, Stage, makeProject} = CoreModule;

    Code.defaultHighlighter = new LezerHighlighter(
      javascript.configure({
        dialect: 'jsx ts',
      }),
    );

    const description = makeScene2D('fiddle', function* () {
      yield;
    });

    ProjectInstance = makeProject({
      name: 'fiddle',
      scenes: [description],
      experimentalFeatures: true,
      settings: {
        shared: {
          size: {x: 960, y: 540},
        },
      },
    });

    PlayerInstance = new Player(ProjectInstance);
    StageInstance = new Stage();
    PlayerInstance.onRender.subscribe(async () => {
      await StageInstance!.render(
        PlayerInstance!.playback.currentScene!,
        PlayerInstance!.playback.previousScene,
      );
    });
    PlayerInstance.onRecalculated.subscribe(() => {
      if (StageInstance!.finalBuffer.parentElement !== CurrentParent) {
        CurrentParent?.append(StageInstance!.finalBuffer);
        CurrentSetter?.(PlayerInstance);
      }
    });
  }

  if (CurrentRatio !== ratio) {
    const {Vector2, getFullPreviewSettings} = CoreModule!;
    const settings = {
      ...getFullPreviewSettings(ProjectInstance),
      size: new Vector2(960, Math.floor(960 / ratio)),
    };
    StageInstance!.configure(settings);
    await PlayerInstance!.configure(settings);
    CurrentRatio = ratio;
  }

  PlayerInstance!.activate();
  PlayerInstance!.requestReset();
  return PlayerInstance!;
}

export async function tryBorrowPlayer(
  setter: Setter,
  parent: HTMLDivElement,
  ratio: number,
): Promise<PlayerType | null> {
  if (!CurrentSetter) {
    return borrowPlayer(setter, parent, ratio);
  }

  return null;
}
