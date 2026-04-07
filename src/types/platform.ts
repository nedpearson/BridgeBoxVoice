// ============================================================
// Bridgebox Voice – Platform TypeScript Interfaces
// ============================================================

export type PlanTier = 'starter' | 'professional' | 'business' | 'enterprise'
export type ProjectStatus = 'recording' | 'analyzing' | 'building' | 'deployed' | 'failed'
export type Platform = 'web' | 'ios' | 'android' | 'windows' | 'mac' | 'linux'
export type IntegrationStatus = 'connected' | 'disconnected' | 'error'
export type DeploymentStatus = 'building' | 'live' | 'failed'
export type CaptureType = 'screenshot' | 'video' | 'flow'

// ─── Auth ────────────────────────────────────────────────────
export interface UserProfile {
  id: string
  full_name: string | null
  company_name: string | null
  industry: string | null
  avatar_url: string | null
  created_at: string
}

// ─── Workspace ───────────────────────────────────────────────
export interface Workspace {
  id: string
  owner_id: string
  name: string
  logo_url: string | null
  plan: PlanTier
  created_at: string
}

// ─── Project ─────────────────────────────────────────────────
export interface Project {
  id: string
  workspace_id: string
  name: string
  description: string | null
  industry: string | null
  status: ProjectStatus
  github_repo_url: string | null
  web_app_url: string | null
  mobile_app_url: string | null
  desktop_app_url: string | null
  created_at: string
  updated_at: string
}

// ─── Voice Recording ─────────────────────────────────────────
export interface Recording {
  id: string
  project_id: string
  user_id: string
  file_path: string | null
  duration_seconds: number | null
  transcript: string | null
  ai_analysis: AIAnalysis | null
  created_at: string
}

export interface AIAnalysis {
  business_type: string
  industry: string
  current_tools: string[]
  desired_features: DesiredFeature[]
  user_roles: UserRole[]
  integration_requirements: string[]
  dashboard_needs: string[]
  platform_preference: Platform[]
  clarifying_questions: string[]
  summary: string
}

export interface DesiredFeature {
  name: string
  description: string
  priority: 'must-have' | 'nice-to-have' | 'future'
}

export interface UserRole {
  name: string
  permissions: string[]
}

// ─── Screen Capture ───────────────────────────────────────────
export interface Capture {
  id: string
  project_id: string
  user_id: string
  type: CaptureType
  file_path: string | null
  url_captured: string | null
  dom_snapshot: object | null
  network_logs: object | null
  ai_analysis: object | null
  created_at: string
}

// ─── Specification ───────────────────────────────────────────
export interface Specification {
  id: string
  project_id: string
  features: SpecFeature[]
  data_models: DataModel[]
  integrations: IntegrationSpec[]
  user_roles: UserRole[]
  dashboards: DashboardSpec[]
  approved: boolean
  created_at: string
}

export interface SpecFeature {
  name: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status: 'included' | 'excluded'
}

export interface DataModel {
  table_name: string
  columns: { name: string; type: string; required: boolean }[]
}

export interface IntegrationSpec {
  service: string
  auth_type: string
  endpoints: string[]
}

export interface DashboardSpec {
  name: string
  widgets: { type: string; title: string; data_source: string }[]
}

// ─── Code Versions ────────────────────────────────────────────
export interface CodeVersion {
  id: string
  project_id: string
  version_number: string
  commit_sha: string | null
  files: { path: string; content: string }[]
  changelog: string | null
  deployed: boolean
  created_at: string
}

// ─── Integration ─────────────────────────────────────────────
export interface ProjectIntegration {
  id: string
  project_id: string
  service_name: string
  auth_type: string | null
  credentials: object | null
  config: object | null
  status: IntegrationStatus
  last_sync_at: string | null
  created_at: string
}

// ─── Deployment ──────────────────────────────────────────────
export interface Deployment {
  id: string
  project_id: string
  platform: Platform
  version_number: string | null
  url: string | null
  status: DeploymentStatus
  build_logs: string | null
  deployed_at: string
}

// ─── Analytics ───────────────────────────────────────────────
export interface AppAnalytic {
  id: string
  project_id: string
  metric_name: string
  value: number
  metadata: object | null
  recorded_at: string
}

// ─── Subscription ─────────────────────────────────────────────
export interface Subscription {
  id: string
  workspace_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: PlanTier
  status: string
  current_period_end: string | null
  created_at: string
}

// ─── UI / Marketplace ─────────────────────────────────────────
export interface IntegrationCatalogItem {
  id: string
  name: string
  category: 'accounting' | 'crm' | 'communication' | 'calendar' | 'payment' | 'storage' | 'ecommerce' | 'analytics' | 'hr' | 'custom'
  description: string
  logoUrl: string
  authType: 'oauth' | 'api_key'
  docsUrl: string
}

// ─── Store ────────────────────────────────────────────────────
export interface AppStore {
  workspace: Workspace | null
  projects: Project[]
  activeProject: Project | null
  setWorkspace: (w: Workspace) => void
  setProjects: (ps: Project[]) => void
  setActiveProject: (p: Project | null) => void
}

// ─── Enhancement Studio ─────────────────────────────────────────
export type EnhancementStatus = 'draft' | 'submitted' | 'analyzing' | 'ready_for_review' | 'approved' | 'rejected' | 'ready_to_apply' | 'applied' | 'failed'
export type MergeBatchStatus = 'draft' | 'previewed' | 'conflict_detected' | 'approved' | 'applied' | 'partially_applied' | 'failed' | 'rolled_back'

export interface EnhancementRequest {
  id: string
  workspace_id: string
  created_by: string
  title: string
  request_type: 'speak' | 'type' | 'upload' | 'merge'
  status: EnhancementStatus
  original_prompt: string | null
  structured_request: any | null
  analysis_summary: string | null
  recommendations: any | null
  dependency_summary: any | null
  conflict_summary: any | null
  approval_status: string
  applied_at: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceAsset {
  id: string
  workspace_id: string
  asset_type: 'feature' | 'workflow' | 'form' | 'ui_module' | 'automation' | 'prompt'
  name: string
  description: string | null
  definition: any
  dependencies: any[]
  created_at: string
  updated_at: string
}

export interface TransferBatch {
  id: string
  source_workspace_id: string
  target_workspace_id: string
  created_by: string
  status: MergeBatchStatus
  created_at: string
  updated_at: string
}

export interface TransferItem {
  id: string
  batch_id: string
  asset_id: string
  action: 'create' | 'update' | 'skip' | 'clone'
  status: 'pending' | 'applied' | 'failed' | 'skipped' | 'conflict'
  conflict_details: any | null
  created_at: string
}

