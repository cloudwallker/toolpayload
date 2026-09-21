import { spawnSync } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(join(root, 'artifacts'), { recursive: true });
const cli = (...args) => {
  const result = spawnSync(process.execPath, [join(root, 'dist/cli.js'), ...args], { cwd: root, encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
};
const snapshot = cli('snapshot', '--config', 'examples/baseline-config.json', '--out', 'artifacts/baseline.json', '--force');
assert.equal(snapshot.status, 0, snapshot.stderr);
const pass = cli('check', '--config', 'examples/baseline-config.json', '--baseline', 'artifacts/baseline.json');
assert.equal(pass.status, 0, pass.stderr);
for (const format of ['json', 'html']) {
  const regression = cli('check', '--config', 'examples/current-config.json', '--baseline', 'artifacts/baseline.json',
    '--format', format, '--out', `artifacts/demo-report.${format}`);
  assert.equal(regression.status, 1, `Expected budget failure (exit 1), got ${regression.status}: ${regression.stderr}`);
}
const report = JSON.parse(await readFile(join(root, 'artifacts/demo-report.json'), 'utf8'));
const search = report.cases.find(item => item.id === 'search');
assert(search.findings.includes('growth-budget'));
assert.equal(report.cases.find(item => item.id === 'multimodal').status, 'pass');
console.log(`Demo verified: search grew from ${search.baseline.resultBytes} B to ${search.current.resultBytes} B (+${search.growthPercent.toFixed(1)}%).`);
console.log('Unchanged fixtures passed; bloated fixtures correctly returned exit 1.');
console.log('Open artifacts/demo-report.html. All demo inputs and analysis are local.');
