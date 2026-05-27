# PRD — Mosaic: Meeting Room Booking System

## Problem statement
Build a modern internal Meeting Room Booking System (FastAPI + React + MongoDB)
for office use. Employees should be able to book three meeting rooms in real time,
see live room status, manage their bookings, and admins should have full
oversight, room maintenance controls, and utilization analytics.

## User personas
- **Employee**: Books rooms, edits/cancels own bookings, views calendar.
- **Admin** ("Operations"): All employee capabilities + override bookings,
  toggle maintenance, manage users, view analytics.

## Core requirements (static)
1. Rooms: Meeting Room 1, Meeting Room 2, Boardroom.
2. Statuses: Available (green), Booked (blue), Occupied (red), Maintenance (gray).
3. JWT auth with httpOnly cookies; role-based access (employee / admin).
4. Booking validations: no past, end > start, no overlap, max 12h duration,
   room must not be under maintenance.
5. Dashboard, Calendar (Daily/Weekly/Monthly + room filter), My Bookings,
   Admin Panel (overview/all bookings/rooms/users).
6. Real-time via 15s polling on dashboard, 20s on calendar/admin.
7. In-app toast notifications (sonner).
8. Modern corporate dark UI (Outfit + IBM Plex Sans, Swiss/high-contrast).
9. Responsive on mobile (sidebar collapses to bottom nav).

## What's been implemented (2026-02 — initial MVP)
- Backend (FastAPI) with auth (register/login/logout/me/refresh),
  CRUD bookings (create/list/patch/soft-cancel), rooms status endpoint,
  admin analytics, maintenance toggle, user listing, brute-force-safe login
  (bcrypt), MongoDB indexes, idempotent seeder.
- Auto-seeded data: admin@company.com + 4 employees (jane/alex/priya/sam) +
  6 sample bookings spanning past, currently-active (Boardroom), and future.
- Frontend with auth context, protected routes, dark Swiss/high-contrast UI,
  login page with seeded-account quick-fill, dashboard with live status
  + stat strip + upcoming list, booking dialog with full inline validation,
  Daily/Weekly/Monthly calendar with timeline blocks and room filter, My
  Bookings with edit/cancel/history tabs, Admin Panel with bar+line charts,
  maintenance switches, user table, all-bookings table with override.
- Tested end-to-end by testing agent: backend pytest 22/22 green, all
  frontend critical flows working.

## Backlog (priority order)
**P1**
- Email notifications (Resend/SendGrid) for confirmations, cancellations,
  T-15-min upcoming reminders.
- Reactivate /api/admin/bookings/{id} as dedicated admin override (currently
  shared with /api/bookings/{id} via role check).
- WebSocket push for real-time updates (replace polling).
**P2**
- Recurring bookings (weekly, daily).
- Per-team booking quotas and reports CSV export.
- Calendar invitations (.ics download) + Google/Outlook sync.
- Light theme toggle (dark is currently the only theme).
- iCal feed per room.
**P3**
- Floor plan / room map visualization.
- Mobile native app.

## Tech notes
- Cookies set with `secure=False` (preview-friendly); flip to `secure=True`
  + `samesite=none` in production HTTPS.
- All datetimes stored as UTC ISO strings.
- All backend routes prefixed with `/api`.
- Run tests: `pytest /app/backend/tests/ -v --junitxml=/app/test_reports/pytest/pytest_results.xml`
