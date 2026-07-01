/** @jsxImportSource @revideo/2d/lib */
import {makeScene2D} from '@revideo/2d';
import {createRef, waitFor} from '@revideo/core';

import {RubiksCube} from './rubiks-cube';

export default makeScene2D('scramble', function* (view) {
  view.fill('#0d0d12');

  const cube = createRef<RubiksCube>();
  view.add(<RubiksCube ref={cube} size={620} />);

  yield* waitFor(0.5);
  yield* cube().scramble(18);
  yield* waitFor(0.8);
});
