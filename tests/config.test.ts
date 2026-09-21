import { describe, expect, it } from 'vitest';
import { parseConfig } from '../src/config.js';

describe('configuration', () => {
  it('resolves paths from the config and combines global and per-case budgets', () => {
    const config = parseConfig({ schemaVersion: 1, budget: { maxResultBytes: 200 }, cases: [
      { id: 'search', file: './search.json', budget: { maxGrowthPercent: 5 } },
      { id: 'empty', file: 'empty.json' },
    ] }, '/project/examples/toolpayload.config.json');
    expect(config.cases[0]?.file.replaceAll('\\', '/')).toMatch(/\/project\/examples\/search.json$/);
    expect(config.cases.map(c => c.budget)).toEqual([
      { maxResultBytes: 200, maxGrowthPercent: 5 }, { maxResultBytes: 200, maxGrowthPercent: 20 },
    ]);
  });
  it('supplies the documented defaults', () => {
    expect(parseConfig({ schemaVersion: 1, cases: [{ id: 'a', file: 'a.json' }] }, 'config.json').cases[0]?.budget)
      .toEqual({ maxResultBytes: 65536, maxGrowthPercent: 20 });
  });
  it.each([
    {}, { schemaVersion: 2, cases: [] }, { schemaVersion: 1, cases: [] },
    { schemaVersion: 1, cases: [{ id: 'a', file: 'a' }, { id: 'a', file: 'b' }] },
    { schemaVersion: 1, cases: [{ id: '', file: 'a' }] },
    { schemaVersion: 1, budget: { maxResultBytes: -1 }, cases: [{ id: 'a', file: 'a' }] },
    { schemaVersion: 1, budget: { maxResultBytes: 2.5 }, cases: [{ id: 'a', file: 'a' }] },
    { schemaVersion: 1, budget: { maxGrowthPercent: Infinity }, cases: [{ id: 'a', file: 'a' }] },
    { schemaVersion: 1, budget: { maxBytes: 100 }, cases: [{ id: 'a', file: 'a' }] },
    { schemaVersion: 1, cases: [{ id: 'a', file: '' }] },
  ])('rejects invalid or ambiguous config %#', value => {
    expect(() => parseConfig(value, 'config.json')).toThrow();
  });
});
