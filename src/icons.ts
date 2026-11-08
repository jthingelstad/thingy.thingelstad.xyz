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
  printer:
    '<rect x="4" y="3" width="16" height="18" rx="1.500"/><path d="M4 8h16M8 8v3M16 8v3M6 11h12M9 17h6"/>',
  plate:
    '<path d="M2 18h20l-2 3H4Z"/><circle cx="12" cy="7" r="3.500"/><path d="M9 18l.5-4.500h5L15 18"/>',
  phone:
    '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  book: '<path d="M12 6c-2-1.500-5-2-9-2v15c4 0 7 .5 9 2 2-1.500 5-2 9-2V4c-4 0-7 .5-9 2ZM12 6v15"/>',
  mug: '<path d="M4 7h12v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3ZM16 10h2a3 3 0 0 1 0 6h-2"/><path d="M8 3v1M12 3v1"/>',
  mic: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
  baton: '<path d="m4 20 4-4M8 16 19 5a1.400 1.400 0 0 0-2-2L6 14Z"/>',
  camera:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13" r="3.500"/><path d="M9 7l1.500-3h3L15 7"/>',
  helmet:
    '<path d="M3 15a9 9 0 0 1 18 0v1H3ZM7 10l2-4M12 9V5M17 10l-2-4M3 16l-1 3h9"/>',
  scarf:
    '<path d="M5 6c3 3 11 3 14 0v4c-3 3-11 3-14 0ZM14 12v9h4v-9M8 11v6h4"/>',
  candle:
    '<rect x="7" y="11" width="10" height="10" rx="1.500"/><path d="M12 11V8M12 8c-1.500-1.500-1-3 0-5 1 2 1.500 3.500 0 5Z"/>',
  tongs:
    '<path d="M18 21 9 5a2 2 0 0 0-3 1l-1 3M6 21 15 5a2 2 0 0 1 3 1l1 3"/>',
  whisk:
    '<path d="M12 22v-8M12 14c-5-4-5-12 0-12s5 8 0 12ZM12 14c-2-4-2-9 0-12 2 3 2 8 0 12Z"/>',
  grill:
    '<path d="M12 3c-5 0-8 5-8 10a8 8 0 0 0 16 0c0-5-3-10-8-10ZM4.500 11h15M10 3.500h4V2h-4ZM10 15h4v3h-4ZM8 20l-2 2M16 20l2 2"/>',
  hat: '<path d="M5 16c0-7 3-11 7-11s7 4 7 11M4 16h16v4H4ZM12 5V2M8 16v4M12 16v4M16 16v4"/>',
  read: '<path d="M12 6c-2-1.500-5-2-9-2v15c4 0 7 .5 9 2 2-1.500 5-2 9-2V4c-4 0-7 .5-9 2Z"/>',
  sip: '<path d="M6 3h12l-1 8a5 5 0 0 1-10 0ZM12 16v5M8 21h8"/>',
  speak:
    '<path d="M4 9v6h3l5 4V5L7 9ZM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  throw: '<path d="M4 20c4-10 9-14 16-15M14 4l6 1-2 6"/>',
  carry: '<path d="M12 3v14M6 11l6 6 6-6M5 21h14"/>',
  show: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  work: '<path d="m13 3-8 11h6l-1 7 9-12h-6Z"/>',
  check: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.500-4.500"/>',
  hold: '<path d="M12 21V7M6 13l6-6 6 6M5 3h14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
  shuffle:
    '<path d="M2 18h3.5c1.600 0 3-.8 3.900-2l5.200-8c.9-1.200 2.300-2 3.900-2H22M2 6h3.500c1.600 0 3 .8 3.900 2l1 1.500M22 18h-4.500c-1.600 0-3-.8-3.900-2l-1-1.500M19 3l3 3-3 3M19 15l3 3-3 3"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  "sound-on":
    '<path d="M4 9v6h3l5 4V5L7 9ZM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  "sound-off": '<path d="M4 9v6h3l5 4V5L7 9ZM16 9.5l5 5M21 9.5l-5 5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
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
