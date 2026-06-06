import React, { useState, useEffect } from 'react';
import {
  reportWaste, subscribeToWasteReports, upvoteWasteReport, resolveWasteReport,
  calculateCleanlinessScore, generateCollectionRoute, subscribeToActiveRoutes, updateRouteStatus
} from '../services/wasteService';
import LocationInput from '../components/LocationInput';

export default function WasteManagementPage({ user }) {
  const [tab, setTab] = useState('report'); // report, analytics, routing
  
  // Data
  const [reports, setReports] = useState([]);
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [score, setScore] = useState(100);

  // Form
  const [loc, setLoc] = useState('');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [routing, setRouting] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [msg, setMsg] = useState('');

  // Use Effect for Subscriptions
  useEffect(() => {
    const unsub1 = subscribeToWasteReports((data) => {
      setReports(data);
      setScore(calculateCleanlinessScore(data));
    });
    const unsub2 = subscribeToActiveRoutes(setActiveRoutes);
    return () => { unsub1(); unsub2(); };
  }, []);

  const handleReport = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Mock random lat/lng near Hyderabad if not provided
      const finalLat = lat ? parseFloat(lat) : 17.3850 + (Math.random() - 0.5) * 0.1;
      const finalLng = lng ? parseFloat(lng) : 78.4867 + (Math.random() - 0.5) * 0.1;

      const res = await reportWaste({
        location: loc, description: desc, severity, lat: finalLat, lng: finalLng
      }, user, reports);
      
      setReports(prev => [res, ...prev]);
      setMsg('Waste report submitted successfully!');
      setLoc(''); setDesc(''); setLat(''); setLng('');
      setTimeout(() => setMsg(''), 4000);
    } catch (err) { setMsg(err.message); }
    setSubmitting(false);
  };

  // Auto detect logic is now handled by LocationInput component.

  const handleUpvote = async (id) => {
    try { await upvoteWasteReport(id, user.uid); }
    catch (err) { setMsg(err.message); setTimeout(() => setMsg(''), 3000); }
  };

  const handleResolve = async (id) => {
    try { await resolveWasteReport(id); }
    catch (err) { setMsg(err.message); setTimeout(() => setMsg(''), 3000); }
  };

  const handleGenerateRoute = async () => {
    setRouting(true);
    try {
      await generateCollectionRoute(reports.filter(r => r.status === 'open'));
      setMsg('Smart route generated successfully! Dispatching trucks.');
      setTimeout(() => setMsg(''), 3000);
      setTab('routing');
    } catch (err) {
      setMsg(err.message);
      setTimeout(() => setMsg(''), 3000);
    }
    setRouting(false);
  };

  const handleCompleteRoute = async (routeId) => {
    await updateRouteStatus(routeId, 'completed');
    // Also mark all stops in this route as resolved
    const route = activeRoutes.find(r => r.id === routeId);
    if (route) {
      for (const stop of route.stops) {
        await resolveWasteReport(stop.id).catch(() => {});
      }
    }
    setMsg('Route completed! Waste reports have been resolved.');
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div style={S.page}>
      <style>{`
        .score-circle { width:120px; height:120px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:42px; font-weight:800; border:8px solid; margin: 0 auto 20px; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={{display:'flex', alignItems:'center', gap:16}}>
          <div style={S.headerOrb}>
            <span style={{fontSize:26}}>♻️</span>
          </div>
          <div>
            <h1 style={S.title}>Waste Management</h1>
            <p style={S.subtitle}>Report, Validate, and Optimize Waste Collection</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[
          { id:'report', icon:'📝', label:'Report & Validate' },
          { id:'analytics', icon:'📊', label:'Analytics Dashboard' },
          { id:'routing', icon:'🚛', label:'Smart Routing' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...S.tabBtn,
            background: tab === t.id ? '#00cc66' : 'var(--bg-card)',
            color: tab === t.id ? '#fff' : 'var(--text-main)',
            borderColor: tab === t.id ? '#00cc66' : 'var(--border-main)',
          }}>
            <span style={{fontSize:18}}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={S.content}>
        
        {/* ── REPORT & VALIDATE ── */}
        {tab === 'report' && (
          <div style={S.grid2}>
            {/* Form */}
            <div style={S.card}>
              <h2 style={S.cardTitle}>Report Waste Pile</h2>
              <form onSubmit={handleReport} style={S.form}>
                <div style={{display:'flex', gap:10}}>
                  <LocationInput required style={{...S.input, flex:1}} placeholder="Location / Address" value={loc} onChange={e=>setLoc(e.target.value)} />
                </div>
                <textarea required style={{...S.input, height:80}} placeholder="Describe the waste (e.g., overflow bin, construction debris)" value={desc} onChange={e=>setDesc(e.target.value)} />
                <select style={S.input} value={severity} onChange={e=>setSeverity(e.target.value)}>
                  <option value="low">Low - Minor Litter</option>
                  <option value="medium">Medium - Full Bin</option>
                  <option value="high">High - Overflowing / Smelly</option>
                  <option value="critical">Critical - Hazardous / Blocking Road</option>
                </select>
                <div style={{display:'flex', gap:10}}>
                  <input style={S.input} placeholder="Lat (optional)" value={lat} onChange={e=>setLat(e.target.value)} />
                  <input style={S.input} placeholder="Lng (optional)" value={lng} onChange={e=>setLng(e.target.value)} />
                </div>
                <button type="submit" disabled={submitting} style={S.submitBtn}>
                  {submitting ? 'Submitting...' : 'Submit Report (AI Checked)'}
                </button>
              </form>
            </div>

            {/* List */}
            <div style={S.card}>
              <h2 style={S.cardTitle}>Open Reports & Community Validation</h2>
              <div style={S.listWrap}>
                {reports.filter(r => r.status === 'open').map(r => (
                  <div key={r.id} style={S.listItem}>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <p style={S.listHeader}>📍 {r.location}</p>
                      <span style={{...S.badge, background: r.severity==='critical'?'#ff4444':r.severity==='high'?'#ff8800':'#00cc66'}}>{r.severity?.toUpperCase()}</span>
                    </div>
                    <p style={S.listBody}>{r.description}</p>
                    {r.image_url && (
                      <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden' }}>
                        <img src={r.image_url} alt="Evidence" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12}}>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <button onClick={() => handleUpvote(r.id)} style={S.actionBtn}>👍 Validate ({r.votes})</button>
                      </div>
                      {user.role === 'admin' && (
                        <button onClick={() => handleResolve(r.id)} style={{...S.actionBtn, background:'#00cc66', color:'#fff', border:'none'}}>✅ Mark Resolved</button>
                      )}
                    </div>
                  </div>
                ))}
                {reports.filter(r => r.status === 'open').length === 0 && <p style={{color:'var(--text-sub)'}}>No open waste reports! City is clean.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS DASHBOARD ── */}
        {tab === 'analytics' && (
          <div>
            <div style={{...S.card, textAlign:'center', marginBottom:24}}>
              <h2 style={S.cardTitle}>Global Cleanliness Score</h2>
              <div className="score-circle" style={{
                borderColor: score >= 80 ? '#00cc66' : score >= 50 ? '#ffcc00' : '#ff4444',
                color: score >= 80 ? '#00cc66' : score >= 50 ? '#ffcc00' : '#ff4444'
              }}>{score}</div>
              <p style={{color:'var(--text-sub)'}}>Score is calculated dynamically based on open vs. resolved waste reports.</p>
            </div>

            <div style={S.grid2}>
              <div style={S.card}>
                <h2 style={S.cardTitle}>Status Breakdown</h2>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  <div style={S.statRow}><span>Open Reports</span> <b>{reports.filter(r=>r.status==='open').length}</b></div>
                  <div style={S.statRow}><span>Resolved</span> <b>{reports.filter(r=>r.status==='resolved').length}</b></div>
                  <div style={S.statRow}><span>Total</span> <b>{reports.length}</b></div>
                </div>
              </div>
              <div style={S.card}>
                <h2 style={S.cardTitle}>Severity (Open)</h2>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  <div style={S.statRow}><span style={{color:'#ff4444'}}>Critical</span> <b>{reports.filter(r=>r.status==='open' && r.severity==='critical').length}</b></div>
                  <div style={S.statRow}><span style={{color:'#ff8800'}}>High</span> <b>{reports.filter(r=>r.status==='open' && r.severity==='high').length}</b></div>
                  <div style={S.statRow}><span style={{color:'#00cc66'}}>Medium/Low</span> <b>{reports.filter(r=>r.status==='open' && (r.severity==='medium'||r.severity==='low')).length}</b></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SMART ROUTING ── */}
        {tab === 'routing' && (
          <div style={S.grid2}>
            <div style={S.card}>
              <h2 style={S.cardTitle}>AI Route Optimization</h2>
              <p style={{fontSize:13, color:'var(--text-sub)', marginBottom:20}}>Generate an AI-optimized garbage collection route targeting high-priority and highly-voted waste spots.</p>
              <button onClick={handleGenerateRoute} disabled={routing} style={S.submitBtn}>
                {routing ? 'AI is Calculating...' : '🚛 Generate Optimal Route'}
              </button>
            </div>

            <div style={S.card}>
              <h2 style={S.cardTitle}>Active Collection Routes</h2>
              <div style={S.listWrap}>
                {activeRoutes.map(route => (
                  <div key={route.id} style={S.listItem}>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <p style={S.listHeader}>🚛 Route #{route.id.slice(-4)}</p>
                      <span style={{...S.badge, background:'#ffcc00', color:'#000'}}>ACTIVE</span>
                    </div>
                    <p style={{fontSize:13, color:'var(--brand-primary)', margin:'8px 0'}}>Estimated Time: {route.estimatedTime}</p>
                    
                    <div style={{margin:'10px 0', paddingLeft:10, borderLeft:'2px solid var(--border-main)'}}>
                      {route.stops?.map((stop, i) => (
                        <p key={stop.id} style={{fontSize:12, color:'var(--text-main)', margin:'4px 0'}}>
                          {i+1}. {stop.location} <span style={{color:'#ff8800'}}>({stop.severity})</span>
                        </p>
                      ))}
                    </div>

                    <button onClick={() => handleCompleteRoute(route.id)} style={{...S.submitBtn, background:'#00cc66', width:'100%', padding:10, marginTop:10}}>
                      ✅ Complete Route & Resolve All
                    </button>
                  </div>
                ))}
                {activeRoutes.length === 0 && <p style={{color:'var(--text-sub)'}}>No active routes.</p>}
              </div>
            </div>
          </div>
        )}

      </div>

      {msg && <div style={S.toast}>{msg}</div>}
    </div>
  );
}

const S = {
  page: { padding: '28px', maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 20 },
  headerOrb: { width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16,185,129,0.3)', flexShrink: 0 },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 14, color: 'var(--text-sub)', margin: '4px 0 0', fontWeight: 500 },
  tabs: { display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 },
  tabBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', border: '1px solid', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  content: { animation: 'fadeUp 0.3s ease' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))' },
  cardTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 20px' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  input: { padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  submitBtn: { padding: 14, borderRadius: 12, border: 'none', background: 'var(--gradient-success, linear-gradient(135deg,#10b981,#059669))', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s', boxShadow: '0 4px 14px rgba(16,185,129,0.25)' },
  listWrap: { display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', maxHeight: 500, paddingRight: 4 },
  listItem: { background: 'var(--bg-input)', border: '1px solid var(--border-main)', borderRadius: 14, padding: 18, transition: 'all 0.2s' },
  listHeader: { fontSize: 15, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
  badge: { fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 8, color:'#fff' },
  listBody: { fontSize: 13, color: 'var(--text-main)', margin: '8px 0 0', lineHeight: 1.6 },
  actionBtn: { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-input)', borderRadius: 10, fontSize: 15, border: '1px solid var(--border-main)' },
  toast: { position: 'fixed', bottom: 30, right: 30, background: 'var(--text-main)', color: 'var(--bg-page)', padding: '14px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: 'var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.15))' }
};
