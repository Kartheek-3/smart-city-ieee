import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc, orderBy, query } from 'firebase/firestore';
import { classifyIssue } from '../utils/nlpClassifier';
import { 
  Lightbulb, Sparkles, Plus, X, ThumbsUp, CheckCircle2, 
  AlertCircle, ShieldAlert, User, Calendar, SlidersHorizontal, ArrowUp
} from 'lucide-react';

const CATS = ['traffic','pollution','waste','safety','convenience','infrastructure','parks','transport'];
const CAT_COLOR = { traffic:'#ffcc00', pollution:'#ff8800', waste:'#00cc66', safety:'#ff4444', convenience:'#4488ff', infrastructure:'#aa44ff', parks:'#00aa88', transport:'#ff6688' };
const CAT_ICON  = { traffic:'🚗', pollution:'💨', waste:'🗑️', safety:'🛡️', convenience:'🏗️', infrastructure:'🏛️', parks:'🌳', transport:'🚌' };

export default function SuggestionsPage({ userData }) {
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm]   = useState({ title:'', description:'', category:'' });
  const [show, setShow]   = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort]   = useState('votes');
  const [voted, setVoted] = useState(() => JSON.parse(localStorage.getItem('voted')||'[]'));
  const [loading, setLoading] = useState(false);
  const [nlp, setNlp]     = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('createdAt','desc'));
    return onSnapshot(q, snap => setSuggestions(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
  }, []);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (e.target.name === 'description' && e.target.value.length > 10) {
      const r = classifyIssue(e.target.value);
      setNlp(r);
      if (!form.category) setForm(f => ({ ...f, category: r.category }));
    }
  };

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    await addDoc(collection(db, 'suggestions'), {
      ...form,
      category: form.category || nlp?.category || 'convenience',
      votes: 0, status: 'pending',
      authorName: userData?.name || 'Anonymous',
      authorRole: userData?.role || 'citizen',
      createdAt: new Date().toISOString(),
    });
    setForm({ title:'', description:'', category:'' });
    setNlp(null); setShow(false); setLoading(false);
  };

  const vote = async (id, current) => {
    if (voted.includes(id)) return;
    await updateDoc(doc(db, 'suggestions', id), { votes: current + 1 });
    const newVoted = [...voted, id];
    setVoted(newVoted);
    localStorage.setItem('voted', JSON.stringify(newVoted));
  };

  const approve = async (id, status) => {
    await updateDoc(doc(db, 'suggestions', id), { status });
  };

  const isOfficial = userData?.role === 'official' || userData?.role === 'admin';

  let filtered = filter === 'all' ? suggestions : suggestions.filter(s => s.category === filter);
  if (sort === 'votes') filtered = [...filtered].sort((a,b) => (b.votes||0)-(a.votes||0));
  else if (sort === 'new') filtered = [...filtered].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));

  const statusColors = { 
    pending: { text: 'var(--text-muted)', bg: 'var(--border-light)' }, 
    approved: { text: '#10b981', bg: '#10b98112' }, 
    rejected: { text: '#ef4444', bg: '#ef444412' } 
  };

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        .sug-card { animation: fadeUp 0.3s ease both; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .sug-card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.01) !important; border-color: var(--border-main) !important; }
        .vote-btn { transition: all 0.2s ease; }
        .vote-btn:hover:not(.voted) { background: var(--brand-light) !important; border-color: var(--brand-primary) !important; color: var(--brand-primary) !important; }
        .vote-btn.voted { background: var(--brand-light) !important; border-color: rgba(26,115,232,0.3) !important; color: var(--brand-primary) !important; cursor: not-allowed; }
        .action-btn { transition: all 0.2s ease; }
        .action-btn:hover { filter: brightness(0.96); transform: translateY(-1px); }
        .action-btn:active { transform: translateY(0); }
        .filter-btn { transition: all 0.2s ease; }
        .filter-btn:hover:not(.active) { background: rgba(0,0,0,0.03) !important; color: var(--text-main) !important; }
        .form-input:focus { border-color: var(--brand-primary) !important; box-shadow: 0 0 0 3px var(--brand-light) !important; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div>
          <p style={S.headerSub}>Community Voice</p>
          <h1 style={S.headerTitle}>
            <Lightbulb size={24} style={{color: 'var(--brand-primary)', marginRight: 8, verticalAlign:'middle'}} />
            <span style={{verticalAlign:'middle'}}>Suggestions Hub</span>
          </h1>
        </div>
        <button 
          style={{
            ...S.addBtn, 
            background: show ? 'var(--bg-input)' : 'var(--brand-primary)',
            color: show ? 'var(--text-main)' : '#ffffff',
            border: show ? '1px solid var(--border-main)' : 'none',
            boxShadow: show ? 'none' : '0 4px 12px rgba(26,115,232,0.2)'
          }} 
          onClick={() => setShow(s => !s)}
          className="action-btn"
        >
          {show ? <X size={15} style={{marginRight:6, verticalAlign:'middle'}} /> : <Plus size={15} style={{marginRight:6, verticalAlign:'middle'}} />}
          <span style={{verticalAlign:'middle'}}>{show ? 'Close Panel' : 'Add Suggestion'}</span>
        </button>
      </div>

      {/* Add form */}
      {show && (
        <div style={S.formCard}>
          <h3 style={S.formTitle}>
            <Sparkles size={16} style={{color: '#ffaa00', marginRight: 6, verticalAlign:'middle'}} />
            <span style={{verticalAlign:'middle'}}>Submit Your Suggestion</span>
          </h3>
          <form onSubmit={submit} style={S.form}>
            <input 
              name="title" 
              placeholder="Title — what do you suggest?" 
              value={form.title}
              onChange={handleChange} 
              style={S.input} 
              required 
              className="form-input"
            />
            <textarea 
              name="description" 
              placeholder="Describe your idea in detail... (AI NLP classifier will detect the category automatically)"
              value={form.description} 
              onChange={handleChange} 
              rows={3}
              style={{...S.input, resize:'vertical'}} 
              required 
              className="form-input"
            />
            {nlp && (
              <div style={S.nlpBox}>
                <span style={S.nlpTag}>🤖 AI Auto-Classifier:</span>
                <span style={{...S.pill, background:CAT_COLOR[nlp.category]+'14', color:CAT_COLOR[nlp.category], border:`1px solid ${CAT_COLOR[nlp.category]}25`, fontWeight:700}}>
                  {CAT_ICON[nlp.category]} {nlp.category}
                </span>
                <span style={{...S.pill, background: 'var(--border-light)', color:'var(--text-muted)'}}>
                  Confidence: {nlp.confidence}%
                </span>
              </div>
            )}
            <select name="category" value={form.category} onChange={handleChange} style={S.input} required className="form-input">
              <option value="">Choose category override (Optional)</option>
              {CATS.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
            </select>
            <button type="submit" style={S.submitBtn} disabled={loading} className="action-btn">
              {loading ? 'Submitting...' : '🚀 Submit Suggestion'}
            </button>
          </form>
        </div>
      )}

      {/* Stats row */}
      <div style={S.statsRow}>
        {[
          { label:'Total Proposals', val:suggestions.length, color:'var(--brand-primary)', border:'rgba(26,115,232,0.1)' },
          { label:'Approved', val:suggestions.filter(s=>s.status==='approved').length, color:'#10b981', border:'rgba(16,185,129,0.1)' },
          { label:'Pending Review', val:suggestions.filter(s=>s.status==='pending').length, color:'#f59e0b', border:'rgba(245,158,11,0.1)' },
          { label:'Total Votes', val:suggestions.reduce((s,i)=>s+(i.votes||0),0), color:'#8b5cf6', border:'rgba(139,92,246,0.1)' },
        ].map(k => (
          <div key={k.label} style={{...S.statCard, border:`1px solid var(--border-main)`}}>
            <span style={{...S.statVal, color:k.color}}>{k.val}</span>
            <span style={S.statLabel}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Filters & Sort */}
      <div style={S.controls}>
        <div style={S.filterRow}>
          <button 
            onClick={() => setFilter('all')} 
            style={{...S.filterBtn, ...(filter==='all'?S.filterActive:{})}}
            className={`filter-btn ${filter==='all'?'active':''}`}
          >
            🌍 All
          </button>
          {CATS.map(c => (
            <button 
              key={c} 
              onClick={() => setFilter(c)} 
              style={{
                ...S.filterBtn, 
                ...(filter===c?{
                  background: `${CAT_COLOR[c]}14`,
                  color: CAT_COLOR[c], 
                  borderColor: `${CAT_COLOR[c]}30`,
                  fontWeight: '700'
                }:{})
              }}
              className={`filter-btn ${filter===c?'active':''}`}
            >
              {CAT_ICON[c]} {c}
            </button>
          ))}
        </div>
        
        <div style={S.sortRow}>
          <SlidersHorizontal size={14} style={{color:'var(--text-muted)'}} />
          <span style={{color:'var(--text-muted)',fontSize:12.5, fontWeight:600}}>Sort:</span>
          {[['votes','🔥 Top'],['new','🆕 New']].map(([k,l]) => (
            <button 
              key={k} 
              onClick={() => setSort(k)} 
              style={{...S.sortBtn, ...(sort===k?S.sortActive:{})}}
              className="action-btn"
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={S.list}>
        {filtered.length === 0 && (
          <div style={S.empty}>
            <span style={{fontSize:44, display:'block', marginBottom:10}}>💡</span>
            <p style={{color:'var(--text-muted)', fontWeight:600, fontSize:15}}>No suggestions found in this category</p>
            <p style={{color:'var(--text-sub)', fontSize:12.5}}>Be the first to submit a proposal for improvement!</p>
          </div>
        )}
        {filtered.map((s, i) => {
          const color = CAT_COLOR[s.category] || 'var(--brand-primary)';
          const hasVoted = voted.includes(s.id);
          const sc = statusColors[s.status] || { text: 'var(--text-muted)', bg: 'var(--border-light)' };

          return (
            <div key={s.id} className="sug-card" style={{...S.card, border:`1px solid var(--border-main)`, borderLeft:`4px solid ${color}`, animationDelay:`${i*0.04}s`}}>
              <div style={S.cardTop}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                    <span style={{...S.catPill, background:color+'12', color}}>{CAT_ICON[s.category]} {s.category}</span>
                    <span style={{
                      ...S.statusPill, 
                      color:sc.text, 
                      background: sc.bg, 
                      padding: '2.5px 8px', 
                      borderRadius: '20px', 
                      fontSize: '10.5px',
                      fontWeight: 700
                    }}>
                      ● {s.status}
                    </span>
                    {s.authorRole === 'official' && <span style={S.officialBadge}>🏛️ Official Response</span>}
                  </div>
                  
                  <h3 style={S.cardTitle}>{s.title}</h3>
                  <p style={S.cardDesc}>{s.description}</p>
                  
                  <div style={S.cardMeta}>
                    <span style={{display:'inline-flex', alignItems:'center', gap:4}}>
                      <User size={12} /> {s.authorName}
                    </span>
                    <span style={{margin:'0 6px', opacity:0.5}}>·</span>
                    <span style={{display:'inline-flex', alignItems:'center', gap:4}}>
                      <Calendar size={12} /> {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Vote button */}
                <div style={S.voteWrap}>
                  <button 
                    className={`vote-btn ${hasVoted ? 'voted' : ''}`} 
                    onClick={() => vote(s.id, s.votes||0)}
                    style={S.voteBtn}
                  >
                    <ArrowUp size={16} />
                    <span style={S.voteCount}>{s.votes||0}</span>
                    <span style={{fontSize:10, fontWeight:600}}>{hasVoted?'Upvoted':'Upvote'}</span>
                  </button>
                </div>
              </div>

              {/* Official actions */}
              {isOfficial && s.status === 'pending' && (
                <div style={S.actions}>
                  <button onClick={() => approve(s.id,'approved')} style={S.approveBtn} className="action-btn">
                    <CheckCircle2 size={13} style={{marginRight: 4, verticalAlign:'middle'}} /> 
                    <span style={{verticalAlign:'middle'}}>Approve Suggestion</span>
                  </button>
                  <button onClick={() => approve(s.id,'rejected')} style={S.rejectBtn} className="action-btn">
                    <X size={13} style={{marginRight: 4, verticalAlign:'middle'}} /> 
                    <span style={{verticalAlign:'middle'}}>Reject Suggestion</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const S = {
  page:         { padding:'24px', maxWidth:960, margin:'0 auto', background:'var(--bg-page)', minHeight:'100vh', fontFamily:"'Inter', system-ui, -apple-system, sans-serif", display:'flex', flexDirection:'column', gap:'20px' },
  header:       { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:12 },
  headerSub:    { color:'var(--text-muted)', fontSize:12, textTransform:'uppercase', letterSpacing:'0.08em', margin:0, fontWeight:600 },
  headerTitle:  { color:'var(--text-main)', fontSize:28, fontWeight:850, letterSpacing:'-0.025em', margin:'4px 0 0' },
  addBtn:       { display:'inline-flex', alignItems:'center', gap:'6px', borderRadius:10, fontSize:13.5, fontWeight:700, padding:'10px 18px', cursor:'pointer' },
  formCard:     { background:'var(--bg-card)', border:'1px solid var(--border-main)', borderRadius:16, padding:22, marginBottom:4, animation:'slideDown 0.25s ease-out', boxShadow:'0 10px 30px rgba(0,0,0,0.03)' },
  formTitle:    { color:'var(--text-main)', fontSize:15.5, fontWeight:800, margin:'0 0 16px', display:'flex', alignItems:'center', gap:6 },
  form:         { display:'flex', flexDirection:'column', gap:12 },
  input:        { padding:'10px 14px', background:'var(--bg-input)', border:'1px solid var(--border-main)', borderRadius:10, color:'var(--text-main)', fontSize:14, fontFamily:'inherit', width:'100%', boxSizing:'border-box', transition:'all 0.2s' },
  nlpBox:       { display:'flex', gap:8, alignItems:'center', background:'var(--brand-light)', border:'1px solid rgba(26,115,232,0.15)', borderRadius:10, padding:'8px 12px', flexWrap:'wrap' },
  nlpTag:       { color:'var(--brand-primary)', fontSize:12, fontWeight:700 },
  pill:         { fontSize:11.5, padding:'3px 10px', borderRadius:20, fontWeight:600 },
  submitBtn:    { padding:'11px', background:'var(--brand-primary)', border:'none', borderRadius:10, color:'#fff', fontSize:13.5, fontWeight:700, boxShadow:'0 4px 12px rgba(26,115,232,0.2)', cursor:'pointer' },
  statsRow:     { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12 },
  statCard:     { background:'var(--bg-card)', borderRadius:14, padding:'14px 16px', display:'flex', flexDirection:'column', gap:4, textAlign:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.01)' },
  statVal:      { fontSize:26, fontWeight:800, lineHeight:1 },
  statLabel:    { color:'var(--text-muted)', fontSize:12, fontWeight:500 },
  controls:     { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, flexWrap:'wrap', gap:12 },
  filterRow:    { display:'flex', gap:6, flexWrap:'wrap' },
  filterBtn:    { padding:'6px 12px', border:'1px solid var(--border-main)', borderRadius:20, background:'var(--bg-card)', color:'var(--text-muted)', fontSize:12, fontWeight:600, textTransform:'capitalize', cursor:'pointer' },
  filterActive: { background:'var(--brand-light)', color:'var(--brand-primary)', borderColor:'rgba(26,115,232,0.3)', fontWeight: '700' },
  sortRow:      { display:'flex', gap:6, alignItems:'center' },
  sortBtn:      { padding:'6px 12px', border:'1px solid var(--border-main)', borderRadius:8, background:'var(--bg-card)', color:'var(--text-muted)', fontSize:12.5, fontWeight:600, cursor:'pointer' },
  sortActive:   { background:'var(--brand-light)', color:'var(--brand-primary)', borderColor:'rgba(26,115,232,0.3)', fontWeight:'700' },
  list:         { display:'flex', flexDirection:'column', gap:12 },
  empty:        { textAlign:'center', padding:'40px 16px' },
  card:         { background:'var(--bg-card)', borderRadius:16, padding:18, boxShadow:'0 2px 6px rgba(0,0,0,0.01)' },
  cardTop:      { display:'flex', gap:16, alignItems:'flex-start' },
  catPill:      { fontSize:11, fontWeight:700, padding:'2.5px 8px', borderRadius:20, textTransform:'capitalize' },
  statusPill:   { fontSize:11, fontWeight:600, textTransform:'capitalize' },
  officialBadge:{ fontSize:11, background:'rgba(245,158,11,0.12)', color:'#d97706', padding:'2.5px 8px', borderRadius:20, fontWeight:700 },
  cardTitle:    { color:'var(--text-main)', fontSize:15.5, fontWeight:750, margin:'0 0 6px', letterSpacing:'-0.01em' },
  cardDesc:     { color:'var(--text-muted)', fontSize:13, lineHeight:1.55, margin:'0 0 10px' },
  cardMeta:     { color:'var(--text-sub)', fontSize:12, margin:0, fontWeight:500 },
  voteWrap:     { flexShrink:0 },
  voteBtn:      { display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'var(--bg-input)', border:'1px solid var(--border-main)', borderRadius:10, padding:'8px 12px', minWidth:60, color:'var(--text-muted)', cursor:'pointer' },
  voteCount:    { fontSize:17, fontWeight:800, lineHeight:1 },
  actions:      { display:'flex', gap:8, marginTop:14, paddingTop:14, borderTop:'1px solid var(--border-light)' },
  approveBtn:   { padding:'7px 14px', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:8, color:'#10b981', fontSize:12.5, fontWeight:600, cursor:'pointer' },
  rejectBtn:    { padding:'7px 14px', background:'var(--danger-bg)', border:'1px solid var(--danger-border)', borderRadius:8, color:'var(--danger-text)', fontSize:12.5, fontWeight:600, cursor:'pointer' },
};
