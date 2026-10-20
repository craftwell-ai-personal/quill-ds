# icon (component)

The Quill icon component — Material Symbols Outlined at weight 400, shipped as a self-contained core set of 98 names covering every icon the Quill blocks use.

### When to use
- You need a glyph inside a Quill block or beside text — a nav item, a status row, an inline affordance — and want it to match the outlined, weight-400 set every block already uses.

### Reach for instead
- **button** — when the glyph is the whole control — use Button with an icon size (`icon`, `icon-sm`) and an `aria-label`; Icon on its own is never interactive.
- **spinner** — when the glyph means "loading" — Spinner carries the motion and the status semantics an icon does not.

### Rules
- **Do:** Pick a name from the core set the `icon` item ships (98 names): account_balance, add, add_circle, archive, arrow_back, arrow_downward, arrow_forward, arrow_upward, attach_file, attach_money, calendar_today, cancel, chat_bubble, check, check_box, check_box_outline_blank, check_circle, chevron_left, chevron_right, close, cloud_upload, content_copy, credit_card, dangerous, dark_mode, dashboard, delete, description, dock_to_left, download, draft, edit, error, favorite, filter_list, folder_open, format_align_center, format_align_left, format_align_right, format_bold, format_italic, format_underlined, forward, group, help, history, home, info, ink_pen, keep, keyboard_arrow_down, keyboard_arrow_left, keyboard_arrow_right, keyboard_arrow_up, keyboard_command_key, language, light_mode, link, lock, login, logout, mail, menu, menu_book, mic, more_horiz, more_vert, notifications, open_in_new, palette, person, person_add, photo_library, progress_activity, radio_button_checked, radio_button_unchecked, refresh, remove, reply, save, schedule, search, send, settings, share, sort, space_dashboard, star, star_shine, stop, thumb_down, thumb_up, undo, upload, visibility, visibility_off, wallet, warning. **Don't:** Use any other Material Symbol name in an app. The consumer `<Icon>` bundles only the core set, so an unknown name renders as an empty, size-reserved box (plus a console warning in development); the design-system site lazy-loads the whole library, so a name can look fine on quilldesignsystem.com and be blank in your app.
- **Do:** Leave the size off so the glyph is `1em` and follows the text beside it. When it needs its own size, give it a step of the icon scale as a class: `<Icon name="info" className="size-icon-lg" />` (`size-icon-xs` 12 · `sm` 14 · `md` 16 · `lg` 18 · `xl` 20 · `2xl` 24 · `3xl` 28). **Don't:** Type a pixel number (`size={18}`) or a spacing class (`size-4`): the inspector shows a bare number instead of the icon token, and `quill-check` flags both. Never scale an icon with a `transform`; the reserved box stops matching the glyph.
- **Do:** Give an icon inside a Button, menu item, select, tab, Alert or Badge no size at all: the part sizes its icons to its own size (16px in a normal Button, 14 in `sm`). **Don't:** Size an icon inside one of those parts: the Button or menu either ignores it or lets it fight its own size, and the icons in a row stop matching.
- **Do:** Leave an icon decorative (the default renders `aria-hidden`) when the text next to it already carries the meaning. **Don't:** Add an `aria-label` to an icon that sits beside its own label — screen readers then announce the meaning twice.

### Accessibility
- Without `aria-label` the SVG is `aria-hidden`; with one it becomes `role="img"` and is announced. Decorative next to text, labelled when the icon stands alone.
- Colour comes from `currentColor`, so an icon inherits the contrast of the text it sits in; carry status meaning in text or a ToneBadge, never in icon colour alone.

