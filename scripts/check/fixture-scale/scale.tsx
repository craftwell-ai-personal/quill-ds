// Fixture for rules 6 and 7 in scripts/quill-check.test.mjs: Quill's size scales. Never shipped.
export function Scale() {
  return (
    <>
      <div className="p-4 px-3.5 gap-2.5 -mt-2 w-full h-9 size-4 max-w-1/2 inset-0 top-1/2 p-px border border-2 ring-2 rounded-md text-5xl w-card max-w-page h-frame min-h-touch size-4.5 basis-rail">on the scale</div>
      <div className="p-13 p-3.25 -mt-13 border-5 text-6xl gap-[22px] p-[13px] border-[3px] mt-[-3px] p-[var(--space-4)]">off the scale</div>
      <div className="w-64 max-w-md w-[317px] h-[24px] w-[calc(100%-2rem)] h-[1lh] p-frame w-frame max-w-prose">sizes</div>
      <div className="rounded shadow-sm" aria-label="a rounded, top-level, end-to-end corner">bare rounded among classes; prose alone</div>
      <i style={{ padding: 13, borderRadius: 7, margin: '8px 12px', top: 0, width: 317, fontSize: '14px', border: '3px solid var(--border)', lineHeight: 1.5, gap: 'var(--space-2)' }} />
      {/* quill-check: allow scale — matches the embedded player's frame */}
      <div className="p-11">allowed</div>
    </>
  )
}
