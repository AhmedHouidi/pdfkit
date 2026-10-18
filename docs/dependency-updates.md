# Dependency updates

1. Review release notes and security advisories for React, Vite, PDF.js, pdf-lib, QPDF, and `@wasm-zoo/qpdf` before each release and at least monthly.
2. Update direct dependencies in a separate branch; preserve a reviewed lockfile with `npm ci` reproducibility.
3. Check license metadata and bundled notices, upstream source and provenance, transitive dependency changes, SBOM changes, and build output size.
4. Run `npm audit`, `npm test`, and `npm run build`. Manually test the actual browser operations, encrypted/malformed cases, CSP, worker and WASM execution, and deployed network behavior.
5. Do not use `npm audit fix --force` as an unreviewed release step. Assess breaking changes and regressions, then record the versions and results.
6. For a critical exploitable issue, disable the affected operation or roll back while preparing a reviewed patch; follow [incident response](incident-response.md).

Current direct libraries were reviewed from public package/repository information on 17 October 2026. pdf-lib is MIT licensed and supports PDF modification; PDF.js is Apache-2.0 and has a recent high-severity advisory for certain releases when scripting is enabled, so this project pins a later version and disables scripting/eval. QPDF is an upstream PDF tool but this browser distribution is an unofficial, recent wrapper: verify its provenance and licenses again before production use.
