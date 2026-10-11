# BOA PMS - Server API Engine

The core backend service for the Bank of Abyssinia Staff Performance Management System (BOA Staff PMS). Built with Node.js, Express, TypeScript, and Prisma ORM, providing a secure, performant, and resilient REST and real-time streaming backend.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Module Breakdown](#module-breakdown)
- [API Route Reference](#api-route-reference)
- [Database Configuration and Supabase Pooling](#database-configuration-and-supabase-pooling)
- [Performance and Caching Strategies](#performance-and-caching-strategies)
- [Real-Time SSE Streaming](#real-time-sse-streaming)
- [Authentication and Security](#authentication-and-security)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Testing and Diagnostics](#testing-and-diagnostics)

---

## Architectural Overview

The backend is structured into modular domain packages following clean architectural separation:

- **Controllers**: Handle HTTP request extraction, status code mapping, and response serialization.
- **Services**: Contain all business rules, mathematical KPI aggregations, cache invalidation, and transactional logic.
- **Repositories**: Encapsulate complex database queries and composite lookups.
- **Validation**: Enforce schema constraints with Zod prior to controller invocation.
- **Middlewares**: Provide JWT authentication, role authorization, CORS enforcement, and centralized error handling.

---

## Module Breakdown

The service layer is partitioned into discrete domain modules located under `src/modules/`:

| Module | Responsibilities |
|---|---|
| `auth` | User registration, credential verification, JWT cookie issuance, password reset, and Brevo OTP delivery. |
| `staff` | Staff directory management, user profiles, email update challenges, and manager approval workflows. |
| `kpi` | KPI catalog creation, target weights, calculation formulas, and staff assignment binding. |
| `kpiEntry` | Daily and period-based KPI submissions, actual-vs-target computations, and entry editing limits. |
| `performance` | Aggregated metrics, trend calculations, branch overview dashboards, and report generation. |
| `feedback` | Formal manager-to-staff feedback, subject categorization, and read receipts. |
| `announcement` | Pinned and categorized broadcast notices, priority flags, and individual read confirmations. |
| `chat` | Branch channel chat, peer direct messaging, message editing/deletion, and conversation participant state. |
| `settings` | System-wide performance thresholds (On Target, Needs Attention), backdating allowances, and weight switches. |
| `realtime` | Server-Sent Events (SSE) connection registry, client heartbeat broadcasting, and cache invalidation signals. |

---

## API Route Reference

All routes are mounted with the `/api` prefix:

### Authentication (`/api/auth`)
- `POST /register`: Register a new staff or manager profile.
- `POST /login`: Authenticate credentials and receive HTTP-only access/refresh tokens.
- `POST /refresh`: Renew access token via refresh token cookie.
- `POST /logout`: Clear authentication cookies and terminate session.
- `POST /verify-email`: Confirm registration email with 6-digit OTP code.
- `POST /resend-verification`: Dispatch a fresh OTP challenge.
- `POST /forgot-password`: Request password reset OTP.
- `POST /reset-password`: Complete password reset with verification token.
- `GET /me`: Retrieve profile of currently authenticated user.

### Staff Management (`/api/staff`)
- `GET /`: Retrieve staff member list for the current branch (Manager only).
- `GET /pending`: List accounts awaiting manager activation (Manager only).
- `GET /:id`: Retrieve detailed profile for an individual staff member.
- `PATCH /:id/approve`: Approve a pending staff account (Manager only).
- `PATCH /:id/reject`: Reject account registration with formal reason note (Manager only).
- `PATCH /:id/status`: Toggle user status (active, deactivated) (Manager only).
- `PATCH /profile`: Update current user's profile details.
- `POST /profile/verify-email-change`: Confirm pending email change with OTP.

### KPI and Assignments (`/api/kpis`)
- `GET /`: List all active KPI definitions.
- `POST /`: Create a new KPI catalog item (Manager only).
- `PUT /:id`: Update KPI properties, units, weights, or targets (Manager only).
- `DELETE /:id`: Deactivate or remove a KPI (Manager only).
- `GET /assigned/me`: Retrieve KPIs assigned to the authenticated staff member.
- `GET /assigned/:staffId`: Retrieve KPIs assigned to a specific staff member (Manager only).
- `POST /assign`: Assign or update target overrides for staff members (Manager only).

### KPI Entries (`/api/kpi-entries`)
- `GET /me`: List KPI entries recorded by the authenticated staff member.
- `POST /`: Submit new KPI entry values for a specified date.
- `PUT /:id`: Edit an existing KPI submission within policy limits.
- `GET /staff/:staffId`: Inspect submitted KPI entries for a staff member (Manager only).

### Performance and Reports (`/api/performance`)
- `GET /me/dashboard`: Comprehensive staff performance dashboard data for selected period.
- `GET /me/trends`: Historical performance progress across historical periods.
- `GET /branch/overview`: Branch-level achievement aggregations and rankings (Manager only).
- `GET /reports/staff-summary`: Tabular performance summary for reporting and CSV export.

### Communication (`/api/feedback`, `/api/announcements`, `/api/conversations`)
- `GET /feedback/me`: List feedback messages received by staff.
- `POST /feedback`: Submit new feedback for a staff member (Manager only).
- `PATCH /feedback/:id/read`: Mark feedback item as read.
- `GET /announcements`: List published announcements.
- `POST /announcements`: Draft or publish a new announcement (Manager only).
- `PATCH /announcements/:id/read`: Mark an announcement as read.
- `GET /conversations`: List active chat conversations for user.
- `GET /conversations/:id/messages`: Retrieve message history for a conversation.
- `POST /conversations/:id/messages`: Send a message.
- `PATCH /conversations/:id/messages/:msgId`: Edit an authored message.
- `DELETE /conversations/:id/messages/:msgId`: Remove a message.

### Real-Time Streaming (`/api/realtime`)
- `GET /realtime/stream`: Open persistent SSE connection for live notifications.

---

## Database Configuration and Supabase Pooling

The Prisma setup is configured in `server/prisma/schema.prisma` and `server/src/config/database.ts`.

### Connection Modes

When connecting to Supabase PostgreSQL, two connection strings are required:

1. **`DATABASE_URL` (Port 6543 - Transaction Mode)**:
   - Mandatory for Express runtime operations.
   - Utilizes PgBouncer connection multiplexing to support concurrent requests without exhausting PostgreSQL connection slots.
   - Example format:
     ```
     DATABASE_URL="postgresql://postgres.<tenant>:<password>@<pooler-host>:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=30"
     ```

2. **`DIRECT_URL` (Port 5432 - Session Mode)**:
   - Reserved exclusively for schema migrations (`prisma migrate`, `prisma db push`) and Prisma introspection.
   - Bypasses PgBouncer transaction isolation which breaks DDL statements.

---

## Performance and Caching Strategies

To ensure rapid response times, the server implements multiple optimization layers:

- **Database Indexes**: Compound indexes on high-frequency query paths:
  - `KpiEntry([staffId, date])`, `KpiEntry([date])`, `KpiEntry([kpiId])`
  - `KpiAssignment([staffId])`, `KpiAssignment([kpiId])`
  - `ChatMessage([conversationId, sentAt])`
  - `Announcement([status])`, `Announcement([createdAt])`
- **Elimination of N+1 Queries**: Refactored loops in `kpi.service.ts` and `performance.service.ts` into single batch queries with Map-based lookups.
- **In-Memory Service TTL Caches**: High-frequency, slow-changing resources (system settings, active KPI lists, feedback, announcements) are stored in in-memory caches with 20–30 second TTLs.
- **Mutation-Driven Cache Invalidation**: Create, update, and delete operations immediately flush corresponding memory keys and signal connected clients via SSE.

---

## Real-Time SSE Streaming

The `RealtimeService` (`src/modules/realtime/realtime.service.ts`) provides clean, event-driven streaming without the memory footprint of WebSockets:

- Automatically maintains a registry of active response streams indexed by `userId`.
- Periodic 25-second heartbeat packets prevent intermediary proxy timeouts.
- Targeted dispatch enables sending events to individual users or all members of a branch channel.
- Automatically handles socket cleanup on client disconnection.

---

## Authentication and Security

- **Dual-Token Pattern**: Short-lived JWT access tokens (15 minutes) paired with long-lived refresh tokens (7 days).
- **Cookie Security**: Tokens are delivered with `httpOnly: true`, `sameSite: 'lax'`, and conditional `secure: true` in production environments.
- **Password Protection**: Passwords hashed using `bcryptjs` with salt rounds configured to 10.
- **Phone Validation**: Standardized Ethiopian MSISDN parsing ensures consistent database storage.
- **Zero-Emoji Compliance**: Server templates, system error responses, and audit notes are strictly text and vector-compliant without emoji glyphs.

---

## Available Scripts

From the `server/` directory:

```bash
# Start development server with file watching
npm run dev

# Compile TypeScript to JavaScript in dist/
npm run build

# Start production server from compiled dist/
npm start

# Regenerate Prisma Client definitions
npm run prisma:generate

# Execute Prisma database migrations
npm run prisma:migrate

# Seed database with baseline reference data
npm run prisma:seed
```

---

## Testing and Diagnostics

Internal scripts located in `prisma/seed.ts` and `src/config/database.ts` allow rapid validation of database health:

```bash
# Check connectivity directly via TypeScript execution
npx tsx -e "import { checkDatabaseConnection } from './src/config/database.js'; checkDatabaseConnection().then(console.log);"
```
