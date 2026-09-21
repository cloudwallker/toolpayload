import { describe, expect, it } from 'vitest';
import { analyzeResult, normalizeJson } from '../src/analyze.js';

describe('normalizeJson', () => {
  it('sorts keys by JavaScript UTF-16 order, including integer-like keys, and keeps Unicode UTF-8 data', () => {
    const value = JSON.parse('{"10":"😀","2":"中","a":"\\n","A":-0}');
    expect(normalizeJson(value)).toBe('{"10":"😀","2":"中","A":0,"a":"\\n"}');
  });

  it('preserves an own __proto__ key as data', () => {
    const value = JSON.parse('{"z":1,"__proto__":{"polluted":true}}');
    expect(normalizeJson(value)).toBe('{"__proto__":{"polluted":true},"z":1}');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('accepts depth 100 and rejects depth 101 with the root at zero', () => {
    const nest = (levels: number) => {
      let value: unknown = null;
      for (let i = 0; i < levels; i++) value = [value];
      return value;
    };
    expect(normalizeJson(nest(100))).toHaveLength(204);
    expect(() => normalizeJson(nest(101))).toThrow();
  });

  it('rejects cycles, sparse arrays, non-finite numbers, and non-JSON values', () => {
    const cycle: unknown[] = [];
    cycle.push(cycle);
    for (const value of [cycle, [,,], Infinity, NaN, undefined, 1n, new Date(), { x: undefined }]) {
      expect(() => normalizeJson(value)).toThrow();
    }
  });
});

describe('analyzeResult', () => {
  it('attributes sorted compact UTF-8 bytes to the result and RFC 6901 field paths', () => {
    const analysis = analyzeResult({ content: [{ type: 'text', text: '中' }], 'a/b~c': '😀' });
    expect(analysis.resultBytes).toBe(57);
    expect(analysis.fields.path).toBe('');
    expect(analysis.fields.bytes).toBe(57);
    expect(analysis.fields.children?.map(({ path }) => path)).toEqual(['/a~1b~0c', '/content']);
    expect(analysis.fields.children?.[0]?.bytes).toBe(6);
    expect(analysis.fields.children?.[1]?.children?.[0]?.children?.[1]?.path).toBe('/content/0/type');
    expect(analysis.contentTypes).toEqual([{ type: 'text', count: 1, bytes: 28 }]);
  });

  it('accepts completed JSON-RPC and direct MCP results, excluding the envelope', () => {
    const direct = { content: [{ type: 'text', text: 'hello' }], isError: false, _meta: { x: 1 } };
    expect(analyzeResult({ jsonrpc: '2.0', id: 7, result: direct })).toEqual(analyzeResult(direct));
    expect(analyzeResult({ content: [], structuredContent: null }).structuredTokens).toBeGreaterThan(0);
    expect(analyzeResult({ structuredContent: { ok: true } }).contentTypes).toEqual([]);
    expect(analyzeResult({
      jsonrpc: '2.0', id: 'new', result: {
        resultType: 'complete', content: [], structuredContent: { ok: true }, _meta: { requestId: 'x' },
      },
    }).structuredTokens).toBeGreaterThan(0);
  });

  it('accepts an empty content array as a complete result', () => {
    const analysis = analyzeResult({ content: [] });
    expect(analysis.resultBytes).toBe(14);
    expect(analysis.contentTypes).toEqual([]);
    expect(analysis.textTokens).toBe(0);
    expect(analysis.structuredTokens).toBeNull();
    expect(analysis.isError).toBe(false);
  });

  it('keeps isError true when the content array is empty', () => {
    const analysis = analyzeResult({ content: [], isError: true });
    expect(analysis.isError).toBe(true);
    expect(analysis.contentTypes).toEqual([]);
    expect(analysis.textTokens).toBe(0);
  });

  it('counts text blocks and embedded text resources separately from structured data', () => {
    const analysis = analyzeResult({
      content: [
        { type: 'text', text: 'hello' },
        { type: 'resource', resource: { uri: 'file:///x', text: 'world' } },
        { type: 'resource', resource: { uri: 'file:///binary', blob: 'aGVsbG8=' } },
        { type: 'image', mimeType: 'image/png', data: 'aGVsbG8=' },
        { type: 'audio', mimeType: 'audio/wav', data: 'aGVsbG8=' },
        { type: 'resource_link', uri: 'file:///x', name: 'x' },
      ],
      structuredContent: { text: 'hello' },
    });
    expect(analysis.textTokens).toBe(2);
    expect(analysis.structuredTokens).toBeGreaterThan(0);
    expect(analysis.contentTypes.map(({ type, count }) => [type, count])).toEqual([
      ['audio', 1], ['image', 1], ['resource', 2], ['resource_link', 1], ['text', 1],
    ]);
    expect(analysis.warnings).toEqual([]);
  });

  it('uses ordinary text tokenization for a special-token spelling', () => {
    expect(analyzeResult({ content: [{ type: 'text', text: '<|endoftext|>' }] }).textTokens).toBeGreaterThan(1);
  });

  it('reports unknown block types with a fixed code and redacted type label', () => {
    const secret = 'PRIVATE-UNKNOWN-TYPE';
    const analysis = analyzeResult({ content: [{ type: secret, payload: 'private payload' }] });
    expect(analysis.contentTypes).toEqual([{ type: 'unknown', count: 1, bytes: 59 }]);
    expect(analysis.warnings).toEqual(['unknown-content-type']);
    expect(JSON.stringify(analysis)).not.toContain(secret);
    expect(JSON.stringify(analysis)).not.toContain('private payload');
    const nonStringType = analyzeResult({ content: [{ type: { secret }, payload: 'private payload' }] });
    expect(nonStringType.contentTypes[0]?.type).toBe('unknown');
    expect(nonStringType.warnings).toEqual(['unknown-content-type']);
    expect(JSON.stringify(nonStringType)).not.toContain(secret);
  });

  it('rejects malformed known blocks and invalid result structures', () => {
    for (const input of [
      { content: [{ type: 'text' }] },
      { content: [{ type: 'image', data: 'x' }] },
      { content: [{ type: 'audio', mimeType: 'audio/wav' }] },
      { content: [{ type: 'resource', resource: { uri: 'x' } }] },
      { content: [{ type: 'resource_link', uri: 'x' }] },
      { structuredContent: undefined },
      { content: 'text' },
      { content: [], isError: 'false' },
      { content: [], structuredContent: {}, resultType: 'pending' },
      { jsonrpc: '2.0', id: 1, error: { code: 1, message: 'bad' } },
      { jsonrpc: '2.0', id: 1, result: { resultType: 'input', content: [] } },
      [{ content: [{ type: 'text', text: 'x' }] }],
    ]) {
      expect(() => analyzeResult(input)).toThrow();
    }
  });

  it('does not treat an error-bearing result as a completed response', () => {
    expect(() => analyzeResult({
      content: [{ type: 'text', text: 'failed' }],
      error: { code: -1, message: 'failed' },
    })).toThrow();
  });

  it('retains error state, includes _meta bytes, and omits absent structured tokens', () => {
    const base = analyzeResult({ content: [{ type: 'text', text: '' }] });
    const error = analyzeResult({ content: [{ type: 'text', text: '' }], isError: true, _meta: { x: 1 } });
    expect(error.isError).toBe(true);
    expect(error.resultBytes).toBeGreaterThan(base.resultBytes);
    expect(error.structuredTokens).toBeNull();
  });
});
