const paths: Record<string, string> = {
  hello:
    '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 3 7 3 8 0M8 9h.01M16 9h.01"/>',
  present:
    '<path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z"/>',
  thinking:
    '<path d="M5 16c-5-4-1-11 4-10 3-5 11-2 10 3 5 4 0 9-4 8H9l-3 3Z"/>',
  rest: '<path d="M3 17a9 9 0 0 1 18 0M8 15h.01M16 15h.01"/>',
  none: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-7a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V12m0-3a1.5 1.5 0 0 1 3 0v6c0 3.9-3 7-7 7-3.2 0-5-1.3-6.6-4L4 15c-.8-1.5 1.2-2.7 2.3-1.4L8 15.5"/>',
  screwdriver:
    '<path d="m3 21 1-3.5 7-7 3.5 3.5-7 7Z"/><path d="M12.75 12 20 4.75M18 3l3 3"/>',
  hammer:
    '<path d="m13.5 8.5-9.800 9.800a1.700 1.700 0 0 0 2.400 2.400l9.800-9.800"/><path d="m11 6 3-3h3.5L22 7.5V11l-2 2Z"/>',
  drill:
    '<path d="M3 5h12v8H3Z"/><path d="M15 7h3l4 2-4 2h-3M6 13l-1 8h5l2-8"/>',
  laptop:
    '<rect x="5" y="4" width="14" height="11" rx="1.5"/><path d="M2 20h20l-3-5H5Z"/>',
  backpack:
    '<path d="M7 8a5 5 0 0 1 10 0v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1Z"/><path d="M10 3.300V2h4v1.300M9.500 14h5v3h-5ZM7 10H5v8h2M17 10h2v8h-2"/>',
  headphones:
    '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="2.500" y="14" width="4.500" height="7" rx="1.500"/><rect x="17" y="14" width="4.500" height="7" rx="1.500"/>',
  carry: '<path d="M12 3v14M6 11l6 6 6-6M5 21h14"/>',
  show: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  work: '<path d="m13 3-8 11h6l-1 7 9-12h-6Z"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  external: '<path d="M8 4h12v12M20 4 4 20"/>',
};
export function icon(name: string): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}
