import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

const files = [
  { name: 'brand-lockups.zip', size: '4.2 MB', progress: 100, state: 'done' },
  { name: 'declaration.webp', size: '189 KB', progress: 100, state: 'done' },
  { name: 'field-notes-issue-001.pdf', size: '2.8 MB', progress: 64, state: 'uploading' },
] as const

/** An asset-upload card with a drag-and-drop dropzone and a progress-tracked upload queue. */
export function FileUpload() {
  return (
    <Card className="w-card-lg">
      <CardHeader>
        <CardTitle>Upload assets</CardTitle>
        <CardDescription>SVG, PNG, PDF or ZIP — up to 25 MB each.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <button
          type="button"
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-input bg-transparent px-6 py-10 text-center transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Icon name="cloud_upload" size={28} className="text-muted-foreground" aria-hidden />
          <span className="text-sm font-medium text-foreground">
            Drag files here or click to browse
          </span>
          <span className="text-xs text-muted-foreground">Your files stay private.</span>
        </button>
        <Separator />
        <ul className="flex flex-col gap-3" aria-label="Upload queue">
          {files.map((f) => (
            <li key={f.name} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon name={f.state === 'done' ? 'check' : 'draft'} size={18} aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{f.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{f.size}</span>
                </div>
                {f.state === 'uploading' && (
                  <Progress value={f.progress} aria-label={`Uploading ${f.name}`} />
                )}
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${f.name}`}>
                <Icon name="close" size={16} />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button>Done</Button>
      </CardFooter>
    </Card>
  )
}
