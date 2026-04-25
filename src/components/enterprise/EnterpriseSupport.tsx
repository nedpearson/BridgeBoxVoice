import { useState } from 'react'
import { LifeBuoy, MessageSquare, Phone, Clock, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
  workspaceId?: string
}

export default function EnterpriseSupport({ workspaceId = 'default' }: Props) {
  const [ticketSubject, setTicketSubject] = useState('')
  const [ticketBody, setTicketBody] = useState('')
  const [priority, setPriority] = useState('normal')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketSubject || !ticketBody) return
    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('support_tickets').insert({
        workspace_id: workspaceId,
        subject: ticketSubject,
        body: ticketBody,
        priority: priority
      })

      if (error) throw error

      setTicketSubject('')
      setTicketBody('')
      alert('Support ticket submitted successfully. Priority: ' + priority)
    } catch (err: any) {
      alert('Failed to submit ticket: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      <div style={{ background: '#131B2B', border: '1px solid #1E293B', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LifeBuoy size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#F1F5F9' }}>Enterprise Support Hub</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>24/7 dedicated support for mission-critical deployments</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <div style={{ padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <Phone size={24} color="#F59E0B" style={{ marginBottom: 12 }} />
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#E2E8F0' }}>Dedicated Hotline</p>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Direct line to Level 3 support engineers.</p>
            <a href="tel:+18005550199" style={{ color: '#F59E0B', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>+1 (800) 555-0199</a>
          </div>
          
          <div style={{ padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <Clock size={24} color="#F59E0B" style={{ marginBottom: 12 }} />
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#E2E8F0' }}>SLA Guarantee</p>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Guaranteed response times based on severity.</p>
            <p style={{ margin: 0, color: '#F1F5F9', fontSize: 14, fontWeight: 500 }}>&lt; 1 Hour</p>
          </div>
          
          <div style={{ padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <MessageSquare size={24} color="#F59E0B" style={{ marginBottom: 12 }} />
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#E2E8F0' }}>Live Chat</p>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>Connect with your Customer Success Manager.</p>
            <button style={{ background: 'transparent', border: 'none', color: '#F59E0B', padding: 0, fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Start Chat <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#F1F5F9' }}>Open a Ticket</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94A3B8', marginBottom: 6 }}>Subject</label>
              <input 
                type="text" 
                value={ticketSubject}
                onChange={e => setTicketSubject(e.target.value)}
                placeholder="Brief description of the issue"
                style={{ width: '100%', boxSizing: 'border-box', background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 12px', color: '#FFF', fontSize: 14 }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94A3B8', marginBottom: 6 }}>Priority</label>
              <select 
                value={priority}
                onChange={e => setPriority(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 12px', color: '#FFF', fontSize: 14 }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent (Production Down)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#94A3B8', marginBottom: 6 }}>Description</label>
            <textarea 
              value={ticketBody}
              onChange={e => setTicketBody(e.target.value)}
              placeholder="Detailed description, steps to reproduce, or request details"
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 8, padding: '10px 12px', color: '#FFF', fontSize: 14, resize: 'vertical' }}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit"
              disabled={!ticketSubject || !ticketBody || isSubmitting}
              style={{ 
                padding: '10px 20px', 
                background: (!ticketSubject || !ticketBody || isSubmitting) ? '#1E293B' : '#F59E0B', 
                color: (!ticketSubject || !ticketBody || isSubmitting) ? '#64748B' : '#FFF', 
                border: 'none', 
                borderRadius: 8, 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: (!ticketSubject || !ticketBody || isSubmitting) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
