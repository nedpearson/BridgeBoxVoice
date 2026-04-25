import { Shield, FileText, Download, CheckCircle, Clock } from 'lucide-react'

interface Props {
  workspaceId?: string
}

const REPORTS = [
  { id: 'soc2', name: 'SOC 2 Type II Report', date: 'Oct 2025', status: 'available', icon: <Shield size={20} color="#10B981" /> },
  { id: 'gdpr', name: 'GDPR Compliance Addendum', date: 'Jan 2026', status: 'available', icon: <FileText size={20} color="#3B82F6" /> },
  { id: 'hipaa', name: 'HIPAA BAA Template', date: 'Available on request', status: 'request', icon: <CheckCircle size={20} color="#8B5CF6" /> },
  { id: 'pci', name: 'PCI-DSS SAQ-A', date: 'Nov 2025', status: 'available', icon: <Shield size={20} color="#F59E0B" /> },
  { id: 'iso', name: 'ISO 27001 Certification', date: 'Expected Q3 2026', status: 'pending', icon: <Clock size={20} color="#64748B" /> },
]

export default function ComplianceReports({ }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      <div style={{ background: '#131B2B', border: '1px solid #1E293B', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#10B981" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#F1F5F9' }}>Compliance Reports</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>Download latest compliance documentation for your vendor assessments</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {REPORTS.map(report => (
            <div 
              key={report.id}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: 16, 
                borderRadius: 12, 
                border: '1px solid #1E293B',
                background: '#0B0F19'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: '#131B2B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {report.icon}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#E2E8F0' }}>{report.name}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Updated: {report.date}</p>
                </div>
              </div>
              
              {report.status === 'available' && (
                <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={14} /> Download PDF
                </button>
              )}
              {report.status === 'request' && (
                <button style={{ padding: '8px 16px', background: '#1E293B', color: '#E2E8F0', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                  Contact Sales
                </button>
              )}
              {report.status === 'pending' && (
                <span style={{ padding: '4px 12px', background: 'rgba(100, 116, 139, 0.1)', color: '#94A3B8', borderRadius: 8, fontSize: 12, fontWeight: 500 }}>
                  In Progress
                </span>
              )}
            </div>
          ))}
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: '#64748B', textAlign: 'center' }}>
          By downloading these reports, you agree to BridgeBox's NDA. Documents are watermarked and tracked.
        </p>
      </div>
    </div>
  )
}
