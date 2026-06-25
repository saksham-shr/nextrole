# Graph Report - C:\Projects\nextrole  (2026-06-23)

## Corpus Check
- 169 files · ~239,021 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 859 nodes · 1535 edges · 71 communities detected
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 203 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]

## God Nodes (most connected - your core abstractions)
1. `POST()` - 77 edges
2. `GET()` - 59 edges
3. `createClient()` - 34 edges
4. `extractJob()` - 30 edges
5. `cleanText()` - 26 edges
6. `texts()` - 24 edges
7. `companyFromDomain()` - 24 edges
8. `swMsg()` - 19 edges
9. `DELETE()` - 16 edges
10. `text()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `PATCH()` --calls--> `computeFollowupDueAt()`  [INFERRED]
  C:\Projects\nextrole\app\api\profile\route.ts → C:\Projects\nextrole\lib\jobs.ts
- `resolveResume()` --calls--> `GET()`  [INFERRED]
  C:\Projects\nextrole\components\nextrole\resumes-page.tsx → C:\Projects\nextrole\app\auth\signout\route.ts
- `removeCard()` --calls--> `remove()`  [INFERRED]
  C:\Projects\nextrole\extension\content\apply-card.js → C:\Projects\nextrole\components\nextrole\profile-page.tsx
- `renderFillUniform()` --calls--> `Card()`  [INFERRED]
  C:\Projects\nextrole\extension\content\apply-card.js → C:\Projects\nextrole\components\nextrole\settings-page.tsx
- `handleSubmit()` --calls--> `createClient()`  [INFERRED]
  C:\Projects\nextrole\components\nextrole\settings-page.tsx → C:\Projects\nextrole\lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (78): _accentureActiveStep(), buildCardShell(), buildEvalPickerHtml(), buildIdentityRows(), buildResumeBlockHtml(), buildWorkdayRows(), checkAutoTrigger(), _detectCaptcha() (+70 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (51): text(), decrementDailyUsage(), reserveExtensionAiCharge(), hashToken(), resolveExtensionUser(), awardActionCredit(), checkReferralThreshold(), isProfileComplete() (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (69): _angularCheckCheckbox(), _angularClickMatRadio(), _angularClickMatSelect(), _angularFillInput(), _ashbyDropdown(), _ashbyInput(), classifyField(), classifySelectField() (+61 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (44): handleGoogle(), handleSubmit(), signOut(), createClient(), getSupabaseEnv(), isSameOrigin(), normalizeOrigin(), addJobFromExplore() (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (36): getSuggestions(), renderResumeDocx(), resolveBundledPython(), ExplorePage(), has(), getClientIp(), pruneBuckets(), rateLimit() (+28 more)

### Community 5 - "Community 5"
Cohesion: 0.1
Nodes (51): appendNotAJobLink(), attr(), _checkJobUrlViaApi(), cleanText(), companyFromDomain(), detectAndShow(), escapeHtml(), extractJob() (+43 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (31): $(), checkJobUrl(), clearJobError(), fetchJobArtifacts(), friendlyError(), getSession(), handleEvaluate(), handleMarkApplied() (+23 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (3): formatDate(), formatRelative(), resolveResume()

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (10): completeOnboarding(), handleComplete(), handleCompleteAndGo(), handlePrefsNext(), handleThresholdsNext(), onCvDrop(), parseCv(), patchProfile() (+2 more)

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (20): renderFillUniform(), check(), clean(), contactItems(), renderResumePdf(), ResumeDocument(), Section(), streamToBuffer() (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (14): createExtensionToken(), generateToken(), hashToken(), assertAdmin(), createAdminClient(), deleteUser(), grantTier(), requireAdmin() (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (1): S()

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (6): isNonNullObject(), validateCvStructure(), validateEvaluation(), validateJobArtifacts(), validateProfile(), validateResume()

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (2): AdminDeleteButton(), useToast()

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (4): pushParam(), setFilter(), setSort(), submitSearch()

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (3): completeOnboarding(), handlePrefsSubmit(), skipToEnd()

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (4): Card(), handleSubmit(), load(), revoke()

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (7): escapeHtml(), getLastJob(), getPageJobContext(), getToken(), removeResumeOverlay(), showResumeOverlay(), tailorAndOpen()

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 0.38
Nodes (3): addTag(), handleKeyDown(), removeTag()

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (2): UpgradeModal(), useCurrency()

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 0.47
Nodes (4): buildNavItems(), filterItems(), handleKeyDown(), navigate()

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (2): handleKeyDown(), selectItem()

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (3): robots(), getSiteUrl(), sitemap()

### Community 28 - "Community 28"
Cohesion: 0.4
Nodes (1): Page()

### Community 29 - "Community 29"
Cohesion: 0.4
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 0.4
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 0.5
Nodes (3): isKnownDashboardRoute(), resolveDashboardRoute(), DashboardCatchAll()

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 0.5
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (2): $(), showSection()

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

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 41`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `page.tsx`, `HomePage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `error.tsx`, `DashboardError()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `error.tsx`, `PipelineError()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `error.tsx`, `ResumesError()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `error.tsx`, `SettingsError()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `page.tsx`, `Privacy()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `page.tsx`, `Terms()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `formatDate()`, `admin-audit-log.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `explore-page.tsx`, `handleAdd()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `oss-notices-page.tsx`, `OpenSourceNoticesPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `not-found.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `credits-earn-tracker.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `dashboard-pages.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `public-pages.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `generate-icons.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GET()` connect `Community 4` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 7`, `Community 9`, `Community 10`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Why does `has()` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 6`?**
  _High betweenness centrality (0.157) - this node is a cross-community bridge._
- **Why does `POST()` connect `Community 1` to `Community 9`, `Community 10`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Are the 32 inferred relationships involving `POST()` (e.g. with `GET()` and `isSameOrigin()`) actually correct?**
  _`POST()` has 32 INFERRED edges - model-reasoned connections that need verification._
- **Are the 34 inferred relationships involving `GET()` (e.g. with `POST()` and `deleteUser()`) actually correct?**
  _`GET()` has 34 INFERRED edges - model-reasoned connections that need verification._
- **Are the 33 inferred relationships involving `createClient()` (e.g. with `requireAdmin()` and `signOut()`) actually correct?**
  _`createClient()` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._