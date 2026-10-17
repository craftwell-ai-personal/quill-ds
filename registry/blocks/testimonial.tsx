/** A customer-quote card with a serif pull-quote, avatar initials, and attribution. */
export function Testimonial() {
  return (
    <figure className="flex w-full max-w-card-xl flex-col gap-6 rounded-xl bg-card p-8 ring-1 ring-foreground/10 text-foreground">
      <blockquote className="font-heading text-2xl leading-snug text-pretty">
        “Quill let our team ship consistent, accessible screens in days — the token
        foundation means design and code never drift.”
      </blockquote>
      <figcaption className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
          RP
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">Riley Park</span>
          <span className="text-sm text-muted-foreground">Head of Design, Northwind</span>
        </div>
      </figcaption>
    </figure>
  )
}
