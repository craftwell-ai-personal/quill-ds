// Theme + accent metadata. The single list of what themes exist.
//
// This lives here, not in scripts/build-tokens.mjs, because both sides need it:
// the build (node) generates CSS from it, and the browser
// (Storybook's preview config, and any app UI that offers a theme picker) needs
// the same list to render a switcher. build-tokens.mjs imports node:fs, so it
// can never be pulled into a browser bundle — which is how five separate
// hand-typed copies of this list came to exist, and how the Intelligent theme
// stayed invisible in Storybook and both theme pickers for sixteen days.
//
// Nothing here may import anything with a node dependency. Keep it pure data.

// `label` is the short human name, used verbatim in UI (Storybook's toolbar, the
// theme-selector block). Prose that needs a qualifier — "(default)" — composes it
// from `colorScheme` / DEFAULT_MODE rather than baking it into the name.
export const MODES = [
  { key: 'dark', prefix: 'dk', attr: 'dark', colorScheme: 'dark', label: 'Dusk' },
  { key: 'classicLight', prefix: 'cl', attr: 'classic-light', colorScheme: 'light', label: 'Classic Light' },
  { key: 'classicDark', prefix: 'cd', attr: 'classic-dark', colorScheme: 'dark', label: 'Classic Dark' },
  { key: 'intelligent', prefix: 'int', attr: 'intelligent', colorScheme: 'dark', label: 'Intelligent' },
]

// Dawn is the default: it lives directly in :root rather than behind a
// [data-theme] block, so it is not in MODES. Named here so callers listing or
// counting themes have one place to read, and none has to remember the +1.
export const DEFAULT_MODE = {
  key: 'light',
  attr: 'light',
  colorScheme: 'light',
  label: 'Dawn',
}

export const ALL_MODES = [DEFAULT_MODE, ...MODES]

// The accent that ships unset: `--accent-pigment` at :root resolves to this
// pigment. Single source of truth so downstream docs,
// drift checks and preview defaults read it rather than restating it.
export const DEFAULT_ACCENT = 'moss'
