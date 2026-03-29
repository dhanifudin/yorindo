# Sprint Change Proposal SCP-2026-03-28-F

**Date:** 2026-03-28
**Proposed by:** bmad-correct-course
**Status:** Approved
**Classification:** Moderate — story-to-epic alignment gap
**Affected Stories:** Story 5.1, Story 5.3

---

## Section 1 — Issue Summary

Story 5.1 was implemented with a plain `textarea` and an explicit "DO NOT use WYSIWYG" anti-pattern. This contradicts the Epic 5 specification, which states "Template editor (rich text + variable substitution preview)" and already includes a fully written `{{qr_code}}` AC for `type=confirmation|ticket_delivery`. The implementation closed out incomplete — the rich-text editor and QR variable were never carried into the implementation story file.

Story 5.3 (blast delivery) has no QR code generation step, meaning the `{{qr_code}}` variable has nowhere to resolve at send time.

Story 6.6 (QR ticket display page) is **not affected** — it already correctly specifies AES-256-GCM encrypted `qrPayload` and the `/tickets/[token]` participant display page.

---

## Section 2 — Impact Analysis

| Artifact | Impact |
|---|---|
| `5-1-notification-message-template-management.md` | Remove textarea anti-pattern; add `shadcn-tiptap` for email channel; add `{{qr_code}}` AC; add `ticket_delivery` template type; add Tasks 7–8 |
| `5-3-blast-scheduling-delivery-via-brevo-everpro.md` | Add QR code generation step in `substituteVariables()`; add WhatsApp image attachment handling |
| `6-6-qr-ticket-generation-delivery.md` | No changes |
| `sprint-status.yaml` | `last_updated` updated; SCP-F marker added to Stories 5.1 and 5.3 |

---

## Section 3 — Recommended Approach

**Direct Adjustment** — update 2 implementation story files only. No new stories, no rollback, no MVP scope change.

**`shadcn-tiptap`** community package selected for email channel editor:
- Already styled to match the admin UI (shadcn design system)
- Ships with toolbar; extensible with `@tiptap/extension-image`
- Zero custom styling needed
- WhatsApp channel keeps plain textarea (WhatsApp does not render HTML)

**`{{qr_code}}` variable:**
- Available only for `type=confirmation | ticket_delivery` templates
- In TipTap editor: shown as visual placeholder block
- In preview panel: rendered via `react-qr-code` with value "SAMPLE"
- At blast send time: `qrcode.toDataURL(ticketUrl)` → base64 PNG → inline `<img>` in email; Everpro image attachment for WhatsApp

---

## Section 4 — Detailed Change Proposals

### Story 5.1 — Anti-pattern override

**OLD:**
```
DO NOT use a WYSIWYG editor — plain textarea is sufficient for Phase 1
```

**NEW:**
```
Use shadcn-tiptap community package (npm: shadcn-tiptap) for channel=email templates.
WhatsApp channel keeps plain textarea (WhatsApp does not render HTML).
Template form branches on channel: TipTap shown when channel=email; textarea shown when channel=whatsapp.
```

### Story 5.1 — New AC6 (from epic, now in implementation story)

```
AC6: Given a template of type `confirmation` or `ticket_delivery`,
     When I insert the {{qr_code}} variable in the body (via toolbar button),
     Then the TipTap editor shows a visual placeholder block
     "QR Code — digenerate otomatis per peserta";
     in the live preview panel, a sample QR image renders via react-qr-code with value "SAMPLE";
     when the blast worker sends the message, the participant's actual ticket QR is embedded
     (base64 inline PNG for email; image attachment for WhatsApp).
```

### Story 5.3 — QR code generation at send time

**OLD:**
```typescript
substituteVariables(template.body, { name, event_title, date, venue })
```

**NEW:**
```typescript
substituteVariables(template.body, { name, event_title, date, venue, qr_code })
// qr_code resolved per-recipient:
// - if type === 'confirmation'|'ticket_delivery' AND ticket_token set:
//     ticketUrl = `${config.baseUrl}/tickets/${registration.ticket_token}`
//     qr_code = `<img src="${await qrcode.toDataURL(ticketUrl)}" alt="QR Tiket" width="200" />`
// - else: qr_code = '' (removes placeholder)
// WhatsApp: if qr_code present, send QR as separate Everpro image message after text
```

---

## Section 5 — Implementation Handoff

**Scope: Moderate** — story file updates only; implementation deferred to dev agent per sprint plan.

| Action | Agent |
|---|---|
| Story file changes | Applied by this session |
| Implement TipTap + `{{qr_code}}` editor | Dev agent (Story 5.1) |
| Implement QR generation at blast send time | Dev agent (Story 5.3) |

**Success criteria:**
- Admin can edit email templates in TipTap; WhatsApp templates use textarea
- `{{qr_code}}` toolbar button visible only for `confirmation` and `ticket_delivery` template types
- Preview renders sample QR image in-editor
- Blast delivery for confirmation templates inlines a real per-recipient QR PNG in the email body
- WhatsApp confirmation sends QR as image attachment after text
