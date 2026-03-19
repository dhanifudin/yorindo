# Story 7.6: Real-Time Attendance Monitor (Admin Dashboard)

## Story
Admin sees live attendance counter for active events with 5-second polling.

## Acceptance Criteria
- [x] AttendanceMonitor component on event detail page (active events only)
- [x] GET /api/events/:id/attendance-stats polled every 5s
- [x] Shows total/attended/pending counts and progress bar
- [x] Polling stops when event not active

## Status: review
