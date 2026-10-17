/**
 * @typedef {{ light: string, dark: string, classicLight: string, classicDark: string, intelligent: string }} ModeValue
 * Single source of truth for Quill tokens. Edit here, then run `npm run build:tokens`.
 *
 * Five themes: light (Dawn, the default), dark (Dusk), classicLight (Classic Light,
 * pure white), classicDark (Classic Dark, pure black) and intelligent (the operational
 * "cockpit" surface for agent dashboards — green-tinted near-black grounds from the
 * Mission Control v14 comp, teal working status, Inter/JetBrains Mono instrument faces).
 * The classic pair runs the same pigment hues pushed +50% chroma in OKLCH
 * (gamut-clamped) on neutral grounds.
 */
export const tokens = {
  font: {
    sans: '"Raleway", -apple-system, BlinkMacSystemFont, sans-serif',
    display: '"Fraunces", Georgia, serif',
    heading: '"Fraunces", Georgia, serif',
    mono: 'ui-monospace, "SF Mono", Menlo, monospace',
    // Instrument faces for dense operational surfaces (the intelligent theme's
    // native voice; usable from any theme): ui carries labels and controls,
    // data carries figures, timestamps, and micro-labels.
    ui: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    data: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
  },
  color: {
    paper: {
      base: { light: '#F5EDDD', dark: '#20180E', classicLight: '#FFFFFF', classicDark: '#000000', intelligent: '#0E100D' },
      warm: { light: '#EFE4CE', dark: '#2A2014', classicLight: '#F7F7F7', classicDark: '#111111', intelligent: '#171A14' },
      deep: { light: '#E8DCC0', dark: '#352A1A', classicLight: '#EFEFEF', classicDark: '#1C1C1C', intelligent: '#1D2117' },
    },
    ink: {
      base: { light: '#2A2622', dark: '#F1E7D3', classicLight: '#171717', classicDark: '#F5F5F5', intelligent: '#E9E5D6' },
      // intelligent soft is lifted from the comp's #93927C — that cut passes AA but is
      // thin for body duty; the comp value carried the muted/meta cut below until
      // the 2026-09-22 theme sweep: muted also reads as placeholder text on the
      // dark field wash (`dark:bg-input/30` in the stock primitives), where the
      // comp values sat at 4.17:1 (Dusk) and 3.88:1 (Intelligent) inside a card.
      // Both lifted the least that clears 4.5:1 there (+8 % / +12 % toward white,
      // hue kept); line.control cannot move instead — it sits 0.34 above its own 3:1.
      soft: { light: '#5C524A', dark: '#C8B9A0', classicLight: '#454545', classicDark: '#C9C9C9', intelligent: '#A9A791' },
      muted: { light: '#675F58', dark: '#AFA08A', classicLight: '#5E5E5E', classicDark: '#A0A0A0', intelligent: '#A09F8C' },
    },
    pigment: {
      terracotta: {
        base: { light: '#C4684B', dark: '#DB8568', classicLight: '#DE501B', classicDark: '#F57345', intelligent: '#C96F4C' },
        deep: { light: '#8A4530', dark: '#E89A80', classicLight: '#9D3209', classicDark: '#FE8D67', intelligent: '#E08A66' },
      },
      moss: {
        base: { light: '#7A8C5C', dark: '#A2B57E', classicLight: '#758F43', classicDark: '#9DB962', intelligent: '#7FAE5A' },
        deep: { light: '#4C5936', dark: '#B6C896', classicLight: '#516526', classicDark: '#B1CC7E', intelligent: '#9BC47D' },
      },
      indigo: {
        base: { light: '#5B6B8A', dark: '#92A2C2', classicLight: '#536A99', classicDark: '#8AA2D2', intelligent: '#8B8FD8' },
        deep: { light: '#44516D', dark: '#AAB8D4', classicLight: '#3D507A', classicDark: '#A3B8E2', intelligent: '#A6AAE3' },
      },
      gold: {
        base: { light: '#B89968', dark: '#D6BA86', classicLight: '#C49544', classicDark: '#E2B764', intelligent: '#E0A340' },
        deep: { light: '#9A7D4E', dark: '#E2CA9E', classicLight: '#A57928', classicDark: '#ECC883', intelligent: '#E8BC72' },
        // Gold is the one pigment whose deep cut can't carry TEXT duty on light
        // grounds (3.3:1 on Dawn paper, 3.9:1 on white). This darker text cut
        // clears 4.5:1 there; dark grounds reuse the deep cut (11:1+).
        text: { light: '#68522D', dark: '#E2CA9E', classicLight: '#7C5814', classicDark: '#ECC883', intelligent: '#E8BC72' },
      },
      // The "working" status hue (agent actively running) — teal sits between moss
      // (success) and indigo (info) so live activity reads as its own signal. Light
      // and classic cuts follow the house recipes (classic = +50% OKLCH chroma).
      teal: {
        base: { light: '#4E938B', dark: '#4AA9A0', classicLight: '#178F84', classicDark: '#3DBDB1', intelligent: '#4AA9A0' },
        deep: { light: '#2F6B64', dark: '#63BCB2', classicLight: '#0E6B61', classicDark: '#5FD3C7', intelligent: '#63BCB2' },
      },
    },
    chart: {
      // Chart-only cuts. The UI pigments can't do series duty: their OKLCH chroma
      // sits below the 0.10 "reads gray" floor for data marks.
      //
      // These re-step the same brand hues (terracotta 35°, indigo 262°, gold 84°,
      // moss 128° + a chart-only plum 335° replacing ink-soft) — hues are brand and
      // never move. What DOES move is lightness, and that is the whole design:
      //
      // Three of the five hues (terracotta, gold, moss) sit in the red-yellow-green
      // arc, which is exactly the arc red-green colour blindness collapses. The
      // original cuts held all five at roughly ONE lightness (Dawn: 0.606 / 0.605 /
      // 0.584 for series 1/3/5) and separated them by hue alone — beautiful for
      // normal vision, and indistinguishable for ~8% of men. Measured worst pair was
      // ΔE2000 0.34 on Classic Dark under protanopia, against a stated target of 8.
      //
      // So the series are now a LIGHTNESS ramp as well as a hue wheel. Under
      // dichromacy hue collapses and lightness is what survives, so lightness is
      // what has to carry the separation. Chroma is never raised above the previous
      // cut, so the palette stays as muted as it was.
      //
      // Enforced, not asserted: quill.tokens.test.mjs simulates protanopia,
      // deuteranopia and tritanopia (Viénot-Brettel-Mollon) and fails if any pair in
      // any theme drops below ΔE2000 8. Current worst: 8.53. Assign series colors in
      // this fixed order — never cycle or reorder survivors when a filter drops one.
      series: {
        1: { light: '#732510', dark: '#CA725C', classicLight: '#7C1C01', classicDark: '#C75E45', intelligent: '#C66F59' },
        2: { light: '#345799', dark: '#5175BA', classicLight: '#194AAC', classicDark: '#3966B9', intelligent: '#466AAE' },
        3: { light: '#9D7614', dark: '#A17A1B', classicLight: '#AD8214', classicDark: '#BA8B01', intelligent: '#BF973F' },
        4: { light: '#79376C', dark: '#CC83BB', classicLight: '#8D297E', classicDark: '#F086DA', intelligent: '#EEA3DD' },
        5: { light: '#4F6D1A', dark: '#9ABE6D', classicLight: '#577A16', classicDark: '#8CB258', intelligent: '#A0C473' },
      },
      // Sequential (magnitude): one hue — moss — light→dark on light grounds,
      // dark→light on dark grounds; 1 = low emphasis (near ground), 5 = high.
      seq: {
        1: { light: '#C7D8B5', dark: '#303D20', classicLight: '#CCE0B6', classicDark: '#2A3815', intelligent: '#303D20' },
        2: { light: '#A1B787', dark: '#475A2E', classicLight: '#A0BC7E', classicDark: '#41591D', intelligent: '#475A2E' },
        3: { light: '#7C975A', dark: '#5F793D', classicLight: '#779A45', classicDark: '#5A7B25', intelligent: '#5F793D' },
        4: { light: '#567428', dark: '#79994D', classicLight: '#527602', classicDark: '#749F2B', intelligent: '#79994D' },
        5: { light: '#375101', dark: '#97B86B', classicLight: '#375101', classicDark: '#95C352', intelligent: '#97B86B' },
      },
      // Diverging (polarity): terracotta pole ↔ indigo pole (warm/cool — never
      // red/green) around a near-neutral warm-gray midpoint; 1 = strong negative,
      // 3 = midpoint, 5 = strong positive.
      div: {
        1: { light: '#903F2B', dark: '#DC836D', classicLight: '#A22801', classicDark: '#FA7959', intelligent: '#DC836D' },
        2: { light: '#BB8273', dark: '#986153', classicLight: '#C77B68', classicDark: '#A75D4B', intelligent: '#986153' },
        3: { light: '#CFC9C5', dark: '#403C39', classicLight: '#D4D0CD', classicDark: '#3A3735', intelligent: '#403C39' },
        4: { light: '#7993C1', dark: '#59729E', classicLight: '#7092D0', classicDark: '#5474AF', intelligent: '#59729E' },
        5: { light: '#36589B', dark: '#779EE6', classicLight: '#2253B5', classicDark: '#71A3FF', intelligent: '#779EE6' },
      },
    },
    line: {
      faint: { light: 'rgba(42, 38, 34, 0.08)', dark: 'rgba(241, 231, 211, 0.07)', classicLight: 'rgba(0, 0, 0, 0.07)', classicDark: 'rgba(255, 255, 255, 0.08)', intelligent: 'rgba(233, 229, 214, 0.07)' },
      soft: { light: 'rgba(42, 38, 34, 0.12)', dark: 'rgba(241, 231, 211, 0.11)', classicLight: 'rgba(0, 0, 0, 0.11)', classicDark: 'rgba(255, 255, 255, 0.12)', intelligent: 'rgba(233, 229, 214, 0.11)' },
      base: { light: 'rgba(42, 38, 34, 0.15)', dark: 'rgba(241, 231, 211, 0.15)', classicLight: 'rgba(0, 0, 0, 0.14)', classicDark: 'rgba(255, 255, 255, 0.16)', intelligent: 'rgba(233, 229, 214, 0.15)' },
      strong: { light: 'rgba(42, 38, 34, 0.20)', dark: 'rgba(241, 231, 211, 0.22)', classicLight: 'rgba(0, 0, 0, 0.20)', classicDark: 'rgba(255, 255, 255, 0.24)', intelligent: 'rgba(233, 229, 214, 0.22)' },
      // Solid boundary for interactive controls (switch/slider tracks, field & checkbox/radio
      // borders). Alpha lines never reach WCAG 1.4.11 non-text 3:1 on paper; these solids do:
      // 3.38:1 (light) / 3.34:1 (dark) / 3.69:1 (classic light) / 4.56:1 (classic dark)
      // against the page. Used by the shadcn `input` token.
      control: { light: '#8A7F6E', dark: '#746B5D', classicLight: '#858585', classicDark: '#757575', intelligent: '#767663' },
    },
    // The AI gradient (Ember): gold → terracotta → indigo. It means one thing, AI,
    // and appears only in the seven placements in DESIGN.md. Dawn/Dusk are their
    // pigments at 1.5x OKLCH chroma (same lightness and hue); Classic already ships
    // its pigments at exactly that chroma and Intelligent richer still, so those use
    // their own pigments. Fixed across accents. Text stops are the deep cuts, all
    // >= 6.2:1 on their paper. Spec: docs/superpowers/specs/2026-10-02-quill-ai-kit-design.md
    ai: {
      from: { light: '#C49544', dark: '#E2B764', classicLight: '#C49544', classicDark: '#E2B764', intelligent: '#E0A340' },
      via: { light: '#DE501B', dark: '#F57345', classicLight: '#DE501B', classicDark: '#F57345', intelligent: '#C96F4C' },
      to: { light: '#536A99', dark: '#8AA2D2', classicLight: '#536A99', classicDark: '#8AA2D2', intelligent: '#8B8FD8' },
      'text-from': { light: '#714F07', dark: '#ECC883', classicLight: '#7C5814', classicDark: '#ECC883', intelligent: '#E8BC72' },
      'text-via': { light: '#9D3209', dark: '#FF8B64', classicLight: '#9D3209', classicDark: '#FE8D67', intelligent: '#E08A66' },
      'text-to': { light: '#3D507A', dark: '#A3B8E2', classicLight: '#3D507A', classicDark: '#A3B8E2', intelligent: '#A6AAE3' },
    },
  },
  radius: {
    xs: '0.125rem', sm: '0.25rem', md: '0.375rem', lg: '0.5rem',
    xl: '1rem', '2xl': '1.5rem', '3xl': '2rem', '4xl': '2.5rem',
  },
  radiusBase: '0.5rem',
  spacing: {
    // half-steps + control sizes cover component dims (h-7=28, h-9=36, px-2.5=10, gap-1.5=6, py-0.5=2).
    // 3.5 (14px) is the AI kit's inset: message, popover, panel and composer padding all sit on it.
    // 4.5 (18px) is the AI mark's size in buttons, menus and mode tabs.
    '0.5': '0.125rem', 1: '0.25rem', '1.5': '0.375rem', 2: '0.5rem', '2.5': '0.625rem',
    3: '0.75rem', '3.5': '0.875rem', 4: '1rem', '4.5': '1.125rem', 5: '1.25rem', 6: '1.5rem', 7: '1.75rem', 8: '2rem',
    9: '2.25rem', 10: '2.5rem', 12: '3rem', 16: '4rem', 20: '5rem', 24: '6rem',
  },
  borderWidth: { 0: '0px', 1: '1px', 2: '2px', 3: '3px', 4: '4px' },
  // Widths and heights past the spacing scale, named for their job the way the colour roles
  // are (each job is written in src/usage/sizes.mjs). Drawn in 1.29.0 from every width and
  // height Quill's shipped code used. Widths ride Tailwind's container family, so they work on
  // w-, max-w-, min-w- and basis- only; heights ride the spacing family (h-, min-h-, max-h-,
  // size-), and quill-check keeps them off padding and gaps.
  size: {
    width: {
      chip: '10rem', menu: '12rem', 'chip-lg': '14rem', rail: '15rem', panel: '18rem',
      'card-sm': '20rem', card: '24rem', 'card-lg': '28rem', 'card-xl': '35rem',
      measure: '42rem', thread: '48rem', page: '55rem', 'page-wide': '87.5rem',
    },
    height: {
      touch: '2.75rem', bar: '3.5rem', 'area-sm': '8rem', area: '14rem',
      'frame-sm': '30rem', frame: '35rem', 'frame-lg': '40rem',
    },
  },
  text: {
    '2xs': '0.7rem', xs: '0.75rem', sm: '0.85rem', base: '0.95rem', lg: '1.15rem',
    xl: '1.5rem', '2xl': '2rem', '3xl': '3rem', '4xl': '4rem', '5xl': '5.5rem',
  },
  // The line height each `text-*` utility carries. Not new values: these are
  // what the classes have always rendered — Tailwind's default pairings,
  // inherited silently when Quill re-cut the sizes (`text-sm` = 13.6px on a
  // 142.857% line). Declared so the docs, Paper and the apps read
  // one number instead of each typing their own. `2xs` is Quill's own size and
  // has no pairing on purpose: it inherits from its parent.
  textLeading: {
    xs: 'calc(1 / 0.75)', sm: 'calc(1.25 / 0.875)', base: 'calc(1.5 / 1)', lg: 'calc(1.75 / 1.125)',
    xl: 'calc(1.75 / 1.25)', '2xl': 'calc(2 / 1.5)', '3xl': 'calc(2.25 / 1.875)', '4xl': 'calc(2.5 / 2.25)',
    '5xl': '1',
  },
  // Line-height and letter-spacing roles, named for the text they set rather than
  // how they feel. The scale used to be documented as snug / tight / wide, but
  // Tailwind owns those names with other values (`leading-snug` is 1.375,
  // `tracking-wide` 0.025em) and shipped components use them — and a role tells an
  // agent when to reach for it. Only values shipped code uses earn a token.
  leading: { display: '1.05', heading: '1.2', ui: '1.5', reading: '1.7' },
  tracking: { display: '-0.03em', label: '0.1em', eyebrow: '0.15em' },
  shadow: {
    // Classic pairs reuse the light/dark recipes with neutral black casts —
    // no warm ink tint on the pure white/black grounds.
    xs: {
      light: '0 1px 2px -1px rgba(42, 38, 34, 0.12), 0 0 0 1px rgba(42, 38, 34, 0.05)',
      dark: '0 1px 2px -1px rgba(8, 5, 3, 0.40), 0 0 0 1px rgba(8, 5, 3, 0.18)',
      intelligent: '0 1px 2px -1px rgba(8, 5, 3, 0.40), 0 0 0 1px rgba(8, 5, 3, 0.18)',
      classicLight: '0 1px 2px -1px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      classicDark: '0 1px 2px -1px rgba(0, 0, 0, 0.50), 0 0 0 1px rgba(255, 255, 255, 0.06)',
    },
    sm: {
      light: '0 2px 4px -1px rgba(42, 38, 34, 0.14), 0 1px 2px -1px rgba(42, 38, 34, 0.08)',
      dark: '0 2px 4px -1px rgba(8, 5, 3, 0.48), 0 1px 2px -1px rgba(8, 5, 3, 0.30)',
      intelligent: '0 2px 4px -1px rgba(8, 5, 3, 0.48), 0 1px 2px -1px rgba(8, 5, 3, 0.30)',
      classicLight: '0 2px 4px -1px rgba(0, 0, 0, 0.14), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
      classicDark: '0 2px 4px -1px rgba(0, 0, 0, 0.55), 0 1px 2px -1px rgba(0, 0, 0, 0.35)',
    },
    base: {
      light: '0 4px 8px -2px rgba(42, 38, 34, 0.16), 0 2px 4px -2px rgba(42, 38, 34, 0.10)',
      dark: '0 4px 8px -2px rgba(8, 5, 3, 0.54), 0 2px 4px -2px rgba(8, 5, 3, 0.36)',
      intelligent: '0 4px 8px -2px rgba(8, 5, 3, 0.54), 0 2px 4px -2px rgba(8, 5, 3, 0.36)',
      classicLight: '0 4px 8px -2px rgba(0, 0, 0, 0.16), 0 2px 4px -2px rgba(0, 0, 0, 0.10)',
      classicDark: '0 4px 8px -2px rgba(0, 0, 0, 0.60), 0 2px 4px -2px rgba(0, 0, 0, 0.40)',
    },
    lg: {
      light: '0 12px 20px -4px rgba(42, 38, 34, 0.18), 0 4px 8px -4px rgba(42, 38, 34, 0.10)',
      dark: '0 12px 20px -4px rgba(8, 5, 3, 0.62), 0 4px 8px -4px rgba(8, 5, 3, 0.40)',
      intelligent: '0 12px 20px -4px rgba(8, 5, 3, 0.62), 0 4px 8px -4px rgba(8, 5, 3, 0.40)',
      classicLight: '0 12px 20px -4px rgba(0, 0, 0, 0.18), 0 4px 8px -4px rgba(0, 0, 0, 0.10)',
      classicDark: '0 12px 20px -4px rgba(0, 0, 0, 0.68), 0 4px 8px -4px rgba(0, 0, 0, 0.44)',
    },
    pop: {
      light: '0 20px 32px -6px rgba(42, 38, 34, 0.22), 0 8px 12px -6px rgba(42, 38, 34, 0.12)',
      dark: '0 20px 32px -6px rgba(8, 5, 3, 0.72), 0 8px 12px -6px rgba(8, 5, 3, 0.48)',
      intelligent: '0 20px 32px -6px rgba(8, 5, 3, 0.72), 0 8px 12px -6px rgba(8, 5, 3, 0.48)',
      classicLight: '0 20px 32px -6px rgba(0, 0, 0, 0.22), 0 8px 12px -6px rgba(0, 0, 0, 0.12)',
      classicDark: '0 20px 32px -6px rgba(0, 0, 0, 0.78), 0 8px 12px -6px rgba(0, 0, 0, 0.52)',
    },
  },
  motion: {
    easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeSoft: 'cubic-bezier(0.22, 1, 0.36, 1)',
    durFast: '0.2s', dur: '0.3s', durSlow: '0.5s',
    lift: 'translateY(-4px)', liftSm: 'translateY(-2px)',
  },
  // WONK (the off-kilter glyph set) is ON by default in the font, so a preset that
  // does not name it gets WONK 1 — which is why text and caption set it to 0: the
  // docs reserve the off-kilter forms for the accent word. text pins no optical
  // size: it serves h2–h6 and every font-heading element from 15 px to 48 px, and
  // opsz should follow the size; display/accent/caption pin theirs on purpose.
  fraunces: {
    display: '"opsz" 144, "SOFT" 50, "WONK" 0',
    accent: '"opsz" 144, "SOFT" 100, "WONK" 1',
    text: '"SOFT" 50, "WONK" 0',
    caption: '"opsz" 14, "SOFT" 100, "WONK" 0',
  },
  // User-selectable accent: which pigment carries the voice (eyebrows, accent
  // italics, links, focus rings). Switched via data-accent="…" on <html>;
  // moss is the default. `base` decorates (accent words, swatches);
  // `text` is the AA-safe cut for text/ring duty — the deep cut everywhere
  // except gold, whose deep cut fails 4.5:1 on light grounds (see gold.text).
  accents: {
    terracotta: { base: 'var(--terracotta)', text: 'var(--terracotta-deep)' },
    moss: { base: 'var(--moss)', text: 'var(--moss-deep)' },
    indigo: { base: 'var(--indigo)', text: 'var(--indigo-deep)' },
    // Gold's base cut is 2.3:1 on light grounds — under even the 3:1 large-text
    // bar — so gold's decorative cut is the deep one (3.3:1+ everywhere).
    gold: { base: 'var(--gold-deep)', text: 'var(--gold-text)' },
  },
  // Quill's semantic contract: the 31 colour roles every component speaks
  // (`bg-background`, `text-muted-foreground`, `border-border`). The names are
  // shadcn-compatible on purpose — stock primitives and third-party blocks land on
  // Quill's palette with no edits — but the contract is Quill's own, so it is named
  // for what it is, not for where the names came from. The only group that gets
  // `--color-*` utilities. Aliases → primitives, keyed by CSS var name without `--`.
  semantic: {
    'background': 'var(--paper)', 'foreground': 'var(--ink)',
    'card': 'var(--paper-warm)', 'card-foreground': 'var(--ink)',
    'popover': 'var(--paper-warm)', 'popover-foreground': 'var(--ink)',
    'primary': 'var(--ink)', 'primary-foreground': 'var(--paper)',
    'secondary': 'var(--paper-deep)', 'secondary-foreground': 'var(--ink)',
    'muted': 'var(--paper-deep)', 'muted-foreground': 'var(--ink-muted)',
    'accent': 'var(--paper-deep)', 'accent-foreground': 'var(--ink)',
    'destructive': 'var(--terracotta-deep)',
    'border': 'var(--line-soft)', 'input': 'var(--line-control)', 'ring': 'var(--accent-pigment-text)',
    'chart-1': 'var(--chart-series-1)', 'chart-2': 'var(--chart-series-2)', 'chart-3': 'var(--chart-series-3)',
    'chart-4': 'var(--chart-series-4)', 'chart-5': 'var(--chart-series-5)',
    'sidebar': 'var(--paper-warm)', 'sidebar-foreground': 'var(--ink)',
    'sidebar-primary': 'var(--ink)', 'sidebar-primary-foreground': 'var(--paper)',
    'sidebar-accent': 'var(--paper-deep)', 'sidebar-accent-foreground': 'var(--ink)',
    'sidebar-border': 'var(--line-faint)', 'sidebar-ring': 'var(--accent-pigment-text)',
  },
  // Roles the contract has no word for: the accent mechanism and status. Each gets a text
  // class (`text-success`) — without one, six of them had no reader anywhere and
  // an agent had no way to write a success or warning colour. The exception is a
  // key that already starts with `text-`, which would make `text-text-…`.
  status: {
    'text-accent-color': 'var(--accent-pigment-text)', // follows the chosen accent (default moss-deep)
    'link': 'var(--accent-pigment-text)', // links follow the accent (was fixed indigo pre-accent)
    'success': 'var(--moss-deep)',
    // gold-text, not gold-deep: gold-deep is 3.33:1 on Dawn paper and 3.91:1 on
    // Classic Light — under AA for text. gold-text IS gold-deep on every dark
    // theme, so this is a light-theme-only correction.
    'warning': 'var(--gold-text)',
    // indigo-deep, not the base cut: base is 4.26:1 on a Dawn card and 3.94:1
    // on a well. Every other status token already points at a deep cut.
    'info': 'var(--indigo-deep)',
    // Run-status semantics (agent surfaces): working = live activity (teal's
    // AA text cut); queued = waiting its turn — muted ink, recedes, never signals.
    'working': 'var(--teal-deep)',
    'queued': 'var(--ink-muted)',
  },
  // The opacities the system uses on purpose: a role or a pigment at a fixed alpha.
  // Code writes the Tailwind modifier (`bg-destructive/10`); the docs name each as
  // `tint/destructive/10`. `of` is a contract role or a pigment's CSS name.
  // What each is for: src/usage/roles.mjs (TINT_INTENTS).
  tints: [
    { of: 'destructive', pct: 10 },
    { of: 'moss', pct: 20 }, { of: 'gold', pct: 25 }, { of: 'terracotta', pct: 16 }, { of: 'indigo', pct: 30 },
    { of: 'foreground', pct: 10 }, { of: 'input', pct: 30 },
    { of: 'chart-1', pct: 20 }, { of: 'chart-2', pct: 20 },
    { of: 'muted', pct: 50 }, { of: 'primary', pct: 10 },
    { of: 'sidebar-border', pct: 8 }, { of: 'sidebar-foreground', pct: 70 },
    // The state rings every control shares: focus is `ring-ring/50`, invalid is
    // `ring-destructive/20`; a disabled field washes with `bg-input/50`.
    { of: 'ring', pct: 50 }, { of: 'destructive', pct: 20 }, { of: 'input', pct: 50 },
    // Button states: the default button hovers to `bg-primary/80`; the secondary one to
    // `color-mix(secondary, foreground 5%)`, which two stacked fills render exactly; the
    // destructive one focuses with `border-destructive/40`.
    { of: 'primary', pct: 80 }, { of: 'foreground', pct: 5 }, { of: 'destructive', pct: 40 },
    // A secondary badge rendered as a link hovers to `bg-secondary/80`.
    { of: 'secondary', pct: 80 },
  ],
  // Retired 0.10.0, removed from the CSS 0.13.0. A second vocabulary for what the
  // contract already says (`--surface-card` is `--card`), which no shipped component
  // and no utility ever used while DESIGN.md told agents to reach for it. No longer
  // emitted anywhere: the list stays so `@quill/check` can name each one with the
  // value it had (retired-tokens.test.mjs).
  retired: {
    'surface-page': 'var(--paper)', 'surface-card': 'var(--paper-warm)', 'surface-well': 'var(--paper-deep)',
    'text-strong': 'var(--ink)', 'text-body': 'var(--ink-soft)', 'text-muted-color': 'var(--ink-muted)',
    'text-on-ink': 'var(--paper)',
    'border-card': 'var(--line-soft)', 'border-field': 'var(--line-control)', 'border-divider': 'var(--line-faint)',
    // The same colour as `destructive`, which has the class and every shipped use.
    'danger': 'var(--terracotta-deep)',
  },
}
