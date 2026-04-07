import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Book, Search, ChevronRight, ExternalLink, MessageCircle, Mail, Zap, Shield, Mic, Users, Settings, CreditCard } from 'lucide-react'

const CATEGORIES = [
  {
    icon: <Mic size={18} color="#60A5FA" />,
    title: 'Voice Capture',
    articles: [
      { title: 'How to record your first voice note', time: '2 min read' },
      { title: 'Supported audio formats and quality tips', time: '3 min read' },
      { title: 'Chrome extension setup guide', time: '5 min read' },
      { title: 'Mobile voice capture best practices', time: '1 min read' },
    ],
  },
  {
    icon: <Zap size={18} color="#FBBF24" />,
    title: 'AI Generation',
    articles: [
      { title: 'Understanding AI transcription accuracy', time: '3 min read' },
      { title: 'Customizing AI output format', time: '2 min read' },
      { title: 'Prompt tips for better code generation', time: '4 min read' },
      { title: 'AI token limits and usage caps', time: '2 min read' },
    ],
  },
  {
    icon: <Shield size={18} color="#A78BFA" />,
    title: 'Security & Enterprise',
    articles: [
      { title: 'Setting up SAML SSO with Okta', time: '8 min read' },
      { title: 'Configuring SCIM user provisioning', time: '6 min read' },
      { title: 'IP allowlisting for your workspace', time: '3 min read' },
      { title: 'Audit log verification and export', time: '4 min read' },
    ],
  },
  {
    icon: <Users size={18} color="#34D399" />,
    title: 'Team Management',
    articles: [
      { title: 'Inviting team members', time: '2 min read' },
      { title: 'Role permissions explained', time: '3 min read' },
      { title: 'Removing a team member', time: '1 min read' },
      { title: 'Transferring workspace ownership', time: '2 min read' },
    ],
  },
  {
    icon: <CreditCard size={18} color="#F472B6" />,
    title: 'Billing & Plans',
    articles: [
      { title: 'Upgrading your plan', time: '2 min read' },
      { title: 'Understanding usage limits', time: '3 min read' },
      { title: 'Downloading invoices', time: '1 min read' },
      { title: 'Enterprise pricing and custom contracts', time: '2 min read' },
    ],
  },
  {
    icon: <Settings size={18} color="#94A3B8" />,
    title: 'Integrations',
    articles: [
      { title: 'Connecting GitHub for code deployment', time: '5 min read' },
      { title: 'Slack notifications setup', time: '3 min read' },
      { title: 'Jira and Linear project sync', time: '4 min read' },
      { title: 'REST API getting started', time: '6 min read' },
    ],
  },
]

const POPULAR = [
  'Chrome extension not recording audio',
  'How to export my data (GDPR)',
  'SSO login not working',
  'Changing workspace name',
  'API rate limit errors',
  'Cancel subscription',
]

export default function HelpPage() {
  const [search, setSearch] = useState('')
  const [ticketOpen, setTicketOpen] = useState(false)
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketBody, setTicketBody] = useState('')
  const [ticketSending, setTicketSending] = useState(false)
  const [ticketSent, setTicketSent] = useState(false)

  const submitTicket = async () => {
    if (!ticketSubject.trim() || !ticketBody.trim()) return
    setTicketSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: ws } = await supabase.from('workspaces').select('id').eq('owner_id', user.id).single()
      if (ws) {
        await supabase.from('support_tickets').insert({
          workspace_id: ws.id, user_id: user.id,
          subject: ticketSubject, description: ticketBody,
          priority: 'medium', category: 'technical',
        } as any)
      }
    }
    setTicketSending(false)
    setTicketSent(true)
    setTimeout(() => { setTicketOpen(false); setTicketSent(false); setTicketSubject(''); setTicketBody('') }, 2000)
  }

  const filtered = search.trim()
    ? CATEGORIES.map(c => ({ ...c, articles: c.articles.filter(a => a.title.toLowerCase().includes(search.toLowerCase())) })).filter(c => c.articles.length > 0)
    : CATEGORIES

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F19', fontFamily: "'Inter', sans-serif", color: '#E2E8F0' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '60px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <Book size={28} color="#A5B4FC" />
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: '#F1F5F9' }}>Help Center</h1>
        </div>
        <p style={{ margin: '0 0 28px', fontSize: 16, color: '#64748B' }}>Find answers, guides, and support for Bridgebox Voice</p>
        <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search articles…"
            style={{ width: '100%', padding: '14px 16px 14px 44px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, color: '#E2E8F0', fontSize: 15, boxSizing: 'border-box' }} />
        </div>
        {/* Popular searches */}
        {!search && (
          <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {POPULAR.map(p => (
              <button key={p} onClick={() => setSearch(p)} style={{ padding: '5px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: '#64748B', fontSize: 12, cursor: 'pointer' }}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Article grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map(cat => (
            <div key={cat.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                {cat.icon}
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E2E8F0' }}>{cat.title}</h2>
              </div>
              {cat.articles.map(a => (
                <div key={a.title} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, color: '#CBD5E1', fontWeight: 500 }}>{a.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#475569' }}>{a.time}</p>
                  </div>
                  <ChevronRight size={14} color="#334155" />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Contact section */}
        <div style={{ marginTop: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div onClick={() => setTicketOpen(true)} style={{ padding: '24px 28px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
            <MessageCircle size={24} color="#A5B4FC" />
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E2E8F0' }}>Submit a ticket</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>Get help from our support team</p>
            </div>
            <ChevronRight size={16} color="#6366F1" style={{ marginLeft: 'auto' }} />
          </div>
          <a href="mailto:support@bridgebox.ai" style={{ padding: '24px 28px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none' }}>
            <Mail size={24} color="#64748B" />
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E2E8F0' }}>Email support</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>support@bridgebox.ai</p>
            </div>
            <ExternalLink size={14} color="#334155" style={{ marginLeft: 'auto' }} />
          </a>
        </div>
      </div>

      {/* Ticket modal */}
      {ticketOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={e => e.target === e.currentTarget && setTicketOpen(false)}>
          <div style={{ background: '#131B2B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            {ticketSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#4ADE80' }}>Ticket submitted!</p>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748B' }}>We'll respond within 24 hours.</p>
              </div>
            ) : (
              <>
                <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>Submit Support Ticket</h3>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>Subject</label>
                <input value={ticketSubject} onChange={e => setTicketSubject(e.target.value)} placeholder="Brief description of the issue"
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#E2E8F0', fontSize: 13, marginBottom: 16, boxSizing: 'border-box' }} />
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>Details</label>
                <textarea value={ticketBody} onChange={e => setTicketBody(e.target.value)} placeholder="Describe the issue in detail…" rows={5}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#E2E8F0', fontSize: 13, marginBottom: 20, boxSizing: 'border-box', resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setTicketOpen(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={submitTicket} disabled={ticketSending || !ticketSubject.trim() || !ticketBody.trim()} style={{ flex: 2, padding: '10px', background: !ticketSubject.trim() ? 'rgba(99,102,241,0.3)' : '#6366F1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {ticketSending ? 'Sending…' : 'Submit ticket'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
