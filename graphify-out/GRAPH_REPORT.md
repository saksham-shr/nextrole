# Graph Report - C:\Projects\nextrole  (2026-05-09)

## Corpus Check
- 112 files · ~122,159 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 437 nodes · 700 edges · 54 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]

## God Nodes (most connected - your core abstractions)
1. `POST()` - 36 edges
2. `extractJob()` - 28 edges
3. `GET()` - 26 edges
4. `cleanText()` - 26 edges
5. `createClient()` - 26 edges
6. `texts()` - 24 edges
7. `companyFromDomain()` - 24 edges
8. `metaContent()` - 13 edges
9. `runAutoFill()` - 11 edges
10. `runSilentFill()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `saveProfileStep()` --calls--> `createClient()`  [INFERRED]
  C:\Projects\nextrole\app\actions\profile.ts → C:\Projects\nextrole\lib\supabase\server.ts
- `retryTaskRun()` --calls--> `text()`  [INFERRED]
  C:\Projects\nextrole\app\actions\tasks.ts → C:\Projects\nextrole\extension\content\content.js
- `GET()` --calls--> `POST()`  [INFERRED]
  C:\Projects\nextrole\app\auth\callback\route.ts → C:\Projects\nextrole\app\api\webhooks\lemonsqueezy\route.ts
- `GET()` --calls--> `showDetectCard()`  [INFERRED]
  C:\Projects\nextrole\app\auth\callback\route.ts → C:\Projects\nextrole\extension\content\content.js
- `GET()` --calls--> `isSameOrigin()`  [INFERRED]
  C:\Projects\nextrole\app\auth\callback\route.ts → C:\Projects\nextrole\lib\security\csrf.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (37): createExtensionToken(), generateToken(), hashToken(), assertAdmin(), createAdminClient(), deleteUser(), signOut(), hashToken() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (50): appendNotAJobLink(), attr(), _checkJobUrlViaApi(), cleanText(), companyFromDomain(), detectAndShow(), escapeHtml(), extractJob() (+42 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (20): decrypt(), encrypt(), getKey(), isSameOrigin(), normalizeOrigin(), canAccess(), requireFeature(), EvaluatePage() (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (21): attachToField(), classifyField(), _classifySelect(), debounce(), escapeHtml(), getFieldLabel(), getPageJobContext(), _getProfileCached() (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (19): buildFab(), classifyField(), classifySelectField(), confirmAndSubmit(), escapeHtml(), getDirectValue(), getFieldLabel(), getFilledFieldTypes() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (17): $(), clearJobError(), friendlyError(), getSession(), handleEvaluate(), handleMarkApplied(), handlePipeline(), handleResume() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (1): S()

### Community 7 - "Community 7"
Cohesion: 0.27
Nodes (13): text(), callAnthropic(), callGemini(), callOpenAI(), callOpenRouter(), callOpenRouterOnce(), callProvider(), callSarvam() (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.26
Nodes (7): escapeHtml(), getLastJob(), getPageJobContext(), getToken(), removeResumeOverlay(), showResumeOverlay(), tailorAndOpen()

### Community 9 - "Community 9"
Cohesion: 0.27
Nodes (6): createClient(), getSupabaseEnv(), copyAuthCookies(), proxy(), redirectWithCookies(), updateSession()

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (2): checkBetaAccess(), handleSubmit()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (2): addTag(), onKeyDown()

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.32
Nodes (3): completeOnboarding(), handleFreeOrByok(), handlePaidTier()

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (2): UpgradeModal(), useCurrency()

### Community 16 - "Community 16"
Cohesion: 0.47
Nodes (4): buildNavItems(), filterItems(), handleKeyDown(), navigate()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (3): robots(), getSiteUrl(), sitemap()

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (3): isKnownDashboardRoute(), resolveDashboardRoute(), DashboardCatchAll()

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (1): Page()

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (2): formatDate(), formatRelative()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 0.7
Nodes (4): $(), clearStatus(), setStatus(), showSection()

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 0.67
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 31`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `page.tsx`, `HomePage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `page.tsx`, `formatDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `page.tsx`, `Privacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `page.tsx`, `Terms()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `dashboard-pages.tsx`, `switch()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `oss-notices-page.tsx`, `OpenSourceNoticesPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `pipeline-page.tsx`, `onKey()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `not-found.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `public-pages.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `generate-icons.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `POST()` connect `Community 2` to `Community 0`, `Community 7`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 0` to `Community 9`, `Community 2`, `Community 7`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `text()` connect `Community 7` to `Community 0`, `Community 1`, `Community 2`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `POST()` (e.g. with `GET()` and `requireFeature()`) actually correct?**
  _`POST()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `GET()` (e.g. with `POST()` and `deleteUser()`) actually correct?**
  _`GET()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `createClient()` (e.g. with `assertAdmin()` and `signOut()`) actually correct?**
  _`createClient()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._