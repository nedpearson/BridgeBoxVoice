import { supabase } from './supabase'
import { EnhancementRequest, EnhancementStatus } from '../types/platform'

// ─── Enhancement Service ──────────────────────────────────────────────────────

export const enhancementService = {
  /**
   * Submit a new raw enhancement request to the platform.
   */
  async createRequest(
    workspaceId: string,
    _userId: string, // kept for API compat; resolved from session internally
    payload: { title: string; request_type: 'speak' | 'type' | 'upload' | 'merge'; original_prompt?: string }
  ): Promise<EnhancementRequest> {
    const { data: { session } } = await supabase.auth.getSession()
    const resolvedUserId = session?.user?.id ?? null

    const { data, error } = await supabase
      .from('enhancement_requests')
      .insert({
        workspace_id: workspaceId,
        created_by: resolvedUserId,
        title: payload.title,
        request_type: payload.request_type,
        original_prompt: payload.original_prompt || null,
        status: 'submitted',
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create enhancement request: ${error.message}`)
    return data as EnhancementRequest
  },

  /**
   * List all enhancements scoped to a specific workspace.
   */
  async listRequests(workspaceId: string): Promise<EnhancementRequest[]> {
    const { data, error } = await supabase
      .from('enhancement_requests')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      
    if (error) throw new Error(`Failed to list enhancements: ${error.message}`)
    return (data || []) as EnhancementRequest[]
  },

  /**
   * Simulates an AI background pipeline that transcribes, parses workflows,
   * and outputs a structured enhancement brief.
   */
  async runAIAnalysis(requestId: string, rawPrompt: string | null): Promise<EnhancementRequest> {
    // 1. Transition to analyzing state
    await supabase
      .from('enhancement_requests')
      .update({ status: 'analyzing' })
      .eq('id', requestId)

    // 2. Simulate heavy AI processing latency
    await new Promise(resolve => setTimeout(resolve, 2500))

    // 3. Generate structured output based on the raw text
    const structured_request = {
      detected_entities: ['Dashboard', 'Approval Flow', 'API Endpoint'],
      complexity: 'medium',
      estimated_hours: 4.5,
      features: [
        { name: 'UI Update', description: 'Adding data cards to the requested view.' },
        { name: 'Workflow Logic', description: 'Tying the data cards to the approval tables.' }
      ]
    }
    
    const recommendations = {
      isolation_risk: 'Low',
      architecture_notes: 'Will cleanly integrate without touching core RBAC.',
      suggested_reusable_assets: ['Standard DataTable V2']
    }

    const { data, error } = await supabase
      .from('enhancement_requests')
      .update({
        status: 'ready_for_review',
        structured_request,
        analysis_summary: `AI has successfully parsed your request for "${rawPrompt?.substring(0, 30)}...". Found 2 key features to build.`,
        recommendations,
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw new Error(`AI Analysis failed: ${error.message}`)
    return data as EnhancementRequest
  },

  /**
   * Transition an enhancement status (e.g. Approve, Reject).
   */
  async updateStatus(requestId: string, status: EnhancementStatus): Promise<void> {
    const { error } = await supabase
      .from('enhancement_requests')
      .update({ status })
      .eq('id', requestId)

    if (error) throw new Error(`Failed to update status: ${error.message}`)
  }
}
