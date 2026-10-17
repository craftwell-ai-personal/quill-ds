'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Icon } from '@/components/ui/icon'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Sidebar, SidebarContent, SidebarProvider, SidebarRail, SidebarTrigger } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export type Conversation = {
  id: string
  title: string
  /** When the chat was last used. Anything `new Date()` reads. */
  updatedAt: string | number | Date
  pinned?: boolean
  /** Makes the row a link (so it can open in a new tab). Without it the row is a button. */
  href?: string
}

export type ConversationGroup = { key: string; label: string; chats: Conversation[] }

const DAY = 86_400_000
const isDate = (date: Date) => !Number.isNaN(date.getTime())

// Reads the calendar day a moment falls on in one time zone. An unknown zone name is not an error: the runtime's
// own zone is used, as it is when no zone is given.
const zoneReader = (timeZone?: string) => {
  if (!timeZone) return undefined
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return undefined
  }
}
// The calendar day as a whole number of days, and the month as a whole number of months, so two moments compare by
// the date on the calendar and not by the hours between them (a day is not always 24 hours long).
const calendar = (date: Date, zone?: Intl.DateTimeFormat) => {
  let year = date.getFullYear()
  let month = date.getMonth()
  let day = date.getDate()
  if (zone) {
    const parts = zone.formatToParts(date)
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value)
    year = read('year')
    month = read('month') - 1
    day = read('day')
  }
  return { day: Date.UTC(year, month, day) / DAY, month: year * 12 + month }
}

// Sample content, dated from "now" so the groups always read Pinned, Today, Yesterday, Previous 7 days.
const sampleChats = (now: Date): Conversation[] => {
  // By calendar day at noon, not in 24-hour steps, so a daylight-saving change cannot turn yesterday into today.
  const ago = (days: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, 12)
  return [
    { id: 'weekly', title: 'Weekly growth review prompt', updatedAt: ago(12), pinned: true },
    { id: 'q3', title: 'Q3 signups vs target', updatedAt: ago(0) },
    { id: 'launch', title: 'Launch brief draft', updatedAt: ago(0) },
    { id: 'pricing', title: 'Pricing page copy ideas', updatedAt: ago(1) },
    { id: 'offsite', title: 'Plan my week around the offsite', updatedAt: ago(4) },
  ]
}

// Naming the icons through the `icon:` key is what puts them in the core icon set apps receive.
const MENU_ICON = {
  rename: { icon: 'edit' },
  pin: { icon: 'keep' },
  remove: { icon: 'delete' },
  undo: { icon: 'undo' },
} as const

// The "more" button is 24px in a 32px row (border included), so it sits 4px inside the row's outer edge.
// 4 + 2 puts the menu 2px below the row (Ryan's note on the sketch, 2026-10-04).
const MENU_GAP = 6
// Sideways the button sits 5px in (mr-1 plus the row's 1px border): the menu hangs from the button's right edge, and a negative alignOffset of this carries it out to the row's outer edge (the border included).
const MENU_INSET = 5

// The row, not the title, draws the title's focus ring, so the ring wraps the ⋯ button as the row's fill does.
// Every row has a 1px border (clear unless the chat is open). With px-2.5 inside it the title starts 11px in;
// py-1 leaves the link shorter than the row's min-h-8, so the row stays 32px and the title stays centred.
const OPEN = 'min-w-0 flex-1 truncate rounded-lg px-2.5 py-1 text-left text-sm text-foreground no-underline outline-hidden aria-[current]:font-medium'
// Hidden until wanted, never out of reach: hover, keyboard focus anywhere in the row, the open chat, an open menu, and any touch screen show it.
// mr-1 plus the row's 1px border keeps the button 5px inside the row's outer edge.
const MORE = 'mr-1 shrink-0 text-ink-soft opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 group-has-[[aria-current]]/row:opacity-100 aria-expanded:opacity-100 pointer-coarse:opacity-100'

/** Pinned first, then Today, Yesterday, Previous 7 days, then one group per month, newest first. With `timeZone`, days and months are that zone's. */
export function groupConversations(conversations: Conversation[], now: Date, locale = 'en-US', timeZone?: string): ConversationGroup[] {
  const zone = zoneReader(timeZone)
  const today = calendar(isDate(now) ? now : new Date(), zone)
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: zone ? timeZone : undefined })
  const groups = new Map<string, { label: string; order: number; rows: { chat: Conversation; time: number }[] }>()
  const put = (key: string, label: string, order: number, chat: Conversation, time: number) => {
    const group = groups.get(key) ?? { label, order, rows: [] }
    group.rows.push({ chat, time })
    groups.set(key, group)
  }
  for (const chat of conversations) {
    const date = new Date(chat.updatedAt)
    const readable = isDate(date)
    const time = readable ? date.getTime() : 0
    if (chat.pinned) { put('pinned', 'Pinned', 0, chat, time); continue }
    // A date that cannot be read is not thrown away; it goes last.
    if (!readable) { put('earlier', 'Earlier', Number.MAX_SAFE_INTEGER, chat, time); continue }
    // Whole calendar days, so 23:59 yesterday is Yesterday and a clock set ahead still reads as Today.
    const then = calendar(date, zone)
    const days = today.day - then.day
    if (days <= 0) put('today', 'Today', 1, chat, time)
    else if (days === 1) put('yesterday', 'Yesterday', 2, chat, time)
    else if (days <= 7) put('week', 'Previous 7 days', 3, chat, time)
    else {
      const monthsAgo = Math.max(0, today.month - then.month)
      put(`month-${monthsAgo}`, monthName.format(date), 4 + monthsAgo, chat, time)
    }
  }
  return [...groups.entries()]
    .sort(([, first], [, second]) => first.order - second.order)
    .map(([key, group]) => ({ key, label: group.label, chats: group.rows.sort((first, second) => second.time - first.time).map((row) => row.chat) }))
}

// Something in the list the cursor can be sent to.
type FocusTarget = { part: 'row' | 'more'; id: string } | { part: 'rename' } | { part: 'undo' }

export type ConversationHistoryProps = {
  /** Your chats. Leave it out and the list shows five sample chats and keeps them itself. */
  conversations?: Conversation[]
  /** The open chat. Pass an id or null to control it; leave it out and the list keeps its own. */
  currentId?: string | null
  /** "Today", for grouping. Defaults to the moment the list first renders (and so does a date that cannot be read). */
  now?: Date
  /** Pass the person's time zone (an IANA name such as "America/Los_Angeles") when the list is rendered on a server, so the server and the browser draw the same groups. Left out, or not a zone, the runtime's own zone is used. */
  timeZone?: string
  onSelect?: (id: string) => void
  /** Shows New chat. (The sample list shows it either way.) */
  onNew?: () => void
  /** With your own conversations, each of these three also decides whether its menu item is drawn. */
  onRename?: (id: string, title: string) => void
  onPin?: (id: string, pinned: boolean) => void
  /** Called at most once for each confirmed delete, not when Delete is confirmed: when the Undo time has passed (it starts once the pointer and keyboard focus have left the Undo line), or sooner if another delete is confirmed, the list is removed from the page, or the page is hidden or closed (switching to another tab or app counts as hidden). Send your request with `keepalive` or `navigator.sendBeacon`, or the browser can drop one made as the page closes. The list keeps showing the chat until you remove it from `conversations`. */
  onDelete?: (id: string) => void
  /** How long Undo stays after a delete. The countdown waits while the pointer or keyboard focus is on that line. 0 deletes as soon as nothing holds the line. A negative number, NaN or Infinity is treated as the default, 6. */
  undoSeconds?: number
  /** Names the list for screen readers. */
  label?: string
  /** How month names are written. Fixed by default so the server and the browser agree. */
  locale?: string
  className?: string
}

/** Past AI chats grouped by when they happened — pinned first, then today, yesterday, the last week and earlier months — with the open chat filled and a menu on each row to rename, pin or delete it. */
export function ConversationHistory({
  conversations, currentId, now, timeZone, onSelect, onNew, onRename, onPin, onDelete,
  undoSeconds = 6, label = 'Past chats', locale = 'en-US', className,
}: ConversationHistoryProps) {
  const baseId = React.useId()
  const [mountedAt] = React.useState(() => new Date())
  const today = now && isDate(now) ? now : mountedAt
  const controlled = conversations !== undefined
  const [ownChats, setOwnChats] = React.useState<Conversation[]>(() => sampleChats(today))
  const chats = conversations ?? ownChats
  const [ownCurrent, setOwnCurrent] = React.useState<string | null>(controlled ? null : 'q3')
  const current = currentId === undefined ? ownCurrent : currentId
  const [renaming, setRenaming] = React.useState<{ id: string; draft: string } | null>(null)
  // The dialog keeps the chat it asked about while it closes, so its words do not vanish mid-fade.
  const [asking, setAsking] = React.useState<{ id: string; title: string } | null>(null)
  const [askOpen, setAskOpen] = React.useState(false)
  // Confirmed, not yet final: shown as a line with Undo in the row's place.
  const [pending, setPending] = React.useState<{ id: string; title: string } | null>(null)
  // What holds the countdown: the pointer or keyboard focus on the Undo line. Each remembers the group the line
  // was in, because a line the app moves to another group is drawn afresh and the old one sends no "left".
  const [hovering, setHovering] = React.useState<string | null>(null)
  const [focused, setFocused] = React.useState<string | null>(null)
  const [said, setSaid] = React.useState('')
  const navRef = React.useRef<HTMLElement>(null)
  const renameSettled = React.useRef(true)
  // Where the cursor should land after the update a handler just asked for.
  const [focusRequest, setFocusRequest] = React.useState<{ target: FocusTarget } | null>(null)
  // What a closing menu or dialog does with focus: unset, it hands focus back to what opened it (the stock
  // behaviour); a target sends it there instead; null leaves focus where it is.
  const handoff = React.useRef<{ target: FocusTarget | null } | undefined>(undefined)
  // Something about to be drawn somewhere else that should keep the cursor: the row of a chat being pinned (the
  // app may apply the pin later), or the Undo line if the app moves its chat to another group.
  const following = React.useRef<FocusTarget | null>(null)
  // The confirmed delete the app has not been told about yet. Read and cleared by everything that can settle it
  // (the countdown, a second delete, the list going away, the tab being hidden or closing), so each sees at once what another did.
  const owed = React.useRef<string | null>(null)

  // With the app's own list, an action it did not wire is not offered. The sample offers all three.
  const canRename = !controlled || Boolean(onRename)
  const canPin = !controlled || Boolean(onPin)
  const canDelete = !controlled || Boolean(onDelete)
  const hasMenu = canRename || canPin || canDelete
  const showNew = !controlled || Boolean(onNew)

  // Rows are found by comparing ids, not by building a selector from one: an id can hold any character.
  const locate = React.useCallback((target: FocusTarget): HTMLElement | null => {
    const nav = navRef.current
    if (!nav) return null
    if (target.part === 'rename') return nav.querySelector<HTMLElement>('[data-slot="chat-rename"]')
    if (target.part === 'undo') return nav.querySelector<HTMLElement>('[data-slot="chat-undo"] button')
    const row = [...nav.querySelectorAll<HTMLElement>('[data-chat-id]')].find((each) => each.dataset.chatId === target.id)
    return row?.querySelector<HTMLElement>(target.part === 'row' ? '[data-slot="chat-open"]' : '[data-slot="dropdown-menu-trigger"]') ?? null
  }, [])

  // Menus and the dialog hand focus back to what opened them as they close. When the cursor belongs somewhere else
  // (the rename field, a row that moved, Undo) two things carry it there, and neither is a timer: the closing menu
  // or dialog is told where to put focus (Base UI's finalFocus), and an effect moves it once the row, field or
  // button named is on the page. Whichever runs last, focus ends in the same place.
  const focusIn = (target: FocusTarget) => {
    handoff.current = { target }
    setFocusRequest({ target })
  }
  React.useEffect(() => {
    if (focusRequest) locate(focusRequest.target)?.focus()
  }, [focusRequest, locate])
  const finalFocus = () => {
    const next = handoff.current
    if (next === undefined) return true
    const found = next.target ? locate(next.target) : null
    // Cancel returns to the row's "more" button. If it cannot be found, leave it to the dialog's own return of focus.
    if (!found && next.target?.part === 'more') return true
    return found ?? false
  }

  // A row or line drawn afresh in another group loses the cursor to the page. If that happens to what is being
  // followed, give it back. Only then: focus that is anywhere else was put there by the person, and stays.
  React.useEffect(() => {
    const target = following.current
    if (target === null) return
    const active = document.activeElement
    if (active && active !== document.body) return
    const element = locate(target)
    if (!element) return
    // A pinned row has arrived. The Undo line is followed for as long as it is shown: it may be moved again.
    if (target.part !== 'undo') following.current = null
    element.focus()
  }, [chats, locate])
  // The person moving on (a press, a key, focus landing on something else) ends the following.
  React.useEffect(() => {
    const forget = () => { following.current = null }
    // A modifier pressed on its own is not moving on: it starts a shortcut, or does nothing at all.
    const pressed = (event: KeyboardEvent) => {
      if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Alt' && event.key !== 'Meta') forget()
    }
    const moved = (event: FocusEvent) => {
      const target = following.current
      if (target !== null && event.target !== locate(target)) following.current = null
    }
    document.addEventListener('pointerdown', forget, true)
    document.addEventListener('keydown', pressed, true)
    document.addEventListener('focusin', moved, true)
    return () => {
      document.removeEventListener('pointerdown', forget, true)
      document.removeEventListener('keydown', pressed, true)
      document.removeEventListener('focusin', moved, true)
    }
  }, [locate])

  const commitDelete = (id: string) => {
    if (!controlled) setOwnChats((all) => all.filter((chat) => chat.id !== id))
    if (currentId === undefined) setOwnCurrent((was) => (was === id ? null : was))
    onDelete?.(id)
  }
  // The commit as it stands now: the countdown, the unmount and the closing tab all run long after the render that
  // set them up.
  const latest = React.useRef(commitDelete)
  React.useEffect(() => { latest.current = commitDelete })
  // Every way a confirmed delete becomes final goes through here, so the app hears of each delete exactly once:
  // what is owed is struck off before the app is told, and an id that is not owed is ignored.
  const settle = React.useCallback((id: string) => {
    if (owed.current !== id) return
    owed.current = null
    latest.current(id)
  }, [])

  // Once the app has been told, Undo could not bring the chat back, so the line and its announcement go wherever
  // a delete is settled. The chat is then an ordinary row again until the app takes it out of its list.
  const clearPending = React.useCallback(() => {
    if (following.current?.part === 'undo') following.current = null
    setPending(null)
    setHovering(null)
    setFocused(null)
    setSaid('')
  }, [])

  // Confirmed and not undone: the list going away must not quietly cancel the delete. (Hidden by <Activity>, the
  // list keeps its state and comes back, so what it was showing is cleared too.)
  React.useEffect(() => () => {
    if (owed.current === null) return
    settle(owed.current)
    clearPending()
  }, [settle, clearPending])

  // Nor must closing the tab, which runs no cleanup at all (and with the cursor on Undo the countdown is waiting).
  // The page may come back from the back-forward cache, with the delete already sent. A phone that kills a tab in
  // the background may never report `pagehide`, so the page being hidden counts as leaving too: it is the last
  // moment a browser promises to report.
  React.useEffect(() => {
    if (!pending) return
    const leaving = () => {
      settle(pending.id)
      clearPending()
    }
    const hidden = () => { if (document.visibilityState === 'hidden') leaving() }
    window.addEventListener('pagehide', leaving)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pagehide', leaving)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [pending, settle, clearPending])

  // The Undo line stands in for a row. If the app takes that chat away meanwhile (deleted in another tab), there is
  // no row to stand in for: the delete was confirmed here, so the app is told, once, and the line is cleared.
  const pendingRow = pending !== null && chats.some((chat) => chat.id === pending.id)
  React.useEffect(() => {
    if (!pending || pendingRow) return
    settle(pending.id)
    // Clearing what was shown for a row that no longer exists; nothing here can loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    clearPending()
  }, [pending, pendingRow, settle, clearPending])

  const groups = groupConversations(chats, today, locale, timeZone)

  // The Undo window. It waits while the pointer or keyboard focus is on the line, and starts over when they leave.
  // A hold counts only in the group the line is in now.
  const pendingGroup = pending ? groups.find((group) => group.chats.some((chat) => chat.id === pending.id))?.key : undefined
  const held = pendingGroup !== undefined && (hovering === pendingGroup || focused === pendingGroup)
  // A negative or non-finite number is not a length of time; the default stands in for it.
  const undoFor = Number.isFinite(undoSeconds) && undoSeconds >= 0 ? undoSeconds : 6
  React.useEffect(() => {
    if (!pending || !pendingRow || held) return
    const timer = window.setTimeout(() => {
      settle(pending.id)
      clearPending()
    }, undoFor * 1000)
    return () => window.clearTimeout(timer)
  }, [pending, pendingRow, held, undoFor, settle, clearPending])

  const select = (id: string) => {
    if (currentId === undefined) setOwnCurrent(id)
    onSelect?.(id)
  }
  const startRename = (chat: Conversation) => {
    renameSettled.current = false
    setRenaming({ id: chat.id, draft: chat.title })
    focusIn({ part: 'rename' })
  }
  // Enter and a click elsewhere both end a rename, and removing the field can send one more blur: settle once.
  const finishRename = (save: boolean, refocus: boolean) => {
    if (!renaming || renameSettled.current) return
    renameSettled.current = true
    const { id, draft } = renaming
    const next = draft.trim()
    const before = chats.find((chat) => chat.id === id)?.title
    setRenaming(null)
    if (save && next && before !== undefined && next !== before) {
      if (!controlled) setOwnChats((all) => all.map((chat) => (chat.id === id ? { ...chat, title: next } : chat)))
      onRename?.(id, next)
    }
    // After a key press the field that had focus is gone. After a click elsewhere, focus is where the person put it.
    if (refocus) focusIn({ part: 'row', id })
  }
  const togglePin = (chat: Conversation) => {
    const pinned = !chat.pinned
    if (!controlled) setOwnChats((all) => all.map((each) => (each.id === chat.id ? { ...each, pinned } : each)))
    onPin?.(chat.id, pinned)
    // The row moves to another group and is drawn afresh there; take the cursor along, now or whenever the app
    // applies the pin.
    following.current = { part: 'row', id: chat.id }
    focusIn({ part: 'row', id: chat.id })
  }
  const askDelete = (chat: Conversation) => {
    // The dialog takes the cursor itself; the closing menu must not pull it back to the row.
    handoff.current = { target: null }
    setAsking({ id: chat.id, title: chat.title })
    setAskOpen(true)
  }
  // Cancel and Escape (a confirmed delete closes the dialog itself and sends the cursor to Undo).
  const closeAsk = (open: boolean) => {
    if (!open && asking) handoff.current = { target: { part: 'more', id: asking.id } }
    setAskOpen(open)
  }
  const confirmDelete = () => {
    if (!asking) return
    setAskOpen(false)
    // The app took the chat away while the dialog was asking: there is nothing left to delete or to undo.
    if (!chats.some((chat) => chat.id === asking.id)) return
    // A second delete settles the first at once: one Undo at a time.
    if (pending) settle(pending.id)
    owed.current = asking.id
    setPending(asking)
    setHovering(null)
    setFocused(null)
    setSaid(`Deleted ${asking.title}. Undo is available.`)
    following.current = { part: 'undo' }
    focusIn({ part: 'undo' })
  }
  const undo = () => {
    if (!pending) return
    // Already sent to the app: there is nothing to restore, and saying so would be untrue.
    if (owed.current !== pending.id) { clearPending(); return }
    owed.current = null
    const { id, title } = pending
    clearPending()
    setSaid(`Restored ${title}.`)
    focusIn({ part: 'row', id })
  }

  return (
    <nav ref={navRef} aria-label={label} data-slot="conversation-history" className={cn('grid grid-cols-[minmax(0,1fr)] content-start gap-0.5 text-sm', className)}>
      {/* sr-only makes the region a real box that takes no space; it is here, empty, before anything is said. */}
      <div role="status" className="sr-only">{said}</div>
      {showNew ? (
        <Button type="button" variant="outline" size="sm" className="mb-1.5 justify-start" onClick={() => onNew?.()}><Icon name="add" />New chat</Button>
      ) : null}
      {groups.length === 0 ? <p className="px-2.5 py-2 text-muted-foreground">No chats yet.</p> : null}
      {groups.map((group) => (
        <React.Fragment key={group.key}>
          <p id={`${baseId}-${group.key}`} data-slot="chat-group" className="px-2.5 pt-2.5 pb-1 text-xs font-semibold text-muted-foreground">{group.label}</p>
          <ul aria-labelledby={`${baseId}-${group.key}`} className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
            {group.chats.map((chat) => {
              if (pending?.id === chat.id) {
                return (
                  <li key={chat.id} data-slot="chat-undo" className="flex min-h-8 items-center gap-2 rounded-lg pl-2.5 text-muted-foreground"
                    onPointerEnter={() => setHovering(group.key)} onPointerLeave={() => setHovering(null)}
                    onFocus={() => setFocused(group.key)} onBlur={() => setFocused(null)}>
                    <span className="min-w-0 flex-1 truncate">Deleted “{chat.title}”</span>
                    <Button type="button" variant="ghost" size="xs" className="shrink-0 text-foreground" onClick={undo}><Icon name={MENU_ICON.undo.icon} />Undo</Button>
                  </li>
                )
              }
              if (renaming?.id === chat.id) {
                return (
                  <li key={chat.id} className="flex min-h-8 items-center">
                    <Input data-slot="chat-rename" aria-label={`Rename ${chat.title}`} value={renaming.draft} className="h-8 bg-background"
                      onChange={(event) => setRenaming({ id: chat.id, draft: event.target.value })}
                      onFocus={(event) => event.currentTarget.select()}
                      onBlur={() => finishRename(true, false)}
                      onKeyDown={(event) => {
                        // Enter that only confirms a word in an input method (Japanese, Chinese, Korean) is not "save".
                        // Chrome marks it isComposing; Safari sends it just after, as keyCode 229.
                        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
                        if (event.key !== 'Enter' && event.key !== 'Escape') return
                        event.preventDefault()
                        // These two keys belong to the field. Let out, Escape would also close a sheet or dialog
                        // the list sits in.
                        event.stopPropagation()
                        finishRename(event.key === 'Enter', true)
                        // Let go of the field now, while it is still on the page: removed with focus in it, it would
                        // send its blur from the middle of React's own update.
                        event.currentTarget.blur()
                      }} />
                  </li>
                )
              }
              const isCurrent = chat.id === current
              return (
                <li key={chat.id} data-slot="chat-row" data-chat-id={chat.id}
                  // The open chat gets a hairline as well as the fill: on the dark themes the fill alone is too faint to find.
                  className="group/row flex min-h-8 items-center rounded-lg border border-transparent hover:bg-muted has-[[aria-current]]:border-border has-[[aria-current]]:bg-muted has-[[data-slot=chat-open]:focus-visible]:ring-3 has-[[data-slot=chat-open]:focus-visible]:ring-ring/50">
                  {chat.href ? (
                    <a href={chat.href} data-slot="chat-open" aria-current={isCurrent ? 'page' : undefined} className={OPEN}
                      // A press with Cmd, Ctrl, Shift or Alt opens the chat in a new tab or window: this page's open chat has not changed.
                      onClick={(event) => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) select(chat.id) }}>{chat.title}</a>
                  ) : (
                    <button type="button" data-slot="chat-open" aria-current={isCurrent ? 'true' : undefined} onClick={() => select(chat.id)} className={OPEN}>{chat.title}</button>
                  )}
                  {hasMenu ? (
                    <DropdownMenu onOpenChange={(open) => { if (open) handoff.current = undefined }}>
                      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-xs" aria-label={`More for ${chat.title}`} className={MORE} />}>
                        <Icon name="more_horiz" className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={MENU_GAP} alignOffset={-MENU_INSET} className="w-menu" finalFocus={finalFocus}>
                        {canRename ? <DropdownMenuItem onClick={() => startRename(chat)}><Icon name={MENU_ICON.rename.icon} />Rename</DropdownMenuItem> : null}
                        {canPin ? <DropdownMenuItem onClick={() => togglePin(chat)}><Icon name={MENU_ICON.pin.icon} />{chat.pinned ? 'Unpin' : 'Pin'}</DropdownMenuItem> : null}
                        {canDelete && (canRename || canPin) ? <DropdownMenuSeparator /> : null}
                        {canDelete ? <DropdownMenuItem variant="destructive" onClick={() => askDelete(chat)}><Icon name={MENU_ICON.remove.icon} />Delete</DropdownMenuItem> : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </React.Fragment>
      ))}
      <AlertDialog open={askOpen} onOpenChange={closeAsk}>
        <AlertDialogContent size="sm" finalFocus={finalFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>“{asking?.title}” will be deleted. You can undo this for a few seconds afterwards.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  )
}

/** The same list docked in the stock Sidebar, with the page beside it. */
export function ConversationSidebar({ children, title = 'Chats', className, ...list }: ConversationHistoryProps & { children?: React.ReactNode; title?: string }) {
  return (
    <SidebarProvider>
      <div className={cn('flex h-frame w-full', className)}>
        <Sidebar collapsible="offcanvas">
          <SidebarContent className="p-2">
            <ConversationHistory {...list} />
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <SidebarTrigger />
            <span className="truncate text-sm text-muted-foreground">{title}</span>
          </header>
          <main className="flex flex-1 flex-col gap-6 overflow-auto p-4">
            {children ?? <p className="text-sm text-muted-foreground">Pick a chat to open it here.</p>}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
