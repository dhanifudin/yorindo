# EM . U — Project Knowledge Index

**Project:** EM . U Event Management Platform
**Generated:** 2026-03-25 (bmad-document-project, quick scan)

## Documentation

| File | Type | Description |
|------|------|-------------|
| [system-design.md](./system-design.md) | Architecture | Full system design: architecture, data models, API, FE/BE structure, auth, key flows |
| [secrets-setup.md](./secrets-setup.md) | Setup | Environment variable configuration guide |
| [yorindo_system_design_v1_18 03 26.pdf](./yorindo_system_design_v1_18%2003%2026.pdf) | Reference | Original system design PDF (v1, 2026-03-18) |
| [Project Brief EM . U - KADA.pdf](./Project%20Brief%20Yorindo%20-%20KADA.pdf) | Reference | Project brief and business requirements |

## Quick Reference

**Monorepo Parts:**
- `yorindo-app/` — Next.js 16 + React 19 frontend (Port 3000)
- `yorindo-api/` — Fastify 4 + TypeScript backend (Port 3000)

**Key Tech:**
- FE: Next.js 16, React 19, TypeScript, shadcn/ui, Tailwind v4, Zustand, TanStack Query, MSW v2, Vitest
- BE: Fastify 4, TypeScript, PostgreSQL 16, MongoDB 7, Redis 7, BullMQ, Zod, JWT

**Dev approach:** Phase 1 FE-first (MSW mocks + in-memory repos). Phase 2 connects real DB + external services.

**Roles:** `admin` → `staff` → `viewer` → `participant`

**Sprint artifacts:** `_bmad-output/implementation-artifacts/sprint-status.yaml`
