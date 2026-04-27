/**
 * PAGE TEMPLATE v3 — Retail Back-Office (icon fields, inline-style root, visual hierarchy)
 */

export interface PageData {
  fields: string[]
  records: Record<string, string | number>[]
  stats: { label: string; value: string | number }[]
  formFields: { key: string; label: string; type: 'text' | 'date' | 'select' | 'textarea' | 'number'; options?: string[] }[]
  subRecords: { id: number; parentId: number; title: string; date: string; status: string }[]
}

// Unused export kept for type compatibility
export const STATUS_MAP_UNUSED = {}

// Field icon map
const FIELD_ICONS: Record<string, string> = {
  name:'👤', customer:'👤', bride:'👤', client:'👤', employee:'👤', staff:'👤', stylist:'👤',
  date:'📅', appointmentDate:'📅', weddingDate:'💍', dueDate:'📅', nextPayment:'📅', hireDate:'📅',
  status:'🔵', availability:'🔵', paymentStatus:'💳',
  phone:'📞', email:'📧',
  costPrice:'💵', retailPrice:'🏷️', totalCost:'💵', totalRetail:'🏷️', totalDue:'💵', balance:'💵', amountPaid:'💳', deposit:'💳', depositPaid:'💳',
  margin:'📈', marginPercent:'📈', commissionRate:'📈', commission:'📈',
  vendor:'🏭', designer:'🏷️', brand:'🏷️', size:'📐', color:'🎨', style:'👗', gown:'👗',
  location:'📍', address:'📍', store:'🏪',
  paymentTerms:'📋', terms:'📋', notes:'📝', description:'📝',
  quantity:'📦', stock:'📦', units:'📦',
  totalGross:'💰', basePay:'💰', totalEarned:'💰', totalSales:'💰', totalRevenue:'💰',
  category:'🗂️', type:'🗂️',
};
const iconFor = (k: string) => FIELD_ICONS[k] || FIELD_ICONS[Object.keys(FIELD_ICONS).find(fk => k.toLowerCase().includes(fk.toLowerCase())) || ''] || '▪';

const STATUS_CLS: Record<string,{bg:string;color:string;dot:string}> = {
  active:    {bg:'#052e16', color:'#4ade80', dot:'#22c55e'},
  available: {bg:'#052e16', color:'#4ade80', dot:'#22c55e'},
  complete:  {bg:'#052e16', color:'#4ade80', dot:'#22c55e'},
  completed: {bg:'#052e16', color:'#4ade80', dot:'#22c55e'},
  done:      {bg:'#052e16', color:'#4ade80', dot:'#22c55e'},
  'paid-off':{bg:'#052e16', color:'#4ade80', dot:'#22c55e'},
  current:   {bg:'#052e16', color:'#4ade80', dot:'#22c55e'},
  confirmed: {bg:'#0c1a4a', color:'#60a5fa', dot:'#3b82f6'},
  scheduled: {bg:'#0c1a4a', color:'#60a5fa', dot:'#3b82f6'},
  upcoming:  {bg:'#0c1a4a', color:'#60a5fa', dot:'#3b82f6'},
  received:  {bg:'#0c1a4a', color:'#60a5fa', dot:'#3b82f6'},
  pending:   {bg:'#2d1a00', color:'#fbbf24', dot:'#f59e0b'},
  reserved:  {bg:'#2d1a00', color:'#fbbf24', dot:'#f59e0b'},
  cancelled: {bg:'#2d0000', color:'#f87171', dot:'#ef4444'},
  overdue:   {bg:'#2d0000', color:'#f87171', dot:'#ef4444'},
  late:      {bg:'#2d0000', color:'#f87171', dot:'#ef4444'},
  inactive:  {bg:'#1a1a1a', color:'#94a3b8', dot:'#64748b'},
};
const badgeSt = (v: string) => STATUS_CLS[v.toLowerCase()] || {bg:'#1e0a3a', color:'#c084fc', dot:'#a855f7'};

const isMoney = (k: string) => /amount|price|pay|cost|revenue|total|value|gross|balance|margin|deposit|fee|charge|rate/i.test(k);
const isStatus = (k: string) => /status|availability|state/i.test(k);
const fmtKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();

type NavItem = { type: string; label: string; data?: any; parentRecord?: any; fieldKey?: string; fieldValue?: any };
export function buildPageFromData(pageName: string, _route: string, data: PageData): string {
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const fields = data.fields.filter(f => f !== 'id')
  const dataJson = JSON.stringify(data.records).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  const subJson = JSON.stringify(data.subRecords)
  const statsJson = JSON.stringify(data.stats)
  const formJson = JSON.stringify(data.formFields)
  const emptyForm = `{ ${data.formFields.map(f=>`${f.key}: ''`).join(', ')} }`
  const fieldsJson = JSON.stringify(fields)
  return `import React, { useState } from 'react';
import { Search, Plus, Edit2, X, ChevronRight, ChevronLeft, RefreshCw, Trash2 } from 'lucide-react';
const DATA = ${dataJson};
const SUB = ${subJson};
const STATS = ${statsJson};
const FF = ${formJson};
const FIELDS = ${fieldsJson};
const PAGE = '${pageName}';
const EMPTY = ${emptyForm};
const FIELD_ICONS = {name:'👤',customer:'👤',bride:'👤',client:'👤',employee:'👤',stylist:'👤',date:'📅',appointmentDate:'📅',weddingDate:'💍',dueDate:'📅',nextPayment:'📅',status:'🔵',paymentStatus:'💳',phone:'📞',email:'📧',costPrice:'💵',retailPrice:'🏷️',totalCost:'💵',totalRetail:'🏷️',totalDue:'💵',balance:'💵',amountPaid:'💳',deposit:'💳',depositPaid:'💳',margin:'📈',commissionRate:'📈',vendor:'🏭',designer:'🏷️',brand:'🏷️',size:'📐',color:'🎨',style:'👗',gown:'👗',location:'📍',paymentTerms:'📋',notes:'📝',description:'📝',quantity:'📦',totalGross:'💰',basePay:'💰',totalSales:'💰',category:'🗂️'};
const iconFor = (k) => FIELD_ICONS[k] || Object.entries(FIELD_ICONS).find(([fk])=>k.toLowerCase().includes(fk.toLowerCase()))?.[1] || '▪';
const STATUS_CLS = {active:{bg:'#052e16',color:'#4ade80',dot:'#22c55e'},available:{bg:'#052e16',color:'#4ade80',dot:'#22c55e'},complete:{bg:'#052e16',color:'#4ade80',dot:'#22c55e'},completed:{bg:'#052e16',color:'#4ade80',dot:'#22c55e'},done:{bg:'#052e16',color:'#4ade80',dot:'#22c55e'},'paid-off':{bg:'#052e16',color:'#4ade80',dot:'#22c55e'},current:{bg:'#052e16',color:'#4ade80',dot:'#22c55e'},confirmed:{bg:'#0c1a4a',color:'#60a5fa',dot:'#3b82f6'},scheduled:{bg:'#0c1a4a',color:'#60a5fa',dot:'#3b82f6'},upcoming:{bg:'#0c1a4a',color:'#60a5fa',dot:'#3b82f6'},received:{bg:'#0c1a4a',color:'#60a5fa',dot:'#3b82f6'},pending:{bg:'#2d1a00',color:'#fbbf24',dot:'#f59e0b'},reserved:{bg:'#2d1a00',color:'#fbbf24',dot:'#f59e0b'},cancelled:{bg:'#2d0000',color:'#f87171',dot:'#ef4444'},overdue:{bg:'#2d0000',color:'#f87171',dot:'#ef4444'},late:{bg:'#2d0000',color:'#f87171',dot:'#ef4444'},inactive:{bg:'#1a1a1a',color:'#94a3b8',dot:'#64748b'}};
const badgeSt = (v) => STATUS_CLS[String(v).toLowerCase()] || {bg:'#1e0a3a',color:'#c084fc',dot:'#a855f7'};
const isMoney = (k) => /amount|price|pay|cost|revenue|total|value|gross|balance|margin|deposit|fee|charge/i.test(k);
const isStatus = (k) => /status|availability|state/i.test(k);
const fmtKey = (k) => k.replace(/([A-Z])/g,' \$1').replace(/^./,s=>s.toUpperCase()).trim();
const S = {root:{display:'flex',flexDirection:'column',height:'100%',background:'#0d1117',color:'#e2e8f0',minHeight:0},toolbar:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#111827',borderBottom:'1px solid #1e293b',flexShrink:0},kpi:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',background:'#111827',borderBottom:'1px solid #1e293b',flexShrink:0},kpiCard:{display:'flex',flexDirection:'column',padding:'10px 16px',cursor:'pointer',borderBottom:'2px solid transparent',transition:'all .15s'},tbl:{flex:1,overflowY:'auto'},thead:{position:'sticky',top:0,zIndex:10,background:'#111827'},th:{textAlign:'left',padding:'8px 14px',fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap',borderBottom:'1px solid #1e293b'},td:{padding:'9px 14px',fontSize:'13px',borderBottom:'1px solid #1e293b',whiteSpace:'nowrap'},detailRoot:{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'},detailHdr:{padding:'12px 16px',background:'#111827',borderBottom:'1px solid #1e293b',flexShrink:0},tabBar:{display:'flex',borderBottom:'1px solid #1e293b',background:'#111827',padding:'0 16px',flexShrink:0},tabBtn:{padding:'8px 14px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'none',background:'transparent',borderBottom:'2px solid transparent',transition:'all .15s',whiteSpace:'nowrap'},fieldGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'10px',padding:'16px'},fieldCard:{background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'12px',cursor:'pointer',transition:'all .15s',display:'flex',flexDirection:'column',gap:'6px'},actList:{padding:'12px 16px',display:'flex',flexDirection:'column',gap:'6px'},actRow:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',background:'#111827',border:'1px solid #1e293b',borderRadius:'6px',cursor:'pointer',transition:'all .15s'},modal:{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',backdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'},modalBox:{background:'#111827',border:'1px solid #334155',borderRadius:'12px',width:'100%',maxWidth:'520px',overflow:'hidden',boxShadow:'0 24px 60px rgba(0,0,0,.8)'},modalHdr:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #1e293b',background:'#0d1117'},modalBody:{padding:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',maxHeight:'60vh',overflowY:'auto'},modalFtr:{display:'flex',gap:'10px',padding:'14px 20px',borderBottom:'none',borderTop:'1px solid #1e293b',background:'#0d1117'}};
export default function ${safe}() {
  const [items,setItems] = React.useState(DATA);
  const [search,setSearch] = React.useState('');
  const [filter,setFilter] = React.useState(null);
  const [nav,setNav] = React.useState([{type:'list',label:PAGE}]);
  const [form,setForm] = React.useState(EMPTY);
  const [showForm,setShowForm] = React.useState(false);
  const [dtab,setDtab] = React.useState('details');
  const push = v => { setNav(n=>[...n,v]); setDtab('details'); };
  const pop = () => setNav(n=>n.length>1?n.slice(0,-1):n);
  const jump = i => setNav(n=>n.slice(0,i+1));
  const cur = nav[nav.length-1];
  const filtered = items.filter(r=>(!search||Object.values(r).some(v=>String(v).toLowerCase().includes(search.toLowerCase())))&&(!filter||Object.values(r).some(v=>String(v).toLowerCase().includes(filter.toLowerCase()))));
  const related = cur.data ? SUB.filter(r=>r.parentId===cur.data?.id) : [];
  const sameVal = cur.fieldKey ? items.filter(r=>String(r[cur.fieldKey]).toLowerCase()===String(cur.fieldValue).toLowerCase()) : [];
  const allVals = cur.fieldKey ? [...new Set(items.map(r=>String(r[cur.fieldKey])))] : [];
  const save = () => { if(form.id) setItems(it=>it.map(i=>i.id===form.id?{...i,...form}:i)); else setItems(it=>[...it,{...form,id:Date.now()}]); setShowForm(false); setForm(EMPTY); };
  const btnBase = {display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1px solid #334155',background:'#1e293b',color:'#94a3b8',transition:'all .15s'};
  const btnPrimary = {...btnBase,background:'#7c3aed',color:'white',borderColor:'#7c3aed'};
  const Badge = ({v}) => { const st=badgeSt(v); return <span style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'2px 8px',borderRadius:'4px',fontSize:'11px',fontWeight:700,background:st.bg,color:st.color}}><span style={{width:'5px',height:'5px',borderRadius:'50%',background:st.dot,display:'inline-block'}}/>{ String(v)}</span>; };
  return (
    <div style={S.root}>
      {/* toolbar */}
      <div style={S.toolbar}>
        <div style={{display:'flex',alignItems:'center',gap:'4px',flex:1,minWidth:0,overflow:'hidden',fontSize:'12px'}}>
          {nav.map((v,i)=><React.Fragment key={i}>{i>0&&<span style={{color:'#334155',margin:'0 2px'}}>/</span>}<button onClick={()=>jump(i)} style={{background:'none',border:'none',cursor:'pointer',color:i===nav.length-1?'#fff':'#64748b',fontWeight:i===nav.length-1?600:400,fontSize:'12px',padding:'2px 4px'}}>{v.label}</button></React.Fragment>)}
        </div>
        <div style={{display:'flex',gap:'6px',flexShrink:0}}>
          {cur.type!=='list'&&<button onClick={pop} style={btnBase}><ChevronLeft size={12}/>Back</button>}
          {cur.type==='list'&&<><button onClick={()=>{setFilter(null);setSearch('');}} style={btnBase}><RefreshCw size={11}/>Reset</button><button onClick={()=>{setForm(EMPTY);setShowForm(true);}} style={btnPrimary}><Plus size={12}/>New {PAGE.replace(/s$,'')}</button></>}
          {cur.type==='record'&&cur.data&&<><button onClick={()=>{setForm({...cur.data});setShowForm(true);}} style={btnBase}><Edit2 size={11}/>Edit</button><button onClick={()=>{setItems(it=>it.filter(i=>i.id!==cur.data.id));pop();}} style={{...btnBase,color:'#f87171',borderColor:'#450a0a'}}><Trash2 size={11}/>Delete</button></>}
        </div>
      </div>
      {/* LIST */}
      {cur.type==='list'&&(<div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
        <div style={S.kpi}>{STATS.map((s,i)=><button key={i} onClick={()=>setFilter(f=>f===String(s.value)?null:String(s.value))} style={{...S.kpiCard,borderBottomColor:filter===String(s.value)?'#7c3aed':'transparent',background:filter===String(s.value)?'#1e0a3a':'transparent'}}><span style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',letterSpacing:'.05em'}}>{s.label}</span><span style={{fontSize:'22px',fontWeight:800,color:'#fff',marginTop:'2px'}}>{s.value}</span>{filter===String(s.value)&&<span style={{fontSize:'10px',color:'#a855f7',marginTop:'2px'}}>Filtered ✓</span>}</button>)}</div>
        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#0d1117',borderBottom:'1px solid #1e293b',flexShrink:0}}>
          <div style={{position:'relative',flex:1,maxWidth:'320px'}}>
            <Search size={13} style={{position:'absolute',left:'9px',top:'50%',transform:'translateY(-50%)',color:'#475569',pointerEvents:'none'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={'Search '+PAGE.toLowerCase()+'...'} style={{width:'100%',paddingLeft:'30px',paddingRight:'10px',paddingTop:'7px',paddingBottom:'7px',background:'#111827',border:'1px solid #1e293b',borderRadius:'6px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}/>
          </div>
          {(search||filter)&&<button onClick={()=>{setSearch('');setFilter(null);}} style={{...btnBase,padding:'7px 10px'}}><X size={11}/>Clear</button>}
          <span style={{fontSize:'11px',color:'#475569',marginLeft:'auto'}}>{filtered.length} records</span>
        </div>
        <div style={S.tbl}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead style={S.thead}><tr>{FIELDS.map(f=><th key={f} style={S.th}>{fmtKey(f)}</th>)}<th style={{...S.th,width:'32px'}}></th></tr></thead>
            <tbody>{filtered.length===0?<tr><td colSpan={FIELDS.length+1} style={{textAlign:'center',padding:'48px',color:'#475569',fontSize:'13px'}}>No records found</td></tr>:filtered.map((row,idx)=><tr key={row.id} onClick={()=>push({type:'record',label:String(row[FIELDS[0]]??row.id),data:row})} style={{background:idx%2===0?'#0d1117':'#0a0d14',cursor:'pointer',transition:'background .1s'}} onMouseEnter={e=>e.currentTarget.style.background='#141f35'} onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#0d1117':'#0a0d14'}>{FIELDS.map(f=><td key={f} style={S.td} onClick={e=>{e.stopPropagation();push({type:'field',label:fmtKey(f),fieldKey:f,fieldValue:row[f],parentRecord:row});}}>{isStatus(f)?<Badge v={row[f]}/>:isMoney(f)?<span style={{color:'#4ade80',fontFamily:'monospace',fontSize:'13px'}}>{row[f]}</span>:<span style={{color:'#cbd5e1'}}>{String(row[f]??'')}</span>}</td>)}<td style={S.td}><button onClick={e=>{e.stopPropagation();setForm({...row});setShowForm(true);}} style={{background:'none',border:'none',cursor:'pointer',color:'#475569',padding:'2px',borderRadius:'4px',opacity:0}} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0'}><Edit2 size={12}/></button></td></tr>)}</tbody>
          </table>
        </div>
      </div>)}
      {/* RECORD DETAIL */}
      {cur.type==='record'&&cur.data&&(<div style={S.detailRoot}>
        <div style={S.detailHdr}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div><p style={{fontSize:'17px',fontWeight:700,color:'#fff',margin:0}}>{String(cur.data[FIELDS[0]]??cur.data.id)}</p><p style={{fontSize:'11px',color:'#64748b',margin:'2px 0 0'}}>{PAGE} Record</p></div>
            {FIELDS.find(f=>isStatus(f))&&<Badge v={cur.data[FIELDS.find(f=>isStatus(f))||'']}/>}
          </div>
        </div>
        <div style={S.tabBar}>{['details','activity'].map(t=><button key={t} onClick={()=>setDtab(t)} style={{...S.tabBtn,color:dtab===t?'#fff':'#64748b',borderBottomColor:dtab===t?'#7c3aed':'transparent'}}>{t==='activity'?'Activity ('+related.length+')':'Details'}</button>)}</div>
        <div style={{flex:1,overflowY:'auto'}}>
          {dtab==='details'&&<div style={S.fieldGrid}>{Object.entries(cur.data).filter(([k])=>k!=='id').map(([k,v])=><div key={k} onClick={()=>push({type:'field',label:fmtKey(k),fieldKey:k,fieldValue:v,parentRecord:cur.data})} style={S.fieldCard} onMouseEnter={e=>{ e.currentTarget.style.borderColor='#7c3aed'; e.currentTarget.style.background='#1a0d3a'; }} onMouseLeave={e=>{ e.currentTarget.style.borderColor='#1e293b'; e.currentTarget.style.background='#111827'; }}><div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'4px'}}><span style={{fontSize:'15px'}}>{iconFor(k)}</span><span style={{fontSize:'11px',color:'#64748b',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>{fmtKey(k)}</span></div>{isStatus(k)?<Badge v={v}/>:isMoney(k)?<span style={{color:'#4ade80',fontFamily:'monospace',fontSize:'16px',fontWeight:700}}>{String(v)}</span>:<span style={{color:'#e2e8f0',fontSize:'14px',fontWeight:500}}>{String(v)}</span>}<span style={{fontSize:'10px',color:'#334155',marginTop:'4px'}}>Click to explore →</span></div>)}</div>}
          {dtab==='activity'&&<div style={S.actList}>{related.length===0?<p style={{color:'#475569',fontSize:'13px',textAlign:'center',padding:'32px'}}>No activity recorded.</p>:related.map(r=><div key={r.id} onClick={()=>push({type:'subRecord',label:r.title,data:r,parentRecord:cur.data})} style={S.actRow} onMouseEnter={e=>{ e.currentTarget.style.borderColor='#7c3aed'; e.currentTarget.style.background='#1a0d3a'; }} onMouseLeave={e=>{ e.currentTarget.style.borderColor='#1e293b'; e.currentTarget.style.background='#111827'; }}><div style={{display:'flex',alignItems:'center',gap:'10px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#7c3aed',flexShrink:0,display:'inline-block'}}/><span style={{fontSize:'13px',color:'#cbd5e1'}}>{r.title}</span></div><div style={{display:'flex',alignItems:'center',gap:'10px'}}><span style={{fontSize:'11px',color:'#64748b'}}>{r.date}</span><Badge v={r.status}/><ChevronRight size={13} style={{color:'#475569'}}/></div></div>)}</div>}
        </div>
      </div>)}
      {/* FIELD PIVOT */}
      {cur.type==='field'&&(<div style={{flex:1,overflowY:'auto',padding:'16px'}}><div style={{maxWidth:'640px'}}><div style={{background:'#111827',border:'1px solid #1e293b',borderRadius:'10px',overflow:'hidden',marginBottom:'12px'}}><div style={{padding:'16px 20px',borderBottom:'1px solid #1e293b'}}><p style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',letterSpacing:'.06em',margin:'0 0 6px'}}>{iconFor(cur.fieldKey||'')} {cur.label}</p>{isStatus(cur.fieldKey||'')?<Badge v={cur.fieldValue}/>:isMoney(cur.fieldKey||'')?<span style={{fontSize:'26px',fontWeight:800,color:'#4ade80',fontFamily:'monospace'}}>{String(cur.fieldValue)}</span>:<span style={{fontSize:'22px',fontWeight:700,color:'#fff'}}>{String(cur.fieldValue)}</span>}</div><div style={{padding:'16px 20px'}}><p style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'10px'}}>{sameVal.length} records with this value</p>{sameVal.map(r=><div key={r.id} onClick={()=>push({type:'record',label:String(r[FIELDS[0]]),data:r})} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#0d1117',borderRadius:'6px',border:'1px solid #1e293b',cursor:'pointer',marginBottom:'6px',transition:'all .15s'}} onMouseEnter={e=>{ e.currentTarget.style.borderColor='#7c3aed'; }} onMouseLeave={e=>{ e.currentTarget.style.borderColor='#1e293b'; }}><span style={{fontSize:'13px',color:'#cbd5e1'}}>{String(r[FIELDS[0]])}</span><ChevronRight size={13} style={{color:'#475569'}}/></div>)}<p style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',letterSpacing:'.06em',margin:'14px 0 8px'}}>All values</p><div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>{allVals.map(val=><button key={val} onClick={()=>push({type:'field',label:cur.label,fieldKey:cur.fieldKey,fieldValue:val,parentRecord:cur.parentRecord})} style={{padding:'4px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:String(val)===String(cur.fieldValue)?'#7c3aed':'#1e293b',background:String(val)===String(cur.fieldValue)?'#7c3aed':'#111827',color:String(val)===String(cur.fieldValue)?'white':'#94a3b8',transition:'all .15s'}}>{val}</button>)}</div></div></div></div></div>)}
      {/* SUB-RECORD */}
      {cur.type==='subRecord'&&cur.data&&(<div style={{flex:1,overflowY:'auto',padding:'16px'}}><div style={{maxWidth:'640px'}}><div style={{background:'#111827',border:'1px solid #1e293b',borderRadius:'10px',overflow:'hidden'}}><div style={{padding:'14px 20px',borderBottom:'1px solid #1e293b'}}><p style={{fontSize:'15px',fontWeight:700,color:'#fff',margin:0}}>{cur.data.title}</p><p style={{fontSize:'11px',color:'#64748b',margin:'3px 0 0'}}>Activity on: <button onClick={()=>push({type:'record',label:String(cur.parentRecord?.[FIELDS[0]]),data:cur.parentRecord})} style={{background:'none',border:'none',cursor:'pointer',color:'#a855f7',fontSize:'11px',fontWeight:600,padding:0}}>{String(cur.parentRecord?.[FIELDS[0]])}</button></p></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1px',background:'#1e293b'}}>{Object.entries(cur.data).filter(([k])=>k!=='id'&&k!=='parentId').map(([k,v])=><div key={k} onClick={()=>push({type:'field',label:k,fieldKey:k,fieldValue:v,parentRecord:cur.data})} style={{background:'#111827',padding:'12px 16px',cursor:'pointer',transition:'background .12s'}} onMouseEnter={e=>e.currentTarget.style.background='#1a0d3a'} onMouseLeave={e=>e.currentTarget.style.background='#111827'}><p style={{fontSize:'11px',color:'#64748b',margin:'0 0 4px'}}>{iconFor(k)} {k}</p>{isStatus(k)?<Badge v={v}/>:<p style={{fontSize:'13px',color:'#e2e8f0',margin:0}}>{String(v)}</p>}</div>)}</div></div></div></div>)}
      {/* FORM MODAL */}
      {showForm&&(<div style={S.modal}><div style={S.modalBox}><div style={S.modalHdr}><div><p style={{fontSize:'14px',fontWeight:700,color:'#fff',margin:0}}>{form.id?'Edit':'New'} {PAGE.replace(/s$/,'')}</p><p style={{fontSize:'11px',color:'#64748b',margin:'2px 0 0'}}>{form.id?'Update record':'Create new record'}</p></div><button onClick={()=>{setShowForm(false);setForm(EMPTY);}} style={{background:'none',border:'none',cursor:'pointer',color:'#64748b',padding:'4px',borderRadius:'6px'}}><X size={16}/></button></div><div style={S.modalBody}>{FF.map(ff=><div key={ff.key} style={ff.type==='textarea'?{gridColumn:'1/-1'}:{}}><label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#64748b',marginBottom:'5px',textTransform:'uppercase',letterSpacing:'.05em'}}>{iconFor(ff.key)} {ff.label}</label>{ff.type==='select'?<select value={form[ff.key]??''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#0d1117',border:'1px solid #334155',borderRadius:'6px',padding:'7px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}>{(ff.options||[]).map(o=><option key={o}>{o}</option>)}</select>:ff.type==='textarea'?<textarea value={form[ff.key]??''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} rows={2} style={{width:'100%',background:'#0d1117',border:'1px solid #334155',borderRadius:'6px',padding:'7px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none',resize:'none'}}/>:<input type={ff.type||'text'} value={form[ff.key]??''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#0d1117',border:'1px solid #334155',borderRadius:'6px',padding:'7px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}/>}</div>)}</div><div style={S.modalFtr}><button onClick={()=>{setShowForm(false);setForm(EMPTY);}} style={{...btnBase,flex:1,justifyContent:'center'}}>Cancel</button><button onClick={save} style={{...btnPrimary,flex:1,justifyContent:'center'}}>{form.id?'Save Changes':'Create Record'}</button></div></div></div>)}
    </div>
  );
}`
}
