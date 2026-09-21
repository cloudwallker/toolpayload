import { parseArgs } from 'node:util';
import { basename } from 'node:path';
import { analyzeResult } from './analyze.js';
import { parseConfig } from './config.js';
import { VERSION, compareCases, createBaseline, parseBaseline } from './compare.js';
import { MAX_FILE_BYTES, readJsonFile, writeArtifact } from './io.js';
import { renderReport } from './report.js';
import type { Report, Config } from './types.js';

interface Output { stdout: (text: string) => void; stderr: (text: string) => void }
type Format = 'text' | 'json' | 'html';
const HELP = `ToolPayload 0.1.0 — offline MCP result budgets

Usage:
  toolpayload analyze FILE [--format text|json|html] [--out FILE]
  toolpayload snapshot --config FILE --out FILE [--force]
  toolpayload check --config FILE --baseline FILE [--format text|json|html] [--out FILE]

Options:
  --help       Show help
  --version    Show version
  --format     Output format (default: text)
  --out        Write a complete report to a file instead of stdout
  --force      Explicitly replace an existing baseline (snapshot only)

Exit codes: 0 success, 1 budget/tool-error/case-set failure, 2 input or operation error.
All inputs are local JSON files, at most 10 MiB. No network or model calls.
Result bytes are normalized JSON bytes, not wire bytes or model billing tokens.
`;

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unexpected operation failure.';
  return JSON.stringify(message).slice(1, -1).replace(/[\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,
    character => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

async function measure(config: Config) {
  const cases = [];
  // Sequential by design: bound peak memory across large fixture collections.
  for (const item of config.cases) {
    try {
      cases.push({ id: item.id, analysis: analyzeResult(await readJsonFile(item.file)), budget: item.budget });
    } catch (error) {
      throw new Error(`Case ${JSON.stringify(item.id)}: ${error instanceof Error ? error.message : 'Cannot analyze input.'}`);
    }
  }
  return cases;
}

export async function run(args: string[], output: Output = {
  stdout: text => { process.stdout.write(text); },
  stderr: text => { process.stderr.write(text); },
}): Promise<0 | 1 | 2> {
  try {
    if (!args.length || (args.length === 1 && args[0] === '--help')) { output.stdout(HELP); return 0; }
    if (args.length === 1 && args[0] === '--version') { output.stdout('0.1.0\n'); return 0; }
    const command = args[0];
    if (command !== 'analyze' && command !== 'snapshot' && command !== 'check') throw new Error('Unknown command. Use --help.');
    const options: Record<string, { type: 'boolean' | 'string' }> = { help: { type: 'boolean' }, out: { type: 'string' } };
    if (command !== 'snapshot') options.format = { type: 'string' };
    if (command !== 'analyze') options.config = { type: 'string' };
    if (command === 'snapshot') options.force = { type: 'boolean' };
    if (command === 'check') options.baseline = { type: 'string' };
    const parsed = parseArgs({ args: args.slice(1), options, allowPositionals: true, strict: true });
    if (parsed.values.help) { output.stdout(HELP); return 0; }
    const stringOption = (key: string, required = false): string | undefined => {
      const value = parsed.values[key];
      if (value === undefined && !required) return undefined;
      if (typeof value !== 'string' || !value.trim()) throw new Error(`--${key} requires a non-empty value.`);
      return value;
    };
    const out = stringOption('out', command === 'snapshot');
    const formatValue = stringOption('format') ?? 'text';
    if (!['text', 'json', 'html'].includes(formatValue)) throw new Error('--format must be text, json, or html.');
    const format = formatValue as Format;
    const protectedPaths: string[] = [];
    let report: Report;
    if (command === 'analyze') {
      if (parsed.positionals.length !== 1) throw new Error('analyze requires exactly one input file.');
      const input = parsed.positionals[0]!;
      protectedPaths.push(input);
      const analysis = analyzeResult(await readJsonFile(input));
      report = { ...VERSION, command: 'analyze', status: 'analyzed', cases: [{
        id: basename(input), status: 'analyzed', current: analysis, baseline: null,
        budget: null, deltaBytes: null, growthPercent: null, findings: [],
      }] };
    } else {
      if (parsed.positionals.length) throw new Error('This command accepts options only. Use --help.');
      const configPath = stringOption('config', true)!;
      const config = parseConfig(await readJsonFile(configPath), configPath);
      protectedPaths.push(configPath, ...config.cases.map(item => item.file));
      // Validate baseline before any expensive fixture analysis.
      const baselinePath = command === 'check' ? stringOption('baseline', true)! : undefined;
      const baseline = baselinePath ? parseBaseline(await readJsonFile(baselinePath)) : undefined;
      if (baselinePath) protectedPaths.push(baselinePath);
      const measured = await measure(config);
      if (command === 'snapshot') {
        const snapshot = createBaseline(measured.map(({ id, analysis }) => ({ id, analysis })));
        const text = `${JSON.stringify(snapshot, null, 2)}\n`;
        if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
          throw new Error('Baseline would exceed 10 MiB. Split the fixture collection into smaller configurations.');
        }
        await writeArtifact(out!, text, { overwrite: parsed.values.force === true, protectedPaths });
        output.stdout(`Saved baseline for ${snapshot.cases.length} case(s).\n`);
        return 0;
      }
      report = compareCases(measured, baseline!);
    }
    const rendered = renderReport(report, format);
    if (out) await writeArtifact(out, rendered, { overwrite: true, protectedPaths });
    else output.stdout(rendered.endsWith('\n') ? rendered : `${rendered}\n`);
    return report.status === 'fail' ? 1 : 0;
  } catch (error) {
    output.stderr(`toolpayload: ${safeError(error)}\n`);
    return 2;
  }
}
