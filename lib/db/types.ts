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
  | "apply";

export type ProviderType = "anthropic" | "openai" | "manual";

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
