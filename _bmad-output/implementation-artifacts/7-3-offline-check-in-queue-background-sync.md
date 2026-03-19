# Story 7.3: Offline Check-in Queue & Background Sync

## Story
Staff can queue scans offline via IndexedDB; synced automatically on reconnect.

## Acceptance Criteria
- [x] scanQueue module using idb for IndexedDB storage
- [x] queueScan() stores scan when offline
- [x] flushScanQueue() on network reconnect
- [x] Online indicator shows queue count
- [x] Conflict summary shown after sync

## Status: review
