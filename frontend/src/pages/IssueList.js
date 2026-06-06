import React, { useEffect, useState } from 'react';
import { subscribeToIssues, updateIssueStatus, getPriorityMeta } from '../services/issueService';
import { db } from '../services/firebase';
import { collection, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { 
  FileText, MapPin, User, Calendar, Download, Search, 
  MessageSquare, CheckCircle2, Clock, AlertCircle, Send, CornerDownRight, BrainCircuit, Link2 
} from 'lucide-react';

const COLORS = { safety:'#ff4444', pollution:'#ff8800', traffic:'#ffcc00', waste:'#00cc66', convenience:'#4488ff' };
const ICONS  = { safety:'🛡️', pollution:'💨', traffic:'🚗', waste:'🗑️', convenience:'🏗️' };

export default function IssueList({ userData }) {
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [comments, setComments] = useState({});
  const [commentText, setCommentText] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [aiResults, setAiResults] = useState({});
  const [aiLoading, setAiLoading] = useState({});

  useEffect(() => subscribeToIssues(setIssues), []);

  const filtered = issues.filter(i => {
    const matchCat    = filter==='all' || i.category===filter;
    const matchSearch = i.title?.toLowerCase().includes(search.toLowerCase()) || i.location?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const exportCSV = () => {
    const headers = ['Title','Category','Urgency','Location','Status','Priority Score','Reported By','Date'];
    const rows = filtered.map(i => [
      i.title, i.category, i.urgency, i.location, i.status,
      i.priorityScore, i.reportedBy, new Date(i.createdAt).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v||''}"`).join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='smartcity-issues.csv'; a.click();
  };

  const loadComments = (issueId) => {
    if (expandedId === issueId) { setExpandedId(null); return; }
    setExpandedId(issueId);
    const q = query(collection(db, 'comments'), where('issueId','==',issueId), orderBy('createdAt','asc'));
    onSnapshot(q, snap => {
      setComments(prev => ({ ...prev, [issueId]: snap.docs.map(d=>({id:d.id,...d.data()})) }));
    });
  };

  const addComment = async (issueId) => {
    const text = commentText[issueId]?.trim();
    if (!text) return;
    await addDoc(collection(db, 'comments'), {
      issueId, text, authorName: userData?.name||'Anonymous',
      authorRole: userData?.role||'citizen', createdAt: new Date().toISOString(),
    });
    setCommentText(prev => ({ ...prev, [issueId]: '' }));
  };

  const handleStatusUpdate = async (issue, status) => {
    const { updateIssueStatus } = require('../services/issueService');
    const { updateAccidentStatus, updateCrimeStatus } = require('../services/safetyService');
    
    if (issue.category === 'accident') {
      await updateAccidentStatus(issue.reportId, issue.timestamp, status);
    } else if (issue.category === 'crime' || issue.category === 'safety') {
      await updateCrimeStatus(issue.reportId, issue.timestamp, status);
    } else {
      await updateIssueStatus(issue.reportId, issue.timestamp, status);
    }
  };

  const runAIScan = async (issue) => {
    setAiLoading(prev => ({...prev, [issue.reportId]: true}));
    try {
      // Mock metrics for the reporter based on available data
      const mlInput = {
        trust_score: Math.floor(Math.random() * 30) + 70, // 70-100
        reports_submitted: 15,
        valid_reports: 14,
        fake_reports: Math.floor(Math.random() * 2),
        confirmations: issue.confirmations || 0,
        account_age_days: 120
      };
      const res = await fetch('http://localhost:5000/api/ml/detect-fake-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlInput)
      });
      const data = await res.json();
      setAiResults(prev => ({...prev, [issue.reportId]: data}));
    } catch (err) {
      console.error(err);
      setAiResults(prev => ({...prev, [issue.reportId]: { error: 'ML Engine Offline' }}));
    }
    setAiLoading(prev => ({...prev, [issue.reportId]: false}));
  };

  const canUpdate = userData?.role==='official' || userData?.role==='admin';

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .issue-card { animation: fadeUp 0.3s ease both; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .issue-card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.01) !important; }
        .filter-btn { transition: all 0.2s ease; }
        .filter-btn:hover:not(.active) { background: rgba(0,0,0,0.03) !important; color: var(--text-main) !important; }
        .action-btn { transition: all 0.2s ease; }
        .action-btn:hover { filter: brightness(0.96); transform: translateY(-1px); }
        .action-btn:active { transform: translateY(0); }
        .form-input:focus { border-color: var(--brand-primary) !important; box-shadow: 0 0 0 3px var(--brand-light) !important; }
      `}</style>

      <div style={S.header}>
        <h2 style={S.title}>
          <FileText size={22} style={{color: 'var(--brand-primary)', verticalAlign:'middle'}} /> 
          <span style={{verticalAlign:'middle', marginLeft: 8}}>Reported Issues</span> 
          <span style={S.cnt}>{filtered.length}</span>
        </h2>
        <div style={{display:'flex', gap:10, flexWrap:'wrap', alignItems:'center'}}>
          <button onClick={exportCSV} style={S.exportBtn} className="action-btn">
            <Download size={14} style={{marginRight: 6, verticalAlign:'middle'}} /> 
            <span style={{verticalAlign:'middle'}}>Export CSV</span>
          </button>
          <div style={S.searchWrapper}>
            <Search size={15} style={S.searchIcon} />
            <input 
              placeholder="Search by title, location..." 
              value={search} 
              onChange={e=>setSearch(e.target.value)} 
              style={S.search}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Categories Filter capsule switcher */}
      <div style={S.filters}>
        {['all','safety','pollution','traffic','waste','convenience'].map(f=>(
          <button 
            key={f} 
            onClick={()=>setFilter(f)} 
            style={{
              ...S.filterBtn,
              background: filter===f?'var(--brand-light)':'var(--bg-card)',
              borderColor: filter===f?'rgba(26,115,232,0.3)':'var(--border-main)',
              color: filter===f?'var(--brand-primary)':'var(--text-muted)',
              fontWeight: filter===f?'700':'500'
            }}
            className={`filter-btn ${filter===f?'active':''}`}
          >
            {f==='all'?'🌍 All':`${ICONS[f]} ${f}`}
          </button>
        ))}
      </div>

      {/* Issues list */}
      <div style={S.list}>
        {filtered.length===0 ? (
          <div style={S.empty}>
            <span style={{fontSize: 44, display:'block', marginBottom: 10}}>🔍</span>
            <p style={{color:'var(--text-muted)', fontWeight:600, fontSize:15}}>No reports match your filters</p>
            <p style={{color:'var(--text-sub)', fontSize:12.5}}>Try searching for something else or change categories.</p>
          </div>
        ) : (
          filtered.map(issue=>{
            const color = COLORS[issue.category]||'var(--brand-primary)';
            const p = getPriorityMeta(issue.priorityScore||0);
            const statusColors = {
              'resolved': { text: '#10b981', bg: '#10b98112' },
              'in-progress': { text: '#f59e0b', bg: '#f59e0b12' },
              'open': { text: '#3b82f6', bg: '#3b82f612' }
            };
            const sc = statusColors[issue.status] || { text: 'var(--text-muted)', bg: 'var(--border-light)' };

            return (
              <div key={issue.reportId || issue.id} style={{...S.card, border:`1px solid var(--border-main)`, borderLeft:`4px solid ${color}`}} className="issue-card glass-panel">
                <div style={S.cardTop}>
                  <div style={S.titleRow}>
                    <div style={{...S.catIcon, background:color+'12', color}}>{ICONS[issue.category]||'📌'}</div>
                    <div style={{minWidth: 0}}>
                      <p style={S.issueTitle}>{issue.title || issue.description || issue.type || 'Report'}</p>
                      <p style={S.meta}>
                        <MapPin size={12} style={{marginRight: 3, verticalAlign:'middle'}} /> 
                        <span style={{verticalAlign:'middle'}}>{issue.location}</span> 
                        <span style={{margin:'0 6px', opacity: 0.5}}>·</span> 
                        <User size={12} style={{marginRight: 3, verticalAlign:'middle'}} />
                        <span style={{verticalAlign:'middle'}}>{issue.reportedBy}</span>
                        <span style={{margin:'0 6px', opacity: 0.5}}>·</span> 
                        <Calendar size={12} style={{marginRight: 3, verticalAlign:'middle'}} />
                        <span style={{verticalAlign:'middle'}}>{new Date(issue.createdAt).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div style={S.badges}>
                    <span style={{...S.badge, background:`${color}12`, color, border:`1px solid ${color}25`}}>{issue.category}</span>
                    <span style={{...S.badge, background:`${p.bg}`, color: p.color, border:`1px solid ${p.color}25`}}>{p.label}</span>
                    <span style={{...S.badge, background:`${sc.bg}`, color: sc.text, border:`1px solid ${sc.text}25`}}>● {issue.status}</span>
                    <span style={{...S.badge, background:`var(--brand-light)`, color: 'var(--brand-primary)', border:`1px solid rgba(26,115,232,0.2)`}}>Score: {issue.priorityScore}</span>
                    {issue.blockchainHash && (
                      <span title={`Blockchain Hash: ${issue.blockchainHash}`} style={{...S.badge, background:'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', border:'1px solid rgba(139, 92, 246, 0.25)', display:'flex', alignItems:'center', gap:4, cursor:'help'}}>
                        <Link2 size={10} /> Verified: {issue.blockchainHash.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
                
                <p style={S.desc}>{issue.description}</p>
                
                {aiResults[issue.reportId] && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: aiResults[issue.reportId].is_fake ? 'rgba(255,68,68,0.1)' : 'rgba(0,204,102,0.1)', border: aiResults[issue.reportId].is_fake ? '1px solid rgba(255,68,68,0.2)' : '1px solid rgba(0,204,102,0.2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BrainCircuit size={16} color={aiResults[issue.reportId].is_fake ? '#ff4444' : '#00cc66'} />
                    <div>
                      <strong style={{ color: aiResults[issue.reportId].is_fake ? '#ff4444' : '#00cc66', fontSize: 13 }}>
                        {aiResults[issue.reportId].is_fake ? 'AI VERDICT: FAKE REPORT DETECTED' : 'AI VERDICT: VALID REPORT'}
                      </strong>
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-sub)' }}>
                        (Confidence: {aiResults[issue.reportId].fake_probability}%)
                      </span>
                    </div>
                  </div>
                )}
                
                {canUpdate && issue.status!=='resolved' && (
                  <div style={S.actions}>
                    <button 
                      onClick={()=>handleStatusUpdate(issue,'in-progress')} 
                      style={S.progressBtn}
                      className="action-btn"
                    >
                      <Clock size={13} style={{marginRight: 4, verticalAlign:'middle'}} />
                      <span style={{verticalAlign:'middle'}}>Mark In Progress</span>
                    </button>
                    <button 
                      onClick={()=>handleStatusUpdate(issue,'resolved')} 
                      style={S.resolveBtn}
                      className="action-btn"
                    >
                      <CheckCircle2 size={13} style={{marginRight: 4, verticalAlign:'middle'}} />
                      <span style={{verticalAlign:'middle'}}>Mark Resolved</span>
                    </button>
                    <button 
                      onClick={()=>runAIScan(issue)}
                      disabled={aiLoading[issue.reportId]}
                      style={{...S.progressBtn, background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.2)'}}
                      className="action-btn"
                    >
                      <BrainCircuit size={13} style={{marginRight: 4, verticalAlign:'middle'}} />
                      <span style={{verticalAlign:'middle'}}>{aiLoading[issue.reportId] ? 'Scanning...' : 'Run AI Security Scan'}</span>
                    </button>
                  </div>
                )}
                
                {/* Comments Section */}
                <div style={{marginTop:12, paddingTop: 12, borderTop: '1px solid var(--border-light)'}}>
                  <button onClick={()=>loadComments(issue.reportId)} style={S.commentToggle}>
                    <MessageSquare size={13} style={{marginRight: 4, verticalAlign:'middle'}} />
                    <span style={{verticalAlign:'middle'}}>
                      {expandedId===issue.reportId?'Hide':'View'} Comments {comments[issue.reportId]?.length>0?`(${comments[issue.reportId].length})`:''}
                    </span>
                  </button>
                  
                  {expandedId===issue.reportId && (
                    <div style={S.commentsBox}>
                      {(comments[issue.reportId]||[]).length === 0 ? (
                        <p style={{color:'var(--text-sub)', fontSize:12, padding:'6px 0', fontStyle:'italic'}}>No comments yet. Start the conversation!</p>
                      ) : (
                        <div style={{display:'flex', flexDirection:'column', gap: 10, marginBottom: 12}}>
                          {(comments[issue.reportId]||[]).map(c=>(
                            <div key={c.id} style={S.commentRow}>
                              <div style={{
                                ...S.commentAvatar, 
                                background: c.authorRole==='official' ? 'rgba(245,158,11,0.12)' : 'var(--brand-light)',
                                color: c.authorRole==='official' ? '#d97706' : 'var(--brand-primary)',
                                border: c.authorRole==='official' ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(26,115,232,0.15)'
                              }}>
                                {c.authorRole==='official'?'🏛️':'👤'}
                              </div>
                              <div style={{flex: 1, minWidth: 0}}>
                                <p style={S.commentAuthor}>
                                  {c.authorName} 
                                  <span style={{color:'var(--text-sub)', fontWeight:500, fontSize:10.5, marginLeft: 6, textTransform:'capitalize'}}>
                                    ({c.authorRole})
                                  </span>
                                </p>
                                <p style={S.commentText}>{c.text}</p>
                                <p style={S.commentTime}>{new Date(c.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Write comment */}
                      <div style={S.inputRow}>
                        <input 
                          placeholder="Type a comment..." 
                          value={commentText[issue.reportId]||''} 
                          style={S.commentInput}
                          className="form-input"
                          onChange={e=>setCommentText(prev=>({...prev,[issue.reportId]:e.target.value}))}
                          onKeyDown={e=>e.key==='Enter'&&addComment(issue.reportId)}
                        />
                        <button onClick={()=>addComment(issue.reportId)} style={S.sendBtn} className="action-btn">
                          <Send size={13} style={{marginRight: 4}} /> Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const S = {
  page:      { padding:'24px', maxWidth:960, margin:'0 auto', background:'var(--bg-page)', minHeight:'100vh', fontFamily:"'Inter', system-ui, -apple-system, sans-serif", display:'flex', flexDirection:'column', gap:'20px' },
  header:    { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, gap:12, flexWrap:'wrap' },
  title:     { color:'var(--text-main)', fontSize:22, fontWeight:850, letterSpacing:'-0.02em', display:'flex', alignItems:'center', gap:4, margin:0 },
  cnt:       { background:'var(--brand-light)', color:'var(--brand-primary)', fontSize:13, padding:'2.5px 9px', borderRadius:20, fontWeight:750 },
  searchWrapper: { position:'relative', display:'inline-block' },
  searchIcon: { position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-sub)', pointerEvents:'none' },
  search:    { padding:'9px 12px 9px 34px', background:'var(--bg-input)', border:'1px solid var(--border-main)', borderRadius:10, color:'var(--text-main)', fontSize:13.5, width:240, transition:'all 0.2s' },
  filters:   { display:'flex', gap:6, flexWrap:'wrap' },
  filterBtn: { display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', border:'1px solid var(--border-main)', borderRadius:20, fontSize:12.5, cursor:'pointer', textTransform:'capitalize' },
  list:      { display:'flex', flexDirection:'column', gap:12 },
  empty:     { textAlign:'center', padding:'48px 16px' },
  card:      { background:'var(--bg-card)', borderRadius:16, padding:20, boxShadow:'0 2px 6px rgba(0,0,0,0.01)' },
  cardTop:   { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:12, flexWrap:'wrap' },
  titleRow:  { display:'flex', gap:12, alignItems:'flex-start', flex: 1, minWidth: 0 },
  catIcon:   { width:40, height:40, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 },
  issueTitle:{ color:'var(--text-main)', fontSize:15.5, fontWeight:750, margin:0, letterSpacing:'-0.01em' },
  meta:      { color:'var(--text-muted)', fontSize:12, marginTop:4, display:'flex', alignItems:'center', flexWrap:'wrap' },
  badges:    { display:'flex', gap:6, flexWrap:'wrap', flexShrink:0 },
  badge:     { fontSize:10.5, fontWeight:700, padding:'2.5px 9px', borderRadius:20, textTransform:'capitalize' },
  desc:      { color:'var(--text-muted)', fontSize:13, lineHeight:1.55, marginBottom:12, marginTop:0 },
  actions:   { display:'flex', gap:8, marginTop:8, marginBottom:4 },
  progressBtn: { display:'inline-flex', alignItems:'center', padding:'6px 12px', background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:8, color:'#d97706', fontSize:12.5, fontWeight:600, cursor:'pointer' },
  resolveBtn: { display:'inline-flex', alignItems:'center', padding:'6px 12px', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:8, color:'#10b981', fontSize:12.5, fontWeight:600, cursor:'pointer' },
  exportBtn: { display:'inline-flex', alignItems:'center', padding:'9px 14px', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, color:'#10b981', fontSize:13, fontWeight:600, cursor:'pointer' },
  commentToggle: { background:'transparent', border:'none', color:'var(--brand-primary)', fontSize:12.5, padding:0, cursor:'pointer', fontWeight:600, display:'inline-flex', alignItems:'center' },
  commentsBox:   { background:'var(--bg-input)', borderRadius:12, padding:14, marginTop:10, border:'1px solid var(--border-light)' },
  commentRow:    { display:'flex', gap:10, alignItems:'flex-start' },
  commentAvatar: { width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0 },
  commentAuthor: { color:'var(--text-main)', fontSize:12.5, fontWeight:700, margin:0 },
  commentText:   { color:'var(--text-main)', fontSize:12.5, margin:'3px 0 2px', lineHeight:1.4 },
  commentTime:   { color:'var(--text-sub)', fontSize:10, margin:0, fontWeight:500 },
  inputRow:      { display:'flex', gap:8, marginTop:8 },
  commentInput:  { padding:'8px 12px', background:'var(--bg-card)', border:'1px solid var(--border-main)', borderRadius:8, color:'var(--text-main)', fontSize:12.5, flex:1, transition:'all 0.2s' },
  sendBtn:       { display:'inline-flex', alignItems:'center', background:'var(--brand-light)', color:'var(--brand-primary)', border:'1px solid rgba(26,115,232,0.25)', borderRadius:8, padding:'0 14px', fontSize:12, fontWeight:700, cursor:'pointer' }
};
