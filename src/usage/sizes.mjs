// What each size step is for, single-sourced: rendered into DESIGN.md, the agent rules and
// llms.txt (foundations), and read by quill-check's fix text. The values live in the token
// source (`tokens.size`); scripts/build-tokens.test.mjs fails when a step has no job here.
export const SIZE_JOBS = {
  width: {
    chip: 'the longest a source chip gets before its text truncates',
    menu: 'dropdown menus',
    'chip-lg': 'the longest an attachment chip gets',
    rail: 'side rails: an app’s left nav, a board column',
    panel: 'popovers, pickers and list columns',
    'card-sm': 'narrow cards and forms: a minimal sign-in, a short blurb, a search field',
    card: 'the standard card: sign-in, sign-up, notifications, an order summary',
    'card-lg': 'roomier cards: forms with more fields, a command palette, an activity feed',
    'card-xl': 'wide cards and the text under a headline: settings, FAQ, a cookie banner, a hero’s lead',
    measure: 'a readable column: a big headline, the AI home',
    thread: 'a chat thread',
    page: 'a content page inside the app',
    'page-wide': 'the marketing page',
  },
  height: {
    touch: 'the smallest a control gets: the WCAG 2.5.5 touch target',
    bar: 'a top navigation bar',
    'area-sm': 'a short content area',
    area: 'a chart, or the most a text field grows before it scrolls',
    'frame-sm': 'a whole-screen block shown on its own, compact (chat, 404)',
    frame: 'a whole-screen block shown on its own (mail, nav, list-detail, dashboard)',
    'frame-lg': 'a whole-screen block shown on its own, tall (AI chat)',
  },
  // Mantis's icon scale, so the names are sizes, not jobs: an icon's size follows the text beside it.
  icon: {
    'icon-3xs': 'the smallest mark; unused in Quill, kept so the scale matches Mantis',
    'icon-2xs': 'a mark inside a chip: a citation source’s kind',
    'icon-xs': 'status marks in tight rows (step ✓ and ✕, activity), beside 12px text',
    'icon-sm': 'beside small text: disclosure chevrons, an info mark',
    'icon-md': 'beside body text: a check in a list, an inline error, a spinner',
    'icon-lg': 'the lead icon of a row: a notification, a file, a search result',
    'icon-xl': 'an icon in a small tile',
    'icon-2xl': 'the icon that leads a feature tile or an empty state',
    'icon-3xl': 'the icon that leads an upload area',
  },
}
