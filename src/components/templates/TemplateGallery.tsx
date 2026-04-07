import { useState } from 'react'
import { Search, X, Zap, Star, Building2 } from 'lucide-react'
import { TEMPLATES, TEMPLATE_CATEGORIES, AppTemplate } from '../../data/templates'

const COMPLEXITY_STYLES: Record<string, string> = {
  Starter: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Pro:     'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Enterprise: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const COMPLEXITY_ICONS: Record<string, React.FC<any>> = {
  Starter: Zap,
  Pro:     Star,
  Enterprise: Building2,
}

interface TemplateGalleryProps {
  onSelect: (template: AppTemplate) => void
  onClose: () => void
}

export default function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  const filtered = TEMPLATES.filter(t => {
    const matchCat = activeCategory === 'all' || t.category === activeCategory
    const q = search.toLowerCase()
    const matchSearch = !q ||
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#0C1322] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col"
        style={{ width: '92vw', maxWidth: 1100, height: '88vh', maxHeight: 850 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Template Gallery</h2>
            <p className="text-slate-500 text-xs mt-0.5">{TEMPLATES.length}+ curated app templates across {TEMPLATE_CATEGORIES.length - 1} industries</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="bg-[#131B2B] border border-[#334155] text-white text-sm rounded-xl pl-9 pr-4 py-2 w-56 focus:outline-none focus:border-blue-500 placeholder-slate-600"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white hover:bg-[#1E293B] rounded-xl transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar categories */}
          <div className="w-48 border-r border-[#1E293B] py-3 overflow-y-auto flex-shrink-0">
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all text-left ${
                  activeCategory === cat.id
                    ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131B2B]/50'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.label}</span>
                {activeCategory === cat.id && cat.id !== 'all' && (
                  <span className="ml-auto text-xs text-blue-500 font-mono">
                    {TEMPLATES.filter(t => t.category === cat.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Search size={32} className="mb-3 opacity-30" />
                <p className="text-sm">No templates match your search.</p>
              </div>
            ) : (
              <>
                <p className="text-slate-500 text-xs mb-4">{filtered.length} template{filtered.length !== 1 ? 's' : ''} available</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map(template => {
                    const ComplexityIcon = COMPLEXITY_ICONS[template.complexity]
                    return (
                      <div
                        key={template.id}
                        onMouseEnter={() => setHovered(template.id)}
                        onMouseLeave={() => setHovered(null)}
                        className={`relative bg-[#131B2B] border rounded-xl p-5 cursor-pointer transition-all group flex flex-col ${
                          hovered === template.id
                            ? 'border-blue-500/60 bg-[#162035] shadow-lg shadow-blue-500/10'
                            : 'border-[#1E293B] hover:border-[#334155]'
                        }`}
                        onClick={() => onSelect(template)}
                      >
                        {/* Icon + complexity */}
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-3xl">{template.icon}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${COMPLEXITY_STYLES[template.complexity]}`}>
                            <ComplexityIcon size={10} />
                            {template.complexity}
                          </span>
                        </div>

                        {/* Name + description */}
                        <h3 className="text-white font-semibold text-sm mb-1.5">{template.name}</h3>
                        <p className="text-slate-500 text-xs leading-relaxed flex-1 mb-3">{template.description}</p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {template.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-[#1E293B] text-slate-400 text-xs rounded-md border border-[#334155]/50">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Hover CTA */}
                        {hovered === template.id && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-blue-600 to-blue-600/90 text-white text-xs font-bold py-2.5 text-center rounded-b-xl flex items-center justify-center gap-1.5 transition-all">
                            Use This Template →
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
