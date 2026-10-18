# PDFKit architecture and risk checklist

## Architecture

- Static React + TypeScript + Vite application deployed to Netlify; no API or file-processing server.
- `pdf-lib` handles manipulation and document creation. `pdfjs-dist` renders PDF pages to PNG with scripting disabled. QPDF 12.4.2 via `@wasm-zoo/qpdf` performs password encryption and decryption in a WebAssembly worker.
- Files and passwords remain in page memory for processing. Output download URLs are revoked after download begins. No account, telemetry, ads, analytics, external fonts, or third-party runtime calls are configured.
- Per-file cap: 50 MiB. Page cap: 300 for operations inspecting PDF pages. Batch cap: 20. QPDF's package reports a 512 MiB WebAssembly maximum; actual usable memory depends on the device/browser and temporary copies.
- Netlify headers set a restrictive CSP, disable frames and plugins, disallow camera/microphone/location, and enable MIME sniffing protection. Review headers against actual hosting behavior before launch.

## Main risks and controls

| Risk | Control in this build | Remaining work |
|---|---|---|
| Malicious PDF exploiting parser/browser | PDF.js rendering API only; scripting-capable viewer is not included; browser-local processing; CSP; pinned current PDF.js | Local processing does not make a malicious PDF safe. Keep dependencies current and test malformed corpus. |
| Large files exhausting memory | 50 MiB file cap, 300-page cap where parsed, 20-file batch cap, single-thread QPDF WASM maximum | Limits are not a hard memory budget across all libraries/devices; profile on low-memory mobile hardware. |
| Unauthorized password removal | Requires password and affirmative authorization attestation; QPDF must authenticate encrypted inputs | Validate QPDF exit behavior for wrong passwords and owner/user passwords across representative encryption variants. |
| Password or file sent to a server | No app backend, analytics, ad tags, or remote fonts; scripts use self-hosted bundled assets | Verify deployed network requests and hosting/CDN logs. |
| Weak/untrue compression | Label describes structural rewrite only; guide explains no size guarantee | Test output size and fidelity on representative scan-heavy and vector documents. |
| Privacy/legal misstatement | Draft pages include clear placeholders; no fabricated operator details | Supply operator identity, contact, jurisdictions, provider/retention terms, rights process, and legal review. |
| Advertising/consent | Ads and ads.txt are absent and disabled | Add only after account approval, real publisher ID, policy review, and applicable Google-certified TCF CMP. |
| Hosting/CSP misconfiguration | Netlify header policy and SPA fallback provided | Verify deployed HTTPS, CSP worker/WASM operation, redirects, headers, routing, and canonical origin. |
| Dependency vulnerabilities/supply chain | Lockfile, pinned direct versions, npm audit task | Re-run `npm audit` at release; review upstream package provenance, license inventory, and advisories. QPDF browser distribution is unofficial. |
| Accessibility gaps | Semantic buttons/labels, keyboard controls, live states, responsive CSS, reduced-motion support | Manual WCAG 2.2 AA review, screen reader, zoom/reflow, contrast and touch testing remain. |

## Release gate

Do not announce production readiness until identity/contact placeholders are resolved, legal review is complete, a real domain is configured, the privacy/network audit and consent decisions are documented, automated and manual operation/security/accessibility tests pass, and the deployed Netlify site is verified over HTTPS.
