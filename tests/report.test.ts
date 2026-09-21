import { describe, expect, it } from 'vitest';
import { runInNewContext } from 'node:vm';
import { renderReport } from '../src/report.js';
import type { Analysis, Report } from '../src/types.js';

const current: Analysis = {
  resultBytes: 150,
  textTokens: 13,
  structuredTokens: 7,
  isError: false,
  contentTypes: [{ type: 'text', count: 1, bytes: 120 }, { type: 'custom', count: 1, bytes: 30 }],
  fields: {
    path: '', bytes: 150, kind: 'object', children: [
      { path: '/content', bytes: 120, kind: 'array', children: [
        { path: '/content/0', bytes: 118, kind: 'object', children: [
          { path: '/content/0/text', bytes: 100, kind: 'string' },
        ] },
      ] },
      { path: '/structuredContent/a~1b~0c', bytes: 20, kind: 'string' },
    ],
  },
  warnings: ['unknown-content-type'],
};

const report: Report = {
  schemaVersion: 1, metricVersion: 1, tokenizer: 'cl100k_base',
  command: 'check', status: 'fail',
  cases: [
    { id: 'catalog', status: 'fail', current, baseline: { ...current, resultBytes: 100, fields: { path: '', bytes: 100, kind: 'object', children: [{ path: '/content', bytes: 60, kind: 'array' }] } }, budget: { maxResultBytes: 140, maxGrowthPercent: 20 }, deltaBytes: 50, growthPercent: 50, findings: ['absolute-budget', 'growth-budget'] },
    { id: 'removed', status: 'fail', current: null, baseline: current, budget: { maxResultBytes: 140, maxGrowthPercent: 20 }, deltaBytes: null, growthPercent: null, findings: ['missing-case'] },
    { id: 'fresh', status: 'fail', current, baseline: null, budget: { maxResultBytes: 140, maxGrowthPercent: 20 }, deltaBytes: null, growthPercent: null, findings: ['new-case'] },
  ],
};

describe('renderReport', () => {
  it('preserves the versioned report as machine-readable JSON', () => {
    expect(JSON.parse(renderReport(report, 'json'))).toEqual(report);
  });

  it('describes size, budgets, token categories, missing and new cases in text', () => {
    const text = renderReport(report, 'text');
    expect(text).toContain('150');
    expect(text).toContain('100');
    expect(text).toContain('50%');
    expect(text).toContain('140');
    expect(text).toContain('20%');
    expect(text).toContain('Text tokens: 13');
    expect(text).toContain('Structured tokens: 7');
    expect(text).toContain('not a model bill');
    expect(text).toContain('missing-case');
    expect(text).toContain('new-case');
    expect(text).toContain('unknown-content-type');
    expect(text).toContain('/structuredContent/a~1b~0c');
    expect(text).toContain('overlap');
  });

  it('escapes terminal controls and bidi characters in user-controlled labels', () => {
    const poisoned = structuredClone(report);
    poisoned.cases[0]!.id = 'x\u001b[31m\u009b\u202e';
    poisoned.cases[0]!.current!.fields.children![0]!.path = '/x\u001b';
    const text = renderReport(poisoned, 'text');
    expect(text).not.toMatch(/[\u001b\u009b\u202e]/u);
    expect(text).toContain('\\u001b');
    expect(text).toContain('\\u202e');
  });

  it('embeds hostile ids and RFC 6901 paths as inert JSON while keeping one offline page', () => {
    const poisoned = structuredClone(report);
    const evil = '</script><img src=x onerror="alert(1)">\u2028"&';
    poisoned.cases[0]!.id = evil;
    poisoned.cases[0]!.current!.fields.children![0]!.path = `/~1${evil}~0`;
    const html = renderReport(poisoned, 'html');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('ToolPayload');
    expect(html).not.toContain('</script><img');
    expect(html).not.toMatch(/<script[^>]+src=|<link[^>]+href=|<img\b|@import|url\(/i);
    const match = html.match(/<script id="report-data" type="application\/json">([^]*?)<\/script>/);
    expect(match).not.toBeNull();
    expect(JSON.parse(match![1]!)).toEqual(poisoned);
    expect(html.match(/<script\b/g)).toHaveLength(2);
    expect(html).toContain('textContent');
    expect(html).not.toContain('innerHTML');
  });

  it('includes interactive controls and explicit absent metrics', () => {
    const analyzed: Report = { ...report, command: 'analyze', status: 'analyzed', cases: [{ id: 'empty', status: 'analyzed', current: { ...current, resultBytes: 0, structuredTokens: null }, baseline: null, budget: null, deltaBytes: null, growthPercent: null, findings: [] }] };
    const html = renderReport(analyzed, 'html');
    expect(html).toContain('id="case-search"');
    expect(html).toContain('id="fail-only"');
    expect(html).toContain('id="case-sort"');
    expect(html).toContain('Normalized result size');
    expect(html).toContain('No baseline');
    expect(html).toContain('No budget');
    expect(html).toContain('Not counted');
  });

  it('locates the largest change across removed and added field paths', () => {
    const before: Analysis = { ...current, resultBytes: 10211, fields: { path: '', bytes: 10211, kind: 'object', children: [{ path: '/content', bytes: 200, kind: 'array' }, { path: '/debug', bytes: 10011, kind: 'string' }] } };
    const after: Analysis = { ...current, resultBytes: 200, fields: { path: '', bytes: 200, kind: 'object', children: [{ path: '/content', bytes: 200, kind: 'array' }] } };
    const removed: Report = { ...report, cases: [{ id: 'removed-field', status: 'pass', current: after, baseline: before, budget: null, deltaBytes: -10011, growthPercent: -98, findings: [] }] };
    expect(executeEmbeddedScript(removed).textContent).toContain('Largest field change: /debug (-10,011 B).');

    const added: Report = { ...report, cases: [{ id: 'added-field', status: 'pass', current: before, baseline: after, budget: null, deltaBytes: 10011, growthPercent: 5005.5, findings: [] }] };
    expect(executeEmbeddedScript(added).textContent).toContain('Largest field change: /debug (+10,011 B).');
  });

  it('scales before and after bars against the measured results, even with a much larger budget', () => {
    const small: Report = { ...report, cases: [{ ...report.cases[0]!, current: { ...current, resultBytes: 200 }, baseline: { ...current, resultBytes: 100 }, budget: { maxResultBytes: 65536, maxGrowthPercent: 20 } }] };
    const list = executeEmbeddedScript(small);
    const bars = findByClass(list, 'bar-fill');
    expect(bars.map(bar => bar.style.width)).toEqual(['50%', '100%']);
    expect(list.textContent).toContain('65,536 B maximum');
  });
});

class FakeElement {
  className = '';
  hidden = false;
  value = '';
  checked = false;
  style = { width: '' };
  children: FakeElement[] = [];
  private content = '';
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, () => void>();
  constructor(readonly tag: string) {}
  get textContent(): string { return this.content + this.children.map(child => child.textContent).join(''); }
  set textContent(value: string) { this.content = value; this.children = []; }
  appendChild(child: FakeElement): FakeElement { this.children.push(child); return child; }
  replaceChildren(...children: FakeElement[]): void { this.content = ''; this.children = children; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  addEventListener(name: string, callback: () => void): void { this.listeners.set(name, callback); }
}

function findByClass(root: FakeElement, name: string): FakeElement[] {
  return [root, ...root.children.flatMap(child => findByClass(child, name))].filter(element => element.className.split(' ').includes(name));
}

function executeEmbeddedScript(input: Report): FakeElement {
  const html = renderReport(input, 'html');
  const data = html.match(/<script id="report-data" type="application\/json">([^]*?)<\/script>/)?.[1];
  const script = html.match(/<script>([^]*?)<\/script>/)?.[1];
  if (!data || !script) throw new Error('Missing embedded report scripts');
  const ids = ['report-data', 'report-mode', 'report-status', 'report-count', 'total-size', 'baseline-size', 'over-budget', 'attention-count', 'case-search', 'fail-only', 'case-sort', 'case-list', 'empty-state', 'visible-count'];
  const elements = new Map(ids.map(id => [id, new FakeElement(id)]));
  elements.get('report-data')!.textContent = data;
  elements.get('case-sort')!.value = 'size-desc';
  const document = { getElementById: (id: string) => elements.get(id), createElement: (tag: string) => new FakeElement(tag) };
  runInNewContext(script, { document, Intl });
  return elements.get('case-list')!;
}
