# Implementation Plan — BoA Branch Staff Performance Management System

> **Living document.** This file is the implementation source of truth for the frontend and the
> frontend↔backend contract. Update it after every major implementation phase.
>
> **Source requirements (read-only, never edit):**
> - [`PROJECT_KICKOFF_BANK_PERFORMANCE_SYSTEM.md`](./PROJECT_KICKOFF_BANK_PERFORMANCE_SYSTEM.md)
> - [`BOA_BRANCH_STAFF_PERFORMANCE_MANAGEMENT_SYSTEM.md`](./BOA_BRANCH_STAFF_PERFORMANCE_MANAGEMENT_SYSTEM.md) (referenced below as **SRS**)
>
> Companion living document: [`DESIGN_SYSTEM_AND_UI_PLAN.md`](./DESIGN_SYSTEM_AND_UI_PLAN.md).

Status legend used throughout: **COMPLETED** · **IN PROGRESS** · **NEXT** · **BLOCKED** ·
**PENDING STAKEHOLDER VALIDATION** · **ASSUMPTION**

---

## 0. Quick Status (read this first)

| Area | Status | Notes |
|---|---|---|
| Requirements review | COMPLETED | Both source docs read in full. |
| Living docs | COMPLETED | This file + design system plan. |
| Frontend scaffold (Vite + React + TS + Tailwind v4) | COMPLETED | `client/` |
| Design tokens + UI component library | COMPLETED | `client/src/index.css`, `client/src/components/ui/` |
| Service/API layer (HTTP + mock adapters) | COMPLETED | `client/src/services/` |
| Auth UI (login, register, status, forgot password) | COMPLETED | Mock-backed; HTTP adapter ready. |
| App shell, role-aware navigation, route guards | COMPLETED | |
| Staff portal screens | COMPLETED (v1) | Dashboard, KPI entry, history, performance, feedback, announcements, chat, profile. |
| Manager portal screens | COMPLETED (v1) | Dashboard, staff, staff detail, KPIs, performance, reports, feedback, announcements, chat, settings. |
| Express backend | NOT STARTED (out of scope for this phase) | `server/` is empty. |
| Real KPI definitions / formulas / thresholds | BLOCKED — PENDING STAKEHOLDER VALIDATION | SRS §2, §16, §29. |
| Automated tests | NEXT | See §17. |

See §19 for the detailed completed / in-progress / remaining breakdown.

---

## 1. Project Overview

A web-based internal application for **one Bank of Abyssinia branch** (SRS §5). Branch staff record
daily KPI achievements; the **Branch Manager** (sole administrator, no separate admin portal) manages
staff, KPIs, performance monitoring (daily/weekly/monthly/quarterly), feedback, announcements, chat,
and settings.

Core modules (Kickoff): Performance Dashboard · KPI Recording · Performance Reports · Management
Feedback · Announcements · Internal Chat · User Roles & Access Control.

**Hard requirement boundary:** the system must not invent BoA KPIs, targets, formulas, weights,
thresholds, or position assignments. All of these are configurable and/or supplied by the backend.

---

## 2. Technology Decisions

| Layer | Choice | Status | Rationale |
|---|---|---|---|
| Frontend build | **Vite** + React 19 + TypeScript | COMPLETED | Project-lead direction. SRS §8 recommended Next.js; SRS §8 explicitly allows final choice by team. SSR is not needed for an authenticated internal SPA. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | COMPLETED | Matches SRS §8. Tokens defined in CSS via `@theme`. |
| Components | **Custom component library** (`src/components/ui`) | COMPLETED | SRS recommends shadcn/ui. We built a small equivalent set by hand to avoid Radix/CLI dependencies; native `<dialog>` provides focus trapping/Esc. Can migrate to shadcn later if desired. |
| Routing | React Router (`react-router-dom` v7, declarative mode) | COMPLETED | |
| Icons | Lucide React | COMPLETED | SRS §8. No emoji in UI. |
| Charts | Recharts | COMPLETED | SRS §8. |
| Class merging | `clsx` | COMPLETED | Only extra utility dependency. |
| Forms/validation | Hand-written validators (`src/utils/validation.ts`) | COMPLETED | Forms are small; avoids react-hook-form/zod for now. Revisit if forms grow. |
| Data fetching | Custom `useAsync` hook | COMPLETED | Keeps deps minimal. TanStack Query is a sensible later upgrade (caching, invalidation). |
| Future backend | Node.js + **Express** + TypeScript | NOT STARTED | Project-lead direction (SRS suggested NestJS). |
| Database | PostgreSQL | NOT STARTED | SRS §8/§17. ORM choice (Prisma suggested by SRS) left to backend developer. |
| Real-time chat | Polling now; Socket.IO later | ASSUMPTION | SRS §8 lists Socket.IO as optional. |

Repository layout: the existing `client/` (frontend) and `server/` (backend, empty) folders are used
instead of SRS §21's `frontend/`/`backend/` naming. `docs/` is shared.

---

## 3. Frontend Architecture

```text
UI (pages/components)  →  hooks (useAsync, useAuth)  →  services/*.service.ts (typed interface)
                                                            ├── HTTP adapter  → apiClient → Express REST API (VITE_API_BASE_URL)
                                                            └── Mock adapter  → services/mock/mockDb (localStorage)
```

Rules:
1. **Components never call `fetch` and never import mock data.** They call service methods only.
2. Every service exports a TypeScript interface + two implementations; the active one is selected
   once in the service file by `env.useMockApi` (`VITE_USE_MOCK_API`).
3. **Business rules (performance %, status) belong to the backend.** The mock adapter contains a
   clearly labeled *demonstration* calculation (`services/mock/mockCalculations.ts`) so the UI can be
   exercised. The UI only *displays* `performancePercent` and `status` returned by services. The only
   client-side calculation is a non-authoritative "preview" on the KPI entry form, labeled as such.
4. Shared types in `src/types/` are the frontend's expected API contract (see §9).

### 3.1 Environment configuration

`client/.env.example`:

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | Express API base URL. |
| `VITE_USE_MOCK_API` | `true` | `true` → mock adapters; `false` → real HTTP adapters. |
| `VITE_APP_NAME` | `BoA Staff Performance` | Display name. |

Read only through `src/config/env.ts`.

---

## 4. Folder Structure (actual)

```text
client/
├── .env.example
├── index.html                 # fonts, meta, title
├── vite.config.ts             # tailwind plugin, "@" alias → src
└── src/
    ├── main.tsx / App.tsx     # providers + router
    ├── index.css              # Tailwind import + design tokens (@theme) + base styles
    ├── config/                # env.ts, navigation.ts (role menus)
    ├── types/                 # domain + API contract types
    ├── services/
    │   ├── http/apiClient.ts  # fetch wrapper, auth header, ApiError normalization
    │   ├── mock/              # mockDb (seed + persistence), mockCalculations, mockUtils
    │   └── *.service.ts       # auth, staff, kpi, kpiEntry, performance, feedback, announcement, chat, settings
    ├── context/               # AuthContext, ToastContext
    ├── hooks/                 # useAsync, useDocumentTitle, useDialog
    ├── utils/                 # cn, format, validation, performance (status meta/labels)
    ├── routes/                # paths.ts, AppRouter.tsx, guards (RequireAuth, RequireRole)
    ├── layouts/               # AuthLayout, AppLayout (sidebar + header)
    ├── components/
    │   ├── ui/                # Button, Input, Select, Textarea, Field, Card, Badge, Dialog, Table, Tabs, ...
    │   ├── layout/            # Sidebar, Topbar, BrandMark, UserMenu
    │   ├── shared/            # PageHeader, PeriodSelector, StatCard, DataState, ConfirmDialog, PendingValidationNotice
    │   ├── dashboard/         # TrendChart, StatusBreakdown, AttentionList
    │   ├── kpi/               # KpiFormDialog, AssignKpiDialog, KpiEntryRow, KpiResultsTable
    │   ├── performance/       # PerformanceStatusBadge, StaffPerformanceTable
    │   ├── feedback/          # FeedbackList, GiveFeedbackDialog
    │   ├── announcements/     # AnnouncementCard, AnnouncementFormDialog
    │   └── chat/              # ConversationList, MessageThread, NewConversationDialog
    └── pages/
        ├── auth/              # Login, Register, AccountStatus, ForgotPassword
        ├── staff/             # Dashboard, DailyKpiEntry, KpiHistory, Performance, Feedback, Profile
        ├── manager/           # Dashboard, StaffList, StaffDetail, KpiManagement, PerformanceMonitoring, Reports, Feedback, Announcements, Settings
        └── shared/            # Announcements (staff view), Chat, NotFound, Forbidden
```

---

## 5. Route Structure

| Path | Page | Role | SRS screen |
|---|---|---|---|
| `/` | Redirect to role home or `/login` | any | — |
| `/login` | LoginPage | public | AUTH-01 |
| `/register` | RegisterPage | public | AUTH-02 |
| `/account-status` | AccountStatusPage | public | AUTH-03 |
| `/forgot-password` | ForgotPasswordPage | public | §10.1 |
| `/staff/dashboard` | StaffDashboardPage | staff | STAFF-01 |
| `/staff/kpi/entry` | DailyKpiEntryPage | staff | STAFF-02 |
| `/staff/kpi/history` | KpiHistoryPage | staff | STAFF-03 |
| `/staff/performance` | StaffPerformancePage | staff | STAFF-04 |
| `/staff/feedback` | StaffFeedbackPage | staff | STAFF-05 |
| `/staff/announcements` | AnnouncementsPage | staff | STAFF-06 |
| `/staff/chat` | ChatPage | staff | STAFF-07 |
| `/staff/profile` | ProfilePage | staff | STAFF-07 |
| `/manager/dashboard` | ManagerDashboardPage | manager | MGR-01 |
| `/manager/staff` | StaffListPage (tabs: all / pending approval) | manager | MGR-02 |
| `/manager/staff/:staffId` | StaffDetailPage | manager | MGR-06 |
| `/manager/kpis` | KpiManagementPage (add/edit/assign dialogs) | manager | MGR-03, MGR-04 |
| `/manager/performance` | PerformanceMonitoringPage | manager | MGR-05 |
| `/manager/reports` | ReportsPage | manager | FR-16 |
| `/manager/feedback` | ManagerFeedbackPage | manager | MGR-07 |
| `/manager/announcements` | ManagerAnnouncementsPage | manager | MGR-08 |
| `/manager/chat` | ChatPage | manager | MGR-09 |
| `/manager/settings` | SettingsPage | manager | MGR-10 |
| `/forbidden`, `*` | Forbidden / NotFound | any | — |

All paths are centralized in `src/routes/paths.ts`. Navigation menus live in `src/config/navigation.ts`.

---

## 6. Component Strategy

- **`components/ui`** – presentational, domain-agnostic primitives. No service imports.
- **`components/shared`** – app-level composites used across portals (page header, period selector, data-state wrapper).
- **Domain folders** (`kpi`, `performance`, …) – composites that know domain types but still receive data via props; dialogs may call services for their own submit action.
- **Pages** – orchestrate data loading (`useAsync` + services), compose components, own page state. Keep pages < ~250 lines; extract to domain components when larger.

---

## 7. State Management

| State | Where |
|---|---|
| Session/current user | `AuthContext` (`useAuth()`) |
| Toast notifications | `ToastContext` (`useToast()`) |
| Server data | Per-page `useAsync(fn, deps)` → `{ data, loading, error, reload, setData }` |
| Form state | Local `useState` in the form component |
| URL state | Period/tab selection kept in component state (ASSUMPTION: move to query params if deep-linking needed) |

No global store (Redux/Zustand) — not needed at current scale.

---

## 8. API / Service-Layer Strategy

`services/http/apiClient.ts`:
- Base URL from `VITE_API_BASE_URL`; JSON in/out; `credentials: 'include'` (supports httpOnly refresh cookie).
- Adds `Authorization: Bearer <accessToken>` from the in-memory token store.
- Normalizes errors to `ApiError { status, code, message, fieldErrors? }`.
- On `401`: attempts one `POST /auth/refresh`, retries once, else emits `session-expired` → AuthContext logs out.

Expected REST endpoints (illustrative per SRS §18 — finalize with backend developer):

| Service method | Method & path |
|---|---|
| `authService.login` | `POST /auth/login` → `{ user, accessToken }` |
| `authService.logout` | `POST /auth/logout` |
| `authService.refresh` | `POST /auth/refresh` |
| `authService.getCurrentUser` | `GET /auth/me` |
| `authService.register` | `POST /auth/register` → `{ referenceId, status }` |
| `authService.getAccountStatus` | `GET /auth/registration-status?employeeId=` |
| `authService.requestPasswordReset` | `POST /auth/forgot-password` |
| `authService.changePassword` | `POST /auth/change-password` |
| `staffService.list` | `GET /staff?status=&search=` |
| `staffService.getById` | `GET /staff/:id` |
| `staffService.listPending` | `GET /staff/pending` |
| `staffService.approve` / `reject` | `POST /staff/:id/approve` · `POST /staff/:id/reject` |
| `staffService.setStatus` | `PATCH /staff/:id/status` |
| `staffService.updateMyProfile` | `PATCH /staff/me` |
| `kpiService.list/get/create/update` | `GET/POST /kpis`, `GET/PATCH /kpis/:id` |
| `kpiService.setActive` | `PATCH /kpis/:id/status` |
| `kpiService.listAssignments` / `assign` / `unassign` | `GET/POST /kpi-assignments`, `DELETE /kpi-assignments/:id` |
| `kpiService.getMyAssignedKpis` | `GET /kpis/assigned/me?date=` |
| `kpiEntryService.listMine` | `GET /kpi-entries/me?from=&to=&kpiId=` |
| `kpiEntryService.listForStaff` | `GET /kpi-entries?staffId=&from=&to=` |
| `kpiEntryService.submit` | `POST /kpi-entries` (batch for a date) |
| `performanceService.getMySummary` | `GET /performance/me?period=&date=` |
| `performanceService.getStaffSummary` | `GET /performance/staff/:id?period=&date=` |
| `performanceService.getTrend` | `GET /performance/trend?staffId=&period=&points=` |
| `performanceService.getBranchOverview` | `GET /performance/branch?period=&date=` |
| `performanceService.getReport` | `GET /performance/report?period=&from=&to=` |
| `feedbackService.listMine` / `list` / `create` / `markRead` | `GET /feedback/me`, `GET /feedback?staffId=`, `POST /feedback`, `PATCH /feedback/:id/read` |
| `announcementService.*` | `GET /announcements?status=`, `POST /announcements`, `PATCH /announcements/:id`, `POST /announcements/:id/publish`, `POST /announcements/:id/archive`, `POST /announcements/:id/read` |
| `chatService.*` | `GET /conversations`, `POST /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages` |
| `settingsService.get/update` | `GET/PATCH /settings` |

Dates are ISO strings: `YYYY-MM-DD` for business dates, full ISO-8601 for timestamps.

---

## 9. Data Models (frontend contract — `src/types/`)

```ts
type Role = 'staff' | 'manager';
type AccountStatus = 'pending_approval' | 'active' | 'rejected' | 'deactivated';
interface User { id; employeeId; fullName; email; phone; position; branchName; role; status; createdAt; approvedAt?; rejectionReason? }

type KpiFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';
type KpiValueType = 'integer' | 'decimal' | 'currency' | 'percentage';
type RuleStatus = 'approved' | 'pending_validation';
interface Kpi { id; name; description; unit; valueType; target; frequency; weight: number | null;
  calculationRule: string | null; ruleStatus: RuleStatus; isActive; assignedStaffCount; createdAt; updatedAt }
interface KpiAssignment { id; kpiId; staffId; targetOverride: number | null; assignedAt }
interface AssignedKpi { kpi: Kpi; target: number; entry: KpiEntry | null }   // for a given date

type PerformanceStatus = 'on_target' | 'needs_attention' | 'below_target' | 'not_submitted' | 'unrated';
interface KpiEntry { id; staffId; kpiId; date; actual; target; performancePercent: number | null;
  status: PerformanceStatus; note?; submittedAt; updatedAt }

type PerformancePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';
interface KpiPeriodResult { kpiId; kpiName; unit; valueType; target; actual; performancePercent | null; status; weight | null }
interface PerformanceSummary { staffId; period; periodStart; periodEnd; periodLabel; overallPercent: number | null;
  status; entriesSubmitted; entriesExpected; kpiResults: KpiPeriodResult[]; calculationBasis: RuleStatus }
interface TrendPoint { label; periodStart; percent: number | null }
interface BranchOverview { period; periodLabel; activeStaff; pendingApprovals; entriesToday; expectedEntriesToday;
  averagePercent | null; statusBreakdown: Record<PerformanceStatus, number>; trend: TrendPoint[];
  staff: StaffPerformanceRow[]; attentionItems: AttentionItem[] }

interface Feedback { id; staffId; staffName; managerId; managerName; subject; message; period?; periodLabel?;
  kpiId?; kpiName?; createdAt; readAt: string | null }
type AnnouncementCategory = 'meeting' | 'holiday' | 'notice' | 'general';   // SRS: meetings, holidays, other notices
type AnnouncementStatus = 'draft' | 'published' | 'archived';
interface Announcement { id; title; body; category; status; pinned; authorName; createdAt; publishedAt | null; isRead }
interface Conversation { id; type: 'branch' | 'direct'; title; participants: ChatParticipant[]; lastMessage | null; unreadCount; updatedAt }
interface ChatMessage { id; conversationId; senderId; senderName; body; sentAt }

interface SystemSettings { branchName; branchCode; thresholds: { onTargetMin; needsAttentionMin; status: RuleStatus };
  entryPolicy: { allowEditSubmitted; backdateDays; status: RuleStatus }; weightingEnabled }
```

`performancePercent`/`status` are always **produced by the backend** (or mock). `unrated` is used when no
approved thresholds exist.

---

## 10. Authentication Strategy

- Login by **Employee ID or username + password** (SRS AUTH-01). "Remember me" shown, labeled *if approved by bank policy*.
- **ASSUMPTION (to confirm with backend/security):** JWT access token returned in body and kept **in memory**; refresh token in an **httpOnly, Secure, SameSite cookie**; `GET /auth/me` rehydrates the session on page load. No tokens in `localStorage` in HTTP mode.
- Mock mode persists the demo session in `localStorage` (`boa-pms.mock.session`) for convenience only.
- Registration → `pending_approval`; manager approves/rejects. "Verification" step in SRS §14.1 is **PENDING STAKEHOLDER VALIDATION** (method unknown: email/OTP/HR check). UI shows status page with reference ID.
- Forgot password → request screen with generic success message (no account enumeration).

## 11. Role-Based Access

- Two roles only: `staff`, `manager` (SRS §6, §11). No extra roles.
- `RequireAuth` redirects unauthenticated users to `/login` (preserving `from`).
- `RequireRole` redirects wrong-role users to `/forbidden`.
- Menus derive from `navigation.ts` per role.
- **Frontend guards are UX only; the backend must enforce authorization (SRS FR-18).**
- "Manager enters own KPI results — *as permitted*" (SRS §11): not exposed in UI yet. PENDING STAKEHOLDER VALIDATION.

---

## 12. Workflows (as implemented in UI)

**Staff registration (SRS §14.1):** Register form (personal + employment + password) → submit → status page (`pending_approval`, reference ID) → manager approves in *Staff › Pending approval* → user can log in. Rejected users see reason on status page.

**Daily KPI entry (SRS §14.2):** Dashboard quick action → Daily KPI Entry → service loads assigned active KPIs for chosen date → enter actuals (+ optional note) → validation (required, numeric, non-negative, type-specific) → **Review dialog** → Submit → service returns saved entries with calculated status → confirmation toast + summary. Previously submitted dates show submitted state; editing allowed only if `settings.entryPolicy.allowEditSubmitted` (PENDING VALIDATION, SRS §29 Q10).

**Manager performance review (SRS §14.3):** Dashboard → Performance → select period (daily/weekly/monthly/quarterly) + reference date → filter staff/status → open staff detail → KPI results/trend/history → *Give feedback* dialog → staff sees it in Feedback (unread badge).

**Staff management (SRS §14.4):** Staff → Pending approval tab → review details → Approve (optionally assign KPIs immediately) / Reject (reason required) → account active.

**KPI workflow:** KPIs page → Add KPI (name, description, target, unit, value type, frequency, optional weight, calculation rule text + rule status) → Assign to staff (multi-select) → Activate/Deactivate. Rule status badge shows *Pending validation* until management approves.

**Feedback:** Manager gives feedback (staff, subject, message, optional period & KPI context). Staff list shows unread first; opening marks read.

**Announcements:** Manager creates draft or publishes (title, category, body, pinned) → manage published/drafts/archived. Staff see published, pinned first, filter by category, unread indicator. Audience = whole branch (PENDING VALIDATION, SRS §29 Q18).

**Chat:** Branch-wide room + direct conversations. Two-pane UI; polling refresh (ASSUMPTION) until Socket.IO is available. Content/retention rules PENDING VALIDATION (SRS §29 Q17).

---

## 13. Error / Loading / Empty-State Strategy

- `useAsync` exposes `loading`, `error`, `data`. Pages render through `<DataState>` which shows skeletons, an `ErrorState` (message + Retry), or an `EmptyState` (icon, title, guidance, optional action).
- Mutations: buttons show spinner + disabled; success → toast; failure → toast + inline field errors when `ApiError.fieldErrors` exists.
- Destructive/irreversible actions use `ConfirmDialog`.
- Session expiry → redirect to login with notice.

## 14. Performance Calculation Display Policy

- The SRS formula `Performance % = Actual ÷ Target × 100` is a **conceptual example only** (SRS §16.2). It is used **only** in `services/mock/mockCalculations.ts` and the entry-form preview, both labeled "demonstration".
- Status thresholds are read from settings; mock default values are **placeholders** flagged `pending_validation` and the UI shows a `PendingValidationNotice` wherever calculated results appear.
- Weighted overall score is only applied when `settings.weightingEnabled` and KPI weights exist.

---

## 15. Mock Data Policy

- Mock adapters live only in `services/mock/` and are selected by `VITE_USE_MOCK_API=true`.
- All KPIs are named **"Sample KPI …"** with descriptions stating they are placeholders. Staff names/positions are fictional demo data.
- Data persists in `localStorage` (`boa-pms.mock.db.v1`); *Settings › Reset demo data* restores the seed.
- Demo credentials (mock mode only, shown on login page): manager `BOA-M001`, staff `BOA-S001`, password `Demo@1234`.

## 16. Security Notes (frontend)

No secrets in the client. Input validated client-side for UX; server must re-validate. No sensitive data in console logs. HTTPS required in deployment (SRS §19).

## 17. Testing Strategy

| Level | Tooling (planned) | Status |
|---|---|---|
| Type safety | `tsc -b` via `npm run build` | COMPLETED (passes) |
| Lint | ESLint (Vite template) | COMPLETED (configured) |
| Unit (utils, validation, services/mock) | Vitest | NEXT |
| Component | Vitest + Testing Library | NEXT |
| E2E (login, KPI entry, approval, feedback) | Playwright | LATER |
| Manual responsive QA | 375 / 768 / 1024 / 1440 px | IN PROGRESS |

## 18. Development Phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Requirements review, living docs | COMPLETED |
| 2 | Scaffold, tokens, UI primitives, app shell, routing, guards | COMPLETED |
| 3 | Service layer (types, HTTP client, mock adapters) | COMPLETED |
| 4 | Auth screens | COMPLETED |
| 5 | Staff portal (dashboard, KPI entry/history, performance) | COMPLETED (v1) |
| 6 | Manager portal (dashboard, staff, KPIs, performance, reports) | COMPLETED (v1) |
| 7 | Feedback, announcements, chat, profile, settings | COMPLETED (v1) |
| 8 | Automated tests, accessibility audit, responsive polish | NEXT |
| 9 | Backend integration (Express) — switch `VITE_USE_MOCK_API=false`, reconcile contracts | BLOCKED on backend |
| 10 | Stakeholder KPI/rule configuration & UAT | PENDING STAKEHOLDER VALIDATION |

## 19. Current Implementation Status

### COMPLETED
- See §0 and §18. Detailed per-file notes are kept in the change log (§24).

### IN PROGRESS
- Manual responsive QA pass.

### NEXT
- Vitest unit tests for `utils/` and mock services.
- Audit log viewer for manager (SRS FR-17) — requires backend `/audit-logs`.
- Deep-linkable filters (query params) on Performance/Reports.
- Code-splitting routes (`React.lazy`) to reduce bundle size.

### BLOCKED / PENDING STAKEHOLDER VALIDATION
- Official KPIs, targets, units, formulas, frequencies, weights, thresholds (SRS §29 Q1–Q9).
- Entry edit window & manager approval of entries (Q10–Q11).
- Treatment of missing entries (Q12) — UI shows `not_submitted`.
- Registration verification method (Q13), mandatory profile fields (Q14).
- Report formats (Q24), exports (P2).
- Announcement audience (Q18), notifications (Q19), chat rules (Q17).
- Hosting, identity provider, security requirements (Q20–Q23).

## 20. Known Limitations
- Mock data only; no persistence beyond the browser.
- Chat is not real-time (manual/poll refresh).
- Reports are on-screen only; no export/print layout yet.
- No audit-log UI.
- Bundle not yet code-split.

## 21. Open Questions (technical)
1. Token strategy confirmation (§10).
2. Who calculates period aggregates for weekly/monthly/quarterly KPIs (sum vs average vs latest)? Must come from approved rules — backend responsibility.
3. Should `/performance/branch` return per-staff rows or should the client call per-staff endpoints? Current contract: rows included.
4. Pagination contract for staff/entries/feedback (assumed unpaginated for single branch; add `?page=&pageSize=` if needed).

## 22. Assumptions
- ASSUMPTION: single branch → branch name/code come from settings, not selectable.
- ASSUMPTION: one manager account; staff can message the manager and each other.
- ASSUMPTION: announcement categories meeting/holiday/notice/general (derived from Kickoff objective statement).
- ASSUMPTION: timezone = branch local time; backend owns "today".
- ASSUMPTION: amounts in ETB where value type is currency.

## 23. Important Architectural Decisions (ADR log)

| # | Decision | Reason |
|---|---|---|
| ADR-1 | Vite SPA instead of Next.js | Project-lead direction; internal authenticated app, no SSR/SEO need. |
| ADR-2 | Express backend instead of NestJS | Project-lead direction. Contract in §8 is framework-agnostic. |
| ADR-3 | Service interface + HTTP/mock adapters, switched by env | Swap to real API without UI changes. |
| ADR-4 | No client-side authoritative KPI calculation | SRS §16: formulas must be approved; backend owns rules. |
| ADR-5 | Custom UI primitives instead of shadcn/ui | Fewer dependencies; native `<dialog>`; consistent tokens. |
| ADR-6 | Tailwind v4 CSS-first tokens | Single source of design tokens in `index.css`. |
| ADR-7 | Placeholder brand mark (not a recreation of the official logo) | Official logo asset/brand guidelines not supplied. |

## 24. Change Log

| Date | Change |
|---|---|
| 2026-10-06 | Initial plan, scaffold, design system, service layer, auth, staff & manager portals v1. |

## 25. Future Integration Points
- Express API (switch env flag; verify each `http*Service` against final endpoints).
- Socket.IO for chat (`chatService.subscribe` placeholder).
- Audit logs viewer.
- Export (PDF/Excel) for reports (P2).
- Notifications (if approved).
- Official BoA logo asset in `client/src/assets/brand/`.
