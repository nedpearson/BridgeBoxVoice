import { useEffect, useRef } from 'react'
import { Maximize2, RefreshCw, Smartphone, Monitor } from 'lucide-react'
import { useState } from 'react'

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
    </div>
  )
}
