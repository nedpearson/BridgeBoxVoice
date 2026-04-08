import { useEffect, useRef, useState } from 'react'
import { Maximize2, RefreshCw, Smartphone, Monitor, Wand2, ArrowRight } from 'lucide-react'
import { callClaude } from '../../lib/anthropic'
import toast from 'react-hot-toast'

interface PreviewPaneProps {
  htmlContent: string
  title?: string
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile'

const VIEWPORT_WIDTHS: Record<ViewportMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

export default function PreviewPane({ htmlContent, title = 'App Preview' }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [viewport, setViewport] = useState<ViewportMode>('desktop')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [key, setKey] = useState(0)

  // Hot Reload Mode
  const [stylePrompt, setStylePrompt] = useState('')
  const [isTweaking, setIsTweaking] = useState(false)

  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      const iframe = iframeRef.current
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(htmlContent)
        doc.close()
      }
    }
  }, [htmlContent, key])

  const refresh = () => {
    setIsRefreshing(true)
    setKey((k) => k + 1)
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const openFullscreen = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const handleApplyTweak = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stylePrompt.trim() || !iframeRef.current?.contentDocument) return
    setIsTweaking(true)

    try {
      const doc = iframeRef.current.contentDocument
      const sys = `You are a CSS overriding engine. You will be given a user request to style an existing HTML document layout. Return ONLY raw CSS code (no HTML, no JS, no markdown wrapping, no explanation) that accomplishes the requested tweak visually. 
Return only pure CSS. Example: body { background: red; }`
      
      const rawRes = await callClaude(sys, stylePrompt, [], 800)
      const pureCSS = rawRes.replace(/```css|```/gi, '').trim()
      
      const styleNode = doc.createElement('style')
      styleNode.innerHTML = pureCSS
      doc.head.appendChild(styleNode)
      
      setStylePrompt('')
      toast.success('Live Tweak Applied!')
    } catch (err: any) {
      toast.error(`Tweak failed: ${err.message}`)
    } finally {
      setIsTweaking(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0B0F19]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B] bg-[#0C1322] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-slate-400 text-xs font-mono ml-2">{title}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Viewport switcher */}
          <div className="flex items-center gap-0.5 bg-[#1E293B] rounded-lg p-0.5 mr-2">
            {(['desktop', 'tablet', 'mobile'] as ViewportMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewport(mode)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewport === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'desktop' ? <Monitor className="w-3.5 h-3.5" /> :
                 mode === 'tablet' ? '⊞' :
                 <Smartphone className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          <button
            onClick={refresh}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openFullscreen}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
            title="Open in new tab"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto bg-slate-600 flex items-start justify-center p-4">
        {htmlContent ? (
          <div
            className="bg-white shadow-2xl transition-all duration-300 min-h-full"
            style={{ width: VIEWPORT_WIDTHS[viewport], maxWidth: '100%' }}
          >
            <iframe
              key={key}
              ref={iframeRef}
              title="app-preview"
              className="w-full border-0"
              style={{ minHeight: '600px', height: '100%' }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-[#1E293B] flex items-center justify-center">
              <Monitor className="w-10 h-10 text-slate-600" />
            </div>
            <div>
              <p className="text-slate-400 font-medium">No preview yet</p>
              <p className="text-slate-600 text-sm mt-1">
                Complete the build step to see your app
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Magic Chat Bar */}
      {htmlContent && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 hidden md:block">
          <form 
            onSubmit={handleApplyTweak}
            className="flex items-center gap-2 bg-[#0C1322]/90 backdrop-blur-md border border-indigo-500/30 p-2 rounded-2xl shadow-2xl transition-all hover:border-indigo-500/60"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0 ml-1">
              <Wand2 className="w-4 h-4 text-indigo-400" />
            </div>
            <input 
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              disabled={isTweaking}
              placeholder="Magic Tweak (e.g. 'make the header blue and rounded')"
              className="flex-1 bg-transparent border-0 text-white text-sm focus:outline-none focus:ring-0 placeholder-slate-400 min-w-0 px-2"
            />
            <button 
              type="submit"
              disabled={isTweaking || !stylePrompt.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center justify-center transition-colors min-w-[80px]"
            >
              {isTweaking ? <div className="spinner" style={{width: 18, height: 18, borderWidth: 2}}/> : <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
