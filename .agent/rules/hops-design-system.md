# HOPS Design System — Mandatory UI/UX Compliance Standard

## CRITICAL: This rule applies to EVERY component, page, modal, button, form, table, tooltip, badge, and text element built for HOPS. No exceptions.

---

## 1. Approved Color Palette (STRICT — No other colors)

| Token | Hex | Usage |
|---|---|---|
| `navy-blue` | `#002B5B` | TopBar bg, active text, headings, borders |
| `cobalt-blue` | `#0047AB` | Primary buttons, active states, links, sparklines, active sidebar item bg |
| `action-red` | `#E31837` | Alerts, errors, destructive actions, overdue badges, notification dots |
| `sidebar-dark` | `#001e42` | SideMenu background only |
| `white` | `#FFFFFF` | Main content area background — ALWAYS white, never grey |
| `slate-50` | `#F8FAFC` | Dashboard panel backgrounds, alternating rows |
| `slate-100` | `#F1F5F9` | Dividers, card borders, subtle separators |
| `slate-400` | `#94A3B8` | Placeholder text, disabled states, secondary icons |
| `slate-500` | `#64748B` | Secondary labels, captions, timestamps |
| `slate-700` | `#334155` | Body text, table cell content |
| `emerald-500` | `#22C55E` | Success states, positive KPI trends, HR module accent |
| `amber-500` | `#F59E0B` | Warning states, Finance module accent |
| `violet-500` | `#8B5CF6` | Operations module accent |
| `rose-500` | `#F43F5E` | Compliance module accent |
| `sky-500` | `#0EA5E9` | CEO Playground module accent |

**FORBIDDEN:** Any random Tailwind color not in this list (e.g. `blue-500`, `gray-300`, `indigo-600`). Always map to the approved tokens above.

---

## 2. Typography (Inter — Always)

```
Font: Inter (Google Fonts, already imported in globals.css)
Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
Rendering: antialiased always
```

| Role | Size | Weight | Color |
|---|---|---|---|
| Page/Module Title | `text-base` (16px) | `font-bold` (700) | `text-navy-blue` |
| Section Header | `text-xs` uppercase tracking-widest | `font-semibold` (600) | `text-slate-400` |
| Card Label | `text-xs` | `font-medium` (500) | `text-slate-500` |
| Card Value / KPI | `text-2xl` | `font-bold` (700) | `text-navy-blue` |
| Body / Table Cell | `text-sm` | `font-normal` (400) | `text-slate-700` |
| Caption / Timestamp | `text-xs` | `font-normal` (400) | `text-slate-400` |
| Button Text | `text-sm` | `font-semibold` (600) | depends on variant |
| Tab Label | `text-sm` | `font-medium` (500) | active: `text-navy-blue`, inactive: `text-slate-500` |
| Sidebar Module Label | `text-sm` | `font-medium` (500) | active: `text-white`, inactive: `text-white/70` |
| Sidebar Bottom Label | `text-xs` | `font-medium` (500) | `text-white/40` |

---

## 3. Layout Structure (IMMUTABLE)

```
┌──────────────────────────────────────────────────────────┐
│  TOPBAR  h-14  bg-navy-blue  fixed  z-50  w-full         │
├────┬─────────────────────────────────────────────────────┤
│    │  MODULE HEADER BAR  (icon + module name)            │
│ S  ├─────────────────────────────────────────────────────┤
│ I  │  SUB-MODULE TABS  (horizontal, border-b)            │
│ D  ├──────────────────┬──────────────────────────────────┤
│ E  │  LEFT PANEL      │  RIGHT PANEL                     │
│    │  Process Flow    │  KPI Dashboard                   │
│ w  │  w-[340px]       │  flex-1                          │
│ -  │  bg-white        │  bg-slate-50                     │
│ 1  │  border-r        │  overflow-y-auto                 │
│ 4  │                  │                                  │
└────┴──────────────────┴──────────────────────────────────┘
```

- **TopBar**: `h-14`, `bg-navy-blue`, fixed, `z-50`
- **SideMenu collapsed**: `w-14`, `bg-[#001e42]`, icons only
- **SideMenu expanded**: `w-56`, click-toggle (NOT hover)
- **Main content**: `pt-14 pl-14`, fills `100vh`, `overflow-hidden`
- **Main content area background**: ALWAYS `bg-white` — never grey, never slate

---

## 4. Component Specifications

### Buttons
```
Primary:   bg-cobalt-blue text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-cobalt-blue/80 transition-colors shadow-sm
Danger:    bg-action-red text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-action-red/80
Ghost:     text-slate-600 font-medium text-sm px-3 py-2 rounded-lg hover:bg-slate-100
Icon-only: w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center
```

### Cards (KPI / Info)
```
bg-white rounded-xl border border-slate-100 shadow-sm p-4
hover:shadow-md transition-shadow
```

### Modals / Drawers
```
Overlay:  bg-black/40 backdrop-blur-sm
Panel:    bg-white rounded-2xl shadow-2xl border border-slate-100
Header:   px-6 py-4 border-b border-slate-100 text-navy-blue font-bold
Body:     px-6 py-4
Footer:   px-6 py-4 border-t border-slate-100 flex justify-end gap-3
```

### Form Inputs
```
Input:    w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700
          focus:outline-none focus:ring-2 focus:ring-cobalt-blue/30 focus:border-cobalt-blue transition-all
Label:    text-sm font-medium text-slate-700 mb-1 block
Error:    text-xs text-action-red mt-1
Helper:   text-xs text-slate-400 mt-1
```

### Tables
```
Container: bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden
Header:    bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-widest px-4 py-3
Row:       border-t border-slate-50 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors
```

### Badges / Status Pills
```
Success:  bg-emerald-50 text-emerald-600 text-xs font-semibold px-2 py-0.5 rounded-full
Warning:  bg-amber-50 text-amber-600 text-xs font-semibold px-2 py-0.5 rounded-full
Error:    bg-red-50 text-action-red text-xs font-semibold px-2 py-0.5 rounded-full
Info:     bg-cobalt-blue/10 text-cobalt-blue text-xs font-semibold px-2 py-0.5 rounded-full
Neutral:  bg-slate-100 text-slate-500 text-xs font-semibold px-2 py-0.5 rounded-full
```

### Toast Notifications
```
Success: bg-white border-l-4 border-emerald-500 shadow-lg rounded-lg px-4 py-3
Error:   bg-white border-l-4 border-action-red shadow-lg rounded-lg px-4 py-3
Info:    bg-white border-l-4 border-cobalt-blue shadow-lg rounded-lg px-4 py-3
Position: fixed bottom-4 right-4 z-[100]
```

### Section Headers (inside panels)
```
text-xs font-semibold text-slate-400 uppercase tracking-widest
```

### Dividers
```
border-t border-slate-100  (horizontal)
border-r border-slate-100  (vertical)
```

---

## 5. Spacing & Radius

| Element | Border Radius |
|---|---|
| Cards, Panels | `rounded-xl` (12px) |
| Buttons | `rounded-lg` (8px) |
| Inputs | `rounded-lg` (8px) |
| Badges / Pills | `rounded-full` |
| Modals | `rounded-2xl` (16px) |
| Icon containers | `rounded-xl` (12px) |
| Sidebar items | `rounded-lg` (8px) |
| Avatar | `rounded-full` |

| Area | Padding |
|---|---|
| Card internal | `p-4` or `p-5` |
| Panel internal | `px-5 py-4` or `px-6 py-5` |
| Table cells | `px-4 py-3` |
| Modal body | `px-6 py-4` |
| Button | `px-4 py-2` (standard), `px-3 py-1.5` (compact) |

---

## 6. Shadows & Elevation

```
Resting card:   shadow-sm  (0 1px 2px rgba(0,0,0,0.05))
Hover card:     shadow-md  (0 4px 6px rgba(0,0,0,0.07))
Modal / Drawer: shadow-2xl
TopBar:         shadow-lg + border-b border-white/10
Sidebar:        no shadow (dark bg provides separation)
Active button:  shadow-sm shadow-cobalt-blue/25
```

---

## 7. Micro-interactions & Transitions

- **All interactive elements**: `transition-colors duration-150` minimum
- **Sidebar expand/collapse**: `transition-all duration-300 ease-in-out`
- **Cards on hover**: `hover:shadow-md transition-shadow`
- **Buttons on hover**: opacity or color shift, never scale
- **Tab active indicator**: absolute positioned `h-0.5 bg-cobalt-blue` underline
- **Input focus**: `focus:ring-2 focus:ring-cobalt-blue/30 focus:border-cobalt-blue`
- **Modal open**: fade-in + slide-up (`animate-in fade-in slide-in-from-bottom-4`)
- **Page transitions**: `animate-in fade-in duration-300`

---

## 8. Icons

- **Library**: Lucide React — ONLY. No other icon libraries.
- **Standard size**: `w-5 h-5` (body), `w-4 h-4` (compact/inline), `w-6 h-6` (prominent)
- **Color**: Always inherit from parent or use approved palette tokens
- **Never**: raw emoji as icons in UI components

---

## 9. Language & Copy (UX Voice)

- **Second person always**: "Your Pipeline", "Add your client", "Review your SLA"
- **Conversational labels**: "Date of Birth" not "DOB"; "Monthly Revenue" not "MRR_VAL"
- **Action buttons**: Verb-first — "Save Changes", "Add Account", "Run Report"
- **Empty states**: Teach the user — "No accounts yet. Add your first account to get started."
- **Confirmation dialogs**: Specific — "Delete this playbook? This cannot be undone." not "Are you sure?"

---

## 10. Do's and Don'ts

| ✅ DO | ❌ DON'T |
|---|---|
| White main content area | Grey or slate main backgrounds |
| `rounded-xl` for cards | Sharp corners (`rounded-none`) |
| Inter font | System fonts or serif fonts |
| Lucide icons | Heroicons, FontAwesome, emoji |
| `cobalt-blue` for primary actions | `blue-500`, `indigo-500` |
| `action-red` for errors/alerts | `red-500`, `rose-500` |
| Subtle shadows for depth | Heavy drop shadows |
| Compact section headers (xs, uppercase) | Large bold section headers |
| `transition-colors` on all interactive elements | Static hover states |
| Toast notifications for every save | Alert boxes / browser alerts |
| Consistent 4px spacing grid | Arbitrary pixel values |
