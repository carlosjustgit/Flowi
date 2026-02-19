// Database table types

export interface Project {
  id: string;
  client_name: string;
  language: 'pt' | 'en';
  created_at: string;
}

export interface Artifact {
  id: string;
  project_id: string;
  type: string; // onboarding_report, strategy_pack_json, strategy_pack_md, kb_file, etc.
  format: string; // json, md, txt
  title: string | null;
  content: string | null;
  content_json: any | null;
  file_url: string | null;
  version: number;
  created_at: string;
}

export interface Job {
  id: string;
  project_id: string;
  type: string; // research, kb_packager, reporting
  status: string; // queued, running, needs_approval, done, failed
  input_artifact_id: string | null;
  output_artifact_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  project_id: string;
  artifact_id: string;
  status: string; // pending, approved, rejected
  notes: string | null;
  created_at: string;
}

export interface Run {
  id: string;
  job_id: string;
  model: string;
  tokens_in: number | null;
  tokens_out: number | null;
  cost_estimate: number | null;
  duration_ms: number | null;
  created_at: string;
}

// Insert types (without auto-generated fields)
export type ProjectInsert = Omit<Project, 'id' | 'created_at'>;
export type ArtifactInsert = Omit<Artifact, 'id' | 'created_at' | 'version'> & { version?: number };
export type JobInsert = Omit<Job, 'id' | 'created_at' | 'updated_at'>;
export type ApprovalInsert = Omit<Approval, 'id' | 'created_at'>;
export type RunInsert = Omit<Run, 'id' | 'created_at'>;

// Update types (partial, excluding id and timestamps)
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'created_at'>>;
export type ArtifactUpdate = Partial<Omit<Artifact, 'id' | 'created_at' | 'project_id'>>;
export type JobUpdate = Partial<Omit<Job, 'id' | 'created_at' | 'project_id'>>;
export type ApprovalUpdate = Partial<Omit<Approval, 'id' | 'created_at' | 'project_id' | 'artifact_id'>>;

// Strategy pack schema type (from JSON schema)
export interface StrategyPack {
  company_summary: string;
  goals_and_constraints: {
    goals: string[];
    constraints: string[];
  };
  ideal_customer_profiles: Array<{
    name: string;
    pain_points: string[];
    desired_outcomes: string[];
    buying_triggers: string[];
  }>;
  segments_and_priorities: Array<{
    segment: string;
    priority: number;
    notes: string;
  }>;
  value_proposition: string;
  positioning_statement: string;
  competitors: Array<{
    name: string;
    notes: string;
  }>;
  differentiation_points: string[];
  messaging_pillars: string[];
  content_themes: string[];
  content_series_ideas: string[];
  tone_of_voice_guidelines: {
    do: string[];
    avoid: string[];
    examples: string[];
  };
  compliance_and_claims_rules: {
    allowed: string[];
    not_allowed: string[];
    needs_proof: string[];
  };
  CTA_patterns: string[];
  suggested_content_mix_by_channel: {
    linkedin: string;
    instagram: string;
    facebook: string;
    x: string;
  };
  assumptions: string[];
  unknowns_and_questions: string[];
}

// KB files schema type (from JSON schema)
export interface KBFile {
  filename: string;
  title: string;
  format: string; // md, txt
  content: string;
}
