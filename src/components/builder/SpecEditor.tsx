import { useState } from 'react'
import { CheckCircle, Plus } from 'lucide-react'
import { AIAnalysis, Specification, SpecFeature } from '../../types/platform'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

interface SpecEditorProps {
  analysis: AIAnalysis
  projectId: string
  onApprove: (spec: Specification) => void
}

export default function SpecEditor({ analysis, projectId, onApprove }: SpecEditorProps) {
  const [features, setFeatures] = useState<SpecFeature[]>(
    analysis.desired_features.map(f => ({
      name: f.name,
      description: f.description,
      priority: f.priority === 'must-have' ? 'high' : f.priority === 'nice-to-have' ? 'medium' : 'low',
      status: 'included' as const,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [newFeature, setNewFeature] = useState('')

  const toggle = (i: number) => setFeatures(prev =>
    prev.map((f, idx) => idx === i ? { ...f, status: f.status === 'included' ? 'excluded' : 'included' } : f)
  )

  const addFeature = () => {
    if (!newFeature.trim()) return
    setFeatures(prev => [...prev, { name: newFeature.trim(), description: '', priority: 'medium', status: 'included' }])
    setNewFeature('')
  }

  const approve = async () => {
    setSaving(true)
    try {
      const spec: Specification = {
        id: '', project_id: projectId,
        features,
        data_models: analysis.desired_features.filter(f => f.priority === 'must-have').map(f => ({
          table_name: f.name.toLowerCase().replace(/ /g, '_'),
          columns: [
            { name: 'id', type: 'uuid', required: true },
            { name: 'created_at', type: 'timestamptz', required: true },
          ]
        })),
        integrations: analysis.integration_requirements.map(ir => ({
          service: ir, auth_type: 'oauth', endpoints: []
        })),
        user_roles: analysis.user_roles,
        dashboards: [{ name: 'Admin Dashboard', widgets: analysis.dashboard_needs.map(d => ({ type: 'metric', title: d, data_source: '' })) }],
        approved: true,
        created_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('specifications').insert({
        project_id: projectId, features: spec.features, data_models: spec.data_models,
        integrations: spec.integrations, user_roles: spec.user_roles, dashboards: spec.dashboards, approved: true,
      })
      if (error) throw error
      await supabase.from('projects').update({ status: 'building' }).eq('id', projectId)
      toast.success('Specification approved — building your app!')
      onApprove(spec)
    } catch {
      toast.error('Failed to save specification')
    } finally {
      setSaving(false)
    }
  }

  const included = features.filter(f => f.status === 'included')
  const excluded = features.filter(f => f.status === 'excluded')

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-bold text-lg">Review Specification</h3>
          <p className="text-slate-400 text-sm mt-0.5">Toggle features on/off before building. Add custom features below.</p>
        </div>
        <button
          onClick={approve}
          disabled={saving || included.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm"
        >
          {saving ? <div className="spinner" /> : <><CheckCircle className="w-4 h-4" />Approve & Build</>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {features.map((f, i) => (
          <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${f.status === 'included' ? 'bg-[#131B2B] border-[#1E293B]' : 'bg-[#0B0F19] border-[#1E293B] opacity-50'}`}>
            <button onClick={() => toggle(i)} className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${f.status === 'included' ? 'bg-emerald-600 border-emerald-600' : 'border-[#334155]'}`}>
              {f.status === 'included' && <CheckCircle className="w-3 h-3 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-sm font-medium">{f.name}</p>
              {f.description && <p className="text-slate-500 text-xs mt-0.5">{f.description}</p>}
            </div>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
              f.priority === 'high' ? 'bg-red-900/30 text-red-400' :
              f.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
              'bg-slate-800 text-slate-400'
            }`}>{f.priority}</span>
          </div>
        ))}

        {/* Add custom feature */}
        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={newFeature}
            onChange={e => setNewFeature(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addFeature()}
            placeholder="Add a custom feature..."
            className="flex-1 bg-[#0B0F19] border border-dashed border-[#334155] text-white placeholder-slate-600 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
          <button onClick={addFeature} disabled={!newFeature.trim()} className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#1E293B] flex items-center justify-between">
        <p className="text-slate-500 text-sm">{included.length} features selected · {excluded.length} excluded</p>
        <div className="text-xs text-slate-600">Estimated build time: <span className="text-blue-400 font-semibold">~3 minutes</span></div>
      </div>
    </div>
  )
}
