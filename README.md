# PDFKit

PDFKit is a local-first React and TypeScript PDF toolkit. The static app processes selected documents in the browser; it has no file upload endpoint, account system, analytics, advertising tags, or external runtime font calls in this build.

## Features

- Merge, split, extract, delete, reorder, rotate, and number PDF pages
- Rewrite PDFs using object streams (structural compression; no size reduction guarantee)
- Convert JPG/PNG images to PDF and render PDF pages as PNG
- Password-protect PDFs with QPDF WebAssembly; remove encryption only with a supplied password and an authorization confirmation
- Privacy, terms, cookies, processing, about, contact, accessibility, copyright complaint templates, and original PDF guides

Limits: 50 MiB per file, up to 20 inputs per batch, and 300 pages for PDF operations that inspect page count. The browser may run out of memory before a limit on some devices. Output conversions can lose features such as selectable text. Browser processing is not malware scanning and does not guarantee every malicious document is harmless.

## Development

Requires a current Node.js LTS release and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm audit
```

The Vite development server binds to loopback by default. The production output is `dist/`.

## Deployment

See [docs/deployment.md](docs/deployment.md). The Netlify configuration includes an SPA fallback and security headers. Replace `YOUR-DOMAIN.example` in canonical metadata, sitemap, and robots before launch. Check the actual deployed header policy with PDF.js workers and QPDF WASM.

## Legal and operational readiness

The legal pages are templates, not final legal advice. They contain clearly marked operator placeholders. Supply the real operator name, jurisdiction, contact details, host/CDN data and retention, rights request route, applicable privacy analysis, and lawyer review before launch. Ads and `ads.txt` are deliberately not enabled; do not configure either until real publisher credentials, approval, policy review, and applicable certified consent tooling exist.

See [docs/architecture-risk-checklist.md](docs/architecture-risk-checklist.md), [docs/privacy-security-checklist.md](docs/privacy-security-checklist.md), [docs/incident-response.md](docs/incident-response.md), [docs/dependency-updates.md](docs/dependency-updates.md), and [docs/verification-report.md](docs/verification-report.md).
