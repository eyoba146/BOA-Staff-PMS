# Bank of Abyssinia - Staff Performance Management System (BOA Staff PMS)

Enterprise performance management and staff productivity evaluation platform tailored for Bank of Abyssinia branch operations. The system bridges daily branch banking KPIs with executive oversight, automated scoring, real-time messaging, and multi-tier approval workflows.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Capabilities](#key-capabilities)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Installation and Setup](#installation-and-setup)
- [Environment Configuration](#environment-configuration)
- [Database Setup and Migrations](#database-setup-and-migrations)
- [Running the Application](#running-the-application)
- [Real-Time Engine (SSE)](#real-time-engine-sse)
- [Design Standards and Theme](#design-standards-and-theme)
- [Security and Compliance](#security-and-compliance)
- [Development Conventions](#development-conventions)
- [License](#license)

---

## System Architecture

BOA Staff PMS follows a decoupled client-server architecture designed for reliability, sub-second interface navigation, and strict data governance:

- **Frontend (client/)**: Single Page Application (SPA) built with React 19, TypeScript, Tailwind CSS, and Vite. Implements client-side in-flight deduplication, stale-while-revalidate (SWR) cache layers, and Server-Sent Events (SSE) listeners.
- **Backend (server/)**: RESTful API service using Node.js, Express, and Prisma ORM. Uses in-memory request-context caching, transaction-mode database pooling, and structured audit logging.
- **Database (PostgreSQL / Supabase)**: Relational schema managed through Prisma with indexes on all lookup vectors, foreign keys, and temporal filters.
- **Real-Time Streaming**: Server-Sent Events (SSE) multiplexing for chat messaging, unread counts, and broadcast announcements without socket overhead or polling latency.

---

## Key Capabilities

### 1. Role-Based Access Control (RBAC)
- **Staff Role**: Daily KPI recording, historical trend inspection, management feedback consumption, profile management with email verification, and branch communication.
- **Branch Manager Role**: Branch-wide performance dashboards, pending staff registration approvals and rejections, KPI assignment, qualitative feedback delivery, announcement broadcasting, and system threshold configuration.

### 2. KPI and Performance Tracking
- Multi-frequency KPIs: Daily, Weekly, Monthly, and Quarterly targets.
- Dynamic scoring based on configurable target thresholds (On Target, Needs Attention, Below Target).
- Weighted overall achievement calculations across diverse banking metrics (e.g., account opening, transaction volume, loan processing).
- Backdated entry policies with configurable day allowances and submission window locking.

### 3. Account Approval and Verification Lifecycle
- Staff registration requires corporate email OTP verification via Brevo transactional mailing.
- Validated accounts enter a `pending_approval` state requiring explicit branch manager authorization.
- In-flight email updates trigger temporary OTP challenges, automatically reverting to the previously verified email address if unconfirmed.

### 4. Real-Time Communication
- Branch group channel available to all branch personnel with explicit role tags (Branch Manager vs Staff position titles).
- Direct peer-to-peer messaging between staff members.
- Instant delivery of announcements and management feedback.
- Real-time unread badge synchronization across client navigation menus.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend Framework | React 19, TypeScript, Vite |
| Styling and UI | Tailwind CSS, Lucide React (vector icons), Radix/Headless primitives |
| Data Visualization | Recharts |
| Client Data Layer | Fetch API with custom in-flight deduplication and SWR cache |
| Backend Runtime | Node.js (ES Modules), Express |
| Database and ORM | PostgreSQL (Supabase), Prisma ORM 6 |
| Authentication | JSON Web Tokens (JWT) stored in HTTP-only cookies, bcryptjs password hashing |
| Real-Time Layer | Server-Sent Events (SSE) with connection registry and heartbeat keep-alives |
| Email Service | Brevo (Sendinblue) transactional email API |
| Validation | Zod schema validation across all request endpoints |

---

## Repository Structure

```
BOA PMS/
├── client/                      # React frontend application
│   ├── public/                  # Static assets and branding logos
│   ├── src/
│   │   ├── components/          # Reusable UI elements, dialogs, and forms
│   │   ├── context/             # React context providers (AuthContext)
│   │   ├── hooks/               # Custom hooks (useNavCounts, useDebounce)
│   │   ├── layouts/             # AppLayout, navigation, and sidebar
│   │   ├── pages/               # Route views (auth, staff, manager, shared)
│   │   ├── services/            # API clients, SWR cache, and SSE streams
│   │   ├── types/               # TypeScript data definitions
│   │   └── utils/               # Formatting, date tools, and phone validators
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── server/                      # Express backend API service
│   ├── prisma/                  # Prisma schema, seeds, and migrations
│   ├── src/
│   │   ├── config/              # Database connection, env loader, logger
│   │   ├── middlewares/         # JWT auth, RBAC, error, rate limiting
│   │   ├── modules/             # Domain modules (auth, staff, kpi, chat, etc.)
│   │   ├── repositories/        # Database access patterns
│   │   ├── types/               # Server-side TypeScript interfaces
│   │   └── utils/               # Email templates, dates, tokens, request context
│   ├── package.json
│   └── tsconfig.json
├── docs/                        # Specifications, plans, and architectural docs
└── README.md                    # Root repository documentation
```

---

## Prerequisites

- **Node.js**: Version 20.x or higher
- **npm**: Version 10.x or higher
- **PostgreSQL**: Accessible PostgreSQL instance (Supabase connection pooler recommended for cloud deployments)
- **Brevo Account**: API key for sending email verification codes (optional in development; OTPs log to console in fallback mode)

---

## Installation and Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/eyoba146/BOA-Staff-PMS.git
   cd BOA-Staff-PMS
   ```

2. **Install server dependencies**:
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**:
   ```bash
   cd ../client
   npm install
   ```

---

## Environment Configuration

### Server Configuration (`server/.env`)

Create a `.env` file in the `server/` directory:

```env
# Application
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection (Prisma)
# Use transaction-mode pooling (port 6543) for runtime execution:
DATABASE_URL="postgresql://<user>:<password>@<pooler-host>:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=30&connect_timeout=30"

# Direct URL for migrations and schema sync (port 5432):
DIRECT_URL="postgresql://<user>:<password>@<pooler-host>:5432/postgres?connection_limit=3&pool_timeout=30"

# JWT Authentication Secrets
JWT_SECRET=your_super_secret_jwt_access_key
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Transactional Email (Brevo)
BREVO_API_KEY=xkeysib-your-brevo-api-key
EMAIL_FROM=noreply@bankofabyssinia.com
EMAIL_FROM_NAME="Bank of Abyssinia PMS"
```

### Client Configuration (`client/.env`)

Create a `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:4000/api
```

---

## Database Setup and Migrations

1. Generate Prisma client types:
   ```bash
   cd server
   npm run prisma:generate
   ```

2. Push schema changes directly to PostgreSQL:
   ```bash
   npx prisma db push
   ```

3. (Optional) Seed initial system settings and reference positions:
   ```bash
   npm run prisma:seed
   ```

---

## Running the Application

### Development Mode

Run the server and client concurrently in two separate terminal windows:

- **Terminal 1 (Server)**:
  ```bash
  cd server
  npm run dev
  ```
  The API will start at `http://localhost:4000` with hot-reload via `tsx watch`.

- **Terminal 2 (Client)**:
  ```bash
  cd client
  npm run dev
  ```
  The client application will start at `http://localhost:5173`.

### Production Build

- **Build Client**:
  ```bash
  cd client
  npm run build
  ```

- **Build Server**:
  ```bash
  cd server
  npm run build
  npm start
  ```

---

## Real-Time Engine (SSE)

The application utilizes native HTTP Server-Sent Events (SSE) for low-latency push updates:

- Endpoint: `GET /api/realtime/stream`
- Connection Management: Handled via `RealtimeService` in the backend, supporting user-targeted unicasts and room-based broadcasts.
- Active Channels:
  - `chat_message`: Delivers newly posted messages to conversation participants.
  - `chat_message_updated` / `chat_message_deleted`: Live chat synchronization.
  - `announcement_published`: Immediate notification of new company or branch notices.
  - `feedback_received`: Push alert when a manager publishes qualitative feedback.
  - `counts_invalidated`: Flushes cached navigation badges and triggers instant client recalculation.

---

## Design Standards and Theme

The interface adheres strictly to Bank of Abyssinia brand identity guidelines:

- **Primary Ink Palette**: `#0E0E10` (Ink 900), `#1D1E22` (Ink 800), `#2C2D35` (Ink 700).
- **Accent Gold Palette**: `#EBA312` (Gold 500), `#F5B82E` (Gold 400), `#C88508` (Gold 600).
- **Status Indicators**:
  - On Target / Success: Emerald (`#10B981`)
  - Needs Attention / Warning: Amber (`#F59E0B`)
  - Below Target / Error: Rose (`#EF4444`)
- **Visual Typography**: Clean modern sans-serif typography with high contrast, legible hierarchy, and dedicated tabular numerals for metric displays.
- **Zero-Emoji Policy**: System components, templates, and notifications strictly utilize SVG vector iconography (Lucide React) in place of unicode emojis.

---

## Security and Compliance

- **HTTP-Only Cookies**: Authentication tokens are isolated from client-side script execution to mitigate Cross-Site Scripting (XSS).
- **Zod Request Validation**: Every API payload is vetted against strict schema definitions prior to reaching service layers.
- **Ethiopian Phone Validation**: Phone inputs enforce national telecommunications numbering rules (`+251 7`, `+251 9`, `09`, `07`).
- **Database Connection Multiplexing**: Supabase transaction pooling configuration protects against connection saturation during peak branch hours.
- **Audit Logging**: Sensitive administrative actions (approvals, rejections, threshold modifications) write immutable audit entries.

---

## Development Conventions

- TypeScript strict mode enabled across both packages.
- Zero implicit `any` types allowed in production paths.
- SWR caching patterns required for read-heavy routes to ensure sub-5ms client transitions.
- All database mutation endpoints must trigger explicit cache invalidation via `invalidateCache(pattern)`.

---

## License

Confidential and proprietary property of Bank of Abyssinia. All rights reserved.
