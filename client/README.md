# BOA PMS - Client Web Application

The frontend single-page application for the Bank of Abyssinia Staff Performance Management System (BOA Staff PMS). Built with React 19, TypeScript, Tailwind CSS, and Vite, delivering an executive banking interface with sub-second page transitions, real-time push updates, and strict role-based dashboards.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Design System and Brand Identity](#design-system-and-brand-identity)
- [Application Views and Routes](#application-views-and-routes)
- [Client Data Layer and Performance](#client-data-layer-and-performance)
- [Real-Time SSE Engine](#real-time-sse-engine)
- [Component Architecture](#component-architecture)
- [Form Validation and Ethiopian Formatting](#form-validation-and-ethiopian-formatting)
- [Environment Configuration](#environment-configuration)
- [Available Scripts](#available-scripts)
- [Zero-Emoji Standard](#zero-emoji-standard)

---

## Architectural Overview

The client application is architected around high responsiveness, predictable data synchronization, and clean component decoupling:

- **Framework**: React 19 with Vite for instant Hot Module Replacement (HMR) and optimized rollup production bundles.
- **Routing**: Client-side routing with role-guarded layout wrappers (`AppLayout`, `ProtectedRoute`).
- **Data Fetching**: Custom API client featuring automatic in-flight promise deduplication and a 20-second Stale-While-Revalidate (SWR) memory cache.
- **Real-Time Layer**: SSE stream receiver (`realtime.service.ts`) coupled with custom hooks (`useNavCounts`) for live notification badge sync.
- **State Management**: React Context (`AuthContext`) for authentication state, combined with localized SWR caching for domain data.

---

## Design System and Brand Identity

The user interface follows the official Bank of Abyssinia corporate aesthetic:

### Color Palette

| Token | Hex Code | Purpose |
|---|---|---|
| Ink 900 | `#0E0E10` | Primary backgrounds, high-contrast headings, main brand surfaces |
| Ink 800 | `#1D1E22` | Navigation sidebar, dialog backdrops, dark elevated cards |
| Ink 700 | `#2C2D35` | Subtle borders, active item highlights, muted text in dark mode |
| Gold 500 | `#EBA312` | Primary brand accent, primary CTA buttons, active state indicators |
| Gold 400 | `#F5B82E` | Hover highlights on gold buttons, interactive focus rings |
| Gold 600 | `#C88508` | Active button click states, darker accent borders |
| Surface Light | `#F8F9FA` | Main page canvas background for optimal reading ergonomics |
| Surface White | `#FFFFFF` | Primary content cards, data tables, and modal containers |

### Metric Status Tokens

- **On Target (Emerald)**: `#10B981` (Achievement >= 85% or custom threshold)
- **Needs Attention (Amber)**: `#F59E0B` (Achievement between 70% and 84%)
- **Below Target (Rose)**: `#EF4444` (Achievement < 70%)
- **Unrated / Neutral**: `#6B7280`

### Typography and Iconography

- **Font Family**: Modern sans-serif with high legibility across financial data tables.
- **Tabular Figures**: Numeric values use fixed-width numeral alignment (`font-variant-numeric: tabular-nums`) to avoid layout jitter during live metric changes.
- **Iconography**: 100% SVG vector icons via `lucide-react`. Unicode emojis are strictly prohibited across all components and typography tokens.

---

## Application Views and Routes

### 1. Authentication (`/auth/*`)
- `/login`: Corporate email and password sign-in.
- `/register`: Staff registration with phone validation, branch selection, and position assignment.
- `/verify-email`: 6-digit OTP verification screen connected to Brevo email delivery.
- `/forgot-password` and `/reset-password`: Self-service credential recovery.

### 2. Staff Workstation
- `/staff/dashboard`: Executive staff overview complying with `STAFF-01` design specification:
  - Dynamic greeting with localized date, position title, and branch name.
  - "Today's KPI Entry" prominent executive banner with progress pill and direct submission CTA.
  - Period segmented controls (Daily, Weekly, Monthly, Quarterly).
  - Metric summary cards (Overall Achievement %, Required Entries, Assigned KPIs, Management Feedback).
  - Performance trend chart paired with current KPI progress list.
  - Supporting grid with recent feedback cards and branch announcements.
- `/staff/performance`: Detailed historical performance analytics, breakdown charts, and entry audit log.
- `/staff/profile`: Profile management with security credentials and email update verification challenge.

### 3. Manager Workstation
- `/manager/dashboard`: Branch-wide performance overview, team averages, and quick actions.
- `/manager/approvals`: High-efficiency pending registration review cards with inline approve and reject actions.
- `/manager/staff`: Staff roster with status filters (Active, Pending Approval, Deactivated) and detailed performance profiles.
- `/manager/kpis`: Catalog management for branch KPIs, frequency settings, and custom target assignments.
- `/manager/reports`: Executive performance summaries with CSV export capabilities.
- `/manager/settings`: Operational threshold configuration (On Target %, Needs Attention %, backdating allowances).

### 4. Shared Communications
- `/chat`: Branch group channel and private direct messaging, featuring role badges, real-time message delivery, edit/delete actions, and unread counters.
- `/announcements`: Branch and institution-wide announcements with category filtering, pinned notices, and read receipt tracking.

---

## Client Data Layer and Performance

To eliminate loading lag and prevent duplicate network calls across rapid view switches, the client implements an intelligent data layer in `src/services/http/apiClient.ts`:

1. **In-Flight Request Deduplication**: Identical simultaneous `GET` requests share a single pending Promise, preventing redundant network requests when multiple components mount concurrently.
2. **20-Second Memory Cache (SWR)**: Read requests are cached in memory for 20 seconds. Subsequent visits to the same page resolve instantaneously (<5ms) from memory while revalidating fresh data in the background.
3. **Mutation and Event Cache Invalidation**: Any `POST`, `PUT`, `PATCH`, or `DELETE` mutation flushes cached keys matching the mutated resource. Real-time SSE signals also automatically purge invalid data caches.

---

## Real-Time SSE Engine

The real-time service (`src/services/realtime.service.ts`) establishes a single persistent HTTP Server-Sent Events connection:

- Automatically connects upon user authentication (`GET /api/realtime/stream`).
- Dispatches event listeners across components:
  - `chat_message`: Appends incoming chat messages to active conversations.
  - `chat_message_updated` / `chat_message_deleted`: Updates message states live.
  - `announcement_published`: Prompts live announcement feed updates.
  - `feedback_received`: Shows management feedback alerts.
  - `counts_invalidated`: Triggers `useNavCounts` to refresh sidebar badges immediately.
- Implements exponential backoff reconnection if network connectivity drops.

---

## Component Architecture

Key reusable UI primitives located under `src/components/`:

- `ui/Button`: Polished variants (`primary`, `secondary`, `outline`, `ghost`, `danger`) with loading spinner integration.
- `ui/PhoneInput`: Custom Ethiopian telecommunications input with automatic spacing and validation styling.
- `ui/Card`: Elevated surfaces with ink and gold borders adhering to the BOA design tokens.
- `ui/Dialog`: Accessible modal containers with smooth entry animations and keyboard accessibility.
- `ui/Badge`: Semantic status indicators for account statuses, performance tiers, and announcement categories.
- `ui/Skeleton`: Bank-grade skeleton loading placeholders designed to minimize Cumulative Layout Shift (CLS).

---

## Form Validation and Ethiopian Formatting

The application implements rigorous input formatting tailored to Ethiopian branch banking standards:

- **Phone Numbers** (`formatEthiopianPhone`):
  - Local prefixes: `09` and `07` automatically formatted as 10-digit mobile numbers (`0911 234 567`).
  - International prefix: `+251` automatically formatted with 9 subscriber digits (`+251 91 123 4567`).
  - Strict regex guards prevent alphabetic input or invalid network prefixes.
- **Date Formatting**: Consistent localized presentation (`long`, `short`, `iso`) matching bank fiscal reporting standards.

---

## Environment Configuration

Create a `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:4000/api
```

---

## Available Scripts

From the `client/` directory:

```bash
# Launch development server at http://localhost:5173
npm run dev

# Run TypeScript compilation check and create optimized production build in dist/
npm run build

# Preview production build locally
npm run preview

# Run ESLint validation
npm run lint
```

---

## Zero-Emoji Standard

This codebase adheres to a strict zero-emoji policy. All visual indicators, flags, buttons, and alert notices utilize scalable vector icons (`lucide-react`) or CSS text badges to maintain an executive banking standard.
