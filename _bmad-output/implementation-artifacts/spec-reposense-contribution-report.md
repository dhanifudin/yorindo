---
title: RepoSense Contribution Report
type: chore
created: 2026-04-05
status: done
context: []
baseline_commit: 1cbc842f873896c0f830db983fda4efb6cb056ec
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no automated way to track and visualize contributor activity (commits, PRs, issues, comments) across the project. Team members and stakeholders lack visibility into who contributed what and when.

**Approach:** Use RepoSense to generate automated contribution reports on a schedule (weekdays 17:00 WIB), deployed to GitHub Pages for easy access.

## Boundaries & Constraints

**Always:**
- Schedule must be weekdays 17:00 WIB (10:00 UTC)
- Report must cover all 14 tracked contributors
- Must support manual trigger with optional `since_date` override
- Must deploy to `gh-pages` branch

**Ask First:**
- RepoSense version pinning (currently v1.18.0) — update if a newer stable release exists

**Never:**
- Do not modify existing CI/CD workflows — this is a standalone workflow
- Do not include sensitive data (emails) in the public report
- Do not require any code changes — config + workflow only

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Scheduled trigger | Cron fires at 10:00 UTC Mon-Fri | Full report generated and deployed to gh-pages | Workflow failure notifies via GitHub Actions UI |
| Manual trigger with since_date | User provides `2026-03-01` | Report covers from that date to now | Invalid date format → workflow fails with clear error |
| Manual trigger without since_date | No input provided | Report uses default `sinceDate` from config (2025-01-01) | N/A |
| gh-pages branch missing | First run | `peaceiris/actions-gh-pages` auto-creates branch | N/A |
| No new commits since last run | Same state as previous run | Report regenerated (may be identical) | N/A |

</frozen-after-approval>

## Code Map

- `.github/workflows/reposense-report.yml` -- GitHub Actions workflow definition for scheduled report generation, GitHub API data fetch, and Pages deployment
- `reposense-config.json` -- RepoSense configuration: repo, branch, date range, formats, ignored paths
- `author-config.csv` -- Author mapping for 14 contributors with GitHub IDs, emails, git names, and display names
- `scripts/contribution-report.mjs` -- Node.js script: fetches issues, PRs, comments, reviews via GitHub API; merges with RepoSense output into a unified HTML report

## Tasks & Acceptance

**Execution:**
- [x] `.github/workflows/reposense-report.yml` -- Review and validate workflow: checkout, Java/Node setup, RepoSense download, report generation, GitHub Pages deployment -- Single cohesive CI/CD workflow
- [x] `reposense-config.json` -- Review and validate config: correct repo URL, branch, date range, file formats, ignore patterns -- RepoSense requires valid JSON config
- [x] `author-config.csv` -- Validate all 14 contributors are correctly mapped with proper CSV format -- Author attribution is core to report accuracy
- [x] `scripts/contribution-report.mjs` -- Create GitHub API script: fetches issues, PRs, comments, reviews; generates unified HTML report -- GitHub API data supplements RepoSense

**Acceptance Criteria:**
- Given the workflow is scheduled, when 10:00 UTC Mon-Fri arrives, then RepoSense runs and deploys the HTML report to GitHub Pages
- Given a manual trigger with `since_date`, when the workflow runs, then the report covers from that date forward
- Given all 14 contributors are in `author-config.csv`, when RepoSense analyzes the repo, then commits from all authors are correctly attributed to their display names

## Design Notes

- RepoSense is run via pre-built JAR download (no npm/java project dependency) — keeps CI lightweight
- `peaceiris/actions-gh-pages@v4` handles branch creation and deployment atomically
- `fetch-depth: 0` is critical — RepoSense needs full git history

## Verification

**Commands:**
- `cat reposense-config.json | python3 -m json.tool` -- expected: valid JSON output
- `head -1 author-config.csv && wc -l author-config.csv` -- expected: correct header + 14 data rows = 15 lines
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/reposense-report.yml'))"` -- expected: valid YAML

**Manual checks:**
- Verify `cron: "0 10 * * 1-5"` = 10:00 UTC Mon-Fri (17:00 WIB)
- Verify all 14 GitHub usernames are present in `author-config.csv`
- Verify `ignoreGlobList` covers `node_modules`, `dist`, `.next`, `_bmad*`, `package-lock.json`
