import { useState } from 'react'
import {
  Wand2, Sparkles, Smartphone, Paintbrush, Rocket, Layout,
  RefreshCw, Check, Code2, Copy, Save, Layers
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  generatePage,
  redesignPage,
  auditPage,
  getModePrompt,
  ArchitectMode,
  PROMPT_LIBRARY
} from '../lib/agents/layoutArchitect'
import { useStore } from '../store/appStore'

export default function LayoutArchitectPage() {
  const [mode, setMode] = useState<ArchitectMode>('generate')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Results
  const [generatedCode, setGeneratedCode] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [auditResult, setAuditResult] = useState<any>(null)
  
  const { projects } = useStore()
  
  // App Projects Context
  const availableProjects = projects.length > 0 ? projects.map(p => p.name) : ['Demo Project']
  const [selectedProject, setSelectedProject] = useState(availableProjects[0])
  
  // Simulated file content for redesign (in a real app, you'd read the file)
  const [fileContent, setFileContent] = useState('// React component code goes here...')

  const handleGenerate = async () => {
    if (!prompt.trim() && mode === 'generate') {
      toast.error('Please enter a description for the new page.')
      return
    }

    setLoading(true)
    setGeneratedCode('')
    setAuditResult(null)
    
    try {
      const modeInstruction = getModePrompt(mode)
      let result;
      
      if (mode === 'generate') {
        toast.loading('Generating world-class layout...', { id: 'architect' })
        result = await generatePage(prompt)
      } else {
        toast.loading(`Applying ${mode} optimizations...`, { id: 'architect' })
        result = await redesignPage(selectedProject, fileContent, `${modeInstruction}. User prompt: ${prompt}`)
      }
      setGeneratedCode(result.code)
      setShowPreview(true)
      
      // Run audit on the new code
      toast.loading('Auditing new design...', { id: 'architect' })
      const audit = await auditPage(result.title, result.code)
      setAuditResult(audit)
      
      toast.success('Design complete!', { id: 'architect' })
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate layout', { id: 'architect' })
    } finally {
      setLoading(false)
    }
  }

  const applyChanges = () => {
    // In a real environment with filesystem access (like the Node/Vite backend),
    // this would write the file. For now, we simulate it.
    toast.success('Changes applied to codebase!')
    setFileContent(generatedCode)
    setShowPreview(false)
  }

  const rollbackChanges = () => {
    setGeneratedCode('')
    setShowPreview(false)
    toast('Rolled back to original code', { icon: '↩️' })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">
              <Sparkles className="text-indigo-400 w-6 h-6" />
            </div>
            AI Layout Architect
          </h1>
          <p className="text-slate-400 mt-1">
            Generate, redesign, and optimize premium SaaS interfaces instantly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Controls */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Mode Selector */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Operation Mode</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'generate', label: 'Generate New', icon: Layout },
                { id: 'redesign', label: 'Redesign', icon: Wand2 },
                { id: 'beautify', label: 'Beautify', icon: Paintbrush },
                { id: 'mobile', label: 'Mobile Fix', icon: Smartphone },
                { id: 'brand', label: 'Brand Sync', icon: Layers },
                { id: 'conversion', label: 'Conversion', icon: Rocket },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as ArchitectMode)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    mode === m.id
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400'
                      : 'bg-[#131b2b] border-[#1e293b] text-slate-400 hover:bg-[#1e293b]'
                  }`}
                >
                  <m.icon size={18} className="mb-2" />
                  <span className="text-xs font-medium">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Area */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
            {mode !== 'generate' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Target Project
                </label>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  className="w-full bg-[#131b2b] border border-[#1e293b] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  {availableProjects.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            )}
            
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Instruction Prompt
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={
                mode === 'generate'
                  ? "Describe the page you want to build (e.g., 'A luxury analytics dashboard with dark mode charts')"
                  : "How should we improve this page?"
              }
              className="w-full h-32 bg-[#131b2b] border border-[#1e293b] rounded-xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none mb-4"
            />
            
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              {loading ? 'Architecting...' : mode === 'generate' ? 'Generate Layout' : 'Apply AI Optimization'}
            </button>
          </div>

          {/* Prompt Library */}
          {mode === 'generate' && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Inspiration</h2>
              <div className="space-y-4">
                {PROMPT_LIBRARY.slice(0,2).map(cat => (
                  <div key={cat.category}>
                    <h3 className="text-xs font-medium text-slate-500 mb-2">{cat.category}</h3>
                    <div className="space-y-2">
                      {cat.prompts.slice(0,2).map(p => (
                        <button
                          key={p}
                          onClick={() => setPrompt(p)}
                          className="text-left w-full p-2.5 rounded-lg bg-[#131b2b] hover:bg-[#1e293b] border border-[#1e293b] text-xs text-slate-300 transition-colors"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Preview & Audit */}
        <div className="lg:col-span-2 space-y-6">
          
          {showPreview ? (
            <>
              {/* Actions */}
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Check size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">New Design Ready</h3>
                    <p className="text-emerald-400 text-sm">Review the code and audit scores below before applying.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={rollbackChanges} className="px-4 py-2 text-slate-400 hover:text-white bg-[#1e293b] hover:bg-[#334155] rounded-xl text-sm font-medium transition-colors">
                    Cancel & Rollback
                  </button>
                  <button onClick={applyChanges} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-900/20">
                    <Save size={16} /> Apply Changes
                  </button>
                </div>
              </div>

              {/* Audit Scores */}
              {auditResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Overall Quality', score: auditResult.overall, color: 'text-indigo-400' },
                    { label: 'Beauty & UI', score: auditResult.beauty, color: 'text-pink-400' },
                    { label: 'Mobile Ready', score: auditResult.mobileQuality, color: 'text-blue-400' },
                    { label: 'UX & Conv.', score: (auditResult.uxFriction + auditResult.conversionReadiness)/2, color: 'text-emerald-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-4 text-center">
                      <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.score}</div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Code Diff / Viewer */}
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl overflow-hidden flex flex-col" style={{ height: '600px' }}>
                <div className="flex items-center justify-between px-4 py-3 bg-[#131b2b] border-b border-[#1e293b]">
                  <div className="flex items-center gap-2">
                    <Code2 className="text-slate-400 w-4 h-4" />
                    <span className="text-sm font-mono text-slate-300">GeneratedComponent.tsx</span>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(generatedCode)} className="text-slate-500 hover:text-white transition-colors">
                    <Copy size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <pre className="text-xs font-mono text-slate-300 leading-relaxed">
                    {generatedCode}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full min-h-[600px] border-2 border-dashed border-[#1e293b] rounded-3xl flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-[#0f172a] rounded-full flex items-center justify-center mb-6">
                <Layout className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No active preview</h3>
              <p className="text-slate-500 max-w-md">
                Select an operation mode, describe your desired UI, and the AI Architect will generate a premium, production-ready React component.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
