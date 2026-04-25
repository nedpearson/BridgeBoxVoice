import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/appStore'
import { Project } from '../types/platform'
import { Mic, Plus, Cpu, Globe, Smartphone, Monitor, ChevronRight, Zap, Clock, Sparkles, LayoutTemplate, Search } from 'lucide-react'
import { enhancePrompt } from '../lib/anthropic'
import WorkspaceEnhancementCard from '../components/dashboard/WorkspaceEnhancementCard'
import EnhancementRequestWizard from '../components/enterprise/EnhancementRequestWizard'
import MergeWorkspaceModal from '../components/enterprise/MergeWorkspaceModal'
import TemplateGallery from '../components/templates/TemplateGallery'
import { AppTemplate } from '../data/templates'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  recording: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  analyzing: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  building: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  deployed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { workspace, setWorkspace, projects, addProject } = useStore()
  const [creating, setCreating] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIndustry, setNewIndustry] = useState('')
  const [description, setDescription] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [showWsModal, setShowWsModal] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [creatingWs, setCreatingWs] = useState(false)
  const [showEnhancementWizard, setShowEnhancementWizard] = useState(false)
  const [wizardMode, setWizardMode] = useState<'speak' | 'type' | 'upload'>('speak')
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Filtering System
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndustryFilter, setActiveIndustryFilter] = useState('All')
  
  const industries = ['All', ...new Set(projects.map(p => p.industry).filter(Boolean))] as string[]

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.industry?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
    const matchesIndustry = activeIndustryFilter === 'All' || p.industry === activeIndustryFilter
    return matchesSearch && matchesIndustry
  })

  const handleSelectTemplate = (template: AppTemplate) => {
    setShowGallery(false)
    setNewName(template.name)
    setNewIndustry(template.category.replace('fieldservice','Field Services').replace('ecommerce','E-Commerce').replace('realestate','Real Estate').replace('saas','SaaS'))
    setDescription(template.prompt)
    setShowNewModal(true)
  }

  const stats = {
    total: projects.length,
    deployed: projects.filter(p => p.status === 'deployed').length,
    building: projects.filter(p => ['building', 'analyzing', 'recording'].includes(p.status)).length,
    failed: projects.filter(p => p.status === 'failed').length,
  }

  const createProject = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      // Workspace may not be loaded yet — fetch it if needed
      let wsId = workspace?.id
      if (!wsId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id, name, plan, owner_id')
          .limit(1)
          .single()
        if (!ws) throw new Error('No workspace found — please refresh')
        wsId = ws.id
      }

      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
      }

      const { data, error } = await supabase.from('projects').insert({
        workspace_id: wsId,
        name: newName.trim(),
        industry: newIndustry.trim() || null,
        transcript: description.trim() || null,
        status: description.trim() ? 'analyzing' : 'recording',
      }).select().single()
      if (error) throw error
      addProject(data as Project)
      setShowNewModal(false)
      setNewName('')
      setNewIndustry('')
      setDescription('')
      setIsRecording(false)
      navigate(`/project/${data.id}`)
      toast.success(description.trim() ? 'Project created — analyzing voice transcript...' : 'Project created — start recording!')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const handleEnhance = async () => {
    if (!description.trim()) return
    setIsEnhancing(true)
    try {
      const rewritten = await enhancePrompt(description)
      setDescription(rewritten)
      toast.success('Description rewritten by AI')
    } catch (err: any) {
      toast.error('Failed to rewrite: ' + err.message)
    } finally {
      setIsEnhancing(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) {}
      }
      setIsRecording(false)
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        
        let startText = description
        
        recognition.onresult = (e: any) => {
          let fullTranscript = ''
          for (let i = 0; i < e.results.length; i++) {
            fullTranscript += e.results[i][0].transcript
          }
          setDescription((startText ? startText + ' ' : '') + fullTranscript)
        }
        
        recognition.onerror = (e: any) => {
          console.error('Speech recognition error', e.error)
          setIsRecording(false)
        }
        
        recognition.onend = () => {
          setIsRecording(false)
        }

        try {
          recognition.start()
          recognitionRef.current = recognition
          setIsRecording(true)
        } catch (e) {
          console.error(e)
          toast.error('Could not start microphone')
        }
      } else {
        toast.error('Voice recording not supported in this browser. Please use Chrome.')
      }
    }
  }

  const createWorkspace = async () => {
    if (!newWsName.trim()) return
    setCreatingWs(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      const { data, error } = await supabase.from('workspaces').insert({
        name: newWsName.trim(),
        owner_id: user.id,
        plan: 'starter'
      }).select().single()
      
      if (error) throw error
      setWorkspace(data as any)
      setShowWsModal(false)
      setNewWsName('')
      toast.success('Workspace created')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create workspace')
    } finally {
      setCreatingWs(false)
    }
  }

  return (
    <div className="p-8 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {workspace ? workspace.name : 'Dashboard'}
            </h1>
            <button 
              onClick={() => setShowWsModal(true)}
              className="text-[11px] uppercase tracking-wider font-bold bg-[#1E293B]/50 hover:bg-[#1E293B] text-slate-300 px-3 py-1.5 rounded-xl transition-colors border border-[#334155]/50 hover:border-[#334155]"
            >
              + Create Workspace
            </button>
          </div>
          <p className="text-slate-400 mt-1 text-sm">Build software with your voice — describe, capture, deploy.</p>
        </div>
      </div>

      {workspace && (
        <WorkspaceEnhancementCard
          onSpeak={() => { setWizardMode('speak'); setShowEnhancementWizard(true) }}
          onType={() => { setWizardMode('type'); setShowEnhancementWizard(true) }}
          onUpload={() => { setWizardMode('upload'); setShowEnhancementWizard(true) }}
          onMerge={() => setShowMergeModal(true)}
          onViewQueue={() => navigate('/enterprise')}
        />
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Projects', value: stats.total, icon: Cpu, color: 'text-blue-400' },
          { label: 'Deployed Live', value: stats.deployed, icon: Globe, color: 'text-emerald-400' },
          { label: 'Building', value: stats.building, icon: Zap, color: 'text-yellow-400' },
          { label: 'Failed Builds', value: stats.failed, icon: Clock, color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-sm">{label}</p>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-4 p-5 bg-[#131B2B] hover:bg-[#162035] border border-[#1E293B] hover:border-blue-500/30 rounded-2xl transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center flex-shrink-0">
            <Mic className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">New Voice Project</p>
            <p className="text-slate-500 text-xs mt-0.5">Describe your app by speaking</p>
          </div>
        </button>
        <button
          onClick={() => setShowGallery(true)}
          className="flex items-center gap-4 p-5 bg-gradient-to-r from-purple-900/20 to-blue-900/20 hover:from-purple-900/30 hover:to-blue-900/30 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center flex-shrink-0">
            <LayoutTemplate className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Browse Templates</p>
            <p className="text-slate-500 text-xs mt-0.5">40+ industry app templates</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/marketplace')}
          className="flex items-center gap-4 p-5 bg-[#131B2B] hover:bg-[#162035] border border-[#1E293B] hover:border-emerald-500/30 rounded-2xl transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Integrations</p>
            <p className="text-slate-500 text-xs mt-0.5">Connect APIs & services</p>
          </div>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="border-2 border-dashed border-[#1E293B] rounded-2xl p-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center mb-4">
            <Mic className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">No projects yet</h3>
          <p className="text-slate-500 max-w-sm text-sm mb-6">Describe your business needs with your voice and Bridgebox Voice AI will build the software for you.</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button onClick={() => setShowNewModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
              <Plus className="w-4 h-4" />
              New Project
            </button>
            <button onClick={() => setShowGallery(true)} className="flex items-center gap-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
              <LayoutTemplate className="w-4 h-4" />
              Browse Templates
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Your Workspace Projects</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#0B0F19] border border-[#1E293B] text-slate-300 text-sm rounded-lg pl-9 pr-4 py-2 w-64 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
          
          {/* Industry Tags */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {industries.map(ind => (
              <button
                key={ind}
                onClick={() => setActiveIndustryFilter(ind)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  activeIndustryFilter === ind 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-[#131B2B] border-[#1E293B] text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/project/${project.id}`)}
                className="bg-[#131B2B] border border-[#1E293B] hover:border-[#334155] hover:bg-[#1A2235] rounded-2xl p-5 cursor-pointer transition-all group relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <Cpu className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border capitalize ${STATUS_COLORS[project.status]}`}>
                    {project.status}
                  </span>
                </div>
                <h3 className="text-white font-semibold text-base mb-1 truncate">{project.name}</h3>
                {project.industry && <p className="text-slate-500 text-xs mb-3">{project.industry}</p>}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {project.web_app_url && <Globe className="w-4 h-4 text-emerald-400" />}
                    {project.mobile_app_url && <Smartphone className="w-4 h-4 text-blue-400" />}
                    {project.desktop_app_url && <Monitor className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-xs">{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
                    <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
            {/* Quick add card */}
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-[#131B2B]/50 border-2 border-dashed border-[#1E293B] hover:border-blue-600/50 rounded-2xl p-5 transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/5 group-hover:bg-blue-600/10 border border-blue-600/20 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-slate-500 group-hover:text-slate-300 text-sm font-medium transition-colors">New Project</p>
            </button>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewModal(false)}>
          <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-lg">New Voice Project</h3>
              <button
                onClick={() => setShowGallery(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-xl text-xs font-semibold transition-all"
              >
                <LayoutTemplate size={12} /> Browse Templates
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-5">Give it a name, then describe your needs by voice.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                  placeholder="e.g. Landscaping Business App"
                  className="w-full bg-[#0B0F19] border border-[#334155] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Industry (optional)</label>
                <input
                  type="text"
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  placeholder="e.g. Field Services, Healthcare, Retail"
                  className="w-full bg-[#0B0F19] border border-[#334155] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Description / Transcript</label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleEnhance}
                      disabled={isEnhancing || !description.trim()}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${isEnhancing ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse' : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isEnhancing ? 'Rewriting...' : 'Rewrite via AI'}
                    </button>
                    <button 
                      onClick={toggleRecording}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/30' : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'}`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      {isRecording ? 'Listening...' : 'Dictate'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the software you need built. Click 'Dictate' to type as you talk..."
                  rows={4}
                  className="w-full bg-[#0B0F19] border border-[#334155] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => { 
                  setShowNewModal(false)
                  if (isRecording && recognitionRef.current) {
                    try { recognitionRef.current.stop() } catch (e) {}
                    setIsRecording(false)
                  }
                }} 
                className="flex-1 py-2.5 rounded-xl border border-[#334155] text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProject}
                disabled={creating || !newName.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {creating ? <div className="spinner" /> : <><Cpu className="w-4 h-4" />Create Project</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {workspace && showEnhancementWizard && (
        <EnhancementRequestWizard
          workspace={workspace}
          initialMode={wizardMode}
          onClose={() => setShowEnhancementWizard(false)}
        />
      )}

      {workspace && showMergeModal && (
        <MergeWorkspaceModal
          targetWorkspace={workspace}
          onClose={() => setShowMergeModal(false)}
        />
      )}

      {/* New Workspace Modal */}
      {showWsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowWsModal(false)}>
          <div className="bg-[#131B2B] border border-[#1E293B] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-1">Create Workspace</h3>
            <p className="text-slate-400 text-sm mb-5">Set up a new isolated environment for another business or department.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Workspace Name *</label>
                <input
                  autoFocus
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-[#0B0F19] border border-[#334155] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-600"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowWsModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#334155] text-slate-400 hover:text-white hover:border-slate-500 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createWorkspace}
                disabled={creatingWs || !newWsName.trim()}
                className="flex-[2] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {creatingWs ? <div className="spinner" /> : 'Create Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}\n
      {showGallery && (
        <TemplateGallery
          onSelect={handleSelectTemplate}
          onClose={() => setShowGallery(false)}
        />
      )}
    </div>
  )
}
