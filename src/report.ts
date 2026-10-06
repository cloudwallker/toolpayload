import type { FieldMetric, Report, ReportCase } from './types.js';
import { reportCss, reportJs } from './report-assets.js';

const escapedCodePoint = (character: string): string => {
  const point = character.codePointAt(0)!;
  return `\\u${point.toString(16).padStart(4, '0')}`;
};

/** Keep untrusted labels from changing terminal state or bidi ordering. */
const terminalLabel = (value: string): string => JSON.stringify(value).replace(
  /[\u007f-\u009f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu,
  escapedCodePoint,
);

const number = (value: number): string => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
const percent = (value: number | null): string => value === null ? 'N/A' : `${number(value)}%`;

function fieldLines(field: FieldMetric, depth = 0): string[] {
  const line = `${'  '.repeat(depth)}${terminalLabel(field.path || '(result root)')} — ${number(field.bytes)} B (${field.kind})`;
  return [line, ...(field.children ?? []).flatMap(child => fieldLines(child, depth + 1))];
}

function caseLines(item: ReportCase): string[] {
  const current = item.current;
  const baseline = item.baseline;
  const lines = [`${item.status.toUpperCase()} ${terminalLabel(item.id)}`];
  lines.push(`  Normalized result size: ${current ? `${number(current.resultBytes)} B` : 'Missing current result'}`);
  lines.push(`  Baseline: ${baseline ? `${number(baseline.resultBytes)} B` : 'No baseline'}`);
  lines.push(`  Delta: ${item.deltaBytes === null ? 'N/A' : `${item.deltaBytes >= 0 ? '+' : ''}${number(item.deltaBytes)} B`}; Growth: ${percent(item.growthPercent)}`);
  lines.push(`  Budget: ${item.budget ? `${number(item.budget.maxResultBytes)} B max; ${percent(item.budget.maxGrowthPercent)} growth max` : 'No budget'}`);
  lines.push(`  Findings: ${item.findings.length ? item.findings.join(', ') : 'none'}`);
  if (current) {
    lines.push(`  Text tokens: ${number(current.textTokens)}; Structured tokens: ${current.structuredTokens === null ? 'Not counted' : number(current.structuredTokens)} (separate estimates; not a model bill)`);
    lines.push(`  Tool error: ${current.isError ? 'yes' : 'no'}`);
    lines.push(`  Content types: ${current.contentTypes.length ? current.contentTypes.map(type => `${terminalLabel(type.type)} ×${number(type.count)}, ${number(type.bytes)} B`).join('; ') : 'none'}`);
    lines.push(`  Warnings: ${current.warnings.length ? current.warnings.map(terminalLabel).join(', ') : 'none'}`);
    lines.push('  Field subtree sizes overlap; parent and child bytes must not be added.');
    lines.push(...fieldLines(current.fields, 2));
  }
  return lines;
}

function safeScriptJson(report: Report): string {
  return JSON.stringify(report).replace(/[<>&\u2028\u2029]/gu, character => {
    return `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
}

function htmlReport(report: Report): string {
  const data = safeScriptJson(report);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>ToolPayload · Size report</title>
<style>${reportCss}</style>
</head>
<body>
<a class="skip-link" href="#cases">Skip to cases</a>
<div class="page-shell">
  <header class="masthead"><div class="brand"><span class="brand-mark" aria-hidden="true">◈</span><span>ToolPayload</span></div><span class="eyebrow">MCP RESULT INTELLIGENCE</span></header>
  <main>
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><p class="kicker">OFFLINE REPORT <span class="kicker-line"></span> <span id="report-mode"></span></p><h1 id="hero-title">Know what your tools carry.</h1><p class="hero-subtitle">Normalized result size, measured from saved completed tool results.</p></div>
      <div class="summary-panel"><span class="summary-label">REPORT STATUS</span><strong id="report-status" class="status-pill"></strong><span id="report-count" class="summary-count"></span></div>
    </section>
    <section class="overview" aria-label="Report overview">
      <div class="stat-card"><span class="stat-label">CURRENT RESULTS</span><strong id="total-size"></strong><span class="stat-note">Normalized UTF-8 JSON bytes</span></div>
      <div class="stat-card"><span class="stat-label">BASELINE RESULTS</span><strong id="baseline-size"></strong><span class="stat-note">Comparable saved cases</span></div>
      <div class="stat-card"><span class="stat-label">CASES OVER BUDGET</span><strong id="over-budget"></strong><span class="stat-note">Absolute or growth limit</span></div>
      <div class="stat-card"><span class="stat-label">CASES NEEDING ATTENTION</span><strong id="attention-count"></strong><span class="stat-note">Includes errors and case changes</span></div>
    </section>
    <section class="method-note" aria-label="Measurement notes"><span class="note-icon" aria-hidden="true">i</span><div><strong>What these numbers mean</strong><p>Result bytes measure normalized, compact JSON with sorted object keys. They are not wire size. Field subtree sizes overlap, so parent and child bytes must not be added. Text and structured token estimates are separate and are not a model bill.</p></div></section>
    <section id="cases" class="cases-section" aria-labelledby="cases-title">
      <div class="section-heading"><div><p class="section-kicker">CASE EXPLORER</p><h2 id="cases-title">Results by case</h2></div><span id="visible-count" class="visible-count" aria-live="polite"></span></div>
      <div class="toolbar"><label class="search-wrap"><span class="search-label">Search case IDs</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6"></circle><path d="m16 16 4.2 4.2"></path></svg><input id="case-search" type="search" placeholder="Search case IDs" autocomplete="off"></label><label class="toggle-wrap"><input id="fail-only" type="checkbox"><span>Failures only</span></label><label class="sort-wrap">Sort by <select id="case-sort"><option value="size-desc">Size: largest</option><option value="size-asc">Size: smallest</option><option value="growth-desc">Growth: highest</option><option value="growth-asc">Growth: lowest</option><option value="name">Case ID</option></select></label></div>
      <div id="case-list" class="case-list"></div><p id="empty-state" class="empty-state" hidden>No cases match these filters.</p>
    </section>
  </main><footer><span>ToolPayload</span><span>Local report · No network required</span></footer>
</div>
<script id="report-data" type="application/json">${data}</script>
<script>${reportJs}</script>
</body></html>`;
}

/** Render a versioned report without original sample values. */
export function renderReport(report: Report, format: 'text' | 'json' | 'html'): string {
  if (format === 'json') return JSON.stringify(report, null, 2) + '\n';
  if (format === 'html') return htmlReport(report);
  const header = `ToolPayload ${report.command} — ${report.status.toUpperCase()}\n${report.cases.length} case(s) · normalized result size (UTF-8 JSON bytes)\n`;
  const body = report.cases.flatMap(caseLines).join('\n\n');
  return `${header}\n${body}\n`;
}
