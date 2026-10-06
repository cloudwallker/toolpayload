/** Literal assets keep the exported HTML usable from disk, without a server or CDN. */
export const reportCss = String.raw`
:root{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#183044;background:#f5f8fb;font-synthesis:none}
*{box-sizing:border-box}body{margin:0}button,input,select{font:inherit}button,select{cursor:pointer}a{color:inherit}
:focus-visible{outline:3px solid #7154e8;outline-offset:3px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.skip-link{position:absolute;left:1rem;top:-4rem;z-index:9;padding:.7rem 1rem;background:#fff;border-radius:.5rem}.skip-link:focus{top:1rem}
.page-shell{max-width:1240px;margin:0 auto;padding:0 36px}.masthead{height:88px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #dae4ed}.brand{display:flex;align-items:center;gap:11px;font-size:1.28rem;font-weight:800;letter-spacing:-.045em;color:#182e52}.brand-mark{display:inline-grid;place-items:center;width:33px;height:33px;border-radius:10px;color:#fff;background:linear-gradient(140deg,#5048c6,#1388b4);font-size:1.25rem}.eyebrow,.section-kicker,.kicker,.summary-label,.stat-label{font-size:.69rem;font-weight:800;letter-spacing:.14em}.eyebrow{color:#8a9bad}
.hero{display:flex;justify-content:space-between;gap:40px;align-items:center;padding:65px 0 52px}.hero-copy{max-width:680px}.kicker{color:#6554c8;margin:0 0 18px;display:flex;align-items:center;gap:12px}.kicker-line{height:1px;width:32px;background:#a5a3d0}h1{font-size:clamp(2.3rem,5vw,4.05rem);line-height:1.06;letter-spacing:-.06em;margin:0;color:#192d4d}.hero-subtitle{font-size:1.08rem;line-height:1.55;color:#62758b;margin:18px 0 0}.summary-panel{flex:0 0 225px;background:#e9e8ff;border:1px solid #d9d8ff;border-radius:18px;padding:23px 24px;min-height:157px;display:flex;flex-direction:column;align-items:flex-start}.summary-label{color:#6458a8}.status-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;margin:15px 0 8px;border-radius:100px;font-size:.85rem;text-transform:capitalize}.status-pill:before,.case-status:before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:currentColor}.status-pass{color:#087861;background:#d9f7eb}.status-fail{color:#a63b4c;background:#ffe7ea}.status-analyzed{color:#4e4aa7;background:#e2e1ff}.summary-count{font-size:.83rem;color:#686b9c}
.overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px}.stat-card{background:#fff;border:1px solid #e1e8ef;border-radius:16px;padding:24px 24px 22px;box-shadow:0 8px 26px rgba(26,55,92,.035);min-height:150px}.stat-label{display:block;color:#768aa0;line-height:1.4}.stat-card strong{display:block;font-size:2rem;letter-spacing:-.055em;margin:15px 0 4px;color:#1b3354;white-space:nowrap}.stat-note{color:#8293a4;font-size:.78rem}.method-note{margin:24px 0 63px;display:flex;gap:14px;align-items:flex-start;padding:18px 21px;border-radius:12px;background:#eaf2f8;color:#4a657e}.note-icon{display:grid;place-items:center;flex:0 0 20px;height:20px;border-radius:50%;background:#587b9c;color:#fff;font-size:.75rem;font-weight:800}.method-note strong{display:block;color:#31536f;font-size:.87rem}.method-note p{margin:4px 0 0;font-size:.82rem;line-height:1.55}
.section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:22px}.section-kicker{color:#6d62c2;margin:0 0 8px}h2{font-size:1.7rem;letter-spacing:-.04em;margin:0;color:#193451}.visible-count{font-size:.83rem;color:#718499}.toolbar{display:flex;align-items:center;gap:14px;margin-bottom:18px}.search-wrap{position:relative;flex:1;max-width:465px}.search-wrap svg{position:absolute;left:15px;top:50%;transform:translateY(-50%);width:17px;height:17px;fill:none;stroke:#8aa0b1;stroke-width:2;stroke-linecap:round}.search-wrap input,.sort-wrap select{width:100%;height:44px;background:#fff;border:1px solid #dce5ed;border-radius:9px;color:#314b64}.search-wrap input{padding:0 14px 0 42px}.search-wrap input::placeholder{color:#92a1ae}.toggle-wrap{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;color:#4e6479;font-size:.86rem}.toggle-wrap input{width:17px;height:17px;accent-color:#6257c6}.sort-wrap{display:flex;align-items:center;gap:8px;white-space:nowrap;color:#75889b;font-size:.82rem;margin-left:auto}.sort-wrap select{width:auto;padding:0 34px 0 12px;color:#385269;font-size:.84rem}
.case-list{display:grid;gap:14px}.case-card{background:#fff;border:1px solid #e0e8ee;border-radius:16px;box-shadow:0 6px 24px rgba(36,64,91,.035);overflow:hidden}.case-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:22px 25px 18px}.case-name{font-size:1.07rem;line-height:1.35;font-weight:750;word-break:break-word;color:#1b3352}.case-status{display:inline-flex;align-items:center;gap:7px;border-radius:100px;padding:6px 10px;font-size:.75rem;font-weight:750;text-transform:capitalize;white-space:nowrap}.case-card-body{padding:0 25px 23px}.case-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;padding:15px 0 18px;border-top:1px solid #eef2f5}.metric-label{display:block;font-size:.68rem;font-weight:800;letter-spacing:.08em;color:#8799a8;text-transform:uppercase;margin-bottom:7px}.metric-value{display:block;font-size:1.08rem;font-weight:750;color:#243d58}.metric-value.muted{color:#8b9aaa;font-size:.9rem;font-weight:600}.metric-note{display:block;font-size:.72rem;color:#8698a8;margin-top:3px}.compare{padding:18px 18px 13px;background:#f6f9fc;border:1px solid #eaf0f5;border-radius:11px}.bar-row{display:grid;grid-template-columns:80px minmax(0,1fr) 90px;align-items:center;gap:12px;margin-bottom:10px}.bar-label,.bar-value{font-size:.75rem;color:#687f93}.bar-value{text-align:right;font-variant-numeric:tabular-nums}.bar-track{height:9px;border-radius:20px;background:#e5edf3;overflow:hidden}.bar-fill{height:100%;border-radius:20px;background:#94a6bc;min-width:0}.bar-fill.current{background:linear-gradient(90deg,#6058d0,#218ab2)}.budget-line,.insight-line{font-size:.79rem;line-height:1.5;color:#526c82}.budget-line{margin-top:8px}.insight-line{margin-top:14px}.tag-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:15px}.tag{display:inline-flex;align-items:center;border-radius:6px;background:#f1efff;color:#5d50a6;padding:5px 8px;font-size:.72rem;font-weight:650}.tag.warning{background:#fff2dc;color:#8a6428}.tag.type{background:#eaf4f8;color:#426d81}.details-toggle{border:0;border-top:1px solid #edf1f4;width:100%;padding:14px 25px;background:#fff;text-align:left;color:#5b56b5;font-weight:750;font-size:.82rem}.details-toggle:after{content:"⌄";float:right;font-size:1rem}.details-toggle[aria-expanded="true"]:after{content:"⌃"}.details-toggle:hover{background:#f9faff}.case-detail{border-top:1px solid #edf1f4;padding:22px 25px 26px}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.detail-box{background:#f8fafc;border:1px solid #ecf0f4;border-radius:10px;padding:16px}.detail-box h4,.field-section h4{font-size:.72rem;letter-spacing:.1em;color:#78899a;margin:0 0 12px;text-transform:uppercase}.detail-pair{display:flex;justify-content:space-between;gap:15px;padding:5px 0;font-size:.8rem}.detail-pair span:first-child{color:#71879b}.detail-pair span:last-child{color:#2e4964;text-align:right;overflow-wrap:anywhere}.field-section{margin-top:21px}.field-help{font-size:.77rem;color:#8294a5;margin:-5px 0 12px}.field-tree{border:1px solid #e8edf2;border-radius:10px;padding:7px 13px;max-height:420px;overflow:auto}.field-node{margin-left:15px;border-left:1px solid #e1e7ee;padding-left:10px}.field-node:first-child{margin-left:0;border-left:0;padding-left:0}.field-node summary{cursor:pointer}.field-line{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding:7px 0;font-size:.78rem}.field-path{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere;color:#36526c}.field-bytes{color:#648199;white-space:nowrap;font-variant-numeric:tabular-nums}.field-children{margin-left:8px}.empty-state{padding:48px;text-align:center;background:#fff;border:1px solid #e1e8ef;border-radius:14px;color:#708398}footer{display:flex;justify-content:space-between;gap:16px;border-top:1px solid #dce6ee;margin:64px 0 0;padding:25px 0 38px;font-size:.78rem;color:#8b9ba9}footer span:first-child{font-weight:800;color:#7388a0}
@media(max-width:900px){.overview{grid-template-columns:repeat(2,minmax(0,1fr))}.hero{padding:48px 0 36px}.case-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.eyebrow{display:none}}
@media(max-width:640px){.page-shell{padding:0 17px}.masthead{height:66px}.hero{display:block;padding:42px 0 31px}.summary-panel{margin-top:30px;min-height:auto}.overview{gap:9px}.stat-card{padding:16px;min-height:125px}.stat-card strong{font-size:1.47rem}.stat-label{font-size:.59rem}.stat-note{font-size:.68rem}.method-note{margin:18px 0 45px}.toolbar{flex-wrap:wrap}.search-wrap{max-width:none;flex-basis:100%}.sort-wrap{margin-left:0}.case-card-top{padding:19px 18px 15px}.case-card-body{padding:0 18px 20px}.case-metrics{gap:12px}.metric-value{font-size:.98rem}.bar-row{grid-template-columns:55px minmax(0,1fr) 68px;gap:7px}.details-toggle{padding:14px 18px}.case-detail{padding:18px}.detail-grid{grid-template-columns:1fr}}
/* Accessible workspace refinements */

body { font-size: 16px; line-height: 1.65; }
.hero { padding-block: 48px 36px; }
h1 { font-size: clamp(2rem, 4.5vw, 3.4rem); line-height: 1.15; }
.eyebrow, .section-kicker, .kicker, .summary-label, .stat-label { font-size: .78rem; letter-spacing: .08em; }
.stat-note, .method-note p, .summary-count, .visible-count, .sort-wrap, .metric-label, .metric-note, .detail-label, .details-toggle, .tag, .finding, footer { font-size: .875rem; }
.stat-label, .stat-note, .visible-count, .sort-wrap { color: #4d667e; }
.method-note { margin-bottom: 36px; padding: 20px 24px; }
.method-note strong { font-size: 1rem; }
.toolbar { padding: 18px; background: #edf2f8; border: 1px solid #dce5ef; border-radius: 12px; align-items: end; gap: 18px; }
.search-wrap { display: flex; flex-direction: column; gap: 8px; max-width: none; }
.search-label { font-size: .875rem; color: #425b74; font-weight: 650; }
.search-wrap svg { top: auto; bottom: 14px; transform: none; }
.search-wrap input { font-size: 16px; }
.toggle-wrap { min-height: 44px; font-size: .9rem; }
.sort-wrap { flex-direction: column; align-items: start; gap: 8px; }
.sort-wrap select { font-size: .9rem; }
.details-toggle { min-height: 48px; }
.case-card-top { border-left: 4px solid #6657b8; }
.case-card:has(.status-fail) .case-card-top { border-left-color: #b34453; }
.case-name, .bar-label, .field-path, .case-detail, code, .detail-row { overflow-wrap: anywhere; min-width: 0; }
.bar-label { white-space: normal; }
.bar-label, .bar-value, .budget-line, .insight-line, .detail-box h4, .field-section h4, .detail-pair, .field-help, .field-line { font-size: .875rem; }
.metric-label, .metric-note, .field-help, .detail-box h4, .field-section h4 { color: #536d83; }
.field-tree { max-height: 480px; }
.field-node summary { min-height: 44px; }
.stat-card strong { white-space: normal; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.overview > *, .detail-grid > *, .metrics > * { min-width: 0; }
@media (max-width: 760px) { .toolbar { flex-wrap: wrap; } .search-wrap { flex-basis: 100%; } .sort-wrap { margin-left: 0; flex: 1; } .sort-wrap select { width: 100%; } .overview { grid-template-columns: repeat(2, minmax(0, 1fr)); } .case-card-top { padding: 20px; } .page-shell { padding-inline: 20px; } .stat-card { padding: 20px; } .case-metrics { flex-wrap: wrap; } }
@media (max-width: 420px) { .overview { grid-template-columns: 1fr; } .case-card-top { flex-wrap: wrap; } .bar-row { grid-template-columns: minmax(55px, 1fr) minmax(0, 1.5fr) 70px; } .sort-wrap, .toggle-wrap { width: 100%; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; } }

`;

export const reportJs = String.raw`
(() => {
  'use strict';
  const report = JSON.parse(document.getElementById('report-data').textContent);
  const byId = id => document.getElementById(id);
  const fmt = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  const bytes = value => value === null ? 'Missing' : fmt(value) + ' B';
  const pct = value => value === null ? 'N/A' : fmt(value) + '%';
  const node = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = String(value);
    return element;
  };
  const add = (parent, child) => { parent.appendChild(child); return child; };
  const statusClass = value => 'status-' + (value === 'pass' || value === 'fail' ? value : 'analyzed');
  const metric = (parent, label, value, note, muted) => {
    const box = add(parent, node('div', 'metric'));
    add(box, node('span', 'metric-label', label));
    add(box, node('span', muted ? 'metric-value muted' : 'metric-value', value));
    if (note) add(box, node('span', 'metric-note', note));
  };
  const pair = (parent, label, value) => {
    const row = add(parent, node('div', 'detail-pair'));
    add(row, node('span', '', label));
    add(row, node('span', '', value));
  };
  const tag = (parent, label, kind) => add(parent, node('span', 'tag ' + kind, label));
  const flatten = field => [field, ...(field.children || []).flatMap(flatten)];
  const fieldLine = (parent, field) => {
    const row = add(parent, node('div', 'field-line'));
    add(row, node('span', 'field-path', field.path || '(result root)'));
    add(row, node('span', 'field-bytes', fmt(field.bytes) + ' B · ' + field.kind));
  };
  const fieldTree = (parent, field) => {
    const children = field.children || [];
    if (children.length) {
      const details = add(parent, node('details', 'field-node'));
      const summary = add(details, node('summary', ''));
      fieldLine(summary, field);
      const branch = add(details, node('div', 'field-children'));
      children.forEach(child => fieldTree(branch, child));
      return;
    }
    const leaf = add(parent, node('div', 'field-node'));
    fieldLine(leaf, field);
  };
  const insight = item => {
    if (!item.current) return 'Current result is missing; field comparison is unavailable.';
    const currentFields = flatten(item.current.fields).filter(field => field.path !== '');
    const largest = currentFields.reduce((best, field) => !best || field.bytes > best.bytes ? field : best, null);
    const parts = [];
    if (largest) parts.push('Largest field: ' + largest.path + ' (' + fmt(largest.bytes) + ' B).');
    if (item.baseline) {
      const before = new Map(flatten(item.baseline.fields).filter(field => field.path !== '').map(field => [field.path, field.bytes]));
      const after = new Map(currentFields.map(field => [field.path, field.bytes]));
      let change = null;
      for (const path of new Set([...before.keys(), ...after.keys()])) {
        const delta = (after.get(path) || 0) - (before.get(path) || 0);
        if (!change || Math.abs(delta) > Math.abs(change.delta)) change = { path, delta };
      }
      if (change && change.delta !== 0) parts.push('Largest field change: ' + change.path + ' (' + (change.delta >= 0 ? '+' : '') + fmt(change.delta) + ' B).');
      else parts.push('No field-size change.');
    }
    return parts.join(' ');
  };
  const bar = (parent, label, value, max, current) => {
    const row = add(parent, node('div', 'bar-row'));
    add(row, node('span', 'bar-label', label));
    const track = add(row, node('div', 'bar-track'));
    track.setAttribute('aria-hidden', 'true');
    const fill = add(track, node('div', current ? 'bar-fill current' : 'bar-fill'));
    fill.style.width = value === null ? '0%' : Math.max(0, Math.min(100, value / max * 100)) + '%';
    add(row, node('span', 'bar-value', value === null ? 'Missing' : bytes(value)));
  };
  const renderCase = item => {
    const card = node('article', 'case-card');
    const top = add(card, node('div', 'case-card-top'));
    add(top, node('h3', 'case-name', item.id));
    add(top, node('span', 'case-status ' + statusClass(item.status), item.status));
    const body = add(card, node('div', 'case-card-body'));
    const metrics = add(body, node('div', 'case-metrics'));
    metric(metrics, 'Normalized result size', item.current ? bytes(item.current.resultBytes) : 'Missing', 'Current result', !item.current);
    metric(metrics, 'Baseline', item.baseline ? bytes(item.baseline.resultBytes) : 'No baseline', 'Previous result', !item.baseline);
    metric(metrics, 'Byte change', item.deltaBytes === null ? 'N/A' : (item.deltaBytes >= 0 ? '+' : '') + bytes(item.deltaBytes), item.deltaBytes === null ? 'No comparison' : 'Current − baseline', item.deltaBytes === null);
    const growthLabel = item.growthPercent === null && item.baseline && item.baseline.resultBytes === 0 && item.current && item.current.resultBytes > 0 ? 'Undefined' : pct(item.growthPercent);
    metric(metrics, 'Growth', growthLabel, growthLabel === 'Undefined' ? 'Zero baseline' : 'From baseline', item.growthPercent === null);
    const compare = add(body, node('div', 'compare'));
    const before = item.baseline ? item.baseline.resultBytes : null;
    const after = item.current ? item.current.resultBytes : null;
    const maximum = Math.max(1, before || 0, after || 0);
    bar(compare, 'Before', before, maximum, false);
    bar(compare, 'After', after, maximum, true);
    add(compare, node('div', 'budget-line', item.budget ? 'Budget · ' + bytes(item.budget.maxResultBytes) + ' maximum · ' + pct(item.budget.maxGrowthPercent) + ' maximum growth' : 'No budget (analyze mode)'));
    if (item.current) add(body, node('p', 'insight-line', insight(item)));
    if (item.findings.length || (item.current && (item.current.contentTypes.length || item.current.warnings.length))) {
      const tags = add(body, node('div', 'tag-row'));
      item.findings.forEach(finding => tag(tags, finding, ''));
      if (item.current) {
        item.current.warnings.forEach(warning => tag(tags, warning, 'warning'));
        item.current.contentTypes.forEach(type => tag(tags, type.type + ' ×' + fmt(type.count) + ' · ' + bytes(type.bytes), 'type'));
      }
    }
    const button = add(card, node('button', 'details-toggle', 'Inspect metrics and fields'));
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    const detail = add(card, node('div', 'case-detail'));
    detail.hidden = true;
    button.addEventListener('click', () => { detail.hidden = !detail.hidden; button.setAttribute('aria-expanded', String(!detail.hidden)); });
    const grid = add(detail, node('div', 'detail-grid'));
    const budget = add(grid, node('div', 'detail-box'));
    add(budget, node('h4', '', 'Budget & findings'));
    pair(budget, 'Absolute limit', item.budget ? bytes(item.budget.maxResultBytes) : 'No budget');
    pair(budget, 'Growth limit', item.budget ? pct(item.budget.maxGrowthPercent) : 'No budget');
    pair(budget, 'Growth observed', growthLabel);
    pair(budget, 'Findings', item.findings.length ? item.findings.join(', ') : 'None');
    const tokens = add(grid, node('div', 'detail-box'));
    add(tokens, node('h4', '', 'Token estimates'));
    pair(tokens, 'Text blocks', item.current ? fmt(item.current.textTokens) : 'Missing');
    pair(tokens, 'Structured content', item.current ? item.current.structuredTokens === null ? 'Not counted' : fmt(item.current.structuredTokens) : 'Missing');
    pair(tokens, 'Tool error flag', item.current ? item.current.isError ? 'Yes' : 'No' : 'Missing');
    pair(tokens, 'Interpretation', 'Separate estimates; not a model bill');
    if (item.current) {
      const fields = add(detail, node('div', 'field-section'));
      add(fields, node('h4', '', 'Field size tree'));
      add(fields, node('p', 'field-help', 'RFC 6901 paths · subtree bytes overlap; do not add parent and child sizes. Expand a row to inspect nested fields.'));
      const tree = add(fields, node('div', 'field-tree'));
      tree.tabIndex = 0;
      tree.setAttribute('role', 'region');
      tree.setAttribute('aria-label', 'Field attribution tree; scroll to inspect more fields');
      fieldTree(tree, item.current.fields);
    }
    return card;
  };
  const cases = report.cases;
  byId('report-mode').textContent = report.command;
  const reportStatus = byId('report-status');
  reportStatus.textContent = report.status;
  reportStatus.className = 'status-pill ' + statusClass(report.status);
  byId('report-count').textContent = fmt(cases.length) + ' case' + (cases.length === 1 ? '' : 's') + ' measured';
  byId('total-size').textContent = bytes(cases.reduce((sum, item) => sum + (item.current ? item.current.resultBytes : 0), 0));
  byId('baseline-size').textContent = cases.some(item => item.baseline) ? bytes(cases.reduce((sum, item) => sum + (item.baseline ? item.baseline.resultBytes : 0), 0)) : 'No baseline';
  byId('over-budget').textContent = fmt(cases.filter(item => item.findings.includes('absolute-budget') || item.findings.includes('growth-budget')).length);
  byId('attention-count').textContent = fmt(cases.filter(item => item.status === 'fail').length);
  const refresh = () => {
    const search = byId('case-search').value.toLocaleLowerCase();
    const failOnly = byId('fail-only').checked;
    const sort = byId('case-sort').value;
    const shown = cases.filter(item => (!failOnly || item.status === 'fail') && item.id.toLocaleLowerCase().includes(search));
    const size = item => item.current ? item.current.resultBytes : -1;
    const growth = item => item.growthPercent === null ? -Infinity : item.growthPercent;
    shown.sort((a, b) => {
      if (sort === 'name') return a.id.localeCompare(b.id);
      const delta = sort === 'size-desc' ? size(b) - size(a) : sort === 'size-asc' ? size(a) - size(b) : sort === 'growth-desc' ? growth(b) - growth(a) : growth(a) - growth(b);
      return Number.isNaN(delta) || delta === 0 ? a.id.localeCompare(b.id) : delta;
    });
    const list = byId('case-list');
    list.replaceChildren(...shown.map(renderCase));
    byId('empty-state').hidden = shown.length !== 0;
    byId('visible-count').textContent = fmt(shown.length) + ' of ' + fmt(cases.length) + ' shown';
  };
  byId('case-search').addEventListener('input', refresh);
  byId('fail-only').addEventListener('change', refresh);
  byId('case-sort').addEventListener('change', refresh);
  refresh();
})();
`;
