# Yorindo App

Frontend for the **Yorindo** event-management platform built with Next.js 14 App Router.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (plain utility classes — no shadcn/ui) |
| State | Zustand |
| Data fetching | TanStack React Query v5 |
| Tables | TanStack Table v8 |
| Forms | React Hook Form v7 + Zod v4 |
| Charts | Recharts v3 |
| API mocking | MSW v2 |
| IndexedDB | idb v8 |
| Tests | Vitest + Testing Library |

> **Note:** This project does **not** use shadcn/ui. All UI components are hand-crafted with Tailwind CSS utility classes.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

## Test Credentials (MSW / Dev Mode)

All API calls in dev are intercepted by MSW. Use the following accounts to test role-specific navigation:

| Role | Email | Password | Redirects to |
|---|---|---|---|
| **Admin** | `admin@yorindo.app` | `password123` | `/admin` — full access |
| **Staff** | `budi@yorindo.app` | `password123` | `/scan` — check-in only |
| **Viewer** | `sari@yorindo.app` | `password123` | `/admin` — read-only (events + reports) |

### Role Permissions

| Area | Admin | Staff | Viewer |
|---|---|---|---|
| Dashboard `/admin` | ✅ | ❌ | ✅ |
| Contacts `/admin/contacts` | ✅ | ❌ | ❌ |
| Events `/admin/events` | ✅ | ❌ | ✅ |
| Event detail `/admin/events/:id` | ✅ | ❌ | ✅ |
| Event report `/admin/events/:id/report` | ✅ | ❌ | ✅ |
| Templates `/admin/templates` | ✅ | ❌ | ❌ |
| Users `/admin/users` | ✅ | ❌ | ❌ |
| Check-in `/scan` | ❌ | ✅ | ❌ |
| Public registration `/register/:slug` | 🌐 public | 🌐 public | 🌐 public |
| Data rights `/data-rights/*` | 🌐 public | 🌐 public | 🌐 public |

## Running Tests

```bash
npm test              # run all tests once
npm run test:watch    # watch mode
npm run test:coverage # coverage report
```

## Project Structure

```
src/
  app/
    (admin)/          # Role-guarded admin shell (admin + viewer only)
      contacts/
      events/[id]/
        report/
      templates/
      users/
    scan/             # Staff check-in surface
    register/[eventSlug]/   # Public event landing + registration
    data-rights/      # UU PDP data request / erasure pages
    login/
  components/
    features/         # Feature-specific components
    forms/            # Shared form components
  hooks/              # React Query hooks (useContacts, useEvents, …)
  mocks/
    handlers/         # MSW request handlers (auth, contacts, events, …)
  store/              # Zustand stores (authStore, filterStore, eventStore)
  lib/
    offline/          # IndexedDB helpers for offline scan queue
  types/
    api.ts            # Shared TypeScript types matching OpenAPI contract
```
