# Incident response

## Scope

The static app has no PDF upload service, account store, or file database. Incidents can still involve a vulnerable dependency, unexpected document network request, compromised hosting/build pipeline, exposed provider credentials, or loss of service.

## Response steps

1. **Triage:** Record the report, affected version and time, reproduce in a safe environment, and preserve relevant build/deployment metadata. Do not request the user's PDF or password.
2. **Contain:** If a release is affected, roll back to the last known-good static deploy or disable the affected tool/route. Rotate any genuinely exposed deployment credentials through the provider.
3. **Assess:** Review dependency advisories, build logs, Netlify deployment history, configured host/CDN logs and retention. Do not assume no personal data was involved; verify actual telemetry and request behavior.
4. **Notify:** The named operator and counsel determine regulator/user/vendor notifications required by the applicable jurisdictions and deadlines. Record the rationale and dates.
5. **Recover:** Patch dependencies/code, run the build/tests/security review, confirm headers and network behavior, then deploy a reviewed release.
6. **Learn:** Record cause, scope, decisions, remediation, and changes to the privacy/security checklist. Avoid collecting documents as evidence; use synthetic or redacted samples.

## Contacts to configure

- Incident lead: [NAME / CONTACT]
- Hosting account owner: [NAME / CONTACT]
- Privacy/legal contact: [CONTACT]
- Security reporting contact: [SECURITY EMAIL]

