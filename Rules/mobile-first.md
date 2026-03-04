# Mobile-First Responsive Design

The mobile web experience must be flawless. An iOS app comes later — for now, the mobile site IS the mobile app.

## Rules

1. **Build mobile-first.** Start with the mobile layout, then add breakpoints for larger screens using Tailwind's `sm:`, `md:`, `lg:` prefixes. Never design desktop-first and try to shrink it down.

2. **Never cause horizontal overflow.** This is the #1 mobile issue. Follow these rules to prevent it:
   - Always set `max-w-full` or `overflow-hidden` on containers that might overflow
   - Use `w-full` instead of fixed widths on mobile
   - Use `min-w-0` on flex children to prevent them from overflowing their parent
   - Wrap long text with `break-words` or `overflow-wrap: break-word`
   - Tables must be wrapped in `overflow-x-auto` containers
   - Images need `max-w-full h-auto`
   - Avoid `px-*` padding larger than `px-4` on mobile — it eats into the already-small screen

3. **Test at 375px wide.** That's the narrowest common phone screen (iPhone SE). If it looks good at 375px, it'll look good everywhere.

4. **Touch targets must be at least 44x44px.** Buttons, links, and interactive elements need to be finger-friendly. Use `min-h-11 min-w-11` (44px) as a baseline.

5. **No hover-only interactions.** Every hover state must have a corresponding tap/click behavior. Mobile users can't hover.

6. **Font sizes must be readable.** Minimum 16px for body text on mobile. Anything smaller forces users to zoom, which can also trigger horizontal overflow.
