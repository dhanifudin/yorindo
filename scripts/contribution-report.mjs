#!/usr/bin/env node
/**
 * Contribution Report Generator
 * 
 * Fetches GitHub data (issues, PRs, comments, reviews) and generates
 * a unified HTML report alongside RepoSense output.
 * 
 * Usage:
 *   node scripts/contribution-report.mjs \
 *     --owner <repo-owner> \
 *     --repo <repo-name> \
 *     --token <GITHUB_TOKEN> \
 *     --output <output-dir> \
 *     --since <YYYY-MM-DD> (optional)
 */

import { Octokit } from "octokit";
import fs from "fs";
import path from "path";

// ── Argument Parsing ──────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i].replace("--", "");
    const val = argv[i + 1];
    if (val && !val.startsWith("--")) {
      args[key] = val;
      i++;
    } else {
      args[key] = true;
    }
  }
  const required = ["owner", "repo", "token", "output"];
  for (const r of required) {
    if (!args[r]) {
      console.error(`Missing required argument: --${r}`);
      process.exit(1);
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const octokit = new Octokit({ auth: args.token });

// ── Pagination Helpers ────────────────────────────────────────────
async function fetchAll(method, params) {
  const results = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const resp = await method({ ...params, per_page: perPage, page });
    if (resp.data.length === 0) break;
    results.push(...resp.data);
    if (resp.data.length < perPage) break;
    page++;
  }
  return results;
}

// ── Data Fetchers ─────────────────────────────────────────────────
async function fetchIssues(owner, repo, since) {
  const params = { owner, repo, state: "all" };
  if (since) params.since = since;
  const issues = await fetchAll(octokit.rest.issues.listForRepo, params);
  // Filter out PRs (GitHub API returns PRs as issues)
  return issues.filter((i) => !i.pull_request);
}

async function fetchPullRequests(owner, repo, since) {
  const params = { owner, repo, state: "all" };
  if (since) params.since = since;
  return await fetchAll(octokit.rest.pulls.list, params);
}

async function fetchIssueComments(owner, repo, since) {
  const issues = await fetchAll(octokit.rest.issues.listForRepo, {
    owner,
    repo,
    state: "all",
    since,
  });
  const comments = [];
  for (const issue of issues) {
    const issueComments = await fetchAll(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: issue.number,
    });
    comments.push(
      ...issueComments.map((c) => ({
        user: c.user?.login || "unknown",
        created_at: c.created_at,
        issue_number: issue.number,
        issue_title: issue.title,
        body: c.body?.substring(0, 100) || "",
      }))
    );
  }
  return comments;
}

async function fetchPRReviewComments(owner, repo, since) {
  const prs = await fetchAll(octokit.rest.pulls.list, {
    owner,
    repo,
    state: "all",
    since,
  });
  const comments = [];
  for (const pr of prs) {
    const prComments = await fetchAll(octokit.rest.pulls.listReviewComments, {
      owner,
      repo,
      pull_number: pr.number,
    });
    comments.push(
      ...prComments.map((c) => ({
        user: c.user?.login || "unknown",
        created_at: c.created_at,
        pr_number: pr.number,
        pr_title: pr.title,
        body: c.body?.substring(0, 100) || "",
      }))
    );
  }
  return comments;
}

async function fetchPRReviews(owner, repo, since) {
  const prs = await fetchAll(octokit.rest.pulls.list, {
    owner,
    repo,
    state: "all",
    since,
  });
  const reviews = [];
  for (const pr of prs) {
    const prReviews = await fetchAll(octokit.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: pr.number,
    });
    reviews.push(
      ...prReviews.map((r) => ({
        user: r.user?.login || "unknown",
        created_at: r.submitted_at,
        pr_number: pr.number,
        pr_title: pr.title,
        state: r.state,
        body: r.body?.substring(0, 100) || "",
      }))
    );
  }
  return reviews;
}

// ── Aggregation ───────────────────────────────────────────────────
function aggregateByUser(issues, prs, issueComments, prComments, prReviews) {
  const map = {};

  function ensure(login) {
    if (!login || login === "unknown") return;
    const key = login.toLowerCase();
    if (!map[key]) {
      map[key] = {
        login,
        issuesOpened: 0,
        prsOpened: 0,
        issueComments: 0,
        prComments: 0,
        prReviews: 0,
        reviewsApproved: 0,
        reviewsRequestedChanges: 0,
        reviewsCommented: 0,
        total: 0,
      };
    }
    return map[key];
  }

  for (const i of issues) {
    const u = ensure(i.user?.login);
    if (u) u.issuesOpened++;
  }
  for (const pr of prs) {
    const u = ensure(pr.user?.login);
    if (u) u.prsOpened++;
  }
  for (const c of issueComments) {
    const u = ensure(c.user);
    if (u) u.issueComments++;
  }
  for (const c of prComments) {
    const u = ensure(c.user);
    if (u) u.prComments++;
  }
  for (const r of prReviews) {
    const u = ensure(r.user);
    if (u) {
      u.prReviews++;
      if (r.state === "APPROVED") u.reviewsApproved++;
      if (r.state === "CHANGES_REQUESTED") u.reviewsRequestedChanges++;
      if (r.state === "COMMENTED") u.reviewsCommented++;
    }
  }

  for (const u of Object.values(map)) {
    u.total =
      u.issuesOpened +
      u.prsOpened +
      u.issueComments +
      u.prComments +
      u.prReviews;
  }

  return Object.values(map).sort((a, b) => b.total - a.total);
}

// ── HTML Generation ───────────────────────────────────────────────
function generateHTML(stats, since, until, repoUrl) {
  const rows = stats
    .map(
      (u) => `
    <tr>
      <td><a href="https://github.com/${u.login}">${u.login}</a></td>
      <td>${u.issuesOpened}</td>
      <td>${u.prsOpened}</td>
      <td>${u.issueComments}</td>
      <td>${u.prComments}</td>
      <td>${u.prReviews}</td>
      <td>${u.reviewsApproved}</td>
      <td>${u.reviewsRequestedChanges}</td>
      <td>${u.reviewsCommented}</td>
      <td><strong>${u.total}</strong></td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contribution Report — ${repoUrl}</title>
  <style>
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --green: #3fb950;
      --red: #f85149;
      --yellow: #d29922;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
    h1 a { color: var(--accent); text-decoration: none; }
    h1 a:hover { text-decoration: underline; }
    .subtitle { color: var(--text-muted); margin-bottom: 2rem; }
    .repo-link {
      display: inline-block;
      margin-bottom: 1.5rem;
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }
    .repo-link:hover { text-decoration: underline; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface);
      border-radius: 6px;
      overflow: hidden;
    }
    th, td {
      padding: 0.75rem 1rem;
      text-align: center;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: #1c2128;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      position: sticky;
      top: 0;
    }
    td:first-child, th:first-child { text-align: left; }
    tr:hover { background: #1c2128; }
    td a { color: var(--accent); text-decoration: none; }
    td a:hover { text-decoration: underline; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge-green { background: rgba(63,185,80,0.15); color: var(--green); }
    .badge-red { background: rgba(248,81,73,0.15); color: var(--red); }
    .badge-yellow { background: rgba(210,153,34,0.15); color: var(--yellow); }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
    }
    .summary-card .number { font-size: 2rem; font-weight: 700; color: var(--accent); }
    .summary-card .label { color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem; }
    .footer { margin-top: 2rem; color: var(--text-muted); font-size: 0.8rem; text-align: center; }
    @media (max-width: 768px) {
      body { padding: 1rem; }
      table { font-size: 0.85rem; }
      th, td { padding: 0.5rem; }
    }
  </style>
</head>
<body>
  <h1><a href="${repoUrl}">Contribution Report</a></h1>
  <p class="subtitle">Period: ${since || "inception"} → ${until || "now"}</p>

  <div class="summary">
    <div class="summary-card">
      <div class="number">${stats.reduce((s, u) => s + u.issuesOpened, 0)}</div>
      <div class="label">Issues Opened</div>
    </div>
    <div class="summary-card">
      <div class="number">${stats.reduce((s, u) => s + u.prsOpened, 0)}</div>
      <div class="label">PRs Opened</div>
    </div>
    <div class="summary-card">
      <div class="number">${stats.reduce((s, u) => s + u.issueComments, 0)}</div>
      <div class="label">Issue Comments</div>
    </div>
    <div class="summary-card">
      <div class="number">${stats.reduce((s, u) => s + u.prComments, 0)}</div>
      <div class="label">PR Comments</div>
    </div>
    <div class="summary-card">
      <div class="number">${stats.reduce((s, u) => s + u.prReviews, 0)}</div>
      <div class="label">PR Reviews</div>
    </div>
    <div class="summary-card">
      <div class="number">${stats.length}</div>
      <div class="label">Contributors</div>
    </div>
  </div>

  <h2 style="margin-bottom: 1rem;">Contributor Breakdown</h2>
  <div style="overflow-x: auto;">
    <table>
      <thead>
        <tr>
          <th>Contributor</th>
          <th>Issues</th>
          <th>PRs</th>
          <th>Issue Cmts</th>
          <th>PR Cmts</th>
          <th>Reviews</th>
          <th><span class="badge badge-green">Approved</span></th>
          <th><span class="badge badge-red">Changes Req.</span></th>
          <th><span class="badge badge-yellow">Commented</span></th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <p class="footer">Generated on ${new Date().toISOString().split("T")[0]} · GitHub API + RepoSense</p>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const { owner, repo, token, output, since, until } = args;

  console.log(`📊 Fetching contribution data for ${owner}/${repo}...`);

  const sinceDate = since || "2025-01-01";

  const [issues, prs, issueComments, prComments, prReviews] =
    await Promise.all([
      fetchIssues(owner, repo, sinceDate),
      fetchPullRequests(owner, repo, sinceDate),
      fetchIssueComments(owner, repo, sinceDate),
      fetchPRReviewComments(owner, repo, sinceDate),
      fetchPRReviews(owner, repo, sinceDate),
    ]);

  console.log(`  Issues opened: ${issues.length}`);
  console.log(`  PRs opened: ${prs.length}`);
  console.log(`  Issue comments: ${issueComments.length}`);
  console.log(`  PR comments: ${prComments.length}`);
  console.log(`  PR reviews: ${prReviews.length}`);

  const stats = aggregateByUser(
    issues,
    prs,
    issueComments,
    prComments,
    prReviews
  );

  const outDir = path.join(output, "contribution-api");
  fs.mkdirSync(outDir, { recursive: true });

  // Write JSON data
  const jsonData = {
    generatedAt: new Date().toISOString(),
    period: { since: sinceDate, until: until || "now" },
    summary: {
      issuesOpened: issues.length,
      prsOpened: prs.length,
      issueComments: issueComments.length,
      prComments: prComments.length,
      prReviews: prReviews.length,
      contributors: stats.length,
    },
    contributors: stats,
  };

  fs.writeFileSync(
    path.join(outDir, "data.json"),
    JSON.stringify(jsonData, null, 2)
  );
  console.log(`📄 Written: ${outDir}/data.json`);

  // Write HTML report
  const html = generateHTML(stats, sinceDate, until, `https://github.com/${owner}/${repo}`);
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log(`📄 Written: ${outDir}/index.html`);

  console.log("✅ Contribution report complete.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
