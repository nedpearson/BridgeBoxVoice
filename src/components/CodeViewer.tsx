import { useState, useMemo } from 'react'
import { Copy, Download, Check, File, Folder, ChevronRight, ChevronDown, Search, X } from 'lucide-react'
import JSZip from 'jszip'
import { GeneratedFile } from '../lib/agents/developerAgent'

interface CodeViewerProps {
  files: GeneratedFile[]
  projectName?: string
}

type TreeNode = {
  name: string
  path: string
  isFile: boolean
  language?: GeneratedFile['language']
  children: TreeNode[]
}

// ─── Syntax Highlighter ───────────────────────────────────────────────────────

function highlight(code: string, language: GeneratedFile['language']): string {
  if (language === 'json') {
    return code
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
      .replace(/: "([^"]*)"/g, ': <span class="text-amber-300">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="text-emerald-400">$1</span>')
      .replace(/: (true|false|null)/g, ': <span class="text-violet-400">$1</span>')
  }

  let escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Simple token-by-token highlight (non-overlapping, left-to-right)
  escaped = escaped
    .replace(/\/\/.*$/gm, (m) => `<span class="text-slate-500 italic">${m}</span>`)
    .replace(/"(?:[^"\\]|\\.)*"/g, (m) => `<span class="text-amber-300">${m}</span>`)
    .replace(/\b(import|export|from|const|let|var|function|async|await|return|if|else|for|while|class|extends|interface|type|enum|new|throw|try|catch|finally|default|void|null|undefined|true|false|typeof|instanceof|super)\b/g,
      (m) => `<span class="text-violet-400 font-medium">${m}</span>`)
  return escaped
}

// ─── File Tree Builder ────────────────────────────────────────────────────────

function buildTree(files: GeneratedFile[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', isFile: false, children: [] }

  for (const file of files) {
    const parts = file.path.split('/')
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      let child = node.children.find((c) => c.name === part)
      if (!child) {
        child = { name: part, path: parts.slice(0, i + 1).join('/'), isFile, language: isFile ? file.language : undefined, children: [] }
        node.children.push(child)
      }
      node = child
    }
  }

  return root
}

function sortTree(node: TreeNode): TreeNode {
  node.children = [
    ...node.children.filter((c) => !c.isFile).map(sortTree).sort((a, b) => a.name.localeCompare(b.name)),
    ...node.children.filter((c) => c.isFile).sort((a, b) => a.name.localeCompare(b.name)),
  ]
  return node
}

// ─── Tree Node Component ──────────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  tsx: 'text-blue-400', typescript: 'text-blue-500', css: 'text-pink-400',
  json: 'text-amber-400', sql: 'text-emerald-400', html: 'text-orange-400', javascript: 'text-yellow-400',
}

function TreeNodeView({ node, depth, selectedPath, onSelect, expandedPaths, toggleExpand }: {
  node: TreeNode; depth: number; selectedPath: string; onSelect: (n: TreeNode) => void
  expandedPaths: Set<string>; toggleExpand: (path: string) => void
}) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path

  if (node.name === 'root') {
    return (
      <>
        {node.children.map((child) => (
          <TreeNodeView key={child.path} node={child} depth={0} selectedPath={selectedPath}
            onSelect={onSelect} expandedPaths={expandedPaths} toggleExpand={toggleExpand} />
        ))}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => node.isFile ? onSelect(node) : toggleExpand(node.path)}
        className={`flex items-center gap-1.5 w-full text-left px-3 py-1 text-xs transition-colors hover:bg-[#131B2B] ${isSelected ? 'bg-[#131B2B] text-white' : 'text-slate-400 hover:text-white'}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {!node.isFile && (isExpanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />)}
        {!node.isFile && <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
        {node.isFile && <File className={`w-3.5 h-3.5 flex-shrink-0 ${LANG_COLORS[node.language ?? ''] ?? 'text-slate-500'}`} />}
        <span className="truncate">{node.name}</span>
      </button>
      {!node.isFile && isExpanded && node.children.map((child) => (
        <TreeNodeView key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath}
          onSelect={onSelect} expandedPaths={expandedPaths} toggleExpand={toggleExpand} />
      ))}
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CodeViewer({ files, projectName = 'project' }: CodeViewerProps) {
  const [selectedPath, setSelectedPath] = useState<string>(files[0]?.path ?? '')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(['src', 'src/pages', 'src/lib', 'src/components']))
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')
  const [downloadingZip, setDownloadingZip] = useState(false)

  const selectedFile = files.find((f) => f.path === selectedPath)

  const tree = useMemo(() => sortTree(buildTree(files)), [files])

  const filteredFiles = search.trim()
    ? files.filter((f) => f.path.toLowerCase().includes(search.toLowerCase()) || f.content.toLowerCase().includes(search.toLowerCase()))
    : null

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const copyCode = async () => {
    if (!selectedFile) return
    await navigator.clipboard.writeText(selectedFile.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadZip = async () => {
    setDownloadingZip(true)
    try {
      const zip = new JSZip()
      for (const file of files) {
        zip.file(file.path, file.content)
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingZip(false)
    }
  }

  const lines = (selectedFile?.content ?? '').split('\n')
  return (
    <div className="flex h-full bg-[#0B0F19] rounded-2xl border border-[#1E293B] overflow-hidden">
      {/* File Tree */}
      <div className="w-60 border-r border-[#1E293B] flex flex-col flex-shrink-0">
        <div className="px-3 py-2.5 border-b border-[#1E293B]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-[#131B2B] border border-[#1E293B] rounded-lg pl-7 pr-6 py-1.5 text-white text-xs placeholder-slate-600 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filteredFiles ? (
            filteredFiles.map((f) => (
              <button key={f.path}
                onClick={() => { setSelectedPath(f.path); setSearch('') }}
                className={`flex items-center gap-1.5 w-full px-3 py-1 text-xs text-left transition-colors hover:bg-[#131B2B] ${selectedPath === f.path ? 'bg-[#131B2B] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <File className={`w-3.5 h-3.5 flex-shrink-0 ${LANG_COLORS[f.language] ?? 'text-slate-500'}`} />
                <span className="truncate">{f.path}</span>
              </button>
            ))
          ) : (
            <TreeNodeView node={tree} depth={0} selectedPath={selectedPath}
              onSelect={(n) => setSelectedPath(n.path)}
              expandedPaths={expandedPaths} toggleExpand={toggleExpand} />
          )}
        </div>

        <div className="px-3 py-2 border-t border-[#1E293B]">
          <p className="text-slate-600 text-xs">{files.length} files generated</p>
        </div>
      </div>

      {/* Code Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1E293B] bg-[#0D1526]">
          <span className="text-slate-300 text-xs font-mono font-medium truncate">{selectedPath || 'No file selected'}</span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-[#1E293B] hover:bg-[#1E293B] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={downloadZip}
              disabled={downloadingZip}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-blue-400 hover:text-white border border-blue-500/30 hover:bg-blue-500/10 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {downloadingZip ? 'Zipping...' : 'Download All'}
            </button>
          </div>
        </div>

        {/* Code */}
        <div className="flex-1 overflow-auto">
          {selectedFile ? (
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((_, i) => (
                  <tr key={i} className="hover:bg-[#0D1526]/50">
                    <td className="pl-4 pr-3 py-0 text-slate-700 text-xs font-mono text-right select-none w-12 border-r border-[#0D1526] align-top leading-5">
                      {i + 1}
                    </td>
                    <td className="pl-4 pr-4 py-0 leading-5">
                      <span
                        className="text-slate-300 text-xs font-mono whitespace-pre"
                        dangerouslySetInnerHTML={{ __html: highlight(lines[i], selectedFile.language) + ' ' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-600 text-sm">
              Select a file from the tree
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
