import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { run } from '../src/commands.js';

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'toolpayload-cli-'));
  dirs.push(dir);
  const sample = join(dir, 'response.json');
  const config = join(dir, 'config.json');
  const baseline = join(dir, 'baseline.json');
  await writeFile(sample, JSON.stringify({ content: [{ type: 'text', text: 'SECRET_INPUT' }] }));
  await writeFile(config, JSON.stringify({ schemaVersion: 1, cases: [{ id: 'query', file: 'response.json' }] }));
  return { dir, sample, config, baseline };
}
async function cli(...args: string[]) {
  let out = ''; let err = '';
  const code = await run(args, { stdout: text => { out += text; }, stderr: text => { err += text; } });
  return { code, out, err };
}

describe('CLI workflows', () => {
  it('analyzes a local fixture with a versioned value-free JSON report', async () => {
    const { sample } = await setup();
    const result = await cli('analyze', sample, '--format', 'json');
    expect(result.code).toBe(0);
    expect(result.err).toBe('');
    expect(JSON.parse(result.out)).toMatchObject({ schemaVersion: 1, metricVersion: 1, command: 'analyze' });
    expect(result.out).not.toContain('SECRET_INPUT');
  });
  it('snapshots, passes unchanged data, fails bloated data, and still writes HTML', async () => {
    const { dir, sample, config, baseline } = await setup();
    expect((await cli('snapshot', '--config', config, '--out', baseline)).code).toBe(0);
    const baselineBefore = await readFile(baseline, 'utf8');
    expect(baselineBefore).not.toContain('SECRET_INPUT');
    expect((await cli('check', '--config', config, '--baseline', baseline)).code).toBe(0);
    await writeFile(sample, JSON.stringify({ content: [{ type: 'text', text: 'logs '.repeat(100) }] }));
    const output = join(dir, 'report.html');
    const result = await cli('check', '--config', config, '--baseline', baseline, '--format', 'html', '--out', output);
    expect(result.code).toBe(1);
    expect(await readFile(output, 'utf8')).toContain('ToolPayload');
    expect(await readFile(baseline, 'utf8')).toBe(baselineBefore);
  });
  it('requires force for baseline replacement and never overwrites inputs', async () => {
    const { sample, config, baseline } = await setup();
    expect((await cli('snapshot', '--config', config, '--out', baseline)).code).toBe(0);
    expect((await cli('snapshot', '--config', config, '--out', baseline)).code).toBe(2);
    expect((await cli('snapshot', '--config', config, '--out', baseline, '--force')).code).toBe(0);
    expect((await cli('snapshot', '--config', config, '--out', sample, '--force')).code).toBe(2);
    expect((await cli('check', '--config', config, '--baseline', baseline, '--out', baseline)).code).toBe(2);
    expect((await cli('analyze', sample, '--out', sample)).code).toBe(2);
  });
  it('fails both error responses and changed case sets', async () => {
    const { sample, config, baseline } = await setup();
    await cli('snapshot', '--config', config, '--out', baseline);
    await writeFile(sample, JSON.stringify({ content: [], isError: true }));
    expect((await cli('check', '--config', config, '--baseline', baseline)).code).toBe(1);
    await writeFile(config, JSON.stringify({ schemaVersion: 1, cases: [{ id: 'renamed', file: 'response.json' }] }));
    const report = await cli('check', '--config', config, '--baseline', baseline, '--format', 'json');
    expect(report.code).toBe(1);
    expect(JSON.parse(report.out).cases).toHaveLength(2);
  });
  it('uses exit 2 for malformed input and incompatible baselines without leaking sample data', async () => {
    const { sample, config, baseline } = await setup();
    await cli('snapshot', '--config', config, '--out', baseline);
    await writeFile(baseline, '{"schemaVersion":9}');
    expect((await cli('check', '--config', config, '--baseline', baseline)).code).toBe(2);
    await writeFile(sample, '{TOP_SECRET_BROKEN');
    const result = await cli('analyze', sample);
    expect(result.code).toBe(2);
    expect(result.err).not.toContain('TOP_SECRET_BROKEN');
  });
  it('reports usage errors and help deterministically', async () => {
    for (const args of [['oops'], ['analyze'], ['check'], ['snapshot', '--force'], ['analyze', 'a', '--format', 'yaml']]) {
      expect((await cli(...args)).code).toBe(2);
    }
    expect((await cli('--help')).out).toContain('snapshot');
    expect((await cli('--version')).out.trim()).toBe('0.1.0');
  });
});
