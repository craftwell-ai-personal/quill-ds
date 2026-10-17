import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Icon, type IconName } from '@/components/ui/icon'

const actions: { icon: IconName; label: string; shortcut?: string }[] = [
  { icon: 'add', label: 'New project', shortcut: '⌘N' },
  { icon: 'search', label: 'Search docs' },
  { icon: 'settings', label: 'Open settings', shortcut: '⌘,' },
]
const recent: { icon: IconName; label: string }[] = [
  { icon: 'description', label: 'Design tokens guide' },
  { icon: 'folder_open', label: 'Acme site' },
]

/** A searchable ⌘K command palette with grouped actions, recent items, and keyboard shortcuts. */
export function CommandPalette() {
  return (
    <Command className="w-card-lg rounded-xl shadow-md ring-1 ring-foreground/10">
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandGroup heading="Actions">
          {actions.map((a) => (
            <CommandItem key={a.label}>
              <Icon name={a.icon} size={16} />
              <span>{a.label}</span>
              {a.shortcut && <CommandShortcut>{a.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Recent">
          {recent.map((r) => (
            <CommandItem key={r.label}>
              <Icon name={r.icon} size={16} />
              <span>{r.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
