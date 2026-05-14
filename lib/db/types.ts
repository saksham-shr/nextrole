// ============================================================
// Database types — mirrors supabase/migrations/20260426000001_schema.sql
// Shape must match GenericSchema from @supabase/supabase-js.
// ============================================================

// Enums -------------------------------------------------------

export type JobStatus =
  | "pending"
  | "evaluated"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "archived";

export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskType =
  | "evaluate"
  | "compare"
  | "batch"
  | "scan"
  | "pdf"
  | "interview_prep"
  | "followup"
  | "patterns"
  | "deep_research"
  | "apply"
  | "contact_draft"
  | "training_eval"
  | "project_eval"
  | "negotiate";

export type ProviderType = "anthropic" | "openai" | "gemini" | "manual";

export type UserTier = "free" | "starter" | "pro" | "team" | "byok"; // team/byok kept for DB compat, not exposed in UI

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "expired" | "paused";

// Row types (what you get back from SELECT) -------------------

// Structured CV entry shapes (stored as JSONB on profiles)
export type WorkExperienceEntry = {
  role: string;
  company: string;
  start?: string;       // MM/YYYY or YYYY
  end?: string;         // MM/YYYY, YYYY, or "Present"
  current?: boolean;
  location?: string;
  description?: string;
  employment_type?: "full_time" | "part_time" | "contract" | "internship" | "freelance";
};

export type EducationEntry = {
  degree: string;
  institution: string;
  field?: string;
  start?: string;       // YYYY
  end?: string;         // YYYY or "Present"
  grade?: string;       // e.g. "8.5 CGPA" or "89.5%"
};

export type CertificationEntry = {
  title: string;
  issuer?: string;
  year?: string;
  url?: string;
};

export type ProjectEntry = {
  title: string;
  description?: string;
  tech?: string[];
  url?: string;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  target_roles: string[] | null;
  target_locations: string[] | null;
  comp_min: number | null;
  comp_max: number | null;
  years_experience: number | null;
  base_cv: string | null;
  // Extended fields (migration 005)
  target_archetypes: string[] | null;
  preferred_company_types: string[] | null;
  work_mode: "remote" | "hybrid" | "onsite" | null;
  current_comp: number | null;
  seniority: "junior" | "mid" | "senior" | "staff" | "principal" | null;
  languages: string[] | null;
  // Extended fields (migration 006)
  preferred_language: string | null;
  eval_score_apply: number | null;
  eval_score_watch: number | null;
  custom_eval_focus: string | null;
  custom_archetypes: string[] | null;
  // Monetization fields (migration 010)
  tier: UserTier;
  credits_remaining: number;
  credits_reset_at: string;
  lemon_squeezy_customer_id: string | null;
  lemon_squeezy_subscription_id: string | null;
  subscription_status: SubscriptionStatus | null;
  subscription_ends_at: string | null;
  onboarding_completed: boolean;
  // Autofill profile fields (migration 20260511000001)
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  country: string | null;
  city: string | null;
  state_province: string | null;
  zip_postal: string | null;
  street_address: string | null;
  notice_period: string | null;
  willing_to_relocate: boolean | null;
  sponsorship_needed: boolean | null;
  nationality: string | null;
  gender: string | null;
  pronouns: string | null;
  race_ethnicity: string | null;
  veteran_status: string | null;
  disability_status: string | null;
  dob: string | null;
  work_authorization: string | null;
  expected_salary: number | null;
  work_experience: WorkExperienceEntry[] | null;
  education: EducationEntry[] | null;
  certifications: CertificationEntry[] | null;
  projects: ProjectEntry[] | null;
  skills: string[] | null;
  created_at: string;
  updated_at: string;
};

export type ProfileFileRow = {
  id: string;
  user_id: string;
  kind: "resume" | "cover_letter";
  file_name: string;
  storage_path: string;
  size_bytes: number;
  mime_type: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type UsageLogRow = {
  id: string;
  user_id: string;
  task_type: string;
  model: string;
  credits_used: number;
  byok: boolean;
  created_at: string;
};

export type ProviderCredentialRow = {
  id: string;
  user_id: string;
  provider: ProviderType;
  encrypted_key: string | null;
  model: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InviteRow = {
  id: string;
  email: string;
  invited_by: string | null;
  created_at: string;
  used_at: string | null;
  expires_at: string | null;
  tier: string;
};

export type JobRow = {
  id: string;
  user_id: string;
  title: string;
  company: string;
  url: string | null;
  canonical_url: string | null;
  description: string | null;
  status: JobStatus;
  source: string | null;
  ats_family: string | null;
  archetype: string | null;
  notes: string | null;
  applied_at: string | null;
  last_response_at: string | null;
  followup_due_at: string | null;
  followup_state: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationSessionRow = {
  id: string;
  user_id: string;
  job_id: string | null;
  source_tab_id: number | null;
  source_url: string | null;
  target_url: string | null;
  ats_family: string | null;
  status: string;
  started_at: string;
  fill_started_at: string | null;
  submitted_at: string | null;
  failure_reason: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

export type JobEventRow = {
  id: string;
  user_id: string;
  job_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type EvaluationRow = {
  id: string;
  user_id: string;
  job_id: string;
  score: number | null; // 1.0–5.0 matching career-ops scale
  decision: "apply" | "skip" | "watch" | null;
  role_fit: Record<string, unknown> | null;
  compensation_analysis: Record<string, unknown> | null;
  cv_match: Record<string, unknown> | null;
  personalization_guidance: Record<string, unknown> | null;
  interview_signals: Record<string, unknown> | null;
  legitimacy_check: Record<string, unknown> | null;
  level_strategy: Record<string, unknown> | null;
  raw_output: string | null;
  provider: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportRow = {
  id: string;
  user_id: string;
  job_id: string | null;
  evaluation_id: string | null;
  title: string;
  content: Record<string, unknown>;
  type: string;
  created_at: string;
  updated_at: string;
};

export type ResumeRow = {
  id: string;
  user_id: string;
  job_id: string | null;
  title: string;
  content: string | null;
  html: string | null;
  pdf_url: string | null;
  coverage: number | null;
  status: "draft" | "final";
  version: number;
  created_at: string;
  updated_at: string;
};

export type TaskRunRow = {
  id: string;
  user_id: string;
  type: TaskType;
  status: TaskStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  linked_job_id: string | null;
  progress_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ScanSourceRow = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  type: string;
  is_active: boolean;
  auto_evaluate: boolean;
  last_scanned_at: string | null;
  total_discovered: number;
  created_at: string;
  updated_at: string;
};

export type ScanRunRow = {
  id: string;
  user_id: string;
  source_id: string;
  status: "running" | "completed" | "failed";
  discovered_count: number;
  added_count: number;
  duplicate_count: number;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type ScanDiscoveryRow = {
  id: string;
  user_id: string;
  scan_run_id: string;
  source_id: string | null;
  job_id: string | null;
  title: string;
  company: string;
  url: string | null;
  location: string | null;
  department: string | null;
  description_snippet: string | null;
  status: "new" | "added" | "duplicate" | "skipped";
  created_at: string;
};

export type StoryBankEntryRow = {
  id: string;
  user_id: string;
  job_id: string | null;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  tags: string[];
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "ready";
  created_at: string;
  updated_at: string;
};

export type InterviewPrepPackRow = {
  id: string;
  user_id: string;
  job_id: string;
  title: string;
  content: Record<string, unknown>;
  status: "draft" | "ready";
  provider: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
};

export type PromptTemplateRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  workflow: string;
  template: string;
  created_at: string;
  updated_at: string;
};

// Database generic (pass to createBrowserClient / createServerClient)
// Must conform to GenericSchema from @supabase/supabase-js.
// Each table requires Row, Insert, Update, and Relationships: [].
// Schema requires Tables, Views, and Functions at the top level.

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          target_roles?: string[] | null;
          target_locations?: string[] | null;
          comp_min?: number | null;
          comp_max?: number | null;
          years_experience?: number | null;
          base_cv?: string | null;
          target_archetypes?: string[] | null;
          preferred_company_types?: string[] | null;
          work_mode?: "remote" | "hybrid" | "onsite" | null;
          current_comp?: number | null;
          seniority?: "junior" | "mid" | "senior" | "staff" | "principal" | null;
          languages?: string[] | null;
          preferred_language?: string | null;
          eval_score_apply?: number | null;
          eval_score_watch?: number | null;
          custom_eval_focus?: string | null;
          custom_archetypes?: string[] | null;
          tier?: UserTier;
          credits_remaining?: number;
          credits_reset_at?: string;
          lemon_squeezy_customer_id?: string | null;
          lemon_squeezy_subscription_id?: string | null;
          subscription_status?: SubscriptionStatus | null;
          subscription_ends_at?: string | null;
          onboarding_completed?: boolean;
          // Autofill profile fields (migration 20260511000001)
          phone?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          country?: string | null;
          city?: string | null;
          state_province?: string | null;
          zip_postal?: string | null;
          street_address?: string | null;
          notice_period?: string | null;
          willing_to_relocate?: boolean | null;
          sponsorship_needed?: boolean | null;
          nationality?: string | null;
          gender?: string | null;
          pronouns?: string | null;
          race_ethnicity?: string | null;
          veteran_status?: string | null;
          disability_status?: string | null;
          dob?: string | null;
          work_authorization?: string | null;
          expected_salary?: number | null;
          work_experience?: WorkExperienceEntry[] | null;
          education?: EducationEntry[] | null;
          certifications?: CertificationEntry[] | null;
          projects?: ProjectEntry[] | null;
          skills?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          target_roles?: string[] | null;
          target_locations?: string[] | null;
          comp_min?: number | null;
          comp_max?: number | null;
          years_experience?: number | null;
          base_cv?: string | null;
          target_archetypes?: string[] | null;
          preferred_company_types?: string[] | null;
          work_mode?: "remote" | "hybrid" | "onsite" | null;
          current_comp?: number | null;
          seniority?: "junior" | "mid" | "senior" | "staff" | "principal" | null;
          languages?: string[] | null;
          preferred_language?: string | null;
          eval_score_apply?: number | null;
          eval_score_watch?: number | null;
          custom_eval_focus?: string | null;
          custom_archetypes?: string[] | null;
          tier?: UserTier;
          credits_remaining?: number;
          credits_reset_at?: string;
          lemon_squeezy_customer_id?: string | null;
          lemon_squeezy_subscription_id?: string | null;
          subscription_status?: SubscriptionStatus | null;
          subscription_ends_at?: string | null;
          onboarding_completed?: boolean;
          // Autofill profile fields (migration 20260511000001)
          phone?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          country?: string | null;
          city?: string | null;
          state_province?: string | null;
          zip_postal?: string | null;
          street_address?: string | null;
          notice_period?: string | null;
          willing_to_relocate?: boolean | null;
          sponsorship_needed?: boolean | null;
          nationality?: string | null;
          gender?: string | null;
          pronouns?: string | null;
          race_ethnicity?: string | null;
          veteran_status?: string | null;
          disability_status?: string | null;
          dob?: string | null;
          work_authorization?: string | null;
          expected_salary?: number | null;
          work_experience?: WorkExperienceEntry[] | null;
          education?: EducationEntry[] | null;
          certifications?: CertificationEntry[] | null;
          projects?: ProjectEntry[] | null;
          skills?: string[] | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_credentials: {
        Row: ProviderCredentialRow;
        Insert: {
          id?: string;
          user_id: string;
          provider: ProviderType;
          encrypted_key?: string | null;
          model?: string | null;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          encrypted_key?: string | null;
          model?: string | null;
          is_active?: boolean;
          last_used_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: JobRow;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          company: string;
          url?: string | null;
          canonical_url?: string | null;
          description?: string | null;
          status?: JobStatus;
          source?: string | null;
          ats_family?: string | null;
          archetype?: string | null;
          notes?: string | null;
          applied_at?: string | null;
          last_response_at?: string | null;
          followup_due_at?: string | null;
          followup_state?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          company?: string;
          url?: string | null;
          canonical_url?: string | null;
          description?: string | null;
          status?: JobStatus;
          source?: string | null;
          ats_family?: string | null;
          archetype?: string | null;
          notes?: string | null;
          applied_at?: string | null;
          last_response_at?: string | null;
          followup_due_at?: string | null;
          followup_state?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      application_sessions: {
        Row: ApplicationSessionRow;
        Insert: {
          id?: string;
          user_id: string;
          job_id?: string | null;
          source_tab_id?: number | null;
          source_url?: string | null;
          target_url?: string | null;
          ats_family?: string | null;
          status?: string;
          started_at?: string;
          fill_started_at?: string | null;
          submitted_at?: string | null;
          failure_reason?: string | null;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          job_id?: string | null;
          source_tab_id?: number | null;
          source_url?: string | null;
          target_url?: string | null;
          ats_family?: string | null;
          status?: string;
          started_at?: string;
          fill_started_at?: string | null;
          submitted_at?: string | null;
          failure_reason?: string | null;
          last_seen_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_sessions_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_events: {
        Row: JobEventRow;
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          event_type: string;
          payload?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluations: {
        Row: EvaluationRow;
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          score?: number | null;
          decision?: "apply" | "skip" | "watch" | null;
          role_fit?: Record<string, unknown> | null;
          compensation_analysis?: Record<string, unknown> | null;
          cv_match?: Record<string, unknown> | null;
          personalization_guidance?: Record<string, unknown> | null;
          interview_signals?: Record<string, unknown> | null;
          legitimacy_check?: Record<string, unknown> | null;
          level_strategy?: Record<string, unknown> | null;
          raw_output?: string | null;
          provider?: string | null;
          model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          score?: number | null;
          decision?: "apply" | "skip" | "watch" | null;
          role_fit?: Record<string, unknown> | null;
          compensation_analysis?: Record<string, unknown> | null;
          cv_match?: Record<string, unknown> | null;
          personalization_guidance?: Record<string, unknown> | null;
          interview_signals?: Record<string, unknown> | null;
          legitimacy_check?: Record<string, unknown> | null;
          level_strategy?: Record<string, unknown> | null;
          raw_output?: string | null;
          provider?: string | null;
          model?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluations_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: ReportRow;
        Insert: {
          id?: string;
          user_id: string;
          job_id?: string | null;
          evaluation_id?: string | null;
          title: string;
          content?: Record<string, unknown>;
          type?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          job_id?: string | null;
          evaluation_id?: string | null;
          title?: string;
          content?: Record<string, unknown>;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_evaluation_id_fkey";
            columns: ["evaluation_id"];
            isOneToOne: false;
            referencedRelation: "evaluations";
            referencedColumns: ["id"];
          },
        ];
      };
      resumes: {
        Row: ResumeRow;
        Insert: {
          id?: string;
          user_id: string;
          job_id?: string | null;
          title: string;
          content?: string | null;
          html?: string | null;
          pdf_url?: string | null;
          coverage?: number | null;
          status?: "draft" | "final";
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          job_id?: string | null;
          title?: string;
          content?: string | null;
          html?: string | null;
          pdf_url?: string | null;
          coverage?: number | null;
          status?: "draft" | "final";
          version?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_runs: {
        Row: TaskRunRow;
        Insert: {
          id?: string;
          user_id: string;
          type: TaskType;
          status?: TaskStatus;
          input?: Record<string, unknown> | null;
          output?: Record<string, unknown> | null;
          error?: string | null;
          linked_job_id?: string | null;
          progress_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: TaskStatus;
          output?: Record<string, unknown> | null;
          error?: string | null;
          progress_message?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      scan_sources: {
        Row: ScanSourceRow;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          url: string;
          type?: string;
          is_active?: boolean;
          auto_evaluate?: boolean;
          last_scanned_at?: string | null;
          total_discovered?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          url?: string;
          type?: string;
          is_active?: boolean;
          auto_evaluate?: boolean;
          last_scanned_at?: string | null;
          total_discovered?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      scan_runs: {
        Row: ScanRunRow;
        Insert: {
          id?: string;
          user_id: string;
          source_id: string;
          status?: "running" | "completed" | "failed";
          discovered_count?: number;
          added_count?: number;
          duplicate_count?: number;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "running" | "completed" | "failed";
          discovered_count?: number;
          added_count?: number;
          duplicate_count?: number;
          error?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scan_runs_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "scan_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      scan_discoveries: {
        Row: ScanDiscoveryRow;
        Insert: {
          id?: string;
          user_id: string;
          scan_run_id: string;
          source_id?: string | null;
          job_id?: string | null;
          title: string;
          company: string;
          url?: string | null;
          location?: string | null;
          department?: string | null;
          description_snippet?: string | null;
          status?: "new" | "added" | "duplicate" | "skipped";
          created_at?: string;
        };
        Update: {
          job_id?: string | null;
          status?: "new" | "added" | "duplicate" | "skipped";
        };
        Relationships: [
          {
            foreignKeyName: "scan_discoveries_scan_run_id_fkey";
            columns: ["scan_run_id"];
            isOneToOne: false;
            referencedRelation: "scan_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scan_discoveries_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "scan_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scan_discoveries_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      story_bank_entries: {
        Row: StoryBankEntryRow;
        Insert: {
          id?: string;
          user_id: string;
          job_id?: string | null;
          title: string;
          situation?: string;
          task?: string;
          action?: string;
          result?: string;
          reflection?: string;
          tags?: string[];
          difficulty?: "easy" | "medium" | "hard";
          status?: "draft" | "ready";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          job_id?: string | null;
          title?: string;
          situation?: string;
          task?: string;
          action?: string;
          result?: string;
          reflection?: string;
          tags?: string[];
          difficulty?: "easy" | "medium" | "hard";
          status?: "draft" | "ready";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "story_bank_entries_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      interview_prep_packs: {
        Row: InterviewPrepPackRow;
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          title: string;
          content?: Record<string, unknown>;
          status?: "draft" | "ready";
          provider?: string | null;
          model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: Record<string, unknown>;
          status?: "draft" | "ready";
          provider?: string | null;
          model?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interview_prep_packs_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      prompt_templates: {
        Row: PromptTemplateRow;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          workflow?: string;
          template: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          workflow?: string;
          template?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      usage_log: {
        Row: UsageLogRow;
        Insert: {
          id?: string;
          user_id: string;
          task_type: string;
          model: string;
          credits_used?: number;
          byok?: boolean;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      profile_files: {
        Row: ProfileFileRow;
        Insert: {
          id?: string;
          user_id: string;
          kind: "resume" | "cover_letter";
          file_name: string;
          storage_path: string;
          size_bytes: number;
          mime_type: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          file_name?: string;
          is_default?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      extension_feedback: {
        Row: {
          id: string;
          user_id: string | null;
          url: string;
          page_title: string | null;
          action: "not_a_job" | "confirmed";
          source: string | null;
          confidence: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string | null;
          url: string;
          page_title?: string | null;
          action: "not_a_job" | "confirmed";
          source?: string | null;
          confidence?: string | null;
          created_at?: string;
        };
        Update: {
          page_title?: string | null;
          action?: "not_a_job" | "confirmed";
          source?: string | null;
          confidence?: string | null;
        };
        Relationships: [];
      };
      extension_tokens: {
        Row: {
          id: string;
          user_id: string;
          token_hash: string;
          name: string;
          last_used_at: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token_hash: string;
          name?: string;
          last_used_at?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          name?: string;
          last_used_at?: string | null;
          expires_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          owner_id: string;
          member_id: string | null;
          invited_email: string;
          status: "pending" | "active" | "removed";
          invited_at: string;
          joined_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          member_id?: string | null;
          invited_email: string;
          status?: "pending" | "active" | "removed";
          invited_at?: string;
          joined_at?: string | null;
        };
        Update: {
          member_id?: string | null;
          status?: "pending" | "active" | "removed";
          joined_at?: string | null;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          tier: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          tier?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      invites: {
        Row: InviteRow;
        Insert: {
          id?: string;
          email: string;
          invited_by?: string | null;
          tier?: string;
          created_at?: string;
          expires_at?: string | null;
          used_at?: string | null;
        };
        Update: {
          used_at?: string | null;
          expires_at?: string | null;
          tier?: string;
        };
        Relationships: [];
      };
      daily_usage: {
        Row: {
          user_id: string;
          date: string;
          evaluations: number;
          resumes: number;
          autofills: number;
          autofill_credits_used: number;
          tailor_sessions: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date?: string;
          evaluations?: number;
          resumes?: number;
          autofills?: number;
          autofill_credits_used?: number;
          tailor_sessions?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          evaluations: number;
          resumes: number;
          autofills: number;
          autofill_credits_used: number;
          tailor_sessions: number;
          updated_at: string;
        }>;
        Relationships: [];
      };
    }; // end Tables
    Views: Record<string, never>;
    Functions: {
      deduct_credit: {
        Args: { p_user_id: string; p_amount?: number };
        Returns: boolean;
      };
      increment_daily_usage: {
        Args: { p_field: string; p_user: string };
        Returns: number;
      };
      reset_credits_for_tier: {
        Args: { p_user_id: string; p_tier: UserTier };
        Returns: void;
      };
      revoke_team_members: {
        Args: { p_owner_id: string };
        Returns: void;
      };
    };
    Enums: {
      job_status: JobStatus;
      task_status: TaskStatus;
      task_type: TaskType;
      provider_type: ProviderType;
      user_tier: UserTier;
    };
  };
};
