#!/usr/bin/env node
/**
 * Generate Landing Page for Date-Filtered Reports
 * 
 * Reads manifest.json and produces a self-contained index.html
 * with a date filter UI, sorted report list, and WIB timestamps.
 * 
 * Usage:
 *   node scripts/generate-landing-page.mjs --manifest <path> --output <path>
 */

import fs from "fs";
import path from "path";

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
  for (const r of ["manifest", "output"]) {
    if (!args[r]) {
      console.error(`Missing required argument: --${r}`);
      process.exit(1);
    }
  }
  return args;
}

const args = parseArgs(process.argv);

let manifest = { reports: [], timezone: "Asia/Jakarta" };
try {
  const raw = fs.readFileSync(args.manifest, "utf-8");
  manifest = JSON.parse(raw);
} catch {
  // manifest doesn't exist yet — empty state
}

const reports = manifest.reports || [];
const generatedAt = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });

function formatWIB(dateStr) {
  const d = new Date(dateStr + "T00:00:00+07:00");
  return d.toLocaleDateString("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTriggerLabel(trigger) {
  return trigger === "manual" ? "🖐️ Manual" : "📅 Scheduled";
}

const reportRows = reports.length > 0
  ? reports.map((r) => `
    <tr class="report-row" data-date="${r.date}">
      <td><a href="reports/${r.date}/index.html">${formatWIB(r.date)}</a></td>
      <td>${getTriggerLabel(r.trigger || "schedule")}</td>
      <td><code>${r.runId || "—"}</code></td>
    </tr>`).join("")
  : `
    <tr>
      <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">
        No reports generated yet. Reports run weekdays at 17:00 WIB.
      </td>
    </tr>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contribution Reports — EM . U</title>
  <style>
    :root {
      --bg: #0d1117; --surface: #161b22; --surface-hover: #1c2128;
      --border: #30363d; --text: #c9d1d9; --text-muted: #8b949e;
      --accent: #58a6ff; --green: #3fb950; --red: #f85149; --yellow: #d29922;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: var(--bg); color: var(--text); padding: 2rem; max-width: 900px; margin: 0 auto;
    }
    header { margin-bottom: 2rem; }
    h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
    h1 a { color: var(--accent); text-decoration: none; }
    h1 a:hover { text-decoration: underline; }
    .subtitle { color: var(--text-muted); font-size: 0.9rem; }
    .filters {
      display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;
      margin-bottom: 1.5rem; padding: 1rem; background: var(--surface);
      border: 1px solid var(--border); border-radius: 8px;
    }
    .filters label { font-size: 0.85rem; color: var(--text-muted); }
    .filters input[type="date"] {
      background: var(--bg); color: var(--text); border: 1px solid var(--border);
      border-radius: 6px; padding: 0.4rem 0.6rem; font-size: 0.85rem;
    }
    .filters button {
      background: var(--accent); color: #fff; border: none; border-radius: 6px;
      padding: 0.4rem 1rem; font-size: 0.85rem; cursor: pointer; font-weight: 500;
    }
    .filters button:hover { opacity: 0.9; }
    .filters .clear-btn { background: transparent; border: 1px solid var(--border); color: var(--text-muted); }
    .filters .clear-btn:hover { border-color: var(--text-muted); color: var(--text); }
    .summary {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem; margin-bottom: 1.5rem;
    }
    .summary-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
      padding: 0.75rem; text-align: center;
    }
    .summary-card .number { font-size: 1.5rem; font-weight: 700; color: var(--accent); }
    .summary-card .label { color: var(--text-muted); font-size: 0.8rem; margin-top: 0.15rem; }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 6px; overflow: hidden; }
    th, td { padding: 0.6rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: #1c2128; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    td a { color: var(--accent); text-decoration: none; font-weight: 500; }
    td a:hover { text-decoration: underline; }
    td code { font-size: 0.75rem; color: var(--text-muted); }
    tr.hidden { display: none; }
    tr:hover { background: var(--surface-hover); }
    .footer { margin-top: 2rem; color: var(--text-muted); font-size: 0.75rem; text-align: center; }
    @media (max-width: 600px) {
      body { padding: 1rem; }
      .filters { flex-direction: column; align-items: stretch; }
      table { font-size: 0.85rem; }
      th, td { padding: 0.5rem; }
    }
  </style>
</head>
<body>
  <header>
    <h1><a href="https://yorindo.dhanifudin.com">Contribution Reports</a></h1>
    <p class="subtitle">Generated on ${generatedAt} WIB (UTC+7)</p>
  </header>

  <div class="summary">
    <div class="summary-card">
      <div class="number">${reports.length}</div>
      <div class="label">Total Reports</div>
    </div>
    <div class="summary-card">
      <div class="number">${reports.length > 0 ? formatWIB(reports[0].date).split(',')[0] : "—"}</div>
      <div class="label">Latest Report</div>
    </div>
    <div class="summary-card">
      <div class="number">${reports.length > 0 ? formatWIB(reports[reports.length - 1].date).split(',')[0] : "—"}</div>
      <div class="label">First Report</div>
    </div>
  </div>

  <div class="filters">
    <label>From: <input type="date" id="date-from"></label>
    <label>To: <input type="date" id="date-to"></label>
    <button onclick="applyFilter()">Filter</button>
    <button class="clear-btn" onclick="clearFilter()">Clear</button>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date (WIB)</th>
        <th>Trigger</th>
        <th>Run ID</th>
      </tr>
    </thead>
    <tbody id="report-table">
      ${reportRows}
    </tbody>
  </table>

  <p class="footer">Powered by RepoSense + GitHub API · All times in WIB (UTC+7)</p>

  <script>
    function applyFilter() {
      const from = document.getElementById('date-from').value;
      const to = document.getElementById('date-to').value;
      const rows = document.querySelectorAll('#report-table .report-row');
      rows.forEach(row => {
        const date = row.getAttribute('data-date');
        let show = true;
        if (from && date < from) show = false;
        if (to && date > to) show = false;
        row.classList.toggle('hidden', !show);
      });
    }
    function clearFilter() {
      document.getElementById('date-from').value = '';
      document.getElementById('date-to').value = '';
      document.querySelectorAll('#report-table .report-row').forEach(r => r.classList.remove('hidden'));
    }
  </script>
</body>
</html>`;

fs.mkdirSync(path.dirname(args.output), { recursive: true });
fs.writeFileSync(args.output, html);
console.log(`✅ Landing page generated: ${args.output}`);
