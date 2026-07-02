import {Stage} from '@revideo/core';
import type {HTMLAttributes} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {useApplication} from '../../contexts';
import {
  usePreviewSettings,
  useSharedSettings,
  useSubscribable,
} from '../../hooks';
import {StageView} from './StageView';

export function PreviewStage(props: HTMLAttributes<HTMLDivElement>) {
  const [stage] = useState(() => new Stage());
  const {player} = useApplication();
  const {size, background} = useSharedSettings();
  const {resolutionScale} = usePreviewSettings();

  useSubscribable(
    player.onRender,
    async () => {
      await stage.render(
        player.playback.currentScene,
        player.playback.previousScene,
      );
    },
    [],
  );

  useEffect(() => {
    stage.configure({resolutionScale, size, background});
    player.requestRender();
  }, [resolutionScale, size, background, player]);

  return <StageView stage={stage} {...props} />;
}
