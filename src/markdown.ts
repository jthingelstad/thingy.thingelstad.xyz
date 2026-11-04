// A small Markdown renderer for persona/THINGY.md and kit/KIT.md, run at build
// time so each page and its .md address come from the same file. It knows only
// what those files use: headings, paragraphs, nested lists, tables, block quotes,
// fenced code, links, code, bold and emphasis. Anything else stays as escaped text.

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const attribute = (text: string) => escape(text).replace(/"/g, "&quot;");

export const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Code spans are set aside first, so a link may hold one and nothing inside
// one is read as Markdown.
const MARK = String.fromCharCode(1);
export function inline(text: string): string {
  const code: string[] = [];
  const held = text.replace(/`([^`]+)`/g, (_, body: string) => {
    code.push(`<code>${escape(body)}</code>`);
    return `${MARK}${code.length - 1}${MARK}`;
  });
  return escape(held)
    .replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_, label: string, href: string) =>
        `<a href="${attribute(href)}">${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:)]|$)/g, "$1<em>$2</em>")
    .replace(
      new RegExp(`${MARK}(\\d+)${MARK}`, "g"),
      (_, n: string) => code[Number(n)],
    );
}

type Item = { text: string; children: Item[] };

function renderList(items: Item[]): string {
  return `<ul>${items
    .map(
      (item) =>
        `<li>${inline(item.text)}${item.children.length ? renderList(item.children) : ""}</li>`,
    )
    .join("")}</ul>`;
}

// Bullets nest by indent; an indented line that is not a bullet continues
// the item above it.
function parseList(lines: string[]): Item[] {
  const root: Item[] = [];
  const stack = [{ indent: -1, items: root }];
  let current: Item | undefined;
  for (const line of lines) {
    const bullet = /^(\s*)- (.*)$/.exec(line);
    if (!bullet) {
      if (current) current.text += ` ${line.trim()}`;
      continue;
    }
    const indent = bullet[1].length;
    while (indent <= stack[stack.length - 1].indent) stack.pop();
    current = { text: bullet[2], children: [] };
    stack[stack.length - 1].items.push(current);
    stack.push({ indent, items: current.children });
  }
  return root;
}

function renderTable(lines: string[]): string {
  const cells = (line: string) =>
    line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());
  const [head, , ...body] = lines;
  // Each body cell carries its column's name, so a narrow screen can show a
  // row as a labelled card.
  const labels = cells(head);
  return `<div class="table-wrap"><table><thead><tr>${labels
    .map((cell) => `<th scope="col">${inline(cell)}</th>`)
    .join("")}</tr></thead><tbody>${body
    .map(
      (row) =>
        `<tr>${cells(row)
          .map((cell, index) =>
            index === 0
              ? `<th scope="row">${inline(cell)}</th>`
              : `<td data-label="${attribute(labels[index] ?? "")}">${inline(cell)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("")}</tbody></table></div>`;
}

export function renderMarkdown(
  source: string,
  options: { skipTitle?: boolean } = {},
): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let index = 0;
  const take = (keep: (line: string) => boolean) => {
    const block: string[] = [];
    while (index < lines.length && keep(lines[index]))
      block.push(lines[index++]);
    return block;
  };
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }
    const heading = /^(#{1,4}) (.*)$/.exec(line);
    if (heading) {
      index++;
      const level = heading[1].length;
      if (level === 1 && options.skipTitle) continue;
      out.push(
        `<h${level} id="${slug(heading[2])}">${inline(heading[2])}</h${level}>`,
      );
      continue;
    }
    if (line.startsWith("```")) {
      index++;
      const code = take((l) => !l.startsWith("```"));
      index++;
      out.push(
        `<pre tabindex="0"><code>${escape(code.join("\n"))}</code></pre>`,
      );
      continue;
    }
    if (line.startsWith(">")) {
      const block = take((l) => l.startsWith(">")).map((l) =>
        l.replace(/^> ?/, ""),
      );
      out.push(`<blockquote>${renderMarkdown(block.join("\n"))}</blockquote>`);
      continue;
    }
    if (line.startsWith("|")) {
      out.push(renderTable(take((l) => l.startsWith("|"))));
      continue;
    }
    if (/^- /.test(line)) {
      out.push(
        renderList(parseList(take((l) => /^- /.test(l) || /^\s+\S/.test(l)))),
      );
      continue;
    }
    const paragraph = take(
      (l) => !!l.trim() && !/^(#{1,4} |>|\||- |```)/.test(l),
    );
    out.push(`<p>${inline(paragraph.map((l) => l.trim()).join(" "))}</p>`);
  }
  return out.join("\n");
}
