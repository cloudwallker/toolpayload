import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = join(root, 'artifacts');
await mkdir(artifacts, { recursive: true });
const npm = process.env.npm_execpath;
assert(npm, 'Run via npm run smoke so the current npm CLI can be located portably.');
let cache;
try { if ((await stat(join(root, '.cache/npm'))).isDirectory()) cache = join(root, '.cache/npm'); } catch { /* CI uses npm's default cache. */ }
function execute(binary, args, options = {}) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8', timeout: 120000, ...options });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}
// prepack rebuilds the package, so this also exercises the actual packaging hook.
const packArgs = [npm, 'pack', '--json', '--pack-destination', artifacts];
if (cache) packArgs.push('--cache', cache);
const packed = execute(process.execPath, packArgs);
const packages = JSON.parse(packed);
const packedPaths = new Set(packages[0].files.map(file => file.path));
for (const required of ['dist/cli.js', 'README.zh-CN.md', 'docs/RESEARCH.md', 'docs/assets/report-preview.png', 'LICENSE']) {
  assert(packedPaths.has(required), `Package is missing ${required}`);
}
assert(![...packedPaths].some(path => path.startsWith('.work/') || path.startsWith('artifacts/')));
const tarball = join(artifacts, packages[0].filename);
const workspace = await mkdtemp(join(artifacts, 'packed-smoke-'));
await writeFile(join(workspace, 'package.json'), JSON.stringify({ private: true, name: 'toolpayload-install-smoke', version: '1.0.0' }));
const installArgs = [npm, 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'];
if (cache) installArgs.push('--cache', cache);
installArgs.push(tarball);
execute(process.execPath, installArgs, { cwd: workspace });
const installedCli = join(workspace, 'node_modules/toolpayload/dist/cli.js');
const fixture = join(root, 'examples/baseline-search.json');
const networkGuard = join(root, 'scripts/deny-network.cjs');
const output = execute(process.execPath, ['--require', networkGuard, installedCli, 'analyze', fixture, '--format', 'json'], { cwd: workspace });
assert.equal(JSON.parse(output).command, 'analyze');
const baseline = join(workspace, 'baseline.json');
execute(process.execPath, ['--require', networkGuard, installedCli, 'snapshot', '--config', join(root, 'examples/baseline-config.json'), '--out', baseline]);
const before = await readFile(baseline, 'utf8');
const failure = spawnSync(process.execPath, ['--require', networkGuard, installedCli, 'check', '--config', join(root, 'examples/current-config.json'),
  '--baseline', baseline, '--format', 'json'], { cwd: workspace, encoding: 'utf8' });
assert.equal(failure.status, 1, failure.stderr);
assert.equal(JSON.parse(failure.stdout).status, 'fail');
assert.equal(await readFile(baseline, 'utf8'), before);
const missing = spawnSync(process.execPath, ['--require', networkGuard, installedCli, 'analyze', join(workspace, 'missing.json')], { encoding: 'utf8' });
assert.equal(missing.status, 2);
// Run the installed bin shim too, catching missing executable bits and npm bin metadata.
const shim = join(workspace, 'node_modules/.bin/toolpayload');
if (process.platform !== 'win32') execute(shim, ['--version'], { cwd: workspace });
else execute(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'node_modules\\.bin\\toolpayload.cmd --version'], { cwd: workspace });
console.log(`Packed install and offline CLI verified (exit codes 0/1/2): ${tarball}`);
