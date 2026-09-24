import { describe, expect, it } from 'vitest';
import { lintDomain } from '../src/lint.js';

const GOOD_TOML = [
  'VERSION="2.7.0"',
  'NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"',
  '',
  '[DOCUMENTATION]',
  'ORG_NAME="Example"',
  'ORG_URL="https://example.com"',
  'ORG_DESCRIPTION="Example"',
  'ORG_LOGO="https://example.com/logo.png"',
  'ORG_OFFICIAL_EMAIL="ops@example.com"',
].join('\n');

interface StubOptions {
  headers?: Record<string, string>;
  status?: number;
  body?: string;
}

/**
 * A fetch stub that records the request, so tests can assert on what the linter
 * sent as well as what it did with the response. Pass a single set of options
 * to answer every URL the same way, or a pathname→options map to answer the
 * well-known and root paths differently.
 */
function stubFetch(options: StubOptions | Record<string, StubOptions> = {}) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const routes = isRouteMap(options) ? options : undefined;
  const fallback: StubOptions = isRouteMap(options) ? { status: 404 } : options;

  const impl = (async (url: string | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
    });
    const pathname = new URL(String(url)).pathname;
    const matched = routes?.[pathname] ?? fallback;
    return new Response(matched.body ?? GOOD_TOML, {
      status: matched.status ?? 200,
      headers: {
        'content-type': 'text/plain',
        ...(matched.headers ?? { 'access-control-allow-origin': '*' }),
      },
    });
  }) as unknown as typeof fetch;

  return { impl, calls };
}

function isRouteMap(
  options: StubOptions | Record<string, StubOptions>,
): options is Record<string, StubOptions> {
  return (
    options.status === undefined &&
    options.body === undefined &&
    options.headers === undefined &&
    Object.keys(options).length > 0
  );
}

const ruleIds = (result: { diagnostics: { rule: string }[] }): string[] =>
  result.diagnostics.map((d) => d.rule);

describe('lintDomain', () => {
  it('requests the well-known path over https', async () => {
    const { impl, calls } = stubFetch();
    await lintDomain('example.com', {}, impl);
    expect(calls[0]?.url).toBe('https://example.com/.well-known/stellar.toml');
  });

  it('normalises a domain given with a scheme or path', async () => {
    const { impl, calls } = stubFetch();
    await lintDomain('https://example.com/some/path', {}, impl);
    expect(calls[0]?.url).toBe('https://example.com/.well-known/stellar.toml');
  });

  it('sends an Origin header so CORS is evaluated as a browser would', async () => {
    // Regression: many hosts only emit Access-Control-Allow-Origin when the
    // request carries Origin. Probing without it reported a CORS failure
    // against correctly-configured anchors.
    const { impl, calls } = stubFetch();
    await lintDomain('example.com', {}, impl);
    expect(calls[0]?.headers.Origin).toBeTruthy();
  });

  it('accepts a wildcard CORS header', async () => {
    const { impl } = stubFetch({ headers: { 'access-control-allow-origin': '*' } });
    const result = await lintDomain('example.com', {}, impl);
    expect(ruleIds(result)).not.toContain('network/cors');
  });

  it('rejects a missing CORS header', async () => {
    const { impl } = stubFetch({ headers: {} });
    const result = await lintDomain('example.com', {}, impl);
    expect(ruleIds(result)).toContain('network/cors');
  });

  it('rejects a non-wildcard CORS header', async () => {
    const { impl } = stubFetch({
      headers: { 'access-control-allow-origin': 'https://example.com' },
    });
    const result = await lintDomain('example.com', {}, impl);
    const cors = result.diagnostics.find((d) => d.rule === 'network/cors');
    expect(cors?.message).toContain('requires');
  });

  it('warns when the content type is not text/plain', async () => {
    const { impl } = stubFetch({
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/octet-stream' },
    });
    const result = await lintDomain('example.com', {}, impl);
    expect(ruleIds(result)).toContain('network/content-type');
  });

  it('reports an HTTP error and stops', async () => {
    const { impl } = stubFetch({ status: 404 });
    const result = await lintDomain('example.com', {}, impl);
    expect(ruleIds(result)).toEqual(['network/unreachable']);
    expect(result.ok).toBe(false);
  });

  it('points at the root when only /.well-known/stellar.toml is missing', async () => {
    const { impl, calls } = stubFetch({
      '/.well-known/stellar.toml': { status: 404 },
      '/stellar.toml': { status: 200 },
    });
    const result = await lintDomain('example.com', {}, impl);

    expect(ruleIds(result)).toContain('network/wrong-path');
    expect(result.diagnostics.find((d) => d.rule === 'network/wrong-path')?.message).toContain(
      'https://example.com/stellar.toml',
    );
    expect(result.ok).toBe(false);

    // Exactly one extra request, and only for the root path.
    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toBe('https://example.com/stellar.toml');
  });

  it('keeps network/unreachable alone when the root probe also fails', async () => {
    const { impl, calls } = stubFetch({
      '/.well-known/stellar.toml': { status: 404 },
      '/stellar.toml': { status: 404 },
    });
    const result = await lintDomain('example.com', {}, impl);

    expect(ruleIds(result)).toEqual(['network/unreachable']);
    expect(calls).toHaveLength(2);
  });

  it('does not probe the root for a non-404 failure', async () => {
    const { impl, calls } = stubFetch({ status: 500 });
    const result = await lintDomain('example.com', {}, impl);

    expect(ruleIds(result)).toEqual(['network/unreachable']);
    expect(calls).toHaveLength(1);
  });

  it('survives a transport failure on the root probe', async () => {
    const calls: string[] = [];
    const impl = (async (url: string | URL) => {
      calls.push(String(url));
      if (String(url).endsWith('/stellar.toml') && !String(url).includes('.well-known')) {
        throw new Error('socket hang up');
      }
      return new Response('nope', { status: 404 });
    }) as unknown as typeof fetch;

    const result = await lintDomain('example.com', {}, impl);
    expect(ruleIds(result)).toEqual(['network/unreachable']);
    expect(calls).toHaveLength(2);
  });

  it('reports a transport failure without throwing', async () => {
    const failing = (async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    }) as unknown as typeof fetch;

    const result = await lintDomain('nope.invalid', {}, failing);
    expect(ruleIds(result)).toEqual(['network/unreachable']);
    expect(result.diagnostics[0]?.message).toContain('ENOTFOUND');
  });

  it('infers the domain so ORG_URL is checked against the serving host', async () => {
    const { impl } = stubFetch();
    const result = await lintDomain('different-domain.org', {}, impl);
    expect(ruleIds(result)).toContain('documentation/org-url-matches-domain');
  });

  it('still lints the file contents it fetched', async () => {
    const { impl } = stubFetch({ body: 'VERSION="two"\n' });
    const result = await lintDomain('example.com', {}, impl);
    expect(ruleIds(result)).toContain('general/version');
  });
});
