import type { Analysis, Baseline, Budget, FieldMetric, Finding, Report, ReportCase } from './types.js';
import * as v from './validation.js';

export const VERSION = { schemaVersion: 1, metricVersion: 1, tokenizer: 'cl100k_base' } as const;
export interface MeasuredCase { id: string; analysis: Analysis; budget: Budget }

export function createBaseline(cases: { id: string; analysis: Analysis }[]): Baseline {
  return { ...VERSION, cases: structuredClone(cases) };
}

function parseField(
  value: unknown,
  depth: number,
  parent?: { path: string; kind: 'object' | 'array'; index: number },
): FieldMetric {
  if (depth > 100) throw new Error('Baseline field tree exceeds depth 100.');
  const obj = v.object(value, 'field');
  v.keys(obj, ['path', 'bytes', 'kind', 'children'], 'field');
  const path = v.string(obj.path, 'field.path', true);
  if (depth === 0) {
    if (path !== '') throw new Error('Invalid baseline field pointer.');
  } else {
    if (!parent || !path.startsWith(`${parent.path}/`)) throw new Error('Invalid baseline field pointer.');
    const token = path.slice(parent.path.length + 1);
    if (!/^(?:[^~/]|~[01])*$/.test(token) || (parent.kind === 'array' && token !== String(parent.index))) {
      throw new Error('Invalid baseline field pointer.');
    }
  }
  const bytes = v.number(obj.bytes, 'field.bytes', true);
  const kind = v.oneOf(obj.kind, ['object', 'array', 'string', 'number', 'boolean', 'null'] as const, 'field.kind');
  if (kind === 'object' || kind === 'array') {
    const children = v.array(obj.children, 'field.children').map((child, index) =>
      parseField(child, depth + 1, { path, kind, index }));
    if (children.some(child => child.bytes > bytes) || new Set(children.map(child => child.path)).size !== children.length) {
      throw new Error('Inconsistent baseline child fields.');
    }
    return { path, bytes, kind, children };
  }
  if (obj.children !== undefined) throw new Error('Scalar baseline fields cannot contain children.');
  return { path, bytes, kind };
}

function parseAnalysis(value: unknown): Analysis {
  const obj = v.object(value, 'analysis');
  v.keys(obj, ['resultBytes', 'textTokens', 'structuredTokens', 'isError', 'contentTypes', 'fields', 'warnings'], 'analysis');
  const resultBytes = v.number(obj.resultBytes, 'analysis.resultBytes', true);
  const fields = parseField(obj.fields, 0);
  if (fields.bytes !== resultBytes || fields.kind !== 'object') throw new Error('Baseline root size is inconsistent.');
  const contentTypes = v.array(obj.contentTypes, 'analysis.contentTypes').map(raw => {
    const content = v.object(raw, 'content type');
    v.keys(content, ['type', 'count', 'bytes'], 'content type');
    return {
      type: v.oneOf(content.type, ['text', 'image', 'audio', 'resource', 'resource_link', 'unknown'] as const, 'content.type'),
      count: v.number(content.count, 'content.count', true),
      bytes: v.number(content.bytes, 'content.bytes', true),
    };
  });
  if (new Set(contentTypes.map(c => c.type)).size !== contentTypes.length ||
      contentTypes.reduce((sum, c) => sum + c.bytes, 0) > resultBytes) {
    throw new Error('Inconsistent baseline content metrics.');
  }
  return {
    resultBytes, fields, contentTypes,
    textTokens: v.number(obj.textTokens, 'analysis.textTokens', true),
    structuredTokens: obj.structuredTokens === null ? null : v.number(obj.structuredTokens, 'analysis.structuredTokens', true),
    isError: v.boolean(obj.isError, 'analysis.isError'),
    warnings: v.array(obj.warnings, 'analysis.warnings').map(code => v.oneOf(code, ['unknown-content-type'] as const, 'warning')),
  };
}

export function parseBaseline(value: unknown): Baseline {
  const obj = v.object(value, 'baseline');
  v.keys(obj, ['schemaVersion', 'metricVersion', 'tokenizer', 'cases'], 'baseline');
  if (obj.schemaVersion !== 1 || obj.metricVersion !== 1 || obj.tokenizer !== 'cl100k_base') {
    throw new Error('Incompatible baseline version or tokenizer. Create a new baseline explicitly.');
  }
  const ids = new Set<string>();
  const cases = v.array(obj.cases, 'baseline.cases').map(raw => {
    const item = v.object(raw, 'baseline case');
    v.keys(item, ['id', 'analysis'], 'baseline case');
    const id = v.string(item.id, 'baseline case.id');
    if (ids.has(id)) throw new Error('Duplicate case ID in baseline.');
    ids.add(id);
    return { id, analysis: parseAnalysis(item.analysis) };
  });
  return { ...VERSION, cases };
}

/** Exact rational form of the decimal spelling emitted by Number.toString(). */
function decimalRatio(value: number): { numerator: bigint; denominator: bigint } {
  if (!Number.isFinite(value) || value < 0) throw new Error('Invalid growth budget.');
  const [mantissa = '', exponent = '0'] = value.toString().split('e');
  const fractionDigits = mantissa.split('.')[1]?.length ?? 0;
  const digits = mantissa.replace('.', '');
  const shift = Number(exponent) - fractionDigits;
  return shift >= 0
    ? { numerator: BigInt(digits) * 10n ** BigInt(shift), denominator: 1n }
    : { numerator: BigInt(digits), denominator: 10n ** BigInt(-shift) };
}

function exceedsGrowthBudget(beforeBytes: number, deltaBytes: number, limit: number): boolean {
  if (deltaBytes <= 0) return false;
  if (beforeBytes === 0) return true;
  const { numerator, denominator } = decimalRatio(limit);
  return BigInt(deltaBytes) * 100n * denominator > BigInt(beforeBytes) * numerator;
}

export function compareCases(current: MeasuredCase[], baseline: Baseline): Report {
  const previous = new Map(baseline.cases.map(c => [c.id, c.analysis]));
  const seen = new Set<string>();
  const cases: ReportCase[] = current.map(item => {
    const before = previous.get(item.id) ?? null;
    seen.add(item.id);
    const findings: Finding[] = [];
    if (!before) findings.push('new-case');
    if (item.analysis.resultBytes > item.budget.maxResultBytes) findings.push('absolute-budget');
    const deltaBytes = before ? item.analysis.resultBytes - before.resultBytes : null;
    const growthPercent = before && deltaBytes !== null
      ? before.resultBytes === 0 ? item.analysis.resultBytes === 0 ? 0 : null : deltaBytes / before.resultBytes * 100
      : null;
    if (before && deltaBytes !== null && exceedsGrowthBudget(before.resultBytes, deltaBytes, item.budget.maxGrowthPercent)) {
      findings.push('growth-budget');
    }
    if (item.analysis.isError) findings.push('tool-error');
    return {
      id: item.id, status: findings.length ? 'fail' : 'pass', current: item.analysis,
      baseline: before, budget: item.budget, deltaBytes, growthPercent, findings,
    };
  });
  for (const item of baseline.cases) {
    if (!seen.has(item.id)) cases.push({
      id: item.id, status: 'fail', current: null, baseline: item.analysis,
      budget: null, deltaBytes: null, growthPercent: null, findings: ['missing-case'],
    });
  }
  return { ...VERSION, command: 'check', status: cases.some(c => c.status === 'fail') ? 'fail' : 'pass', cases };
}
