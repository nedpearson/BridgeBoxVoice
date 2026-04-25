import { useState } from 'react'
import { Globe, MapPin, Database, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
  workspaceId?: string
}

const REGIONS = [
  { id: 'us-east-1', name: 'US East (N. Virginia)', status: 'active', type: 'Primary' },
  { id: 'eu-central-1', name: 'Europe (Frankfurt)', status: 'available', type: 'Replica' },
  { id: 'ap-southeast-2', name: 'Asia Pacific (Sydney)', status: 'available', type: 'Replica' },
  { id: 'ca-central-1', name: 'Canada (Central)', status: 'available', type: 'Replica' },
]

export default function DataResidency({ workspaceId = 'default' }: Props) {
  const [selectedRegion, setSelectedRegion] = useState('us-east-1')
  const [isMigrating, setIsMigrating] = useState(false)

  const handleMigrate = async () => {
    setIsMigrating(true)
    try {
      const { error } = await supabase.from('residency_migrations').insert({
        workspace_id: workspaceId,
        target_region: selectedRegion
      })
      if (error) throw error

      alert('Data residency migration request submitted. Our team will contact you shortly to coordinate the migration.')
    } catch (err: any) {
      alert('Failed to request migration: ' + err.message)
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
      <div style={{ background: '#131B2B', border: '1px solid #1E293B', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(14, 165, 233, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={20} color="#0EA5E9" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#F1F5F9' }}>Data Residency & Geo-fencing</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>Control where your workspace data is stored and processed</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {REGIONS.map(region => (
            <div 
              key={region.id} 
              onClick={() => setSelectedRegion(region.id)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: 16, 
                borderRadius: 12, 
                border: `1px solid ${selectedRegion === region.id ? '#0EA5E9' : '#1E293B'}`,
                background: selectedRegion === region.id ? 'rgba(14, 165, 233, 0.05)' : '#0B0F19',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <MapPin size={20} color={selectedRegion === region.id ? '#0EA5E9' : '#64748B'} />
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#E2E8F0' }}>{region.name}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{region.id} • {region.type}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {region.status === 'active' && (
                  <span style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontSize: 12, fontWeight: 600 }}>
                    Active Region
                  </span>
                )}
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selectedRegion === region.id ? '#0EA5E9' : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedRegion === region.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#0EA5E9' }} />}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: 16, background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 12, display: 'flex', gap: 12 }}>
          <Info size={20} color="#F59E0B" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#FCD34D' }}>Migration Requires Downtime</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#FDE68A' }}>Moving your primary data region may require up to 2 hours of scheduled downtime. Our engineering team will assist with the migration process.</p>
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleMigrate}
            disabled={isMigrating || selectedRegion === 'us-east-1'}
            style={{ 
              padding: '10px 20px', 
              background: isMigrating || selectedRegion === 'us-east-1' ? '#1E293B' : '#0EA5E9', 
              color: isMigrating || selectedRegion === 'us-east-1' ? '#64748B' : '#FFF', 
              border: 'none', 
              borderRadius: 8, 
              fontSize: 14, 
              fontWeight: 600, 
              cursor: isMigrating || selectedRegion === 'us-east-1' ? 'not-allowed' : 'pointer'
            }}
          >
            {isMigrating ? 'Submitting...' : 'Request Migration'}
          </button>
        </div>
      </div>

      <div style={{ background: '#131B2B', border: '1px solid #1E293B', borderRadius: 16, padding: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={18} color="#0EA5E9" />
          PII Masking & Encryption
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94A3B8' }}>Configure how sensitive data is handled at rest and in transit.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>Customer Managed Keys (CMK)</p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Encrypt your data with your own AWS KMS or GCP Cloud KMS keys.</p>
            </div>
            <button style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #334155', color: '#E2E8F0', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Configure</button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#0B0F19', border: '1px solid #1E293B', borderRadius: 12 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#E2E8F0' }}>Automatic PII Redaction</p>
              <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Automatically redact SSN, credit cards, and other PII from AI logs.</p>
            </div>
            <div style={{ width: 40, height: 20, background: '#0EA5E9', borderRadius: 10, position: 'relative', cursor: 'pointer' }}>
              <div style={{ width: 16, height: 16, background: '#FFF', borderRadius: '50%', position: 'absolute', top: 2, right: 2 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
