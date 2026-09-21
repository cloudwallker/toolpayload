import { dirname, resolve } from 'node:path';
import type { Budget, Config } from './types.js';
import * as v from './validation.js';

export const DEFAULT_BUDGET: Readonly<Budget> = { maxResultBytes: 65536, maxGrowthPercent: 20 };

function parseBudget(value: unknown, base: Readonly<Budget>, at: string): Budget {
  if (value === undefined) return { ...base };
  const obj = v.object(value, at);
  v.keys(obj, ['maxResultBytes', 'maxGrowthPercent'], at);
  return {
    maxResultBytes: obj.maxResultBytes === undefined ? base.maxResultBytes : v.number(obj.maxResultBytes, `${at}.maxResultBytes`, true),
    maxGrowthPercent: obj.maxGrowthPercent === undefined ? base.maxGrowthPercent : v.number(obj.maxGrowthPercent, `${at}.maxGrowthPercent`),
  };
}

export function parseConfig(input: unknown, configPath: string): Config {
  const config = v.object(input, 'config');
  v.keys(config, ['schemaVersion', 'budget', 'cases'], 'config');
  if (config.schemaVersion !== 1) throw new Error('Unsupported config schemaVersion; expected 1.');
  const globalBudget = parseBudget(config.budget, DEFAULT_BUDGET, 'config.budget');
  const rawCases = v.array(config.cases, 'config.cases');
  if (!rawCases.length) throw new Error('config.cases must contain at least one case.');
  const ids = new Set<string>();
  const cases = rawCases.map(raw => {
    const obj = v.object(raw, 'case');
    v.keys(obj, ['id', 'file', 'budget'], 'case');
    const id = v.string(obj.id, 'case.id');
    if (ids.has(id)) throw new Error('Duplicate case ID in config.');
    ids.add(id);
    return {
      id,
      file: resolve(dirname(resolve(configPath)), v.string(obj.file, 'case.file')),
      budget: parseBudget(obj.budget, globalBudget, 'case.budget'),
    };
  });
  return { schemaVersion: 1, cases };
}
