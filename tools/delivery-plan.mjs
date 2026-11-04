// How each published file is typed and cached. Pure, so tests can hold it.
import { createHash } from "node:crypto";
import path from "node:path";

export const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".wasm": "application/wasm",
  ".woff2": "font/woff2",
  ".3mf": "model/3mf",
  ".zip": "application/zip",
};

const IMMUTABLE = "public, max-age=31536000, immutable";
const SHORT = "public, max-age=300";
const PAGE = "public, max-age=0, s-maxage=60, must-revalidate";

// Vite's hashed bundles never change. Character files are versioned by
// directory, but a version can still be re-exported before it settles, so
// they get a day, not a year. thingy.js, each manifest and character/latest/
// are the stable entry points other sites load, so they stay short.
export function cacheControl(key) {
  const extension = path.extname(key);
  if (key.startsWith("assets/")) return IMMUTABLE;
  if (
    key === "thingy.js" ||
    key.startsWith("character/latest/") ||
    /^character\/[^/]+\/manifest\.json$/.test(key)
  )
    return SHORT;
  if (key.startsWith("character/")) return "public, max-age=86400";
  // Print files are versioned by directory too, and their manifest likewise.
  if (/^print\/v[^/]+\//.test(key)) return "public, max-age=86400";
  if (key.startsWith("shared/fonts/")) return "public, max-age=2592000";
  if (
    [".html", ".txt", ".md", ".xml"].includes(extension) ||
    key === "revision.json"
  )
    return PAGE;
  return "public, max-age=3600";
}

/** The newest of a list of version directories, by number: v0.14 beats v0.9. */
export function newestCharacterVersion(names) {
  const number = (name) => name.slice(1).split(".").map(Number);
  return names
    .filter((name) => /^v\d+\.\d+$/.test(name))
    .sort((a, b) => {
      const [left, right] = [number(a), number(b)];
      return left[0] - right[0] || left[1] - right[1];
    })
    .at(-1);
}

export function publicationOrder(files) {
  return [...files].sort(
    (a, b) =>
      Number(a.endsWith(".html")) - Number(b.endsWith(".html")) ||
      a.localeCompare(b),
  );
}

// Stored as built, never pre-compressed: CloudFront compresses per request
// for clients that ask (nnxyz served stored gzip to clients that did not).
export function prepareObject(key, bytes) {
  if (
    key.startsWith("/") ||
    key.split("/").includes("..") ||
    key.includes("\\")
  )
    throw new Error(`Unsafe public key: ${key}`);
  const type = mime[path.extname(key)];
  if (!type) throw new Error(`No MIME type for ${key}`);
  return {
    Body: bytes,
    ContentType: type,
    CacheControl: cacheControl(key),
    Metadata: { sha256: createHash("sha256").update(bytes).digest("hex") },
  };
}
