# EM . U — Project Knowledge Index

**Project:** EM . U Event Management Platform
**Updated:** 2026-04-13

## Documentation

| File | Type | Description |
|------|------|-------------|
| [database-schema.md](./database-schema.md) | Database | Visual ERD, table reference, enums, and indexes |
| [contact-flow.md](./contact-flow.md) | User Guide | Contact import, normalization, flagging, and blast flow |
| [business-flow.md](./business-flow.md) | Business Flow | Event lifecycle, registration, check-in, and reporting flows |
| [system-design.md](./system-design.md) | Architecture | System design, tech stack, infrastructure, and cost analysis |
| [secrets-setup.md](./secrets-setup.md) | Setup | Environment variable configuration guide |
| [yorindo_system_design_v1_18 03 26.pdf](./yorindo_system_design_v1_18%2003%2026.pdf) | Reference | Original system design PDF (v1, 2026-03-18) |

## Quick Reference

**Monorepo Parts:**
- `yorindo-app/` — Next.js 16 + React 19 frontend
- `yorindo-api/` — Fastify 4 + TypeScript backend

**Key Tech:**
- FE: Next.js 16, React 19, TypeScript, shadcn/ui, Tailwind v4, Zustand, TanStack Query, Vitest
- BE: Fastify 4, TypeScript, PostgreSQL 16, Redis 7, BullMQ, Zod, JWT

**Roles:** `admin` → `staff` → `viewer` → `participant`

**Environments:**

| Environment | URL | Trigger |
|-------------|-----|---------|
| **Development** | `localhost:5173` (app) / `localhost:3000` (api) | `make up-dev` |
| **Demo** | `demo.dhanifudin.com` | Tag `v*.*.*` |
| **Production** | `app.dhanifudin.com` | Push to `main` |
