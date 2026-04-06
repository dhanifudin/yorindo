---
title: Date-Filtered Contribution Reports
type: feature
created: 2026-04-05
status: done
context: []
baseline_commit: 2463b07625d88f62bbd887300623961b6804cca3
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** PMs and stakeholders need to view contribution reports for specific date ranges, but currently only the latest report is available on gh-pages with no historical navigation.

**Approach:** Store each workflow run's output in a dated folder (`reports/YYYY-MM-DD/`) and replace the static landing page with a date filter UI that lists all available reports and lets users browse by date. All dates displayed in UTC+7 (WIB).

## Boundaries & Constraints

**Always:**
- Each report stored under `reports/{YYYY-MM-DD}/` on gh-pages
- All date labels rendered in UTC+7 (WIB) timezone
- Landing page must be pure HTML/CSS/JS — no build step or framework
- `keep_files: true` must remain so historical reports persist

**Ask First:**
- Maximum number of reports to retain (default: keep all)

**Never:**
- Do not use external CDNs or third-party JS libraries
- Do not modify RepoSense or contribution-report.mjs scripts
- Do not break the CNAME or custom domain

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First run with new structure | No `reports/` folder on gh-pages | Creates `reports/YYYY-MM-DD/` with full report + updated `index.html` at root | N/A |
| Subsequent run | Existing `reports/` with previous dates | Appends new dated folder, updates root `index.html` with new entry | N/A |
| No reports available | Empty `reports/` or missing | Landing page shows "No reports generated yet" message | Graceful empty state |
| Date filter UI load | User opens landing page | Lists all available report dates sorted newest-first, with date range picker | Falls back to full list if picker unsupported |
| User selects a date | Clicks a report date | Navigates to `reports/YYYY-MM-DD/index.html` | Link opens normally |

</frozen-after-approval>

## Code Map

- `.github/workflows/reposense-report.yml` — Update deploy logic to organize output into `reports/YYYY-MM-DD/` and generate a manifest JSON
- `scripts/generate-landing-page.mjs` — New Node.js script: reads manifest from gh-pages, generates date-filtered `index.html` with WIB timestamps
- `CNAME` — Unchanged

## Tasks & Acceptance

**Execution:**
- [x] `.github/workflows/reposense-report.yml` — Add date folder logic: compute WIB date, move all report output into `reports/YYYY-MM-DD/`, generate `manifest.json`, run landing page generator script — enables historical browsing
- [x] `scripts/generate-landing-page.mjs` — Create script that reads `manifest.json` and produces a rich `index.html` with date list, range filter, and WIB formatting — provides the PM-facing UI

**Acceptance Criteria:**
- Given a workflow run completes, when checking gh-pages, then a new `reports/YYYY-MM-DD/` folder exists with the full report
- Given multiple runs have occurred, when opening the landing page, then a sorted list of all report dates is visible
- Given the landing page is loaded, when a user selects a date, then they are navigated to that date's report
- Given any date display on the landing page, when viewed, then all dates are shown in UTC+7 (WIB) format

## Design Notes

**Directory structure on gh-pages:**
```
gh-pages/
├── CNAME
├── index.html              ← Generated landing page with date filter
├── manifest.json           ← JSON list of all report dates + metadata
└── reports/
    ├── 2026-04-05/
    │   ├── index.html      ← Combined report (RepoSense + API)
    │   ├── reposense/
    │   └── contribution-api/
    └── 2026-04-06/
        └── ...
```

**Manifest format:**
```json
{
  "timezone": "Asia/Jakarta",
  "reports": [
    { "date": "2026-04-06", "runId": "123456", "trigger": "schedule" },
    { "date": "2026-04-05", "runId": "123450", "trigger": "manual" }
  ]
}
```

## Verification

**Commands:**
- `python3 -c "import json; json.load(open('manifest.json'))"` — expected: valid JSON
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/reposense-report.yml'))"` — expected: valid YAML

**Manual checks:**
- Verify workflow computes WIB date correctly (`date -u -d '+7 hours' +%Y-%m-%d` equivalent in Actions)
- Verify landing page HTML is self-contained (no external deps)
- Verify `manifest.json` appends (not overwrites) on each run
