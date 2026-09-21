/** Internal contracts; the CLI and versioned report JSON are the v0.1 interface. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface FieldMetric {
  /** RFC 6901 JSON Pointer; empty string is the result root. */
  path: string;
  bytes: number;
  kind: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  children?: FieldMetric[];
}

export interface ContentMetric {
  type: string;
  count: number;
  bytes: number;
}

export interface Analysis {
  resultBytes: number;
  textTokens: number;
  structuredTokens: number | null;
  isError: boolean;
  contentTypes: ContentMetric[];
  fields: FieldMetric;
  /** Fixed diagnostic codes only: never echo response values. */
  warnings: string[];
}

export interface Budget {
  maxResultBytes: number;
  maxGrowthPercent: number;
}

export interface CaseConfig {
  id: string;
  file: string;
  budget: Budget;
}

export interface Config {
  schemaVersion: 1;
  cases: CaseConfig[];
}

export interface Baseline {
  schemaVersion: 1;
  metricVersion: 1;
  tokenizer: 'cl100k_base';
  cases: { id: string; analysis: Analysis }[];
}

export type Finding = 'absolute-budget' | 'growth-budget' | 'tool-error' | 'new-case' | 'missing-case';

export interface ReportCase {
  id: string;
  status: 'pass' | 'fail' | 'analyzed';
  current: Analysis | null;
  baseline: Analysis | null;
  budget: Budget | null;
  deltaBytes: number | null;
  /** Null when no baseline or percentage is undefined (zero -> positive). */
  growthPercent: number | null;
  findings: Finding[];
}

export interface Report {
  schemaVersion: 1;
  metricVersion: 1;
  tokenizer: 'cl100k_base';
  command: 'analyze' | 'check';
  status: 'pass' | 'fail' | 'analyzed';
  cases: ReportCase[];
}
