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
   * AI background pipeline that transcribes, parses workflows,
   * and outputs a structured enhancement brief using Claude.
   */
  async runAIAnalysis(requestId: string, rawPrompt: string | null): Promise<EnhancementRequest> {
    // 1. Transition to analyzing state
    await supabase
      .from('enhancement_requests')
      .update({ status: 'analyzing' })
      .eq('id', requestId)

    try {
      const { callClaude } = await import('./anthropic')
      
      const SYSTEM_PROMPT = `You are an expert software architect analyzing an enhancement request for a business software platform.
Given the user's raw prompt describing what they want changed or added, respond ONLY with a JSON object in this exact format:
{
  "structured_request": {
    "detected_entities": ["Dashboard", "Approval Flow", "API Endpoint", ...],
    "complexity": "low" | "medium" | "high",
    "estimated_hours": number,
    "features": [
      { "name": "Feature Name", "description": "What it does" }
    ]
  },
  "recommendations": {
    "isolation_risk": "Low" | "Medium" | "High",
    "architecture_notes": "Notes on how to integrate",
    "suggested_reusable_assets": ["Asset name 1", "Asset name 2"]
  },
  "analysis_summary": "A 1-2 sentence human-readable summary of what you found."
}
No markdown, no explanation, only valid JSON.`

      const aiResponse = await callClaude(SYSTEM_PROMPT, `User Request:\n\n${rawPrompt || 'No prompt provided'}`)
      const parsed = JSON.parse(aiResponse)

      const { data, error } = await supabase
        .from('enhancement_requests')
        .update({
          status: 'ready_for_review',
          structured_request: parsed.structured_request,
          analysis_summary: parsed.analysis_summary,
          recommendations: parsed.recommendations,
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw new Error(`DB update failed: ${error.message}`)
      return data as EnhancementRequest

    } catch (err: any) {
      await supabase.from('enhancement_requests').update({ status: 'failed' }).eq('id', requestId)
      throw new Error(`AI Analysis failed: ${err.message}`)
    }
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
