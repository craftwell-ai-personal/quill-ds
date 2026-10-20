# ai-mark (component)

Quill's AI sparkle — the one icon that means AI, drawn in the AI gradient with a one-star cut for 16px and under.

### When to use
- You need to show that something is AI: an AI button, an AI badge, the assistant avatar, an AI menu item, or the greeting on an AI page.

### Reach for instead
- **ai-badge** — when you are labelling a piece of content as AI-made; the badge carries the mark and the words.
- **icon** — when the icon means anything other than AI — every other icon comes from the Material Symbols set.

### Rules
- **Do:** Use the AI mark only where the thing it sits on calls an AI or was made by one. **Don't:** Use the sparkle as decoration, a "new" marker or a rating star — once it appears on non-AI things it stops meaning AI.
- **Do:** Let the mark draw its own gradient at every size; pass `size` as a step of the icon scale (`size="icon-md"`, default `icon-lg`), never a colour. The step also picks the drawing: one star at `icon-md` and smaller, two above. **Don't:** Recolour the mark with a text colour or a single pigment — the gradient is what makes it read as AI.
- **Do:** Pass `label` when the mark is the only thing that says "AI" (an icon-only button or avatar). **Don't:** Leave a standalone mark unlabelled — screen readers hear nothing.

### Accessibility
- Decorative by default (`aria-hidden`), because it usually sits beside words that already say AI.
- With `label`, it renders as `role="img"` with that accessible name.
- Each instance generates its own gradient ids, so several marks on one page all render in colour.

### Design tokens
`--ai-from` · `--ai-via` · `--ai-to`

