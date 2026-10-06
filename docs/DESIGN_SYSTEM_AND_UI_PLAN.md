# Design System & UI Plan — BoA Branch Staff Performance Management System

> **Living document.** Visual and UI source of truth. Update when a UI decision is made or changed.
> Companion: [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). Source requirements are read-only.
>
> Implementation: tokens in `client/src/index.css` (`@theme`), primitives in `client/src/components/ui/`.

---

## 1. Visual Direction

**Goal:** an internal banking tool that communicates trust, clarity, and reliability. Calm, dense
enough for daily operational use, strong information hierarchy, minimal decoration.

**Brand reference (public information only):** the Bank of Abyssinia logo is publicly described as a
yellow *Adey Abeba* flower on a black square. We therefore anchor the palette on **near-black ink**
and a **warm gold/yellow accent**.

> [!IMPORTANT]
> No official BoA brand guidelines (hex values, typefaces, logo usage rules) were supplied. All
> colors, fonts, and the brand mark below are **implementation choices inspired by the public logo**,
> not official specifications. Replace with official values when provided by the bank.

Principles:
1. **Ink for authority, gold for emphasis.** Gold is used sparingly (active nav, brand mark, key highlights) — never for large surfaces or body text.
2. **Borders over shadows.** Flat white surfaces on a warm-gray canvas, 1px borders, minimal shadow.
3. **Numbers first.** Figures use tabular numerals, right-aligned in tables, with units shown.
4. **Status is never color-only.** Every status has a label (and usually an icon).
5. **No decoration for its own sake.** No heavy gradients, glassmorphism, emoji, or oversized cards.

---

## 2. Brand Treatment & Logo

- `BrandMark` component (`components/layout/BrandMark.tsx`): black rounded square containing a gold
  "BoA" monogram + wordmark "Bank of Abyssinia" and product line "Staff Performance".
- **It is a placeholder, not a recreation of the official logo.** When the official asset is
  supplied, place it in `client/src/assets/brand/` and swap inside `BrandMark` only.
- Product name in UI: **"Staff Performance"** with subtitle "Branch Performance Management".

## 3. Color System (implementation choice)

| Token | Hex | Usage |
|---|---|---|
| `ink-950` | `#0E0E10` | Sidebar background, auth brand panel |
| `ink-900` | `#17171A` | Primary buttons, headings |
| `ink-800` | `#232327` | Primary hover, sidebar hover |
| `ink-700` | `#2F2F35` | Sidebar borders/dividers |
| `ink-500` | `#6B6B75` | Sidebar secondary text |
| `gold-50` | `#FFF9E8` | Subtle highlight backgrounds |
| `gold-100` | `#FEF0C7` | Selected row/tab tint |
| `gold-300` | `#F9CC55` | Sidebar active text/icon |
| `gold-400` | `#F5B82A` | Brand mark, focus ring on dark |
| `gold-500` | `#EBA312` | Accent bars, chart primary series |
| `gold-700` | `#9C6500` | Gold text on light backgrounds (AA on white for ≥14px semibold) |
| `canvas` | `#F5F5F2` | App background |
| neutrals | Tailwind `zinc` | Text (`zinc-900/600/500`), borders (`zinc-200`), fills (`zinc-50/100`) |

Semantic colors (deliberately **not** amber, to avoid confusion with the gold brand accent):

| Meaning | Text | Background | Border | Used for |
|---|---|---|---|---|
| Success | `emerald-700` | `emerald-50` | `emerald-200` | On Target, Active, Approved |
| Attention | `orange-700` | `orange-50` | `orange-200` | Needs Attention, Pending |
| Danger | `red-700` | `red-50` | `red-200` | Below Target, Rejected, errors |
| Info | `sky-700` | `sky-50` | `sky-200` | Informational notices |
| Neutral | `zinc-600` | `zinc-100` | `zinc-200` | Not Submitted, Inactive, Draft, Unrated |
| Validation | `violet-700` | `violet-50` | `violet-200` | "Pending validation" (rules not approved) |

Chart palette: `gold-500` (primary series), `ink-900` (comparison), `zinc-300` (gridlines/reference),
status colors for categorical breakdowns.

## 4. Typography

- **Inter** (Google Fonts) with **Noto Sans Ethiopic** fallback for Amharic names; system sans fallback.
- Base UI text 14px (`text-sm`); body copy in long text 15px.
- Scale: page title `text-xl/2xl font-semibold`; section title `text-base font-semibold`; label `text-sm font-medium`; meta `text-xs text-zinc-500`; KPI figures `text-2xl/3xl font-semibold tabular-nums`.
- Letter-spacing: `tracking-tight` on titles only. Uppercase only for small overline labels (`text-[11px] tracking-wider`).

## 5. Iconography

Lucide React only, 16px in controls/tables, 18–20px in nav and headers, `strokeWidth` default (2) — 1.75 in nav. Icons accompany labels; icon-only buttons always have `aria-label`.

Canonical icons: Dashboard `LayoutDashboard` · KPI entry `ClipboardPenLine` · History `History` · Performance `TrendingUp` · Feedback `MessageSquareText` · Announcements `Megaphone` · Chat `MessagesSquare` · Profile `UserRound` · Staff `Users` · KPIs `Target` · Reports `FileBarChart` · Settings `Settings`.

## 6. Spacing, Radius, Shadows

- 4px base grid (Tailwind spacing). Page padding: 16px mobile, 24px tablet, 32px desktop. Card padding 20px (16px mobile). Section gap 24px.
- Radius: controls `rounded-md` (6px), cards/dialogs `rounded-lg` (8px), badges `rounded-full` pill only for small status chips. No `rounded-2xl+`.
- Shadows: cards `shadow-xs` (near-invisible) + border; dropdowns/dialogs `shadow-lg`. No colored glows.
- Max content width 1440px.

## 7. Components

| Component | Spec |
|---|---|
| **Button** | Variants: `primary` (ink-900/white), `secondary` (white, zinc-300 border), `ghost`, `danger` (red-700), `accent` (gold-400/ink text — reserved for a page's single key CTA e.g. *Submit KPIs*). Sizes `sm` 32px, `md` 36px, `lg` 44px (auth). `loading` shows spinner & disables. |
| **Input / Select / Textarea** | 36px height, white, zinc-300 border, ink focus ring; error state red border + message; disabled zinc-50. Numeric inputs right-aligned with unit suffix. |
| **Field** | Label (with required `*`), control, hint, error (`role="alert"`), linked by `aria-describedby`. |
| **Card** | White, border zinc-200, rounded-lg; optional header (title, description, actions) and footer. |
| **Badge** | Small pill, semantic tones above. `StatusBadge` maps PerformanceStatus/AccountStatus → tone + label + dot. |
| **Table** | Header zinc-50, 12px uppercase-ish medium labels; rows 44–52px; numbers right-aligned tabular; row hover zinc-50; horizontal scroll container on small screens; low-priority columns hidden < md. |
| **Alert / Notice** | Left icon, title, body; tones info/success/warning/danger/validation. `PendingValidationNotice` uses violet validation tone. |
| **Dialog** | Native `<dialog>` + `showModal()` (focus trap, Esc). Form dialogs use `closedby="closerequest"` semantics (no backdrop dismiss to protect input); info dialogs allow backdrop click (with JS fallback). Header/title, body, footer actions right-aligned (primary last). Full-screen sheet on mobile. |
| **ConfirmDialog** | Title, consequence text, cancel + confirm (danger variant for destructive). |
| **Tabs / SegmentedControl** | Underline tabs for page sections; segmented control for period (Daily/Weekly/Monthly/Quarterly). |
| **ProgressBar** | 6px track zinc-200; fill by status tone; values >100% capped visually, figure shows real value. |
| **Toast** | Bottom-right (top on mobile), auto-dismiss 4s, `role="status"`. |
| **Avatar** | Initials on zinc-200 (gold-100 for current user). |

### KPI / performance indicators
- **StatCard**: label, big figure, sub-text/delta, optional icon in a neutral square. Not more than 4 per row.
- **Performance %** always paired with `StatusBadge`. `null` percent renders "—" with "Unrated"/"Not submitted".
- Weight shows as `Weight 20%` meta only if defined.
- Rule-status chip "Pending validation" next to any calculated figure whose rule is not approved.

## 8. Navigation

- **Sidebar (≥ lg / 1024px):** fixed 256px, `ink-950`. Brand mark top, role label ("Staff portal" / "Manager portal"), grouped nav, user summary at bottom. Active item: `ink-800` background, gold-300 icon/text, 3px gold-400 left bar. Badges for counts (unread feedback, pending approvals).
- **Mobile/tablet (< lg):** sidebar becomes an off-canvas drawer (native dialog) opened from a menu button in the top bar.
- **Top bar:** white, 60px, border-bottom. Left: menu button (mobile) + breadcrumb/page context; right: branch name chip (≥ md), notifications shortcut to announcements, user menu (profile/settings, sign out).
- **Breadcrumbs:** used on nested pages only (e.g. Staff › Staff detail).

## 9. States

| State | Pattern |
|---|---|
| Loading | Skeleton blocks matching the final layout; buttons show inline spinner. |
| Empty | Centered icon in zinc-100 circle, title, one-line guidance, optional action. |
| Error | Red-toned icon, message from `ApiError`, *Try again* button. |
| Confirmation | Toast for routine success; summary panel for KPI submission; ConfirmDialog before destructive actions. |
| Pending validation | Violet notice explaining the figure is demonstration-only until management approves rules. |

## 10. Responsive Behavior

Breakpoints (Tailwind): `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280.
- Navigation: drawer < lg, fixed sidebar ≥ lg.
- Grids: stat cards 1 col → 2 (sm) → 4 (xl). Dashboard main/aside 1 col → 3-col (`2fr/1fr`) at xl.
- Tables: horizontal scroll + column hiding; staff/KPI-entry lists become stacked cards < md.
- Charts: `ResponsiveContainer`, fixed heights (220–280px), fewer ticks on mobile.
- Dialogs: full-width sheet < sm.
- Chat: two-pane ≥ md; single pane with back button < md.

## 11. Accessibility

WCAG 2.1 AA target: contrast-checked text tokens (no gold text on white below `gold-700`), visible focus rings (ink on light, gold on dark), keyboard-operable everything, semantic landmarks (`header`, `nav`, `main`), one `h1` per page, labels for all inputs, `aria-invalid` + `aria-describedby` on errors, `aria-current="page"` on nav, `aria-live` toasts, reduced-motion respected (transitions ≤150ms, disabled under `prefers-reduced-motion`).

---

## 12. Page Specifications

### Authentication (AuthLayout)
Split layout ≥ lg: left 45% `ink-950` brand panel (brand mark, product statement, three short capability lines, subtle thin-line gold geometric pattern, footer "Internal use only"); right: centered form card (max 420px). < lg: brand panel collapses to a compact dark header strip.
- **Login (AUTH-01):** Employee ID/username, password (show/hide), remember me (labeled "if permitted by bank policy"), Sign in (lg), links: Forgot password, Register. Mock mode: "Demo accounts" box.
- **Register (AUTH-02):** two sections — Personal (full name, phone, email) & Employment (employee ID, position, branch read-only from settings) — then password + confirm with rule hints, declaration checkbox. Submit → AccountStatus.
- **Account Status (AUTH-03):** lookup by employee ID; result card with status badge, reference, timeline (Submitted → Verification* → Manager approval → Active), next action. *Verification method pending validation.*
- **Forgot password:** identifier field → generic confirmation message.

### Staff portal
- **Dashboard (STAFF-01):** greeting + date; "Today's KPI entry" callout (status + CTA); period segmented control; stat row (overall %, status, entries submitted/expected, unread feedback); trend chart (2/3) + KPI status list (1/3); latest feedback + latest announcements.
- **Daily KPI Entry (STAFF-02):** date picker (max today; backdating per policy) + submission status; list of assigned KPI rows (name, description, frequency badge, target + unit, actual input, note toggle, live preview % labeled "preview"); sticky footer bar with completion count and *Review & submit* (accent). Review dialog lists values; submit → success summary. Mobile: stacked cards.
- **KPI History (STAFF-03):** filters (date range, KPI); table (date, KPI, target, actual, %, status, note); mobile cards.
- **Performance (STAFF-04):** period control + reference date; summary stat row; trend chart; per-KPI results table with progress bars; pending-validation notice.
- **Feedback (STAFF-05):** list (unread first, unread dot), master/detail on ≥ lg; context chips (period, KPI).
- **Announcements (STAFF-06):** category filter chips; pinned section; cards with category badge, date, excerpt, expand.
- **Chat (STAFF-07):** see Chat below.
- **Profile (STAFF-07):** identity card (avatar, name, employee ID, position, status); editable contact fields; change password card.

### Manager portal
- **Dashboard (MGR-01):** stat row (active staff, entries today x/y, branch average %, pending approvals); period control; branch trend chart + status breakdown; attention items list (not submitted, below target, pending approvals); staff overview table (top N, link to Performance).
- **Staff Management (MGR-02):** tabs *All staff* / *Pending approval (n)*; search + status filter; table (name+ID, position, status, KPIs assigned, joined); row → detail. Pending tab: cards with submitted details + Approve / Reject.
- **Staff Detail (MGR-06):** breadcrumb; profile header with status + actions (Give feedback, Deactivate/Reactivate); period control; summary stats; trend; KPI results; assigned KPIs; recent entries; feedback history.
- **KPI Management (MGR-03/04):** header with *Add KPI*; search + status filter; table (name/description, target+unit, frequency, weight, assigned, rule status, active toggle, actions: edit, assign). KPI form dialog; Assign dialog with staff checklist + search.
- **Performance Monitoring (MGR-05):** period control + reference date + status filter + search; branch summary strip; staff performance table (staff, overall %, progress, status, submitted/expected) → detail.
- **Reports (FR-16):** period + date range; summary by staff and by KPI tables; export button disabled ("planned").
- **Feedback (MGR-07):** *Give feedback* CTA; filter by staff; history list with read/unread state.
- **Announcements (MGR-08):** tabs Published / Drafts / Archived; create/edit dialog; actions publish, archive, pin.
- **Settings (MGR-10):** sections — Branch information, Performance thresholds (pending validation), KPI entry policy (pending validation), Account (password), Demo data (mock only).

### Chat (both roles)
Two-pane: left 320px conversation list (search, *New message*, branch room pinned, unread badges); right thread (header with participants, messages grouped by day, own messages right-aligned ink bubbles, others white bordered bubbles, composer with Enter-to-send / Shift+Enter newline). Mobile single-pane.

---

## 13. UI Decision Log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-06 | Ink + gold palette | Inspired by publicly described BoA logo (yellow flower on black). Not official. |
| 2026-10-06 | Orange (not amber) for "Needs attention" | Keep gold reserved for brand. |
| 2026-10-06 | Violet "Pending validation" tone | Distinct signal that rules/thresholds are not yet approved. |
| 2026-10-06 | Primary buttons ink, gold accent only for single key CTA | Professional restraint, contrast. |
| 2026-10-06 | Native `<dialog>` for modals and mobile nav drawer | Built-in focus trap/Esc; no dependency. |
| 2026-10-06 | Placeholder BrandMark | Official logo asset not supplied. |
