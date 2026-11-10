import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { askAddress } from "../src/voice";

/*
 * Every link from one of Jamie's sites to another carries ?ref=<origin>-<placement>,
 * so the destination's analytics show which connections people use. This site's
 * origin is `character`. The pages are read as templates, before the build puts
 * the persona and the kit in them: links inside those are content, not templates.
 * The identity link to the blog (the footer's author h-card) stays clean.
 */
const PAGES = [
  "index.html",
  "404.html",
  "embed/index.html",
  "examples/workshop.html",
  "persona/index.html",
  "kit/index.html",
  "print/index.html",
];
const JAMIES_SITES = new Set([
  "thingy.thingelstad.com",
  "thingelstad.xyz",
  "weekly.thingelstad.com",
  "another.thingelstad.com",
  "links.thingelstad.xyz",
  "www.thingelstad.com",
  "thingelstad.com",
  "sync.thingelstad.xyz",
]);

/** An attribute's value, quoted with either kind of quote. */
function attribute(attributes: string, name: string): string {
  const match = attributes.match(
    new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`),
  );
  return match?.[1] ?? match?.[2] ?? "";
}

function links(html: string): { href: string; rel: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>/g)].map(([, attributes]) => ({
    href: attribute(attributes, "href"),
    rel: attribute(attributes, "rel"),
  }));
}

/**
 * The footer's credit to Jamie, which names who he is, not where a reader came from.
 * Decided by where it points and its rel, never by its query, so a ref added to it
 * is caught below instead of passing as an ordinary link.
 */
const isIdentity = (url: URL, rel: string): boolean =>
  url.hostname === "www.thingelstad.com" &&
  url.pathname === "/" &&
  rel.split(/\s+/).some((word) => word === "me" || word === "author");

test("every template link to Jamie's other sites says it came from here", () => {
  let checked = 0;
  for (const page of PAGES) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), "utf8");
    for (const { href, rel } of links(html)) {
      if (!/^https?:\/\//.test(href)) continue;
      const url = new URL(href.replaceAll("&amp;", "&"));
      if (!JAMIES_SITES.has(url.hostname)) continue;
      if (isIdentity(url, rel)) {
        assert.equal(url.search, "", `${page}: the identity link stays clean`);
        continue;
      }
      assert.match(
        url.searchParams.get("ref") ?? "",
        /^character-[a-z]+$/,
        `${page}: ${href} has no character- ref`,
      );
      checked += 1;
    }
  }
  assert.ok(checked >= 13, `only ${checked} links checked`);
});

test("the home page's template links carry the placement they sit in", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const refs = links(html)
    .filter(({ href }) => /^https:\/\//.test(href))
    .map(({ href }) => new URL(href).searchParams.get("ref"))
    .filter(Boolean);
  assert.deepEqual([...new Set(refs)].sort(), [
    "character-footer",
    "character-jobs",
    "character-nav",
    "character-speech",
  ]);
});

test("his question to Ask Thingy says it came from his speech", () => {
  const url = new URL(askAddress("What does Jamie read?"));
  assert.equal(url.searchParams.get("ref"), "character-speech");
  assert.equal(url.searchParams.get("prompt"), "What does Jamie read?");
});
