"""Fix and apply calendar patch."""
import re

with open('src/lib/agents/pageTemplate.ts', encoding='utf-8') as f:
    src = f.read()

if 'buildCalendarPage' in src:
    print('Already patched.')
    exit()

# We append a new exported function at the end of the file.
# The function emits TSX strings via lines.push(), just like buildPageFromData.
# Note: inside template literals we use \\n for actual newlines in generated output.

APPEND = """

// ── Calendar page builder ──────────────────────────────────────────────────────
export function buildCalendarPage(pageName: string, _route: string, data: PageData): string {
  const safe = pageName.replace(/[^a-zA-Z0-9]/g, '')
  const fields = data.fields.filter(f => f !== 'id')
  const dateField = fields.find(f => /date|time|start/i.test(f)) || fields[1] || 'date'
  const primaryField = fields[0] || 'name'
  const statusField = fields.find(f => /status|state/i.test(f)) || ''
  const dataJson = JSON.stringify(data.records).replace(/</g,'\\\\u003c').replace(/>/g,'\\\\u003e')
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
  L.push(`    {sel&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',backdropFilter:'blur(4px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}><div style={{background:'#0d1117',border:'1px solid #334155',borderRadius:'16px',width:'100%',maxWidth:'480px',overflow:'hidden'}}><div style={{padding:'16px 20px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#1a0d3a,#0d1117)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:'16px',fontWeight:700,color:'#fff'}}>{String(sel[PF]||'Appointment')}</div><button onClick={()=>setSel(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#64748b'}}><X size={16}/></button></div><div style={{padding:'16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>{Object.entries(sel).filter(([k])=>k!=='id').map(([k,v])=><div key={k} style={{background:'#111827',borderRadius:'8px',padding:'10px 12px'}}><div style={{fontSize:'10px',color:'#475569',fontWeight:700,textTransform:'uppercase',marginBottom:'4px'}}>{fk(k)}</div>{k===SF?<Bg v={v}/>:<div style={{fontSize:'13px',color:'#e2e8f0',fontWeight:500}}>{String(v)}</div>}</div>)}</div><div style={{padding:'12px 16px',borderTop:'1px solid #1a2235',display:'flex',gap:'8px'}}><button onClick={()=>{setForm({...sel});setSel(null);setModal(true);}} style={{...bB,flex:1,justifyContent:'center'}}>Edit</button><button onClick={()=>{setItems(it=>it.filter(r=>r.id!==sel.id));setSel(null);}} style={{...bB,color:'#f87171',borderColor:'#450a0a',flex:1,justifyContent:'center'}}>Remove</button></div></div></div>}`)
  L.push(`    {modal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(6px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}><div style={{background:'#0d1117',border:'1px solid #334155',borderRadius:'16px',width:'100%',maxWidth:'540px',overflow:'hidden'}}><div style={{padding:'16px 24px',borderBottom:'1px solid #1a2235',background:'linear-gradient(135deg,#1a0d3a,#0d1117)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div style={{fontSize:'16px',fontWeight:700,color:'#fff'}}>{form.id?'Edit':'New'} Appointment</div><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{background:'none',border:'none',cursor:'pointer',color:'#64748b'}}><X size={16}/></button></div><div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',maxHeight:'55vh',overflowY:'auto'}}>{FF.map(ff=><div key={ff.key} style={ff.type==='textarea'?{gridColumn:'1/-1'}:{}}><label style={{display:'block',fontSize:'11px',fontWeight:700,color:'#64748b',marginBottom:'5px',textTransform:'uppercase'}}>{ff.label}</label>{ff.type==='select'?<select value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'8px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}>{(ff.options||[]).map(o=><option key={o}>{o}</option>)}</select>:ff.type==='textarea'?<textarea value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} rows={2} style={{width:'100%',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'8px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none',resize:'none'}}/>:<input type={ff.type||'text'} value={form[ff.key]||''} onChange={e=>setForm(f=>({...f,[ff.key]:e.target.value}))} style={{width:'100%',background:'#111827',border:'1px solid #1e293b',borderRadius:'8px',padding:'8px 10px',color:'#e2e8f0',fontSize:'13px',outline:'none'}}/> }</div>)}</div><div style={{display:'flex',gap:'10px',padding:'14px 20px',borderTop:'1px solid #1a2235'}}><button onClick={()=>{setModal(false);setForm(EMPTY);}} style={{...bB,flex:1,justifyContent:'center'}}>Cancel</button><button onClick={save} style={{...bP,flex:1,justifyContent:'center'}}>{form.id?'Save':'Book'}</button></div></div></div>}`)
  L.push(`  );`)
  L.push(`}`)
  return L.join('\\n')
}
"""

with open('src/lib/agents/pageTemplate.ts', 'w', encoding='utf-8') as f:
    f.write(src + APPEND)

print('Done. Total lines:', (src + APPEND).count('\n'))
