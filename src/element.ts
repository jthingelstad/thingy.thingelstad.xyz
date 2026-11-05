import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  addStrain,
  Life,
  LIFE_DEFAULTS,
  STRAIN_LIMIT,
  type LifeSettings,
} from "./life";
import {
  ALL_POSES,
  FACES,
  HOME_CAMERA,
  SCENES,
  VIEW_LIMITS,
  accessoriesIn,
  anyPose,
  face,
  faceOffset,
  modelVersion,
  parseView,
  scene,
  shownNodes,
  stageOf,
  posterPath,
  viewValue,
  type AnyPose,
  type SceneKey,
  type Version,
} from "./config";

const defaultAssets = new URL("character/", import.meta.url).href;
const styles = `
:host{display:block;position:relative;contain:layout style;min-height:160px}
canvas{display:block;width:100%;height:100%;outline:none;touch-action:pan-y;cursor:grab}canvas:active{cursor:grabbing}
canvas:focus-visible{outline:2px solid var(--thingy-character-focus,#23533b);outline-offset:-4px;border-radius:8px}
.frame{position:absolute;inset:0}img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
:host([data-ready]) img{display:none}.status{position:absolute;bottom:8px;left:12px;right:12px;text-align:center;font:14px/1.5 system-ui;color:#51544f}
:host([data-ready]) .status{display:none}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(prefers-reduced-motion:reduce){img{transition:none}}
`;

function dispose(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) {
    texture.dispose();
    if (texture.image instanceof ImageBitmap) texture.image.close();
  }
}

const TURN = Math.PI * 2;
/** How often to draw him with life on, in seconds, with a little slack for timing. */
const BUSY_FRAME = 1 / 60 - 0.004;
const QUIET_FRAME = 1 / 30 - 0.004;

export type HopOptions = {
  /** How high he goes, in CSS pixels. The host moves, so he can leave his frame. */
  height?: number;
  /** 1 turns him to his left as seen from the front, -1 the other way. */
  direction?: 1 | -1;
  turns?: number;
};

/** A framework-independent character. All model and decoder requests stay local. */
export class ThingyCharacter extends HTMLElement {
  static observedAttributes = [
    "scene",
    "pose",
    "accessories",
    "light",
    "motion",
    "asset-base",
    "version",
    "face",
    "blink",
    "zoom",
    "poster",
    "view-label",
    "view",
    "life",
  ];
  #root = this.attachShadow({ mode: "open" });
  #renderer?: THREE.WebGLRenderer;
  #scene = new THREE.Scene();
  #camera = new THREE.OrthographicCamera(-2, 2, 1.7, -1.7, 0.05, 60);
  #controls?: OrbitControls;
  #model?: THREE.Group;
  #mixer?: THREE.AnimationMixer;
  #clips: THREE.AnimationClip[] = [];
  #action?: THREE.AnimationAction;
  #environment?: THREE.WebGLRenderTarget;
  #observer?: ResizeObserver;
  #intersection?: IntersectionObserver;
  #abort = new AbortController();
  #clock = new THREE.Timer();
  #frame = 0;
  #visible = true;
  #dirty = true;
  #generation = 0;
  #currentScene?: SceneKey;
  #currentVersion?: Version;
  #heldPose = "";
  #faceMap?: THREE.Texture;
  #blinkTimer = 0;
  #faceTimer = 0;
  #life?: Life;
  #lifeRunning = false;
  #sinceDrawn = 0;
  #drewAt = 0;
  #strain = 0;
  #strained = false;
  #lifeSettings: LifeSettings = { ...LIFE_DEFAULTS };
  #pointer: { x: number; y: number } | null = null;
  #pointerUntil = 0;
  #press?: { x: number; y: number; at: number };
  #head?: THREE.Object3D;
  #beacon = new THREE.PointLight(0xff933f, 0, 1.2, 2);
  #shadow?: THREE.MeshBasicMaterial;
  #hop?: {
    start: number;
    duration: number;
    from: number;
    to: number;
    height: number;
    lift: number;
  };
  #lift = 0;
  #reduced = matchMedia("(prefers-reduced-motion: reduce)");

  get scene(): SceneKey {
    return scene(this.getAttribute("scene"));
  }
  get pose(): AnyPose {
    return this.#stage().pose;
  }
  get accessories(): string[] {
    return this.#stage().accessories;
  }
  /** Whether the current pose has any motion to play. Some are a single frame. */
  get moves(): boolean {
    return (this.#action?.getClip().duration ?? 0) > 0.1;
  }
  get playing(): boolean {
    return this.getAttribute("motion") === "on" && !this.#reduced.matches;
  }
  /** Whether the small movements are running. Never under reduced motion. */
  get alive(): boolean {
    return (
      this.getAttribute("life") === "on" &&
      !this.#reduced.matches &&
      !this.#strained
    );
  }
  /** Whether he stopped moving because this machine couldn't keep up. */
  get strained(): boolean {
    return this.#strained;
  }
  get lifeSettings(): LifeSettings {
    return { ...this.#lifeSettings };
  }
  set lifeSettings(value: Partial<LifeSettings>) {
    this.#lifeSettings = { ...this.#lifeSettings, ...value };
    if (this.#life) this.#life.settings = this.#lifeSettings;
    this.#scheduleBlink();
  }
  /** How he is turned right now, while he is alive. */
  get lifeState() {
    return this.alive ? this.#life?.state : undefined;
  }
  get version(): Version {
    return modelVersion(this.getAttribute("version"));
  }
  get zoomable(): boolean {
    return this.getAttribute("zoom") !== "off";
  }
  get assetBase(): string {
    return new URL(
      this.getAttribute("asset-base") || defaultAssets,
      location.href,
    ).href;
  }

  /** Where he has been turned to, as the `view` attribute would say it. */
  get view(): string {
    if (!this.#controls) return "";
    const where = new THREE.Spherical().setFromVector3(
      this.#camera.position.clone().sub(this.#controls.target),
    );
    return viewValue({
      azimuth: THREE.MathUtils.radToDeg(where.theta),
      polar: THREE.MathUtils.radToDeg(where.phi),
      zoom: this.#camera.zoom,
    });
  }

  #stage() {
    return stageOf(
      this.scene,
      this.getAttribute("accessories"),
      anyPose(this.getAttribute("pose")),
    );
  }

  connectedCallback(): void {
    this.#abort = new AbortController();
    this.#root.innerHTML = `<style>${styles}</style><div class="frame"></div><img alt="" decoding="async"><span class="status" role="status">Getting Thingy ready…</span><span class="sr">Drag to turn Thingy. Use arrow keys to rotate, plus and minus to zoom.</span>`;
    this.setAttribute("role", "group");
    this.#updatePoster();
    this.#initialize();
  }

  attributeChangedCallback(
    name: string,
    before: string | null,
    after: string | null,
  ): void {
    if (before === after) return;
    if (!this.isConnected || !this.#renderer) return;
    this.#updatePoster();
    if (name === "scene" || name === "asset-base" || name === "version")
      void this.#load();
    else if (name === "light") this.#setLight();
    else if (name === "motion") this.#setMotion();
    else if (name === "life") {
      this.#strained = false;
      this.#strain = 0;
      this.#setLife();
    } else if (name === "face") this.#changeFace(before);
    else if (name === "blink") this.#scheduleBlink();
    else if (name === "zoom" || name === "view-label") this.#setZoom();
    else if (name === "view") this.#setView();
    else if (name === "pose" || name === "accessories") this.#setPose();
  }

  /** A spin still dying away from a drag would carry him off a set angle. */
  #stopSpin(): void {
    if (!this.#controls) return;
    this.#controls.enableDamping = false;
    this.#controls.update();
    this.#controls.enableDamping = true;
  }

  resetView(): void {
    this.#stopSpin();
    this.#camera.position.set(...HOME_CAMERA.position);
    this.#camera.zoom = 1;
    this.#camera.updateProjectionMatrix();
    this.#controls?.target.set(...HOME_CAMERA.target);
    this.#controls?.update();
    this.#dirty = true;
  }

  #setView(): void {
    const view = parseView(this.getAttribute("view"));
    if (!view || !this.#controls) return;
    this.#stopSpin();
    const distance = this.#camera.position
      .clone()
      .sub(this.#controls.target)
      .length();
    this.#camera.position
      .setFromSphericalCoords(
        distance,
        THREE.MathUtils.degToRad(view.polar),
        THREE.MathUtils.degToRad(view.azimuth),
      )
      .add(this.#controls.target);
    this.#camera.zoom = view.zoom;
    this.#camera.updateProjectionMatrix();
    this.#controls.update();
    this.#dirty = true;
  }

  /**
   * A picture of him in his pose and at this angle, square and transparent. It
   * rejects if there is no model to draw. The frame is drawn and restored in one
   * task, so nothing shows on the page.
   */
  picture(size = 1000): Promise<Blob> {
    const renderer = this.#renderer;
    if (!renderer || !this.#model || !this.hasAttribute("data-ready"))
      return Promise.reject(new Error("Thingy is not ready"));
    const canvas = renderer.domElement;
    const ratio = renderer.getPixelRatio();
    const { left, right } = this.#camera;
    // A picture is the pose he was given, not whatever moment it caught: eyes
    // open, nothing added. The next frame carries on from here.
    if (this.alive) {
      this.#life?.still();
      this.#setFace();
      this.#sinceDrawn = 1;
    }
    const pending = new Promise<Blob>((resolve, reject) => {
      renderer.setPixelRatio(1);
      renderer.setSize(size, size, false);
      this.#camera.left = this.#camera.bottom;
      this.#camera.right = this.#camera.top;
      this.#camera.updateProjectionMatrix();
      renderer.render(this.#scene, this.#camera);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("No picture was made")),
        "image/png",
      );
    });
    renderer.setPixelRatio(ratio);
    this.#camera.left = left;
    this.#camera.right = right;
    this.#resize();
    renderer.render(this.#scene, this.#camera);
    return pending;
  }

  /**
   * A jump with a spin, for a host page to answer a tap with. A second call
   * takes over from wherever he is. Never under reduced motion.
   */
  hop({ height = 40, direction = 1, turns = 1 }: HopOptions = {}): void {
    if (!this.#model || this.#reduced.matches) return;
    const peak = Math.min(Math.max(height, 0), 240);
    const from = this.#model.rotation.y;
    this.#hop = {
      start: performance.now(),
      // Higher takes longer, so a big jump has the weight of one.
      duration: 560 + peak * 3.2,
      from,
      to: (Math.round(from / TURN) + (direction < 0 ? -1 : 1) * turns) * TURN,
      height: peak,
      lift: this.#lift,
    };
    this.#dirty = true;
  }

  #stepHop(): void {
    const hop = this.#hop;
    if (!hop || !this.#model) return;
    const t = Math.min((performance.now() - hop.start) / hop.duration, 1);
    this.#model.rotation.y =
      t === 1 ? 0 : hop.from + (hop.to - hop.from) * (t * t * (3 - 2 * t));
    this.#lift = hop.height * 4 * t * (1 - t) + hop.lift * (1 - t) ** 2;
    this.style.translate = t === 1 ? "" : `0 ${-this.#lift}px`;
    // The canvas rises with him and the shadow is in it, so it fades instead
    // of following him up.
    if (this.#shadow)
      this.#shadow.opacity = 1 - Math.min(this.#lift / 40, 1) * 0.85;
    if (t === 1) this.#hop = undefined;
    this.#dirty = true;
  }

  #updatePoster(): void {
    const now = this.#stage();
    const having = accessoriesIn(this.scene)
      .filter((item) => now.accessories.includes(item.id))
      .map((item) => item.label.toLowerCase())
      .join(" and ");
    this.setAttribute(
      "aria-label",
      `Thingy, ${SCENES[this.scene].label}, ${ALL_POSES[now.pose].label}${having ? `, with ${having}` : ""}`,
    );
    const poster = this.#root.querySelector("img");
    if (poster)
      poster.src =
        this.getAttribute("poster") ||
        posterPath(
          this.scene,
          now.pose,
          this.assetBase,
          this.version,
          this.getAttribute("accessories"),
        );
  }

  #initialize(): void {
    try {
      this.#renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      const renderer = this.#renderer;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.setClearColor(0, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.shadowMap.enabled = false;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      const canvas = renderer.domElement;
      canvas.tabIndex = 0;
      this.#root.querySelector(".frame")!.append(canvas);
      this.#controls = new OrbitControls(this.#camera, canvas);
      canvas.style.touchAction = "pan-y";
      this.#controls.enableDamping = true;
      this.#controls.dampingFactor = 0.09;
      this.#controls.enablePan = false;
      this.#controls.minZoom = VIEW_LIMITS.zoom[0];
      this.#controls.maxZoom = VIEW_LIMITS.zoom[1];
      this.#controls.minPolarAngle = THREE.MathUtils.degToRad(
        VIEW_LIMITS.polar[0],
      );
      this.#controls.maxPolarAngle = THREE.MathUtils.degToRad(
        VIEW_LIMITS.polar[1],
      );
      this.#setZoom();
      this.#controls.addEventListener("change", () => {
        this.#dirty = true;
        this.dispatchEvent(
          new CustomEvent("thingy-view", { bubbles: true, composed: true }),
        );
      });
      // A press that barely moves is a tap, for the host page to answer; a
      // vertical swipe scrolls the page and arrives here as a pointercancel.
      canvas.addEventListener(
        "pointerdown",
        (event) => {
          this.#press = {
            x: event.clientX,
            y: event.clientY,
            at: performance.now(),
          };
        },
        { signal: this.#abort.signal },
      );
      // Once a press has moved it is a turn, even if it comes back to where it began.
      canvas.addEventListener(
        "pointermove",
        (event) => {
          const press = this.#press;
          if (
            press &&
            Math.hypot(event.clientX - press.x, event.clientY - press.y) >= 6
          )
            this.#press = undefined;
        },
        { signal: this.#abort.signal },
      );
      canvas.addEventListener(
        "pointerup",
        () => {
          const press = this.#press;
          this.#press = undefined;
          if (press && performance.now() - press.at < 500) this.#tap();
        },
        { signal: this.#abort.signal },
      );
      canvas.addEventListener(
        "pointercancel",
        () => {
          this.#press = undefined;
        },
        { signal: this.#abort.signal },
      );
      // He attends to the pointer anywhere on the page, and to a tap for a moment.
      window.addEventListener(
        "pointermove",
        (event) => {
          if (!this.alive || this.#press || event.pointerType === "touch")
            return;
          this.#pointer = { x: event.clientX, y: event.clientY };
          this.#pointerUntil = performance.now() + 2500;
        },
        { passive: true, signal: this.#abort.signal },
      );
      window.addEventListener(
        "pointerdown",
        (event) => {
          if (!this.alive) return;
          this.#pointer = { x: event.clientX, y: event.clientY };
          this.#pointerUntil = performance.now() + 2500;
        },
        { passive: true, signal: this.#abort.signal },
      );
      canvas.addEventListener("keydown", this.#keyboard, {
        signal: this.#abort.signal,
      });
      canvas.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          this.removeAttribute("data-ready");
          this.#status(
            "The 3D view paused. Thingy’s pose image is still here.",
          );
        },
        { signal: this.#abort.signal },
      );
      canvas.addEventListener(
        "webglcontextrestored",
        () => {
          if (this.#model) this.setAttribute("data-ready", "");
          this.#dirty = true;
        },
        { signal: this.#abort.signal },
      );
      this.#reduced.addEventListener(
        "change",
        () => {
          if (this.#hop) this.#hop.duration = 0;
          this.#setLife();
          this.#setPose();
          this.#scheduleBlink();
        },
        { signal: this.#abort.signal },
      );
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      this.#environment = pmrem.fromScene(room, 0.04);
      this.#scene.environment = this.#environment.texture;
      this.#scene.environmentIntensity = 0.4;
      room.dispose();
      pmrem.dispose();
      this.#scene.add(new THREE.HemisphereLight(0xfff3de, 0x5a6a66, 0.5));
      const key = new THREE.DirectionalLight(0xfff2da, 1.6);
      key.position.set(-3, 5, 5);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = key.shadow.camera.bottom = -3;
      key.shadow.camera.right = key.shadow.camera.top = 3;
      key.shadow.normalBias = 0.02;
      const fill = new THREE.DirectionalLight(0xe4eeff, 0.6);
      fill.position.set(4, 3, 2);
      const rim = new THREE.DirectionalLight(0xfff7e8, 0.8);
      rim.position.set(0, 5, -3);
      this.#scene.add(key, fill, rim, this.#beacon);
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = shadowCanvas.height = 128;
      const context = shadowCanvas.getContext("2d")!;
      const gradient = context.createRadialGradient(64, 64, 5, 64, 64, 64);
      gradient.addColorStop(0, "rgba(30,32,24,0.22)");
      gradient.addColorStop(1, "rgba(30,32,24,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
      const shadow = new THREE.CanvasTexture(shadowCanvas);
      this.#shadow = new THREE.MeshBasicMaterial({
        map: shadow,
        transparent: true,
        depthWrite: false,
      });
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.4),
        this.#shadow,
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0.005;
      this.#scene.add(ground);
      this.resetView();
      this.#setView();
      this.#observer = new ResizeObserver(() => this.#resize());
      this.#observer.observe(this);
      this.#intersection = new IntersectionObserver(([entry]) => {
        this.#visible = entry.isIntersecting;
        this.#dirty = true;
      });
      this.#intersection.observe(this);
      this.#resize();
      this.#clock.connect(document);
      this.#loop();
      void this.#load();
    } catch {
      this.#status(
        "A still of Thingy. This browser could not start the 3D view.",
      );
      this.dispatchEvent(
        new CustomEvent("thingy-fallback", { bubbles: true, composed: true }),
      );
    }
  }

  #resize(): void {
    const { width, height } = this.getBoundingClientRect();
    if (!width || !height || !this.#renderer) return;
    this.#renderer.setSize(width, height, false);
    const halfHeight = 1.61;
    this.#camera.left = (-halfHeight * width) / height;
    this.#camera.right = (halfHeight * width) / height;
    this.#camera.top = halfHeight;
    this.#camera.bottom = -halfHeight;
    this.#camera.updateProjectionMatrix();
    this.#dirty = true;
  }

  async #load(): Promise<void> {
    const generation = ++this.#generation;
    const selected = this.scene;
    const version = this.version;
    if (
      selected === this.#currentScene &&
      version === this.#currentVersion &&
      this.#model
    )
      return;
    this.removeAttribute("data-ready");
    if (this.#renderer) this.#renderer.domElement.style.visibility = "hidden";
    this.#status("Getting Thingy ready…");
    try {
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gltf: GLTF = await loader.loadAsync(
        `${this.assetBase}${version}/${selected}.glb`,
      );
      if (generation !== this.#generation || !this.isConnected) {
        dispose(gltf.scene);
        return;
      }
      if (this.#model) {
        this.#mixer?.stopAllAction();
        this.#mixer?.uncacheRoot(this.#model);
        this.#scene.remove(this.#model);
        dispose(this.#model);
      }
      this.#model = gltf.scene;
      this.#faceMap = undefined;
      this.#life = undefined;
      this.#lifeRunning = false;
      this.#heldPose = "";
      this.#hop = undefined;
      this.#lift = 0;
      this.style.translate = "";
      const anisotropy = Math.min(
        8,
        this.#renderer?.capabilities.getMaxAnisotropy() ?? 1,
      );
      this.#model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          const material = object.material as THREE.MeshStandardMaterial;
          for (const map of [
            material.map,
            material.normalMap,
            material.emissiveMap,
          ])
            if (map) map.anisotropy = anisotropy;
          if (material.name === "Thingy_Face")
            this.#faceMap = material.emissiveMap ?? undefined;
        }
      });
      this.#head = this.#model.getObjectByName("head");
      this.#scene.add(this.#model);
      this.#clips = gltf.animations;
      this.#mixer = new THREE.AnimationMixer(this.#model);
      this.#currentScene = selected;
      this.#currentVersion = version;
      this.#setLife();
      this.#setPose();
      this.#setLight();
      this.#setFace();
      this.#scheduleBlink();
      if (this.#renderer)
        this.#renderer.domElement.style.visibility = "visible";
      this.setAttribute("data-ready", "");
      this.#dirty = true;
      this.dispatchEvent(
        new CustomEvent("thingy-ready", {
          detail: { scene: selected },
          bubbles: true,
          composed: true,
        }),
      );
    } catch {
      if (generation !== this.#generation) return;
      this.#status("The 3D model could not load. Here is Thingy’s pose image.");
      this.dispatchEvent(
        new CustomEvent("thingy-fallback", { bubbles: true, composed: true }),
      );
    }
  }

  #setPose(): void {
    if (!this.#mixer || !this.#model) return;
    const now = this.#stage();
    // A pinned older model may not have a newer clip: v0.15 has no laptop-work.
    const clip =
      this.#clips.find((item) => item.name === now.clip) ??
      this.#clips.find((item) => item.name === "present");
    if (!clip) return;
    const life = this.alive ? this.#life : undefined;
    // Only a change of pose moves him. Taking off a hat leaves him standing.
    if (life && this.#heldPose && now.clip + now.frame !== this.#heldPose)
      life.startBlend();
    this.#heldPose = now.clip + now.frame;
    if (this.#life)
      this.#life.steadyArms = accessoriesIn(this.scene).some(
        (item) => now.accessories.includes(item.id) && item.steady,
      );
    life?.restore();
    this.#mixer.stopAllAction();
    const action = this.#mixer.clipAction(clip);
    action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    action.time = this.playing
      ? 0
      : Math.min((now.frame - 1) / 24, clip.duration);
    action.paused = !this.playing;
    this.#mixer.update(0);
    life?.capture();
    this.#action = action;
    const shown = shownNodes(this.scene, now.accessories);
    this.#model.traverse((part) => {
      // An accessory of several materials has a node for each: <node>_<part>.
      if (part.name.startsWith("Thingy_Accessory_"))
        part.visible = shown.some(
          (node) => part.name === node || part.name.startsWith(`${node}_`),
        );
    });
    this.#dirty = true;
    this.dispatchEvent(
      new CustomEvent("thingy-change", {
        detail: {
          pose: now.pose,
          accessories: now.accessories,
          motion: this.playing,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #setLight(): void {
    const on = this.getAttribute("light") === "on";
    this.#model?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        if (
          material instanceof THREE.MeshStandardMaterial &&
          material.name === "Thingy_Beacon"
        )
          material.emissiveIntensity = on ? 2.6 : 0;
      }
    });
    this.#beacon.intensity = on ? 0.8 : 0;
    this.#dirty = true;
  }

  #setFace(closed = false): void {
    if (!this.#faceMap) return;
    const item = FACES[face(this.getAttribute("face"))];
    this.#showCell(closed ? (item.blink ?? item.cell) : item.cell);
  }

  #showCell(cell: number): void {
    if (!this.#faceMap) return;
    const [x, y] = faceOffset(cell);
    this.#faceMap.offset.set(x, y);
    this.#dirty = true;
  }

  /** While he is alive his eyes shut across a change of expression, and his head reacts. */
  #changeFace(before: string | null): void {
    clearTimeout(this.#faceTimer);
    const wait = this.#lifeSettings.faceChange;
    const life = this.alive ? this.#life : undefined;
    if (!life || wait <= 0) {
      this.#setFace();
      this.#scheduleBlink();
      life?.react();
      return;
    }
    clearTimeout(this.#blinkTimer);
    const old = FACES[face(before)];
    const next = FACES[face(this.getAttribute("face"))];
    this.#showCell(old.blink ?? next.blink ?? FACES.idle!.blink!);
    this.#faceTimer = window.setTimeout(() => {
      this.#setFace();
      this.#scheduleBlink();
      life.react();
    }, wait);
  }

  /** Starts or stops the small movements, whichever now applies. */
  #setLife(): void {
    if (!this.#model) return;
    if (this.alive && !this.#lifeRunning) {
      if (!this.#life) {
        this.#life = new Life(this.#model);
        this.#life.settings = this.#lifeSettings;
        this.#life.onBigGlance = () => this.#blinkNow();
      } else this.#life.capture();
      this.#lifeRunning = true;
    } else if (!this.alive && this.#lifeRunning) {
      this.#life?.stop();
      this.#mixer?.update(0);
      this.#lifeRunning = false;
    }
    this.#scheduleBlink();
    this.#dirty = true;
  }

  #blinkNow(): void {
    if (FACES[face(this.getAttribute("face"))].blink === undefined) return;
    clearTimeout(this.#blinkTimer);
    this.#setFace(true);
    this.#blinkTimer = window.setTimeout(() => this.#scheduleBlink(), 120);
  }

  /** A blink every few seconds, only on request and never under reduced motion. */
  #scheduleBlink(): void {
    clearTimeout(this.#blinkTimer);
    this.#setFace();
    const alive = this.alive;
    if (
      (this.getAttribute("blink") !== "on" && !alive) ||
      this.#reduced.matches ||
      !this.#faceMap ||
      FACES[face(this.getAttribute("face"))].blink === undefined
    )
      return;
    const every = this.#lifeSettings.blinkEvery * 1000;
    this.#blinkTimer = window.setTimeout(
      () => {
        if (!this.#visible || document.hidden) return this.#scheduleBlink();
        this.#setFace(true);
        const pair = alive && Math.random() < this.#lifeSettings.doubleBlink;
        this.#blinkTimer = window.setTimeout(() => {
          if (!pair) return this.#scheduleBlink();
          this.#setFace();
          this.#blinkTimer = window.setTimeout(() => {
            this.#setFace(true);
            this.#blinkTimer = window.setTimeout(
              () => this.#scheduleBlink(),
              110,
            );
          }, 130);
        }, 130);
      },
      alive
        ? every * (0.55 + Math.random() * 0.9)
        : 2600 + Math.random() * 4200,
    );
  }

  #setZoom(): void {
    if (this.#controls) this.#controls.enableZoom = this.zoomable;
    this.#renderer?.domElement.setAttribute(
      "aria-label",
      this.getAttribute("view-label") ||
        (this.zoomable ? "Rotate and zoom Thingy" : "Rotate Thingy"),
    );
  }

  #tap(): void {
    this.dispatchEvent(
      new CustomEvent("thingy-tap", { bubbles: true, composed: true }),
    );
  }

  #setMotion(): void {
    if (!this.#action) return;
    const life = this.alive ? this.#life : undefined;
    life?.restore();
    this.#action.paused = !this.playing;
    this.#mixer?.update(0);
    life?.capture();
    this.#dirty = true;
    this.dispatchEvent(
      new CustomEvent("thingy-change", {
        detail: {
          pose: this.pose,
          accessories: this.accessories,
          motion: this.playing,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #keyboard = (event: KeyboardEvent): void => {
    if (!this.#controls) return;
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
      const offset = this.#camera.position.clone().sub(this.#controls.target);
      offset.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        event.key === "ArrowLeft" ? 0.15 : -0.15,
      );
      this.#camera.position.copy(this.#controls.target).add(offset);
    } else if (this.zoomable && (event.key === "+" || event.key === "="))
      this.#camera.zoom = Math.min(
        VIEW_LIMITS.zoom[1],
        this.#camera.zoom * 1.1,
      );
    else if (this.zoomable && event.key === "-")
      this.#camera.zoom = Math.max(
        VIEW_LIMITS.zoom[0],
        this.#camera.zoom / 1.1,
      );
    else if (event.key === "Home") this.resetView();
    else if (event.key === "Enter" || event.key === " ") this.#tap();
    else return;
    event.preventDefault();
    this.#camera.updateProjectionMatrix();
    this.#controls.update();
    this.#dirty = true;
  };

  #loop = (): void => {
    this.#frame = requestAnimationFrame(this.#loop);
    this.#clock.update();
    // Before the guard: a hop can carry him out of view, and he must still land.
    this.#stepHop();
    if (!this.#visible || document.hidden || !this.#renderer) {
      this.#drewAt = 0;
      return;
    }
    this.#controls?.update();
    const dt = Math.min(this.#clock.getDelta(), 0.05);
    this.#watchStrain();
    const life = this.alive ? this.#life : undefined;
    if (life) {
      this.#sinceDrawn += dt;
      // Breathing looks the same at half the frames and costs half the battery.
      const quiet = life.settled && !this.playing && !this.#hop;
      if (this.#sinceDrawn >= (quiet ? QUIET_FRAME : BUSY_FRAME)) {
        const step = Math.min(this.#sinceDrawn, 0.05);
        this.#sinceDrawn = 0;
        life.restore();
        if (this.playing) this.#mixer?.update(step);
        life.capture();
        if (this.#pointer && performance.now() > this.#pointerUntil)
          this.#pointer = null;
        life.apply(step, {
          camera: this.#camera,
          rect: this.getBoundingClientRect(),
          pointer: this.#press ? null : this.#pointer,
          busy: Boolean(this.#hop),
        });
        this.#dirty = true;
        this.#drewAt = performance.now();
      }
    } else if (this.playing) {
      this.#mixer?.update(dt);
      this.#dirty = true;
    }
    if (this.#dirty) {
      if (this.#head) {
        this.#head.getWorldPosition(this.#beacon.position);
        this.#beacon.position.y += 0.77;
      }
      this.#renderer.render(this.#scene, this.#camera);
      this.#dirty = false;
    }
  };

  /**
   * A machine that can't draw him quickly enough gets a still Thingy and a page
   * that still works, rather than a stutter that takes the page down with it.
   */
  #watchStrain(): void {
    if (!this.#drewAt) return;
    this.#strain = addStrain(
      this.#strain,
      (performance.now() - this.#drewAt) / 1000,
    );
    this.#drewAt = 0;
    if (this.#strain < STRAIN_LIMIT) return;
    this.#strained = true;
    this.#setLife();
    this.dispatchEvent(
      new CustomEvent("thingy-strained", { bubbles: true, composed: true }),
    );
  }

  #status(text: string): void {
    this.#root.querySelector(".status")!.textContent = text;
  }

  disconnectedCallback(): void {
    ++this.#generation;
    cancelAnimationFrame(this.#frame);
    clearTimeout(this.#blinkTimer);
    clearTimeout(this.#faceTimer);
    this.#life = undefined;
    this.#lifeRunning = false;
    this.#heldPose = "";
    this.#abort.abort();
    this.#observer?.disconnect();
    this.#intersection?.disconnect();
    this.#controls?.dispose();
    this.#clock.dispose();
    this.#mixer?.stopAllAction();
    if (this.#model) this.#mixer?.uncacheRoot(this.#model);
    dispose(this.#scene);
    this.#scene.clear();
    this.#environment?.dispose();
    this.#renderer?.dispose();
    this.#renderer = undefined;
    this.#model = undefined;
    this.#currentScene = undefined;
    this.#currentVersion = undefined;
    this.#faceMap = undefined;
    this.#shadow = undefined;
    this.#hop = undefined;
    this.#lift = 0;
    this.style.translate = "";
    this.removeAttribute("data-ready");
  }
}

if (!customElements.get("thingy-character"))
  customElements.define("thingy-character", ThingyCharacter);
declare global {
  interface HTMLElementTagNameMap {
    "thingy-character": ThingyCharacter;
  }
}
