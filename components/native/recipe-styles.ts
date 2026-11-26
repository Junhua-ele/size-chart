// The design's recipe sheet. It carries the design's tokens and one
// accessibility rule; every component look on this site is written in
// app/globals.css, so the two sheets never fight over the same selector.
export const recipeStyles: string =
  ":root{--background:#113B38;--surface:#1B4B47;--surface-deep:#0E3330;--field:#143F3C;--text:#F4F1E6;--muted:#BFD6CF;--accent:#F5C449;--ink:#16211F;--secondary:#A9D3C9;--line:#2C5F5A;--line-strong:#7FA9A1;--radius:10px;--radius-sm:6px;--maxw:1280px;--s14:14px;--s17:17px;--s19:19px;--s30:30px;--s48:48px;--s60:60px;--ease:cubic-bezier(0.2,0.7,0.3,1)}\n@media (prefers-reduced-motion: reduce){*,*::before,*::after{transition-duration:0.01ms!important;animation-duration:0.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important}}\n";
