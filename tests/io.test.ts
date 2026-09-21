import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, mkdir, rm, link } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readJsonFile, writeArtifact, MAX_FILE_BYTES } from '../src/io.js';

const dirs: string[] = [];
async function directory() { const dir = await mkdtemp(join(tmpdir(), 'toolpayload-io-')); dirs.push(dir); return dir; }
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });

describe('bounded local I/O', () => {
  it('reads UTF-8 JSON including BOM', async () => {
    const file = join(await directory(), 'sample.json');
    await writeFile(file, '\uFEFF{"name":"中文🌱"}');
    expect(await readJsonFile(file)).toEqual({ name: '中文🌱' });
  });
  it('rejects invalid JSON without printing its private values', async () => {
    const file = join(await directory(), 'sample.json');
    await writeFile(file, '{"secret":"TOP_SECRET", bad}');
    await expect(readJsonFile(file)).rejects.toThrow('Invalid JSON');
    try { await readJsonFile(file); } catch (error) { expect(String(error)).not.toContain('TOP_SECRET'); }
  });
  it('rejects invalid UTF-8, nonfiles and inputs above 10 MiB', async () => {
    const dir = await directory();
    const file = join(dir, 'sample.json');
    await writeFile(file, Buffer.from([0xff, 0xfe]));
    await expect(readJsonFile(file)).rejects.toThrow('UTF-8');
    await writeFile(file, Buffer.alloc(MAX_FILE_BYTES + 1));
    await expect(readJsonFile(file)).rejects.toThrow('10 MiB');
    await expect(readJsonFile(dir)).rejects.toThrow();
  });
  it('accepts a valid JSON file exactly at the documented byte limit', async () => {
    const file = join(await directory(), 'at-limit.json');
    const json = '{"content":[]}';
    await writeFile(file, json + ' '.repeat(MAX_FILE_BYTES - Buffer.byteLength(json)));
    expect(await readJsonFile(file)).toEqual({ content: [] });
  });
  it('uses exclusive creation unless overwrite is explicitly allowed', async () => {
    const file = join(await directory(), 'nested', 'baseline.json');
    await writeArtifact(file, 'original', { overwrite: false });
    await expect(writeArtifact(file, 'changed', { overwrite: false })).rejects.toThrow();
    expect(await readFile(file, 'utf8')).toBe('original');
    await writeArtifact(file, 'changed', { overwrite: true });
    expect(await readFile(file, 'utf8')).toBe('changed');
  });
  it('refuses to overwrite a protected input, even through a hard link', async () => {
    const dir = await directory();
    const input = join(dir, 'sample.json');
    const alias = join(dir, 'alias.json');
    await writeFile(input, 'SAMPLE');
    await link(input, alias);
    for (const output of [input, alias]) {
      await expect(writeArtifact(output, 'REPORT', { overwrite: true, protectedPaths: [input] })).rejects.toThrow('input');
    }
    expect(await readFile(input, 'utf8')).toBe('SAMPLE');
    await mkdir(join(dir, 'folder'));
    await expect(writeArtifact(join(dir, 'folder'), 'REPORT', { overwrite: true })).rejects.toThrow();
  });
});
