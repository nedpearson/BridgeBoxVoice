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

const Badge=({v})=>{const s=bs(v);return <span style={{display:'inline-flex',alignItems:'center',gap:'6px',padding:'4px 12px',borderRadius:'20px',fontSize:'11px',fontWeight:800,letterSpacing:'.02em',background:s.bg,color:s.c}}><span style={{width:'6px',height:'6px',borderRadius:'50%',background:s.dot,flexShrink:0}}/>{String(v)}</span>;};

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

  const R={root:{display:'flex',flexDirection:'column',height:'100%',minHeight:0,background:'#080c14',color:'#e2e8f0',fontFamily:"'Inter',system-ui,sans-serif"},top:{display:'flex',alignItems:'center',gap:'6px',padding:'12px 24px',background:'#080c18',borderBottom:'1px solid #1a2538',flexShrink:0,flexWrap:'wrap'},kpi:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'1px',background:'#1a2235',flexShrink:0},kpiBox:{display:'flex',flexDirection:'column',gap:'6px',padding:'22px 28px',background:'#090d1a',cursor:'pointer',transition:'background .15s'},cards:{flex:1,overflowY:'auto',padding:'24px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:'20px',alignContent:'start'},card:{background:'linear-gradient(145deg,#0f1729,#0a1020)',border:'1px solid #1e2d45',borderRadius:'16px',padding:'22px',cursor:'pointer',transition:'all .2s',display:'flex',flexDirection:'column',gap:'12px'},fGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:'16px',padding:'24px'},fBox:{background:'#0d1626',border:'1px solid #1e2d45',borderRadius:'14px',padding:'18px',cursor:'pointer',transition:'all .2s',display:'flex',flexDirection:'column',gap:'8px'}};

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
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',background:'#090d1a',flexShrink:0,borderBottom:'1px solid #1a2538'}}>{STATS.map((s,i)=><div key={i} style={{padding:'20px 28px',borderRight:'1px solid #1a2538'}}><div style={{fontSize:'10px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'8px'}}>{s.label}</div><div style={{fontSize:'32px',fontWeight:900,color:'#fff',lineHeight:1}}>{s.value}</div></div>)}</div>

      {/* Toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'14px 20px',background:'#080c18',borderBottom:'1px solid #1a2538',flexShrink:0}}>
        <div style={{position:'relative',flex:1,maxWidth:'320px'}}><Search size={13} style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',color:'#374151',pointerEvents:'none'}}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={'Search '+PAGE.toLowerCase()+'...'} style={{width:'100%',paddingLeft:'32px',paddingRight:'12px',paddingTop:'9px',paddingBottom:'9px',background:'#0d1626',border:'1px solid #1e2d45',borderRadius:'10px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}/></div>
        <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
          <span style={{fontSize:'12px',color:'#374151',alignSelf:'center'}}>{rows.length} {PAGE.toLowerCase()}</span>
          <button onClick={()=>{setForm(EMPTY);setModal(true);}} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}><Plus size={13}/>New {PAGE.replace(/s$/,'')}</button>
        </div>
      </div>

      {/* Table */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
        {rows.length===0?<div style={{textAlign:'center',padding:'80px',color:'#374151',fontSize:'14px'}}>No records found</div>:
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'2px solid #1a2538'}}>{[PF,...FIELDS.filter(f=>f!==PF).slice(0,4)].map(f=><th key={f} style={{textAlign:'left',padding:'10px 14px',fontSize:'10px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.08em',whiteSpace:'nowrap'}}>{fk(f)}</th>)}<th style={{padding:'10px 14px'}}></th></tr></thead>
          <tbody>
            {rows.map((row,idx)=>{
              const statusVal=SF?String(row[SF]||''):'';
              const sc=bs(statusVal);
              return <tr key={row.id||idx} onClick={()=>push({type:'record',label:String(row[PF]||''),data:row})} style={{borderBottom:'1px solid #111827',cursor:'pointer',transition:'background .1s'}} onMouseEnter={e=>e.currentTarget.style.background='#0d1626'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <td style={{padding:'13px 14px',borderLeft:'3px solid '+sc.dot}}>
                  <div style={{fontSize:'14px',fontWeight:700,color:'#fff'}}>{String(row[PF]||'')}</div>
                  {DF&&<div style={{fontSize:'11px',color:'#4a5a72',marginTop:'2px'}}>{String(row[DF]||'')}</div>}
                </td>
                {FIELDS.filter(f=>f!==PF&&f!==DF).slice(0,3).map(f=><td key={f} style={{padding:'13px 14px'}}>{isSt(f)?<Badge v={row[f]}/>:isMon(f)?<span style={{color:'#4ade80',fontWeight:800,fontFamily:'monospace',fontSize:'15px'}}>{String(row[f]||'')}</span>:<span style={{color:'#94a3b8',fontSize:'13px'}}>{String(row[f]||'')}</span>}</td>)}
                {SF&&<td style={{padding:'13px 14px'}}><Badge v={row[SF]}/></td>}
                <td style={{padding:'13px 14px',textAlign:'right'}}><button onClick={e=>{e.stopPropagation();setForm({...row});setModal(true);}} style={{padding:'5px 12px',borderRadius:'7px',fontSize:'12px',fontWeight:600,border:'1px solid #1e2d45',background:'#0d1626',color:'#94a3b8',cursor:'pointer'}}>Edit</button></td>
              </tr>;
            })}
          </tbody>
        </table>}
      </div>
    </div>}


    {/* RECORD DETAIL */}

    {cur.type==='record'&&cur.data&&<div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>

      {/* Detail header */}
      <div style={{padding:'18px 24px',background:'linear-gradient(135deg,#0f1a35,#080d1c)',borderBottom:'1px solid #1e2d45',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px'}}>
        <div>
          <h2 style={{margin:0,fontSize:'22px',fontWeight:900,color:'#fff',letterSpacing:'-0.02em'}}>{String(cur.data[PF]||'Record')}</h2>
          <p style={{margin:'4px 0 0',fontSize:'12px',color:'#4a5a72'}}>{PAGE} &rsaquo; {String(cur.data[PF])}</p>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
          {SF&&<Badge v={cur.data[SF]}/>}
          <button onClick={()=>{setForm({...cur.data});setModal(true);}} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 16px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}><Edit2 size={13}/>Edit</button>
          <button onClick={()=>{setItems(it=>it.filter(i=>i.id!==cur.data.id));pop();}} style={{display:'flex',alignItems:'center',gap:'6px',padding:'8px 14px',background:'rgba(239,68,68,.1)',color:'#f87171',border:'1px solid rgba(239,68,68,.2)',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}><Trash2 size={13}/></button>
        </div>
      </div>

      {/* Two-panel body */}
      <div style={{flex:1,overflow:'auto',display:'flex',gap:0}}>

        {/* Left: field sections */}
        <div style={{flex:'1 1 65%',padding:'20px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'16px'}}>

          {/* Information card */}
          <div style={{background:'linear-gradient(145deg,#0f1729,#0a1020)',border:'1px solid #1e2d45',borderRadius:'16px',padding:'22px'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'18px'}}>Record Information</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'16px'}}>
              {Object.entries(cur.data).filter(([k])=>k!=='id').map(([k,v])=><div key={k} onClick={()=>push({type:'field',label:fk(k),fieldKey:k,fieldValue:v})} style={{cursor:'pointer',padding:'14px',background:'#080d1c',border:'1px solid #1a2538',borderRadius:'12px',transition:'border-color .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='#7c3aed'} onMouseLeave={e=>e.currentTarget.style.borderColor='#1a2538'}>
                <div style={{fontSize:'10px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'8px'}}>{fk(k)}</div>
                {isSt(k)?<Badge v={v}/>:isMon(k)?<div style={{fontSize:'24px',fontWeight:900,color:'#4ade80',fontFamily:'monospace'}}>{String(v)}</div>:<div style={{fontSize:'15px',fontWeight:600,color:'#e2e8f0'}}>{String(v)}</div>}
              </div>)}
            </div>
          </div>

          {/* Activity */}
          <div style={{background:'linear-gradient(145deg,#0f1729,#0a1020)',border:'1px solid #1e2d45',borderRadius:'16px',padding:'22px'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'18px'}}>Activity ({related.length})</div>
            {related.length===0?<div style={{textAlign:'center',padding:'32px',color:'#374151',fontSize:'13px'}}>No activity recorded</div>:
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {related.map((r,ri)=><div key={r.id} onClick={()=>push({type:'subRecord',label:r.title,data:r,parentRecord:cur.data})} style={{display:'flex',alignItems:'flex-start',gap:'12px',padding:'14px 0',borderBottom:ri<related.length-1?'1px solid #111827':'none',cursor:'pointer'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#7c3aed',flexShrink:0,marginTop:'5px'}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:'14px',fontWeight:600,color:'#e2e8f0'}}>{r.title}</div>
                  <div style={{fontSize:'11px',color:'#4a5a72',marginTop:'2px'}}>{r.date}</div>
                </div>
                <Badge v={r.status}/>
                <ChevronRight size={14} style={{color:'#374151'}}/>
              </div>)}
            </div>}
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{flex:'0 0 280px',padding:'20px 20px 20px 0',display:'flex',flexDirection:'column',gap:'14px',overflowY:'auto'}}>

          {/* Money summary */}
          {MF.length>0&&<div style={{background:'linear-gradient(145deg,#0f1729,#0a1020)',border:'1px solid #1e2d45',borderRadius:'16px',padding:'18px'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'14px'}}>Financial Summary</div>
            {MF.map(f=><div key={f} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <span style={{fontSize:'12px',color:'#94a3b8'}}>{fk(f)}</span>
              <span style={{fontSize:'18px',fontWeight:900,color:'#4ade80',fontFamily:'monospace'}}>{String(cur.data[f]||'')}</span>
            </div>)}
          </div>}

          {/* Quick actions */}
          <div style={{background:'linear-gradient(145deg,#0f1729,#0a1020)',border:'1px solid #1e2d45',borderRadius:'16px',padding:'18px'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'14px'}}>Quick Actions</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <button onClick={()=>{setForm({...cur.data});setModal(true);}} style={{width:'100%',padding:'10px',background:'rgba(124,58,237,.1)',border:'1px solid rgba(124,58,237,.25)',borderRadius:'10px',color:'#c084fc',fontSize:'13px',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}><Edit2 size={13}/>Edit Record</button>
              <button onClick={pop} style={{width:'100%',padding:'10px',background:'#0d1626',border:'1px solid #1e2d45',borderRadius:'10px',color:'#94a3b8',fontSize:'13px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}><ChevronLeft size={13}/>Back to List</button>
              <button onClick={()=>{setItems(it=>it.filter(i=>i.id!==cur.data.id));pop();}} style={{width:'100%',padding:'10px',background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.15)',borderRadius:'10px',color:'#f87171',fontSize:'13px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'8px'}}><Trash2 size={13}/>Delete Record</button>
            </div>
          </div>
        </div>
      </div>
    </div>}


    {/* FIELD PIVOT */}

    {cur.type==='field'&&<div style={{flex:1,overflowY:'auto',padding:'24px'}}>

      <div style={{maxWidth:'700px'}}>

        <div style={{background:'#0d1117',border:'1px solid #1a2235',borderRadius:'16px',overflow:'hidden',marginBottom:'16px'}}>

          <div style={{padding:'24px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#160d38,#080d1c)'}}>

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

    {cur.type==='subRecord'&&cur.data&&<div style={{flex:1,overflowY:'auto',padding:'24px'}}><div style={{maxWidth:'700px',background:'#0d1117',border:'1px solid #1a2235',borderRadius:'16px',overflow:'hidden'}}><div style={{padding:'20px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#160d38,#080d1c)'}}><h3 style={{margin:0,fontSize:'18px',fontWeight:700,color:'#fff'}}>{cur.data.title}</h3></div><div style={R.fGrid}>{Object.entries(cur.data).filter(([k])=>k!=='id'&&k!=='parentId').map(([k,v])=><div key={k} onClick={()=>push({type:'field',label:k,fieldKey:k,fieldValue:v})} style={R.fBox} onMouseEnter={e=>{e.currentTarget.style.borderColor='#7c3aed';e.currentTarget.style.background='#120a24';}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#1a2235';e.currentTarget.style.background='#0d1117';}}><div style={{fontSize:'11px',fontWeight:700,color:'#475569',textTransform:'uppercase',letterSpacing:'.08em'}}>{k}</div>{isSt(k)?<Badge v={v}/>:<div style={{fontSize:'15px',fontWeight:600,color:'#e2e8f0'}}>{String(v)}</div>}</div>)}</div></div></div>}



    {/* FORM MODAL */}

    {modal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(6px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}><div style={{background:'#0d1117',border:'1px solid #334155',borderRadius:'16px',width:'100%',maxWidth:'560px',overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,.9)'}}>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#160d38,#080d1c)'}}><div><div style={{fontSize:'16px',fontWeight:700,color:'#fff'}}>{form.id?'Edit':'New'} {PAGE.replace(/s$/,'')}</div><div style={{fontSize:'12px',color:'#475569',marginTop:'2px'}}>{form.id?'Update existing record':'Create a new record'}</div></div><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{background:'rgba(255,255,255,.08)',border:'none',cursor:'pointer',color:'#94a3b8',borderRadius:'8px',padding:'6px',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={16}/></button></div>

      <div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',maxHeight:'60vh',overflowY:'auto'}}>{FF.map(ff=><div key={ff.key} style={ff.type==='textarea'?{gridColumn:'1/-1'}:{}}><label style={{display:'block',fontSize:'11px',fontWeight:700,color:'#64748b',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'.06em'}}>{ff.label}</label>{ff.type==='select'?<select value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#0a0f1e',border:'1px solid #1e2d45',borderRadius:'10px',padding:'11px 14px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}>{(ff.options||[]).map(o=><option key={o}>{o}</option>)}</select>:ff.type==='textarea'?<textarea value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} rows={3} style={{width:'100%',background:'#0a0f1e',border:'1px solid #1e2d45',borderRadius:'10px',padding:'11px 14px',color:'#e2e8f0',fontSize:'13px',outline:'none',resize:'vertical'}}/>:<input type={ff.type||'text'} value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#0a0f1e',border:'1px solid #1e2d45',borderRadius:'10px',padding:'11px 14px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}/>}</div>)}</div>

      <div style={{display:'flex',gap:'10px',padding:'16px 24px',borderTop:'1px solid #1a2235',background:'#080c14'}}><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{...bBase,flex:1,justifyContent:'center'}}>Cancel</button><button onClick={save} style={{...bPrimary,flex:1,justifyContent:'center'}}>{form.id?'Save Changes':'Create Record'}</button></div>

    </div></div>}

  </div>);

}`

}



// ── Calendar page builder ──────────────────────────────────────────────────────
export function buildCalendarPage(pageName: string, _route: string, data: PageData): string {
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const fields = data.fields.filter(f => f !== 'id')
  const dateField = fields.find(f => /date|time|start/i.test(f)) || fields[1] || 'date'
  const primaryField = fields[0] || 'name'
  const statusField = fields.find(f => /status|state/i.test(f)) || ''
  const dataJson = JSON.stringify(data.records).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  const statsJson = JSON.stringify(data.stats)
  const formJson = JSON.stringify(data.formFields)
  const emptyForm = '{' + data.formFields.map(f => `"${f.key}":''`).join(',') + '}'

  const L: string[] = []
  L.push(`import React from 'react';`)
  L.push(`import { Plus, X } from 'lucide-react';`)
  L.push(`const DATA=${dataJson};`)
  L.push(`const STATS=${statsJson};`)
  L.push(`const FF=${formJson};`)
  L.push(`const PAGE='${pageName}';`)
  L.push(`const DF='${dateField}';`)
  L.push(`const PF='${primaryField}';`)
  L.push(`const SF='${statusField}';`)
  L.push(`const EMPTY=${emptyForm};`)
  L.push(`const MO=['January','February','March','April','May','June','July','August','September','October','November','December'];`)
  L.push(`const WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];`)
  L.push(`const SC={active:'#22c55e',confirmed:'#60a5fa',scheduled:'#60a5fa',completed:'#22c55e',done:'#22c55e','no-show':'#ef4444',cancelled:'#ef4444',pending:'#fbbf24','walk-in':'#a855f7'};`)
  L.push(`const ec=v=>SC[String(v).toLowerCase()]||'#a855f7';`)
  L.push(`const fk=k=>k.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase()).trim();`)
  L.push(`const bB={display:'flex',alignItems:'center',gap:'5px',padding:'7px 14px',borderRadius:'8px',fontSize:'13px',fontWeight:600,cursor:'pointer',border:'1px solid #334155',background:'#1e293b',color:'#94a3b8'};`)
  L.push(`const bP={...bB,background:'#7c3aed',color:'#fff',borderColor:'#7c3aed'};`)
  L.push(`const Bg=({v})=><span style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'2px 8px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:ec(v)+'22',color:ec(v)}}><span style={{width:'5px',height:'5px',borderRadius:'50%',background:ec(v),flexShrink:0}}/>{String(v)}</span>;`)
  L.push(`export default function ${safe}(){`)
  L.push(`  const [items,setItems]=React.useState(DATA);`)
  L.push(`  const [view,setView]=React.useState('month');`)
  L.push(`  const [cur,setCur]=React.useState(new Date());`)
  L.push(`  const [modal,setModal]=React.useState(false);`)
  L.push(`  const [form,setForm]=React.useState(EMPTY);`)
  L.push(`  const [sel,setSel]=React.useState(null);`)
  L.push(`  const y=cur.getFullYear(),mo=cur.getMonth();`)
  L.push(`  const save=()=>{if(form.id)setItems(it=>it.map(i=>i.id===form.id?{...i,...form}:i));else setItems(it=>[...it,{...form,id:Date.now()}]);setModal(false);setForm(EMPTY);};`)
  L.push(`  const nav=d=>{const n=new Date(cur);if(view==='month')n.setMonth(mo+d);else if(view==='week')n.setDate(cur.getDate()+d*7);else n.setDate(cur.getDate()+d);setCur(n);};`)
  L.push(`  const evOn=d=>items.filter(r=>{try{return new Date(r[DF]).toDateString()===d.toDateString();}catch{return false;}});`)
  L.push(`  const fd=new Date(y,mo,1).getDay();`)
  L.push(`  const dim=new Date(y,mo+1,0).getDate();`)
  L.push(`  const cells=[...Array(fd).fill(null),...Array.from({length:dim},(_,i)=>new Date(y,mo,i+1))];`)
  L.push(`  const ws=new Date(cur);ws.setDate(cur.getDate()-cur.getDay());`)
  L.push(`  const wk=Array.from({length:7},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return d;});`)
  L.push(`  const hrs=Array.from({length:11},(_,i)=>i+8);`)
  L.push(`  const hdr=view==='month'?MO[mo]+' '+y:view==='week'?'Week of '+wk[0].toLocaleDateString('en-US',{month:'short',day:'numeric'}):cur.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});`)
  L.push(`  const pill=(ev,i)=><div key={i} onClick={()=>setSel(ev)} style={{background:ec(ev[SF]||'')+'28',borderLeft:'3px solid '+ec(ev[SF]||''),borderRadius:'4px',padding:'2px 5px',fontSize:'10px',color:'#e2e8f0',cursor:'pointer',marginBottom:'1px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{String(ev[PF]||'')}</div>;`)
  L.push(`  return(<div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:0,background:'#080c14',color:'#e2e8f0',fontFamily:"'Inter',system-ui,sans-serif"}}>`)
  L.push(`    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1px',background:'#1a2235',flexShrink:0}}>{STATS.map((s,i)=><div key={i} style={{display:'flex',flexDirection:'column',gap:'4px',padding:'14px 20px',background:'#0d1117'}}><span style={{fontSize:'11px',fontWeight:600,color:'#475569',textTransform:'uppercase',letterSpacing:'.08em'}}>{s.label}</span><span style={{fontSize:'24px',fontWeight:800,color:'#fff',lineHeight:1}}>{s.value}</span></div>)}</div>`)
  L.push(`    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 20px',background:'#0d1117',borderBottom:'1px solid #1a2235',flexShrink:0}}>`)
  L.push(`      <button onClick={()=>setCur(new Date())} style={bB}>Today</button>`)
  L.push(`      <button onClick={()=>nav(-1)} style={{...bB,padding:'7px 10px'}}>&#8249;</button>`)
  L.push(`      <button onClick={()=>nav(1)} style={{...bB,padding:'7px 10px'}}>&#8250;</button>`)
  L.push(`      <span style={{fontSize:'15px',fontWeight:700,color:'#fff',flex:1}}>{hdr}</span>`)
  L.push(`      {[['month','Month'],['week','Week'],['day','Day'],['list','List']].map(([v,l])=><button key={v} onClick={()=>setView(v)} style={{...bB,borderColor:view===v?'#7c3aed':'#334155',background:view===v?'rgba(124,58,237,.15)':'#1e293b',color:view===v?'#c084fc':'#94a3b8'}}>{l}</button>)}`)
  L.push(`      <button onClick={()=>{setForm(EMPTY);setModal(true);}} style={bP}><Plus size={13}/>New</button>`)
  L.push(`    </div>`)
  L.push(`    <div style={{flex:1,overflowY:'auto'}}>`)
  L.push(`      {view==='month'&&<div style={{padding:'12px'}}><div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:'4px'}}>{WD.map(d=><div key={d} style={{textAlign:'center',fontSize:'11px',fontWeight:700,color:'#475569',padding:'6px 0',textTransform:'uppercase'}}>{d}</div>)}</div><div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'3px'}}>{cells.map((d,i)=>{const evs=d?evOn(d):[];const isTd=d&&d.toDateString()===new Date().toDateString();return <div key={i} style={{minHeight:'96px',background:d?'#0d1117':'transparent',border:d?'1px solid '+(isTd?'#7c3aed':'#1a2235'):'none',borderRadius:'8px',padding:'6px'}}>{d&&<><div style={{fontSize:'12px',fontWeight:isTd?800:500,color:isTd?'#a855f7':'#64748b',marginBottom:'4px',width:'22px',height:'22px',borderRadius:'50%',background:isTd?'rgba(168,85,247,.2)':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>{d.getDate()}</div>{evs.slice(0,3).map(pill)}{evs.length>3&&<div style={{fontSize:'10px',color:'#475569'}}>+{evs.length-3}</div>}</>}</div>;})} </div></div>}`)
  L.push(`      {view==='week'&&<div><div style={{display:'grid',gridTemplateColumns:'52px repeat(7,1fr)',background:'#0d1117',position:'sticky',top:0,zIndex:5,borderBottom:'1px solid #1a2235'}}><div/>{wk.map((d,i)=>{const isTd=d.toDateString()===new Date().toDateString();return <div key={i} style={{padding:'8px 4px',textAlign:'center',borderLeft:'1px solid #1a2235'}}><div style={{fontSize:'10px',color:'#475569',textTransform:'uppercase'}}>{WD[d.getDay()]}</div><div style={{fontSize:'20px',fontWeight:700,color:isTd?'#a855f7':'#fff',width:'32px',height:'32px',borderRadius:'50%',background:isTd?'rgba(168,85,247,.15)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto'}}>{d.getDate()}</div></div>;})} </div>{hrs.map(h=><div key={h} style={{display:'grid',gridTemplateColumns:'52px repeat(7,1fr)',borderBottom:'1px solid #1a2235'}}><div style={{padding:'6px 4px',textAlign:'right',fontSize:'10px',color:'#475569',paddingTop:'8px'}}>{h>12?h-12+'pm':h===12?'12pm':h+'am'}</div>{wk.map((d,di)=><div key={di} style={{borderLeft:'1px solid #1a2235',minHeight:'52px',padding:'2px 3px'}}>{evOn(d).map(pill)}</div>)}</div>)}</div>}`)
  L.push(`      {view==='day'&&<div style={{padding:'16px',maxWidth:'640px'}}>{hrs.map(h=><div key={h} style={{display:'flex',gap:'12px',marginBottom:'1px'}}><div style={{width:'44px',textAlign:'right',fontSize:'11px',color:'#475569',paddingTop:'8px',flexShrink:0}}>{h>12?h-12+'pm':h===12?'12pm':h+'am'}</div><div style={{flex:1,borderTop:'1px solid #1a2235',minHeight:'60px',padding:'4px'}}>{evOn(cur).map(pill)}</div></div>)}</div>}`)
  L.push(`      {view==='list'&&<div style={{padding:'16px',display:'flex',flexDirection:'column',gap:'8px'}}>{items.map((r,i)=><div key={i} onClick={()=>setSel(r)} style={{background:'#0d1117',border:'1px solid #1a2235',borderRadius:'12px',padding:'14px 18px',display:'flex',alignItems:'center',gap:'14px',cursor:'pointer',transition:'border-color .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='#7c3aed'} onMouseLeave={e=>e.currentTarget.style.borderColor='#1a2235'}><div style={{width:'10px',height:'10px',borderRadius:'50%',background:ec(r[SF]||''),flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:'14px',fontWeight:600,color:'#fff'}}>{String(r[PF]||'')}</div><div style={{fontSize:'12px',color:'#475569',marginTop:'2px'}}>{String(r[DF]||'')}</div></div>{SF&&<Bg v={r[SF]}/>}</div>)}</div>}`)
  L.push(`    </div>`)
  L.push(`    {sel&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',backdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}><div style={{background:'#0d1117',border:'1px solid #334155',borderRadius:'16px',width:'100%',maxWidth:'480px',overflow:'hidden'}}><div style={{padding:'16px 20px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#160d38,#080d1c)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:'16px',fontWeight:700,color:'#fff'}}>{String(sel[PF]||'Appointment')}</div><button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#64748b'}}><X size={16}/></button></div><div style={{padding:'16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>{Object.entries(sel).filter(([k])=>k!=='id').map(([k,v])=><div key={k} style={{background:'#111827',borderRadius:'8px',padding:'10px 12px'}}><div style={{fontSize:'10px',color:'#475569',fontWeight:700,textTransform:'uppercase',marginBottom:'4px'}}>{fk(k)}</div>{k===SF?<Bg v={v}/>:<div style={{fontSize:'13px',color:'#e2e8f0',fontWeight:500}}>{String(v)}</div>}</div>)}</div><div style={{padding:'12px 16px',borderTop:'1px solid #1a2235',display:'flex',gap:'8px'}}><button onClick={()=>{setForm({...sel});setSel(null);setModal(true);}} style={{...bB,flex:1,justifyContent:'center'}}>Edit</button><button onClick={()=>{setItems(it=>it.filter(r=>r.id!==sel.id));setSel(null);}} style={{...bB,color:'#f87171',borderColor:'#450a0a',flex:1,justifyContent:'center'}}>Remove</button></div></div></div>}`)
  L.push(`    {modal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(6px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}><div style={{background:'#0d1117',border:'1px solid #334155',borderRadius:'16px',width:'100%',maxWidth:'540px',overflow:'hidden'}}><div style={{padding:'16px 24px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#160d38,#080d1c)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:'16px',fontWeight:700,color:'#fff'}}>{form.id?'Edit':'New'} Appointment</div><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{background:'none',border:'none',cursor:'pointer',color:'#64748b'}}><X size={16}/></button></div><div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',maxHeight:'55vh',overflowY:'auto'}}>{FF.map(ff=><div key={ff.key} style={ff.type==='textarea'?{gridColumn:'1/-1'}:{}}><label style={{display:'block',fontSize:'11px',fontWeight:700,color:'#64748b',marginBottom:'5px',textTransform:'uppercase'}}>{ff.label}</label>{ff.type==='select'?<select value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'8px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}>{(ff.options||[]).map(o=><option key={o}>{o}</option>)}</select>:ff.type==='textarea'?<textarea value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} rows={2} style={{width:'100%',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'8px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none',resize:'none'}}/>:<input type={ff.type||'text'} value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'8px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}/> }</div>)}</div><div style={{display:'flex',gap:'10px',padding:'14px 20px',borderTop:'1px solid #1a2235'}}><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{...bB,flex:1,justifyContent:'center'}}>Cancel</button><button onClick={save} style={{...bP,flex:1,justifyContent:'center'}}>{form.id?'Save':'Book'}</button></div></div></div>}`)
  L.push(`  );`)
  L.push(`}`)
  return L.join('\n')
}
