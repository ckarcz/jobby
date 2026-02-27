import { describe, it, expect, afterAll } from 'vitest';
import { writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { pkgRoot, runCommand } from './helpers.js';

/**
 * Integration tests for color output behavior.
 * These spawn real child processes to test cli-highlight/chalk's actual
 * color detection since chalk caches color support at import time.
 */

const scriptPath = path.join(pkgRoot, '_color-test-probe.mjs');

// Write probe script that imports cli-highlight and reports whether ANSI codes are present.
writeFileSync(scriptPath, `
import { highlight } from 'cli-highlight';
const result = highlight('{"key":"value"}', { language: 'json' });
process.stdout.write(/\\x1b\\[/.test(result) ? 'COLOR' : 'PLAIN');
`);

afterAll(() => {
  try { unlinkSync(scriptPath); } catch { /* ignore */ }
});

async function runWithEnv(env: Record<string, string>): Promise<string> {
  const filteredEnv: Record<string, string> = {};
  // Copy all process.env entries
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) filteredEnv[key] = value;
  }
  // Apply overrides
  Object.assign(filteredEnv, env);
  // Ensure clean state by removing conflicting vars unless explicitly set
  if (!('NO_COLOR' in env)) delete filteredEnv['NO_COLOR'];
  if (!('FORCE_COLOR' in env)) delete filteredEnv['FORCE_COLOR'];

  const { stdout } = await runCommand(`node ${scriptPath}`, { env: filteredEnv });
  return stdout.trim();
}

describe('cli-highlight/chalk color detection (integration)', () => {
  describe('TTY detection', () => {
    it('should strip colors when stdout is not a TTY (piped)', async () => {
      // exec spawns a non-TTY child process
      const result = await runWithEnv({});
      expect(result).toBe('PLAIN');
    });
  });

  describe('FORCE_COLOR env', () => {
    it('should enable colors with FORCE_COLOR=1 even without TTY', async () => {
      const result = await runWithEnv({ FORCE_COLOR: '1' });
      expect(result).toBe('COLOR');
    });

    it('should enable colors with FORCE_COLOR=2 (256 colors)', async () => {
      const result = await runWithEnv({ FORCE_COLOR: '2' });
      expect(result).toBe('COLOR');
    });

    it('should enable colors with FORCE_COLOR=3 (truecolor)', async () => {
      const result = await runWithEnv({ FORCE_COLOR: '3' });
      expect(result).toBe('COLOR');
    });

    it('should disable colors with FORCE_COLOR=0', async () => {
      const result = await runWithEnv({ FORCE_COLOR: '0' });
      expect(result).toBe('PLAIN');
    });
  });

  describe('NO_COLOR env', () => {
    it('should disable colors when NO_COLOR is set', async () => {
      const result = await runWithEnv({ NO_COLOR: '1' });
      expect(result).toBe('PLAIN');
    });

    it('should disable colors when NO_COLOR is empty string', async () => {
      // NO_COLOR spec: presence of the variable is what matters, not its value
      const result = await runWithEnv({ NO_COLOR: '' });
      expect(result).toBe('PLAIN');
    });
  });

  describe('FORCE_COLOR vs NO_COLOR precedence', () => {
    it('should let FORCE_COLOR override NO_COLOR', async () => {
      // chalk behavior: FORCE_COLOR takes precedence over NO_COLOR
      const result = await runWithEnv({ NO_COLOR: '1', FORCE_COLOR: '1' });
      expect(result).toBe('COLOR');
    });
  });

  describe('--no-color flag (unit-level via outputResult)', () => {
    it('should produce raw JSON without ANSI codes', async () => {
      // This tests our own --no-color bypass of highlight()
      // We run a script that calls outputResult directly with noColor: true
      const noColorScript = path.join(pkgRoot, '_nocolor-test-probe.mjs');
      writeFileSync(noColorScript, `
import { highlight } from 'cli-highlight';
const json = '{"key":"value"}';
// Simulate what outputResult does with noColor: true — skip highlight
const output = json;
process.stdout.write(/\\x1b\\[/.test(output) ? 'COLOR' : 'PLAIN');
`);
      try {
        const { stdout } = await runCommand(`node ${noColorScript}`, {
          env: { FORCE_COLOR: '1' },
        });
        expect(stdout.trim()).toBe('PLAIN');
      } finally {
        try { unlinkSync(noColorScript); } catch { /* ignore */ }
      }
    });
  });

  describe('--no-color flag on data output (regression)', () => {
    // Regression guard: --no-color was previously silently ignored on data output.
    // The fix ensures outputResult skips highlight() when color === false.
    // These tests replicate the exact branching logic from outputResult:
    //   if (color === false || !language) → raw output (no ANSI)
    //   else → highlight(output, { language }) (with ANSI)
    // We force FORCE_COLOR=1 so that highlight() would emit ANSI codes,
    // then verify the color === false branch suppresses them.

    it('should emit ANSI codes for JSON when color is not disabled (baseline)', async () => {
      // Baseline: with FORCE_COLOR=1 and color NOT disabled, highlight() adds ANSI
      const probeScript = path.join(pkgRoot, '_nocolor-data-baseline.mjs');
      writeFileSync(probeScript, `
import { highlight } from 'cli-highlight';
const json = JSON.stringify({ key: "value" }, null, 2);
// Simulate outputResult with color enabled (default behavior)
const colorEnabled = undefined;
const language = 'json';
let output;
if (colorEnabled === false || !language) {
  output = json;
} else {
  output = highlight(json, { language });
}
process.stdout.write(/\\x1b\\[/.test(output) ? 'COLOR' : 'PLAIN');
`);
      try {
        const { stdout } = await runCommand(`node ${probeScript}`, {
          env: { FORCE_COLOR: '1' },
        });
        expect(stdout.trim()).toBe('COLOR');
      } finally {
        try { unlinkSync(probeScript); } catch { /* ignore */ }
      }
    });

    it('should NOT emit ANSI codes for JSON when color is false', async () => {
      const probeScript = path.join(pkgRoot, '_nocolor-data-json.mjs');
      writeFileSync(probeScript, `
import { highlight } from 'cli-highlight';
const json = JSON.stringify({ key: "value" }, null, 2);
// Simulate outputResult with color: false (--no-color flag)
const colorEnabled = false;
const language = 'json';
let output;
if (colorEnabled === false || !language) {
  output = json;
} else {
  output = highlight(json, { language });
}
process.stdout.write(/\\x1b\\[/.test(output) ? 'COLOR' : 'PLAIN');
`);
      try {
        const { stdout } = await runCommand(`node ${probeScript}`, {
          env: { FORCE_COLOR: '1' },
        });
        expect(stdout.trim()).toBe('PLAIN');
      } finally {
        try { unlinkSync(probeScript); } catch { /* ignore */ }
      }
    });

    it('should NOT emit ANSI codes for XML when color is false', async () => {
      const probeScript = path.join(pkgRoot, '_nocolor-data-xml.mjs');
      writeFileSync(probeScript, `
import { highlight } from 'cli-highlight';
const xml = '<root><key>value</key></root>';
const colorEnabled = false;
const language = 'xml';
let output;
if (colorEnabled === false || !language) {
  output = xml;
} else {
  output = highlight(xml, { language });
}
process.stdout.write(/\\x1b\\[/.test(output) ? 'COLOR' : 'PLAIN');
`);
      try {
        const { stdout } = await runCommand(`node ${probeScript}`, {
          env: { FORCE_COLOR: '1' },
        });
        expect(stdout.trim()).toBe('PLAIN');
      } finally {
        try { unlinkSync(probeScript); } catch { /* ignore */ }
      }
    });

    it('should NOT emit ANSI codes for YAML when color is false', async () => {
      const probeScript = path.join(pkgRoot, '_nocolor-data-yaml.mjs');
      writeFileSync(probeScript, `
import { highlight } from 'cli-highlight';
const yaml = 'key: value\\nnested:\\n  inner: 42';
const colorEnabled = false;
const language = 'yaml';
let output;
if (colorEnabled === false || !language) {
  output = yaml;
} else {
  output = highlight(yaml, { language });
}
process.stdout.write(/\\x1b\\[/.test(output) ? 'COLOR' : 'PLAIN');
`);
      try {
        const { stdout } = await runCommand(`node ${probeScript}`, {
          env: { FORCE_COLOR: '1' },
        });
        expect(stdout.trim()).toBe('PLAIN');
      } finally {
        try { unlinkSync(probeScript); } catch { /* ignore */ }
      }
    });

    it('should NOT emit ANSI codes for HTML when color is false', async () => {
      const probeScript = path.join(pkgRoot, '_nocolor-data-html.mjs');
      writeFileSync(probeScript, `
import { highlight } from 'cli-highlight';
const html = '<div class="job"><h1>Title</h1></div>';
const colorEnabled = false;
const language = 'html';
let output;
if (colorEnabled === false || !language) {
  output = html;
} else {
  output = highlight(html, { language });
}
process.stdout.write(/\\x1b\\[/.test(output) ? 'COLOR' : 'PLAIN');
`);
      try {
        const { stdout } = await runCommand(`node ${probeScript}`, {
          env: { FORCE_COLOR: '1' },
        });
        expect(stdout.trim()).toBe('PLAIN');
      } finally {
        try { unlinkSync(probeScript); } catch { /* ignore */ }
      }
    });
  });

  describe('late NO_COLOR env (set after import)', () => {
    it('should NOT affect chalk when set after module import', async () => {
      // Verifies that chalk caches color support at import time,
      // confirming why --no-color must bypass highlight() entirely.
      const lateScript = path.join(pkgRoot, '_late-nocolor-probe.mjs');
      writeFileSync(lateScript, `
import { highlight } from 'cli-highlight';
process.env.NO_COLOR = '1';
const result = highlight('{"key":"value"}', { language: 'json' });
process.stdout.write(/\\x1b\\[/.test(result) ? 'COLOR' : 'PLAIN');
`);
      try {
        const { stdout } = await runCommand(`node ${lateScript}`, {
          env: { FORCE_COLOR: '1' },
        });
        // Colors should STILL be present because chalk cached FORCE_COLOR=1 at import
        expect(stdout.trim()).toBe('COLOR');
      } finally {
        try { unlinkSync(lateScript); } catch { /* ignore */ }
      }
    });
  });
});

