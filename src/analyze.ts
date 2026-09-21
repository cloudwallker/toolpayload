import { getEncoding } from 'js-tiktoken';
import type { Analysis, ContentMetric, FieldMetric } from './types.js';

const MAX_DEPTH = 100;
const tokenizer = getEncoding('cl100k_base');
const encoder = new TextEncoder();

type JsonObject = Record<string, unknown>;

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isPlainObject(value: unknown): value is JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function pointerSegment(key: string): string {
  return key.replace(/~/g, '~0').replace(/\//g, '~1');
}

interface Visited {
  json: string;
  field: FieldMetric;
}

/** Serialize strict JSON values without using an intermediate object or assigning untrusted keys. */
function visit(value: unknown, path: string, depth: number, ancestors: Set<object>): Visited {
  if (depth > MAX_DEPTH) throw new Error('JSON nesting limit exceeded');

  let json: string;
  let bytes: number;
  let kind: FieldMetric['kind'];
  let children: FieldMetric[] | undefined;

  if (value === null) {
    json = 'null';
    bytes = 4;
    kind = 'null';
  } else if (typeof value === 'string') {
    json = JSON.stringify(value);
    bytes = encoder.encode(json).byteLength;
    kind = 'string';
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid JSON number');
    json = JSON.stringify(value);
    bytes = json.length;
    kind = 'number';
  } else if (typeof value === 'boolean') {
    json = value ? 'true' : 'false';
    bytes = json.length;
    kind = 'boolean';
  } else if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || ancestors.has(value)) {
      throw new Error('Invalid JSON array');
    }
    if (Reflect.ownKeys(value).length !== value.length + 1) throw new Error('Invalid JSON array');
    ancestors.add(value);
    try {
      const parts: string[] = [];
      children = [];
      bytes = 2;
      for (let i = 0; i < value.length; i++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (!descriptor || !hasOwn(descriptor, 'value')) throw new Error('Invalid JSON array');
        const child = visit(descriptor.value, `${path}/${i}`, depth + 1, ancestors);
        parts.push(child.json);
        children.push(child.field);
        bytes += child.field.bytes + (i > 0 ? 1 : 0);
      }
      json = `[${parts.join(',')}]`;
      kind = 'array';
    } finally {
      ancestors.delete(value);
    }
  } else if (isPlainObject(value)) {
    if (ancestors.has(value)) throw new Error('Circular JSON value');
    ancestors.add(value);
    try {
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key !== 'string')) throw new Error('Invalid JSON object');
      const sorted = (keys as string[]).sort();
      const parts: string[] = [];
      children = [];
      bytes = 2;
      for (const key of sorted) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor?.enumerable || !hasOwn(descriptor, 'value')) {
          throw new Error('Invalid JSON object');
        }
        const child = visit(descriptor.value, `${path}/${pointerSegment(key)}`, depth + 1, ancestors);
        const quotedKey = JSON.stringify(key);
        parts.push(`${quotedKey}:${child.json}`);
        children.push(child.field);
        bytes += encoder.encode(quotedKey).byteLength + 1 + child.field.bytes + (parts.length > 1 ? 1 : 0);
      }
      json = `{${parts.join(',')}}`;
      kind = 'object';
    } finally {
      ancestors.delete(value);
    }
  } else {
    throw new Error('Invalid JSON value');
  }

  const field: FieldMetric = { path, bytes, kind };
  if (children !== undefined) field.children = children;
  return { json, field };
}

export function normalizeJson(value: unknown): string {
  return visit(value, '', 0, new Set()).json;
}

function requireString(object: JsonObject, key: string): string {
  const value = object[key];
  if (typeof value !== 'string') throw new Error('Invalid MCP content block');
  return value;
}

function countText(text: string): number {
  // Both special-token sets are empty: spellings such as <|endoftext|>
  // are ordinary text in saved tool results.
  return tokenizer.encode(text, [], []).length;
}

function classifyBlock(block: JsonObject): { type: string; text?: string } {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: requireString(block, 'text') };
    case 'image':
    case 'audio':
      requireString(block, 'data');
      requireString(block, 'mimeType');
      return { type: block.type };
    case 'resource': {
      const resource = block.resource;
      if (!isPlainObject(resource)) throw new Error('Invalid MCP content block');
      requireString(resource, 'uri');
      if (typeof resource.text === 'string') return { type: 'resource', text: resource.text };
      requireString(resource, 'blob');
      return { type: 'resource' };
    }
    case 'resource_link':
      requireString(block, 'uri');
      requireString(block, 'name');
      return { type: 'resource_link' };
    default:
      return { type: 'unknown' };
  }
}

/** Analyze a saved, completed MCP CallToolResult or JSON-RPC result envelope. */
export function analyzeResult(input: unknown): Analysis {
  // Validate the whole input, including any envelope metadata, before unwrapping.
  visit(input, '', 0, new Set());
  if (!isPlainObject(input)) throw new Error('Expected a completed tool result');

  let result: JsonObject = input;
  if (hasOwn(input, 'jsonrpc')) {
    if (input.jsonrpc !== '2.0' || hasOwn(input, 'error') || !isPlainObject(input.result)) {
      throw new Error('Expected a completed JSON-RPC result');
    }
    result = input.result;
  }

  if (hasOwn(result, 'error')) throw new Error('Expected a completed tool result');

  if (hasOwn(result, 'resultType') && result.resultType !== 'complete') {
    throw new Error('Expected a completed tool result');
  }
  if (hasOwn(result, 'isError') && typeof result.isError !== 'boolean') {
    throw new Error('Invalid tool error flag');
  }

  const structured = hasOwn(result, 'structuredContent');
  const contentPresent = hasOwn(result, 'content');
  const content = contentPresent ? result.content : undefined;
  if ((contentPresent && !Array.isArray(content)) || (!contentPresent && !structured)) {
    throw new Error('Expected content or structuredContent');
  }

  const { field } = visit(result, '', 0, new Set());
  const types = new Map<string, ContentMetric>();
  const warnings: string[] = [];
  let textTokens = 0;

  if (Array.isArray(content)) {
    for (const block of content) {
      if (!isPlainObject(block)) throw new Error('Invalid MCP content block');
      const classified = classifyBlock(block);
      if (classified.type === 'unknown' && warnings.length === 0) warnings.push('unknown-content-type');
      const bytes = encoder.encode(normalizeJson(block)).byteLength;
      const existing = types.get(classified.type);
      if (existing) {
        existing.count++;
        existing.bytes += bytes;
      } else {
        types.set(classified.type, { type: classified.type, count: 1, bytes });
      }
      if (classified.text !== undefined) textTokens += countText(classified.text);
    }
  }

  const structuredTokens = structured ? countText(normalizeJson(result.structuredContent)) : null;
  return {
    resultBytes: field.bytes,
    textTokens,
    structuredTokens,
    isError: result.isError === true,
    contentTypes: [...types.values()].sort((a, b) => a.type < b.type ? -1 : a.type > b.type ? 1 : 0),
    fields: field,
    warnings,
  };
}
