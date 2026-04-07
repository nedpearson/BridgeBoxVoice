/* eslint-disable */
import { useState, useEffect, useCallback } from 'react'
import { Search, Download, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { verifyAuditLog } from '../../lib/enterprise/auditLogger'

interface AuditEntry {
  id: string
  action: string
  user_id: string | null
  resource_type: string | null
  resource_id: string | null
  ip_address: string | null
  metadata: Record<string, unknown> | null
  signature: string
  created_at: string
  verified?: boolean
}

const ACTION_COLORS: Record<string, string> = {
  'user.': '#3B82F6', 'project.': '#8B5CF6', 'billing.': '#F59E0B',
  'security.': '#EF4444', 'sso.': '#06B6D4', 'api_key.': '#84CC16',
  'data.': '#EC4899', 'code.': '#6366F1',
}

function actionColor(action: string) {
  for (const [prefix, color] of Object.entries(ACTION_COLORS)) {
    if (action.startsWith(prefix)) return color
  }
  return '#64748B'
}

interface Props { workspaceId: string }

export default function AuditLog({ workspaceId }: Props) {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState<Record<string, boolean>>({})

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('audit_logs').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(200)
    if (actionFilter) q = q.ilike('action', `${actionFilter}%`)
    const { data } = await q
    setLogs((data ?? []) as AuditEntry[])
    setLoading(false)
  }, [workspaceId, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const verify = async (log: AuditEntry) => {
    setVerifying(v => ({ ...v, [log.id]: true }))
    const ok = await verifyAuditLog(log)
    setLogs(prev => prev.map(l => l.id === log.id ? { ...l, verified: ok } : l))
    setVerifying(v => ({ ...v, [log.id]: false }))
  }

  const exportCSV = () => {
    const header = 'timestamp,action,user_id,resource_type,ip_address,verified\n'
    const rows = logs.map(l => `${l.created_at},${l.action},${l.user_id ?? ''},${l.resource_type ?? ''},${l.ip_address ?? ''},${l.verified ?? ''}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `audit-log-${Date.now()}.csv`; a.click()
  }

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.resource_type ?? '').includes(search.toLowerCase()) ||
    (l.ip_address ?? '').includes(search)
  )

  const actionCategories = Array.from(new Set(logs.map(l => l.action.split('.')[0])))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', padding: '0 12px' }}>
          <Search size={14} color="#64748B" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search actions, IPs, resources..." style={{ flex: 1, border: 'none', background: 'none', color: '#E2E8F0', fontSize: 13, outline: 'none', padding: '10px 0' }} />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#E2E8F0', fontSize: 13 }}>
          <option value="">All Categories</option>
          {actionCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94A3B8', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total Events', value: logs.length },
          { label: 'Today', value: logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length },
          { label: 'Security Events', value: logs.filter(l => l.action.startsWith('security.')).length },
          { label: 'Verified', value: logs.filter(l => l.verified === true).length },
        ].map(({ label, value }) => (
          <div key={label} style={{ flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#E2E8F0' }}>{value.toLocaleString()}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              {['Timestamp', 'Action', 'IP Address', 'Resource', 'Integrity', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748B', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 4, width: j === 0 ? 120 : j === 1 ? 100 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>No audit events found</td></tr>
            ) : filtered.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '11px 14px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 4, background: `${actionColor(log.action)}20`, color: actionColor(log.action), fontWeight: 600 }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '11px 14px', color: '#94A3B8', fontFamily: 'monospace' }}>{log.ip_address ?? '—'}</td>
                <td style={{ padding: '11px 14px', color: '#94A3B8' }}>{log.resource_type ? `${log.resource_type}` : '—'}</td>
                <td style={{ padding: '11px 14px' }}>
                  {log.verified === true && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4ADE80', fontSize: 11 }}><CheckCircle size={12} /> Valid</span>}
                  {log.verified === false && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444', fontSize: 11 }}><XCircle size={12} /> Tampered</span>}
                  {log.verified === undefined && <span style={{ color: '#475569', fontSize: 11 }}>—</span>}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {log.verified === undefined && (
                    <button onClick={() => verify(log)} disabled={verifying[log.id]} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}>
                      {verifying[log.id] ? '…' : 'Verify'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

