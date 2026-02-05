# LinkedIn Job Search: UI Filter Query Parameters vs. Guest API Compatibility

## Testing Overview

### Testing Context

This LinkedIn jobs API analysis was last performed by **Claude** on `2026-02-13T21:45:00Z`. 

Every time the analysis outlined in this document is ran again:
- This timestamp information above must be updated every time the analysis is performed.
- This document must be updated with all Linked job search UI filters and their corresponding guest job search API parameter names, values, and working status and relevent notes and details. Also include any updates or changes to the API response data.

### What Was Tested

LinkedIn's job search UI (at `linkedin.com/jobs/search`) provides a rich set of filters—date posted, experience level, job type, remote/on-site, salary, and more. When a user applies these filters in the browser, LinkedIn encodes them as URL query parameters (e.g. `f_TPR=r86400` for "Past 24 hours").

Separately, LinkedIn exposes a **guest jobs API** at:

```
https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search
```

This API is **not** the same endpoint that powers the authenticated job search UI. It is a public-facing, unauthenticated endpoint that returns job listing HTML fragments. It accepts the same query parameter names used in the UI's URL scheme, but that does not guarantee it processes all of them.

### Why It Was Tested

The goal was to determine **which UI filter query parameters are actually recognized and functional** when passed to the guest API. Just because a parameter exists in the UI's URL scheme does not mean the guest API will honor it—many filters may only be processed server-side for authenticated users, or may be handled by a different backend service entirely. Understanding which filters actually work in the guest API is valuable for anyone building tools or integrations on top of publicly available LinkedIn job data.

### Testing Methodology

#### Initial Analysis

Each filter available in the LinkedIn job search "All filters" modal was identified along with its query parameter name and all possible values. These were documented by observing the URL changes when toggling each filter in the LinkedIn UI.

#### Verification Test (Automated Comparison)

A systematic automated verification test was performed to confirm or correct the initial findings. The procedure was:

1. **Establish baselines**: Fetch results from the guest API with no filter parameters applied, for three separate pages (`start=0`, `start=25`, `start=50`), using the query `keywords=software+engineer&location=United+States`. Record all job titles and companies returned on each page.

2. **Test each parameter independently**: For every filter parameter and every possible value, fetch the same three pages with that single parameter appended. Compare the returned job listings (title + company pairs) to the corresponding baseline page.

3. **Comparison criteria**:
   - **"Identical"** means every job title + company pair on the filtered page exactly matches the baseline page (same set, same count).
   - **"Overlap"** counts how many individual listings appear in both the filtered and baseline result sets.
   - A filter is considered **working** if it produces non-identical results (different listings) compared to the baseline.
   - A filter is considered **not working** if results are identical to the baseline across all tested pages.

4. **Multi-page verification**: For any parameter that appeared to have no effect on page 0, the test was extended to pages 1 and 2 (`start=25`, `start=50`) to rule out coincidental overlap. A parameter was only marked as "not working" if it produced identical results on **all three pages**.

5. **Enumerated value testing**: For parameters with a defined set of values (e.g. experience level 1–6, job type F/P/C/T/V/I/O, salary 1–9), **every value** was tested independently.

6. **Company filter validation**: For the company filter (`f_C`), the test additionally verified that every returned listing's company name matched the expected company (e.g. `f_C=1441` returned only "Google" listings).

**Important Note on Authentication**: All tests were performed using the unauthenticated guest API. Parameters that appear to require an authenticated session (such as "Easy Apply," "Under 10 Applicants," and "In Your Network") showed no effect in the guest API, but this does not conclusively prove they are non-functional—they may work as intended when called with authenticated session cookies. Testing with authentication was outside the scope of this analysis.

#### Authenticated Cookie Testing (`li_at`)

A follow-up test was performed to determine whether passing LinkedIn's authentication cookie (`li_at`) to the guest API changes any behavior. The `li_at` cookie is an HttpOnly session token that LinkedIn sets when a user logs in — it is not accessible via `document.cookie` in JavaScript, but it is sent automatically with same-origin requests when using `credentials: 'include'`.

**Test procedure:**

1. From a browser session logged into LinkedIn (`linkedin.com/feed/`), use `fetch()` with two credential modes:
   - `credentials: 'include'` — sends all cookies, including the HttpOnly `li_at` authentication cookie
   - `credentials: 'omit'` — sends no cookies at all

2. **Validated the methodology** by calling LinkedIn's authenticated Voyager API (`/voyager/api/me`):
   - With `credentials: 'include'` → HTTP **200** (authenticated, confirming `li_at` cookie is sent)
   - With `credentials: 'omit'` → HTTP **403** (rejected, confirming no auth cookies sent)

3. **Tested every filter** on the guest API with both credential modes, across pages 0, 25, and 50:
   - Compared job IDs from authenticated requests vs. unauthenticated requests
   - Compared both against the no-filter baseline

4. **Checked HTML response differences**: Compared the full HTML response body of authenticated vs. unauthenticated requests byte-by-byte to detect any structural changes.

**Overall finding: The guest API is completely auth-unaware.** Every request — with or without the `li_at` cookie — returns identical job IDs, identical HTML structure, and identical filter behavior. The only difference is in per-request tracking tokens (`data-reference-id` and `data-tracking-id`), which are randomized on every request regardless of authentication state. The guest API does not read, validate, or act on any authentication cookies.

---

## Query Parameters

### Query Parameter Summary

| Parameter | Query | Status | Test Detail |
|---|---|---|---|
| Date Posted | `f_TPR` | ✅ Confirmed | 3 values × 3 pages; `r86400` and `r604800` produce 0% overlap with baseline; `r2592000` is identical to baseline (see note below) |
| Experience Level | `f_E` | ✅ Confirmed | 6 values + multi-select × 3 pages each, 0% overlap with baseline |
| Job Type | `f_JT` | ✅ Confirmed | 7 values × 3 pages each; Full-time shows high overlap on page 0 (expected), all others 0% |
| Workplace Type | `f_WT` | ✅ Confirmed | 3 values × 3 pages each |
| Salary | `f_SB2` | ✅ Confirmed | 9 values × 3 pages, near-0% overlap with baseline |
| Company | `f_C` | ✅ Confirmed | 3 company IDs tested, 100% of results matched expected company (30/30 each) |
| Search Terms | `keywords` | ✅ Confirmed | 3 different keywords, 0% cross-overlap |
| Location (text) | `location` | ✅ Confirmed | 3 cities, geographically correct results |
| Location (ID) | `geoId` | ✅ Confirmed | 3 country IDs, geographically correct results |
| Pagination | `start` | ✅ Confirmed | 3 pages, distinct results per page (0 overlap between pages) |
| Sort By | `sortBy` | ❌ Does not work | 2 values × 3 pages, all identical to baseline and to each other — Guest API has fixed sort order. Also tested with `li_at` cookie: no change. Cross-comparison confirms `sortBy=DD` and `sortBy=R` return identical job IDs. |
| Industry | `f_I` | ❌ Does not work | 4 industry IDs × 3 pages, all identical to baseline — Not supported by guest API. Also tested with `li_at` cookie: no change. Cross-comparison confirms `f_I=96` (IT), `f_I=14` (Entertainment), `f_I=43` (Financial) all return identical job IDs. |
| Job Function | `f_F` | ❌ Does not work | 5 function codes × 3 pages, all identical to baseline — Not supported by guest API. Also tested with `li_at` cookie: no change. Cross-comparison confirms `f_F=it`, `f_F=sale`, `f_F=dsgn` all return identical job IDs. |
| Easy Apply | `f_AL` | ❌ Does not work | 3 pages, all identical to baseline — Also tested with `li_at` cookie: no change. |
| Under 10 Applicants | `f_EA` | ❌ Does not work | 3 pages, all identical to baseline — Also tested with `li_at` cookie: no change. |
| Fair Chance Employer | `f_FCE` | ❌ Does not work | 3 pages, all identical to baseline — Also tested with `li_at` cookie: no change. |
| In Your Network | `f_JIYN` | ❌ Does not work | 3 pages, all identical to baseline — Also tested with `li_at` cookie: no change. |
| Has Verifications | `f_LF` | ❌ Does not work | 2 value formats × 3 pages, all identical to baseline — Not supported by guest API. Also tested with `li_at` cookie: no change. |
| Search Radius | `distance` | ❌ Does not work | 4 radius values (5, 25, 50, 100 mi), all identical to each other (cross-comparison: 10/10 overlap between all pairs) — Not supported by guest API. Also tested with `li_at` cookie: no change. |

**Note on `f_TPR=r2592000` (Past month)**: This value produces results identical to the unfiltered baseline. This does not mean the filter is broken — it means the guest API's default result set naturally falls within the 30-day window, making the "past month" filter a no-op. The filter is confirmed functional via `r604800` (past week) and `r86400` (past 24 hours), which produce distinctly different results.

**Note on Authentication**: The guest API (`jobs-guest`) is **completely auth-unaware**. All non-working parameters above were re-tested with the `li_at` authentication cookie included in the request. The Voyager API (`/voyager/api/me`) confirmed the cookie was valid (HTTP 200 with cookie, HTTP 403 without), but the guest API returned identical results in every case. These filters only function on LinkedIn's authenticated `/jobs/search/` UI endpoint, which uses a different backend.

**Note on Drift Correction**: When running automated tests sequentially, the guest API's results can drift slightly over time (1–3 job IDs changing per ~10 minutes). To account for this, non-working filter determinations were validated using **cross-comparison**: all suspicious parameters were fetched in rapid succession and compared against each other and a fresh baseline. All non-working filters produced 10/10 identical job IDs to the fresh baseline and to each other, confirming they are truly ignored by the API.

---

### Filter Query Parameters

#### 1. Sort By

| Detail | Value |
|---|---|
| **UI Label** | Sort by |
| **Query Parameter** | `sortBy` |
| **Location in UI** | Top of search results (dropdown) |

#### Possible Values

| Value | UI Meaning |
|---|---|
| `DD` | Most recent (Date Descending) |
| `R` | Most relevant (Relevance) |

#### API Verification Results

| Test | Pages Checked | Result |
|---|---|---|
| `sortBy=DD` vs. baseline | 0, 25, 50 | Identical to baseline (10/10 overlap with fresh baseline) |
| `sortBy=R` vs. baseline | 0, 25, 50 | Identical to baseline (10/10 overlap with fresh baseline) |
| `sortBy=DD` vs. `sortBy=R` | 0 | Identical to each other (10/10 overlap) |

**Verdict: ❌ Does not work in the guest API.** The API returns results in the same order regardless of this parameter. Both `DD` and `R` produce output indistinguishable from the no-parameter baseline and from each other. Cross-comparison confirms `sortBy=DD` and `sortBy=R` return identical job IDs. Re-tested with `li_at` authentication cookie — no change.

---

#### 2. Date Posted

| Detail | Value |
|---|---|
| **UI Label** | Date posted |
| **Query Parameter** | `f_TPR` |
| **Location in UI** | All Filters modal |

#### Possible Values

| Value | UI Meaning |
|---|---|
| *(omitted)* | Any time |
| `r2592000` | Past month (30 days = 2,592,000 seconds) |
| `r604800` | Past week (7 days = 604,800 seconds) |
| `r86400` | Past 24 hours (1 day = 86,400 seconds) |

Values are prefixed with `r` followed by a duration in seconds.

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap with Baseline |
|---|---|---|---|
| `f_TPR=r86400` | 0, 25, 50 | No | 0–1 on all pages |
| `f_TPR=r604800` | 0, 25, 50 | No | 3–4 on page 0, 0 on deeper pages |
| `f_TPR=r2592000` | 0, 25, 50, 75, 100 | **Yes** | 10/10 on all pages |

**Verdict: ✅ Confirmed working** (for `r86400` and `r604800`). Past 24 hours and past week produce distinctly different result sets. Past month (`r2592000`) now produces results identical to the unfiltered baseline — the guest API's default results naturally fall within a ~2-week window, making the 30-day filter a no-op. The filter mechanism itself is functional (proven by the tighter ranges), but `r2592000` has no observable effect given the current default result set.

---

#### 3. Experience Level

| Detail | Value |
|---|---|
| **UI Label** | Experience level |
| **Query Parameter** | `f_E` |
| **Location in UI** | All Filters modal |

#### Possible Values

| Value | UI Meaning |
|---|---|
| `1` | Internship |
| `2` | Entry level |
| `3` | Associate |
| `4` | Mid-Senior level |
| `5` | Director |
| `6` | Executive |

Multiple values can be combined with commas (e.g. `f_E=3,4,5` for Associate through Director).

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap (page 0) |
|---|---|---|---|
| `f_E=1` (Internship) | 0, 25, 50 | No | 0 |
| `f_E=2` (Entry level) | 0, 25, 50 | No | 7 |
| `f_E=3` (Associate) | 0, 25, 50 | No | 0 |
| `f_E=4` (Mid-Senior) | 0, 25, 50 | No | 0 |
| `f_E=5` (Director) | 0, 25, 50 | No | 0 |
| `f_E=6` (Executive) | 0, 25, 50 | No | 0 |
| `f_E=3,4,5` (multi) | 0, 25, 50 | No | 0 |

**Verdict: ✅ Confirmed working.** All six individual values and the multi-select combination produce non-identical results across all three pages. Entry level (2) shows overlap with the baseline (expected since many "software engineer" postings target entry level), but the result set is still distinctly different. Multi-value selection also works.

---

#### 4. Job Type

| Detail | Value |
|---|---|
| **UI Label** | Job type |
| **Query Parameter** | `f_JT` |
| **Location in UI** | All Filters modal |

#### Possible Values

| Value | UI Meaning |
|---|---|
| `F` | Full-time |
| `P` | Part-time |
| `C` | Contract |
| `T` | Temporary |
| `V` | Volunteer |
| `I` | Internship |
| `O` | Other |

Multiple values can be combined with commas (e.g. `f_JT=F,C`).

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap (page 0) |
|---|---|---|---|
| `f_JT=F` (Full-time) | 0, 25, 50 | No (page 0 identical) | 10 (page 0), 2 (page 25), 0 (page 50) |
| `f_JT=P` (Part-time) | 0, 25, 50 | No | 0 |
| `f_JT=C` (Contract) | 0, 25, 50 | No | 0 |
| `f_JT=T` (Temporary) | 0, 25, 50 | No | 0 |
| `f_JT=V` (Volunteer) | 0, 25, 50 | No | 0 (page 25: 1 result, page 50: 0 results) |
| `f_JT=I` (Internship) | 0, 25, 50 | No | 0 |
| `f_JT=O` (Other) | 0, 25, 50 | No | 0 |

**Verdict: ✅ Confirmed working.** All seven values produce non-identical results across three pages. Full-time shows very high overlap on page 0 (10/10, expected since the majority of "software engineer" jobs are full-time), decreasing on deeper pages. Part-time, Contract, and Temporary have zero overlap — clearly different populations. Volunteer returns very few results (1 on page 25, 0 on page 50), reflecting the small number of volunteer software engineering roles.

---

#### 5. Workplace Type

| Detail | Value |
|---|---|
| **UI Label** | Remote |
| **Query Parameter** | `f_WT` |
| **Location in UI** | All Filters modal |

#### Possible Values

| Value | UI Meaning |
|---|---|
| `1` | On-site |
| `2` | Remote |
| `3` | Hybrid |

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap (page 0) |
|---|---|---|---|
| `f_WT=1` (On-site) | 0, 25, 50 | No | 5 |
| `f_WT=2` (Remote) | 0, 25, 50 | No | 0 |
| `f_WT=3` (Hybrid) | 0, 25, 50 | No | 5 |

**Verdict: ✅ Confirmed working.** All three values produce distinct result sets across three pages. Remote (2) shows zero overlap with baseline, while On-site and Hybrid show partial overlap (since the unfiltered baseline contains a mix of all three).

---

#### 6. Salary

| Detail | Value |
|---|---|
| **UI Label** | Salary |
| **Query Parameter** | `f_SB2` |
| **Location in UI** | All Filters modal |

#### Possible Values

| Value | UI Meaning |
|---|---|
| `1` | $40,000+ |
| `2` | $60,000+ |
| `3` | $80,000+ |
| `4` | $100,000+ |
| `5` | $120,000+ |
| `6` | $140,000+ |
| `7` | $160,000+ |
| `8` | $180,000+ |
| `9` | $200,000+ |

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap (page 0) |
|---|---|---|---|
| `f_SB2=1` ($40k+) | 0, 25, 50 | No | 1 |
| `f_SB2=2` ($60k+) | 0, 25, 50 | No | 1 |
| `f_SB2=3` ($80k+) | 0, 25, 50 | No | 1 |
| `f_SB2=4` ($100k+) | 0, 25, 50 | No | 1 |
| `f_SB2=5` ($120k+) | 0, 25, 50 | No | 1 |
| `f_SB2=6` ($140k+) | 0, 25, 50 | No | 1 |
| `f_SB2=7` ($160k+) | 0, 25, 50 | No | 1 |
| `f_SB2=8` ($180k+) | 0, 25, 50 | No | 1 |
| `f_SB2=9` ($200k+) | 0, 25, 50 | No | 1 |

**Verdict: ✅ Confirmed working.** All nine salary threshold values produce distinctly different result sets with near-zero overlap (0–1) against the unfiltered baseline. The salary filter has a strong effect—it restricts results to only those listings that include salary data meeting the threshold.

---

#### 7. Company

| Detail | Value |
|---|---|
| **UI Label** | Company |
| **Query Parameter** | `f_C` |
| **Location in UI** | All Filters modal (search/select input) |

#### Possible Values

| Value | UI Meaning |
|---|---|
| *(numeric ID)* | LinkedIn's internal company ID (e.g. `1028` = Oracle, `1441` = Google, `1035` = Microsoft) |

Company IDs can be found by visiting a company's LinkedIn page and inspecting the URL or page source.

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | All Results Match Company? |
|---|---|---|---|
| `f_C=1441` (Google) | 0, 25, 50 | No (0 overlap) | ✅ 30/30 results show "Google" |
| `f_C=1035` (Microsoft) | 0, 25, 50 | No (0 overlap) | ✅ 30/30 results show "Microsoft" |
| `f_C=1028` (Oracle) | 0, 25, 50 | No (0 overlap) | ✅ 30/30 results show "Oracle" |

**Verdict: ✅ Confirmed working.** The company filter correctly constrains results to only listings from the specified company. Every returned listing's company name matches the expected company across all three pages (30/30 for each company).

---

#### 8. Industry

| Detail | Value |
|---|---|
| **UI Label** | Industry |
| **Query Parameter** | `f_I` |
| **Location in UI** | All Filters modal (search/select input) |

#### Possible Values (examples)

| Value | UI Meaning |
|---|---|
| `96` | IT Services and IT Consulting |
| `4` | Software Development |
| `43` | Financial Services |
| `14` | Entertainment |

Industry IDs are LinkedIn's internal numeric identifiers.

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap | Cross-Comparison |
|---|---|---|---|---|
| `f_I=96` (IT Services) | 0, 25, 50 | **Yes** | 10/10 with fresh baseline | Identical to all other f_I values |
| `f_I=4` (Software Dev) | 0, 25, 50 | **Yes** | 10/10 with fresh baseline | Identical to all other f_I values |
| `f_I=43` (Financial) | 0, 25, 50 | **Yes** | 10/10 with fresh baseline | Identical to all other f_I values |
| `f_I=14` (Entertainment) | 0, 25, 50 | **Yes** | 10/10 with fresh baseline | Identical to all other f_I values |

**Verdict: ❌ Does not work in the guest API.** Despite being tested with four different industry IDs across three pages each, results were 100% identical to the unfiltered baseline in every case. Cross-comparison confirms that `f_I=96` (IT Services), `f_I=14` (Entertainment), and `f_I=43` (Financial Services) all return the same 10 job IDs — if the filter were working, these wildly different industries would produce different results. The guest API completely ignores this parameter. Re-tested with `li_at` authentication cookie — no change.

> **Note:** The original analysis marked this as "Likely works" based on pattern matching with the web search UI, but automated verification proves the guest API does not honor it.

---

#### 9. Job Function

| Detail | Value |
|---|---|
| **UI Label** | Job function |
| **Query Parameter** | `f_F` |
| **Location in UI** | All Filters modal (search/select input) |

#### Possible Values (examples)

| Value | UI Meaning |
|---|---|
| `it` | Information Technology |
| `eng` | Engineering |
| `sale` | Sales |
| `cons` | Consulting |
| `othr` | Other |
| `prmg` | Project Management |
| `bdvl` | Business Development |
| `manu` | Management |
| `hcpr` | Health Care Provider |
| `dsgn` | Design |
| `anls` | Analyst |

Values are short text codes rather than numeric IDs.

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap | Cross-Comparison |
|---|---|---|---|---|
| `f_F=it` (IT) | 0, 25, 50 | **Yes** | 10/10 with fresh baseline | Identical to all other f_F values |
| `f_F=eng` (Engineering) | 0, 25, 50 | **Yes** | 10/10 with fresh baseline | Identical to all other f_F values |
| `f_F=sale` (Sales) | 0, 25, 50 | **Yes** | 10/10 with fresh baseline | Identical to all other f_F values |
| `f_F=dsgn` (Design) | 0, 25, 50 | **Yes** | 10/10 with fresh baseline | Identical to all other f_F values |
| `f_F=cons` (Consulting) | 0, 25, 50 | **Yes** | 10/10 with fresh baseline | Identical to all other f_F values |

**Verdict: ❌ Does not work in the guest API.** Despite being tested with five different function codes across three pages each, results were 100% identical to the unfiltered baseline in every case. Cross-comparison confirms that `f_F=it` (IT), `f_F=sale` (Sales), and `f_F=dsgn` (Design) all return the same 10 job IDs — if the filter were working, these different functions would produce different results. The guest API completely ignores this parameter. Re-tested with `li_at` authentication cookie — no change.

> **Note:** The original analysis marked this as "Likely works" based on pattern matching with the web search UI, but automated verification proves the guest API does not honor it.

---

#### 10. Easy Apply

| Detail | Value |
|---|---|
| **UI Label** | Easy Apply |
| **Query Parameter** | `f_AL` |
| **Location in UI** | All Filters modal (toggle) |

#### Possible Values

| Value | UI Meaning |
|---|---|
| `true` | Show only Easy Apply jobs |

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap |
|---|---|---|---|
| `f_AL=true` (no cookies) | 0, 25, 50 | **Yes** | 10/10 on all pages |
| `f_AL=true` (with `li_at` cookie) | 0, 25, 50 | **Yes** | 10/10 on all pages |

**Verdict: ❌ Does not work in the guest API, even when authenticated.** Results are identical to the baseline across three pages, both with and without the `li_at` cookie. The Easy Apply filter only functions on LinkedIn's authenticated `/jobs/search/` UI endpoint.

---

#### 11. Under 10 Applicants

| Detail | Value |
|---|---|
| **UI Label** | Under 10 applicants |
| **Query Parameter** | `f_EA` |
| **Location in UI** | All Filters modal (toggle) |

#### Possible Values

| Value | UI Meaning |
|---|---|
| `true` | Show only jobs with fewer than 10 applicants |

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap |
|---|---|---|---|
| `f_EA=true` (no cookies) | 0, 25, 50 | **Yes** | 10/10 on all pages |
| `f_EA=true` (with `li_at` cookie) | 0, 25, 50 | **Yes** | 10/10 on all pages |

**Verdict: ❌ Does not work in the guest API, even when authenticated.** Results are identical to the baseline across three pages, both with and without the `li_at` cookie.

---

#### 12. Fair Chance Employer

| Detail | Value |
|---|---|
| **UI Label** | Fair Chance Employer |
| **Query Parameter** | `f_FCE` |
| **Location in UI** | All Filters modal (toggle) |

#### Possible Values

| Value | UI Meaning |
|---|---|
| `true` | Show only Fair Chance Employer jobs |

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap |
|---|---|---|---|
| `f_FCE=true` | 0, 25, 50 | **Yes** | 10/10 on all pages |

**Verdict: ❌ Does not work in the guest API.** Results are identical to the baseline across three pages. Re-tested with `li_at` authentication cookie — no change.

---

#### 13. In Your Network

| Detail | Value |
|---|---|
| **UI Label** | In your network |
| **Query Parameter** | `f_JIYN` |
| **Location in UI** | All Filters modal (toggle) |

#### Possible Values

| Value | UI Meaning |
|---|---|
| `true` | Show only jobs where you have a connection at the company |

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap |
|---|---|---|---|
| `f_JIYN=true` (no cookies) | 0, 25, 50 | **Yes** | 10/10 on all pages |
| `f_JIYN=true` (with `li_at` cookie) | 0, 25, 50 | **Yes** | 10/10 on all pages |

**Verdict: ❌ Does not work in the guest API, even when authenticated.** Results are identical to the baseline across three pages, both with and without the `li_at` cookie. This filter only functions on LinkedIn's authenticated `/jobs/search/` UI endpoint.

---

#### 14. Has Verifications

| Detail | Value |
|---|---|
| **UI Label** | Has Verifications |
| **Query Parameter** | `f_LF` |
| **Location in UI** | All Filters modal |

#### Possible Values

Observed in UI URLs as `f_LF=f_AL`; the exact value semantics are unclear.

#### API Verification Results

| Test | Pages Checked | Identical to Baseline? | Overlap |
|---|---|---|---|
| `f_LF=f_AL` | 0, 25, 50 | **Yes** | 10/10 on all pages |
| `f_LF=true` | 0 | **Yes** | 10/10 |

**Verdict: ❌ Does not work in the guest API.** Results are identical to the baseline across three pages, for both observed value formats. Re-tested with `li_at` authentication cookie — no change.

---

### Non-Filter Query Parameters

These parameters control the search query itself rather than filtering:

#### keywords

| Detail | Value |
|---|---|
| **Query Parameter** | `keywords` |
| **Description** | Search keywords (URL-encoded, e.g. `C%23` for C#) |

**API Verification Result:** ✅ **Confirmed working.** Tested `nurse`, `accountant`, and `software+engineer` — each returns a completely different set of job listings with zero overlap between different keywords.

#### location

| Detail | Value |
|---|---|
| **Query Parameter** | `location` |
| **Description** | Location as free text (e.g. `United States`, `New York`, `London`) |

**API Verification Result:** ✅ **Confirmed working.** Tested `New+York` (returned NY jobs), `London` (returned London/UK jobs), and `Chicago` (returned Chicago jobs). Each location produces geographically appropriate results.

#### geoId

| Detail | Value |
|---|---|
| **Query Parameter** | `geoId` |
| **Description** | LinkedIn geographic ID (e.g. `103644278` = United States, `101165590` = United Kingdom, `102713980` = India) |

**API Verification Result:** ✅ **Confirmed working.** Tested US, UK, and India geoIds. UK returned only UK-based listings (London, etc.), India returned only India-based listings (Bengaluru, etc.), with zero overlap between regions.

#### distance

| Detail | Value |
|---|---|
| **Query Parameter** | `distance` |
| **Description** | Search radius in miles (default `25.0`) |

**API Verification Result:** ❌ **Does not work.** Tested with `location=New+York` and distance values of 5, 25, 50, and 100 miles. Cross-comparison confirms all four radius values return 100% identical results (10/10 overlap between every pair: 5 vs 25, 5 vs 50, 5 vs 100, 25 vs 50, 25 vs 100, 50 vs 100). The API ignores this parameter. Re-tested with `li_at` authentication cookie — no change.

#### start

| Detail | Value |
|---|---|
| **Query Parameter** | `start` |
| **Description** | Pagination offset (results per page ~10 in guest API) |

**API Verification Result:** ✅ **Confirmed working.** Pages 0, 25, and 50 return different job listings with zero overlap (0 listings in common between pages), confirming pagination functions correctly.

---

## API Response Structure & Parsing with Cheerio

### Response Format

The guest API returns raw **HTML fragments** (not JSON). The response body contains a list of `<li>` elements, each representing a single job card. There is no wrapper `<ul>` — the `<li>` items are the top-level elements in the response.

### HTML Structure of a Single Job Card

> **Note (2026-02-13):** LinkedIn has added Tailwind CSS utility classes to the job card HTML (e.g., `relative`, `w-full`, `hover:no-underline`, `absolute`, `top-0`, `z-[2]`, `outline-offset-[4px]`, `text-sm`, `p-0`). These are additional classes on existing elements — the semantic BEM-style classes (e.g., `base-card`, `base-search-card__title`) remain present and functional for data extraction. The example below shows the original semantic classes for clarity.

```html
<li>
  <div class="base-card relative w-full hover:no-underline focus:no-underline base-card--link base-search-card base-search-card--link job-search-card"
       data-entity-urn="urn:li:jobPosting:4369785394"
       data-impression-id="jobs-search-result-0"
       data-reference-id="..."
       data-tracking-id="..."
       data-column="1"
       data-row="1">
    <a class="base-card__full-link absolute top-0 right-0 bottom-0 left-0 p-0 z-[2] outline-offset-[4px]"
       href="https://www.linkedin.com/jobs/view/software-engineer-i-at-intuit-4369785394?position=1&...">
      <span class="sr-only">Software Engineer I</span>
    </a>
    <div class="search-entity-media">
      <img class="artdeco-entity-image artdeco-entity-image--square-4"
           data-delayed-url="https://media.licdn.com/dms/image/v2/.../company-logo_100_100/..."
           data-ghost-classes="artdeco-entity-image--ghost"
           data-ghost-url="https://static.licdn.com/aero-v1/sc/h/..."
           alt="">
    </div>
    <div class="base-search-card__info">
      <h3 class="base-search-card__title">Software Engineer I</h3>
      <h4 class="base-search-card__subtitle">
        <a class="hidden-nested-link"
           href="https://www.linkedin.com/company/intuit?trk=public_jobs_jserp-result_job-search-card-subtitle">
          Intuit
        </a>
      </h4>
      <div class="base-search-card__metadata">
        <span class="job-search-card__location">Mountain View, CA</span>

        <!-- OPTIONAL: highlight badge — varies per listing (see field #12) -->
        <div class="job-posting-benefits">
          <span class="job-posting-benefits__text">Actively Hiring +4 benefits</span>
        </div>

        <!-- Time: has __listdate for older posts, __listdate--new for recent posts, or both -->
        <time class="job-search-card__listdate job-search-card__listdate--new" datetime="2026-02-06">
          23 hours ago
        </time>

        <!-- OPTIONAL: only present on some listings -->
        <span class="job-search-card__easy-apply-label">Apply Now</span>
      </div>
    </div>
  </div>
</li>
```

### All Extractable Fields

Each job card in the API response contains the following data. Below is every field, the CSS selector or attribute used to extract it, and the corresponding Cheerio one-liner.

#### 1. Job ID

The LinkedIn-internal numeric job posting ID. Extracted from the `data-entity-urn` attribute, which has the format `urn:li:jobPosting:{id}`.

```typescript
const jobId = job.find('.base-search-card')
  .attr('data-entity-urn')
  ?.split(':')
  .pop() ?? undefined;
// e.g. "4369785394"
```

#### 2. Job URL

The full URL to the job posting detail page on LinkedIn.

```typescript
const jobUrl = job.find('.base-card__full-link')
  .attr('href')
  ?.trim() ?? undefined;
// e.g. "https://www.linkedin.com/jobs/view/software-engineer-i-at-intuit-4369785394?position=1&..."
```

#### 3. Job Title

The job title as displayed in the search results.

```typescript
const jobTitle = job.find('.base-search-card__title')
  .text()
  .trim() || undefined;
// e.g. "Software Engineer I"
```

#### 4. Company Name

The name of the hiring company.

```typescript
const companyName = job.find('.base-search-card__subtitle a')
  .text()
  .trim() || undefined;
// e.g. "Intuit"
```

#### 5. Company LinkedIn URL

The full LinkedIn URL for the company's page.

```typescript
const companyUrl = job.find('.base-search-card__subtitle a')
  .attr('href') ?? undefined;
// e.g. "https://www.linkedin.com/company/intuit?trk=public_jobs_jserp-result_job-search-card-subtitle"
```

#### 6. Company Slug

The URL-friendly company identifier, extracted from the company URL path. Useful for constructing company page URLs or as a stable identifier.

```typescript
const companySlug = job.find('.base-search-card__subtitle a')
  .attr('href')
  ?.match(/\/company\/([^/?]+)/)?.[1] ?? undefined;
// e.g. "intuit"
```

#### 7. Company Logo URL

The URL of the company's logo image. Note: the image uses `data-delayed-url` (lazy loading) rather than a standard `src` attribute.

```typescript
const companyLogoUrl = job.find('.artdeco-entity-image')
  .attr('data-delayed-url') ?? undefined;
// e.g. "https://media.licdn.com/dms/image/v2/.../company-logo_100_100/..."
```

#### 8. Location

The job location as displayed in the listing (city/state or broader region).

```typescript
const location = job.find('.job-search-card__location')
  .text()
  .trim() || undefined;
// e.g. "Mountain View, CA"
```

#### 9. Listed Date (ISO)

The date the job was posted, as an ISO date string from the `<time>` element's `datetime` attribute.

```typescript
const listedDateIso = job.find('time')
  .attr('datetime') ?? undefined;
// e.g. "2026-02-06"
```

#### 10. Listed Date (Relative Text)

The human-readable relative time string (e.g. "3 days ago", "23 hours ago"). The `<time>` element may have either `job-search-card__listdate` (older posts) or `job-search-card__listdate--new` (recent posts), or both classes. Use a selector that matches both variants to ensure the text is always captured.

```typescript
const listedDateText = job.find('.job-search-card__listdate, .job-search-card__listdate--new')
  .text()
  .trim() || undefined;
// e.g. "23 hours ago"
```

#### 11. Is New Listing

Whether LinkedIn considers this a "new" listing. The `<time>` element uses the CSS class `job-search-card__listdate--new` for recent posts and `job-search-card__listdate` for older posts. Both classes can be present on the same element.

```typescript
const isNewListing = job.find('time')
  .hasClass('job-search-card__listdate--new');
// e.g. true
```

#### 12. Posting Highlight Badge

An optional badge displayed on some job cards. This is **not** always "Actively Hiring" — it is a general-purpose highlight that LinkedIn selects per listing. Observed values for the primary text include:

| Primary Text | Meaning |
|---|---|
| `Actively Hiring` | The employer is actively reviewing candidates |
| `Be an early applicant` | The listing is new and has few applicants so far |
| `Medical insurance` | A featured benefit offered by the employer |
| `Vision insurance` | A featured benefit offered by the employer |
| *(other benefit names)* | Any employer-listed benefit may appear here |

The primary text can optionally be followed by `+N benefits` (e.g. `"Actively Hiring +4 benefits"`, `"Be an early applicant +5 benefits"`, `"Medical insurance +6 benefits"`), indicating additional benefits are listed on the full job detail page. This suffix is part of the same text node — there is no separate child element for it. Any primary text value can have the `+N benefits` suffix.

The element is **not present** on all job cards.

```typescript
// Full raw text (e.g. "Actively Hiring +4 benefits", "Be an early applicant +5 benefits", "Vision insurance +6 benefits")
const highlightRaw = job.find('.job-posting-benefits__text')
  .text()
  .trim()
  .replace(/\s+/g, ' ') || undefined;
// e.g. "Actively Hiring +4 benefits" or "Be an early applicant" or undefined
```

If you want to split the primary label from the benefits count:

```typescript
const highlightText = job.find('.job-posting-benefits__text')
  .text()
  .trim()
  .replace(/\s+/g, ' ') || undefined;

const highlightMatch = highlightText?.match(/^(.+?)(?:\s+\+(\d+)\s+benefits?)?$/);
const highlightLabel = highlightMatch?.[1] ?? undefined;   // e.g. "Actively Hiring"
const benefitsCount = highlightMatch?.[2]
  ? parseInt(highlightMatch[2], 10)
  : undefined;                                              // e.g. 4
```

#### 13. Easy Apply / Apply Now Badge

An optional label indicating the job supports Easy Apply or direct application. This element is not present on all job cards.

```typescript
const applyLabel = job.find('.job-search-card__easy-apply-label')
  .text()
  .trim() || undefined;
// e.g. "Apply Now" or undefined
```

#### 14. Salary Info

An optional salary range displayed on some job cards. This element is **rarely present** — most job cards do not include salary information. When present, it shows a salary range or value.

```typescript
const salary = job.find('.job-search-card__salary-info')
  .text()
  .trim()
  .replace(/\s+/g, ' ') || undefined;
// e.g. "$120,000.00 - $160,000.00" or undefined
```

### Fields NOT Present in the API Response

The following data is **not** included in the job search API response HTML. These fields are only available by fetching individual job detail pages:

| Field | Notes |
|---|---|
| **Experience Level** | Not indicated in the card HTML. The `f_E` filter works server-side, but the level is not displayed in results. |
| **Job Type** | Not indicated (full-time, contract, etc.). The `f_JT` filter works server-side, but the type is not in the card. |
| **Workplace Type** | Not indicated (remote, hybrid, on-site). The `f_WT` filter works, but the value is not in the card HTML. |
| **Industry** | Not shown in search result cards. |
| **Job Function** | Not shown in search result cards. |
| **Number of Applicants** | Not available in the guest API response. |
| **Job Description** | Only available by fetching the individual job detail page. |

---

## Example API Calls

**Basic keyword search:**
```
https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=software+engineer&location=United+States
```

**Remote jobs, posted in the last 24 hours, $100k+ salary:**
```
https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=software+engineer&location=United+States&f_TPR=r86400&f_WT=2&f_SB2=4
```

**Mid-Senior level contract positions:**
```
https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=software+engineer&location=United+States&f_E=4&f_JT=C
```

**Jobs at Google only:**
```
https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=software+engineer&location=United+States&f_C=1441
```

**Entry-level full-time jobs, $80k+ salary, past week:**
```
https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=software+engineer&location=United+States&f_E=2&f_JT=F&f_SB2=3&f_TPR=r604800
```

**Page 2 of results (pagination):**
```
https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=software+engineer&location=United+States&start=25
```

---

## Historic Updates

| Date | Section | Change |
|---|---|---|
| 2026-02-08 | *(all)* | Initial analysis performed. All parameters documented and tested. |
| 2026-02-13 | `f_TPR=r2592000` | Now produces results identical to unfiltered baseline (previously showed 0% overlap). The guest API's default results are all <30 days old, making the "past month" filter a no-op. Filter still works at tighter ranges (`r604800`, `r86400`). |
| 2026-02-13 | `sortBy`, `f_I`, `f_F` | Re-confirmed non-working via cross-comparison methodology. Previous analysis relied on identical-to-baseline checks; this analysis adds cross-comparison proof (e.g., `f_I=96` IT and `f_I=14` Entertainment return identical jobs). |
| 2026-02-13 | HTML structure | LinkedIn added Tailwind CSS utility classes to job card HTML (e.g., `relative`, `w-full`, `hover:no-underline`, `absolute`, `top-0`, `z-[2]`, `outline-offset-[4px]`, `text-sm`). All existing CSS selectors for data extraction remain functional. |
| 2026-02-13 | HTML structure | `data-delayed-url` attribute now appears on 2 elements per card (previously 1). The existing company logo selector (`.artdeco-entity-image[data-delayed-url]`) still works correctly. |
| 2026-02-13 | Highlight badge | Confirmed `+N benefits` suffix can appear with any primary text, including "Be an early applicant" (e.g., `"Be an early applicant +5 benefits"`). Previously only documented with "Actively Hiring" and benefit name examples. |
| 2026-02-13 | *(all fields)* | Re-verified API response content across 60 job cards (6 queries). All documented fields remain present: job titles, company names/URLs, locations, dates, highlight badges. No new fields, no removed fields, no structural changes detected. |
| 2026-02-13 | Salary Info | Added as field #14. Salary info (`.job-search-card__salary-info`) IS present on rare search result cards. Previously incorrectly listed under "Fields NOT Present". Removed from that section. |
| 2026-02-13 | Listed Date / Is New | Updated field #10 and #11. Both `job-search-card__listdate` and `job-search-card__listdate--new` classes can appear on the same `<time>` element. Updated selectors and HTML example to reflect this. |
