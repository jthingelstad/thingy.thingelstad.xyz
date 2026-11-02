import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  OUTFITS,
  POSES,
  VERSION,
  outfit,
  pose,
  posterPath,
  type Outfit,
  type Pose,
} from "./config";

const defaultAssets = new URL("character/", import.meta.url).href;
const styles = `
:host{display:block;position:relative;contain:layout style;min-height:160px}
canvas{display:block;width:100%;height:100%;outline:none;touch-action:pan-y}
canvas:focus-visible{outline:2px solid #23533b;outline-offset:-4px;border-radius:8px}
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

/** A framework-independent character. All model and decoder requests stay local. */
export class ThingyCharacter extends HTMLElement {
  static observedAttributes = [
    "outfit",
    "pose",
    "light",
    "motion",
    "asset-base",
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
  #currentOutfit?: Outfit;
  #head?: THREE.Object3D;
  #beacon = new THREE.PointLight(0xff933f, 0, 1.2, 2);
  #reduced = matchMedia("(prefers-reduced-motion: reduce)");

  get outfit(): Outfit {
    return outfit(this.getAttribute("outfit"));
  }
  get pose(): Pose {
    return pose(this.getAttribute("pose"));
  }
  get playing(): boolean {
    return this.getAttribute("motion") === "on" && !this.#reduced.matches;
  }
  get assetBase(): string {
    return new URL(
      this.getAttribute("asset-base") || defaultAssets,
      location.href,
    ).href;
  }

  connectedCallback(): void {
    this.#abort = new AbortController();
    this.#root.innerHTML = `<style>${styles}</style><div class="frame"></div><img alt="" decoding="async"><span class="status" role="status">Getting Thingy ready…</span><span class="sr">Drag to turn Thingy. Use arrow keys to rotate, plus and minus to zoom.</span>`;
    this.setAttribute("role", "img");
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
    if (name === "outfit" || name === "asset-base") void this.#load();
    else if (name === "light") this.#setLight();
    else this.#setPose();
  }

  resetView(): void {
    this.#camera.position.set(3.5, 3.0, 12);
    this.#camera.zoom = 1;
    this.#camera.updateProjectionMatrix();
    this.#controls?.target.set(0, 1.38, 0);
    this.#controls?.update();
    this.#dirty = true;
  }

  #updatePoster(): void {
    this.setAttribute(
      "aria-label",
      `Thingy, ${OUTFITS[this.outfit].label}, ${POSES[this.pose].label}`,
    );
    const poster = this.#root.querySelector("img");
    if (poster) poster.src = posterPath(this.outfit, this.pose, this.assetBase);
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
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      const canvas = renderer.domElement;
      canvas.tabIndex = 0;
      canvas.setAttribute("aria-label", "Rotate and zoom Thingy");
      this.#root.querySelector(".frame")!.append(canvas);
      this.#controls = new OrbitControls(this.#camera, canvas);
      this.#controls.enableDamping = true;
      this.#controls.dampingFactor = 0.09;
      this.#controls.enablePan = false;
      this.#controls.minZoom = 0.65;
      this.#controls.maxZoom = 2.4;
      this.#controls.minPolarAngle = Math.PI * 0.18;
      this.#controls.maxPolarAngle = Math.PI * 0.63;
      this.#controls.addEventListener("change", () => {
        this.#dirty = true;
      });
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
      this.#reduced.addEventListener("change", () => this.#setPose(), {
        signal: this.#abort.signal,
      });
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
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 1.4),
        new THREE.MeshBasicMaterial({
          map: shadow,
          transparent: true,
          depthWrite: false,
        }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0.005;
      this.#scene.add(ground);
      this.resetView();
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
    const selected = this.outfit;
    if (selected === this.#currentOutfit && this.#model) return;
    this.removeAttribute("data-ready");
    if (this.#renderer) this.#renderer.domElement.style.visibility = "hidden";
    this.#status("Getting Thingy ready…");
    try {
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const gltf: GLTF = await loader.loadAsync(
        `${this.assetBase}${VERSION}/${selected}.glb`,
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
      this.#model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      this.#head = this.#model.getObjectByName("head");
      this.#scene.add(this.#model);
      this.#clips = gltf.animations;
      this.#mixer = new THREE.AnimationMixer(this.#model);
      this.#currentOutfit = selected;
      this.#setPose();
      this.#setLight();
      if (this.#renderer)
        this.#renderer.domElement.style.visibility = "visible";
      this.setAttribute("data-ready", "");
      this.#dirty = true;
      this.dispatchEvent(
        new CustomEvent("thingy-ready", {
          detail: { outfit: selected },
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
    const clip = this.#clips.find((item) => item.name === this.pose);
    if (!clip) return;
    this.#mixer.stopAllAction();
    const action = this.#mixer.clipAction(clip);
    action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    action.time = this.playing
      ? 0
      : Math.min((POSES[this.pose].frame - 1) / 24, clip.duration);
    action.paused = !this.playing;
    this.#mixer.update(0);
    this.#action = action;
    const laptop = this.#model.getObjectByName("Thingy_Laptop");
    if (laptop) laptop.visible = this.pose === "present";
    this.#dirty = true;
    this.dispatchEvent(
      new CustomEvent("thingy-change", {
        detail: { pose: this.pose, motion: this.playing },
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

  #keyboard = (event: KeyboardEvent): void => {
    if (!this.#controls) return;
    if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
      const offset = this.#camera.position.clone().sub(this.#controls.target);
      offset.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        event.key === "ArrowLeft" ? 0.15 : -0.15,
      );
      this.#camera.position.copy(this.#controls.target).add(offset);
    } else if (event.key === "+" || event.key === "=")
      this.#camera.zoom = Math.min(2.4, this.#camera.zoom * 1.1);
    else if (event.key === "-")
      this.#camera.zoom = Math.max(0.65, this.#camera.zoom / 1.1);
    else if (event.key === "Home") this.resetView();
    else return;
    event.preventDefault();
    this.#camera.updateProjectionMatrix();
    this.#controls.update();
    this.#dirty = true;
  };

  #loop = (): void => {
    this.#frame = requestAnimationFrame(this.#loop);
    this.#clock.update();
    if (!this.#visible || document.hidden || !this.#renderer) return;
    this.#controls?.update();
    if (this.playing) {
      this.#mixer?.update(Math.min(this.#clock.getDelta(), 0.05));
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

  #status(text: string): void {
    this.#root.querySelector(".status")!.textContent = text;
  }

  disconnectedCallback(): void {
    ++this.#generation;
    cancelAnimationFrame(this.#frame);
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
    this.#currentOutfit = undefined;
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
