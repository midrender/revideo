import type {Logger} from '../app/Logger';
import type {Scene} from '../scenes';

const SceneStack: Scene[] = [];

/**
 * Get a reference to the current scene.
 */
export function useScene(): Scene {
  const scene = SceneStack.at(-1);
  if (!scene) {
    throw new Error('The scene is not available in the current context.');
  }
  return scene;
}

export function startScene(scene: Scene) {
  SceneStack.push(scene);
}

export function endScene(scene: Scene) {
  if (SceneStack.pop() !== scene) {
    throw new Error('startScene/endScene were called out of order.');
  }
}

export function useLogger(): Logger {
  // Outside a scene we fall back to `console`, which covers the common log
  // methods; the return is typed as `Logger` so callers get the full API
  // (e.g. `profile`), matching how the logger is used within a scene.
  return (SceneStack.at(-1)?.logger ?? console) as Logger;
}

/**
 * Mark the current scene as ready to transition out.
 *
 * @remarks
 * Usually used together with transitions. When a scene is marked as finished,
 * the transition will start but the scene generator will continue running.
 */
export function finishScene() {
  useScene().enterCanTransitionOut();
}
