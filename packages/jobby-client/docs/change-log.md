# Change Log

A timestamped record of significant changes to the `jobby-client` package.

| Date | Change | Details |
|---|---|---|
| 2026-02-13 | Initial release | Core client library with job search and job details queries, fluent builder API, Zod-validated JSON-LD extraction, DOM scraping, error hierarchy, user-agent rotation. |
| 2026-02-13 | Add missing extractable fields | Added `company.slug`, `isNew`, `easyApply`, `highlight` to search results. Added `applyUrl`, `applyText`, `shortDescription`, `sharingImageUrl` to job details. Added `identifier` and `hiringOrganization.logo` to JSON-LD schema. Fixed `agoTime` selector bug for `--new` listings. Cleaned up empty-string defaults to `undefined`. |
| 2026-02-13 | Add benefits and incentive fields | Added `benefitsInfo` and `incentiveInfo` to job details for extracting benefits/perks and bonus/incentive information from LinkedIn job listing pages. |
