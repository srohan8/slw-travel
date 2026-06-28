# bysloth — Claude instructions

## Mobile design is critical — never break it

`app/index.html` has two completely separate navigation systems:

| System | Selector | Breakpoint |
|--------|----------|------------|
| Desktop top nav | `nav:not(#bottomNav)` | >640px |
| Mobile bottom nav | `#bottomNav .bn-item` | ≤640px |
| Mobile header | `#mobileHeader` | ≤640px |
| Mobile splash | `#mobileSplash` | ≤640px, logged-out |

**Before editing `app/index.html`**, run this check and confirm all 4 counts are non-zero:

```
grep -c "bottom-nav\|mobileHeader\|mobileSplash\|bnSync" app/index.html
```

**After editing**, run it again and compare. If any count dropped to 0, the mobile design was broken — stop and restore before committing.

### Rules

- Never remove the `@media(max-width:640px)` block
- Never remove `#bottomNav`, `#mobileHeader`, `#mobileSplash`
- Never remove `bnSync()`, `mobileHeaderSync()`, `updateMobileSplash()`
- Any change to the top `<nav>` must leave `nav:not(#bottomNav)` intact
- Desktop-only additions (dropdowns, avatar menus) must have `@media(max-width:640px){display:none !important;}` guard

### What happened (for context)

The mobile nav was silently wiped in commit `564edf3` during a nav refactor. It wasn't noticed until the user reported missing mobile navbar two sessions later. The fix was commit `926b6d5`.

## Never push without explicit user confirmation

Always commit locally, then ask "shall I push?" before running `git push`.

## Design system tokens

| Token | Value | Use |
|-------|-------|-----|
| `--dusk` | `#091022` | Nav background, dark surfaces |
| `--moss` | `#13213A` | Secondary dark |
| `--fern` | `#1E3A5C` | Accent blue |
| `--sage` | `#FF5014` | CTA orange (primary action colour) |
| `--cream` | `#FFFFFF` | Light text on dark |
| `--body` | `Albert Sans` | Body font |
| `--serif` | `Sora` | Headings |
| `--mono` | `JetBrains Mono` | Labels, metadata, footer |

## Footer — consistent across all pages

All pages use the light border-top footer from `index.html`. Never use a dark `background:var(--dusk)` footer.

Footer CSS class: `.footer` (tool pages) / `.site-footer` (blog pages).
Footer always contains: bysloth logo + nav links + `© 2026 · Lisbon`.
