/* eslint-disable */
export interface PageData {
  fields: string[]
  records: Record<string, string | number>[]
  stats: { label: string; value: string | number }[]
  formFields: { key: string; label: string; type: 'text'|'date'|'select'|'textarea'|'number'; options?: string[] }[]
  subRecords: { id: number; parentId: number; title: string; date: string; status: string }[]
}
export const STATUS_MAP = {}
export function validatePageData(d: any): d is PageData {
  return d && Array.isArray(d.fields) && Array.isArray(d.records) && d.fields.length > 0
}
export function generateSafeStub(pageName: string, route: string): string {
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  return `import React from 'react';\nexport default function ${safe}(){return <div style={{padding:'32px',color:'#e2e8f0'}}><h2 style={{margin:0}}>${pageName}</h2><p style={{color:'#64748b',marginTop:'8px'}}>Route: ${route}</p></div>;}`
}
export function buildPageFromData(pageName: string, _route: string, data: PageData): string {
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const fields = data.fields.filter(f => f !== 'id')
  const primaryField = fields[0] || 'id'
  const statusField = fields.find(f => /status|state|availability/i.test(f)) || ''
  const moneyFields = fields.filter(f => /price|cost|total|amount|balance|revenue|gross|margin|pay|deposit|fee/i.test(f))
  const dateField = fields.find(f => /date|time|created|updated/i.test(f)) || ''

  const dataJson = JSON.stringify(data.records).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  const subJson = JSON.stringify(data.subRecords)
  const statsJson = JSON.stringify(data.stats)
  const formJson = JSON.stringify(data.formFields)
  const fieldsJson = JSON.stringify(fields)
  const emptyForm = '{' + data.formFields.map(f => `"${f.key}":''`).join(',') + '}'

  return `import React from 'react';
import { Plus, Edit2, X, ChevronRight, ChevronLeft, Search, RefreshCw, Trash2 } from 'lucide-react';
const DATA=${dataJson};
const SUB=${subJson};
const STATS=${statsJson};
const FF=${formJson};
const FIELDS=${fieldsJson};
const PAGE='${pageName}';
const PF='${primaryField}';
const SF='${statusField}';
const DF='${dateField}';
const MF=${JSON.stringify(moneyFields)};
const EMPTY=${emptyForm};
const SC={active:{bg:'rgba(34,197,94,.12)',c:'#4ade80',dot:'#22c55e'},completed:{bg:'rgba(34,197,94,.12)',c:'#4ade80',dot:'#22c55e'},done:{bg:'rgba(34,197,94,.12)',c:'#4ade80',dot:'#22c55e'},'paid-off':{bg:'rgba(34,197,94,.12)',c:'#4ade80',dot:'#22c55e'},confirmed:{bg:'rgba(59,130,246,.12)',c:'#60a5fa',dot:'#3b82f6'},scheduled:{bg:'rgba(59,130,246,.12)',c:'#60a5fa',dot:'#3b82f6'},upcoming:{bg:'rgba(59,130,246,.12)',c:'#60a5fa',dot:'#3b82f6'},pending:{bg:'rgba(245,158,11,.12)',c:'#fbbf24',dot:'#f59e0b'},reserved:{bg:'rgba(245,158,11,.12)',c:'#fbbf24',dot:'#f59e0b'},cancelled:{bg:'rgba(239,68,68,.12)',c:'#f87171',dot:'#ef4444'},overdue:{bg:'rgba(239,68,68,.12)',c:'#f87171',dot:'#ef4444'},inactive:{bg:'rgba(100,116,139,.12)',c:'#94a3b8',dot:'#64748b'}};
const bs=v=>SC[String(v).toLowerCase()]||{bg:'rgba(168,85,247,.12)',c:'#c084fc',dot:'#a855f7'};
const isMon=k=>MF.includes(k);
const isSt=k=>!!SF&&k===SF;
const fk=k=>k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase()).trim();
const Badge=({v})=>{const s=bs(v);return <span style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:700,background:s.bg,color:s.c}}><span style={{width:'6px',height:'6px',borderRadius:'50%',background:s.dot,flexShrink:0}}/>{String(v)}</span>;};
const bBase={display:'flex',alignItems:'center',gap:'5px',padding:'7px 14px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',border:'1px solid #334155',background:'#1e293b',color:'#94a3b8',transition:'all .15s'};
const bPrimary={...bBase,background:'#7c3aed',color:'#fff',borderColor:'#7c3aed'};
export default function ${safe}(){
  const [items,setItems]=React.useState(DATA);
  const [q,setQ]=React.useState('');
  const [nav,setNav]=React.useState([{type:'list',label:PAGE}]);
  const [form,setForm]=React.useState(EMPTY);
  const [modal,setModal]=React.useState(false);
  const [dtab,setDtab]=React.useState('details');
  const push=v=>{setNav(n=>[...n,v]);setDtab('details');};
  const pop=()=>setNav(n=>n.length>1?n.slice(0,-1):n);
  const jump=i=>setNav(n=>n.slice(0,i+1));
  const cur=nav[nav.length-1];
  const rows=items.filter(r=>!q||Object.values(r).some(v=>String(v).toLowerCase().includes(q.toLowerCase())));
  const related=cur.data?SUB.filter(r=>r.parentId===cur.data.id):[];
  const sameVal=cur.fieldKey?items.filter(r=>String(r[cur.fieldKey])===String(cur.fieldValue)):[];
  const allVals=cur.fieldKey?[...new Set(items.map(r=>String(r[cur.fieldKey])))]:[];
  const save=()=>{if(form.id)setItems(it=>it.map(i=>i.id===form.id?{...i,...form}:i));else setItems(it=>[...it,{...form,id:Date.now()}]);setModal(false);setForm(EMPTY);};
  const R={root:{display:'flex',flexDirection:'column',height:'100%',minHeight:0,background:'#080c14',color:'#e2e8f0',fontFamily:"'Inter',system-ui,sans-serif"},top:{display:'flex',alignItems:'center',gap:'6px',padding:'10px 20px',background:'#0d1117',borderBottom:'1px solid #1a2235',flexShrink:0,flexWrap:'wrap'},kpi:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'1px',background:'#1a2235',flexShrink:0},kpiBox:{display:'flex',flexDirection:'column',gap:'4px',padding:'18px 24px',background:'#0d1117',cursor:'pointer',transition:'background .15s'},cards:{flex:1,overflowY:'auto',padding:'20px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'16px',alignContent:'start'},card:{background:'#0d1117',border:'1px solid #1a2235',borderRadius:'14px',padding:'20px',cursor:'pointer',transition:'all .2s',display:'flex',flexDirection:'column',gap:'12px'},fGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'12px',padding:'20px'},fBox:{background:'#0d1117',border:'1px solid #1a2235',borderRadius:'12px',padding:'16px',cursor:'pointer',transition:'all .2s',display:'flex',flexDirection:'column',gap:'8px'}};
  return (
  <div style={R.root}>
    {/* Breadcrumb + actions */}
    <div style={R.top}>
      {nav.map((v,i)=><React.Fragment key={i}>{i>0&&<ChevronRight size={13} style={{color:'#334155'}}/>}<button onClick={()=>jump(i)} style={{background:'none',border:'none',cursor:'pointer',color:i===nav.length-1?'#fff':'#475569',fontWeight:i===nav.length-1?700:400,fontSize:'13px',padding:'3px 6px',borderRadius:'6px'}}>{v.label}</button></React.Fragment>)}
      <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
        {cur.type!=='list'&&<button onClick={pop} style={bBase}><ChevronLeft size={13}/>Back</button>}
        {cur.type==='list'&&<><div style={{position:'relative'}}><Search size={13} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#475569',pointerEvents:'none'}}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={'Search '+PAGE.toLowerCase()+'...'} style={{paddingLeft:'32px',paddingRight:'12px',paddingTop:'8px',paddingBottom:'8px',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',color:'#e2e8f0',fontSize:'13px',outline:'none',width:'220px'}}/></div><button onClick={()=>{setForm(EMPTY);setModal(true);}} style={bPrimary}><Plus size={13}/>New {PAGE.replace(/s$/,'')}</button></>}
        {cur.type==='record'&&cur.data&&<><button onClick={()=>{setForm({...cur.data});setModal(true);}} style={bBase}><Edit2 size={13}/>Edit</button><button onClick={()=>{setItems(it=>it.filter(i=>i.id!==cur.data.id));pop();}} style={{...bBase,color:'#f87171',borderColor:'#450a0a'}}><Trash2 size={13}/>Delete</button></>}
      </div>
    </div>

    {/* LIST VIEW */}
    {cur.type==='list'&&<div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
      {/* KPI bar */}
      <div style={R.kpi}>{STATS.map((s,i)=><div key={i} style={R.kpiBox} onMouseEnter={e=>e.currentTarget.style.background='#111827'} onMouseLeave={e=>e.currentTarget.style.background='#0d1117'}><span style={{fontSize:'11px',fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'.08em'}}>{s.label}</span><span style={{fontSize:'28px',fontWeight:800,color:'#fff',lineHeight:1}}>{s.value}</span></div>)}</div>
      {/* Count */}
      <div style={{padding:'10px 20px 0',fontSize:'12px',color:'#475569',flexShrink:0}}>{rows.length} {PAGE.toLowerCase()} {q&&<span>matching <strong style={{color:'#a855f7'}}>"{q}"</strong></span>}{q&&<button onClick={()=>setQ('')} style={{marginLeft:'8px',background:'none',border:'none',cursor:'pointer',color:'#64748b',fontSize:'11px'}}>clear</button>}</div>
      {/* Cards grid */}
      <div style={R.cards}>
        {rows.length===0?<div style={{gridColumn:'1/-1',textAlign:'center',padding:'60px 0',color:'#334155',fontSize:'14px'}}>No records found</div>:rows.map((row,idx)=>{
          const primary=String(row[PF]||'');
          const secondary=DF?String(row[DF]||''):'';
          const moneyVals=MF.slice(0,2).map(f=>({k:fk(f),v:String(row[f]||'')}));
          const statusVal=SF?String(row[SF]||''):'';
          return <div key={row.id||idx} onClick={()=>push({type:'record',label:primary,data:row})} style={R.card} onMouseEnter={e=>{e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.background='#0f1625';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 32px rgba(124,58,237,.18)';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#1a2235';e.currentTarget.style.background='#0d1117';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'8px'}}>
              <div><div style={{fontSize:'16px',fontWeight:700,color:'#fff',lineHeight:1.3}}>{primary}</div>{secondary&&<div style={{fontSize:'12px',color:'#475569',marginTop:'4px'}}>{secondary}</div>}</div>
              {statusVal&&<Badge v={statusVal}/>}
            </div>
            {moneyVals.length>0&&<div style={{display:'flex',gap:'16px'}}>{moneyVals.map((mv,mi)=><div key={mi}><div style={{fontSize:'10px',color:'#475569',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'2px'}}>{mv.k}</div><div style={{fontSize:'18px',fontWeight:700,color:'#4ade80',fontFamily:'monospace'}}>{mv.v}</div></div>)}</div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>{FIELDS.filter(f=>f!==PF&&f!==SF&&f!==DF&&!MF.slice(0,2).includes(f)).slice(0,4).map(f=><div key={f} style={{background:'#111827',borderRadius:'8px',padding:'8px 10px'}}><div style={{fontSize:'10px',color:'#475569',fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'2px'}}>{fk(f)}</div><div style={{fontSize:'13px',color:'#cbd5e1',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{String(row[f]||'—')}</div></div>)}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',marginTop:'4px'}}><span style={{fontSize:'11px',color:'#334155'}}>View details</span><ChevronRight size={13} style={{color:'#334155',marginLeft:'4px'}}/></div>
          </div>;
        })}
      </div>
    </div>}

    {/* RECORD DETAIL */}
    {cur.type==='record'&&cur.data&&<div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
      <div style={{padding:'20px',background:'#0d1117',borderBottom:'1px solid #1a2235',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px'}}>
          <div><h2 style={{margin:0,fontSize:'22px',fontWeight:800,color:'#fff'}}>{String(cur.data[PF]||'Record')}</h2><p style={{margin:'4px 0 0',fontSize:'12px',color:'#475569'}}>{PAGE} &rsaquo; {String(cur.data[PF])}</p></div>
          {SF&&<Badge v={cur.data[SF]}/>}
        </div>
      </div>
      <div style={{display:'flex',borderBottom:'1px solid #1a2235',background:'#0d1117',padding:'0 20px',flexShrink:0}}>
        {['details','activity'].map(t=><button key={t} onClick={()=>setDtab(t)} style={{padding:'10px 16px',fontSize:'13px',fontWeight:600,cursor:'pointer',border:'none',background:'transparent',color:dtab===t?'#fff':'#475569',borderBottom:dtab===t?'2px solid #7c3aed':'2px solid transparent',marginBottom:'-1px'}}>{t==='activity'?'Activity ('+related.length+')':'Details'}</button>)}
      </div>
      <div style={{flex:1,overflowY:'auto'}}>
        {dtab==='details'&&<div style={R.fGrid}>{Object.entries(cur.data).filter(([k])=>k!=='id').map(([k,v])=><div key={k} onClick={()=>push({type:'field',label:fk(k),fieldKey:k,fieldValue:v})} style={R.fBox} onMouseEnter={e=>{e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.background='#120a24';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#1a2235';e.currentTarget.style.background='#0d1117';}}>
          <div style={{fontSize:'11px',fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'.08em'}}>{fk(k)}</div>
          {isSt(k)?<Badge v={v}/>:isMon(k)?<div style={{fontSize:'24px',fontWeight:800,color:'#4ade80',fontFamily:'monospace'}}>{String(v)}</div>:<div style={{fontSize:'16px',fontWeight:600,color:'#e2e8f0'}}>{String(v)}</div>}
          <div style={{fontSize:'11px',color:'#334155',marginTop:'4px'}}>Tap to explore all records ›</div>
        </div>)}</div>}
        {dtab==='activity'&&<div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'10px'}}>{related.length===0?<div style={{textAlign:'center',padding:'60px',color:'#334155',fontSize:'14px'}}>No activity recorded yet.</div>:related.map(r=><div key={r.id} onClick={()=>push({type:'subRecord',label:r.title,data:r,parentRecord:cur.data})} style={{background:'#0d1117',border:'1px solid #1a2235',borderRadius:'12px',padding:'16px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',transition:'all .2s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.background='#0f1625';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#1a2235';e.currentTarget.style.background='#0d1117';}}><div style={{display:'flex',alignItems:'center',gap:'12px'}}><div style={{width:'10px',height:'10px',borderRadius:'50%',background:'#7c3aed',flexShrink:0}}/><div><div style={{fontSize:'14px',fontWeight:600,color:'#e2e8f0'}}>{r.title}</div><div style={{fontSize:'12px',color:'#475569',marginTop:'2px'}}>{r.date}</div></div></div><div style={{display:'flex',alignItems:'center',gap:'10px'}}><Badge v={r.status}/><ChevronRight size={14} style={{color:'#334155'}}/></div></div>)}</div>}
      </div>
    </div>}

    {/* FIELD PIVOT */}
    {cur.type==='field'&&<div style={{flex:1,overflowY:'auto',padding:'24px'}}>
      <div style={{maxWidth:'700px'}}>
        <div style={{background:'#0d1117',border:'1px solid #1a2235',borderRadius:'16px',overflow:'hidden',marginBottom:'16px'}}>
          <div style={{padding:'24px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#1a0d3a,#0d1117)'}}>
            <div style={{fontSize:'11px',fontWeight:700,color:'#7c3aed',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'8px'}}>{cur.label}</div>
            {isSt(cur.fieldKey||'')?<Badge v={cur.fieldValue}/>:isMon(cur.fieldKey||'')?<div style={{fontSize:'36px',fontWeight:800,color:'#4ade80',fontFamily:'monospace'}}>{String(cur.fieldValue)}</div>:<div style={{fontSize:'28px',fontWeight:800,color:'#fff'}}>{String(cur.fieldValue)}</div>}
          </div>
          <div style={{padding:'20px'}}>
            <div style={{fontSize:'12px',fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'12px'}}>{sameVal.length} records share this value</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>{sameVal.map(r=><div key={r.id} onClick={()=>push({type:'record',label:String(r[PF]),data:r})} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'#111827',border:'1px solid #1a2235',borderRadius:'10px',cursor:'pointer',transition:'all .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='#7c3aed'} onMouseLeave={e=>e.currentTarget.style.borderColor='#1a2235'}><span style={{fontSize:'14px',fontWeight:500,color:'#e2e8f0'}}>{String(r[PF])}</span><ChevronRight size={14} style={{color:'#475569'}}/></div>)}</div>
            <div style={{marginTop:'20px'}}><div style={{fontSize:'12px',fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'10px'}}>All values in {cur.label}</div><div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>{allVals.map(val=><button key={val} onClick={()=>push({type:'field',label:cur.label,fieldKey:cur.fieldKey,fieldValue:val})} style={{padding:'6px 14px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',border:'1px solid',borderColor:String(val)===String(cur.fieldValue)?'#7c3aed':'#1a2235',background:String(val)===String(cur.fieldValue)?'rgba(124,58,237,.2)':'#111827',color:String(val)===String(cur.fieldValue)?'#c084fc':'#64748b',transition:'all .15s'}}>{val}</button>)}</div></div>
          </div>
        </div>
      </div>
    </div>}

    {/* SUB-RECORD */}
    {cur.type==='subRecord'&&cur.data&&<div style={{flex:1,overflowY:'auto',padding:'24px'}}><div style={{maxWidth:'700px',background:'#0d1117',border:'1px solid #1a2235',borderRadius:'16px',overflow:'hidden'}}><div style={{padding:'20px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#1a0d3a,#0d1117)'}}><h3 style={{margin:0,fontSize:'18px',fontWeight:700,color:'#fff'}}>{cur.data.title}</h3></div><div style={R.fGrid}>{Object.entries(cur.data).filter(([k])=>k!=='id'&&k!=='parentId').map(([k,v])=><div key={k} onClick={()=>push({type:'field',label:k,fieldKey:k,fieldValue:v})} style={R.fBox} onMouseEnter={e=>{e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.background='#120a24';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#1a2235';e.currentTarget.style.background='#0d1117';}}><div style={{fontSize:'11px',fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'.08em'}}>{k}</div>{isSt(k)?<Badge v={v}/>:<div style={{fontSize:'15px',fontWeight:600,color:'#e2e8f0'}}>{String(v)}</div>}</div>)}</div></div></div>}

    {/* FORM MODAL */}
    {modal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(6px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}><div style={{background:'#0d1117',border:'1px solid #334155',borderRadius:'16px',width:'100%',maxWidth:'560px',overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,.9)'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#1a0d3a,#0d1117)'}}><div><div style={{fontSize:'16px',fontWeight:700,color:'#fff'}}>{form.id?'Edit':'New'} {PAGE.replace(/s$/,'')}</div><div style={{fontSize:'12px',color:'#475569',marginTop:'2px'}}>{form.id?'Update existing record':'Create a new record'}</div></div><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{background:'rgba(255,255,255,.08)',border:'none',cursor:'pointer',color:'#94a3b8',borderRadius:'8px',padding:'6px',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16}/></button></div>
      <div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',maxHeight:'60vh',overflowY:'auto'}}>{FF.map(ff=><div key={ff.key} style={ff.type==='textarea'?{gridColumn:'1/-1'}:{}}><label style={{display:'block',fontSize:'11px',fontWeight:700,color:'#64748b',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.06em'}}>{ff.label}</label>{ff.type==='select'?<select value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'9px 12px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}>{(ff.options||[]).map(o=><option key={o}>{o}</option>)}</select>:ff.type==='textarea'?<textarea value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} rows={3} style={{width:'100%',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'9px 12px',color:'#e2e8f0',fontSize:'13px',outline:'none',resize:'vertical'}}/>:<input type={ff.type||'text'} value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'9px 12px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}/>}</div>)}</div>
      <div style={{display:'flex',gap:'10px',padding:'16px 24px',borderTop:'1px solid #1a2235',background:'#080c14'}}><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{...bBase,flex:1,justifyContent:'center'}}>Cancel</button><button onClick={save} style={{...bPrimary,flex:1,justifyContent:'center'}}>{form.id?'Save Changes':'Create Record'}</button></div>
    </div></div>}
  </div>);
}`
}
