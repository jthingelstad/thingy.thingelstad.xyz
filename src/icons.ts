const paths: Record<string, string> = {
  hello:
    '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 3 7 3 8 0M8 9h.01M16 9h.01"/>',
  present:
    '<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z"/>',
  thinking:
    '<path d="M5 16c-5-4-1-11 4-10 3-5 11-2 10 3 5 4 0 9-4 8H9l-3 3Z"/>',
  rest: '<path d="M3 17a9 9 0 0 1 18 0M8 15h.01M16 15h.01"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  external: '<path d="M8 4h12v12M20 4 4 20"/>',
};
export function icon(name: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}
