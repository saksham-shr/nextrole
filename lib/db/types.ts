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

// Row types (what you get back from SELECT) -------------------

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
  preferred_language: string | null;       // ISO 639-1, e.g. "en", "es", "fr"
  eval_score_apply: number | null;         // custom apply threshold (default 3.5)
  eval_score_watch: number | null;         // custom watch threshold (default 2.5)
  custom_eval_focus: string | null;        // extra instructions injected into evaluate prompt
  custom_archetypes: string[] | null;      // overrides default archetype list
  created_at: string;
  updated_at: string;
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

export type JobRow = {
  id: string;
  user_id: string;
  title: string;
  company: string;
  url: string | null;
  description: string | null;
  status: JobStatus;
  source: string | null;
  archetype: string | null;
  notes: string | null;
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
          description?: string | null;
          status?: JobStatus;
          source?: string | null;
          archetype?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          company?: string;
          url?: string | null;
          description?: string | null;
          status?: JobStatus;
          source?: string | null;
          archetype?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      job_status: JobStatus;
      task_status: TaskStatus;
      task_type: TaskType;
      provider_type: ProviderType;
    };
  };
};
