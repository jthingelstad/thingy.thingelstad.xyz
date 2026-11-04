import { test } from "node:test";
import assert from "node:assert/strict";
import { inline, renderMarkdown, slug } from "../src/markdown.ts";

test("inline Markdown: links may hold code, and code holds no Markdown", () => {
  assert.equal(
    inline("see [`/persona.md`](https://x.test/persona.md) and `**raw**`"),
    'see <a href="https://x.test/persona.md"><code>/persona.md</code></a> and <code>**raw**</code>',
  );
  assert.equal(
    inline("**Bold** and _about_ him, not snake_case_name"),
    "<strong>Bold</strong> and <em>about</em> him, not snake_case_name",
  );
  assert.equal(inline("a < b & c"), "a &lt; b &amp; c");
});

test("lists nest by indent and continuation lines join their item", () => {
  const html = renderMarkdown(
    "- **One:**\n  - first,\n    continued;\n  - second.\n- Two",
  );
  assert.equal(
    html,
    "<ul><li><strong>One:</strong><ul><li>first, continued;</li><li>second.</li></ul></li><li>Two</li></ul>",
  );
});

test("headings get ids, the title can be skipped, tables and quotes render", () => {
  const html = renderMarkdown(
    "# Thingy\n\n## Where he works\n\n> A quote\n> continues.\n\n| A | B |\n| - | - |\n| x | y |\n",
    { skipTitle: true },
  );
  assert.ok(!html.includes("<h1"));
  assert.ok(html.includes('<h2 id="where-he-works">Where he works</h2>'));
  assert.ok(
    html.includes("<blockquote><p>A quote continues.</p></blockquote>"),
  );
  assert.ok(html.includes('<th scope="row">x</th><td data-label="B">y</td>'));
  assert.equal(slug("How he speaks, everywhere"), "how-he-speaks-everywhere");
});

test("fenced code keeps its lines and holds no Markdown", () => {
  assert.equal(
    renderMarkdown("Before\n```html\n<a>**raw**</a>\n  [x](y)\n```\nAfter"),
    '<p>Before</p>\n<pre tabindex="0"><code>&lt;a&gt;**raw**&lt;/a&gt;\n  [x](y)</code></pre>\n<p>After</p>',
  );
});
