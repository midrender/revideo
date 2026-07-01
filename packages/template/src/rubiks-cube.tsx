/** @jsxImportSource @revideo/2d/lib */
import {Node, initial, signal} from '@revideo/2d';
import type {NodeProps} from '@revideo/2d';
import type {SignalValue, SimpleSignal} from '@revideo/core';
import {Random, all, createSignal, easeInOutCubic} from '@revideo/core';

type Vec3 = [number, number, number];

const AXES: Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

// Standard cube colors keyed by [axis, sign].
const FACE_COLORS: Record<string, string> = {
  '0:1': '#b71234', // +x right  red
  '0:-1': '#ff5800', // -x left   orange
  '1:1': '#fdfdfd', // +y up     white
  '1:-1': '#ffd500', // -y down   yellow
  '2:1': '#009b48', // +z front  green
  '2:-1': '#0046ad', // -z back   blue
};

/** Rotate a vector about a coordinate axis by `angle` radians (y is up). */
function rotateAxis(v: Vec3, axis: number, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const [x, y, z] = v;
  if (axis === 0) {
    return [x, y * c - z * s, y * s + z * c];
  }
  if (axis === 1) {
    return [x * c + z * s, y, -x * s + z * c];
  }
  return [x * c - y * s, x * s + y * c, z];
}

/** Exact 90° rotation, snapped back to integers. */
function rotateQuarter(v: Vec3, axis: number, dir: number): Vec3 {
  const r = rotateAxis(v, axis, (dir * Math.PI) / 2);
  return [Math.round(r[0]), Math.round(r[1]), Math.round(r[2])];
}

interface Sticker {
  /** Center of the owning cubie, components in {-1, 0, 1}. */
  pos: Vec3;
  /** Outward unit normal of the sticker. */
  normal: Vec3;
  color: string;
}

interface ActiveTurn {
  axis: number;
  layer: number;
}

export interface RubiksCubeProps extends NodeProps {
  /** Width/height the cube is drawn into, in pixels. */
  size?: SignalValue<number>;
}

/**
 * A self-contained 3x3 Rubik's cube. The cube is modelled as 54 stickers in
 * 3D and orthographically projected in {@link draw}; {@link scramble} animates
 * a sequence of quarter-turns.
 */
export class RubiksCube extends Node {
  @initial(400)
  @signal()
  public declare readonly size: SimpleSignal<number, this>;

  private readonly stickers: Sticker[] = [];
  private active: ActiveTurn | null = null;

  // Animation state read inside draw().
  private readonly turnAngle = createSignal(0);
  private readonly yaw = createSignal(0);

  // Fixed viewing angles: tilt so the top, front and right faces are visible.
  private readonly baseYaw = -0.62;
  private readonly pitch = 0.52;

  public constructor(props?: RubiksCubeProps) {
    super({...props});

    for (let axis = 0; axis < 3; axis++) {
      for (const sign of [1, -1] as const) {
        const others = [0, 1, 2].filter(i => i !== axis);
        for (const a of [-1, 0, 1]) {
          for (const b of [-1, 0, 1]) {
            const pos: Vec3 = [0, 0, 0];
            pos[axis] = sign;
            pos[others[0]] = a;
            pos[others[1]] = b;
            const normal: Vec3 = [0, 0, 0];
            normal[axis] = sign;
            this.stickers.push({
              pos,
              normal,
              color: FACE_COLORS[`${axis}:${sign}`],
            });
          }
        }
      }
    }
  }

  /** Four corners of a sticker face, inset by `half` for the gap between tiles. */
  private stickerCorners(sticker: Sticker, half: number): Vec3[] {
    const axis = sticker.normal.findIndex(c => c !== 0);
    const [i, j] = [0, 1, 2].filter(k => k !== axis);
    const u = AXES[i];
    const v = AXES[j];
    const center: Vec3 = [
      sticker.pos[0] + sticker.normal[0] * 0.5,
      sticker.pos[1] + sticker.normal[1] * 0.5,
      sticker.pos[2] + sticker.normal[2] * 0.5,
    ];
    const corners: Array<[number, number]> = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    return corners.map(([su, sv]) => [
      center[0] + (u[0] * su + v[0] * sv) * half,
      center[1] + (u[1] * su + v[1] * sv) * half,
      center[2] + (u[2] * su + v[2] * sv) * half,
    ]);
  }

  private project(v: Vec3): Vec3 {
    return rotateAxis(rotateAxis(v, 1, this.baseYaw + this.yaw()), 0, this.pitch);
  }

  protected override async draw(context: CanvasRenderingContext2D) {
    const scale = this.size() / 4;
    const angle = this.turnAngle();

    const faces: Array<{points: Vec3[]; depth: number; color: string}> = [];
    for (const sticker of this.stickers) {
      const turning =
        this.active !== null && sticker.pos[this.active.axis] === this.active.layer;

      let normal = sticker.normal;
      if (turning) {
        normal = rotateAxis(normal, this.active!.axis, angle);
      }
      const viewNormal = this.project(normal);
      if (viewNormal[2] <= 0.02) {
        continue; // back-facing
      }

      const outer = this.stickerCorners(sticker, 0.5);
      const inner = this.stickerCorners(sticker, 0.44);
      const transform = (corners: Vec3[]) =>
        corners.map(c => this.project(turning ? rotateAxis(c, this.active!.axis, angle) : c));

      const outerView = transform(outer);
      const innerView = transform(inner);
      const depth =
        (innerView[0][2] + innerView[1][2] + innerView[2][2] + innerView[3][2]) / 4;

      faces.push({points: outerView, depth, color: '#0a0a0d'});
      faces.push({points: innerView, depth: depth + 0.001, color: sticker.color});
    }

    faces.sort((a, b) => a.depth - b.depth);

    for (const face of faces) {
      context.beginPath();
      face.points.forEach((p, i) => {
        const x = p[0] * scale;
        const y = -p[1] * scale;
        if (i === 0) {
          context.moveTo(x, y);
          return;
        }
        context.lineTo(x, y);
      });
      context.closePath();
      context.fillStyle = face.color;
      context.fill();
    }
  }

  private *turn(axis: number, layer: number, dir: number, duration: number) {
    this.active = {axis, layer};
    this.turnAngle(0);
    yield* this.turnAngle((dir * Math.PI) / 2, duration, easeInOutCubic);

    for (const sticker of this.stickers) {
      if (sticker.pos[axis] !== layer) {
        continue;
      }
      sticker.pos = rotateQuarter(sticker.pos, axis, dir);
      sticker.normal = rotateQuarter(sticker.normal, axis, dir);
    }

    this.active = null;
    this.turnAngle(0);
  }

  /** Animate `moves` deterministic quarter-turns while the cube slowly spins. */
  public *scramble(moves = 18, moveDuration = 0.34) {
    yield* all(
      this.yaw(this.yaw() + Math.PI * 2, moves * moveDuration, easeInOutCubic),
      this.runScramble(moves, moveDuration),
    );
  }

  private *runScramble(moves: number, moveDuration: number) {
    const random = new Random(1); // fixed seed keeps renders reproducible
    let lastAxis = -1;
    for (let i = 0; i < moves; i++) {
      let axis = random.nextInt(0, 3);
      if (axis === lastAxis) {
        axis = (axis + 1 + random.nextInt(0, 2)) % 3; // avoid repeating a face
      }
      lastAxis = axis;
      const layer = ([-1, 1] as const)[random.nextInt(0, 2)];
      const dir = ([-1, 1] as const)[random.nextInt(0, 2)];
      yield* this.turn(axis, layer, dir, moveDuration);
    }
  }
}
