# Implementing v0 Designs

When the user hands off v0 designs (from v0.dev):

1. **Read the v0 code carefully** before writing anything. Understand the layout, components, and styling choices.
2. **Extract reusable components** into `src/components/shared/` or `src/components/ui/` as appropriate.
3. **Adapt to project conventions** — use `@/*` path aliases, Shadcn/ui components where they match, and the existing Supabase client patterns.
4. **Don't copy-paste blindly.** v0 generates standalone code. Integrate it into the existing project structure rather than dropping it in as-is.
5. **Preserve the design intent.** The visual design from v0 is what the user approved. Match it as closely as possible. If something needs to change for technical reasons, explain why.
6. **Break large v0 outputs into multiple files** if they exceed 400 lines. Split by logical sections (header, main content, sidebar, etc.).
