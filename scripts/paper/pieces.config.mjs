/**
 * Per-piece exceptions to the rules in ./pieces.mjs. Keep it small: a piece with no entry
 * follows the rule (canonical story + every story without a play function, at most 8).
 *
 *   include   story ids to show although the rule would not (a state reached by a play function)
 *   exclude   story ids to leave out although the rule would show them
 *   max       a different cap on stories for this page
 *   open      for a piece that is closed until used (a dialog, a menu): how to open it when no
 *             story renders it open. `{ click | hover | focus | context: '<CSS selector>' }`, or
 *             `{ key: 'k', modifiers: ['Meta'] }`; the selector is looked up inside the story. Add
 *             `stories: [ids]` when only some of the piece's stories need opening.
 *   staged    true when the stories stand the piece in a tall empty box (room for a menu that opens above):
 *             the box is skipped and the piece itself is drawn
 *   declined  a reason: the piece gets no page. Only for pieces with nothing to draw.
 *   summary   the header line, for a piece with no usage module
 */
export const MAX_STORIES = 8

/** Names that title case gets wrong. */
export const NAMES = {}

const trigger = (slug) => ({ click: `[data-slot="${slug}-trigger"]` })

export const CONFIG = {
  // ---- closed until used: no story renders these open, so the sync opens them before it reads them
  'alert-dialog': { open: trigger('alert-dialog') },
  combobox: { open: { click: '[data-slot="input-group-control"]' } },
  command: { open: { click: '[data-slot="button"]', stories: ['components-command--as-dialog'] } },
  'context-menu': { open: { context: '[data-slot="context-menu-trigger"]' } },
  dialog: { open: trigger('dialog') },
  drawer: { open: trigger('drawer') },
  'dropdown-menu': { open: trigger('dropdown-menu') },
  'hover-card': { open: { hover: '[data-slot="hover-card-trigger"]' } },
  menubar: { open: trigger('menubar') },
  'navigation-menu': { open: trigger('navigation-menu') },
  popover: { open: trigger('popover') },
  select: { open: trigger('select') },
  sheet: { open: trigger('sheet') },
  sonner: { open: { click: '[data-slot="button"]' } },
  tooltip: { open: { hover: '[data-slot="tooltip-trigger"]' } },

  // ---- Quill's own AI components and blocks. Nearly every story of these has a play function (it asserts
  // something), so the rule alone would show one story each. These are the ones whose END state is a distinct
  // look a designer would want; stories that assert behaviour and look like another story are left out.
  'agent-steps': { include: ['components-agentsteps--failed', 'components-agentsteps--failed-without-retry', 'components-agentsteps--finished-list-stays-quiet'] },
  'ai-button': { include: ['components-aibutton--sizes'] },
  'ai-feedback': { include: ['components-aifeedback--already-sent', 'components-aifeedback--no-reasons', 'components-aifeedback--under-the-answer'] },
  'ai-mark': { include: ['components-aimark--sizes'] },
  'ai-message': { include: ['components-aimessage--streaming', 'components-aimessage--streaming-no-answer-yet', 'components-aimessage--stopped', 'components-aimessage--stopped-no-answer', 'components-aimessage--hidden-name'] },
  'ai-notice': { include: ['components-ainotice--with-link'] },
  'ai-popover': { include: ['components-aipopover--empty-suggestion', 'components-aipopover--opens-from-a-button'] },
  'ai-thinking': { include: ['components-aithinking--done', 'components-aithinking--done-without-steps'] },
  citations: { include: ['components-citations--sources-list', 'components-citations--one-source', 'components-citations--long-title-no-label'] },
  'model-picker': { include: ['components-modelpicker--without-auto'] },
  'prompt-composer': { max: 10, staged: true, include: ['components-promptcomposer--working', 'components-promptcomposer--disabled', 'components-promptcomposer--error-state', 'components-promptcomposer--with-mic', 'components-promptcomposer--with-attachments', 'components-promptcomposer--with-modes', 'components-promptcomposer--slash-commands', 'components-promptcomposer--notebook'] },
  'question-card': { include: ['components-questioncard--free-text-row', 'components-questioncard--no-skip-callback-hides-the-button', 'components-questioncard--no-options', 'components-questioncard--outcome-is-announced', 'components-questioncard--recommended-is-the-stock-tag'] },
  'suggested-prompts': { include: ['components-suggestedprompts--cards', 'components-suggestedprompts--list'] },
  'ai-chat': { include: ['patterns-ai-ai-chat--app-conversation', 'patterns-ai-ai-chat--own-sidebar', 'patterns-ai-ai-chat--no-sidebar', 'patterns-ai-ai-chat--agent-pieces-in-one-thread'] },
  'ai-side-panel': { include: ['patterns-ai-ai-side-panel--no-scope', 'patterns-ai-ai-side-panel--empty-app-thread'] },
  // not `history-in-the-panel`: its play ends on a different chat in a built Storybook than in the dev server,
  // so it is not one stable picture (found when the daily job's static build disagreed with a local sync)
  // ai-home's Agent tab is reached by a play; Phone is left out, the same page at phone width needs a phone-sized window
  'ai-home': { include: ['patterns-ai-ai-home--agent-tab'] },

  // ---- the five pieces of the first spike keep their hand-picked stories where the rule differs
  // every other story of these four asserts something with a play function; these are the states worth drawing
  'approval-card': { include: ['components-approvalcard--destructive', 'components-approvalcard--not-editable'] },
  'usage-meter': { include: ['components-usagemeter--bar', 'components-usagemeter--running-low-card', 'components-usagemeter--compact', 'components-usagemeter--compact-low'] },
  'conversation-history': { include: ['patterns-ai-conversation-history--groups-by-date', 'patterns-ai-conversation-history--empty'] },
  // All Variants and All Sizes already show each single-variant story side by side
  button: { exclude: ['components-button--outline', 'components-button--secondary', 'components-button--ghost', 'components-button--destructive', 'components-button--link'] },
  'tone-badge': { exclude: ['components-tonebadge--caution', 'components-tonebadge--attention', 'components-tonebadge--informational', 'components-tonebadge--muted'] },
}
