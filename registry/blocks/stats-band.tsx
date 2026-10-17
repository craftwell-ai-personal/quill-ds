import { Separator } from '@/components/ui/separator'

const stats = [
  { value: '56', label: 'Components' },
  { value: '40+', label: 'Patterns' },
  { value: '5', label: 'Themes, light and dark' },
  { value: 'AA', label: 'WCAG 2.1 target' },
]

/** A marketing band of headline statistics separated by vertical dividers on a card background. */
export function StatsBand() {
  return (
    <section className="mx-auto w-full max-w-page rounded-xl bg-card px-8 py-10 ring-1 ring-foreground/10">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-xs font-medium tracking-eyebrow uppercase text-ink-muted">
          By the numbers
        </span>
        <h2 className="font-heading text-2xl text-foreground">A system that keeps its promises</h2>
      </div>
      <div className="mt-8 flex items-stretch justify-between gap-6 max-sm:flex-col max-sm:items-center">
        {stats.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center gap-6 max-sm:w-full max-sm:flex-col max-sm:gap-2">
            {i > 0 && <Separator orientation="vertical" className="max-sm:hidden" />}
            <div className="flex flex-1 flex-col items-center gap-1 text-center">
              <span className="font-heading text-3xl leading-none text-accent-pigment-text">{s.value}</span>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
