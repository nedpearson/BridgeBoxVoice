import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Activity, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'

interface ServiceStatus { service_name: string; display_name: string; status: string; updated_at: string }
interface Incident { id: string; title: string; severity: string; status: string; affected_services: string[]; started_at: string; resolved_at: string | null; description: string }

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  operational:   { color: '#4ADE80', bg: 'rgba(34,197,94,0.12)', icon: <CheckCircle size={14} color="#4ADE80" />, label: 'Operational' },
  degraded:      { color: '#FCD34D', bg: 'rgba(251,191,36,0.12)', icon: <AlertTriangle size={14} color="#FCD34D" />, label: 'Degraded' },
  partial_outage:{ color: '#F97316', bg: 'rgba(249,115,22,0.12)', icon: <AlertTriangle size={14} color="#F97316" />, label: 'Partial Outage' },
  major_outage:  { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: <XCircle size={14} color="#EF4444" />, label: 'Major Outage' },
}

const SEVERITY_COLORS: Record<string, string> = { minor: '#FCD34D', major: '#F97316', critical: '#EF4444', maintenance: '#6366F1' }

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('service_status').select('*').order('display_name'),
      supabase.from('incidents').select('*').order('started_at', { ascending: false }).limit(10),
    ]).then(([{ data: svc }, { data: inc }]) => {
      setServices((svc ?? []) as ServiceStatus[])
      setIncidents((inc ?? []) as Incident[])
      setLoading(false)
    })
  }, [])

  const allOperational = services.every(s => s.status === 'operational')
  const activeIncidents = incidents.filter(i => i.status !== 'resolved')

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)', fontFamily: "'Inter', sans-serif", color: '#E2E8F0' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Bridgebox Voice Status</span>
          </div>
          <a href="/" style={{ fontSize: 13, color: '#6366F1', textDecoration: 'none', fontWeight: 500 }}>← Back to App</a>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {/* Overall status banner */}
        <div style={{ padding: 28, borderRadius: 20, background: allOperational ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${allOperational ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: allOperational ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {allOperational ? <CheckCircle size={24} color="#4ADE80" /> : <AlertTriangle size={24} color="#EF4444" />}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: allOperational ? '#4ADE80' : '#EF4444' }}>
              {allOperational ? 'All Systems Operational' : `${activeIncidents.length} Active Incident${activeIncidents.length > 1 ? 's' : ''}`}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Last updated {new Date().toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Services grid */}
        <section>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Services</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 140, height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                <div style={{ width: 90, height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
              </div>
            )) : services.map((svc, i) => {
              const cfg = STATUS_CONFIG[svc.status] ?? STATUS_CONFIG.operational
              return (
                <div key={svc.service_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: i < services.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>{svc.display_name}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600 }}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Incidents */}
        <section>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 }}>Recent Incidents</h2>
          {incidents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748B', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
              <CheckCircle size={32} style={{ opacity: 0.3, marginBottom: 8 }} color="#4ADE80" />
              <p style={{ margin: 0, fontSize: 14 }}>No incidents in the last 30 days</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {incidents.map(incident => (
                <div key={incident.id} style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: `1px solid ${incident.status === 'resolved' ? 'rgba(255,255,255,0.08)' : `${SEVERITY_COLORS[incident.severity] ?? '#EF4444'}40`}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#E2E8F0' }}>{incident.title}</h3>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: `${SEVERITY_COLORS[incident.severity]}20`, color: SEVERITY_COLORS[incident.severity], textTransform: 'uppercase' }}>{incident.severity}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: incident.status === 'resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)', color: incident.status === 'resolved' ? '#4ADE80' : '#FCD34D', textTransform: 'uppercase' }}>{incident.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {incident.description && <p style={{ margin: '0 0 10px', fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>{incident.description}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#64748B' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Started {new Date(incident.started_at).toLocaleString()}</span>
                    {incident.resolved_at && <span>Resolved {new Date(incident.resolved_at).toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer style={{ textAlign: 'center', fontSize: 12, color: '#475569', paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ margin: 0 }}>Subscribe to status updates • <a href="mailto:status@bridgebox.ai" style={{ color: '#6366F1' }}>status@bridgebox.ai</a></p>
        </footer>
      </div>
    </div>
  )
}

