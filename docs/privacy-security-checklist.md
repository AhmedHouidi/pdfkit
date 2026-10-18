# Privacy and security checklist

## Implemented in source

- [x] No account requirement or file-processing backend.
- [x] No application code intentionally transmits selected documents or passwords.
- [x] No analytics, advertising, external fonts, or remote third-party tags.
- [x] File signature check, 50 MiB cap, batch cap, page-count cap in PDF parsing tools, and bounded output filenames.
- [x] User-supplied password required to remove PDF encryption; explicit rights/authorization confirmation.
- [x] PDF.js rendering API used without its scripting-capable viewer. Restrictive CSP, frame denial, MIME sniffing protection, referrer policy and permissions policy configured.
- [x] Legal pages identify unresolved operator/provider details as placeholders.
- [x] No real secrets or publisher identity; no ads.txt supplied.

## Must verify before launch

- [ ] Inspect browser network requests on deployed production, including workers/WASM, and confirm no file or password payload leaves the device.
- [ ] Confirm hosting/CDN/logging processors, purposes, lawful basis as applicable, retention periods, subprocessors, international transfers, and deletion/inquiry contact.
- [ ] Complete jurisdiction-aware review for GDPR/ePrivacy and other applicable privacy/consumer laws; do not claim compliance from templates alone.
- [ ] If ads are enabled, review current Google Publisher Policies and use the appropriate Google-certified TCF CMP for applicable EEA, UK and Swiss traffic; test reject/withdraw flows before loading nonessential ads.
- [ ] Review file signature/type edge cases, malformed PDFs, page bombs, encrypted variants, memory exhaustion behavior, and browser crashes using a safe test corpus.
- [ ] Confirm no scripting, actions, attachments, or external links in PDFs are executed by PDFKit; test actual PDF.js configuration.
- [ ] Verify QPDF WASM version, upstream provenance, full license notices, SBOM, and current upstream security advisories.
- [ ] Verify Netlify headers, HTTPS, route fallback, custom 404 behavior, and canonical URLs on the actual domain.
- [ ] Conduct WCAG 2.2 AA manual review using keyboard-only and representative screen readers, mobile screen sizes, zoom/reflow and contrast checks.
- [ ] Complete dependency audit and update process at every release.

## Legal launch details

Required from the operator: legal identity, operating jurisdiction, domain, privacy/legal/contact/copyright/accessibility contacts, host/CDN/processors and retention, complaint workflow, relevant transfer safeguards, and any applicable representative or regulator details. Qualified counsel should review terms, privacy/cookie disclosures, complaint handling, consumer limitations, lawful bases, rights workflow, consent behavior, and age/children safeguards.
