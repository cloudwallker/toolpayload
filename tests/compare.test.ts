import { describe, expect, it } from 'vitest';
import { createBaseline, compareCases, parseBaseline } from '../src/compare.js';
import type { Analysis, Budget, FieldMetric } from '../src/types.js';

const analysis = (bytes: number, isError = false): Analysis => ({
  resultBytes: bytes, textTokens: 0, structuredTokens: null, isError,
  contentTypes: [], fields: { path: '', bytes, kind: 'object', children: [] }, warnings: [],
});
const budget: Budget = { maxResultBytes: 120, maxGrowthPercent: 20 };
const baseline = createBaseline([{ id: 'search', analysis: analysis(100) }]);
const check = (bytes: number, b = budget) => compareCases([{ id: 'search', analysis: analysis(bytes), budget: b }], baseline);

describe('budget comparisons', () => {
  it('passes equality at both boundaries and fails strictly greater budgets', () => {
    expect(check(120).status).toBe('pass');
    expect(check(121).cases[0]?.findings).toEqual(['absolute-budget', 'growth-budget']);
    expect(check(90).cases[0]?.growthPercent).toBe(-10);
  });
  it.each([
    { before: 100, at: 129, above: 130, limit: 29 },
    { before: 1000, at: 1001, above: 1002, limit: 0.1 },
    { before: 1_000_000_000, at: 1_000_000_001, above: 1_000_000_002, limit: 1e-7 },
  ])('compares decimal growth at $limit percent exactly', ({ before, at, above, limit }) => {
    const previous = createBaseline([{ id: 'search', analysis: analysis(before) }]);
    const threshold = { maxResultBytes: 2_000_000_000, maxGrowthPercent: limit };
    const compare = (bytes: number) => compareCases([
      { id: 'search', analysis: analysis(bytes), budget: threshold },
    ], previous);
    expect(compare(at).cases[0]?.findings).toEqual([]);
    expect(compare(above).cases[0]?.findings).toEqual(['growth-budget']);
  });
  it('handles zero baselines without non-JSON Infinity', () => {
    const zero = createBaseline([{ id: 'zero', analysis: analysis(0) }]);
    const report = compareCases([{ id: 'zero', analysis: analysis(1), budget }], zero);
    expect(report.cases[0]?.growthPercent).toBeNull();
    expect(report.cases[0]?.findings).toEqual(['growth-budget']);
    expect(compareCases([{ id: 'zero', analysis: analysis(0), budget }], zero).status).toBe('pass');
  });
  it('does not count a tiny tool error as an improvement', () => {
    const report = compareCases([{ id: 'search', analysis: analysis(1, true), budget }], baseline);
    expect(report.cases[0]?.findings).toEqual(['tool-error']);
    expect(report.status).toBe('fail');
  });
  it('reports both added and missing cases and checks new cases against absolute caps', () => {
    const report = compareCases([{ id: 'new', analysis: analysis(121), budget }], baseline);
    expect(report.cases.map(c => [c.id, c.findings])).toEqual([
      ['new', ['new-case', 'absolute-budget']], ['search', ['missing-case']],
    ]);
  });
  it('keeps all cases and leaves the baseline unchanged', () => {
    const before = JSON.stringify(baseline);
    const report = compareCases([
      { id: 'search', analysis: analysis(130), budget },
      { id: 'other', analysis: analysis(10), budget },
    ], baseline);
    expect(report.cases).toHaveLength(2);
    expect(JSON.stringify(baseline)).toBe(before);
  });
});

describe('baseline validation', () => {
  it('round trips a baseline', () => expect(parseBaseline(JSON.parse(JSON.stringify(baseline)))).toEqual(baseline));
  const withFields = (fields: FieldMetric) => createBaseline([{ id: 'search', analysis: { ...analysis(fields.bytes), fields } }]);
  it('round trips escaped object tokens and canonical array indexes', () => {
    const fields: FieldMetric = { path: '', bytes: 30, kind: 'object', children: [
      { path: '/a~1b~0c', bytes: 10, kind: 'array', children: [
        { path: '/a~1b~0c/0', bytes: 1, kind: 'null' },
      ] },
    ] };
    const saved = withFields(fields);
    expect(parseBaseline(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });
  it.each([
    { name: 'invalid pointer escape', fields: { path: '', bytes: 30, kind: 'object', children: [
      { path: '/invalid~2', bytes: 1, kind: 'null' },
    ] } },
    { name: 'child outside its parent', fields: { path: '', bytes: 30, kind: 'object', children: [
      { path: '/a', bytes: 10, kind: 'object', children: [
        { path: '/b', bytes: 1, kind: 'null' },
      ] },
    ] } },
    { name: 'wrong array index', fields: { path: '', bytes: 30, kind: 'object', children: [
      { path: '/a', bytes: 10, kind: 'array', children: [
        { path: '/a/1', bytes: 1, kind: 'null' },
      ] },
    ] } },
  ])('rejects $name in a baseline field tree', ({ fields }) => {
    expect(() => parseBaseline(withFields(fields as FieldMetric))).toThrow();
  });
  it.each([
    { ...baseline, schemaVersion: 2 }, { ...baseline, metricVersion: 2 },
    { ...baseline, tokenizer: 'other' }, { ...baseline, cases: [...baseline.cases, ...baseline.cases] },
    { ...baseline, cases: [{ id: 'a', analysis: { ...analysis(10), resultBytes: -1 } }] },
    { ...baseline, cases: [{ id: 'a', analysis: { ...analysis(10), resultBytes: 20 } }] },
    { ...baseline, cases: [{ id: 'a', analysis: { ...analysis(10), raw: 'SECRET' } }] },
  ])('rejects corrupt or incompatible metrics %#', value => expect(() => parseBaseline(value)).toThrow());
});
