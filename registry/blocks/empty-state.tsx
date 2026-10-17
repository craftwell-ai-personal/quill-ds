import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'

/** A dashed-border empty state with an icon, explanatory text, and a primary action. */
export function EmptyState() {
  return (
    <div className="flex w-card-lg flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon name="folder_open" size={24} />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-medium text-foreground">No projects yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first project and it’ll show up here.
        </p>
      </div>
      <Button>
        <Icon name="add" size={16} /> New project
      </Button>
    </div>
  )
}
