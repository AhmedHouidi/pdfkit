# Deployment guide

## Before deploying

1. Replace `YOUR-DOMAIN.example` in `index.html`, `public/robots.txt`, and `public/sitemap.xml` with the real HTTPS origin.
2. Complete the legal templates with genuine operator, jurisdiction, privacy and complaint contacts. Have counsel review them.
3. Confirm the Netlify site is configured for HTTPS and custom-domain redirects. No secrets or environment variables are required by this static application.
4. Keep ads disabled. If later enabled, configure real AdSense account details, an applicable Google-certified TCF CMP, and the correct ads.txt publisher ID only after approval.
5. Run `npm ci`, `npm test`, `npm run build`, and `npm audit`.

## Netlify

Import the repository, choose the root folder containing this README, build command `npm run build`, and publish directory `dist`. `netlify.toml` configures the SPA fallback, response security headers, and build. Verify the deployed site with browser devtools and `curl -I` for every route. Test that PDF.js worker files and the QPDF WASM module load under CSP, that navigation deep links work, and that the canonical/sitemap origins are correct.

The checked-in CSP permits WebAssembly compilation (`wasm-unsafe-eval`) and workers from self/blob for PDF.js/QPDF. It must not be loosened without reviewing the exact need. Consider adding HSTS at the host after HTTPS and subdomain readiness have been confirmed. Netlify logs and retention are governed by real account settings; disclose them in the privacy policy.

## Rollback and recovery

This is a static site and stores no user documents or passwords, so no user-file backup system is needed. Keep source in version control and use Netlify deploy history to roll back a bad release. Preserve the exact lockfile and build artifact for incident review. Back up only operational configuration/source that is needed; never collect PDFs for backup.

## Launch checklist

- Real domain, HTTPS, canonical, robots and sitemap verified.
- Contact and privacy process monitored by the named operator.
- Policies reviewed and accurate for real providers, jurisdictions, rights, and retention.
- Mobile, keyboard, screen reader, zoom, contrast and screen-size checks completed.
- Malformed, encrypted, large, edge-case inputs and output integrity verified.
- Production headers and network behavior reviewed; no file/password requests observed.
- Ad scripts and `ads.txt` remain absent until approved and configured.
