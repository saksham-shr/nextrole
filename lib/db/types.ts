// ============================================================
// Database types — mirrors supabase/migrations/20260527000001_master_schema_v2.sql
// ============================================================

// Enums -------------------------------------------------------

export type JobStatus =
  | "pending"
  | "evaluated"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "archived"
  | "withdrawn";

export type ProviderType = "anthropic" | "openai" | "gemini" | "manual";

export type UserTier = "free" | "starter" | "pro" | "team";

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "expired" | "paused" | "halted" | "pending";

export type PaymentRecordStatus = "captured" | "refunded" | "partially_refunded";

export type PaymentRecord = {
  id: string;
  user_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string | null;
  razorpay_sub_id: string | null;
  credits_granted: number | null;
  type: "subscription" | "renewal" | "topup";
  plan: string | null;
  period: string | null;
  pack_id: string | null;
  amount_paise: number;
  currency: string;
  status: PaymentRecordStatus;
  refunded_at: string | null;
  refund_id: string | null;
  created_at: string;
};

// Structured CV entry shapes (stored as JSONB on profiles) ----

export type WorkExperienceEntry = {
  role: string;
  company: string;
  start?: string;
  end?: string;
  current?: boolean;
  location?: string;
  description?: string;
  employment_type?: "full_time" | "part_time" | "contract" | "internship" | "freelance";
};

export type EducationEntry = {
  degree: string;
  institution: string;
  field?: string;
  start?: string;
  end?: string;
  grade?: string;
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

// Row types ---------------------------------------------------

export type ProfileRow = {
  id: string;
  email: string;
  // Name
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  name_prefix: string | null;
  middle_name: string | null;
  fathers_name: string | null;
  local_given_name: string | null;
  local_family_name: string | null;
  // Job targets
  target_roles: string[] | null;
  target_locations: string[] | null;
  target_archetypes: string[] | null;
  preferred_company_types: string[] | null;
  work_mode: "remote" | "hybrid" | "onsite" | null;
  seniority: "junior" | "mid" | "senior" | "staff" | "principal" | null;
  // Compensation
  current_ctc: number | null;
  expected_salary_min: number | null;
  expected_salary_max: number | null;
  // legacy / breakdown columns kept for Application Details CTC breakdown
  comp_min: number | null;
  comp_max: number | null;
  current_comp: number | null;
  expected_salary: number | null;
  ctc_fixed: number | null;
  ctc_variable: number | null;
  ctc_note: string | null;
  salary_currency: string;
  available_from: string | null;
  years_experience: number | null;
  base_cv: string | null;
  // Contact
  phone: string | null;
  phone_country_code: string | null;
  alternate_phone: string | null;
  phone_device_type: string | null;
  // Online presence
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  naukri_url: string | null;
  publications_url: string | null;
  other_url: string | null;
  // Address
  country: string | null;
  city: string | null;
  state_province: string | null;
  zip_postal: string | null;
  street_address: string | null;
  address_line2: string | null;
  permanent_address_same: boolean;
  permanent_address: string | null;
  // Work preferences
  notice_period: string | null;
  notice_period_note: string | null;
  willing_to_relocate: boolean | null;
  sponsorship_needed: boolean | null;
  work_authorization: string | null;
  authorized_countries: string[];
  open_to_hybrid: boolean;
  govt_military_member: boolean | null;
  signed_non_compete: boolean | null;
  // Identity
  nationality: string | null;
  gender: string | null;
  pronouns: string | null;
  race_ethnicity: string | null;
  veteran_status: string | null;
  disability_status: string | null;
  marital_status: string | null;
  category: string | null;
  dob: string | null;
  government_ids: Record<string, unknown>;
  hispanic_or_latino: boolean | null;
  lgbtq_member: boolean | null;
  accommodation_needed: string | null;
  indian_army_veteran: boolean | null;
  // Referral
  referral_source: string | null;
  referrals: Record<string, unknown>;
  // Q&A library
  qa_library: Record<string, unknown>[];
  // Consents
  consents: Record<string, unknown>;
  // CV data
  work_experience: WorkExperienceEntry[] | null;
  education: EducationEntry[] | null;
  certifications: CertificationEntry[] | null;
  skills: string[] | null;
  projects: ProjectEntry[] | null;
  languages: string[] | null;
  preferred_language: string | null;
  communication_level: string | null;
  // Eval settings
  eval_score_apply: number | null;
  eval_score_watch: number | null;
  custom_eval_focus: string | null;
  custom_archetypes: string[] | null;
  // Account & billing
  onboarding_completed: boolean;
  tier: UserTier;
  credits_remaining: number;
  daily_credits: number;
  bonus_credits: number;
  topup_credits: number;
  credits_reset_at: string;
  daily_credits_reset_at: string;
  credit_grants_given: Record<string, string>;
  topup_forfeit_at: string | null;
  subscription_status: SubscriptionStatus | null;
  subscription_ends_at: string | null;
  billing_period_start: string | null;
  subscription_period: "monthly" | "yearly" | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  referral_code: string | null;
  referred_by: string | null;
  verified_phone: string | null;
  signup_ip: string | null;
  trial_expiry_notified_at: string | null;
  subscription_expiry_notified_at: string | null;
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
  source: "ai" | "custom";
  template_id: "classic" | "modern";
  created_at: string;
  updated_at: string;
};

export type UsageLogRow = {
  id: string;
  user_id: string;
  activity_type: "evaluate" | "tailor_resume" | "autofill" | "topup" | "daily_reset" | "credits_expired";
  credits_used: number;
  razorpay_payment_id: string | null;
  created_at: string;
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

export type EvaluationRow = {
  id: string;
  user_id: string;
  job_id: string;
  score: number | null;
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
  tier: string;
  invite_code: string;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
};

export type CommerceConfigRow = {
  id: number;
  overrides: {
    plan_prices_inr?: Partial<Record<string, number>>;
    topup_packs?: Array<{ id: string; credits: number; inr: number }>;
    flags?: { starter_enabled?: boolean; pro_enabled?: boolean; topups_enabled?: boolean };
  };
  updated_by: string | null;
  updated_at: string;
};

export type AdminAuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// Database generic type ---------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<Omit<ProfileRow, "id" | "email" | "created_at" | "updated_at">> & {
          id: string;
          email: string;
        };
        Update: Partial<Omit<ProfileRow, "id" | "email" | "created_at">>;
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
          source?: "ai" | "custom";
          template_id?: "classic" | "modern";
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
          source?: "ai" | "custom";
          template_id?: "classic" | "modern";
          updated_at?: string;
        };
        Relationships: [];
      };
      usage_log: {
        Row: UsageLogRow;
        Insert: {
          id?: string;
          user_id: string;
          activity_type: "evaluate" | "tailor_resume" | "autofill" | "topup" | "daily_reset" | "credits_expired";
          credits_used?: number;
          razorpay_payment_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
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
          expires_at: string;
        };
        Update: {
          name?: string;
          last_used_at?: string | null;
          expires_at?: string;
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
      extension_feedback: {
        Row: {
          id: string;
          user_id: string | null;
          url: string;
          page_title: string | null;
          action: string;
          source: string | null;
          confidence: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          url: string;
          page_title?: string | null;
          action: string;
          source?: string | null;
          confidence?: string | null;
          created_at?: string;
        };
        Update: {
          page_title?: string | null;
          action?: string;
          source?: string | null;
          confidence?: string | null;
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
      invites: {
        Row: InviteRow;
        Insert: {
          id?: string;
          email: string;
          invited_by?: string | null;
          tier?: string;
          expires_at?: string | null;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          used_at?: string | null;
          expires_at?: string | null;
          tier?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: AdminAuditLogRow;
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email: string;
          action: string;
          target_type: string;
          target_id?: string | null;
          before?: Record<string, unknown> | null;
          after?: Record<string, unknown> | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      commerce_config: {
        Row: CommerceConfigRow;
        Insert: {
          id?: number;
          overrides?: CommerceConfigRow["overrides"];
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          overrides?: CommerceConfigRow["overrides"];
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_records: {
        Row: PaymentRecord;
        Insert: {
          id?: string;
          user_id: string;
          razorpay_payment_id: string;
          razorpay_order_id?: string | null;
          razorpay_sub_id?: string | null;
          credits_granted?: number | null;
          type: "subscription" | "renewal" | "topup";
          plan?: string | null;
          period?: string | null;
          pack_id?: string | null;
          amount_paise: number;
          currency?: string;
          status?: PaymentRecordStatus;
          refunded_at?: string | null;
          refund_id?: string | null;
          created_at?: string;
        };
        Update: {
          status?: PaymentRecordStatus;
          refunded_at?: string | null;
          refund_id?: string | null;
        };
        Relationships: [];
      };
      error_reports: {
        Row: {
          id: string;
          user_id: string | null;
          error_message: string;
          page_url: string | null;
          component: string | null;
          user_agent: string | null;
          extra_context: Record<string, unknown> | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          error_message: string;
          page_url?: string | null;
          component?: string | null;
          user_agent?: string | null;
          extra_context?: Record<string, unknown> | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      deduct_credit: {
        Args: { p_user_id: string; p_amount?: number };
        Returns: boolean;
      };
      add_credits: {
        Args: { p_user_id: string; p_amount: number };
        Returns: number;
      };
      increment_daily_usage: {
        Args: { p_field: string; p_user: string };
        Returns: number;
      };
      reset_credits_for_tier: {
        Args: { p_user_id: string; p_tier: UserTier };
        Returns: void;
      };
      reset_paid_credits_batch: {
        Args: Record<string, never>;
        Returns: { reset_count: number; expired_count: number }[];
      };
      apply_topup_payment: {
        Args: {
          p_user_id: string;
          p_razorpay_payment_id: string;
          p_pack_id?: string;
          p_credits?: number;
          p_amount_paise?: number;
          p_razorpay_order_id?: string;
        };
        Returns: string;
      };
      apply_subscription_payment: {
        Args: {
          p_user_id: string;
          p_razorpay_payment_id: string;
          p_razorpay_sub_id?: string;
          p_razorpay_order_id?: string;
          p_plan?: string;
          p_period?: string;
          p_amount_paise?: number;
        };
        Returns: string;
      };
      apply_subscription_renewal: {
        Args: {
          p_user_id: string;
          p_razorpay_payment_id: string;
          p_razorpay_sub_id?: string;
          p_amount_paise?: number;
        };
        Returns: string;
      };
      decrement_credits: {
        Args: { p_user_id: string; p_credits: number };
        Returns: number;
      };
    };
    Enums: {
      job_status: JobStatus;
      provider_type: ProviderType;
      user_tier: UserTier;
    };
  };
};
