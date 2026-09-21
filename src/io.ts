import { open, lstat, stat, realpath, mkdir, writeFile, rename, unlink, link } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function readJsonFile(path: string): Promise<unknown> {
  const handle = await open(path, 'r');
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw new Error('Input must be a regular file.');
    if (info.size > MAX_FILE_BYTES) throw new Error('Input file exceeds 10 MiB.');
    // Read one extra byte to bound memory even if another process grows the file.
    const buffer = Buffer.alloc(Math.min(info.size + 1, MAX_FILE_BYTES + 1));
    let length = 0;
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null);
      if (!bytesRead) break;
      length += bytesRead;
    }
    if (length > MAX_FILE_BYTES) throw new Error('Input file exceeds 10 MiB.');
    // A changed input is not a trustworthy fixture; do not analyze a truncated prefix.
    if (length > info.size) throw new Error('Input file changed while being read; retry with a stable fixture.');
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length)); }
    catch { throw new Error('Input file must contain valid UTF-8.'); }
    try { return JSON.parse(text); }
    catch { throw new Error('Invalid JSON input. Parser details are suppressed to avoid exposing response values.'); }
  } finally {
    await handle.close();
  }
}

function pathIdentity(path: string): string {
  const absolute = resolve(path);
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
}

async function existsStat(path: string) {
  try { return await lstat(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function guardOutput(output: string, protectedPaths: string[]): Promise<void> {
  const outputStat = await existsStat(output);
  if (outputStat && (!outputStat.isFile() || outputStat.isSymbolicLink())) {
    throw new Error('Output must be a regular file, not a directory or symbolic link.');
  }
  const resolvedOutput = outputStat ? await realpath(output) : resolve(output);
  for (const path of protectedPaths) {
    if (pathIdentity(output) === pathIdentity(path)) throw new Error('Output would overwrite an input file.');
    if (!outputStat) continue;
    const inputStat = await stat(path);
    if ((inputStat.dev === outputStat.dev && inputStat.ino === outputStat.ino) ||
        pathIdentity(resolvedOutput) === pathIdentity(await realpath(path))) {
      throw new Error('Output would overwrite an input file.');
    }
  }
}

export async function writeArtifact(path: string, text: string, options: {
  overwrite: boolean;
  protectedPaths?: string[];
}): Promise<void> {
  const output = resolve(path);
  await guardOutput(output, options.protectedPaths ?? []);
  if (!options.overwrite && await existsStat(output)) throw new Error('Output already exists; use --force to replace a baseline.');
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, text, { flag: 'wx', mode: 0o600 });
    // Recheck after writing, before publishing the complete artifact.
    await guardOutput(output, options.protectedPaths ?? []);
    if (options.overwrite) await rename(temporary, output);
    else {
      // Atomic exclusive publication: hard-link fails if the destination appeared.
      await link(temporary, output);
    }
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
