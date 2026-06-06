import React, { useEffect, useState } from 'react';
import { subscribeToIssues, subscribeToAlerts, markAlertRead, resolveConflicts, generateRecommendations, updateIssueStatus, getPriorityMeta } from '../services/issueService';
import { subscribeToAccidents, subscribeToCrimes, updateAccidentStatus, updateCrimeStatus } from '../services/safetyService';
import { subscribeToAllUsers, updateUserRole } from '../services/authService';
import { getAllMessages } from '../services/chatService';
import { getAllFollowRequests } from '../services/socialService';

const CAT_COLOR = { safety:'#ff4444', pollution:'#ff8800', traffic:'#ffcc00', waste:'#00cc66', convenience:'#4488ff' };
const CAT_ICON  = { safety:'🛡️', pollution:'💨', traffic:'🚗', waste:'🗑️', convenience:'🏗️' };

// Digital Twin base state
const BASE_STATE = { traffic: 62, pollution: 58, waste: 45, energy: 71, safety: 67, satisfaction: 54 };

const SCENARIOS = [
  { id:'signals',  icon:'🚦', label:'Add traffic signals',       effects:{ traffic:-22, satisfaction:+8 } },
  { id:'waste',    icon:'🚛', label:'Deploy 3 more waste trucks', effects:{ waste:-30, satisfaction:+12 } },
  { id:'greenzone',icon:'🌿', label:'Create green zones',         effects:{ pollution:-28, satisfaction:+15 } },
  { id:'lights',   icon:'💡', label:'Add streetlights',           effects:{ safety:+22, satisfaction:+10 } },
  { id:'solar',    icon:'☀️', label:'Install solar panels',        effects:{ energy:-18, satisfaction:+6 } },
  { id:'sensors',  icon:'📡', label:'Deploy smart sensors',        effects:{ pollution:-12, traffic:-10, safety:+8 } },
];

export default function AdminPanel() {
  const [issues,  setIssues]  = useState([]);
  const [alerts,  setAlerts]  = useState([]);
  const [accidents, setAccidents] = useState([]);
  const [crimes, setCrimes] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab,     setTab]     = useState('overview');
  const [applied, setApplied] = useState([]);
  const [twin,    setTwin]    = useState({ ...BASE_STATE });
  const [allMessages, setAllMessages] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loadingSocial, setLoadingSocial] = useState(false);

  useEffect(() => { const u = subscribeToIssues(setIssues); return u; }, []);
  useEffect(() => { const u = subscribeToAlerts(setAlerts); return u; }, []);
  useEffect(() => { const u = subscribeToAccidents(setAccidents); return u; }, []);
  useEffect(() => { const u = subscribeToCrimes(setCrimes); return u; }, []);
  useEffect(() => { const u = subscribeToAllUsers(setUsers); return u; }, []);

  useEffect(() => {
    if (tab === 'social') {
      setLoadingSocial(true);
      Promise.all([getAllMessages(), getAllFollowRequests()]).then(([m, r]) => {
        setAllMessages(m || []);
        setAllRequests(r || []);
        setLoadingSocial(false);
      });
    }
  }, [tab]);

  const unread  = alerts.filter(a => !a.read);
  const conflicts = resolveConflicts(issues);
  const recs    = generateRecommendations(issues);

  const stats = {
    total:    issues.length,
    open:     issues.filter(i => i.status === 'open').length,
    critical: issues.filter(i => i.urgency === 'critical').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
    avgScore: issues.length ? Math.round(issues.reduce((s,i)=>s+(i.priorityScore||0),0)/issues.length) : 0,
    accidents: accidents.filter(a => a.status === 'reported').length,
    crimes: crimes.filter(c => c.status === 'investigating').length,
  };

  const applyScenario = (s) => {
    if (applied.includes(s.id)) return;
    setApplied(prev => [...prev, s.id]);
    setTwin(prev => {
      const next = { ...prev };
      Object.entries(s.effects).forEach(([k,v]) => { next[k] = Math.max(0, Math.min(100, (next[k]||50)+v)); });
      return next;
    });
  };

  const resetTwin = () => { setApplied([]); setTwin({ ...BASE_STATE }); };

  const handleRoleChange = async (userId, newRole) => {
    if(window.confirm(`Are you sure you want to promote this user to ${newRole}?`)) {
      await updateUserRole(userId, newRole);
    }
  };

  const TABS = [
    { id:'overview', label:'Control Room' },
    { id:'dispatch', label:'Service Dispatch' },
    { id:'users',    label:'User Management' },
    { id:'alerts',   label:`Alerts ${unread.length > 0 ? `(${unread.length})` : ''}` },
    { id:'twin',     label:'Digital Twin' },
    { id:'conflict', label:'Conflicts' },
    { id:'recs',     label:'Recommendations' },
    { id:'social',   label:'Social Monitor' },
  ];

  return (
    <div style={S.page}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes barGrow { from{width:0} to{width:var(--w)} }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div>
          <p style={S.headerSub}>Control Center</p>
          <h1 style={S.headerTitle}>Smart Admin Dashboard</h1>
        </div>
        {unread.length > 0 && (
          <div style={S.alertBadge}>
            <span style={{animation:'pulse 1.5s infinite',display:'inline-block'}}>🔴</span>
            &nbsp;{unread.length} live alert{unread.length>1?'s':''}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...S.tab,
            background: tab===t.id ? 'rgba(26, 115, 232, 0.1)' : 'transparent',
            borderColor: tab===t.id ? 'var(--brand-primary)' : 'var(--border-main)',
            color: tab===t.id ? 'var(--brand-primary)' : 'var(--text-sub)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW (Live City Monitoring) ── */}
      {tab === 'overview' && (
        <div style={{animation:'slideIn 0.3s ease'}}>
          <div style={S.kpiGrid}>
            {[
              { label:'Total Issues',  val:stats.total,    icon:'📋', color:'var(--brand-primary)' },
              { label:'Open Issues',   val:stats.open,     icon:'🔓', color:'#ff8800' },
              { label:'Active Crimes', val:stats.crimes,   icon:'🚨', color:'#ff4444' },
              { label:'Accidents',     val:stats.accidents,icon:'💥', color:'#ff8800' },
              { label:'Resolved',      val:stats.resolved, icon:'✅', color:'#00cc66' },
            ].map(k => (
              <div key={k.label} style={{...S.kpiCard, borderTop:`3px solid ${k.color}`}}>
                <span style={{fontSize:22}}>{k.icon}</span>
                <span style={{...S.kpiVal, color:k.color}}>{k.val}</span>
                <span style={S.kpiLabel}>{k.label}</span>
              </div>
            ))}
          </div>

          <div style={{display:'flex', gap:20}}>
            <div style={{...S.card, flex:1}}>
              <p style={S.cardTitle}>📊 Issues by Category</p>
              {Object.entries(CAT_ICON).map(([cat, icon]) => {
                const cnt = issues.filter(i=>i.category===cat).length;
                const pct = stats.total ? Math.round((cnt/stats.total)*100) : 0;
                return (
                  <div key={cat} style={S.barRow}>
                    <span style={{width:24}}>{icon}</span>
                    <span style={S.barLabel}>{cat}</span>
                    <div style={S.barTrack}>
                      <div style={{height:'100%',borderRadius:4,width:`${pct}%`,background:CAT_COLOR[cat],transition:'width 0.8s ease'}}/>
                    </div>
                    <span style={{...S.barCnt, color:CAT_COLOR[cat]}}>{cnt}</span>
                  </div>
                );
              })}
            </div>

            {/* Top issues */}
            <div style={{...S.card, flex:1.5}}>
              <p style={S.cardTitle}>🔥 Top Priority Issues (Live)</p>
              {[...issues].sort((a,b)=>b.priorityScore-a.priorityScore).slice(0,5).map((issue, idx) => {
                const p = getPriorityMeta(issue.priorityScore||0);
                return (
                  <div key={issue.reportId || idx} style={S.issueRow}>
                    <div style={{...S.catBadge, background:CAT_COLOR[issue.category]+'18'}}>{CAT_ICON[issue.category]}</div>
                    <div style={{flex:1}}>
                      <p style={S.issueName}>{issue.title || issue.description || issue.type || 'Report'}</p>
                      <p style={S.issueMeta}>📍 {issue.location} · ⏱ {issue.hoursOpen||0}h open</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <span style={{...S.scorePill, background:p.bg, color:p.color}}>{p.label} · {issue.priorityScore}</span>
                      {issue.status !== 'resolved' && (
                        <button style={S.resolveBtn} onClick={() => {
                          const { updateIssueStatus } = require('../services/issueService');
                          const { updateAccidentStatus, updateCrimeStatus } = require('../services/safetyService');
                          if (issue.category === 'accident') {
                            updateAccidentStatus(issue.reportId, issue.timestamp, 'resolved');
                          } else if (issue.category === 'crime' || issue.category === 'safety') {
                            updateCrimeStatus(issue.reportId, issue.timestamp, 'resolved');
                          } else {
                            updateIssueStatus(issue.reportId, issue.timestamp, 'resolved');
                          }
                        }}>Resolve</button>
                      )}
                    </div>
                  </div>
                );
              })}
              {issues.length === 0 && <p style={S.empty}>No issues yet</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── SERVICE DISPATCH ── */}
      {tab === 'dispatch' && (
        <div style={{animation:'slideIn 0.3s ease', display:'flex', flexDirection:'column', gap:20}}>
          <div style={S.card}>
            <p style={S.cardTitle}>🚑 Emergency & Accident Dispatch</p>
            {accidents.filter(a => a.status === 'reported').length === 0 && <p style={S.empty}>No active accidents awaiting dispatch.</p>}
            {accidents.filter(a => a.status === 'reported').map(acc => (
              <div key={acc.id} style={{...S.issueRow, background:'var(--danger-bg)', padding:16, borderRadius:12}}>
                <div style={{fontSize:24}}>💥</div>
                <div style={{flex:1, marginLeft:12}}>
                  <p style={{...S.issueName, color:'var(--danger-text)'}}>Accident Reported</p>
                  <p style={S.issueMeta}>{acc.description}</p>
                  <p style={S.issueMeta}>📍 {acc.location} · Reporter: {acc.reporterName}</p>
                  <p style={{fontSize:12, fontWeight:700, color:'#ff4444', marginTop:4}}>AI Severity: {acc.severity.toUpperCase()} - {acc.aiSummary}</p>
                </div>
                <div>
                  <button style={{...S.resolveBtn, background:'#ff4444', color:'#fff', padding:'8px 16px', fontSize:14}} onClick={() => updateAccidentStatus(acc.reportId, acc.timestamp, 'dispatched')}>
                    Dispatch Ambulance
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <p style={S.cardTitle}>🚓 Police & Crime Dispatch</p>
            {crimes.filter(c => c.status === 'investigating').length === 0 && <p style={S.empty}>No active crimes awaiting dispatch.</p>}
            {crimes.filter(c => c.status === 'investigating').map(crime => (
              <div key={crime.id} style={{...S.issueRow, background:'rgba(255, 136, 0, 0.1)', padding:16, borderRadius:12}}>
                <div style={{fontSize:24}}>🚨</div>
                <div style={{flex:1, marginLeft:12}}>
                  <p style={{...S.issueName, color:'#ff8800'}}>{crime.type}</p>
                  <p style={S.issueMeta}>{crime.description}</p>
                  <p style={S.issueMeta}>📍 {crime.location} · Reporter: {crime.reporterName}</p>
                </div>
                <div>
                  <button style={{...S.resolveBtn, background:'#ff8800', color:'#fff', padding:'8px 16px', fontSize:14}} onClick={() => updateCrimeStatus(crime.reportId, crime.timestamp, 'dispatched')}>
                    Dispatch Police Unit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USER MANAGEMENT ── */}
      {tab === 'users' && (
        <div style={{animation:'slideIn 0.3s ease'}}>
          <div style={S.card}>
            <p style={S.cardTitle}>👥 User Management</p>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', textAlign:'left'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid var(--border-main)'}}>
                    <th style={{padding:12, color:'var(--text-sub)', fontSize:13}}>Name</th>
                    <th style={{padding:12, color:'var(--text-sub)', fontSize:13}}>Email</th>
                    <th style={{padding:12, color:'var(--text-sub)', fontSize:13}}>Role</th>
                    <th style={{padding:12, color:'var(--text-sub)', fontSize:13}}>Trust Score</th>
                    <th style={{padding:12, color:'var(--text-sub)', fontSize:13}}>Civic Points</th>
                    <th style={{padding:12, color:'var(--text-sub)', fontSize:13}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{borderBottom:'1px solid var(--border-light)'}}>
                      <td style={{padding:12, fontSize:14, fontWeight:600}}>{user.name}</td>
                      <td style={{padding:12, fontSize:14, color:'var(--text-sub)'}}>{user.email}</td>
                      <td style={{padding:12}}>
                        <span style={{padding:'4px 8px', borderRadius:6, fontSize:12, fontWeight:700, 
                          background: user.role === 'admin' ? 'rgba(255, 68, 68, 0.1)' : user.role === 'official' ? 'rgba(68, 136, 255, 0.1)' : 'var(--bg-input)',
                          color: user.role === 'admin' ? '#ff4444' : user.role === 'official' ? '#4488ff' : 'var(--text-main)'
                        }}>
                          {user.role}
                        </span>
                      </td>
                      <td style={{padding:12, fontSize:14, fontWeight:700, color:user.trustScore>=80?'#00cc66':user.trustScore>=50?'#ff8800':'#ff4444'}}>
                        {user.trustScore}/100
                      </td>
                      <td style={{padding:12, fontSize:14}}>{user.civicPoints || 0}</td>
                      <td style={{padding:12}}>
                        {user.role === 'citizen' && (
                          <button style={{...S.resolveBtn, background:'var(--brand-primary)', color:'#fff', padding:'4px 10px'}} onClick={() => handleRoleChange(user.id, 'official')}>
                            Make Official
                          </button>
                        )}
                        {user.role === 'official' && (
                          <button style={{...S.resolveBtn, background:'var(--bg-input)', color:'var(--text-main)', border:'1px solid var(--border-main)', padding:'4px 10px'}} onClick={() => handleRoleChange(user.id, 'citizen')}>
                            Demote to Citizen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ALERTS ── */}
      {tab === 'alerts' && (
        <div style={{animation:'slideIn 0.3s ease'}}>
          <div style={S.card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <p style={{...S.cardTitle,margin:0}}>🔔 Real-Time Alerts</p>
              {unread.length > 0 && (
                <button style={S.markAllBtn} onClick={() => unread.forEach(a => markAlertRead(a.id))}>
                  Mark all read
                </button>
              )}
            </div>
            {alerts.length === 0 && <p style={S.empty}>No alerts yet — they appear automatically when critical issues are reported</p>}
            {alerts.map(alert => {
              const color = alert.level==='critical'?'#ff4444':alert.level==='high'?'#ff8800':'#ffcc00';
              return (
                <div key={alert.id} style={{...S.alertCard, borderLeft:`3px solid ${color}`, opacity: alert.read ? 0.45 : 1}}>
                  <div style={{...S.alertDot, background:color, boxShadow:`0 0 8px ${color}`, animation: alert.read?'none':'pulse 2s infinite'}}/>
                  <div style={{flex:1}}>
                    <p style={S.alertMsg}>{alert.message}</p>
                    <p style={S.alertTime}>{new Date(alert.createdAt).toLocaleTimeString()} · {alert.category}</p>
                  </div>
                  {!alert.read && (
                    <button style={S.readBtn} onClick={() => markAlertRead(alert.id)}>✓</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── DIGITAL TWIN ── */}
      {tab === 'twin' && (
        <div style={{animation:'slideIn 0.3s ease'}}>
          <div style={S.card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <p style={{...S.cardTitle,margin:0}}>🌆 Digital Twin — What-If Simulator</p>
              <button style={S.markAllBtn} onClick={resetTwin}>↺ Reset</button>
            </div>
            <p style={{color:'var(--text-sub)',fontSize:13,marginBottom:20}}>
              Click scenarios below to simulate city policy changes and see predicted outcomes in real-time.
              {applied.length > 0 && <span style={{color:'var(--brand-primary)'}}> {applied.length} scenario{applied.length>1?'s':''} applied.</span>}
            </p>

            <div style={S.scenGrid}>
              {SCENARIOS.map(s => {
                const isOn = applied.includes(s.id);
                return (
                  <button key={s.id} onClick={() => applyScenario(s)} style={{
                    ...S.scenBtn,
                    background: isOn ? 'rgba(68,136,255,0.2)' : 'var(--bg-input)',
                    borderColor: isOn ? '#4488ff' : 'var(--border-main)',
                    color: isOn ? '#4488ff' : 'var(--text-muted)',
                  }}>
                    <span style={{fontSize:20}}>{s.icon}</span>
                    <span style={{fontSize:13,fontWeight:600}}>{s.label}</span>
                    {isOn && <span style={{fontSize:11,color:'var(--brand-primary)'}}>✓ Applied</span>}
                    <div style={{fontSize:11,color:'var(--text-sub)',marginTop:2}}>
                      {Object.entries(s.effects).map(([k,v]) => `${k} ${v>0?'+':''}${v}%`).join(' · ')}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{marginTop:24}}>
              {Object.entries(twin).map(([key, val]) => {
                const base = BASE_STATE[key];
                const diff = val - base;
                const goodDir = ['safety','satisfaction'].includes(key) ? 1 : -1;
                const isGood = diff * goodDir > 0;
                const color = diff === 0 ? 'var(--text-sub)' : isGood ? '#00cc66' : '#ff4444';
                return (
                  <div key={key} style={S.gaugeRow}>
                    <span style={S.gaugeLabel}>{key.charAt(0).toUpperCase()+key.slice(1)}</span>
                    <div style={S.gaugeTrack}>
                      <div style={{height:'100%',borderRadius:6,width:`${val}%`,background: val>70?'#ff4444':val>50?'#ff8800':'#00cc66',transition:'width 0.6s ease'}}/>
                    </div>
                    <span style={{...S.gaugeVal, color}}>{val}%</span>
                    {diff !== 0 && <span style={{fontSize:12,color,minWidth:40}}>{diff>0?'+':''}{diff}%</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFLICTS ── */}
      {tab === 'conflict' && (
        <div style={{animation:'slideIn 0.3s ease'}}>
          <div style={S.card}>
            <p style={S.cardTitle}>⚖️ AI Conflict Resolution</p>
            <p style={{color:'var(--text-sub)',fontSize:13,marginBottom:16}}>
              When multiple citizens report the same issue at the same location, the AI merges them and elevates the highest-priority report.
            </p>
            {conflicts.length === 0 && (
              <div style={S.emptyBox}>
                <span style={{fontSize:32}}>✅</span>
                <p style={{color:'var(--text-sub)',margin:'8px 0 0'}}>No conflicts detected — all reports are unique</p>
              </div>
            )}
            {conflicts.map((c, i) => (
              <div key={c.key} style={S.conflictCard}>
                <div style={S.conflictHeader}>
                  <span style={S.conflictNum}>#{i+1}</span>
                  <div>
                    <p style={S.conflictTitle}>{CAT_ICON[c.winner.category]} {c.winner.category} conflict at {c.winner.location}</p>
                    <p style={S.conflictRes}>✅ {c.resolution}</p>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
                  {c.group.map(issue => (
                    <div key={issue.id} style={S.conflictIssue}>
                      <p style={{color:'var(--text-main)',fontSize:12,margin:0,fontWeight:500}}>{issue.title}</p>
                      <p style={{color:'var(--text-sub)',fontSize:11,margin:'2px 0 0'}}>Score: {issue.priorityScore}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RECOMMENDATIONS ── */}
      {tab === 'recs' && (
        <div style={{animation:'slideIn 0.3s ease'}}>
          <div style={S.card}>
            <p style={S.cardTitle}>🤝 AI Recommendations</p>
            <p style={{color:'var(--text-sub)',fontSize:13,marginBottom:16}}>
              Auto-generated action plans based on top open issues sorted by priority score.
            </p>
            {recs.length === 0 && <p style={S.empty}>No open high-priority issues to recommend for</p>}
            {recs.map((r,i) => {
              const p = getPriorityMeta(r.priority);
              return (
                <div key={i} style={{...S.recCard, borderLeft:`3px solid ${CAT_COLOR[r.category]}`}}>
                  <div style={{...S.recIcon, background:CAT_COLOR[r.category]+'18'}}>{r.icon}</div>
                  <div style={{flex:1}}>
                    <p style={S.recTitle}>{r.title}</p>
                    <p style={S.recAction}>→ {r.action}</p>
                    <p style={S.recMeta}>📍 {r.location}</p>
                  </div>
                  <span style={{...S.scorePill, background:p.bg, color:p.color}}>{r.priority}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* ── SOCIAL MONITOR ── */}
      {tab === 'social' && (
        <div style={{animation:'slideIn 0.3s ease', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:20}}>
          {loadingSocial ? (
            <p style={{color:'var(--text-sub)'}}>Loading platform activity...</p>
          ) : (
            <>
              {/* Activity Overview */}
              <div style={S.card}>
                <h3 style={S.cardTitle}>Platform Engagement</h3>
                <div style={S.statGrid}>
                  <div style={S.statBox}>
                    <span style={S.statVal}>{allMessages.length}</span>
                    <span style={S.statLbl}>Total Messages Sent</span>
                  </div>
                  <div style={S.statBox}>
                    <span style={S.statVal}>{allRequests.length}</span>
                    <span style={S.statLbl}>Total Follow Requests</span>
                  </div>
                  <div style={S.statBox}>
                    <span style={S.statVal}>{new Set(allMessages.map(m=>m.conversationId)).size}</span>
                    <span style={S.statLbl}>Active Chat Sessions</span>
                  </div>
                  <div style={S.statBox}>
                    <span style={S.statVal}>{allRequests.filter(r=>r.status==='accepted').length}</span>
                    <span style={S.statLbl}>Mutual Connections</span>
                  </div>
                </div>
              </div>

              {/* Messages Audit */}
              <div style={S.card}>
                <h3 style={S.cardTitle}>Global Message Audit Log</h3>
                <div style={{maxHeight: 400, overflowY:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', textAlign:'left'}}>
                    <thead>
                      <tr style={{borderBottom:'1px solid var(--border-main)', color:'var(--text-sub)', fontSize:12, textTransform:'uppercase'}}>
                        <th style={{padding:8}}>Time</th>
                        <th style={{padding:8}}>Sender</th>
                        <th style={{padding:8}}>Receiver</th>
                        <th style={{padding:8}}>Content</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMessages.slice(-50).reverse().map((m, i) => (
                        <tr key={i} style={{borderBottom:'1px solid var(--border-light)'}}>
                          <td style={{padding:8, fontSize:13, color:'var(--text-main)'}}>{new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                          <td style={{padding:8, fontSize:13, color:'#4488ff'}}>{users.find(u=>u.uid===m.senderId)?.name || 'Unknown'}</td>
                          <td style={{padding:8, fontSize:13, color:'#ff8800'}}>{users.find(u=>u.uid===m.receiverId)?.name || 'Unknown'}</td>
                          <td style={{padding:8, fontSize:13, color:'var(--text-main)', opacity:0.8}}>{m.content.length > 30 ? m.content.substring(0,30)+'...' : m.content}</td>
                        </tr>
                      ))}
                      {allMessages.length === 0 && (
                        <tr><td colSpan="4" style={{padding:16, textAlign:'center', color:'var(--text-sub)'}}>No messages yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  page:         { padding:28, maxWidth:1200, margin:'0 auto', background:'var(--bg-page)', minHeight:'100vh', fontFamily:'system-ui,sans-serif' },
  header:       { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 },
  headerSub:    { color:'var(--text-sub)', fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase', margin:0 },
  headerTitle:  { color:'var(--text-main)', fontSize:28, fontWeight:800, letterSpacing:'-0.03em', margin:'4px 0 0' },
  alertBadge:   { background:'rgba(255,68,68,0.12)', border:'1px solid rgba(255,68,68,0.3)', color:'#ff4444', padding:'8px 16px', borderRadius:10, fontSize:14, fontWeight:600 },
  tabs:         { display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' },
  tab:          { padding:'8px 18px', border:'1px solid', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, transition:'all 0.2s' },
  kpiGrid:      { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:16 },
  kpiCard:      { background:'var(--bg-card)', borderRadius:12, padding:'16px', border:'1px solid var(--border-main)', display:'flex', flexDirection:'column', gap:6 },
  kpiVal:       { fontSize:32, fontWeight:800, lineHeight:1 },
  kpiLabel:     { color:'var(--text-sub)', fontSize:12 },
  card:         { background:'var(--bg-card)', borderRadius:14, padding:22, marginBottom:16, border:'1px solid var(--border-main)' },
  cardTitle:    { color:'var(--text-main)', fontWeight:700, fontSize:15, marginBottom:16, marginTop:0, letterSpacing:'-0.01em' },
  barRow:       { display:'flex', alignItems:'center', gap:10, marginBottom:10 },
  barLabel:     { color:'var(--text-sub)', fontSize:13, width:90, textTransform:'capitalize' },
  barTrack:     { flex:1, background:'var(--bg-card-hover)', borderRadius:4, height:8 },
  barCnt:       { fontSize:13, fontWeight:700, width:24, textAlign:'right' },
  issueRow:     { display:'flex', gap:12, alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--border-light)' },
  catBadge:     { width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 },
  issueName:    { color:'var(--text-main)', fontSize:14, fontWeight:600, margin:0 },
  issueMeta:    { color:'var(--text-sub)', fontSize:12, margin:'3px 0 0' },
  scorePill:    { fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20, display:'inline-block' },
  resolveBtn:   { display:'block', marginTop:4, fontSize:11, color:'#00cc66', background:'rgba(0,204,102,0.1)', border:'1px solid rgba(0,204,102,0.2)', borderRadius:6, padding:'2px 8px', cursor:'pointer' },
  empty:        { color:'var(--text-sub)', fontSize:14, textAlign:'center', padding:'24px 0' },
  emptyBox:     { textAlign:'center', padding:'32px 0' },
  markAllBtn:   { background:'transparent', border:'1px solid var(--border-main)', color:'var(--text-sub)', borderRadius:8, padding:'6px 14px', fontSize:12, cursor:'pointer' },
  alertCard:    { display:'flex', gap:12, alignItems:'flex-start', padding:'14px', background:'var(--bg-input)', borderRadius:10, marginBottom:10, transition:'opacity 0.3s' },
  alertDot:     { width:10, height:10, borderRadius:'50%', flexShrink:0, marginTop:4 },
  alertMsg:     { color:'var(--text-main)', fontSize:14, fontWeight:500, margin:0 },
  alertTime:    { color:'var(--text-sub)', fontSize:12, margin:'4px 0 0', textTransform:'capitalize' },
  readBtn:      { background:'rgba(0,204,102,0.1)', border:'1px solid rgba(0,204,102,0.2)', color:'#00cc66', borderRadius:8, padding:'4px 10px', cursor:'pointer', fontSize:14 },
  scenGrid:     { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 },
  scenBtn:      { display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4, padding:'14px', borderRadius:12, border:'1px solid', cursor:'pointer', textAlign:'left', transition:'all 0.2s' },
  gaugeRow:     { display:'flex', alignItems:'center', gap:12, marginBottom:12 },
  gaugeLabel:   { color:'var(--text-sub)', fontSize:13, width:100, textTransform:'capitalize' },
  gaugeTrack:   { flex:1, background:'var(--bg-card-hover)', borderRadius:6, height:10 },
  gaugeVal:     { fontSize:13, fontWeight:700, width:36, textAlign:'right' },
  conflictCard: { background:'var(--bg-input)', borderRadius:12, padding:16, marginBottom:12 },
  conflictHeader:{ display:'flex', gap:12, alignItems:'flex-start' },
  conflictNum:  { background:'rgba(68,136,255,0.2)', color:'var(--brand-primary)', borderRadius:8, padding:'4px 10px', fontSize:13, fontWeight:700, flexShrink:0 },
  conflictTitle:{ color:'var(--text-main)', fontSize:14, fontWeight:600, margin:0, textTransform:'capitalize' },
  conflictRes:  { color:'#00cc66', fontSize:12, margin:'4px 0 0' },
  conflictIssue:{ background:'var(--bg-card-hover)', borderRadius:8, padding:'8px 12px', flex:1, minWidth:160 },
  recCard:      { display:'flex', gap:14, alignItems:'flex-start', padding:'14px', background:'var(--bg-input)', borderRadius:12, marginBottom:10 },
  recIcon:      { width:42, height:42, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 },
  recTitle:     { color:'var(--text-main)', fontSize:14, fontWeight:600, margin:0 },
  recAction:    { color:'var(--brand-primary)', fontSize:13, margin:'4px 0 2px' },
  recMeta:      { color:'var(--text-sub)', fontSize:12, margin:0 },
};
