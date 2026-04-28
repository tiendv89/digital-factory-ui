<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tailwind utilities

Always use the named Tailwind token classes — never arbitrary CSS-variable syntax or inline styles for design tokens.

| Wrong | Right |
|---|---|
| `text-(--color-text-muted)` | `text-text-muted` |
| `text-[var(--color-text-muted)]` | `text-text-muted` |
| `style={{ color: 'var(--color-text-primary)' }}` | `text-text-primary` |
| `bg-(--color-surface)` | `bg-surface` |
| `border-(--color-border)` | `border-border` |

All design tokens are registered in `tailwind.config.ts` → `theme.extend.colors` and available as utilities (`text-*`, `bg-*`, `border-*`, etc.).

# File naming

All files (components, contexts, hooks, lib, etc.) must use **kebab-case**. Never use PascalCase for filenames.

- `WorkspacePicker.tsx` → `workspace-picker.tsx`
- `WorkspaceContext.tsx` → `workspace-context.tsx`
- `WorkspaceCard.tsx` → `workspace-card.tsx`
