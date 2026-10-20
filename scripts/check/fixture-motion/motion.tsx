// Fixture for rule 9 in scripts/quill-check.test.mjs: motion, stock type steps, opacity, layers. Never shipped.
export function Motion() {
  return (
    <>
      <div className="transition-colors duration-fast ease-out hover:opacity-muted z-overlay" />
      <div className="duration-0 ease-linear opacity-0 hover:opacity-100 z-auto leading-none tracking-normal duration-(--dur)" />
      <div className="duration-200 duration-250 duration-[0.35s] ease-in-out ease-in ease-[cubic-bezier(0.22,1,0.36,1)]" />
      <p className="leading-relaxed leading-normal tracking-wide tracking-widest">Text</p>
      <div className="opacity-50 disabled:opacity-60 opacity-[0.07] z-50 -z-10 z-[5]" />
      <p className="text-sm">The z-index of an opacity-heavy layer is a sentence, not a class.</p>
      {/* quill-check: allow scale — a brand animation timed by the motion designer */}
      <div className="duration-700" />
    </>
  )
}
