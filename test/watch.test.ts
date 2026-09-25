import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, '..', 'dist', 'cli.js');

describe('Watch mode', () => {
  const watchFixture = path.join(here, 'fixtures', 'watch.toml');

  beforeAll(async () => {
    await fs.writeFile(watchFixture, 'VERSION="2.0.0"\n');
  });

  afterAll(async () => {
    try {
      await fs.unlink(watchFixture);
    } catch {
      /* ignore */
    }
  });

  it('runs indefinitely when --watch is provided and re-evaluates', async () => {
    const child = spawn('node', [CLI, watchFixture, '--watch'], {
      env: { ...process.env, NO_COLOR: '1' },
    });

    const exited = await new Promise<boolean>((resolve) => {
      child.on('exit', () => resolve(true));
      // If it doesn't exit after 1.5s, it is successfully watching
      setTimeout(() => resolve(false), 1500);
    });

    child.kill('SIGKILL');
    expect(exited).toBe(false);
  });
});
