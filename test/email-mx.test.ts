import { strict as assert } from 'node:assert';
import { describe, it, vi } from 'vitest';
import { emailMxRule } from '../src/rules/email-mx.js';
import type { RuleContext } from '../src/types.js';

// Mock dns.promises.resolveMx globally
vi.stubGlobal('dns', {
  promises: {
    resolveMx: vi.fn(),
  },
} as any);

function makeContext(doc: Record<string, unknown>): RuleContext {
  const source = `VERSION="2.7.0"\nNETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"\n[DOCUMENTATION]\nORG_NAME="Example"\nORG_URL="https://example.com"\nORG_DESCRIPTION="Example"\nORG_OFFICIAL_EMAIL="ops@example.com"\n`;
  const pathToLine: Record<string, number> = {};
  let lineNum = 1;
  for (const line of source.split('\n')) {
    const lower = line.toLowerCase();
    if (lower.startsWith('version="')) pathToLine['version'] = lineNum;
    if (lower.startsWith('network_passphrase="')) pathToLine['network_passphrase'] = lineNum;
    if (lower.startsWith('[documentation]')) pathToLine['documentation'] = lineNum;
    if (lower.startsWith('org_name="')) pathToLine['org_name'] = lineNum;
    if (lower.startsWith('org_url="')) pathToLine['org_url'] = lineNum;
    if (lower.startsWith('org_description="')) pathToLine['org_description'] = lineNum;
    if (lower.startsWith('org_official_email="')) pathToLine['org_official_email'] = lineNum;
    lineNum++;
  }

  return {
    doc,
    source,
    options: { rules: {}, strict: false },
    locate: (path: string): { line: number; column: number } | undefined => {
      const line = pathToLine[path];
      if (line === undefined) return undefined;
      const lineContent = source.split('\n')[line - 1];
      const column = lineContent.indexOf(path.split('.').pop() ?? '') + 1;
      return { line, column };
    },
    report: (_d: any) => {},
  } as RuleContext;
}

describe('email-mx', () => {
  it('passes when MX records resolve', async () => {
    ;(globalThis.dns as any).promises.resolveMx.mockResolvedValue(['alt1.aspmx.l.google.com', 'alt2.aspmx.l.google.com']);

    const doc = {
      VERSION: '2.7.0',
      NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
      DOCUMENTATION: {
        ORG_NAME: 'Example',
        ORG_URL: 'https://example.com',
        ORG_DESCRIPTION: 'Example',
        ORG_OFFICIAL_EMAIL: 'ops@example.com',
      },
    };

    const reported: any[] = [];
    const ctx = makeContext(doc) as RuleContext & { reported: typeof reported };
    ctx.reported = reported;
    ctx.report = (d: any) => {
      reported.push(d);
    };

    await emailMxRule.run(ctx);

    assert.equal(reported.length, 1);
    assert.equal(reported[0]!.rule, 'general/email-domain-no-mx');
    assert.equal(reported[0]!.severity, 'warning');
    assert(reported[0]!.message).includes('has MX records');
  });

  it('asserts general/email-domain-no-mx when DNS lookup fails with ENOENT', async () => {
    ;(globalThis.dns as any).promises.resolveMx.mockRejectedValue(new Error('ENOENT'));

    const doc = {
      VERSION: '2.7.0',
      NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
      DOCUMENTATION: {
        ORG_NAME: 'Example',
        ORG_URL: 'https://example.com',
        ORG_DESCRIPTION: 'Example',
        ORG_OFFICIAL_EMAIL: 'ops@example.com',
      },
    };

    const reported: any[] = [];
    const ctx = makeContext(doc) as RuleContext & { reported: typeof reported };
    ctx.reported = reported;
    ctx.report = (d: any) => {
      reported.push(d);
    };

    await emailMxRule.run(ctx);

    assert.equal(reported.length, 1);
    assert.equal(reported[0]!.rule, 'general/email-domain-no-mx');
    assert.equal(reported[0]!.severity, 'warning');
    assert(reported[0]!.message).includes('no MX records');
  });

  it('asserts general/email-domain-no-mx when DNS lookup fails with NETWORK', async () => {
    ;(globalThis.dns as any).promises.resolveMx.mockRejectedValue(new Error('NETWORK'));

    const doc = {
      VERSION: '2.7.0',
      NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
      DOCUMENTATION: {
        ORG_NAME: 'Example',
        ORG_URL: 'https://example.com',
        ORG_DESCRIPTION: 'Example',
        ORG_OFFICIAL_EMAIL: 'ops@example.com',
      },
    };

    const reported: any[] = [];
    const ctx = makeContext(doc) as RuleContext & { reported: typeof reported };
    ctx.reported = reported;
    ctx.report = (d: any) => {
      reported.push(d);
    };

    await emailMxRule.run(ctx);

    assert.equal(reported.length, 1);
    assert.equal(reported[0]!.rule, 'general/email-domain-no-mx');
    assert.equal(reported[0]!.severity, 'warning');
  });

  it('is silent when ORG_OFFICIAL_EMAIL is absent', () => {
    const doc = {
      VERSION: '2.7.0',
      NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
      DOCUMENTATION: {
        ORG_NAME: 'Example',
        ORG_URL: 'https://example.com',
        ORG_DESCRIPTION: 'Example',
      },
    };

    const ctx = makeContext(doc) as RuleContext & { reported: any[] };
    const reported: any[] = [];
    ctx.reported = reported;
    ctx.report = (d: any) => {
      reported.push(d);
    };

    emailMxRule.run(ctx);

    assert.equal(reported.length, 0);
  });

  it('is silent when ORG_OFFICIAL_EMAIL has no @ sign', async () => {
    ;(globalThis.dns as any).promises.resolveMx.mockResolvedValue([]);

    const doc = {
      VERSION: '2.7.0',
      NETWORK_PASSPHRASE: 'Public Global Stellar Network ; September 2015',
      DOCUMENTATION: {
        ORG_NAME: 'Example',
        ORG_URL: 'https://example.com',
        ORG_DESCRIPTION: 'Example',
        ORG_OFFICIAL_EMAIL: 'no-email',
      },
    };

    const ctx = makeContext(doc) as RuleContext & { reported: any[] };
    const reported: any[] = [];
    ctx.reported = reported;
    ctx.report = (d: any) => {
      reported.push(d);
    };

    await emailMxRule.run(ctx);

    assert.equal(reported.length, 0);
  });
});