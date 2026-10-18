// Fixture for rule 8 in scripts/quill-check.test.mjs: icon sizes. Never shipped.
export function Icons({ days }: { days: number }) {
  const sizes: Array<number> = []
  return (
    <>
      <Icon name="info" />
      <Icon name="info" className="size-icon-lg text-primary" />
      <AiMark size="icon-md" />
      <Icon name="typed" size={18} />
      <Icon name="between" size={15} className="text-primary" />
      <Icon name="spacing" className="size-4" />
      <AiMark size={15} />
      <AiMark className="size-4" />
      <Button size="sm">Save <Icon name="check" size={14} /></Button>
      {days <= 0 ? <span>Today</span> : null}
      <Button>New chat<Icon name="add" /></Button>
      <Icon name="after-button" size={20} />
      <Badge><span><Icon name="nested" size={12} /></span></Badge>
      <Badge><Icon name="child" size={12} /></Badge>
      <CommandItem><AiMark size={18} /></CommandItem>
      <EmptyMedia variant="icon"><Icon name="folder" className="size-icon-2xl" /></EmptyMedia>
      <EmptyMedia><Icon name="folder" className="size-icon-2xl" /></EmptyMedia>
      <Button>
        {/* quill-check: allow icon-size — drawn larger than the Button's icons on purpose */}
        <Icon name="mic" className="size-icon-xl" />
      </Button>
      <div className="p-icon-md w-icon-md h-icon-sm">{sizes.length}</div>
    </>
  )
}

// Stand-ins so the fixture typechecks: the check reads tag names, not imports.
type Part = (props: { [key: string]: unknown; children?: unknown }) => null
declare const Icon: Part, AiMark: Part, Button: Part, Badge: Part, CommandItem: Part, EmptyMedia: Part
