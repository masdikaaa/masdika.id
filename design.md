# Masdika Design System & UI Specification

> **Patokan Utama (Single Source of Truth):**
> Seluruh antarmuka aplikasi, hierarki tipografi, sistem warna, dan pola komponen harus konsisten dengan **Halaman Home (`apps/web/src/app/(public)/page.tsx`)** dan spesifikasi token di bawah ini.

---

## 1. Prinsip Desain & Patokan Utama

1. **Konsistensi Lintas Halaman:**
   - Semua halaman publik (Home `/`, Services `/services`, Portfolio `/portfolio`, Resume `/resume`, dll.) harus berbagi gaya visual, ukuran font, padding, dan komponen yang identik.
2. **Harmonisasi Tema Netral (Light & Dark):**
   - Mode Terang (*Light*): Menggunakan kanvas abu-abu sangat muda bersih (`#f8fafb`), kartu putih (`#ffffff`), dan teks primer slate gelap (`#0f172a`).
   - Mode Gelap (*Dark*): Menggunakan obsidian charcoal netral (`#050B14` atau `#121316`), bukan warna biru/navy jenuh seperti `#0e172a` atau `#0a1324`.
3. **Aksen Brand Cyan:**
   - Warna aksen utama adalah Cyan (`#00d2ff` / `text-cyan-600 dark:text-cyan-400`). Digunakan untuk tombol utama, indikator aktif, ikon aksen, dan border interaktif saat di-hover (`hover:border-cyan-500/40`).

---

## 2. Skala Tipografi & Ukuran Font (Patokan Home Page)

Hierarki tipografi harus seragam di seluruh halaman tanpa modifikasi ukuran sembarangan:

| Elemen UI | Utility Tailwind Classes | Deskripsi & Aturan Penggunaan |
|---|---|---|
| **Hero H1 Headline** | `text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] text-[var(--text-primary)]` | Judul utama paling atas di hero section setiap halaman. |
| **Hero Typing / Accent Subheading** | `text-3xl sm:text-4xl md:text-[56px] font-black tracking-tight leading-tight text-cyan-600 dark:text-cyan-400` | Teks sorotan dinamis atau kalimat penegas di hero. |
| **Hero Description / Lead** | `text-lg md:text-xl font-normal leading-relaxed text-[var(--text-secondary)] max-w-xl mb-10` | Paragraf pengantar di bawah H1. |
| **Section Eyebrow / Category Tag** | `text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-4 block` | Label penanda kategori di atas judul seksi (misal: "OUR PRODUCTS", "WHAT I DO"). |
| **Section H2 Headline** | `text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4` | Judul utama untuk setiap seksi konten halaman. |
| **Section Description** | `text-base md:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl` | Deskripsi pengantar seksi. |
| **Card Title (Primary)** | `text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors` | Judul kartu produk atau fitur standar. |
| **Card Title (Large/Hero Card)** | `text-xl sm:text-2xl font-black text-[var(--text-primary)]` | Judul untuk kartu besar atau kartu promosi. |
| **Card Body Text** | `text-sm text-[var(--text-secondary)] leading-relaxed` | Isi teks deskripsi di dalam kartu. |
| **Card Action / Footer Link** | `text-sm font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-2` | Tautan aksi di kaki kartu (misal: "View Details →"). |
| **Floating Badge Label** | `text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none` | Label atas pada floating badge karakter 3D. |
| **Floating Badge Value** | `text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-1` | Teks nilai tebal pada floating badge karakter 3D. |

---

## 3. Sistem Warna & Semantic Tokens

Semua komponen harus mengonsumsi variabel CSS yang ditentukan dalam [`globals.css`](file:///c:/laragon/www/masdika/apps/web/src/app/globals.css):

### 3.1 Token Teks & Latar Belakang
- **Teks Utama (`--text-primary`):**
  - Light Mode: `#0f172a` (Slate 900)
  - Dark Mode: `#ffffff` (Pure White)
- **Teks Sekunder (`--text-secondary`):**
  - Light Mode: `#475569` (Slate 600)
  - Dark Mode: `#a1a1aa` (Zinc 400)
- **Teks Muted (`--text-muted`):**
  - Light Mode: `#94a3b8` (Slate 400)
  - Dark Mode: `#71717a` (Zinc 500)
- **Latar Halaman (`--background`):**
  - Light Mode: `#f8fafb`
  - Dark Mode: `#011627`
- **Permukaan Kartu Standar (`--surface`):**
  - Light Mode: `#ffffff`
  - Dark Mode: `#050B14`
- **Kartu Elevated / Floating Badges:**
  - Light: `bg-white/95 border border-slate-200/80 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)]`
  - Dark: `dark:bg-[#061e33]/85 backdrop-blur-xl border border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)]` (Frosted Midnight Navy Glass, harmonis dengan kanvas `#011627`)
- **Border Standar (`--border-primary`):**
  - Light Mode: `rgba(0, 0, 0, 0.08)`
  - Dark Mode: `rgba(255, 255, 255, 0.1)`

### 3.2 Icon Box Standar
Kotak pembungkus ikon di kartu dan seksi harus menggunakan rasio kontras berikut:
- **Ukuran:** `w-11 h-11 rounded-lg` (atau `w-12 h-12 rounded-xl` untuk seksi utama).
- **Light Mode:** `bg-cyan-50 border border-cyan-200/80 text-cyan-600`
- **Dark Mode:** `dark:bg-cyan-950/40 dark:border-cyan-500/30 dark:text-cyan-400`

---

## 4. Standar Hero Section Lintas Halaman

Hero section di setiap halaman (Home, Services, Portfolio, Resume) mengikuti struktur 2-kolom:

```tsx
<section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
  <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
      
      {/* Kolom Kiri: Teks & Aksi */}
      <div className="max-w-2xl">
        <Badge variant="neutral" dot dotColor="bg-emerald-500" size="md" className="mb-8">
          Status / Kategori
        </Badge>
        <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
          Judul Halaman
        </h1>
        <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)]">
          Deskripsi pengantar halaman.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary" size="lg" href="/contact">Aksi Utama</Button>
          <Button variant="secondary" size="lg" href="#explore">Aksi Sekunder</Button>
        </div>
      </div>

      {/* Kolom Kanan: Karakter 3D & 4 Floating Badges */}
      <div className="relative flex items-center justify-center">
        {/* Karakter dengan smooth mask fade */}
        <div style={{ maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0) 98%)" }}>
          <Image src="/aset.png" alt="..." width={583} height={875} priority />
        </div>
        {/* 4 Floating Badges (animate-float-1 s/d animate-float-4) */}
      </div>

    </div>
  </div>
</section>
```

> **Catatan Shadow Aset:**
> Ketika pengguna meminta *hilangkan shadow* (seperti pada Services), **jangan menyertakan** elemen ambient blur glow (`blur-3xl bg-cyan-500/10`) di belakang avatar agar aset tampil bersih dan menyatu dengan latar belakang halaman.

---

## 5. Standar Kartu & Kontainer

- **Border Radius:** `rounded-xl` (atau `rounded-2xl` untuk kartu besar).
- **Padding:** `p-6` standar, `p-8` untuk seksi luas.
- **Background & Border:**
  `border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors duration-200`
  atau untuk kartu melayang (floating badges):
  `bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)]`
- **Dilarang Keras:** Menambahkan gradien navy (`from-[#0e172a] to-[#0a1324]`), sudut asimetris ekstrem (`rounded-tl-[3rem]`), atau bayangan gelap pekat tak beraturan.

---

## 6. Standar Tombol & Kontrol Interaktif

Menggunakan komponen bersama [`Button`](file:///c:/laragon/www/masdika/apps/web/src/components/ui/Button.tsx):
- **Primary:** `variant="primary"` (Background Cyan `#22d3ee`, teks gelap `#020617`, font tebal).
- **Secondary:** `variant="secondary"` (Background permukaan, border subtle, teks primer).
- **Ukuran:**
  - Hero Actions: `size="lg"`
  - Formulir & Tombol Seksi: `size="md"`
  - Utility / Compact: `size="sm"`

---

## 7. Spacing, Layout & Container Grid

- **Lebar Maksimal Kontainer:** `max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8`
- **Padding Vertikal Halaman:** `pt-24 md:pt-32 pb-20`
- **Jarak Antar Seksi (Vertical Gap):** `py-16 lg:py-24`
- **Grid Seksi Konten:**
  - 3 Kolom: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8`
  - 4 Kolom: `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8`

---

## 8. Component Inventory & Detailed Specifications

This section defines the UI components that must be audited, redesigned, reused, or implemented.

Before making changes, inspect the existing codebase and identify which components already exist. Extend or refactor existing components when appropriate. Do not create duplicate components or invent product features that are not supported by the current application.

The component inventory below is a design-system specification, not permission to add every component to every page.

### 8.1 Global Application Shell

#### A. Application Header

**Purpose:** Provide primary navigation, brand identity, and global actions.

**Required elements:**
- Masdika logo and brand name, using the existing approved assets.
- Primary navigation links based on existing application routes.
- Theme switcher.
- Existing account, profile, or utility actions when applicable.
- Mobile navigation trigger when required.

**Visual requirements:**
- Use the active theme's surface and text tokens.
- Maintain consistent horizontal padding and vertical alignment.
- Use a subtle bottom border when it helps separate the header from content.
- Avoid excessive blur, gradients, floating effects, and decorative backgrounds.
- Do not add navigation links that do not correspond to actual routes.

**States:**
- Default.
- Hover.
- Active route.
- Keyboard focus.
- Mobile navigation expanded.
- Disabled actions, when applicable.

**Responsive behavior:**
- Desktop: show primary navigation inline when space allows.
- Mobile: collapse navigation into an accessible menu.
- Prevent logo and navigation actions from overflowing or overlapping.

#### B. Sidebar Navigation

Implement only if the existing product uses a sidebar or requires one for its actual information architecture.

**Required elements:**
- Navigation groups, when necessary.
- Route links with clear labels.
- Active route indicator.
- Optional collapse/expand control if supported by the existing product.

**Requirements:**
- Active state must be distinguishable without relying only on color.
- Icon and label alignment must remain consistent.
- Collapsed navigation must provide accessible names or tooltips.
- Preserve navigation hierarchy and existing routes.

#### C. Breadcrumbs

Implement on nested pages where users benefit from knowing their current location.

**Requirements:**
- Reflect the actual route hierarchy.
- Parent items must be navigable.
- The current page must be clearly identified.
- Hide or simplify breadcrumbs on pages where they add no value.

#### D. Page Header

**Required elements:**
- Page title.
- Optional description.
- Optional breadcrumb.
- Optional primary action.
- Optional secondary actions relevant to the page.

**Requirements:**
- Use a consistent title and description hierarchy.
- Keep page-level actions aligned with the title block.
- Stack actions below the title on narrow screens when necessary.
- Do not add generic badges or decorative icons to every page title.

---

### 8.2 Theme System

#### A. Theme Switcher

**Required behavior:**
- Support Light and Dark modes.
- Support System preference if appropriate for the existing product.
- Persist manually selected preferences.
- Avoid a flash of the incorrect theme during initial load.
- Update all themed components together.

**States:**
- Light selected.
- Dark selected.
- System selected, if supported.
- Keyboard focus.
- Disabled, only when genuinely necessary.

**Requirements:**
- Use an accessible button or menu with a clear accessible name.
- Provide a visible indication of the current selection.
- Do not rely exclusively on a sun/moon icon to communicate the selected theme.
- Respect the operating system preference when System mode is selected.

#### B. Design Tokens

All themed components must consume shared semantic tokens.

Required token groups:
- Background.
- Surface.
- Elevated surface.
- Hover surface.
- Border.
- Primary text.
- Secondary text.
- Muted text.
- Brand cyan.
- Primary action.
- Brand blue.
- Accent orange.
- Success.
- Warning.
- Danger.
- Focus ring.
- Overlay.

Do not duplicate separate hardcoded color definitions in individual components unless there is a documented exception.

---

### 8.3 Buttons

Implement a shared Button component rather than separate, inconsistently styled buttons across the application.

#### Variants

**Primary**
- Used for the main action within a section or workflow.
- Cyan background with dark text.
- Must be visually prominent without glow effects.

**Secondary**
- Used for important supporting actions.
- Neutral surface or transparent background with a visible border.

**Tertiary / Ghost**
- Used for low-emphasis actions.
- Minimal background treatment.
- Must remain discoverable and accessible.

**Destructive**
- Used for deletion or other destructive actions.
- Uses semantic danger styling.
- Important destructive actions should require confirmation when appropriate.

**Link**
- Used when the action should visually behave like a link.

#### Sizes

- Small: compact utility actions.
- Medium: standard controls and forms.
- Large: prominent actions where the layout requires them.

Use consistent height, horizontal padding, typography, and icon spacing within each size.

#### Required states

- Default.
- Hover.
- Active/pressed.
- Focus-visible.
- Disabled.
- Loading.

#### Behavior requirements

- Prevent duplicate submissions while a submission is in progress.
- Show a loading indicator when an asynchronous action is running.
- Preserve readable button labels.
- Icon-only buttons must include accessible names.
- Do not use a primary button for every action in a section.

---

### 8.4 Icon Button

**Purpose:** Provide compact actions such as opening a menu, closing a dialog, or accessing utility controls.

**Requirements:**
- Use the project's existing icon library.
- Keep icon stroke weight and visual size consistent.
- Provide hover, active, and focus-visible states.
- Use an accessible name for every icon-only control.
- Provide a tooltip where an icon's meaning is not immediately clear.
- Use a sufficiently large interactive area even when the icon itself is small.

Do not add icons to every label or heading for decoration.

---

### 8.5 Form Components

All form controls must use consistent typography, spacing, border styling, focus behavior, and error presentation.

#### A. Text Input

**Elements:**
- Visible label.
- Input field.
- Optional helper text.
- Optional validation message.
- Optional leading or trailing icon when functional.

**States:**
- Default.
- Hover.
- Focus.
- Filled.
- Disabled.
- Read-only.
- Error.
- Success, where useful.

**Requirements:**
- A placeholder must not replace a visible label.
- Validation messages must explain the problem.
- Focus must be clearly visible in both themes.
- Preserve user input when validation fails.

#### B. Textarea

- Use the same visual language as Text Input.
- Support multiline content.
- Define sensible minimum and maximum heights where appropriate.
- Avoid unexpected resizing that breaks the layout.

#### C. Select / Dropdown

- Use for selecting from a defined list of options.
- Clearly indicate the selected option.
- Support keyboard interaction.
- Show disabled and error states where relevant.
- Ensure the menu uses the correct theme and stacking order.

#### D. Checkbox

- Use for independent binary or multiple selections.
- Include checked, unchecked, disabled, and focus states.
- Associate each checkbox with a visible label.
- Do not rely only on a background color to indicate selection.

#### E. Radio Group

- Use when only one option can be selected from a group.
- Make the group label and individual option labels clear.
- Preserve native or equivalent keyboard interaction.

#### F. Toggle / Switch

- Use for immediate on/off preferences, not for actions that require a separate submission unless the product workflow demands it.
- Clearly identify the setting controlled by the switch.
- Distinguish on and off states using more than color alone.

#### G. Form Layout

- Group related fields.
- Keep label, input, helper text, and error message close together.
- Use consistent vertical spacing.
- Place the submit action at a predictable location.
- Prevent layout shifts when validation messages appear.

---

### 8.6 Cards and Surfaces

Cards are containers for related information, not a default wrapper for every section.

#### A. Standard Card

**Elements:**
- Optional title.
- Optional description.
- Main content.
- Optional footer or actions.

**Requirements:**
- Use the correct surface token.
- Use a subtle border when needed.
- Apply consistent internal padding.
- Do not use unnecessary gradients, decorative icons, or shadows.

#### B. Interactive Card

Use only when the entire card represents a meaningful action or destination.

**Requirements:**
- Provide hover and focus-visible states.
- Make the interaction discoverable.
- Avoid nesting multiple competing click targets inside the same interactive area.
- Use appropriate link or button semantics.

#### C. Stat / Metric Card

Implement only on pages where numeric summaries are meaningful to the product.

**Elements:**
- Metric label.
- Main value.
- Optional unit.
- Optional comparison or trend.
- Optional supporting description.

**Requirements:**
- Never invent metrics or sample values for production.
- Trend colors must communicate actual status.
- Do not use a different accent color for every metric card.
- Ensure numeric values remain readable on narrow screens.

#### D. Section Container

Use a plain section with appropriate spacing when a card would add unnecessary visual weight.

Not every content group requires a border, background, or rounded container.

---

### 8.7 Navigation and Menus

#### A. Dropdown Menu

- Must open from its associated trigger.
- Must close when the user selects an action or dismisses the menu as appropriate.
- Must support keyboard navigation.
- Must handle focus and stacking correctly.
- Must follow the active theme.

#### B. Tabs

Use when switching between related views within the same context.

**Requirements:**
- Show the active tab clearly.
- Preserve the expected keyboard behavior.
- Avoid using tabs as a substitute for primary navigation.
- On mobile, allow a usable layout without clipped labels.

#### C. Pagination

Implement when a list or data table genuinely requires multiple pages.

**Requirements:**
- Indicate the current page.
- Provide accessible previous/next controls.
- Disable unavailable navigation actions.
- Preserve relevant query or filter state where appropriate.

---

### 8.8 Dialogs, Drawers, and Overlays

#### A. Modal / Dialog

**Elements:**
- Title.
- Optional description.
- Main content.
- Close control when appropriate.
- Footer actions.

**Requirements:**
- Use for focused tasks requiring user attention.
- Support Escape to close when safe and appropriate.
- Manage keyboard focus correctly.
- Prevent interaction with the background when modal behavior is required.
- Restore focus to the triggering control after dismissal.
- Use a confirmation step for consequential destructive actions when appropriate.

#### B. Drawer

Use for contextual navigation, filters, or supporting content when a side panel is more suitable than a modal.

**Requirements:**
- Use responsive sizing.
- Prevent content overflow.
- Support accessible focus management.
- Keep dismissal behavior predictable.

#### C. Tooltip

- Use for short explanations of controls.
- Never place essential information exclusively inside a tooltip.
- Avoid tooltips on elements whose purpose is already obvious.
- Support keyboard and pointer interaction.

---

### 8.9 Feedback and Status Components

#### A. Toast / Notification

Use for brief feedback after an action.

**Types:**
- Success.
- Error.
- Warning.
- Informational.

**Requirements:**
- Use semantic colors consistently.
- Provide readable text and an optional relevant action.
- Avoid excessive stacking of notifications.
- Do not automatically dismiss critical errors before users can read them.
- Ensure announcements are accessible where appropriate.

#### B. Alert Banner

Use for persistent or important contextual information.

**Elements:**
- Status or severity indicator.
- Short title where needed.
- Explanation.
- Optional action or dismissal control.

Do not use alert styling for ordinary descriptive text.

#### C. Badge / Chip

Use for compact labels, statuses, or categories.

**Requirements:**
- Keep labels short.
- Avoid excessive use of badges.
- Do not use orange or cyan purely to decorate ordinary metadata.
- Ensure status remains understandable without color.

#### D. Progress Indicator

Use when an operation has meaningful progress or loading duration.

- Use a spinner for indeterminate short operations.
- Use a progress bar when measurable progress exists.
- Never fabricate progress percentages.

---

### 8.10 Data Display Components

Implement these only where supported by existing product requirements.

#### A. Table

**Elements:**
- Column headings.
- Data rows.
- Optional row actions.
- Optional sorting or pagination when supported.

**Requirements:**
- Keep alignment consistent.
- Use clear header styling.
- Avoid excessive vertical borders.
- Support responsive overflow or an appropriate mobile alternative.
- Provide empty, loading, and error states.

#### B. List

- Use consistent item spacing.
- Separate items only when it improves readability.
- Avoid turning every list item into an individual card.
- Use semantic list markup where appropriate.

#### C. Chart

- Use only when actual data benefits from visualization.
- Follow the same typography and theme tokens.
- Use accessible labels and a text alternative where appropriate.
- Do not rely exclusively on color to distinguish series.
- Never invent data for production charts.

---

### 8.11 Content States

Every data-driven page must define the states relevant to its actual behavior.

#### Loading

- Preserve the expected layout when possible.
- Use skeletons only when they meaningfully represent the incoming content structure.
- Avoid unnecessary animated placeholders.

#### Empty

- Explain why no content is available when the reason is known.
- Provide a relevant next step when possible.
- Do not display generic illustrations without purpose.

#### Error

- Explain the failure in understandable language.
- Preserve recoverable user input.
- Provide retry or recovery actions when appropriate.
- Avoid exposing internal stack traces or sensitive implementation details.

#### Success

- Confirm meaningful completed actions.
- Avoid redundant success messages for trivial interactions.
- Provide a next step only when useful.

---

### 8.12 Footer

Implement based on the existing product structure.

Possible elements:
- Brand identity.
- Relevant navigation links.
- Legal links.
- Copyright information.
- Existing social or contact links.

Do not invent company details, legal pages, or social links.

Keep the footer visually quieter than the primary content.

---

## 9. Component States Matrix

Every interactive component must be reviewed against the states applicable to it.

| Component | Default | Hover | Focus | Active | Disabled | Loading | Error |
|---|---|---|---|---|---|---|---|
| Button | Required | Required | Required | Required | Required | If async | N/A |
| Icon button | Required | Required | Required | Required | If applicable | If async | N/A |
| Text input | Required | Required | Required | N/A | Required | If applicable | Required |
| Select | Required | Required | Required | Required | Required | If async | Required |
| Checkbox | Required | If custom | Required | Required | Required | N/A | If applicable |
| Navigation link | Required | Required | Required | Required | If applicable | N/A | N/A |
| Card | Required | If interactive | If interactive | If interactive | If applicable | If data-driven | If data-driven |
| Dialog | Open/closed | N/A | Required | N/A | N/A | If async | If applicable |
| Toast | Required | If interactive | If interactive | N/A | N/A | N/A | Error variant |
| Table | Required | If interactive | If interactive | If selectable | If applicable | Required | Required |

All applicable states must be checked in both light and dark modes.

---

## 10. Component Architecture Rules

- Reuse existing project components before introducing new ones.
- Establish a single source of truth for design tokens.
- Use shared primitives for buttons, inputs, cards, and overlays.
- Keep business logic separate from visual styling where the existing architecture supports it.
- Avoid duplicating the same component with slightly different styling across pages.
- Prefer semantic variants such as `primary`, `secondary`, `danger`, and `ghost` instead of arbitrary per-page colors.
- Avoid excessive component abstraction when components do not share behavior or visual requirements.
- Do not install a new UI library without first checking existing dependencies and project conventions.
- Preserve existing routes, business logic, API contracts, and user workflows unless a change is explicitly approved.

## 11. Component Audit Checklist

Before implementation:

- [ ] Inspect all existing routes and page layouts.
- [ ] Identify shared components and duplicated patterns.
- [ ] Identify existing theme and token implementations.
- [ ] Map each existing component to this inventory.
- [ ] Mark components as reuse, refactor, implement, or out of scope.
- [ ] Identify missing interactive states.
- [ ] Confirm responsive behavior and accessibility requirements.
- [ ] Identify components that should not be added because the product does not need them.

Do not implement the entire inventory blindly. The actual application and its user flows determine which components belong in scope.

## 12. Component Acceptance Criteria

A component is ready when:

- It follows the shared design tokens.
- It has a clear and consistent hierarchy.
- It supports all relevant interaction states.
- It works in both light and dark themes.
- It is keyboard accessible where interactive.
- It behaves correctly on mobile and desktop.
- It does not introduce unnecessary decoration.
- It preserves existing functionality.
- It has been tested in the context of the actual page, not only in isolation.