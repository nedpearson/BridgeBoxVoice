import { supabase } from '../supabase'
// Import other specialized agents here as needed...
// Import other specialized agents here as needed...

export type PipelineStageName = 
  | 'Intake' | 'Analysis' | 'Spec' | 'Schema' | 'Architecture' 
  | 'Design' | 'Screens' | 'Backend' | 'Integrations' | 'QA' 
  | 'Preview' | 'Deploy' | 'Monitor'

export interface PipelineStage {
  id?: string
  stage_name: PipelineStageName
  stage_index: number
  status: 'pending' | 'running' | 'done' | 'warning' | 'failed' | 'skipped'
  agent_name: string
  progress_pct: number
  started_at?: string
  completed_at?: string
  retry_count: number
  error_message?: string
}

export interface PipelineRun {
  id: string
  project_id: string
  status: 'running' | 'paused' | 'failed' | 'completed'
  current_stage_index: number
  total_stages: number
  stages: PipelineStage[]
}

const STAGES: { name: PipelineStageName; agent: string }[] = [
  { name: 'Intake', agent: 'Intake Agent' },
  { name: 'Analysis', agent: 'AI Analysis Agent' },
  { name: 'Spec', agent: 'Product Architect Agent' },
  { name: 'Schema', agent: 'Data Architect Agent' },
  { name: 'Architecture', agent: 'Backend/API Agent' },
  { name: 'Design', agent: 'AI Layout Architect' },
  { name: 'Screens', agent: 'Screen Builder Agent' },
  { name: 'Backend', agent: 'Backend/API Agent' },
  { name: 'Integrations', agent: 'Integration Agent' },
  { name: 'QA', agent: 'QA Agent' },
  { name: 'Preview', agent: 'Deployment Agent' },
  { name: 'Deploy', agent: 'Deployment Agent' },
  { name: 'Monitor', agent: 'Monitoring Agent' }
]

export class PipelineEngine {
  private runId: string
  private onStageUpdate: (stages: PipelineStage[]) => void

  constructor(runId: string, _projectId: string, onStageUpdate: (stages: PipelineStage[]) => void) {
    this.runId = runId
    this.onStageUpdate = onStageUpdate
  }

  static async initializePipeline(projectId: string): Promise<PipelineRun> {
    // Create run
    const { data: run, error: runErr } = await supabase
      .from('project_pipeline_runs')
      .insert({ project_id: projectId, total_stages: STAGES.length })
      .select()
      .single()
    if (runErr) throw runErr

    // Create stages
    const stagesToInsert = STAGES.map((s, i) => ({
      run_id: run.id,
      stage_name: s.name,
      stage_index: i + 1,
      status: 'pending',
      agent_name: s.agent,
      progress_pct: 0
    }))
    
    const { data: stages, error: stagesErr } = await supabase
      .from('pipeline_stages')
      .insert(stagesToInsert)
      .select()
      .order('stage_index', { ascending: true })
    if (stagesErr) throw stagesErr

    return {
      ...run,
      stages: stages || []
    }
  }

  async runStage(stageIndex: number, _context: any = {}): Promise<void> {
    const stage = STAGES[stageIndex - 1]
    await this.updateStage(stageIndex, { status: 'running', progress_pct: 10, started_at: new Date().toISOString() })
    
    try {
      // 1. Log Start
      await this.log(stageIndex, 'info', `Starting stage: ${stage.name}`)

      // 2. Execute agent logic
      switch (stage.name) {
        case 'Intake':
          await this.simulateAgent(stageIndex, 2000)
          break;
        case 'Analysis':
          await this.simulateAgent(stageIndex, 3000)
          break;
        case 'Spec':
          await this.simulateAgent(stageIndex, 4000)
          break;
        case 'Schema':
          await this.simulateAgent(stageIndex, 2500)
          break;
        case 'Architecture':
          await this.simulateAgent(stageIndex, 2000)
          break;
        case 'Design':
          await this.simulateAgent(stageIndex, 5000)
          break;
        case 'Screens':
          await this.simulateAgent(stageIndex, 6000)
          break;
        case 'Backend':
          await this.simulateAgent(stageIndex, 3000)
          break;
        case 'Integrations':
          await this.simulateAgent(stageIndex, 2000)
          break;
        case 'QA':
          await this.simulateAgent(stageIndex, 4000)
          break;
        case 'Preview':
          await this.simulateAgent(stageIndex, 1000)
          break;
        case 'Deploy':
          await this.simulateAgent(stageIndex, 5000)
          break;
        case 'Monitor':
          await this.simulateAgent(stageIndex, 1000)
          break;
      }

      // 3. Mark Done
      await this.updateStage(stageIndex, { status: 'done', progress_pct: 100, completed_at: new Date().toISOString() })
      await this.log(stageIndex, 'success', `Completed stage: ${stage.name}`)

    } catch (e: any) {
      await this.updateStage(stageIndex, { status: 'failed', error_message: e.message })
      await this.log(stageIndex, 'error', `Failed stage: ${stage.name} - ${e.message}`)
      throw e
    }
  }

  private async simulateAgent(stageIndex: number, ms: number) {
    const steps = 10
    const stepMs = ms / steps
    for(let i=1; i<=steps; i++) {
      await new Promise(r => setTimeout(r, stepMs))
      await this.updateStage(stageIndex, { progress_pct: 10 + (i * 9) })
    }
  }

  private async updateStage(stageIndex: number, updates: Partial<PipelineStage>) {
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .update(updates)
      .eq('run_id', this.runId)
      .eq('stage_index', stageIndex)
      .select()
      .order('stage_index', { ascending: true })
    
    if (stages) {
      this.onStageUpdate(stages)
    }
  }

  private async log(stageIndex: number, level: string, message: string) {
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('run_id', this.runId)
      .eq('stage_index', stageIndex)
      .single()
      
    if (stage) {
      await supabase.from('pipeline_logs').insert({
        stage_id: stage.id,
        log_level: level,
        message
      })
    }
  }
}
