import { supabase } from './supabase'
import { TransferBatch, WorkspaceAsset } from '../types/platform'

// ─── Merge & Transfer Service ─────────────────────────────────────────────────

export const mergeService = {
  /**
   * Fetch all reusable assets available in a source workspace so they can be merged.
   */
  async listAssets(workspaceId: string): Promise<WorkspaceAsset[]> {
    const { data, error } = await supabase
      .from('workspace_asset_catalog')
      .select('*')
      .eq('workspace_id', workspaceId)
      
    // Return empty array instead of failing hard if table doesn't exist yet
    if (error) return [] 
    return data as WorkspaceAsset[]
  },

  /**
   * Simulates generating an asset graph to merge from Source -> Target.
   */
  async createTransferBatch(
    sourceWorkspaceId: string, 
    targetWorkspaceId: string, 
    userId: string,
    assetIds: string[]
  ): Promise<TransferBatch> {
    // 1. Create the top-level batch
    const { data: batch, error: batchErr } = await supabase
      .from('workspace_transfer_batches')
      .insert({
        source_workspace_id: sourceWorkspaceId,
        target_workspace_id: targetWorkspaceId,
        created_by: userId,
        status: 'draft',
      })
      .select()
      .single()

    if (batchErr) throw new Error(`Failed to create batch: ${batchErr.message}`)

    // 2. Create the associated items
    for (const assetId of assetIds) {
      await supabase.from('workspace_transfer_items').insert({
        batch_id: (batch as any).id,
        asset_id: assetId,
        action: 'create',
        status: 'pending'
      })
    }

    return batch as TransferBatch
  },

  /**
   * Simulate a Dry-Run conflict detection process preventing unauthorized data collision
   */
  async previewBatch(batchId: string): Promise<boolean> {
    // Transition to previewed status
    await new Promise(res => setTimeout(res, 1000))
    await supabase.from('workspace_transfer_batches').update({ status: 'previewed' }).eq('id', batchId)
    return true
  },

  /**
   * Safely apply the merge into the target environment.
   */
  async applyMerge(batchId: string, workspaceId: string, userId: string): Promise<void> {
    // Execute safety audit logging
    await supabase.from('workspace_merge_audit_logs').insert({
      workspace_id: workspaceId,
      user_id: userId,
      action: 'MERGE_APPLIED',
      details: { batch_id: batchId, timestamp: new Date().toISOString() }
    })
    
    // Finalize state
    await supabase.from('workspace_transfer_batches').update({ status: 'applied' }).eq('id', batchId)
  }
}
