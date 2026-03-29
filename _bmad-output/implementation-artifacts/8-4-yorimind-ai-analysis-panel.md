# Story 8.4: YoriMind AI Analysis Panel

## Story
Admin sees AI-generated insights on event detail with regenerate button.

## Acceptance Criteria
- [x] YoriMindPanel component on event detail
- [x] GET /api/events/:id/yorimind with 1200ms delay simulation
- [x] Shows analysis, root_causes, recommendations, tracked_metrics
- [x] Refresh button invalidates cache
- [ ] **AC5:** Given `AI_PROVIDER=disabled`, when the YoriMind panel loads, then display placeholder "Fitur YoriMind tidak aktif pada konfigurasi saat ini" — no API call made; panel renders in degraded state without error

> **Updated 2026-03-28 (SCP-2026-03-28-C):** AC5 added for graceful degradation when YoriMind is disabled via `AI_PROVIDER=disabled`

## Status: review
