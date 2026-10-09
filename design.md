# Masdika Web Design System & Conventions

This document outlines the design system, color palettes, and component styling rules established during the Home Page redesign. **All future pages and components MUST adhere to these guidelines to ensure UI consistency.**

## 1. Dynamic Theming Architecture

The application supports both Dark Mode and Light Mode. We use a **React-based dynamic styling approach** rather than relying on heavy global CSS overrides.

### Theming Pattern
Always use the `useTheme` hook and the `isDark` boolean to conditionally apply Tailwind classes using the `cn()` utility:

```tsx
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export function ExampleComponent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={cn(
      "base-classes transition-colors duration-300", 
      isDark ? "bg-[#011627] text-white" : "bg-white text-slate-900"
    )}>
      Content
    </div>
  );
}
```

## 2. Color Palette & Typography

### Light Mode (Clean & Crisp)
- **Backgrounds:** Use `bg-white`, `bg-[#f8fafb]`, or `bg-slate-50` to create subtle depth.
- **Headings & Primary Text:** `text-slate-900`
- **Body & Secondary Text:** `text-slate-600` or `text-slate-500`
- **Borders:** `border-black/5` or `border-slate-200`

### Dark Mode (Deep & Immersive)
- **Backgrounds:** Use `bg-[#050B14]` (Main), `bg-[#011627]` (Footer/Sections), or `bg-[#0b1120]` (Cards).
- **Headings & Primary Text:** `text-white`
- **Body & Secondary Text:** `text-zinc-400`
- **Borders:** `border-white/5` or `border-white/10`

### Accents & Gradients
- **Primary Accent:** Cyan (`cyan-400`, `cyan-500`, `cyan-600`).
- **Secondary Accent:** Blue (`blue-500`).
- **Gradients:** Use `bg-gradient-to-r from-cyan-500 to-blue-500`.

## 3. Component Specific Rules

### Logo Structure
The Masdika logo consists of three skewed slashes. To maintain perfect symmetry and brand consistency, the colors MUST strictly follow this order:
1. Left Slash: `bg-cyan-500`
2. Middle Slash: `bg-blue-500`
3. Right Slash: `bg-cyan-500`

### Legibility & Contrast (Light Mode)
Bright cyan (`text-cyan-400` or `text-cyan-300`) and bright yellow (`text-yellow-400`) on white or light backgrounds lack contrast and become practically invisible. When rendering icons, badges, tabs, or any colored text in Light Mode, **you MUST use darker shades** (e.g., `600`, `700`, `800`) paired with tinted backgrounds:

- **Cyan Badges & Active Tabs (Light Mode):** `text-cyan-700` with `bg-cyan-50 border border-cyan-200`
- **Cyan Badges & Active Tabs (Dark Mode):** `text-cyan-400` with `bg-cyan-500/10 border border-cyan-500/20`
- **Standalone UI Icons (Light Mode):** `text-cyan-600` or `text-cyan-700` with `bg-cyan-50 border border-cyan-100` (Never `text-cyan-400` and `bg-cyan-500/10`)
- **Standalone UI Icons (Dark Mode):** `text-cyan-400` with `bg-cyan-500/10 border border-cyan-500/20`
- **Warning/Pending Badges (Light Mode):** `text-yellow-700` with `bg-yellow-50 border-yellow-300`
- **Warning/Pending Badges (Dark Mode):** `text-yellow-500` with `bg-yellow-500/10 border-yellow-500/20`
- **Success/Active Badges (Light Mode):** `text-emerald-700` with `bg-emerald-50 border-emerald-200`

**CRITICAL RULE:** Never use `text-cyan-400` or `text-cyan-300` in Light Mode. If you are rendering an active state for a tab, card, or standalone UI Icon, make sure the text/icon color is `text-cyan-600` or `text-cyan-700` so it is clear and highly readable!

### Image Cards (Portfolio & Blog)
For cards that use background images with text overlaid on top, the text **must always remain white (`text-[#ffffff]`)** regardless of the theme. 
To ensure legibility, apply a dark vignette gradient overlay at the bottom of the image:
```tsx
<div className="absolute inset-0 bg-gradient-to-t from-[#050B14]/90 via-[#050B14]/50 to-transparent" />
```

### Navbar & Footer Alignment
- **Navbar:** Clean white (`bg-white`) in Light Mode, deep dark (`bg-[#050B14]`) in Dark Mode.
- **Footer:** Crisp light-gray (`bg-[#f8fafb]`) in Light Mode, deep dark (`bg-[#011627]`) in Dark Mode.
- Both components must dynamically adjust their internal text and icons using the theming pattern to ensure 100% legibility.

## 4. CSS Overrides (AVOID)
**Do not** use `!important` in `globals.css` to force colors on specific tags (e.g., `html.light footer { ... }`). This breaks the React `cn()` utility and causes untraceable contrast bugs. Always handle color logic at the component level using Tailwind classes.

## 5. Pricing & Feature Cards

All pricing and feature cards across all pages **must** follow these standards:

### Standard (Non-popular) Card
```tsx
<div className={cn(
  "relative rounded-[2rem] p-8 h-full transition-all",
  isDark
    ? "bg-cyan-500/5 border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10"
    : "bg-white border border-cyan-200 shadow-sm hover:border-cyan-400 hover:shadow-md"
)}>
```

### Popular / Featured Card
```tsx
<div className={cn(
  "relative rounded-[2rem] p-8 h-full transition-all transform md:-translate-y-4",
  isDark
    ? "bg-gradient-to-b from-cyan-900/40 to-[#0a1929] border border-cyan-400"
    : "bg-white border-[3px] border-cyan-400 shadow-xl"
)}>
```

### "Most Popular" Badge (on cards)
```tsx
<div className={cn(
  "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-500 text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full",
  isDark ? "text-[#0a1929]" : "text-white shadow-md"
)}>
  Most Popular
</div>
```

### Price Separator Line
```tsx
<div className={cn("mb-8 pb-8 border-b", isDark ? "border-white/10" : "border-slate-100")}>
```

### Feature List Item Text
```tsx
<span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>{feature}</span>
```

### Card CTA Button (non-popular)
```tsx
<Link className={cn(
  "block w-full text-center py-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2",
  isDark
    ? "bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-500/20"
    : "bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border border-cyan-200"
)}>
```

### Card CTA Button (popular)
```tsx
<Link className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)] block w-full text-center py-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2">
```

---

## 6. Section Badges & Headings

Consistent badge pill used across all sections to label a section category:

```tsx
<div className={cn(
  "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-6 shadow-sm",
  isDark
    ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400"
    : "border-cyan-200 bg-cyan-50 text-cyan-700"
)}>
  Section Title
</div>
```

---

## 7. Page Background Patterns

All public service pages use the same layered background system to ensure visual consistency:

### Dark Mode Backgrounds
```tsx
{/* Base gradient */}
<div className={cn("absolute inset-0 -z-20", isDark ? "bg-gradient-to-b from-[#050B14] via-[#09152a]/50 to-[#050B14]" : "bg-transparent")} />

{/* Grid pattern */}
<div className={cn(
  "absolute inset-0 bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 -z-10",
  isDark
    ? "bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]"
    : "bg-[linear-gradient(to_right,#475569_1px,transparent_1px),linear-gradient(to_bottom,#475569_1px,transparent_1px)]"
)} />

{/* Ambient glow blobs */}
<div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
  <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]" />
  <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[120px]" />
</div>
```

> [!IMPORTANT]
> Never hardcode dark-only backgrounds like `bg-[#050B14]` directly. Always wrap them in `isDark ?` checks so Light Mode renders cleanly with `bg-transparent`.

---

## 8. Dashboard, Forms & Auth Pages Styling

To maintain absolute consistency across all dashboard pages, authentication pages (Login, Register, Forgot Password, Reset Password) and other forms:

### Dashboard Cards & Containers
**Never hardcode dark-mode classes (like `bg-white/[0.02]`, `border-white/5`, or `text-zinc-400`) directly into a `className` string!** These will force dark mode colors in Light Mode, making the cards look dirty/grayish-blue and breaking contrast.
Always wrap container classes in `cn()` with a ternary operator: `isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200"`.

### Drop Shadows & Glowing Effects
**Never use massive glowing drop shadows (e.g., `shadow-[0_0_50px_rgba(0,0,0,0.5)]`) in Light Mode!** They create a dirty gray cloud effect. Heavy glowing shadows are EXCLUSIVELY for Dark Mode.
- **Light Mode Cards & Buttons:** Use standard Tailwind shadows like `shadow-sm` or `shadow-md`.
- **Dark Mode Cards & Buttons:** Use glowing shadows (e.g. `shadow-[0_0_20px_rgba(6,182,212,0.3)]`) for an immersive effect.

Example for a button:
```tsx
className={cn("bg-cyan-600 shadow-md", isDark && "shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]")}
```

### Headings (Strictly Solid Colors, No Gradients, No Cyan Text)
Main headings must use solid colors to ensure readability in both modes. **Do not use `bg-gradient` on headings, and do not make partial text cyan/blue.** The entire `<h1>` must inherit the primary text color.
In Light Mode, `<h1>` headings must be `text-slate-900` (black) and `font-extrabold`.
```tsx
<h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
  Page Title
</h1>
```

### Primary Action Buttons (No Gradients)
Primary buttons (e.g. "Sign In", "Sign Up") should use a solid Cyan background with a subtle shadow and hover effect. Do not use gradients.
```tsx
<button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-6 py-4 font-bold tracking-wide transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-6 shadow-sm hover:shadow-[0_0_20px_rgba(8,145,178,0.3)] flex items-center justify-center gap-2">
  Action Text
</button>
```

### Input Fields
Inputs must have consistent `rounded-xl` styling, border focus states, and specific text/placeholder colors.
```tsx
<div className={cn("relative flex items-center border rounded-xl overflow-hidden transition-all duration-300 focus-within:ring-1", 
  isDark 
    ? "bg-[#0a1624] border-white/5 focus-within:border-cyan-500/30 focus-within:bg-[#0c1b2b] focus-within:ring-cyan-500/30 shadow-inner" 
    : "bg-white border-slate-200 focus-within:border-cyan-500 focus-within:ring-cyan-500 shadow-sm"
)}>
  <div className="pl-4 pr-3 flex items-center justify-center">
    <Icon className={cn("w-5 h-5 transition-colors", isDark ? "text-zinc-500 group-focus-within:text-cyan-400" : "text-slate-400 group-focus-within:text-cyan-600")} />
  </div>
  <input
    className={cn("w-full py-3.5 pr-4 bg-transparent focus:outline-none font-medium", isDark ? "text-white placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-400")}
  />
</div>
```

### Terminal & Code Blocks
Code blocks or terminal instruction components must adapt to the current theme to maintain readability. **Do not force dark backgrounds in Light Mode** unless it is a global application standard, as it can cause scrollbar and text contrast issues.
```tsx
<div className={cn("relative rounded-xl p-4 flex items-start font-mono text-sm border shadow-inner", 
  isDark ? "bg-[#0a1624] border-white/10" : "bg-slate-50 border-slate-200"
)}>
  <div className={cn("overflow-x-auto whitespace-pre leading-relaxed", 
    isDark ? "text-zinc-300" : "text-slate-700 font-semibold"
  )}>
    {code}
  </div>
</div>
```

### Back Buttons & Standalone Icon Buttons
Standalone icon buttons (like "Back" arrows at the top of edit pages) should appear clean and highly visible, using soft background colors that adapt to the theme:
```tsx
<Link className={cn("p-2.5 rounded-xl transition-all shadow-sm border", 
  isDark 
    ? "bg-white/5 hover:bg-white/10 text-white border-white/10" 
    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
)}>
  <ArrowLeft className="w-5 h-5" />
</Link>
```

