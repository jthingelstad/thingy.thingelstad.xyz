import * as THREE from "three";

/**
 * Small movements laid over whatever pose he is in, for the `life="on"` prototype.
 * Nothing here touches the rig or the cloth: it adds to the bones a pose has
 * already set, and it bends the antenna in the vertex shader, since the antenna
 * has no bone of its own.
 */
export type LifeSettings = {
  /** Seconds between blinks, on average. */
  blinkEvery: number;
  /** How often a blink comes in a pair, 0 to 1. */
  doubleBlink: number;
  /** Milliseconds his eyes stay shut when his expression changes. 0 swaps at once. */
  faceChange: number;
  /** How much his head bobs when his expression or pose changes. */
  reaction: number;
  /** Seconds to move between poses. 0 snaps. */
  blend: number;
  /** How far he goes past a pose before settling into it. */
  settle: number;
  /** How much he breathes. 1 is about a degree and a half at the chest. */
  breath: number;
  breathsPerMinute: number;
  /** The most he turns toward the pointer, in degrees. */
  look: number;
  /** How quickly his head gets there. */
  lookSpeed: number;
  /** How far he glances around when nothing is happening, in degrees. */
  glance: number;
  /** How far the antenna swings. */
  antenna: number;
  /** How many times a second the antenna bounces. */
  antennaBounce: number;
  /** How quickly the antenna comes to rest, 0 to 1. */
  antennaDamping: number;
};

export const LIFE_DEFAULTS: LifeSettings = {
  blinkEvery: 4.5,
  doubleBlink: 0.15,
  faceChange: 110,
  reaction: 0.6,
  blend: 0.45,
  settle: 0.5,
  breath: 0.8,
  breathsPerMinute: 13,
  look: 24,
  lookSpeed: 6,
  glance: 7,
  antenna: 1,
  antennaBounce: 3.2,
  antennaDamping: 0.14,
};

/** The way into a pose: a smooth start, and past the pose by `settle` before resting. */
export function poseEase(t: number, settle: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  const smooth = clamped * clamped * (3 - 2 * clamped);
  const rest = smooth - 1;
  return 1 + (settle + 1) * rest ** 3 + settle * rest ** 2;
}

/** Limits a value near `limit` without a hard stop. */
export function softLimit(value: number, limit: number): number {
  return limit <= 0 ? 0 : limit * Math.tanh(value / limit);
}

/**
 * Where to turn, as yaw and pitch in radians, for a direction in his own space.
 * Behind him he gives up rather than wringing his neck: `attention` falls to 0.
 */
export function gaze(
  x: number,
  y: number,
  z: number,
): { yaw: number; pitch: number; attention: number } {
  const yaw = Math.atan2(x, z);
  const pitch = Math.atan2(y, Math.hypot(x, z));
  const side = Math.abs(yaw);
  const low = (100 * Math.PI) / 180;
  const high = (140 * Math.PI) / 180;
  const faded = Math.min(Math.max((side - low) / (high - low), 0), 1);
  return { yaw, pitch, attention: 1 - faded * faded * (3 - 2 * faded) };
}

/** Bends the antenna by a shared offset, in the shader, for the vertices weighted to it. */
const ANTENNA_ATTRIBUTE = "thingyAntenna";

function bendAntenna(
  material: THREE.Material,
  offset: { value: THREE.Vector3 },
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uThingyAntenna = offset;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\nattribute float ${ANTENNA_ATTRIBUTE};\nuniform vec3 uThingyAntenna;`,
      )
      .replace(
        "#include <skinning_vertex>",
        `#include <skinning_vertex>\ntransformed += uThingyAntenna * ${ANTENNA_ATTRIBUTE};`,
      );
  };
  material.customProgramCacheKey = () => "thingy-antenna";
  material.needsUpdate = true;
}

const SPHERE = 0.035;
const STALK_TOP = 0.85;
const FORWARD_REACH = 3;
const SWING_LIMIT = 0.085;
const TURN_LEVER = 0.3;

type Held = {
  bone: THREE.Bone;
  base: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 };
  shown: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 };
  from: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 };
};

const pose3 = () => ({
  p: new THREE.Vector3(),
  q: new THREE.Quaternion(),
  s: new THREE.Vector3(1, 1, 1),
});

const scratch = {
  gap: new THREE.Vector3(),
  euler: new THREE.Euler(0, 0, 0, "YXZ"),
  turn: new THREE.Quaternion(),
  parent: new THREE.Quaternion(),
  inverse: new THREE.Quaternion(),
  vector: new THREE.Vector3(),
  point: new THREE.Vector3(),
  forward: new THREE.Vector3(),
  head: new THREE.Vector3(),
  tip: new THREE.Vector3(),
  model: new THREE.Quaternion(),
  matrix: new THREE.Matrix4(),
};

/** A draw that takes longer than this, in seconds, is one he can't keep up with. */
const SLOW_DRAW = 0.08;
/** How many seconds of slow draws he allows before he stands still instead. */
export const STRAIN_LIMIT = 1.5;

/**
 * Keeps count of how far behind a machine is falling. One long draw, from
 * compiling a shader or loading a scene, can't end it alone; quick draws pay it
 * back; only a machine that stays slow gets there.
 */
export function addStrain(strain: number, draw: number): number {
  return Math.max(0, strain + (draw > SLOW_DRAW ? Math.min(draw, 0.5) : -draw));
}

export type LifeFrame = {
  camera: THREE.Camera;
  rect: { left: number; top: number; width: number; height: number };
  /** Where the pointer is, in client pixels, if he should attend to it. */
  pointer: { x: number; y: number } | null;
  /** He is spinning through a hop and should not try to look at anything. */
  busy: boolean;
};

export class Life {
  settings: LifeSettings = { ...LIFE_DEFAULTS };
  #model: THREE.Object3D;
  #held: Held[] = [];
  #spine?: THREE.Bone;
  #chest?: THREE.Bone;
  #neck?: THREE.Bone;
  #head?: THREE.Bone;
  #clavicleL?: THREE.Bone;
  #clavicleR?: THREE.Bone;
  #time = Math.random() * 100;
  #blendAt = 1;
  #yaw = { x: 0, v: 0 };
  #pitch = { x: 0, v: 0 };
  #nod = { x: 0, v: 0 };
  #glance = { yaw: 0, pitch: 0, next: 2 };
  #uniform = { value: new THREE.Vector3() };
  #tipBind?: THREE.Vector3;
  #tipMatrix = new THREE.Matrix4();
  #tip?: THREE.Vector3;
  #tipVelocity = new THREE.Vector3();
  #hasAntenna = false;

  /** Called when he has shifted his gaze a long way, which is when eyes tend to shut. */
  onBigGlance?: () => void;

  constructor(model: THREE.Object3D) {
    this.#model = model;
    const seen = new Set<THREE.Bone>();
    model.traverse((part) => {
      if (part instanceof THREE.Bone && !seen.has(part)) {
        seen.add(part);
        this.#held.push({
          bone: part,
          base: pose3(),
          shown: pose3(),
          from: pose3(),
        });
      }
    });
    const bone = (name: string) =>
      model.getObjectByName(name) as THREE.Bone | undefined;
    this.#spine = bone("spine");
    this.#chest = bone("chest");
    this.#neck = bone("neck");
    this.#head = bone("head");
    this.#clavicleL = bone("clavicle.L");
    this.#clavicleR = bone("clavicle.R");
    this.capture();
    for (const held of this.#held) {
      held.shown.p.copy(held.base.p);
      held.shown.q.copy(held.base.q);
      held.shown.s.copy(held.base.s);
    }
    this.#prepareAntenna();
  }

  /**
   * The rig has no antenna bone. The stalk has a ring at each end and the ball
   * sits on the top ring, so marking the top ring and the ball makes a stiff wire
   * that pivots where it leaves his head.
   */
  #prepareAntenna(): void {
    let beacon: THREE.SkinnedMesh | undefined;
    const surfaces: THREE.SkinnedMesh[] = [];
    this.#model.traverse((part) => {
      if (!(part instanceof THREE.SkinnedMesh)) return;
      const material = part.material as THREE.Material;
      if (material.name === "Thingy_Beacon") beacon = part;
      else if (
        material.name === "Thingy_Surface" &&
        !part.name.startsWith("Thingy_Accessory_") &&
        part.parent?.name.startsWith("Thingy_")
      )
        surfaces.push(part);
    });
    const ball = beacon;
    if (!ball || !surfaces.length || !this.#head) return;
    ball.geometry.computeBoundingBox();
    const box = ball.geometry.boundingBox!;
    const axisX = (box.min.x + box.max.x) / 2;
    const axisZ = (box.min.z + box.max.z) / 2;
    ball.geometry.setAttribute(
      ANTENNA_ATTRIBUTE,
      new THREE.BufferAttribute(
        new Uint8Array(ball.geometry.attributes.position!.count).fill(255),
        1,
        true,
      ),
    );
    bendAntenna(ball.material as THREE.Material, this.#uniform);
    for (const surface of surfaces) {
      const position = surface.geometry.attributes.position!;
      const marks = new Uint8Array(position.count);
      for (let index = 0; index < position.count; index++) {
        const near = Math.hypot(
          position.getX(index) - axisX,
          position.getZ(index) - axisZ,
        );
        if (position.getY(index) > STALK_TOP && near < SPHERE)
          marks[index] = 255;
      }
      surface.geometry.setAttribute(
        ANTENNA_ATTRIBUTE,
        new THREE.BufferAttribute(marks, 1, true),
      );
      bendAntenna(surface.material as THREE.Material, this.#uniform);
    }
    const headIndex = ball.skeleton.bones.indexOf(this.#head);
    if (headIndex < 0) return;
    this.#tipBind = new THREE.Vector3(
      axisX,
      (box.min.y + box.max.y) / 2,
      axisZ,
    );
    this.#tipMatrix
      .copy(ball.skeleton.boneInverses[headIndex]!)
      .multiply(ball.bindMatrix);
    this.#hasAntenna = true;
  }

  /** Puts every bone back as the pose left it, so nothing here accumulates. */
  restore(): void {
    for (const { bone, base } of this.#held) {
      bone.position.copy(base.p);
      bone.quaternion.copy(base.q);
      bone.scale.copy(base.s);
    }
  }

  /** Remembers what the pose just set, ready to add to. */
  capture(): void {
    for (const { bone, base } of this.#held) {
      base.p.copy(bone.position);
      base.q.copy(bone.quaternion);
      base.s.copy(bone.scale);
    }
  }

  /** Starts moving from wherever he stands now. Call before the new pose is set. */
  startBlend(): void {
    for (const { from, shown } of this.#held) {
      from.p.copy(shown.p);
      from.q.copy(shown.q);
      from.s.copy(shown.s);
    }
    this.#blendAt = 0;
    this.react(0.5);
  }

  /** A little bob of the head and a flick of the antenna. */
  react(strength = 1): void {
    const push = this.settings.reaction * strength;
    this.#nod.v += push * 2.4;
    this.#tipVelocity.y -= push * 0.9;
  }

  /** How he is turned right now, for a test or a read-out. */
  get state(): {
    yaw: number;
    pitch: number;
    antenna: [number, number, number];
  } {
    const { x, y, z } = this.#uniform.value;
    return {
      yaw: THREE.MathUtils.radToDeg(this.#yaw.x),
      pitch: THREE.MathUtils.radToDeg(this.#pitch.x),
      antenna: [x, y, z],
    };
  }

  /** Whether nothing is moving but his breath, so he can be drawn less often. */
  get settled(): boolean {
    return (
      this.#blendAt >= 1 &&
      Math.abs(this.#yaw.v) + Math.abs(this.#pitch.v) < 0.06 &&
      Math.abs(this.#nod.v) < 0.05 &&
      this.#tipVelocity.lengthSq() < 0.0025
    );
  }

  /** For one drawing: exactly as the pose has him, with nothing added. */
  still(): void {
    this.restore();
    this.#uniform.value.set(0, 0, 0);
  }

  /** Takes every addition off and forgets what was moving. */
  stop(): void {
    this.still();
    this.#tip = undefined;
    this.#tipVelocity.set(0, 0, 0);
    this.#yaw = { x: 0, v: 0 };
    this.#pitch = { x: 0, v: 0 };
    this.#nod = { x: 0, v: 0 };
    this.#blendAt = 1;
  }

  #turnInModel(bone: THREE.Bone | undefined, turn: THREE.Quaternion): void {
    if (!bone) return;
    scratch.parent.identity();
    for (
      let node: THREE.Object3D | null = bone.parent;
      node && node !== this.#model;
      node = node.parent
    )
      scratch.parent.premultiply(node.quaternion);
    scratch.inverse.copy(scratch.parent).invert();
    bone.quaternion
      .premultiply(scratch.parent)
      .premultiply(turn)
      .premultiply(scratch.inverse);
  }

  #turn(
    bone: THREE.Bone | undefined,
    pitch: number,
    yaw: number,
    roll: number,
  ): void {
    scratch.euler.set(pitch, yaw, roll);
    scratch.turn.setFromEuler(scratch.euler);
    this.#turnInModel(bone, scratch.turn);
  }

  #target(frame: LifeFrame, dt: number): { yaw: number; pitch: number } {
    const { look, glance } = this.settings;
    const limit = THREE.MathUtils.degToRad(look);
    if (frame.busy || limit <= 0 || !this.#head) return { yaw: 0, pitch: 0 };
    const { camera, rect, pointer } = frame;
    camera.getWorldDirection(scratch.forward);
    this.#head.getWorldPosition(scratch.head);
    const point = scratch.point.copy(scratch.head);
    if (pointer && rect.width && rect.height) {
      scratch.vector
        .set(
          ((pointer.x - rect.left) / rect.width) * 2 - 1,
          -((pointer.y - rect.top) / rect.height) * 2 + 1,
          0,
        )
        .unproject(camera);
      const depth = scratch.gap
        .copy(scratch.head)
        .sub(scratch.vector)
        .dot(scratch.forward);
      point.copy(scratch.vector).addScaledVector(scratch.forward, depth);
    }
    // Out in front of the screen, along the line to whoever is looking.
    point.addScaledVector(scratch.forward, -FORWARD_REACH);
    point.sub(scratch.head);
    this.#model.getWorldQuaternion(scratch.model);
    point.applyQuaternion(scratch.inverse.copy(scratch.model).invert());
    const seen = gaze(point.x, point.y, point.z);
    let yaw = seen.yaw * seen.attention;
    let pitch = seen.pitch * seen.attention;
    if (!pointer) {
      this.#glance.next -= dt;
      if (this.#glance.next <= 0) {
        const reach = THREE.MathUtils.degToRad(glance);
        const quiet = Math.random() < 0.4;
        const before = this.#glance.yaw;
        this.#glance.yaw = quiet ? 0 : (Math.random() * 2 - 1) * reach;
        this.#glance.pitch = quiet ? 0 : (Math.random() * 2 - 1) * reach * 0.45;
        this.#glance.next = 2.5 + Math.random() * 5;
        if (reach > 0 && Math.abs(this.#glance.yaw - before) > reach * 0.7)
          this.onBigGlance?.();
      }
      yaw += this.#glance.yaw;
      pitch += this.#glance.pitch;
    }
    return {
      yaw: softLimit(yaw, limit),
      pitch: softLimit(pitch, limit * 0.55),
    };
  }

  /** Follows without a jolt: a critically damped spring on one number. */
  #follow(
    state: { x: number; v: number },
    target: number,
    speed: number,
    dt: number,
  ): void {
    state.v += (speed * speed * (target - state.x) - 2 * speed * state.v) * dt;
    state.x += state.v * dt;
  }

  #stepAntenna(dt: number): void {
    if (!this.#hasAntenna || !this.#head || !this.#tipBind) return;
    const { antenna, antennaBounce, antennaDamping } = this.settings;
    this.#model.updateWorldMatrix(true, true);
    scratch.tip
      .copy(this.#tipBind)
      .applyMatrix4(
        scratch.matrix.multiplyMatrices(
          this.#head.matrixWorld,
          this.#tipMatrix,
        ),
      );
    this.#model.getWorldQuaternion(scratch.model);
    // The antenna stands almost on the axis he turns about, so a real turn hardly
    // moves its tip. It swings as if it stood further out, or it would never swing.
    scratch.vector
      .set(this.#yaw.x * TURN_LEVER, 0, 0)
      .applyQuaternion(scratch.model);
    scratch.tip.add(scratch.vector);
    if (!this.#tip) {
      this.#tip = scratch.tip.clone();
      this.#tipVelocity.set(0, 0, 0);
    }
    const omega = antennaBounce * Math.PI * 2;
    const steps = Math.max(1, Math.ceil(dt * 240));
    const step = dt / steps;
    for (let index = 0; index < steps; index++) {
      scratch.vector.copy(this.#tip).sub(scratch.tip);
      this.#tipVelocity
        .addScaledVector(scratch.vector, -omega * omega * step)
        .addScaledVector(this.#tipVelocity, -2 * antennaDamping * omega * step);
      this.#tip.addScaledVector(this.#tipVelocity, step);
    }
    scratch.vector.copy(this.#tip).sub(scratch.tip).multiplyScalar(antenna);
    scratch.vector.applyQuaternion(
      scratch.inverse.copy(scratch.model).invert(),
    );
    this.#uniform.value.copy(scratch.vector).clampLength(0, SWING_LIMIT);
  }

  /** One frame's worth of everything. Call after `capture`, before drawing. */
  apply(dt: number, frame: LifeFrame): void {
    const settings = this.settings;
    this.#time += dt;
    const blending = settings.blend > 0 && this.#blendAt < 1;
    if (blending)
      this.#blendAt = Math.min(this.#blendAt + dt / settings.blend, 1);
    else this.#blendAt = 1;
    const amount = poseEase(this.#blendAt, settings.settle);
    for (const { bone, base, shown, from } of this.#held) {
      if (this.#blendAt >= 1) {
        shown.p.copy(base.p);
        shown.q.copy(base.q);
        shown.s.copy(base.s);
      } else {
        shown.p.lerpVectors(from.p, base.p, amount);
        shown.q.slerpQuaternions(from.q, base.q, amount);
        shown.s.lerpVectors(from.s, base.s, amount);
      }
      bone.position.copy(shown.p);
      bone.quaternion.copy(shown.q);
      bone.scale.copy(shown.s);
    }
    const breathPhase = (this.#time * settings.breathsPerMinute * TAU) / 60;
    const breath =
      Math.sin(breathPhase + 0.35 * Math.sin(breathPhase)) * settings.breath;
    const sway = Math.sin((breathPhase * 0.37) % TAU) * settings.breath;
    const unit = THREE.MathUtils.degToRad(1.5);
    // The hips stay where they are: no bone below them would carry his feet along.
    this.#turn(this.#spine, -breath * unit * 0.4, 0, sway * unit * 0.3);
    this.#turn(this.#chest, -breath * unit * 0.7, 0, sway * unit * 0.15);
    this.#turn(this.#clavicleL, 0, 0, breath * unit * 0.8);
    this.#turn(this.#clavicleR, 0, 0, -breath * unit * 0.8);

    const wanted = this.#target(frame, dt);
    this.#follow(this.#yaw, wanted.yaw, settings.lookSpeed, dt);
    this.#follow(this.#pitch, wanted.pitch, settings.lookSpeed, dt);
    // A nod is a short ringing bounce, so it reads as a reaction and not as a look.
    this.#nod.v += (-190 * this.#nod.x - 11 * this.#nod.v) * dt;
    this.#nod.x += this.#nod.v * dt;
    const yaw = this.#yaw.x;
    const pitch = -this.#pitch.x + this.#nod.x * unit * 4 + breath * unit * 0.7;
    const roll = -yaw * 0.09;
    this.#turn(this.#chest, pitch * 0.12, yaw * 0.15, roll * 0.2);
    this.#turn(this.#neck, pitch * 0.33, yaw * 0.3, roll * 0.3);
    this.#turn(this.#head, pitch * 0.55, yaw * 0.55, roll * 0.5);
    this.#stepAntenna(dt);
  }
}

const TAU = Math.PI * 2;
