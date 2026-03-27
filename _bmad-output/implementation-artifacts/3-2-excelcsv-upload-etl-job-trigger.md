# Story 3.2: Excel/CSV Upload & ETL Job Trigger

## Story
As an admin, I want to upload an Excel or CSV file of participant records and trigger the ETL normalization pipeline, so that I can import bulk data into the contact database without manual entry.

## Acceptance Criteria
- [x] File upload form at /app/contacts/upload accepts .xlsx and .csv only
- [x] POST /api/etl/upload returns 202 with jobId and status
- [x] GET /api/etl/jobs/:jobId returns job status (queued/processing/completed/failed)
- [x] FE polls job status and shows progress
- [x] File too large or wrong type shows error

## Tasks
- [x] Add MSW handlers for /api/etl/upload and /api/etl/jobs/:id
- [x] Create upload page at /app/contacts/upload
- [x] Create ETLUploadForm component

## Status: review
