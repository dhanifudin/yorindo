# Sprint Change Proposal 2026-03-26j
# Vendor Entity & Event Sponsorship Relationship

**Date:** 2026-03-26
**Scope Classification:** Moderate — data model extension, 4 new stories, 1 story updated, PRD + Architecture patches
**Status:** Approved

---

## Section 1: Issue Summary

During product review, it was identified that the `Vendor` concept — richly described in the PRD (Journeys 7, 8, 10) as a first-class participant in the EM . U ecosystem — has no backing data model. Vendor companies (e.g., Alibaba Cloud, AWS, ERP software companies) who sponsor events are currently represented only as a scalar `vendor_contact_email` string on the `events` table (FR45). This means:

- A vendor company cannot be profiled (name, logo, website, industry, tier)
- Vendors cannot be reused across events without re-entering contact details
- There is no `event_sponsors` relationship — a vendor cannot be formally attached as a sponsor of an event with a tier (gold, silver, bronze) or display order
- Story 8.2 (vendor magic link) generates a link to a raw email, not a linked vendor record — breaking the traceability required for audit and DPA re-acceptance tracking
- The event landing page has no sponsor display capability

This is a foundational data model gap. The fix adds a `vendors` table, an `event_sponsors` junction, and the CRUD + association workflows to manage them.

---

## Section 2: Impact Analysis

**Files changed:** Architecture (data model + API), PRD (FRs), Epics (4 new stories + 1 update)
**Epics affected:** Epic 4 (Event Configuration), Epic 6 (Registration), Epic 8 (Vendor Intelligence)
**Sprint-status changes:** 4 new stories added, Story 8.2 acceptance criteria updated

### Technical Impact

**New PostgreSQL tables:**

```sql
-- vendors table
CREATE TABLE vendors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200) NOT NULL,
  logo_url      TEXT,
  website       TEXT,
  contact_email VARCHAR(255) NOT NULL,
  industry      VARCHAR(100),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- event_sponsors junction
CREATE TABLE event_sponsors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  vendor_id     UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  tier          VARCHAR(50) NOT NULL DEFAULT 'standard', -- standard | premium | lead_intelligence
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, vendor_id)
);
```

**New API endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/vendors` | List all vendors (paginated) |
| POST | `/api/vendors` | Create vendor |
| PATCH | `/api/vendors/:id` | Update vendor |
| DELETE | `/api/vendors/:id` | Soft delete vendor |
| GET | `/api/events/:id/sponsors` | List sponsors for an event |
| POST | `/api/events/:id/sponsors` | Attach vendor as sponsor |
| PATCH | `/api/events/:id/sponsors/:vendorId` | Update tier/order |
| DELETE | `/api/events/:id/sponsors/:vendorId` | Remove sponsor from event |

**Deprecation:**
- `events.vendor_contact_email` column is superseded by `event_sponsors` → `vendors.contact_email`. The column is retained in Phase 1 as nullable for backward compatibility; removed in Phase 2 migration.

**Story 8.2 update:**
- Magic link generation resolves the vendor contact email from `event_sponsors JOIN vendors` instead of `events.vendor_contact_email`
- DPA re-acceptance is now tracked per `vendor_id` + DPA version, not per email string

---

## Section 3: Recommended Approach

**Direct Adjustment** — Add 4 new stories to existing epics; update Story 8.2 acceptance criteria. No rollback or MVP scope reduction needed.

**Rationale:**
- Vendor intelligence is a core product differentiator (PRD Section 6, Journeys 7–10). Leaving vendors as email strings undermines the product vision.
- The new tables are additive — no existing story implementations are broken, only Story 8.2 gets an AC update.
- Phase 1 mock implementations (in-memory repos) are straightforward to add.

**Effort:** Medium (4 new stories, ~2 sprint days for FE+BE across all new stories)
**Risk:** Low — purely additive data model change

---

## Section 4: Detailed Change Proposals

### Change 1: PRD — FR45 Update + New FRs

**Section: Reporting & Vendor Intelligence Functional Requirements**

OLD:
```
- **FR45:** Super admin can configure vendor contact email and report tier (standard / Lead Intelligence Suite) per event
```

NEW:
```
- **FR45:** Super admin can create and manage vendor companies (name, logo URL, website, contact email, industry) in a vendor roster
- **FR45a:** Event admin can attach one or more vendors from the roster to an event as sponsors, specifying sponsorship tier (standard / premium / lead_intelligence) and display order
- **FR45b:** Vendor magic link generation resolves the recipient email from the linked vendor record; DPA acceptance is tracked per vendor ID and DPA version
- **FR45c:** Sponsor logos and names are optionally displayed on the public event landing page in display-order sequence
```

**Section: MVP Feature Set — Event Management**

OLD:
```
| **Basic Analytics & Report** | … magic link report delivery (signed URL + HMAC + expiry) |
| **Vendor DPA Acceptance Gate** | Checkbox + timestamp + DPA version reference stored per vendor record; re-acceptance required on DPA version change |
```

NEW: Add row:
```
| **Vendor Roster & Sponsorship** | Vendor CRUD (name, logo, contact email, industry); attach vendors to events with tier (standard / premium / lead_intelligence) and display order; sponsor logo strip on public event page |
```

---

### Change 2: Architecture — Data Model

**Section: Data Architecture — PostgreSQL Schema**

Add after `events` table definition:

```
### vendors
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(200) | NOT NULL |
| logo_url | TEXT | VPS-served or external CDN |
| website | TEXT | |
| contact_email | VARCHAR(255) | NOT NULL — used for magic link delivery |
| industry | VARCHAR(100) | |
| notes | TEXT | Internal notes for EM . U AM |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |

### event_sponsors
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| event_id | UUID FK | → events.id ON DELETE CASCADE |
| vendor_id | UUID FK | → vendors.id ON DELETE RESTRICT |
| tier | VARCHAR(50) | 'standard' \| 'premium' \| 'lead_intelligence' |
| display_order | INTEGER | For ordered sponsor strip rendering |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() |
| UNIQUE | (event_id, vendor_id) | One record per event-vendor pair |
```

**Section: API Contracts**

Add new resource group:

```
### Vendor Resource
GET    /api/vendors                         # List vendors (paginated, search by name)
POST   /api/vendors                         # Create vendor
PATCH  /api/vendors/:id                     # Update vendor
DELETE /api/vendors/:id                     # Soft delete (sets deleted_at)

### Event Sponsors Sub-resource
GET    /api/events/:id/sponsors             # List sponsors for event (ordered by display_order)
POST   /api/events/:id/sponsors             # { vendorId, tier, displayOrder }
PATCH  /api/events/:id/sponsors/:vendorId   # { tier?, displayOrder? }
DELETE /api/events/:id/sponsors/:vendorId   # Remove sponsor
```

**Section: events table**

Update note on `vendor_contact_email`:
```
DEPRECATED: events.vendor_contact_email — superseded by event_sponsors → vendors.contact_email.
Retain as nullable in Phase 1; remove in Phase 2 migration.
```

---

### Change 3: Epic 4 — New Story 4.14: Vendor Management (CRUD)

**New story — insert after Story 4.13**

```
## Story 4.14: Vendor Roster Management

As a super admin,
I want to create, view, edit, and delete vendor companies in a central roster,
So that vendor profiles can be reused across multiple events without re-entering contact information.

**Acceptance Criteria:**

**Given** I navigate to `/app/vendors`,
**When** the page loads,
**Then** a paginated table of vendors is shown with columns: Name, Industry, Contact Email, Logo (thumbnail), Events (count of linked events), Actions

**Given** I click "Tambah Vendor",
**When** a form modal opens,
**Then** I can fill in: Name (required), Logo URL, Website, Contact Email (required), Industry, Notes; on submit `POST /api/vendors` is called and the new vendor appears in the table

**Given** I edit an existing vendor,
**When** `PATCH /api/vendors/:id` is called,
**Then** all events linked to this vendor automatically use the updated name/email/logo without additional action

**Given** I attempt to delete a vendor that is linked to one or more events,
**When** `DELETE /api/vendors/:id` is called,
**Then** HTTP 409 is returned: "Vendor masih terhubung ke N event — hapus keterkaitan terlebih dahulu"; the vendor is not deleted

**Given** I delete a vendor with no event links,
**When** `DELETE /api/vendors/:id` is called,
**Then** `deleted_at` is set (soft delete) and the vendor disappears from the active roster

**Phase 1:** In-memory `IVendorRepository` + MSW handlers; vendor list page + modal form wired to MSW
**Phase 2:** PostgreSQL `VendorRepository` implementation; migrate any existing `events.vendor_contact_email` values to vendor records
```

---

### Change 4: Epic 4 — New Story 4.15: Event Sponsor Attachment

**New story — insert after Story 4.14**

```
## Story 4.15: Attach Sponsors to Event

As an event admin,
I want to attach one or more vendors from the roster to an event as sponsors with a tier and display order,
So that sponsor information is formally linked to the event for report delivery, landing page display, and audit purposes.

**Acceptance Criteria:**

**Given** I am on the event edit form or Overview tab,
**When** the "Sponsors" section renders,
**Then** it shows currently attached sponsors (logo thumbnail, name, tier badge) and an "Tambah Sponsor" button

**Given** I click "Tambah Sponsor",
**When** a searchable dropdown opens,
**Then** it shows vendors from the roster; selecting one calls `POST /api/events/:id/sponsors` with `{ vendorId, tier: 'standard', displayOrder: n }`

**Given** a sponsor is attached,
**When** I change the tier (standard / premium / lead_intelligence),
**Then** `PATCH /api/events/:id/sponsors/:vendorId` is called with the new tier; the badge updates

**Given** I reorder sponsors via drag-and-drop,
**When** the order changes,
**Then** `PATCH /api/events/:id/sponsors/:vendorId` is called for each reordered entry with updated `displayOrder`

**Given** I click the remove (×) button on a sponsor,
**When** confirmed in a dialog,
**Then** `DELETE /api/events/:id/sponsors/:vendorId` is called; the sponsor is removed

**Given** the event has sponsors with tier `lead_intelligence`,
**When** `POST /api/events/:id/vendor-link` is called (Story 8.2),
**Then** the magic link is generated using the `contact_email` from the linked vendor record — not `events.vendor_contact_email`

**Phase 1:** In-memory `IEventSponsorRepository`; MSW handlers; sponsor panel in event form/overview wired to MSW
**Phase 2:** PostgreSQL implementation; remove `events.vendor_contact_email` fallback
```

---

### Change 5: Epic 6 — New Story 6.9: Sponsor Display on Event Landing Page

**New story — insert after Story 6.8**

```
## Story 6.9: Sponsor Logo Strip on Event Landing Page

As a participant visiting the event registration page,
I want to see the event's sponsors displayed,
So that I know which organizations are backing this event.

**Acceptance Criteria:**

**Given** an event has one or more attached sponsors,
**When** `GET /api/events/:slug/public` is called,
**Then** the response includes `sponsors: [{ name, logo_url, website, tier, displayOrder }]` sorted by `displayOrder` ascending

**Given** the event landing page renders,
**When** sponsors are present,
**Then** a "Didukung oleh" strip is shown below the event details with sponsor logos (linked to `website` if set); sponsors are ordered by `displayOrder`

**Given** no sponsors are attached to the event,
**When** the landing page renders,
**Then** the sponsor strip is not shown — the page layout is unchanged

**Given** a sponsor's `logo_url` is null,
**When** the strip renders,
**Then** the sponsor's name is shown as text instead of a logo image

**Phase 1:** MSW handler for `GET /api/events/:slug/public` returns seeded sponsor data; EventLandingCard renders sponsor strip
**Phase 2:** BE resolves sponsors from `event_sponsors JOIN vendors` query
```

---

### Change 6: Story 8.2 — Acceptance Criteria Update

**Story: 8.2 Vendor Report Access via Magic Link & DPA**

UPDATED AC — replace first criterion:

OLD:
```
**Given** a super admin configures the vendor contact and report tier for an event,
**When** `POST /api/events/:id/vendor-link` is called,
**Then** a time-limited signed URL is generated (max 7-day expiry) and delivered to the configured vendor email (FR41, NFR-S12)
```

NEW:
```
**Given** a super admin has attached a vendor with tier `lead_intelligence` or `premium` to the event (Story 4.15),
**When** `POST /api/events/:id/vendor-link` is called,
**Then** the system resolves the recipient email from `event_sponsors JOIN vendors WHERE tier IN ('premium','lead_intelligence')`; a time-limited signed URL is generated (max 7-day expiry, HMAC signed) and delivered to that email; the `event_sponsor_id` is stored on the magic link record for DPA tracking (FR41, NFR-S12)
```

ADD new AC at end of Story 8.2:
```
**Given** the DPA acceptance is recorded,
**When** stored,
**Then** it references `vendor_id` and `dpa_version` — not a raw email string — so re-acceptance is correctly triggered when either the DPA version changes or a new vendor record is linked
```

---

## Section 5: Implementation Handoff

**Scope:** Moderate — data model addition; requires Sprint Planner (Bob/SM) to insert new stories into sprint-status.yaml before dev picks up.

**New stories to add to sprint-status.yaml:**
- `4-14: Vendor Roster Management` → `ready-for-dev`
- `4-15: Attach Sponsors to Event` → `ready-for-dev` (depends on 4-14)
- `6-9: Sponsor Logo Strip on Event Landing Page` → `ready-for-dev` (depends on 4-15)
- Story `8-2` acceptance criteria updated — no status change (already `review`)

**Success criteria:**
- `vendors` table and `event_sponsors` junction documented in architecture
- PRD FR45 updated, FR45a/45b/45c added
- `/app/vendors` vendor roster page renders with MSW-backed create/edit
- Event form/overview shows sponsor attachment panel with tier selection
- `GET /api/events/:slug/public` returns sponsors array
- Event landing page renders sponsor strip when sponsors present
- Story 8.2 magic link generation resolves email from vendor record (not scalar field)
- `npm run build` — 0 TypeScript errors
- `npm test` — 127/128 (pre-existing failure only)
