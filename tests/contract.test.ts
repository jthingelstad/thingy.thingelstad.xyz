import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { newestCharacterVersion } from "../tools/delivery-plan.mjs";
import {
  scene,
  pose,
  accessories,
  accessoriesValue,
  posesFor,
  shownNodes,
  SCENES,
  SCENE_KEYS,
  SCENE_LINES,
  shuffled,
  embedURL,
  iframeCode,
  face,
  faceOffset,
  FACE_ATLAS,
  FACES,
  FACE_CHOICES,
  HOME_VIEW,
  MODEL_WEIGHT,
  parseView,
  stageOf,
  modelVersion,
  POSES,
  posterPath,
  VERSIONS,
  VIEW_LIMITS,
  viewValue,
} from "../src/config";

test("untrusted embed parameters are limited to supported characters and poses", () => {
  for (const input of [
    null,
    "",
    "__proto__",
    "<script>alert(1)</script>",
    "WORKSHOP",
  ]) {
    assert.equal(scene(input), "library");
    assert.equal(pose(input), "present");
  }
});
const newestManifest = () =>
  JSON.parse(
    readFileSync(
      new URL(
        `../public/character/${VERSIONS.at(-1)}/manifest.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
test("the site and external consumers agree on the versioned asset contract", () => {
  const manifest = newestManifest();
  assert.deepEqual(Object.keys(POSES), Object.keys(manifest.poses));
  for (const [name, value] of Object.entries(POSES)) {
    assert.equal(value.frame, manifest.poses[name].stillFrame);
    assert.equal(
      posterPath("workshop", name as keyof typeof POSES),
      `/character/${VERSIONS.at(-1)}/${manifest.scenes.workshop.stills[name].webp}`,
    );
  }
});
test("the page's scenes are the manifest's scenes, in the same order", () => {
  const manifest = newestManifest();
  assert.deepEqual(Object.keys(SCENES), Object.keys(manifest.scenes));
  for (const [key, item] of Object.entries(SCENES)) {
    const published = manifest.scenes[key];
    assert.equal(item.label, published.label);
    assert.equal(
      posterPath(key as keyof typeof SCENES, "present"),
      `/character/${VERSIONS.at(-1)}/${published.poster}`,
    );
    const slot = (s: {
      id: string;
      standard?: string;
      empty?: unknown;
      options: {
        id: string;
        label: string;
        poses?: readonly string[];
        absent?: string;
      }[];
    }) => ({
      id: s.id,
      standard: s.standard,
      empty: s.empty,
      options: s.options.map(({ id, label, poses, absent }) => ({
        id,
        label,
        poses,
        absent,
      })),
    });
    assert.deepEqual(
      JSON.parse(JSON.stringify(item.slots.map(slot))),
      JSON.parse(JSON.stringify(published.slots.map(slot))),
      key,
    );
  }
});
test("a scene stays out of the models made before it", () => {
  assert.equal(scene("kitchen"), "kitchen");
  assert.equal(scene("kitchen", "v0.17"), "kitchen");
  assert.equal(scene("kitchen", "v0.16"), "library");
  assert.equal(scene("concert", "v0.15"), "concert");
});
test("an older model's poster is a still that model has", () => {
  assert.equal(
    posterPath("workshop", "work", "/character/", "v0.15", "laptop"),
    "/character/v0.15/poses/workshop-present.webp",
  );
  assert.equal(
    posterPath("workshop", "show", "/character/", "v0.15", "plate"),
    "/character/v0.15/poses/workshop-present.webp",
  );
  assert.equal(
    posterPath("workshop", "work", "/character/", "v0.15", "drill"),
    "/character/v0.15/poses/workshop-drill-work.webp",
  );
  assert.equal(
    posterPath("workshop", "work", "/character/", "v0.16", "laptop"),
    "/character/v0.16/poses/workshop-laptop-work.webp",
  );
});
test("every still a page can ask for is in the manifest", () => {
  const manifest = newestManifest();
  for (const key of Object.keys(SCENES) as (keyof typeof SCENES)[])
    for (const held of [
      null,
      "none",
      ...SCENES[key].slots.flatMap((s) => s.options.map((o) => o.id)),
    ])
      for (const asked of [...Object.keys(POSES), "carry", "show", "work"]) {
        const path = posterPath(
          key,
          asked as "hello",
          "",
          VERSIONS.at(-1),
          held,
        );
        const file = path.replace(`${VERSIONS.at(-1)}/`, "");
        assert(
          statSync(`public/character/${VERSIONS.at(-1)}/${file}`).size > 100,
          `${key} ${held} ${asked}: ${file}`,
        );
        assert(manifest.scenes[key].poster, key);
      }
});
test("the component's newest model is the newest published directory", () => {
  assert.equal(
    VERSIONS.at(-1),
    newestCharacterVersion(
      readdirSync(new URL("../public/character/", import.meta.url)),
    ),
  );
});
test("anything but a model the component draws means the newest, and nothing untrusted reaches a path", () => {
  const newest = VERSIONS.at(-1);
  assert.equal(modelVersion(newest), newest);
  assert.equal(modelVersion("v0.15"), "v0.15");
  for (const input of [
    null,
    "",
    "latest",
    "../v0.14",
    "__proto__",
    "v9",
    "v0.10",
  ])
    assert.equal(modelVersion(input), newest);
});
test("the faces match the published atlas, and a face picks its own cell", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        `../public/character/${VERSIONS.at(-1)}/manifest.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.deepEqual(FACES, manifest.faces);
  assert.equal(FACE_ATLAS.columns, manifest.faceAtlas.columns);
  assert.equal(FACE_ATLAS.rows, manifest.faceAtlas.rows);
  assert.deepEqual(faceOffset(0), [0, 0]);
  assert.deepEqual(faceOffset(5), [0.25, 0.2]);
  assert.deepEqual(faceOffset(16), [0, 0.8]);
  assert.equal(face("sheepish"), "sheepish");
  for (const input of [null, "", "__proto__", "blink"])
    assert.equal(face(input), "original");
});
test("a person is never offered the screen turned off, and every offered face exists", () => {
  assert(!Object.hasOwn(FACE_CHOICES, "off"));
  for (const id of Object.keys(FACE_CHOICES)) assert(Object.hasOwn(FACES, id));
});
test("each accessory keeps to the poses it was made for", () => {
  const at = (held: string | null, asked: string | null) =>
    stageOf("workshop", held, asked);
  assert.equal(at("hammer", "work").clip, "hammer-work");
  // A pose the tool has no grip for moves to the tool's first.
  assert.equal(at("hammer", "hello").clip, "hammer-carry");
  assert.equal(at("laptop", "carry").clip, "present");
  // The laptop turns round in his hand to work on it.
  assert.equal(at("laptop", "work").clip, "laptop-work");
  assert.equal(at("none", "carry").clip, "hello");
  // Present in the Workshop brings the laptop, and asking for none really is none.
  assert.deepEqual(at(null, "present").accessories, ["laptop"]);
  assert.deepEqual(at("none", "present").accessories, []);
  assert.equal(at("none", "present").pose, "hello");
  for (const input of ["__proto__", "<script>", "WRENCH"])
    assert.deepEqual(at(input, "hello").accessories, []);
  assert.deepEqual(posesFor("workshop", ["drill"]), ["carry", "show", "work"]);
  assert.deepEqual(posesFor("workshop", []), ["hello", "thinking", "rest"]);
  assert.deepEqual(posesFor("concert", ["headphones"]), Object.keys(POSES));
  // The plate takes both hands, and the phone keeps his headphones on.
  assert.equal(at("plate", "show").clip, "plate-show");
  assert.equal(at("plate", "work").clip, "plate-carry");
  assert.deepEqual(stageOf("concert", null, "check").accessories, [
    "headphones",
    "phone",
  ]);
  assert.equal(
    stageOf("concert", "headphones,phone", "hold").clip,
    "phone-hold",
  );
  assert.equal(stageOf("concert", "phone", "present").clip, "phone-check");
  assert.equal(stageOf("concert", "headphones", "check").clip, "hello");
});
test("accessories stay in their own scene, and a scene gives what it gives", () => {
  assert.deepEqual(accessories("library", null), []);
  assert.deepEqual(accessories("library", "hammer,headphones"), []);
  assert.deepEqual(accessories("outdoors", null), ["backpack"]);
  assert.deepEqual(accessories("outdoors", "none"), []);
  assert.deepEqual(accessories("concert", null), ["headphones"]);
  assert.deepEqual(accessories("concert", "backpack"), []);
  // A slot holds one, the first it can.
  assert.deepEqual(accessories("workshop", "hammer,drill"), ["hammer"]);
  assert.equal(accessoriesValue([]), "none");
  assert.equal(accessoriesValue(["hammer"]), "hammer");
  const now = stageOf("library", "hammer", "work");
  assert.deepEqual(now.accessories, []);
  assert.equal(now.clip, "hello");
  assert.equal(
    posterPath("workshop", "work", "/character/", undefined, "drill"),
    `/character/${VERSIONS.at(-1)}/poses/workshop-drill-work.webp`,
  );
  assert.equal(
    posterPath("outdoors", "hello"),
    `/character/${VERSIONS.at(-1)}/poses/outdoors-present.webp`,
  );
  assert.equal(
    posterPath("library", "hello"),
    `/character/${VERSIONS.at(-1)}/poses/library-hello.webp`,
  );
});
test("the mesh a page shows is the one the choice names", () => {
  assert.deepEqual(shownNodes("concert", ["headphones"]), [
    "Thingy_Accessory_headphones",
  ]);
  assert.deepEqual(shownNodes("concert", []), ["Thingy_Accessory_ears"]);
  assert.deepEqual(shownNodes("outdoors", ["backpack"]), [
    "Thingy_Accessory_backpack",
  ]);
  assert.deepEqual(shownNodes("outdoors", []), []);
  assert.deepEqual(shownNodes("workshop", ["drill"]), [
    "Thingy_Accessory_drill",
  ]);
  assert.deepEqual(shownNodes("library", []), []);
});
test("an embedded character keeps scene, pose, beacon and motion independent", () => {
  const state = {
    scene: "workshop",
    pose: "thinking",
    light: true,
    motion: false,
  } as const;
  const url = new URL(embedURL(state));
  assert.equal(url.origin, "https://thingy.thingelstad.xyz");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    scene: "workshop",
    pose: "thinking",
    light: "on",
    motion: "off",
  });
  assert(iframeCode(state).includes('title="Thingy, Workshop"'));
});
test("an embed says only what differs, and follows what it is told to", () => {
  const url = new URL(
    embedURL({
      scene: "workshop",
      pose: "work",
      accessories: ["hammer"],
      face: "proud",
      version: "latest",
      light: false,
      motion: false,
      view: "60,80,1.2",
    }),
  );
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    version: "latest",
    scene: "workshop",
    accessories: "hammer",
    pose: "work",
    face: "proud",
    light: "off",
    motion: "off",
    view: "60,80,1.2",
  });
  const plain = new URL(
    embedURL({
      scene: "outdoors",
      pose: "hello",
      accessories: ["backpack"],
      face: "original",
      version: "latest",
      light: false,
      motion: false,
      view: HOME_VIEW,
    }),
  );
  assert.deepEqual(
    [...plain.searchParams.keys()],
    ["version", "scene", "pose", "light", "motion"],
  );
  const without = new URL(
    embedURL({
      scene: "concert",
      pose: "hello",
      accessories: [],
      light: false,
      motion: false,
    }),
  );
  assert.equal(without.searchParams.get("accessories"), "none");
  // What the address says, read back, is what stood on the stage.
  for (const held of [["hammer"], ["screwdriver"], ["drill"]]) {
    const back = new URL(
      embedURL({
        scene: "workshop",
        pose: "show",
        accessories: held,
        light: false,
        motion: false,
      }),
    );
    assert.deepEqual(
      stageOf("workshop", back.searchParams.get("accessories"), "show")
        .accessories,
      held,
    );
  }
});
test("a view from an address is checked, limited and written back the same", () => {
  assert.deepEqual(parseView("60,80,1.2"), {
    azimuth: 60,
    polar: 80,
    zoom: 1.2,
  });
  assert.deepEqual(parseView("-40,5,9"), {
    azimuth: -40,
    polar: VIEW_LIMITS.polar[0],
    zoom: VIEW_LIMITS.zoom[1],
  });
  for (const bad of ["", "60", "a,b,c", "60,80", "60,80,1,2", "<script>", null])
    assert.equal(parseView(bad), null);
  assert.equal(
    viewValue({ azimuth: 200.4, polar: 80.2, zoom: 1.004 }),
    "-160,80,1",
  );
  assert.equal(HOME_VIEW, "16,83,1");
});
test("the weight a page offers is the weight of the newest model", () => {
  const newest = VERSIONS.at(-1)!;
  for (const [key, weight] of Object.entries(MODEL_WEIGHT)) {
    const { size } = statSync(`public/character/${newest}/${key}.glb`);
    assert.equal(weight, `${(size / 1e6).toFixed(1)} MB`, key);
  }
});

test("the kit names everything a consumer can use", () => {
  const kit = readFileSync(new URL("../kit/KIT.md", import.meta.url), "utf8");
  const element = readFileSync(
    new URL("../src/element.ts", import.meta.url),
    "utf8",
  );
  const newest = newestCharacterVersion(
    readdirSync(new URL("../public/character/", import.meta.url)),
  );
  const manifest = JSON.parse(
    readFileSync(
      new URL(`../public/character/${newest}/manifest.json`, import.meta.url),
      "utf8",
    ),
  );
  const names = [
    ...Object.keys(manifest.scenes),
    ...Object.keys(manifest.poses),
    ...Object.keys(manifest.toolPoses),
    ...Object.keys(manifest.faces),
    ...Object.values<{ slots: { options: { id: string }[] }[] }>(
      manifest.scenes,
    ).flatMap((item) =>
      item.slots.flatMap((slot) => slot.options.map((option) => option.id)),
    ),
    ...[...element.matchAll(/CustomEvent\(\s*"(thingy-[a-z]+)"/g)].map(
      (m) => m[1],
    ),
  ];
  const attributes = /observedAttributes[^[]*\[([^\]]+)\]/.exec(element)!;
  names.push(...attributes[1].match(/[a-z-]+/g)!);
  for (const name of new Set(names))
    assert.ok(kit.includes(`\`${name}\``), `the kit names ${name}`);
});

test("the newest model publishes every still a surface names", () => {
  const { surfaces } = JSON.parse(
    readFileSync(new URL("../kit/surfaces.json", import.meta.url), "utf8"),
  );
  const newest = newestCharacterVersion(
    readdirSync(new URL("../public/character/", import.meta.url)),
  );
  const root = new URL(`../public/character/${newest}/`, import.meta.url);
  const manifest = JSON.parse(
    readFileSync(new URL("manifest.json", root), "utf8"),
  );
  const published = new Set(
    Object.values<{ stills?: Record<string, { webp: string }> }>(
      manifest.scenes,
    ).flatMap((item) =>
      Object.values(item.stills ?? {}).map((still) => still.webp),
    ),
  );
  for (const surface of surfaces)
    for (const still of surface.stills) {
      const file = `poses/${still}.webp`;
      assert.ok(
        published.has(file),
        `${surface.name}: ${still} in the manifest`,
      );
      assert.ok(
        statSync(new URL(file, root)).size > 0,
        `${still} is published`,
      );
    }
});

test("a persona change opens a checklist of what each surface keeps", async () => {
  const { rolloutIssue } = await import("../tools/persona-rollout.mjs");
  const body = rolloutIssue(
    [
      { name: "Kept", repo: "o/kept", keeps: ["prompts/a.md: words"] },
      { name: "Follows", repo: "o/follows", keeps: [] },
    ],
    "abc123",
  );
  assert.match(body, /commit\/abc123/);
  assert.match(body, /## Kept \(o\/kept\)\n\n- \[ \] prompts\/a\.md: words/);
  assert.doesNotMatch(body, /Follows/);
});

test("a shuffle is always somewhere else, and always something he can do", () => {
  // Any sequence of numbers, from the bottom of the range to the very top.
  for (const from of SCENE_KEYS)
    for (const seed of [0, 0.1, 0.25, 0.5, 0.75, 0.999999])
      for (const step of [0, 0.13, 0.37, 0.61]) {
        let at = seed;
        const random = () => (at = (at + step) % 1);
        const got = shuffled(from, random);
        assert.notEqual(got.scene, from);
        assert.ok(Object.hasOwn(FACE_CHOICES, got.face));
        assert.notEqual(got.face, "off");
        assert.ok(posesFor(got.scene, got.accessories).includes(got.pose));
        const made = stageOf(
          got.scene,
          accessoriesValue(got.accessories),
          got.pose,
        );
        assert.deepEqual(made.accessories, got.accessories);
        assert.equal(made.pose, got.pose);
      }
  // A long run reaches every scene and takes the things he can have off too.
  const seen = new Set<string>();
  const held = new Set<string>();
  // Seeded, so a run of bad luck can't fail this.
  let number = 12345;
  const seeded = () => {
    number = (number * 1103515245 + 12345) % 2147483648;
    return number / 2147483648;
  };
  for (let turn = 0; turn < 400; turn++) {
    const got = shuffled("library", seeded);
    seen.add(got.scene);
    for (const id of got.accessories) held.add(id);
  }
  assert.equal(seen.size, SCENE_KEYS.length - 1);
  for (const id of ["printer", "grill", "hat", "plate", "phone"])
    assert.ok(held.has(id), id);
});

test("every scene has its line under the title", () => {
  assert.deepEqual(Object.keys(SCENE_LINES).sort(), [...SCENE_KEYS].sort());
  for (const line of Object.values(SCENE_LINES))
    assert.match(line, /^An? .+\.$/);
});
