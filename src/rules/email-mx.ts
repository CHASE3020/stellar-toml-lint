import type { Rule } from '../types.js';
import { dnsPromises } from 'node:dns';

export const emailMxRule: Rule = {
  id: 'general/email-domain-no-mx',
  category: 'general',
  severity: 'warning',
  description: 'ORG_OFFICIAL_EMAIL domain must have MX records for email deliverability',
  run(ctx) {
    const documentation = ctx.doc.DOCUMENTATION;
    if (!documentation) return Promise.resolve();

    const officialEmail = (documentation as Record<string, unknown>).ORG_OFFICIAL_EMAIL;
    if (typeof officialEmail !== 'string') return Promise.resolve();

    const domain = officialEmail.split('@')[1];
    if (!domain) return Promise.resolve();

    return (async () => {
      try {
        const mxRecords = await dnsPromises.resolveMx(domain);
        if (mxRecords.length > 0) {
          ctx.report({
            rule: 'general/email-domain-no-mx',
            severity: 'warning',
            category: 'general',
            message: `Domain ${domain} has MX records; email deliverability should be verified`,
            path: 'DOCUMENTATION.ORG_OFFICIAL_EMAIL',
            position: ctx.locate('DOCUMENTATION.ORG_OFFICIAL_EMAIL'),
            helpUri: 'https://developers.stellar.org/docs/sep-0001/#org-official-email',
            suggestion: 'Ensure your domain is configured to receive email at the address listed as ORG_OFFICIAL_EMAIL.',
          });
        } else {
          ctx.report({
            rule: 'general/email-domain-no-mx',
            severity: 'warning',
            category: 'general',
            message: `Domain ${domain} has no MX records; email sent to ORG_OFFICIAL_EMAIL may bounce`,
            path: 'DOCUMENTATION.ORG_OFFICIAL_EMAIL',
            position: ctx.locate('DOCUMENTATION.ORG_OFFICIAL_EMAIL'),
            helpUri: 'https://developers.stellar.org/docs/sep-0001/#org-official-email',
            suggestion: 'Add MX records for your domain to ensure email deliverability.',
          });
        }
      } catch {
        ctx.report({
          rule: 'general/email-domain-no-mx',
          severity: 'warning',
          category: 'general',
          message: `Could not resolve MX records for domain ${domain}`,
          path: 'DOCUMENTATION.ORG_OFFICIAL_EMAIL',
          position: ctx.locate('DOCUMENTATION.ORG_OFFICIAL_EMAIL'),
          helpUri: 'https://developers.stellar.org/docs/sep-0001/#org-official-email',
          suggestion: 'Verify that your domain has valid MX records configured.',
        });
      }
    })();
  },
};