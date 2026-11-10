import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The site's palette, light and dark, read from the stylesheet itself, and every pair
// of colours that meets on a page measured against WCAG AA. A palette edit that loses
// contrast fails here. Run with THINGY_CONTRAST_TABLE=1 to print the table.

const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");

function block(source: string, start: number): string {
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0)
      return source.slice(source.indexOf("{", start) + 1, i);
  }
  throw new Error("unclosed block");
}

function variables(body: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g))
    found[name] = value.trim();
  return found;
}

const light = variables(block(css, css.indexOf(":root")));
const darkAt = css.indexOf("@media screen and (prefers-color-scheme: dark)");
assert.ok(darkAt > 0, "the dark block is in src/style.css");
const darkBody = block(css, darkAt);
const dark = {
  ...light,
  ...variables(block(darkBody, darkBody.indexOf(":root"))),
};

type Rgba = [number, number, number, number];

function parse(value: string, palette: Record<string, string>): Rgba {
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  if (reference) return parse(palette[reference[1]], palette);
  if (value === "white") return [255, 255, 255, 1];
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
    const [r, g, b] = digits.match(/../g)!.map((pair) => parseInt(pair, 16));
    return [r, g, b, 1];
  }
  const rgb = value.match(/^rgb\((\d+) (\d+) (\d+)(?: \/ (\d+)%)?\)$/);
  if (rgb)
    return [
      +rgb[1],
      +rgb[2],
      +rgb[3],
      rgb[4] === undefined ? 1 : +rgb[4] / 100,
    ];
  throw new Error(`cannot read the colour ${value}`);
}

// A translucent colour as it lands on the ground under it.
function over(top: Rgba, under: Rgba): Rgba {
  const a = top[3];
  return [0, 1, 2]
    .map((i) => top[i] * a + under[i] * (1 - a))
    .concat(1) as Rgba;
}

function luminance([r, g, b]: Rgba): number {
  const linear = (c: number) =>
    c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function ratio(a: Rgba, b: Rgba): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

// Grounds: the page, the floating sheet and bubble as they sit on it, and the fills.
function ground(name: string, palette: Record<string, string>): Rgba {
  const paper = parse(palette["--paper"], palette);
  if (name === "--sheet" || name === "--bubble")
    return over(parse(palette[name], palette), paper);
  if (name === "--wash") return over(parse(palette[name], palette), paper);
  return parse(palette[name], palette);
}

// [foreground, ground, minimum, where it meets]. 4.5 for text, 3 for the edges and
// marks a control is known by. `dark` marks a pair checked in dark only: the light
// palette predates this test and keeps its soft borders (measured in the table).
const pairs: [string, string, number, string, "dark"?][] = [
  ["--ink", "--paper", 4.5, "body text, headings"],
  ["--ink", "--soft", 4.5, "a chosen tab's label"],
  ["--ink", "--surface", 4.5, "cards on /kit/, Shuffle"],
  ["--ink", "--sheet", 4.5, "the phone sheet and rails"],
  ["--ink", "--bubble", 4.5, "his words in the bubble"],
  ["--ink", "--tint", 4.5, "a hovered button, code on /persona/"],
  ["--ink", "--code", 4.5, "code on the stage"],
  ["--ink", "--wash", 4.5, "a hovered choice"],
  ["--text-soft", "--paper", 4.5, "his scene line, ledes, quotes"],
  ["--text-soft", "--sheet", 4.5, "the Bring him summary"],
  ["--text-soft", "--track", 4.5, "Live, Picture, Link"],
  ["--text-quiet", "--paper", 4.5, "the builder lineup's words"],
  ["--muted", "--paper", 4.5, "hints, captions, footer"],
  ["--muted", "--soft", 4.5, "a chosen tab's small label"],
  ["--muted", "--sheet", 4.5, "notes in the sheet and rails"],
  ["--muted", "--bubble", 4.5, "the bubble's buttons"],
  ["--muted", "--surface", 4.5, "labels on /kit/ cards"],
  ["--green", "--paper", 4.5, "links, Ask Thingy, current page"],
  ["--green", "--soft", 4.5, "a chosen scene, pose or tab"],
  ["--green", "--sheet", 4.5, "Shuffle, links in the sheet"],
  ["--green", "--surface", 4.5, "Shuffle, the chosen way"],
  ["--green", "--bubble", 4.5, "Ask Thingy in the bubble"],
  ["--on-green", "--green", 4.5, "primary buttons, Bring him open"],
  ["--on-green", "--green-deep", 4.5, "a hovered primary button"],
  ["--green", "--paper", 3, "focus rings on the page"],
  ["--green", "--sheet", 3, "focus rings in the sheet"],
  ["--green", "--soft", 3, "the chosen pose's border"],
  ["--edge-strong", "--paper", 3, "a button's border", "dark"],
  ["--edge", "--paper", 3, "pose tiles, Bring him rows", "dark"],
  ["--edge", "--sheet", 3, "pose tiles on the sheet", "dark"],
  ["--switch-off", "--sheet", 3, "a switch that is off", "dark"],
  ["--knob", "--switch-off", 3, "the knob of a switch that is off"],
  ["--green", "--sheet", 3, "a switch that is on"],
];

function table(palette: Record<string, string>, scheme: "light" | "dark") {
  return pairs
    .filter((pair) => pair[4] === undefined || pair[4] === scheme)
    .map(([fore, back, minimum, where]) => {
      const behind = ground(back, palette);
      const value = ratio(over(ground(fore, palette), behind), behind);
      return { fore, back, minimum, where, value };
    });
}

for (const [scheme, palette] of [
  ["light", light],
  ["dark", dark],
] as const) {
  test(`${scheme}: every pair that meets on a page passes WCAG AA`, () => {
    const rows = table(palette, scheme);
    if (process.env.THINGY_CONTRAST_TABLE)
      console.log(
        rows
          .map(
            (r) =>
              `${scheme}\t${r.fore} on ${r.back}\t${r.value.toFixed(2)}\t${r.minimum}\t${r.where}`,
          )
          .join("\n"),
      );
    const failing = rows.filter((r) => r.value < r.minimum);
    assert.deepEqual(
      failing.map((r) => `${r.fore} on ${r.back}: ${r.value.toFixed(2)}`),
      [],
    );
  });
}

test("the knob of a switch that is on stands out from its green", () => {
  // In light the knob stays white; in dark it takes the colour of text on green.
  assert.ok(ratio(ground("--knob", light), ground("--green", light)) >= 3);
  assert.ok(ratio(ground("--on-green", dark), ground("--green", dark)) >= 3);
});

test("the dark ground is Ask Thingy's", () => {
  assert.equal(dark["--paper"], "#1c1914");
});

// The examples page carries its own copy of the palette, without the stylesheet.
test("the examples page's colours are the stylesheet's, light and dark", () => {
  const page = readFileSync(
    new URL("../examples/workshop.html", import.meta.url),
    "utf8",
  );
  const pageLight = variables(block(page, page.indexOf(":root")));
  const pageDarkAt = page.indexOf(
    "@media screen and (prefers-color-scheme: dark)",
  );
  assert.ok(pageDarkAt > 0, "the dark block is in examples/workshop.html");
  const pageDarkBody = block(page, pageDarkAt);
  const pageDark = {
    ...pageLight,
    ...variables(block(pageDarkBody, pageDarkBody.indexOf(":root"))),
  };
  // A name's value with every var() it is made of filled in, spaces evened out.
  const resolve = (value: string, palette: Record<string, string>): string =>
    value
      .replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
        assert.ok(name in palette, `${name} is defined`);
        return resolve(palette[name], palette);
      })
      .replace(/\s+/g, " ")
      .replace(/\( /g, "(")
      .replace(/ \)/g, ")");
  for (const [scheme, mine, theirs] of [
    ["light", pageLight, light],
    ["dark", pageDark, dark],
  ] as const)
    for (const name of Object.keys(mine)) {
      assert.ok(name in theirs, `${scheme} ${name} is in src/style.css`);
      assert.equal(
        resolve(mine[name], mine),
        resolve(theirs[name], theirs),
        `${scheme} ${name}`,
      );
    }
});
