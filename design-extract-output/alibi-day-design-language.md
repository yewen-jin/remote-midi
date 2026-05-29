# Design Language: alibi — for the days you can't see clearly

> Extracted from `https://alibi.day` on May 29, 2026
> 248 elements analyzed

This document describes the complete design language of the website. It is structured for AI/LLM consumption — use it to faithfully recreate the visual design in any framework.

## Color Palette

### Primary Colors

| Role | Hex | RGB | HSL | Usage Count |
|------|-----|-----|-----|-------------|
| Primary | `#3253c7` | rgb(50, 83, 199) | hsl(227, 60%, 49%) | 24 |
| Secondary | `#081692` | rgb(8, 22, 146) | hsl(234, 90%, 30%) | 13 |
| Accent | `#0e3b56` | rgb(14, 59, 86) | hsl(203, 72%, 20%) | 10 |

### Neutral Colors

| Hex | HSL | Usage Count |
|-----|-----|-------------|
| `#ffffff` | hsl(0, 0%, 100%) | 34 |

### Background Colors

Used on large-area elements: `#ffffff`, `#4a60c6`

### Text Colors

Text color palette: `#162044`, `#3253c7`, `#43849d`, `#ffffff`, `#bf7dad`, `#0e3b56`

### Gradients

```css
background-image: radial-gradient(circle at 16% 18%, rgba(191, 125, 173, 0.38) 0px, rgba(191, 125, 173, 0.38) 12%, rgba(0, 0, 0, 0) 28%), radial-gradient(circle at 84% 8%, rgba(147, 165, 228, 0.55) 0px, rgba(147, 165, 228, 0.55) 15%, rgba(0, 0, 0, 0) 32%), radial-gradient(circle at 74% 82%, rgba(67, 132, 157, 0.34) 0px, rgba(67, 132, 157, 0.34) 14%, rgba(0, 0, 0, 0) 31%), linear-gradient(135deg, rgb(248, 250, 255) 0%, rgb(244, 240, 255) 42%, rgb(234, 240, 255) 100%);
```

### Full Color Inventory

| Hex | Contexts | Count |
|-----|----------|-------|
| `#162044` | text, border | 219 |
| `#bf7dad` | text, border | 122 |
| `#43849d` | text, border | 92 |
| `#ffffff` | background, text, border | 34 |
| `#3253c7` | text, border, background | 24 |
| `#081692` | border | 13 |
| `#0e3b56` | text, border, background | 10 |
| `#85346b` | background | 10 |
| `#4a60c6` | background, border | 7 |

## Typography

### Font Families

- **Figtree** — used for all (243 elements)
- **JetBrains Mono** — used for body (5 elements)

### Type Scale

| Size (px) | Size (rem) | Weight | Line Height | Letter Spacing | Used On |
|-----------|------------|--------|-------------|----------------|---------|
| 60px | 3.75rem | 900 | 60px | -1.5px | h1, br, span |
| 30px | 1.875rem | 900 | 36px | -0.75px | h2 |
| 24px | 1.5rem | 900 | 32px | -0.6px | h2 |
| 17px | 1.0625rem | 400 | 27.2px | normal | body, div, main, nav |
| 16px | 1rem | 400 | 24px | normal | html, head, meta, link |
| 15px | 0.9375rem | 900 | 24px | -0.375px | span |
| 14px | 0.875rem | 700 | 22.4px | normal | a, svg, polygon, path |
| 13px | 0.8125rem | 700 | 20.8px | normal | a, svg, path, h3 |
| 12.5px | 0.7813rem | 400 | 24px | normal | p |
| 12px | 0.75rem | 900 | 16px | 1.44px | p |
| 11px | 0.6875rem | 700 | 17.6px | 1.32px | a |

### Heading Scale

```css
h1 { font-size: 60px; font-weight: 900; line-height: 60px; }
h2 { font-size: 30px; font-weight: 900; line-height: 36px; }
h2 { font-size: 24px; font-weight: 900; line-height: 32px; }
h3 { font-size: 14px; font-weight: 700; line-height: 22.4px; }
h3 { font-size: 13px; font-weight: 700; line-height: 20.8px; }
```

### Body Text

```css
body { font-size: 17px; font-weight: 400; line-height: 27.2px; }
```

### Font Weights in Use

`400` (205x), `700` (19x), `900` (14x), `600` (10x)

## Spacing

**Base unit:** 2px

| Token | Value | Rem |
|-------|-------|-----|
| spacing-2 | 2px | 0.125rem |
| spacing-40 | 40px | 2.5rem |
| spacing-64 | 64px | 4rem |
| spacing-80 | 80px | 5rem |
| spacing-123 | 123px | 7.6875rem |
| spacing-128 | 128px | 8rem |
| spacing-449 | 449px | 28.0625rem |

## Border Radii

| Label | Value | Count |
|-------|-------|-------|
| lg | 16px | 16 |

## Box Shadows

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.06) 0px 1px 3px 0px, rgba(50, 83, 199, 0.09) 0px 6px 20px 0px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.2) 0px 2px 6px 0px, rgba(50, 83, 199, 0.16) 0px 4px 14px 0px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.06) 0px 1px 3px 0px, rgba(50, 83, 199, 0.07) 0px 3px 8px 0px;
```

**sm** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.08) 0px 2px 6px 0px, rgba(50, 83, 199, 0.12) 0px 12px 32px 0px;
```

**sm (inset)** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.05) 0px 1px 2px 0px, rgba(50, 83, 199, 0.08) 0px 2px 5px 0px inset;
```

**sm (inset)** — blur: 0px
```css
box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.08) 0px 2px 6px 0px inset;
```

## CSS Custom Properties

### Colors

```css
--foreground: #162044;
--foreground-soft: #3253c7;
--foreground-muted: #43849d;
--alibi-border: #3253c72e;
--tw-ring-offset-shadow: 0 0 #0000;
--tw-ring-shadow: 0 0 #0000;
--tw-inset-ring-shadow: 0 0 #0000;
--tw-ring-offset-color: #fff;
--color-white: #fff;
--tw-border-style: solid;
--tw-ring-offset-width: 0px;
```

### Spacing

```css
--spacing: .25rem;
--tw-space-y-reverse: 0;
```

### Typography

```css
--text-2xl: 1.5rem;
--leading-relaxed: 1.625;
--font-weight-black: 900;
--text-lg: 1.125rem;
--text-5xl--line-height: 1;
--text-2xl--line-height: calc(2 / 1.5);
--text-base--line-height: calc(1.5 / 1);
--tracking-wide: .025em;
--text-xl--line-height: calc(1.75 / 1.25);
--font-weight-semibold: 600;
--text-sm: .875rem;
--text-lg--line-height: calc(1.75 / 1.125);
--leading-tight: 1.25;
--font-jetbrains-mono: "JetBrains Mono", "JetBrains Mono Fallback";
--font-figtree: "Figtree", "Figtree Fallback";
--text-4xl: 2.25rem;
--font-weight-bold: 700;
--tracking-normal: 0em;
--text-sm--line-height: calc(1.25 / .875);
--text-3xl--line-height: calc(2.25 / 1.875);
--text-5xl: 3rem;
--text-6xl: 3.75rem;
--text-3xl: 1.875rem;
--text-xs: .75rem;
--text-xs--line-height: calc(1 / .75);
--default-font-family: "Figtree", "Figtree Fallback", ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-weight-medium: 500;
--font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
--text-6xl--line-height: 1;
--text-4xl--line-height: calc(2.5 / 2.25);
--text-xl: 1.25rem;
--text-base: 1rem;
--default-mono-font-family: "JetBrains Mono", "JetBrains Mono Fallback", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
--tracking-tight: -.025em;
```

### Shadows

```css
--alibi-shadow: 0 18px 45px #3253c72e;
--tw-inset-shadow-alpha: 100%;
--tw-drop-shadow-alpha: 100%;
--tw-inset-shadow: 0 0 #0000;
--tw-shadow-alpha: 100%;
--tw-shadow: 0 0 #0000;
```

### Radii

```css
--radius-3xl: 1.5rem;
--radius-sm: .25rem;
--radius-xl: .75rem;
--radius-2xl: 1rem;
--radius-md: .375rem;
```

### Other

```css
--background: #f8faff;
--background-edge: #eaf0ff;
--alibi-pink: #bf7dad;
--alibi-blue: #3253c7;
--alibi-teal: #43849d;
--alibi-lavender: #93a5e4;
--alibi-surface: #ffffffc2;
--alibi-surface-strong: #ffffffe6;
--container-md: 28rem;
--default-transition-timing-function: cubic-bezier(.4, 0, .2, 1);
--container-5xl: 64rem;
--tw-translate-z: 0;
--tw-gradient-via: rgba(0, 0, 0, 0);
--tw-scale-y: 1;
--container-6xl: 72rem;
--container-3xl: 48rem;
--tw-translate-y: 0;
--animate-spin: spin 1s linear infinite;
--container-4xl: 56rem;
--tw-gradient-from: rgba(0, 0, 0, 0);
--tw-gradient-to: rgba(0, 0, 0, 0);
--tw-divide-y-reverse: 0;
--tw-scale-z: 1;
--container-2xl: 42rem;
--container-sm: 24rem;
--tw-translate-x: 0;
--tw-gradient-via-position: 50%;
--tw-scale-x: 1;
--tw-gradient-to-position: 100%;
--default-transition-duration: .15s;
--animate-pulse: pulse 2s cubic-bezier(.4, 0, .6, 1) infinite;
--container-xl: 36rem;
--container-7xl: 80rem;
--tw-gradient-from-position: 0%;
```

### Semantic

```css
success: [object Object];
warning: [object Object];
error: [object Object];
info: [object Object];
```

## Transitions & Animations

**Easing functions:** `[object Object]`

**Durations:** `0.15s`

### Common Transitions

```css
transition: all;
transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), outline-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), fill 0.15s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-from 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-via 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-to 0.15s cubic-bezier(0.4, 0, 0.2, 1);
transition: color 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), outline-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 0.15s cubic-bezier(0.4, 0, 0.2, 1), fill 0.15s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-from 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-via 0.15s cubic-bezier(0.4, 0, 0.2, 1), --tw-gradient-to 0.15s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), translate 0.15s cubic-bezier(0.4, 0, 0.2, 1), scale 0.15s cubic-bezier(0.4, 0, 0.2, 1), rotate 0.15s cubic-bezier(0.4, 0, 0.2, 1), filter 0.15s cubic-bezier(0.4, 0, 0.2, 1), -webkit-backdrop-filter 0.15s cubic-bezier(0.4, 0, 0.2, 1), backdrop-filter 0.15s cubic-bezier(0.4, 0, 0.2, 1), display 0.15s cubic-bezier(0.4, 0, 0.2, 1), content-visibility 0.15s cubic-bezier(0.4, 0, 0.2, 1), overlay 0.15s cubic-bezier(0.4, 0, 0.2, 1), pointer-events 0.15s cubic-bezier(0.4, 0, 0.2, 1);
```

### Keyframe Animations

**alibi-soft-rise**
```css
@keyframes alibi-soft-rise {
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0px); }
}
```

**alibi-fade-in**
```css
@keyframes alibi-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
```

**alibi-record-pulse**
```css
@keyframes alibi-record-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

**alibi-listen-dot**
```css
@keyframes alibi-listen-dot {
  0%, 100% { box-shadow: rgba(139, 157, 127, 0.18) 0px 0px 0px 3px; }
  50% { box-shadow: rgba(139, 157, 127, 0.1) 0px 0px 0px 5px; }
}
```

**spin**
```css
@keyframes spin {
  100% { transform: rotate(360deg); }
}
```

**pulse**
```css
@keyframes pulse {
  50% { opacity: 0.5; }
}
```

## Component Patterns

Detected UI component patterns and their most common styles:

### Buttons (4 instances)

```css
.button {
  background-color: rgb(50, 83, 199);
  color: rgb(255, 255, 255);
  font-size: 14px;
  font-weight: 700;
  padding-top: 12px;
  padding-right: 24px;
  border-radius: 3.35544e+07px;
}
```

### Cards (15 instances)

```css
.card {
  background-color: rgb(255, 255, 255);
  border-radius: 16px;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.06) 0px 1px 3px 0px, rgba(50, 83, 199, 0.09) 0px 6px 20px 0px;
  padding-top: 20px;
  padding-right: 20px;
}
```

### Links (8 instances)

```css
.link {
  color: rgb(255, 255, 255);
  font-size: 13px;
  font-weight: 700;
}
```

### Navigation (1 instances)

```css
.navigatio {
  background-color: rgb(255, 255, 255);
  color: rgb(22, 32, 68);
  padding-top: 12px;
  padding-bottom: 12px;
  padding-left: 24px;
  padding-right: 24px;
  position: fixed;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.06) 0px 1px 3px 0px, rgba(50, 83, 199, 0.09) 0px 6px 20px 0px;
}
```

### Footer (1 instances)

```css
.foote {
  color: rgb(22, 32, 68);
  padding-top: 32px;
  padding-bottom: 32px;
  font-size: 17px;
}
```

## Component Clusters

Reusable component instances grouped by DOM structure and style similarity:

### Button — 4 instances, 1 variant

**Variant 1** (4 instances)

```css
  background: rgb(50, 83, 199);
  color: rgb(255, 255, 255);
  padding: 6px 16px 6px 16px;
  border-radius: 3.35544e+07px;
  border: 0px solid rgb(255, 255, 255);
  font-size: 13px;
  font-weight: 700;
```

### Card — 1 instance, 1 variant

**Variant 1** (1 instance)

```css
  background: rgb(255, 255, 255);
  color: rgb(22, 32, 68);
  padding: 24px 24px 24px 24px;
  border-radius: 16px;
  border: 1px solid oklab(0.489841 -0.00941581 -0.184291 / 0.15);
  font-size: 17px;
  font-weight: 400;
```

### Card — 4 instances, 1 variant

**Variant 1** (4 instances)

```css
  background: oklab(0.731865 0.00275961 -0.0939116 / 0.08);
  color: rgb(22, 32, 68);
  padding: 16px 16px 16px 16px;
  border-radius: 16px;
  border: 0px solid rgb(22, 32, 68);
  font-size: 17px;
  font-weight: 400;
```

### Card — 9 instances, 1 variant

**Variant 1** (9 instances)

```css
  background: rgb(255, 255, 255);
  color: rgb(22, 32, 68);
  padding: 20px 20px 20px 20px;
  border-radius: 16px;
  border: 1px solid oklab(0.489841 -0.00941581 -0.184291 / 0.12);
  font-size: 17px;
  font-weight: 400;
```

## Layout System

**3 grid containers** and **44 flex containers** detected.

### Container Widths

| Max Width | Padding |
|-----------|---------|
| 1152px | 24px |
| 768px | 0px |
| 1024px | 24px |

### Grid Column Patterns

| Columns | Usage Count |
|---------|-------------|
| 2-column | 1x |
| 1-column | 1x |
| 3-column | 1x |

### Grid Templates

```css
grid-template-columns: 558.594px 505.391px;
gap: 40px;
grid-template-columns: 357.328px 357.328px 357.344px;
gap: 16px;
grid-template-columns: 455.391px;
gap: 12px;
```

### Flex Patterns

| Direction/Wrap | Count |
|----------------|-------|
| row/nowrap | 33x |
| row/wrap | 1x |
| column/nowrap | 10x |

**Gap values:** `12px`, `16px`, `20px`, `40px`, `8px`

## Accessibility (WCAG 2.1)

**Overall Score: 100%** — 4 passing, 0 failing color pairs

### Passing Color Pairs

| Foreground | Background | Ratio | Level |
|------------|------------|-------|-------|
| `#ffffff` | `#3253c7` | 6.57:1 | AA |
| `#3253c7` | `#ffffff` | 6.57:1 | AA |

## Design System Score

**Overall: 93/100 (Grade: A)**

| Category | Score |
|----------|-------|
| Color Discipline | 100/100 |
| Typography Consistency | 90/100 |
| Spacing System | 85/100 |
| Shadow Consistency | 90/100 |
| Border Radius Consistency | 100/100 |
| Accessibility | 100/100 |
| CSS Tokenization | 100/100 |

**Strengths:** Tight, disciplined color palette, Consistent typography system, Well-defined spacing scale, Clean elevation system, Consistent border radii, Strong accessibility compliance, Good CSS variable tokenization

**Issues:**
- 724 duplicate CSS declarations

## Gradients

**4 unique gradients** detected.

| Type | Direction | Stops | Classification |
|------|-----------|-------|----------------|
| radial | circle at 16% 18% | 3 | bold |
| radial | circle at 84% 8% | 3 | bold |
| radial | circle at 74% 82% | 3 | bold |
| linear | 135deg | 3 | bold |

```css
background: radial-gradient(circle at 16% 18%, rgba(191, 125, 173, 0.38) 0px, rgba(191, 125, 173, 0.38) 12%, rgba(0, 0, 0, 0) 28%);
background: radial-gradient(circle at 84% 8%, rgba(147, 165, 228, 0.55) 0px, rgba(147, 165, 228, 0.55) 15%, rgba(0, 0, 0, 0) 32%);
background: radial-gradient(circle at 74% 82%, rgba(67, 132, 157, 0.34) 0px, rgba(67, 132, 157, 0.34) 14%, rgba(0, 0, 0, 0) 31%);
background: linear-gradient(135deg, rgb(248, 250, 255) 0%, rgb(244, 240, 255) 42%, rgb(234, 240, 255) 100%);
```

## Z-Index Map

**1 unique z-index values** across 1 layers.

| Layer | Range | Elements |
|-------|-------|----------|
| sticky | 50,50 | nav.a.l.i.b.i.-.p.i.l.l. .f.i.x.e.d. .l.e.f.t.-.1./.2. .t.o.p.-.6. .z.-.5.0. .f.l.e.x. .-.t.r.a.n.s.l.a.t.e.-.x.-.1./.2. .i.t.e.m.s.-.c.e.n.t.e.r. .g.a.p.-.5. .p.x.-.6. .p.y.-.3 |

## SVG Icons

**13 unique SVG icons** detected. Dominant style: **outlined**.

| Size Class | Count |
|------------|-------|
| xs | 6 |
| sm | 5 |
| md | 2 |

**Icon colors:** `currentColor`

## Font Files

| Family | Source | Weights | Styles |
|--------|--------|---------|--------|
| Figtree | self-hosted | 300, 400, 500, 600, 700, 800, 900 | normal |
| JetBrains Mono | self-hosted | 100 800 | normal |

## Motion Language

**Feel:** mixed · **Scroll-linked:** yes

### Duration Tokens

| name | value | ms |
|---|---|---|
| `xs` | `150ms` | 150 |

### Easing Families

- **custom** (8 uses) — `cubic-bezier(0.4, 0, 0.2, 1)`

## Component Anatomy

### card — 14 instances

**Slots:** media

### button — 4 instances

**Slots:** label, icon
**Variants:** primary · secondary

| variant | count | sample label |
|---|---|---|
| primary | 3 | sign in |
| secondary | 1 | create account |

## Brand Voice

**Tone:** friendly · **Pronoun:** you-only · **Headings:** all-lowercase (tight)

### Top CTA Verbs

- **sign** (1)
- **try** (1)
- **create** (1)
- **start** (1)

### Button Copy Patterns

- "sign in" (1×)
- "try the demo" (1×)
- "create account" (1×)
- "start with a demo session" (1×)

### Sample Headings

> the friend who remembers
your day
> a timeline with memory
> CAPTURE
> PRESERVE
> REFLECT
> the friend who remembers
your day
> a timeline with memory
> CAPTURE
> PRESERVE
> REFLECT

## Page Intent

**Type:** `landing` (confidence 0.45)
**Description:** Alibi is a witness with a warm voice. Log what you did, then let it reflect your productivity patterns back clearly.

## Section Roles

Reading order (top→bottom): content → feature-grid → nav → content → content → nav → testimonial → footer

| # | Role | Heading | Confidence |
|---|------|---------|------------|
| 0 | content | the friend who remembers
your day | 0.3 |
| 1 | nav | — | 0.9 |
| 2 | feature-grid | the friend who remembers
your day | 0.8 |
| 3 | content | a timeline with memory | 0.3 |
| 4 | content | a complete record, not a clean fiction | 0.3 |
| 5 | nav | a complete record, not a clean fiction | 0.4 |
| 6 | testimonial | source-backed memory for real days | 0.8 |
| 7 | footer | — | 0.95 |

## Material Language

**Label:** `flat` (confidence 0)

| Metric | Value |
|--------|-------|
| Avg saturation | 0.596 |
| Shadow profile | soft |
| Avg shadow blur | 0px |
| Max radius | 16px |
| backdrop-filter in use | no |
| Gradients | 4 |

## Component Library

**Detected:** `tailwindcss` (confidence 0.974)

Evidence:
- tailwind-like class density 91%

## Component Screenshots

7 retina crops written to `screenshots/`. Index: `*-screenshots.json`.

| Cluster | Variant | Size (px) | File |
|---------|---------|-----------|------|
| button--primary | 0 | 93 × 33 | `screenshots/button-primary-0.png` |
| button--primary | 1 | 155 × 46 | `screenshots/button-primary-1.png` |
| button--primary | 2 | 236 × 46 | `screenshots/button-primary-2.png` |
| button--secondary | 0 | 171 × 48 | `screenshots/button-secondary-0.png` |
| card--default | 0 | 505 × 557 | `screenshots/card-default-0.png` |
| card--default | 1 | 455 × 81 | `screenshots/card-default-1.png` |
| card--default | 2 | 455 × 105 | `screenshots/card-default-2.png` |

Full-page: `screenshots/full-page.png`

## Quick Start

To recreate this design in a new project:

1. **Install fonts:** Add `Figtree` from Google Fonts or your font provider
2. **Import CSS variables:** Copy `variables.css` into your project
3. **Tailwind users:** Use the generated `tailwind.config.js` to extend your theme
4. **Design tokens:** Import `design-tokens.json` for tooling integration
