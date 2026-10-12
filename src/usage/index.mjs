/**
 * Static index of every usage module. Kept by hand so node scripts and tests
 * stay synchronous; scripts/usage-schema.test.mjs fails if a *.usage.mjs file
 * on disk is missing here, so the two cannot drift.
 */
import { usage as accordion } from './accordion.usage.mjs'
import { usage as activityFeed } from './activity-feed.usage.mjs'
import { usage as agentSteps } from './agent-steps.usage.mjs'
import { usage as aiBadge } from './ai-badge.usage.mjs'
import { usage as aiButton } from './ai-button.usage.mjs'
import { usage as aiFeedback } from './ai-feedback.usage.mjs'
import { usage as aiMark } from './ai-mark.usage.mjs'
import { usage as aiMessage } from './ai-message.usage.mjs'
import { usage as aiNotice } from './ai-notice.usage.mjs'
import { usage as aiPopover } from './ai-popover.usage.mjs'
import { usage as aiThinking } from './ai-thinking.usage.mjs'
import { usage as suggestedPrompts } from './suggested-prompts.usage.mjs'
import { usage as modelPicker } from './model-picker.usage.mjs'
import { usage as alert } from './alert.usage.mjs'
import { usage as alertDialog } from './alert-dialog.usage.mjs'
import { usage as alerts } from './alerts.usage.mjs'
import { usage as analyticsCharts } from './analytics-charts.usage.mjs'
import { usage as announcementBanner } from './announcement-banner.usage.mjs'
import { usage as approvalCard } from './approval-card.usage.mjs'
import { usage as aspectRatio } from './aspect-ratio.usage.mjs'
import { usage as avatar } from './avatar.usage.mjs'
import { usage as badge } from './badge.usage.mjs'
import { usage as badgeOnCard } from './badge-on-card.usage.mjs'
import { usage as breadcrumb } from './breadcrumb.usage.mjs'
import { usage as button } from './button.usage.mjs'
import { usage as buttonGroup } from './button-group.usage.mjs'
import { usage as calendar } from './calendar.usage.mjs'
import { usage as calendarPage } from './calendar-page.usage.mjs'
import { usage as calendarRange } from './calendar-range.usage.mjs'
import { usage as card } from './card.usage.mjs'
import { usage as carousel } from './carousel.usage.mjs'
import { usage as chart } from './chart.usage.mjs'
import { usage as chat } from './chat.usage.mjs'
import { usage as aiHome } from './ai-home.usage.mjs'
import { usage as aiChat } from './ai-chat.usage.mjs'
import { usage as aiSidePanel } from './ai-side-panel.usage.mjs'
import { usage as conversationHistory } from './conversation-history.usage.mjs'
import { usage as checkbox } from './checkbox.usage.mjs'
import { usage as checkout } from './checkout.usage.mjs'
import { usage as citations } from './citations.usage.mjs'
import { usage as collapsible } from './collapsible.usage.mjs'
import { usage as combobox } from './combobox.usage.mjs'
import { usage as command } from './command.usage.mjs'
import { usage as commandPalette } from './command-palette.usage.mjs'
import { usage as contactForm } from './contact-form.usage.mjs'
import { usage as contextMenu } from './context-menu.usage.mjs'
import { usage as cookieConsent } from './cookie-consent.usage.mjs'
import { usage as dashboard } from './dashboard.usage.mjs'
import { usage as dataTable } from './data-table.usage.mjs'
import { usage as dialog } from './dialog.usage.mjs'
import { usage as drawer } from './drawer.usage.mjs'
import { usage as dropdownMenu } from './dropdown-menu.usage.mjs'
import { usage as empty } from './empty.usage.mjs'
import { usage as emptyState } from './empty-state.usage.mjs'
import { usage as error404 } from './error-404.usage.mjs'
import { usage as exampleAppPage } from './example-app-page.usage.mjs'
import { usage as exampleAuthPage } from './example-auth-page.usage.mjs'
import { usage as exampleMarketingPage } from './example-marketing-page.usage.mjs'
import { usage as faq } from './faq.usage.mjs'
import { usage as featureSection } from './feature-section.usage.mjs'
import { usage as field } from './field.usage.mjs'
import { usage as fileUpload } from './file-upload.usage.mjs'
import { usage as footer } from './footer.usage.mjs'
import { usage as forgotPassword } from './forgot-password.usage.mjs'
import { usage as hero } from './hero.usage.mjs'
import { usage as hoverCard } from './hover-card.usage.mjs'
import { usage as icon } from './icon.usage.mjs'
import { usage as input } from './input.usage.mjs'
import { usage as inputGroup } from './input-group.usage.mjs'
import { usage as inputOtp } from './input-otp.usage.mjs'
import { usage as invoice } from './invoice.usage.mjs'
import { usage as item } from './item.usage.mjs'
import { usage as kanban } from './kanban.usage.mjs'
import { usage as kbd } from './kbd.usage.mjs'
import { usage as label } from './label.usage.mjs'
import { usage as listDetail } from './list-detail.usage.mjs'
import { usage as login } from './login.usage.mjs'
import { usage as loginMinimal } from './login-minimal.usage.mjs'
import { usage as loginOauth } from './login-oauth.usage.mjs'
import { usage as loginSplitPanel } from './login-split-panel.usage.mjs'
import { usage as mailShell } from './mail-shell.usage.mjs'
import { usage as menubar } from './menubar.usage.mjs'
import { usage as nativeSelect } from './native-select.usage.mjs'
import { usage as navbar } from './navbar.usage.mjs'
import { usage as navigationMenu } from './navigation-menu.usage.mjs'
import { usage as newsletter } from './newsletter.usage.mjs'
import { usage as notifications } from './notifications.usage.mjs'
import { usage as onboarding } from './onboarding.usage.mjs'
import { usage as orderSummary } from './order-summary.usage.mjs'
import { usage as otpVerification } from './otp-verification.usage.mjs'
import { usage as pageHeader } from './page-header.usage.mjs'
import { usage as pagination } from './pagination.usage.mjs'
import { usage as popover } from './popover.usage.mjs'
import { usage as pricing } from './pricing.usage.mjs'
import { usage as profileCard } from './profile-card.usage.mjs'
import { usage as progress } from './progress.usage.mjs'
import { usage as promptComposer } from './prompt-composer.usage.mjs'
import { usage as questionCard } from './question-card.usage.mjs'
import { usage as radioGroup } from './radio-group.usage.mjs'
import { usage as resizable } from './resizable.usage.mjs'
import { usage as scrollArea } from './scroll-area.usage.mjs'
import { usage as searchResults } from './search-results.usage.mjs'
import { usage as select } from './select.usage.mjs'
import { usage as separator } from './separator.usage.mjs'
import { usage as settings } from './settings.usage.mjs'
import { usage as sheet } from './sheet.usage.mjs'
import { usage as sidebar } from './sidebar.usage.mjs'
import { usage as sidebarNav } from './sidebar-nav.usage.mjs'
import { usage as signup } from './signup.usage.mjs'
import { usage as signupSocial } from './signup-social.usage.mjs'
import { usage as skeleton } from './skeleton.usage.mjs'
import { usage as slider } from './slider.usage.mjs'
import { usage as sonner } from './sonner.usage.mjs'
import { usage as spinner } from './spinner.usage.mjs'
import { usage as statCards } from './stat-cards.usage.mjs'
import { usage as statsBand } from './stats-band.usage.mjs'
import { usage as switchUsage } from './switch.usage.mjs'
import { usage as table } from './table.usage.mjs'
import { usage as tabs } from './tabs.usage.mjs'
import { usage as tabsPage } from './tabs-page.usage.mjs'
import { usage as teamSection } from './team-section.usage.mjs'
import { usage as testimonial } from './testimonial.usage.mjs'
import { usage as textarea } from './textarea.usage.mjs'
import { usage as themeSelector } from './theme-selector.usage.mjs'
import { usage as toggle } from './toggle.usage.mjs'
import { usage as toggleGroup } from './toggle-group.usage.mjs'
import { usage as toneBadge } from './tone-badge.usage.mjs'
import { usage as tooltip } from './tooltip.usage.mjs'
import { usage as usageMeter } from './usage-meter.usage.mjs'
import { usage as wizard } from './wizard.usage.mjs'

export const ALL_USAGE = [
  accordion,
  activityFeed,
  agentSteps,
  aiBadge,
  aiButton,
  aiFeedback,
  aiMark,
  aiMessage,
  aiNotice,
  aiPopover,
  aiThinking,
  suggestedPrompts,
  modelPicker,
  alert,
  alertDialog,
  alerts,
  analyticsCharts,
  announcementBanner,
  approvalCard,
  aspectRatio,
  avatar,
  badge,
  badgeOnCard,
  breadcrumb,
  button,
  buttonGroup,
  calendar,
  calendarPage,
  calendarRange,
  card,
  carousel,
  chart,
  chat,
  aiHome,
  aiChat,
  aiSidePanel,
  conversationHistory,
  checkbox,
  checkout,
  citations,
  collapsible,
  combobox,
  command,
  commandPalette,
  contactForm,
  contextMenu,
  cookieConsent,
  dashboard,
  dataTable,
  dialog,
  drawer,
  dropdownMenu,
  empty,
  emptyState,
  error404,
  exampleAppPage,
  exampleAuthPage,
  exampleMarketingPage,
  faq,
  featureSection,
  field,
  fileUpload,
  footer,
  forgotPassword,
  hero,
  hoverCard,
  icon,
  input,
  inputGroup,
  inputOtp,
  invoice,
  item,
  kanban,
  kbd,
  label,
  listDetail,
  login,
  loginMinimal,
  loginOauth,
  loginSplitPanel,
  mailShell,
  menubar,
  nativeSelect,
  navbar,
  navigationMenu,
  newsletter,
  notifications,
  onboarding,
  orderSummary,
  otpVerification,
  pageHeader,
  pagination,
  popover,
  pricing,
  profileCard,
  progress,
  promptComposer,
  questionCard,
  radioGroup,
  resizable,
  scrollArea,
  searchResults,
  select,
  separator,
  settings,
  sheet,
  sidebar,
  sidebarNav,
  signup,
  signupSocial,
  skeleton,
  slider,
  sonner,
  spinner,
  statCards,
  statsBand,
  switchUsage,
  table,
  tabs,
  tabsPage,
  teamSection,
  testimonial,
  textarea,
  themeSelector,
  toggle,
  toggleGroup,
  toneBadge,
  tooltip,
  usageMeter,
  wizard,
]
