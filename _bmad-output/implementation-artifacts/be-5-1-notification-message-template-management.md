# Story be-5.1: Notification Message Template Management (Backend)

**Story ID:** be-5.1
**Story Key:** be-5-1-notification-message-template-management
**Epic:** Epic 5 — Invitation Blast & Notifications
**Phase:** Phase 2 (BE)
**Status:** review
**Created:** 2026-03-30

---

## Story

As an admin,
I want to create, edit, and manage notification message templates via the backend API,
So that the application can serve these templates, validate them, and store them securely.

---

## Acceptance Criteria

**AC1:** Given I am authenticated as `admin`,
When `POST /api/templates` is called with `{ name, type, channel, body }`,
Then it returns HTTP 201 and creates the template in the data store.

**AC2:** Given I am authenticated as `admin`,
When `GET /api/templates` is called,
Then it returns all stored templates.

**AC3:** Given I am authenticated as `admin`,
When `PATCH /api/templates/:id` is called,
Then the record is updated in the data store and an audit log `template.updated` is written.

**AC4:** Given I am authenticated as `admin`,
When `DELETE /api/templates/:id` is called,
Then the template is removed from the store and an audit log `template.deleted` is written.

---

## Tasks / Subtasks

- [x] **Task 1: Define Interface and Types**
  - [x] Add `ITemplateRepository` in `src/interfaces/repositories/ITemplateRepository.ts`.
  - [x] Add `Template`, `CreateTemplateDTO`, `UpdateTemplateDTO` types in `src/types/templates.ts` using Zod.

- [x] **Task 2: Build Memory Repository**
  - [x] Implement `TemplateRepository` in `src/repositories/memory/TemplateRepository.ts` matching `ITemplateRepository`.
  - [x] Default seed the 4 templates used in MSW (if applicable) or allow empty.

- [x] **Task 3: Integrate with DI Container**
  - [x] Add `TemplateRepository` to the dependency injection container (or singleton exports, e.g. `src/repositories/index.ts`).

- [x] **Task 4: Build Route Handler**
  - [x] Create `src/routes/templates.routes.ts`.
  - [x] Implement `GET`, `POST`, `PATCH`, `DELETE` using `TemplateRepository`.
  - [x] Apply `requireAuth` and `requireRole('admin')` middleware.
  - [x] Integrate with `AuditLogRepository` to log `template.created`, `template.updated`, `template.deleted`.

- [x] **Task 5: Write API Tests**
  - [x] Add `src/routes/templates.routes.test.ts` to test creation, retrieval, updates, and deletes.
  - [x] Ensure role checking denies `viewer` and `staff`.

---

## Dev Notes
- Ensure template bodies are validated as strings (length constraints).
- The templates are: `type: 'invitation' | 'confirmation' | 'rejection' | 'ticket_delivery'` and `channel: 'email' | 'whatsapp'`.

---

## Dev Agent Record
### Implementation Plan
### Debug Log
### Completion Notes

---

## File List

---

## Change Log
| Date | Change | Author |
|------|--------|--------|
| 2026-03-30 | Created BE story | bmad-create-story |
