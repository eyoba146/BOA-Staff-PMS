# Bank of Abyssinia Branch Staff Performance Management System

**Software Requirements & Project Documentation**  
**Version:** 1.0  
**Scope:** Single Bank Branch  
**Primary Administrator:** Branch Manager  
**Development Model:** 3-Person Team / Code-First UI  
**Status:** Initial Requirements Baseline  
**Purpose:** Project planning, development, stakeholder review, and acceptance

---

## 1. Document Control

| Item | Value |
|---|---|
| Document | Software Requirements & Project Documentation |
| System | Bank of Abyssinia Branch Staff Performance Management System |
| Version | 1.0 |
| Scope | One branch |
| Primary administrator | Branch Manager |
| Users | Branch Manager and Branch Staff |
| Design approach | Paper wireframes → code-first UI → review → refinement |
| Requirement status | Initial baseline; branch-specific KPI details require validation |

## 2. Executive Summary

The Bank of Abyssinia Branch Staff Performance Management System is a web-based internal application intended to help a branch record, monitor, review, and communicate staff performance. Staff members will record daily KPI achievements, while the branch manager will monitor performance across daily, weekly, monthly, and quarterly periods.

The system is designed around a single-branch operating model. The branch manager acts as the system administrator and does not require a separate administration portal. Staff access is controlled through authentication and manager approval.

> **Important requirement boundary:** The actual Bank of Abyssinia KPIs, targets, formulas, weights, thresholds, and staff-position assignments must be supplied or approved by branch management. The system documentation does not invent official banking KPIs.

## 3. Background & Problem Statement

Performance information may be difficult to monitor consistently when daily achievements, targets, feedback, announcements, and staff communication are handled through disconnected manual processes. The proposed system centralizes these activities in one branch-level application.

The system should:

- Provide a consistent place for staff to record daily KPI achievements.
- Give the branch manager an up-to-date view of staff performance.
- Support performance review at daily, weekly, monthly, and quarterly levels.
- Provide structured feedback from management to staff.
- Centralize branch announcements and internal communication.

## 4. Project Objectives

- Digitize daily KPI performance entry.
- Automatically calculate performance metrics according to approved KPI rules.
- Provide separate staff and manager experiences based on role permissions.
- Make performance trends and status visible through dashboards and reports.
- Allow the manager to provide and retain performance feedback.
- Provide announcements and internal chat in the same system.
- Maintain secure, reliable, auditable records.

## 5. Scope

### 5.1 In Scope

- Authentication, controlled staff registration, account verification, and manager approval.
- Staff dashboard and manager dashboard.
- KPI creation, editing, activation/deactivation, and assignment.
- Daily KPI entry and KPI history.
- Performance calculations and status presentation.
- Daily/weekly/monthly/quarterly monitoring.
- Manager feedback and feedback history.
- Announcements.
- Internal chat.
- Staff profiles and basic settings.
- Reports and performance summaries.
- Role-based access control and audit logging.

### 5.2 Out of Scope for Initial MVP

- Multi-branch administration.
- Public customer-facing banking functions.
- Core banking transactions.
- Automated integration with existing bank systems unless separately approved.
- Advanced predictive analytics.
- Complex HR/payroll functionality.

## 6. Stakeholders & Users

| Role | Primary Responsibilities |
|---|---|
| Branch Manager / Administrator | Manage staff, KPIs, performance monitoring, feedback, announcements, chat, and system settings. |
| Branch Staff | Enter daily KPI achievements, review personal performance, receive feedback, read announcements, and use chat. |
| Project Team | Requirements, UI/UX, frontend, backend, database, testing, documentation, and deployment. |
| Branch Management / Stakeholders | Validate actual KPIs, targets, rules, security expectations, and acceptance criteria. |

## 7. Team Structure & Responsibilities

| Team Member | Role | Responsibilities |
|---|---|---|
| Member 1 | Project Lead + UI/UX | Requirements, documentation, paper wireframes, user flows, code-first UI direction, coordination, stakeholder communication. |
| Member 2 | Frontend Developer | Next.js application, components, responsive UI, dashboards, forms, charts, API integration, and frontend testing. |
| Member 3 | Backend Developer | NestJS API, database, authentication, authorization, KPI logic, performance, feedback, announcements, and chat services. |

## 8. Recommended Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js + React + TypeScript | Web application and reusable UI architecture. |
| Styling | Tailwind CSS | Fast, consistent, and responsive styling. |
| Components | shadcn/ui | Reusable accessible UI components. |
| Icons | Lucide React | Consistent interface icons. |
| Charts | Recharts | Performance trends and KPI visualizations. |
| Backend | NestJS + TypeScript | Structured REST API and business logic. |
| Database | PostgreSQL | Relational storage for users, KPIs, and performance records. |
| ORM | Prisma | Database access and schema management. |
| Authentication | JWT + secure password hashing | Authentication and role-based access. |
| Real-time chat | Socket.IO | Optional real-time messaging layer. |
| Version control | Git + GitHub | Source control and team collaboration. |

The stack is a recommendation. Final choices should also consider team experience, approved bank infrastructure, hosting constraints, security requirements, and deployment policies.

## 9. System Architecture

The proposed architecture separates the browser interface, API/business logic, database, and supporting services.

```text
Browser
  ↓
Next.js Frontend
  ↓ HTTPS REST API
NestJS Backend
  ↓
Prisma
  ↓
PostgreSQL
```

- Frontend handles presentation, forms, navigation, and user interactions.
- Backend handles authentication, authorization, business rules, KPI calculations, and data access.
- PostgreSQL stores structured application data.
- Socket.IO can be added for live chat if real-time messaging is required.
- Backups, monitoring, and audit logs should be implemented according to approved operational requirements.

## 10. Information Architecture / Sitemap

### 10.1 Authentication

```text
Authentication
└── Login
    └── Staff Registration
        └── Verification
            └── Manager Approval
                └── Dashboard
```

Pages/features:

- Login
- Staff Registration
- Account Verification
- Forgot Password
- Approval Status

### 10.2 Staff Portal

- Dashboard
- My KPI
  - Daily KPI Entry
  - KPI History
  - Performance Summary
- Feedback
- Announcements
- Chat
- Profile

### 10.3 Manager Portal

- Dashboard
- Staff
  - All Staff
  - Staff Details
  - Registration/Approval
- KPIs
  - KPI Overview
  - Add/Edit KPI
  - Assign KPI
- Performance
  - Daily
  - Weekly
  - Monthly
  - Quarterly
- Feedback
  - Give Feedback
  - Feedback History
- Announcements
  - Create
  - Manage
- Chat
- Settings

## 11. User Roles & Permissions

| Capability | Staff | Manager |
|---|---:|---:|
| Login / logout | Yes | Yes |
| Register account | Yes, controlled | Yes / approve |
| Approve staff | No | Yes |
| View own performance | Yes | Yes |
| View all staff performance | No | Yes |
| Enter own KPI results | Yes | As permitted |
| Create/edit KPIs | No | Yes |
| Assign KPIs | No | Yes |
| Give performance feedback | No | Yes |
| View feedback | Yes | Yes |
| Create announcements | No | Yes |
| Chat | Yes | Yes |
| Manage system settings | No | Yes |

## 12. Functional Requirements

| ID | Requirement | Description |
|---|---|---|
| FR-01 | Authentication | Users shall securely log in and log out. |
| FR-02 | Staff Registration | New staff shall submit required information for approval. |
| FR-03 | Approval | The manager shall approve or reject pending staff accounts. |
| FR-04 | Staff Dashboard | Staff shall see their current performance, KPI status, feedback, and announcements. |
| FR-05 | Manager Dashboard | The manager shall see branch-level performance summaries and staff status. |
| FR-06 | KPI Management | The manager shall create, edit, activate/deactivate, and assign KPIs. |
| FR-07 | Daily KPI Entry | Staff shall record actual daily achievements for assigned KPIs. |
| FR-08 | KPI Validation | The system shall validate required fields and acceptable values before submission. |
| FR-09 | Performance Calculation | The system shall calculate performance according to approved KPI formulas. |
| FR-10 | Performance History | Users shall access appropriate historical performance data. |
| FR-11 | Performance Monitoring | The manager shall filter performance by time period and staff. |
| FR-12 | Feedback | The manager shall provide feedback linked to staff performance. |
| FR-13 | Announcements | The manager shall create and manage branch announcements. |
| FR-14 | Chat | Authorized users shall communicate through internal chat. |
| FR-15 | Profile | Users shall view and update permitted profile information. |
| FR-16 | Reports | The system shall provide performance summaries suitable for management review. |
| FR-17 | Auditability | Important actions shall be recorded in audit logs. |
| FR-18 | Access Control | The backend shall enforce permissions for protected resources. |

## 13. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | Use secure authentication, password hashing, HTTPS, authorization, and input validation. |
| Usability | Interfaces should be simple enough for daily staff use with clear status and feedback. |
| Performance | Normal dashboard and form operations should respond promptly under expected branch load. |
| Reliability | Submitted KPI records should not be silently lost or duplicated. |
| Availability | The deployment environment should meet branch-approved availability expectations. |
| Maintainability | Use modular code, documented APIs, consistent naming, and version control. |
| Scalability | Architecture should allow future expansion without redesigning the entire system. |
| Accessibility | Use readable typography, sufficient contrast, keyboard-friendly controls, and clear labels. |
| Data Integrity | Use database constraints, validation, and transactional operations where appropriate. |
| Auditability | Record important account, KPI, and management actions. |

## 14. Core User Flows

### 14.1 Staff Registration

```text
Registration
→ Staff Information
→ Password Setup
→ Verification
→ Pending Approval
→ Manager Approval
→ Account Activated
→ Login
→ Staff Dashboard
```

### 14.2 Daily KPI Entry

```text
Staff Dashboard
→ Daily KPI Entry
→ System Loads Assigned KPIs
→ Enter Actual Achievement
→ Review
→ Submit
→ Validation
→ Save
→ Performance Updated
→ Confirmation
```

### 14.3 Manager Performance Review

```text
Manager Login
→ Manager Dashboard
→ Performance
→ Select Time Period
→ Select Staff
→ KPI Details
→ Review Results
→ Give Feedback
→ Staff Receives Feedback
```

### 14.4 Staff Management

```text
Manager Dashboard
→ Staff
→ Pending Registrations
→ Review Staff Information
→ Approve/Reject
→ If Approved: Assign Role/KPIs
→ Account Available
```

## 15. Screen Specifications

| ID | Screen | Key Content |
|---|---|---|
| AUTH-01 | Login | Employee ID/username, password, remember option if approved, login, forgot password. |
| AUTH-02 | Staff Registration | Full name, employee ID, branch, position, contact, password, confirmation, and required verification. |
| AUTH-03 | Approval Status | Pending/approved/rejected state and next action. |
| STAFF-01 | Staff Dashboard | Overall performance, daily/weekly/monthly view, KPI status, trend, feedback, and announcements. |
| STAFF-02 | Daily KPI Entry | Date, assigned KPIs, target, actual achievement, validation, and submit. |
| STAFF-03 | KPI History | Historical submissions with dates, targets, actuals, and calculated status. |
| STAFF-04 | Performance | Performance summary and trend across approved time periods. |
| STAFF-05 | Feedback | Manager feedback and feedback history. |
| STAFF-06 | Announcements | Current and previous branch announcements. |
| STAFF-07 | Chat/Profile | Internal communication and permitted personal information. |
| MGR-01 | Manager Dashboard | Branch performance, staff count, entries today, trends, status, and attention items. |
| MGR-02 | Staff Management | All staff, details, pending registrations, and approvals. |
| MGR-03 | KPI Overview | KPI list, target, frequency, status, search, and add KPI. |
| MGR-04 | Add/Edit KPI | Name, description, target, unit, frequency, assignment, and status. |
| MGR-05 | Performance | Daily/weekly/monthly/quarterly staff monitoring. |
| MGR-06 | Staff Performance Detail | Individual KPI results, history, trends, and feedback action. |
| MGR-07 | Feedback | Create and review feedback. |
| MGR-08 | Announcements | Create, publish, and manage announcements. |
| MGR-09 | Chat | Manager conversations and branch communication. |
| MGR-10 | Settings | Approved system and profile settings. |

## 16. KPI Management & Performance Logic

A **KPI (Key Performance Indicator)** represents an approved measure of expected versus actual performance. The system should load KPIs based on the staff member's approved assignment rather than assuming every employee has identical KPIs.

### 16.1 KPI Configuration

- KPI Name
- Description
- Target
- Measurement Unit
- Frequency
- Assigned Role/Staff
- Active/Inactive status
- Approved calculation rule
- Optional weight, if branch management requires weighted KPIs

### 16.2 Conceptual Calculation

```text
Performance % = (Actual Achievement ÷ Target) × 100
```

This is a **conceptual example only**. The actual formula must be confirmed for each KPI. Some KPIs may require different formulas, caps, minimum thresholds, inverse calculations, or weighting.

### 16.3 Status

The interface may use statuses such as:

- On Target
- Needs Attention
- Below Target

Exact thresholds must be approved by branch management and documented before implementation.

## 17. Database Design

| Entity | Purpose | Key Relationships |
|---|---|---|
| `users` | Authentication and user profile | Belongs to branch; has role. |
| `branches` | Branch information | One branch has many users. |
| `kpis` | KPI definitions | Assigned through KPI assignments. |
| `kpi_assignments` | Links KPIs to staff/roles | User ↔ KPI. |
| `kpi_entries` | Daily/periodic actual results | User + KPI + date. |
| `feedback` | Management feedback | Staff + manager + optional performance context. |
| `announcements` | Branch announcements | Created by manager; audience rules. |
| `chat_conversations` | Chat threads | Participants and messages. |
| `chat_participants` | Conversation membership | User ↔ conversation. |
| `chat_messages` | Individual messages | Conversation + sender. |
| `audit_logs` | Important activity history | Actor + action + timestamp. |
| `system_settings` | Approved configurable settings | Managed by authorized administrator. |

## 18. API Requirements

| Capability | Example Endpoints | Purpose |
|---|---|---|
| Authentication | `/auth/login`, `/auth/register`, `/auth/refresh` | Account access and session handling. |
| Users/Staff | `/staff`, `/staff/:id`, `/staff/pending` | Staff management. |
| KPIs | `/kpis`, `/kpis/:id` | KPI CRUD and status. |
| Assignments | `/kpi-assignments` | Assign KPIs to staff/roles. |
| KPI Entries | `/kpi-entries` | Create and retrieve performance entries. |
| Performance | `/performance/daily`, `/performance/monthly` | Aggregated performance. |
| Feedback | `/feedback` | Create and retrieve feedback. |
| Announcements | `/announcements` | Create, publish, and read announcements. |
| Chat | `/conversations`, `/messages` | Chat data; Socket.IO for live events if enabled. |
| Audit | `/audit-logs` | Restricted activity history. |

> Endpoint names are illustrative and should be finalized during backend implementation. Every protected endpoint should enforce authorization on the server.

## 19. Authentication, Authorization & Security

- Use secure password hashing; never store plaintext passwords.
- Use HTTPS in deployed environments.
- Enforce role-based permissions on the backend.
- Validate all input on both client and server where appropriate.
- Protect authentication tokens and session information.
- Do not expose secrets or API keys in source control.
- Use database constraints and transactions where needed to protect data integrity.
- Keep audit logs for important administrative actions.
- Avoid storing sensitive information in application logs.
- Define backup and recovery procedures before production deployment.
- Confirm all bank-specific security, network, hosting, retention, and access requirements with authorized stakeholders.

## 20. Code-First UI / UX Approach

The team will not require a full Figma design workflow for the initial project. Paper wireframes serve as functional planning artifacts. The frontend team will implement the interface directly in Next.js using Tailwind CSS and reusable components.

### UI Workflow

```text
Paper wireframe
→ Coded screen
→ Browser review
→ Feedback
→ Refinement
```

Additional guidance:

- Maintain a small documented design system covering typography, spacing, buttons, forms, tables, cards, statuses, and navigation.
- Build reusable components instead of styling every page independently.
- Test desktop and mobile/responsive layouts even if the main users are expected to use desktop computers.

## 21. Development Workflow

- Use GitHub as the central repository.
- Protect the main branch and merge reviewed changes.
- Use feature branches for substantial work.
- Use pull requests for code review.
- Keep frontend and backend changes clearly separated.
- Document API contracts and database changes.
- Use meaningful commit messages.
- Test features before merging.

Suggested repository structure:

```text
boa-performance-system/
├── frontend/
├── backend/
├── docs/
├── database/
└── README.md
```

## 22. Initial 7-Day Development Plan

| Day | Project Lead / UI | Frontend | Backend |
|---|---|---|---|
| 1 | Requirements, sitemap, user flows | Project setup and architecture | DB entities and auth planning |
| 2 | Paper wireframes and screen specifications | Layout, navigation, and component system | Database schema and auth foundation |
| 3 | Review coded UI | Login and dashboard UI | Users, roles, and authentication APIs |
| 4 | Review KPI flows | KPI entry and performance screens | KPI, assignment, and entry APIs |
| 5 | UX review and refinement | Feedback, announcements, and chat UI | Performance, feedback, and announcement APIs |
| 6 | Full system review | Integration and responsive polish | Integration, validation, and bug fixes |
| 7 | Demo preparation and documentation | UI polish and fixes | API/database stabilization and demo support |

## 23. Testing Strategy

### 23.1 Functional Testing

- Login, registration, and approval.
- KPI assignment and daily submission.
- Performance calculation.
- Feedback, announcements, and chat.
- Role restrictions.
- History and report filters.

### 23.2 Security Testing

- Unauthorized access attempts.
- Role escalation attempts.
- Invalid input and validation.
- Authentication/session behavior.
- Sensitive data exposure.
- Secrets and configuration review.

### 23.3 User Acceptance Testing

The branch manager and selected staff should test realistic workflows using approved requirements and representative data before production acceptance.

## 24. Deployment & Operations

- Select hosting only after confirming bank security and network requirements.
- Use separate development and production environments where feasible.
- Configure environment variables securely.
- Enable database backups and document restore procedures.
- Monitor application errors and service health.
- Define who is responsible for deployment and emergency fixes.
- Document release versions and database migrations.

## 25. Risks & Mitigation

| Risk | Potential Impact | Mitigation |
|---|---|---|
| Unclear KPI definitions | Incorrect performance calculations | Obtain written KPI definitions, targets, and formulas before final implementation. |
| Scope expansion | Delays and complexity | Freeze MVP scope and maintain a change log. |
| Security requirements discovered late | Rework or deployment failure | Validate security/network requirements early. |
| Poor data quality | Unreliable reports | Validation, constraints, and review workflows. |
| Team dependency | Blocked development | Clear ownership, daily check-ins, and Git workflow. |
| Hardware/tool limitations | Development delays | Keep documentation and source code synchronized across the team. |

## 26. Future Enhancements

- Multi-branch support.
- Advanced analytics and KPI trend analysis.
- Exportable management reports.
- Email or push notifications if approved.
- Integration with approved existing bank systems.
- Advanced audit and compliance reporting.
- Mobile application or Progressive Web App (PWA).
- More sophisticated real-time collaboration.

## 27. MVP Priorities

| Priority | Features |
|---|---|
| P0 — Core | Login, registration/approval, staff/manager dashboards, KPI management, KPI assignment, daily KPI entry, calculation, and performance monitoring. |
| P1 — Important | Feedback, announcements, profile, performance history/reports, and chat. |
| P2 — Later | Advanced analytics, exports, multi-branch support, integrations, and advanced notifications. |

## 28. Acceptance Criteria

- Authorized users can securely log in.
- New staff accounts follow the approved registration and manager approval process.
- The manager can create/assign approved KPIs.
- Staff can submit daily KPI achievements.
- The system calculates performance using approved rules.
- The manager can monitor performance by approved time periods.
- The manager can provide feedback.
- Announcements and authorized chat functions work as specified.
- Role restrictions prevent users from accessing unauthorized management functions.
- Important actions are auditable.
- Stakeholders approve the final KPI definitions and operational rules.
- The system passes agreed functional, security, and user acceptance testing.

## 29. Stakeholder Validation Checklist

1. Which staff positions are included in the system?
2. What are the official KPIs for each position?
3. What is the target for each KPI?
4. What measurement unit is used?
5. What is the exact calculation formula?
6. What is the KPI frequency?
7. Are KPIs weighted?
8. How should over-target performance be handled?
9. What thresholds define each performance status?
10. Can staff edit a submitted KPI entry, and until when?
11. Does every daily submission require manager approval?
12. How should missing KPI entries be treated?
13. What is the exact registration and approval process?
14. Which staff profile fields are mandatory?
15. Who can view individual performance?
16. How long should performance records be retained?
17. Are there rules for chat content and retention?
18. Who receives each announcement?
19. Are notifications required?
20. Where will the system be hosted?
21. What bank network/security requirements apply?
22. Is there an approved authentication method or identity provider?
23. What backup and disaster-recovery requirements apply?
24. Which reports are required by management?
25. Are integrations with existing systems required?

## 30. Requirement Change Log

| Version | Date | Change | Status |
|---|---|---|---|
| 1.0 | 2026-10-02 | Initial project documentation baseline; single branch; manager as administrator; code-first UI approach. | Draft for stakeholder validation |

## 31. Final Implementation Principle

The team should treat this document as a living requirements baseline. Confirmed requirements should be implemented and versioned. Any change to KPI definitions, permissions, workflows, security, reports, or scope should be recorded and reviewed before it becomes part of the production system.

### Next Immediate Milestone

Finalize the stakeholder validation checklist, confirm the actual branch KPIs and rules, finalize the database schema/API contract, then begin the code-first UI implementation.
