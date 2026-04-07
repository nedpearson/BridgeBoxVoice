import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { AIAnalysis } from '../../types/platform'

interface ClarifyChatProps {
  analysis: AIAnalysis
  projectId: string
}

interface Message { role: 'ai' | 'user'; text: string }

const MOCK_RESPONSES: Record<string, string> = {
  default: "Thanks for that detail! I've added it to the project specification. Any other requirements I should know about before we start building?",
  crew: "Perfect. I'll design the crew module to support up to 50 concurrent users with individual profiles and role assignments. I'll add a team management screen to the admin dashboard.",
  client: "Understood — I'll add a client-facing portal as an optional module. Clients will get a secure link where they can view job status, before/after photos, and approve quotes without needing to create an account.",
  inventory: "Great idea. I'll add an Inventory & Materials module with barcode scanning, low-stock alerts, and automatic cost calculation when a job is completed.",
}

export default function ClarifyChat({ analysis }: ClarifyChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: analysis.clarifying_questions[0] ?? "Is there anything else you'd like to add or change about the specification?" },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim()) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setTyping(true)
    await new Promise(r => setTimeout(r, 1500))
    const lower = userMsg.toLowerCase()
    const resp = lower.includes('crew') ? MOCK_RESPONSES.crew
      : lower.includes('client') ? MOCK_RESPONSES.client
      : lower.includes('inventory') ? MOCK_RESPONSES.inventory
      : MOCK_RESPONSES.default
    setMessages(prev => [...prev, { role: 'ai', text: resp }])
    setTyping(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-blue-400" />
          <h3 className="text-white text-sm font-semibold">Clarify with AI</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${m.role === 'ai' ? 'bg-blue-600/20' : 'bg-[#1E293B]'}`}>
              {m.role === 'ai' ? <Bot className="w-3.5 h-3.5 text-blue-400" /> : <User className="w-3.5 h-3.5 text-slate-400" />}
            </div>
            <div className={`rounded-xl px-3 py-2 text-sm max-w-[85%] leading-relaxed ${m.role === 'ai' ? 'bg-[#131B2B] border border-[#1E293B] text-slate-300' : 'bg-blue-600 text-white'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="bg-[#131B2B] border border-[#1E293B] rounded-xl px-3 py-2.5 flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-[#1E293B]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask a question or add requirements..."
            className="flex-1 bg-[#0B0F19] border border-[#1E293B] text-white placeholder-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button onClick={send} disabled={!input.trim() || typing} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
