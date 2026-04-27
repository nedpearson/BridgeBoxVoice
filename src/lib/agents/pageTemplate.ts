/* eslint-disable */
/**
 * PAGE TEMPLATE v3 — Retail Back-Office
 * Uses inline styles (no h-full Tailwind chain), icon field cards, status badges
 */

export interface PageData {
  fields: string[]
  records: Record<string, string | number>[]
  stats: { label: string; value: string | number }[]
  formFields: { key: string; label: string; type: 'text' | 'date' | 'select' | 'textarea' | 'number'; options?: string[] }[]
  subRecords: { id: number; parentId: number; title: string; date: string; status: string }[]
}

export const STATUS_MAP = {} // kept for compat

export function validatePageData(d: any): d is PageData {
  return d && Array.isArray(d.fields) && Array.isArray(d.records) && d.fields.length > 0
}

export function generateSafeStub(pageName: string, route: string): string {
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  return [
    "import React from 'react';",
    `export default function ${safe}() {`,
    `  return <div style={{padding:'32px',color:'#e2e8f0'}}><h2>${pageName}</h2><p style={{color:'#64748b'}}>Route: ${route}</p></div>;`,
    '}',
  ].join('\n')
}

export function buildPageFromData(pageName: string, _route: string, data: PageData): string {
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const fields = data.fields.filter(f => f !== 'id')
  const dataJson = JSON.stringify(data.records).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
  const subJson  = JSON.stringify(data.subRecords)
  const statsJson = JSON.stringify(data.stats)
  const formJson = JSON.stringify(data.formFields)
  const fieldsJson = JSON.stringify(fields)
  const emptyParts = data.formFields.map(f => `"${f.key}":''`).join(',')
  const emptyForm  = `{${emptyParts}}`

  const lines: string[] = []

  lines.push(`import React from 'react';`)
  lines.push(`import { Search, Plus, Edit2, X, ChevronRight, ChevronLeft, RefreshCw, Trash2 } from 'lucide-react';`)
  lines.push(`const DATA=${dataJson};`)
  lines.push(`const SUB=${subJson};`)
  lines.push(`const STATS=${statsJson};`)
  lines.push(`const FF=${formJson};`)
  lines.push(`const FIELDS=${fieldsJson};`)
  lines.push(`const PAGE='${pageName}';`)
  lines.push(`const EMPTY=${emptyForm};`)

  // Icon map — plain ASCII fallback labels so no encoding issues
  lines.push(`const ICON={name:'👤',customer:'👤',bride:'👤',client:'👤',employee:'👤',stylist:'👤',date:'📅',appointmentDate:'📅',weddingDate:'💍',dueDate:'📅',nextPayment:'📅',status:'🔵',paymentStatus:'💳',phone:'📞',email:'📧',costPrice:'💵',retailPrice:'🏷',totalCost:'💵',totalRetail:'🏷',totalDue:'💵',balance:'💵',amountPaid:'💳',deposit:'💳',margin:'📈',commissionRate:'📈',vendor:'🏭',designer:'🏷',brand:'🏷',size:'📐',color:'🎨',style:'👗',gown:'👗',location:'📍',paymentTerms:'📋',notes:'📝',description:'📝',quantity:'📦',totalGross:'💰',basePay:'💰',totalSales:'💰',category:'🗂'};`)
  lines.push(`const ico=(k)=>ICON[k]||(Object.entries(ICON).find(([fk])=>k.toLowerCase().includes(fk.toLowerCase()))||['','*'])[1]||'*';`)
  lines.push(`const SC={active:{bg:'#052e16',c:'#4ade80',d:'#22c55e'},completed:{bg:'#052e16',c:'#4ade80',d:'#22c55e'},done:{bg:'#052e16',c:'#4ade80',d:'#22c55e'},confirmed:{bg:'#0c1a4a',c:'#60a5fa',d:'#3b82f6'},scheduled:{bg:'#0c1a4a',c:'#60a5fa',d:'#3b82f6'},pending:{bg:'#2d1a00',c:'#fbbf24',d:'#f59e0b'},cancelled:{bg:'#2d0000',c:'#f87171',d:'#ef4444'},overdue:{bg:'#2d0000',c:'#f87171',d:'#ef4444'},inactive:{bg:'#1a1a1a',c:'#94a3b8',d:'#64748b'}};`)
  lines.push(`const bs=(v)=>SC[String(v).toLowerCase()]||{bg:'#1e0a3a',c:'#c084fc',d:'#a855f7'};`)
  lines.push(`const isMon=(k)=>/amount|price|pay|cost|revenue|total|value|gross|balance|margin|deposit|fee/i.test(k);`)
  lines.push(`const isSt=(k)=>/status|availability|state/i.test(k);`)
  lines.push(`const fk=(k)=>k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase()).trim();`)

  // Styles object
  lines.push(`const S={`)
  lines.push(`  root:{display:'flex',flexDirection:'column',height:'100%',minHeight:0,background:'#0d1117',color:'#e2e8f0'},`)
  lines.push(`  bar:{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#111827',borderBottom:'1px solid #1e293b',flexShrink:0},`)
  lines.push(`  kpiGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',background:'#111827',borderBottom:'1px solid #1e293b',flexShrink:0},`)
  lines.push(`  kpiCard:{display:'flex',flexDirection:'column',padding:'10px 16px',cursor:'pointer',borderBottom:'2px solid transparent',transition:'all .15s'},`)
  lines.push(`  tbl:{flex:1,overflowY:'auto'},`)
  lines.push(`  th:{textAlign:'left',padding:'8px 14px',fontSize:'11px',fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'.06em',whiteSpace:'nowrap',borderBottom:'1px solid #1e293b'},`)
  lines.push(`  td:{padding:'9px 14px',fontSize:'13px',borderBottom:'1px solid #1e293b',whiteSpace:'nowrap'},`)
  lines.push(`  fCard:{background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'12px',cursor:'pointer',transition:'all .15s',display:'flex',flexDirection:'column',gap:'6px'},`)
  lines.push(`  aRow:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',background:'#111827',border:'1px solid #1e293b',borderRadius:'6px',cursor:'pointer',transition:'all .15s'},`)
  lines.push(`  modal:{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'},`)
  lines.push(`  mBox:{background:'#111827',border:'1px solid #334155',borderRadius:'12px',width:'100%',maxWidth:'520px',overflow:'hidden'},`)
  lines.push(`  mHdr:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #1e293b',background:'#0d1117'},`)
  lines.push(`  mBody:{padding:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',maxHeight:'60vh',overflowY:'auto'},`)
  lines.push(`  mFtr:{display:'flex',gap:'10px',padding:'14px 20px',borderTop:'1px solid #1e293b',background:'#0d1117'},`)
  lines.push(`};`)

  // Button styles
  lines.push(`const bBase={display:'flex',alignItems:'center',gap:'5px',padding:'6px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1px solid #334155',background:'#1e293b',color:'#94a3b8'};`)
  lines.push(`const bPrimary={...bBase,background:'#7c3aed',color:'white',borderColor:'#7c3aed'};`)

  // Badge component
  lines.push(`const Badge=({v})=>{const st=bs(v);return <span style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'2px 8px',borderRadius:'4px',fontSize:'11px',fontWeight:700,background:st.bg,color:st.c}}><span style={{width:'5px',height:'5px',borderRadius:'50%',background:st.d,display:'inline-block'}}/>{String(v)}</span>;};`)

  // Main component
  lines.push(`export default function ${safe}(){`)
  lines.push(`  const [items,setItems]=React.useState(DATA);`)
  lines.push(`  const [q,setQ]=React.useState('');`)
  lines.push(`  const [fil,setFil]=React.useState(null);`)
  lines.push(`  const [nav,setNav]=React.useState([{type:'list',label:PAGE}]);`)
  lines.push(`  const [form,setForm]=React.useState(EMPTY);`)
  lines.push(`  const [modal,setModal]=React.useState(false);`)
  lines.push(`  const [dtab,setDtab]=React.useState('details');`)
  lines.push(`  const push=v=>{setNav(n=>[...n,v]);setDtab('details');};`)
  lines.push(`  const pop=()=>setNav(n=>n.length>1?n.slice(0,-1):n);`)
  lines.push(`  const jump=i=>setNav(n=>n.slice(0,i+1));`)
  lines.push(`  const cur=nav[nav.length-1];`)
  lines.push(`  const rows=items.filter(r=>(!q||Object.values(r).some(v=>String(v).toLowerCase().includes(q.toLowerCase())))&&(!fil||Object.values(r).some(v=>String(v).toLowerCase().includes(fil.toLowerCase()))));`)
  lines.push(`  const related=cur.data?SUB.filter(r=>r.parentId===cur.data.id):[];`)
  lines.push(`  const sameVal=cur.fieldKey?items.filter(r=>String(r[cur.fieldKey]).toLowerCase()===String(cur.fieldValue).toLowerCase()):[];`)
  lines.push(`  const allVals=cur.fieldKey?[...new Set(items.map(r=>String(r[cur.fieldKey])))]:[];`)
  lines.push(`  const save=()=>{if(form.id)setItems(it=>it.map(i=>i.id===form.id?{...i,...form}:i));else setItems(it=>[...it,{...form,id:Date.now()}]);setModal(false);setForm(EMPTY);};`)

  // Render
  lines.push(`  return(`)
  lines.push(`  <div style={S.root}>`)

  // Toolbar / breadcrumb
  lines.push(`    <div style={S.bar}>`)
  lines.push(`      <div style={{display:'flex',alignItems:'center',gap:'4px',flex:1,overflow:'hidden',fontSize:'12px'}}>`)
  lines.push(`        {nav.map((v,i)=><React.Fragment key={i}>{i>0&&<span style={{color:'#334155',margin:'0 3px'}}>/</span>}<button onClick={()=>jump(i)} style={{background:'none',border:'none',cursor:'pointer',color:i===nav.length-1?'#fff':'#64748b',fontWeight:i===nav.length-1?600:400,fontSize:'12px',padding:'2px 4px'}}>{v.label}</button></React.Fragment>)}`)
  lines.push(`      </div>`)
  lines.push(`      <div style={{display:'flex',gap:'6px',flexShrink:0}}>`)
  lines.push(`        {cur.type!=='list'&&<button onClick={pop} style={bBase}><ChevronLeft size={12}/>Back</button>}`)
  lines.push(`        {cur.type==='list'&&<><button onClick={()=>{setFil(null);setQ('');}} style={bBase}><RefreshCw size={11}/>Reset</button><button onClick={()=>{setForm(EMPTY);setModal(true);}} style={bPrimary}><Plus size={12}/>New</button></>}`)
  lines.push(`        {cur.type==='record'&&cur.data&&<><button onClick={()=>{setForm({...cur.data});setModal(true);}} style={bBase}><Edit2 size={11}/>Edit</button><button onClick={()=>{setItems(it=>it.filter(i=>i.id!==cur.data.id));pop();}} style={{...bBase,color:'#f87171',borderColor:'#450a0a'}}><Trash2 size={11}/>Delete</button></>}`)
  lines.push(`      </div>`)
  lines.push(`    </div>`)

  // LIST VIEW
  lines.push(`    {cur.type==='list'&&<div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>`)
  // KPI bar
  lines.push(`      <div style={S.kpiGrid}>{STATS.map((s,i)=><button key={i} onClick={()=>setFil(f=>f===String(s.value)?null:String(s.value))} style={{...S.kpiCard,borderBottomColor:fil===String(s.value)?'#7c3aed':'transparent',background:fil===String(s.value)?'#1e0a3a':'transparent'}}><span style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase'}}>{s.label}</span><span style={{fontSize:'22px',fontWeight:800,color:'#fff'}}>{s.value}</span></button>)}</div>`)
  // Search bar
  lines.push(`      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',background:'#0d1117',borderBottom:'1px solid #1e293b',flexShrink:0}}>`)
  lines.push(`        <div style={{position:'relative',flex:1,maxWidth:'320px'}}><Search size={13} style={{position:'absolute',left:'9px',top:'50%',transform:'translateY(-50%)',color:'#475569'}}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={'Search '+PAGE.toLowerCase()+'...'} style={{width:'100%',paddingLeft:'30px',paddingRight:'10px',paddingTop:'7px',paddingBottom:'7px',background:'#111827',border:'1px solid #1e293b',borderRadius:'6px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}/></div>`)
  lines.push(`        {(q||fil)&&<button onClick={()=>{setQ('');setFil(null);}} style={{...bBase,padding:'7px 10px'}}><X size={11}/>Clear</button>}`)
  lines.push(`        <span style={{fontSize:'11px',color:'#475569',marginLeft:'auto'}}>{rows.length} records</span>`)
  lines.push(`      </div>`)
  // Table
  lines.push(`      <div style={S.tbl}><table style={{width:'100%',borderCollapse:'collapse'}}>`)
  lines.push(`        <thead style={{position:'sticky',top:0,zIndex:10,background:'#111827'}}><tr>{FIELDS.map(f=><th key={f} style={S.th}>{fk(f)}</th>)}<th style={{...S.th,width:'32px'}}></th></tr></thead>`)
  lines.push(`        <tbody>{rows.length===0?<tr><td colSpan={FIELDS.length+1} style={{textAlign:'center',padding:'48px',color:'#475569',fontSize:'13px'}}>No records found</td></tr>:rows.map((row,idx)=><tr key={row.id||idx} onClick={()=>push({type:'record',label:String(row[FIELDS[0]]||row.id),data:row})} style={{background:idx%2===0?'#0d1117':'#0a0d14',cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.background='#141f35'} onMouseLeave={e=>e.currentTarget.style.background=idx%2===0?'#0d1117':'#0a0d14'}>{FIELDS.map(f=><td key={f} style={S.td} onClick={e=>{e.stopPropagation();push({type:'field',label:fk(f),fieldKey:f,fieldValue:row[f]});}}>{isSt(f)?<Badge v={row[f]}/>:isMon(f)?<span style={{color:'#4ade80',fontFamily:'monospace'}}>{row[f]}</span>:<span style={{color:'#cbd5e1'}}>{String(row[f]||'')}</span>}</td>)}<td style={S.td}><Edit2 size={12} style={{color:'#475569',cursor:'pointer'}} onClick={e=>{e.stopPropagation();setForm({...row});setModal(true);}}/></td></tr>)}</tbody>`)
  lines.push(`      </table></div>`)
  lines.push(`    </div>}`)

  // RECORD DETAIL
  lines.push(`    {cur.type==='record'&&cur.data&&<div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>`)
  lines.push(`      <div style={{padding:'12px 16px',background:'#111827',borderBottom:'1px solid #1e293b',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>`)
  lines.push(`        <div><p style={{fontSize:'17px',fontWeight:700,color:'#fff',margin:0}}>{String(cur.data[FIELDS[0]]||'Record')}</p><p style={{fontSize:'11px',color:'#64748b',margin:'2px 0 0'}}>{PAGE} Record</p></div>`)
  lines.push(`        {FIELDS.find(f=>isSt(f))&&<Badge v={cur.data[FIELDS.find(f=>isSt(f))]}/>}`)
  lines.push(`      </div>`)
  lines.push(`      <div style={{display:'flex',borderBottom:'1px solid #1e293b',background:'#111827',padding:'0 16px',flexShrink:0}}>`)
  lines.push(`        {['details','activity'].map(t=><button key={t} onClick={()=>setDtab(t)} style={{padding:'8px 14px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'none',background:'transparent',color:dtab===t?'#fff':'#64748b',borderBottom:dtab===t?'2px solid #7c3aed':'2px solid transparent'}}>{t==='activity'?'Activity ('+related.length+')':'Details'}</button>)}`)
  lines.push(`      </div>`)
  lines.push(`      <div style={{flex:1,overflowY:'auto'}}>`)
  // Details tab
  lines.push(`        {dtab==='details'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'10px',padding:'16px'}}>{Object.entries(cur.data).filter(([k])=>k!=='id').map(([k,v])=><div key={k} onClick={()=>push({type:'field',label:fk(k),fieldKey:k,fieldValue:v})} style={S.fCard} onMouseEnter={e=>{e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.background='#1a0d3a';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e293b';e.currentTarget.style.background='#111827';}}><div style={{display:'flex',alignItems:'center',gap:'6px'}}><span style={{fontSize:'15px'}}>{ico(k)}</span><span style={{fontSize:'11px',color:'#64748b',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>{fk(k)}</span></div>{isSt(k)?<Badge v={v}/>:isMon(k)?<span style={{color:'#4ade80',fontFamily:'monospace',fontSize:'16px',fontWeight:700}}>{String(v)}</span>:<span style={{color:'#e2e8f0',fontSize:'14px',fontWeight:500}}>{String(v)}</span>}<span style={{fontSize:'10px',color:'#475569'}}>Click to explore →</span></div>)}</div>}`)
  // Activity tab
  lines.push(`        {dtab==='activity'&&<div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:'6px'}}>{related.length===0?<p style={{color:'#475569',fontSize:'13px',textAlign:'center',padding:'32px'}}>No activity recorded.</p>:related.map(r=><div key={r.id} onClick={()=>push({type:'subRecord',label:r.title,data:r,parentRecord:cur.data})} style={S.aRow} onMouseEnter={e=>{e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.background='#1a0d3a';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#1e293b';e.currentTarget.style.background='#111827';}}><div style={{display:'flex',alignItems:'center',gap:'10px'}}><span style={{width:'8px',height:'8px',borderRadius:'50%',background:'#7c3aed',display:'inline-block'}}/><span style={{fontSize:'13px',color:'#cbd5e1'}}>{r.title}</span></div><div style={{display:'flex',alignItems:'center',gap:'10px'}}><span style={{fontSize:'11px',color:'#64748b'}}>{r.date}</span><Badge v={r.status}/><ChevronRight size={13} style={{color:'#475569'}}/></div></div>)}</div>}`)
  lines.push(`      </div>`)
  lines.push(`    </div>}`)

  // FIELD PIVOT
  lines.push(`    {cur.type==='field'&&<div style={{flex:1,overflowY:'auto',padding:'16px'}}><div style={{maxWidth:'640px'}}><div style={{background:'#111827',border:'1px solid #1e293b',borderRadius:'10px',overflow:'hidden'}}><div style={{padding:'16px 20px',borderBottom:'1px solid #1e293b'}}><p style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',margin:'0 0 6px'}}>{ico(cur.fieldKey||'')} {cur.label}</p>{isSt(cur.fieldKey||'')?<Badge v={cur.fieldValue}/>:isMon(cur.fieldKey||'')?<span style={{fontSize:'26px',fontWeight:800,color:'#4ade80',fontFamily:'monospace'}}>{String(cur.fieldValue)}</span>:<span style={{fontSize:'22px',fontWeight:700,color:'#fff'}}>{String(cur.fieldValue)}</span>}</div><div style={{padding:'16px 20px'}}><p style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',marginBottom:'10px'}}>{sameVal.length} records with this value</p>{sameVal.map(r=><div key={r.id} onClick={()=>push({type:'record',label:String(r[FIELDS[0]]),data:r})} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',background:'#0d1117',borderRadius:'6px',border:'1px solid #1e293b',cursor:'pointer',marginBottom:'6px'}} onMouseEnter={e=>e.currentTarget.style.borderColor='#7c3aed'} onMouseLeave={e=>e.currentTarget.style.borderColor='#1e293b'}><span style={{fontSize:'13px',color:'#cbd5e1'}}>{String(r[FIELDS[0]])}</span><ChevronRight size={13} style={{color:'#475569'}}/></div>)}<p style={{fontSize:'11px',color:'#64748b',textTransform:'uppercase',margin:'14px 0 8px'}}>All values</p><div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>{allVals.map(val=><button key={val} onClick={()=>push({type:'field',label:cur.label,fieldKey:cur.fieldKey,fieldValue:val})} style={{padding:'4px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:String(val)===String(cur.fieldValue)?'#7c3aed':'#1e293b',background:String(val)===String(cur.fieldValue)?'#7c3aed':'#111827',color:String(val)===String(cur.fieldValue)?'white':'#94a3b8'}}>{val}</button>)}</div></div></div></div></div>}`)

  // SUB RECORD
  lines.push(`    {cur.type==='subRecord'&&cur.data&&<div style={{flex:1,overflowY:'auto',padding:'16px'}}><div style={{maxWidth:'640px',background:'#111827',border:'1px solid #1e293b',borderRadius:'10px',overflow:'hidden'}}><div style={{padding:'14px 20px',borderBottom:'1px solid #1e293b'}}><p style={{fontSize:'15px',fontWeight:700,color:'#fff',margin:0}}>{cur.data.title}</p></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1px',background:'#1e293b'}}>{Object.entries(cur.data).filter(([k])=>k!=='id'&&k!=='parentId').map(([k,v])=><div key={k} style={{background:'#111827',padding:'12px 16px',cursor:'pointer'}} onClick={()=>push({type:'field',label:k,fieldKey:k,fieldValue:v})} onMouseEnter={e=>e.currentTarget.style.background='#1a0d3a'} onMouseLeave={e=>e.currentTarget.style.background='#111827'}><p style={{fontSize:'11px',color:'#64748b',margin:'0 0 4px'}}>{ico(k)} {k}</p>{isSt(k)?<Badge v={v}/>:<p style={{fontSize:'13px',color:'#e2e8f0',margin:0}}>{String(v)}</p>}</div>)}</div></div></div>}`)

  // FORM MODAL
  lines.push(`    {modal&&<div style={S.modal}><div style={S.mBox}><div style={S.mHdr}><div><p style={{fontSize:'14px',fontWeight:700,color:'#fff',margin:0}}>{form.id?'Edit':'New'} {PAGE.replace(/s$/,'')}</p></div><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{background:'none',border:'none',cursor:'pointer',color:'#64748b'}}><X size={16}/></button></div><div style={S.mBody}>{FF.map(ff=><div key={ff.key} style={ff.type==='textarea'?{gridColumn:'1/-1'}:{}}><label style={{display:'block',fontSize:'11px',fontWeight:600,color:'#64748b',marginBottom:'5px',textTransform:'uppercase'}}>{ico(ff.key)} {ff.label}</label>{ff.type==='select'?<select value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#0d1117',border:'1px solid #334155',borderRadius:'6px',padding:'7px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}>{(ff.options||[]).map(o=><option key={o}>{o}</option>)}</select>:ff.type==='textarea'?<textarea value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} rows={2} style={{width:'100%',background:'#0d1117',border:'1px solid #334155',borderRadius:'6px',padding:'7px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none',resize:'none'}}/>:<input type={ff.type||'text'} value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#0d1117',border:'1px solid #334155',borderRadius:'6px',padding:'7px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}/>}</div>)}</div><div style={S.mFtr}><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{...bBase,flex:1,justifyContent:'center'}}>Cancel</button><button onClick={save} style={{...bPrimary,flex:1,justifyContent:'center'}}>{form.id?'Save':'Create'}</button></div></div></div>}`)

  lines.push(`  </div>`)
  lines.push(`  );`)
  lines.push(`}`)

  return lines.join('\n')
}
