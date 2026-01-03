import {Circle, Rect, Txt, makeScene2D} from '@revideo/2d';
import {all, createRef, waitFor} from '@revideo/core';

/**
 * Motion Blur Demo Scene
 *
 * Demonstrates motion blur applied to all elements.
 * Motion blur is configured at the scene/project level.
 */
export default makeScene2D('motion-blur', function* (view) {
  // Create refs for animated elements
  const circle = createRef<Circle>();
  const rect = createRef<Rect>();

  // Add all elements
  view.add(
    <>
      {/* Title */}
      <Txt
        text="Motion Blur Demo"
        fill="white"
        fontSize={48}
        fontFamily="Arial"
        fontWeight={700}
        y={-400}
      />
      <Txt
        text="All elements receive motion blur when enabled"
        fill="#888"
        fontSize={24}
        fontFamily="Arial"
        y={-340}
      />

      {/* Circle - fast horizontal movement */}
      <Circle
        ref={circle}
        x={-300}
        y={-100}
        width={120}
        height={120}
        fill="#3b82f6"
      />

      {/* Rectangle - spinning */}
      <Rect
        ref={rect}
        x={0}
        y={150}
        width={160}
        height={80}
        fill="#10b981"
        rotation={0}
      />
    </>,
  );

  // Animate elements
  yield* all(
    // Circle - fast horizontal sweep
    circle().position.x(300, 0.4).to(-300, 0.4),
    // Rectangle - continuous spin
    rect().rotation(720, 2),
  );

  yield* waitFor(0.3);

  // Second pass - faster for more pronounced blur
  yield* all(
    circle().position.x(300, 0.25).to(-300, 0.25),
  );

  yield* waitFor(0.3);

  // Third pass
  yield* all(
    circle().position.x(300, 0.2).to(-300, 0.2),
  );
});
