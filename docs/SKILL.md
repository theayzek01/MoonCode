# Hodeus UI Design Skill

> AI coding agents (Cursor, Gemini CLI, Claude, Copilot): Read this file before generating any UI, web, or frontend code for this project. Apply the design system defined here. Do NOT default to generic Bootstrap-style or plain Tailwind layouts.

---

## Core Principle: No Default UIs

Every UI generated for this project must have a **distinctive visual identity**. Pick one of the design modes below based on the context of the task. Never mix styles in the same component. Never fall back to plain white/gray layouts with blue buttons.

---

## Design Mode A — Glassmorphism (Default for Web UIs)

Use for: dashboards, auth screens, feature showcases, anything with a rich background.

### Glass Effect Rules
- All cards/panels: `backdrop-filter: blur(16px)` + `background: rgba(255,255,255,0.08)`
- Card borders: `1px solid rgba(255,255,255,0.15)`
- Always place glass surfaces over a gradient or image background — never over plain white/gray
- Blur intensity tiers:
  - Subtle (tooltips, chips): `blur(8px)`, `opacity: 0.85`
  - Medium (cards, sidebars): `blur(16px)`, `opacity: 0.75`
  - Heavy (modals, overlays): `blur(28px)`, `opacity: 0.65`

### Color Palette
```
Primary:   #1856FF  (electric blue — CTAs, links, focus rings)
Secondary: #3A344E  (muted plum — nav bg, sidebar surfaces)
Success:   #07CA6B
Warning:   #E89558
Error:     #EA2143
Light:     #FFFFFF
Dark:      #141414
```

### Typography
- Font: `Plus Jakarta Sans` (import from Google Fonts)
- Monospace: `JetBrains Mono`
- Scale: 12 / 14 / 16 / 18 / 24 / 32px
- Headings: weight 600–700, tight letter-spacing (`-0.02em`)
- Body: weight 400–500

### Background
```css
background: linear-gradient(135deg, #0a0f2e 0%, #1a1040 40%, #0d1a3a 100%);
```

---

## Design Mode B — Neobrutalism

Use for: landing pages, product pages, tool UIs, anything that needs to stand out and be memorable.

### Visual Rules
- All interactive elements: `border: 2px solid #1C293C`, `box-shadow: 4px 4px 0 #1C293C`
- Hover state: `box-shadow: 6px 6px 0 #1C293C`, `transform: translate(-2px, -2px)`
- Active/pressed: `box-shadow: 1px 1px 0 #1C293C`, `transform: translate(3px, 3px)`
- NO gradients on surfaces. NO blur. NO transparency. Flat solid fills only.
- NO rounded corners > 4px except on pills/badges

### Color Palette
```
Primary:   #FDC800  (saturated yellow — buttons, highlights, accents)
Secondary: #432DD7  (deep violet — links, secondary actions)
Success:   #16A34A
Warning:   #D97706
Error:     #DC2626
Background:#FBFBF9  (off-white) or #1C293C (dark mode)
Text:      #1C293C
```

### Typography
- Font: `Inter` (Google Fonts)
- Monospace: `JetBrains Mono`
- Scale: 13 / 15 / 17 / 21 / 27 / 35px (odd-number scale — intentional)
- Headings: weight 800–900, `text-transform: uppercase` for H1
- Body: weight 400

### Key Components
```css
/* Neobrutalist button */
.btn {
  background: #FDC800;
  border: 2px solid #1C293C;
  box-shadow: 4px 4px 0 #1C293C;
  font-weight: 700;
  padding: 10px 20px;
  transition: all 0.1s ease;
}
.btn:hover {
  box-shadow: 6px 6px 0 #1C293C;
  transform: translate(-2px, -2px);
}
.btn:active {
  box-shadow: 1px 1px 0 #1C293C;
  transform: translate(3px, 3px);
}

/* Neobrutalist card */
.card {
  background: #FBFBF9;
  border: 2px solid #1C293C;
  box-shadow: 6px 6px 0 #1C293C;
  padding: 24px;
}
```

---

## Design Mode C — Premium / Apple-style

Use for: settings pages, documentation, data-heavy views, anywhere clarity > flair.

### Visual Rules
- Surfaces: white (`#FFFFFF`) on light, near-black (`#111827`) on dark
- Borders: `1px solid rgba(0,0,0,0.08)` on light, `1px solid rgba(255,255,255,0.06)` on dark
- Shadows: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` — never heavy
- Radius: `8px` for cards/inputs, `12px` for modals, `999px` for pills
- Use color ONLY for interactive elements — everything else is neutral

### Color Palette
```
Primary:   #3B82F6  (blue — actions only)
Secondary: #8B5CF6  (purple — secondary actions)
Success:   #16A34A
Warning:   #D97706
Error:     #DC2626
Light bg:  #FFFFFF / #F9FAFB
Dark bg:   #111827 / #1F2937
```

### Typography
- Font: `Inter` (Google Fonts), fallback: `-apple-system, BlinkMacSystemFont`
- Monospace: `JetBrains Mono`
- Scale: 12 / 14 / 16 / 18 / 24 / 30 / 36px
- Weights: body 400, UI labels 500, headings 600, hero 700
- Line height: body 1.6, headings 1.2

### Spacing
- Base: 4px
- Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px
- Section padding: min 48px vertical
- Content max-width: 1200px, centered

---

## Universal Rules (Apply to ALL modes)

1. **Google Fonts**: Always import the correct font. Never use browser defaults.
2. **Dark mode first**: Prefer dark backgrounds unless the style explicitly calls for light.
3. **No placeholder content**: Use realistic, meaningful copy — never "Lorem ipsum".
4. **Responsive**: Mobile-first. Every layout must work at 375px width.
5. **Micro-interactions**: Every interactive element needs hover/active states. No bare transitions.
6. **Semantic HTML**: Use proper `<section>`, `<article>`, `<nav>`, `<main>` etc.
7. **Accessibility**: WCAG AA minimum. All interactive elements keyboard-navigable.
8. **No mixing**: Pick ONE mode per page/component. Don't mix glass + brutalism.

---

## How to Choose a Mode

| Context | Mode |
|---|---|
| Landing page, marketing | B (Neobrutalism) |
| Dashboard, data viz | A (Glassmorphism) |
| Auth (login/signup) | A (Glassmorphism) |
| Settings, docs, admin | C (Premium) |
| Tool UI, devtools | B or C |
| Chat / messaging | A (Glassmorphism) |

---

## Anti-patterns (NEVER do these)

- ❌ Plain white background with blue `#007bff` buttons
- ❌ Generic card with `border-radius: 8px` and `box-shadow: 0 2px 4px rgba(0,0,0,0.1)` — this is the "AI default" look
- ❌ Helvetica/Arial as the font
- ❌ Layouts that look like Bootstrap 4
- ❌ All-caps `LINEAR-GRADIENT(#667eea, #764ba2)` purple gradient — overused
- ❌ Flat color buttons with no border, no shadow, no personality

---

*Source: TypeUI Design Skills (https://www.typeui.sh/design-skills) — Glassmorphism, Neobrutalism, Premium — adapted for Hodeus project.*

