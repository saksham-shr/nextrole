# NextRole Backend Implementation Plan

## Goal
Wire the current frontend to a production-ready backend that preserves Career Ops parity while using:

- `Vercel`
- `Supabase Auth`
- `Supabase Postgres`
- `Supabase Storage`
- `Upstash Redis`
- `Anthropic API`
- `OpenAI API`
- `Manual Chat Mode`

The frontend is already structured around the required product objects:

- users
- profiles
- jobs
- evaluations
- reports
- resumes
- interview prep packs
- story bank entries
- follow-ups
- scan sources and runs
- pattern reports
- task runs

## Phase 1: Foundation

### 1. Auth and user session
- Enable `Supabase Auth` with email/password first.
- Add password reset and optional email verification.
- Create a server-side auth guard for `/dashboard`.
- Add user bootstrap logic on signup to create a profile shell.

### 2. Database schema
Create these core tables:

- `profiles`
- `provider_credentials`
- `jobs`
- `evaluations`
- `reports`
- `resumes`
- `interview_prep_packs`
- `story_bank_entries`
- `follow_ups`
- `scan_sources`
- `scan_runs`
- `scan_discoveries`
- `pattern_reports`
- `task_runs`
- `job_events`

Important enum-like fields:

- `jobs.status`: `pending | evaluated | applied | interview | offer | rejected | archived`
- `task_runs.status`: `queued | running | completed | failed | cancelled`
- `task_runs.type`: `evaluate | compare | batch | scan | pdf | interview_prep | followup | patterns | deep_research | apply`
- `provider_credentials.provider`: `anthropic | openai | manual`

### 3. Security
- Encrypt provider API keys before storage.
- Decrypt only in server-side execution paths.
- Use RLS so users only access their own rows.
- Add audit fields for credential updates and task execution failures.

## Phase 2: Provider and execution layer

### 1. Provider abstraction
Create one shared execution contract:

- `runEvaluation`
- `runBatchEvaluation`
- `runResumeTailoring`
- `runInterviewPrep`
- `runFollowupDraft`
- `runDeepResearch`
- `runApplyDraft`

Each execution path should support:

- `anthropic-api`
- `openai-api`
- `manual-mode`

### 2. Manual mode
For every AI-backed flow:
- generate structured prompt payload
- store prompt artifact
- accept pasted result
- validate parsed structure
- convert parsed structure into the same stored models used by API mode

### 3. Prompt pack system
Create versioned prompt packs by workflow:

- evaluate
- compare
- resume tailoring
- interview prep
- follow-up
- deep research
- training
- project

Add language support through prompt pack variants later:
- `en`
- `de`
- `fr`
- `ja`
- `pt`
- `ru`

## Phase 3: Queue and async workflow layer

### 1. Upstash-backed jobs
Use `Upstash Redis` for:

- batch fan-out
- scanner runs
- PDF generation
- report generation
- follow-up cadence jobs
- pattern analysis jobs
- retries and backoff

### 2. Task lifecycle
Every async action should:
- create a `task_runs` row
- push a queue job
- update progress
- write outputs to domain tables
- expose status to `/dashboard/activity`

### 3. Retry and failure design
- retry transient provider failures
- mark hard failures with actionable UI messages
- keep linked context to job/report/resume where applicable

## Phase 4: Career Ops parity logic

### 1. Evaluation engine
Implement structured evaluation blocks aligned to the Career Ops repo behavior.

At minimum the system should produce:
- overall score
- decision
- role fit
- compensation and level analysis
- CV match and gaps
- personalization guidance
- interview signals
- legitimacy/freshness checks

### 2. Resume generation
- use base CV + job + evaluation output
- generate role-specific resume text
- render HTML template
- generate PDF
- store artifact in `Supabase Storage`

### 3. Scanner logic
- store configurable scan sources
- run source fetchers in queued tasks
- normalize discoveries
- deduplicate against existing jobs
- route accepted discoveries into pipeline or direct evaluation

### 4. Tracker integrity
Implement:
- duplicate detection
- merge handling
- stale role detection
- liveness checks
- status normalization
- event timeline persistence

### 5. Coaching features
Implement these generators against existing job context:
- interview prep packs
- story extraction and refinement
- apply answer drafts
- follow-up drafts
- deep company research
- contact outreach
- training evaluation
- project evaluation

### 6. Patterns engine
Compute:
- evaluation to application rate
- application to interview rate
- interview to offer rate
- segment performance by archetype, company type, source, and geography
- recommendation summaries

## Phase 5: API surface

Recommended route groups:

- `app/api/auth/*`
- `app/api/profile/*`
- `app/api/providers/*`
- `app/api/jobs/*`
- `app/api/evaluations/*`
- `app/api/reports/*`
- `app/api/resumes/*`
- `app/api/scanner/*`
- `app/api/pipeline/*`
- `app/api/tracker/*`
- `app/api/interview-prep/*`
- `app/api/story-bank/*`
- `app/api/followups/*`
- `app/api/patterns/*`
- `app/api/tasks/*`
- `app/api/manual-import/*`

## Phase 6: Order of implementation

1. Supabase schema + RLS
2. Auth guard + onboarding persistence
3. Provider credentials + encryption
4. Jobs, tracker, and task models
5. Evaluate API + manual mode import
6. Reports persistence
7. Resume generation + storage
8. Scanner + pipeline ingestion
9. Interview prep and story bank
10. Apply drafts and follow-up engine
11. Pattern analysis
12. Multi-language prompt packs

## Acceptance criteria

- User can sign up and persist profile, CV, and provider config.
- User can evaluate one role in API mode and in manual mode.
- Evaluation creates report + tracker entry.
- User can generate and download a tailored resume.
- Scanner discoveries can move into pipeline and tracker.
- Tracker updates persist with notes and event history.
- Follow-up and interview prep link to real jobs.
- Activity page reflects actual queued job status.
- Pattern reports compute from stored tracker history.
