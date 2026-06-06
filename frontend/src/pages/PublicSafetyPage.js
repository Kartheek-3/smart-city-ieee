import React, { useState, useEffect } from 'react';
import {
  reportAccident, subscribeToAccidents, verifyAccident,
  requestAmbulance, subscribeToEmergencies, subscribeToEmergencyAlerts,
  reportCrime, subscribeToCrimes,
  requestPoliceDispatch, subscribeToPoliceDispatches
} from '../services/safetyService';
import { analyzeCrimeTrends } from '../services/sagemaker';
import LocationInput from '../components/LocationInput';
import S3ImageUpload from '../components/S3ImageUpload';

export default function PublicSafetyPage({ userData, user }) {
  const [tab, setTab] = useState('accidents'); // accidents, emergencies, crimes, police

  // Data states
  const [accidents, setAccidents] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [crimes, setCrimes] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [crimeAnalysis, setCrimeAnalysis] = useState(null);
  
  // Forms
  const [accLoc, setAccLoc] = useState('');
  const [accDesc, setAccDesc] = useState('');
  const [accImage, setAccImage] = useState(null);
  const [reportingAcc, setReportingAcc] = useState(false);

  const [ambLoc, setAmbLoc] = useState('');
  const [ambDesc, setAmbDesc] = useState('');
  const [reqAmb, setReqAmb] = useState(false);

  const [crimeType, setCrimeType] = useState('Theft');
  const [crimeLoc, setCrimeLoc] = useState('');
  const [crimeDesc, setCrimeDesc] = useState('');
  const [crimeImage, setCrimeImage] = useState(null);
  const [reportingCrime, setReportingCrime] = useState(false);

  const [polLoc, setPolLoc] = useState('');
  const [polReason, setPolReason] = useState('');
  const [reqPol, setReqPol] = useState(false);

  // Broadcasts
  const [bcTitle, setBcTitle] = useState('');
  const [bcMsg, setBcMsg] = useState('');
  const [bcPriority, setBcPriority] = useState('Critical');
  const [bcDept, setBcDept] = useState('General');
  const [broadcasting, setBroadcasting] = useState(false);

  const [msg, setMsg] = useState('');
  const [detecting, setDetecting] = useState(false);

  // Subscriptions
  useEffect(() => {
    const unsub1 = subscribeToAccidents(setAccidents);
    const unsub2 = subscribeToEmergencies(setEmergencies);
    const unsub3 = subscribeToCrimes(setCrimes);
    const unsub4 = subscribeToPoliceDispatches(setDispatches);
    const unsub5 = subscribeToEmergencyAlerts((incomingAlerts) => {
      setAlerts(incomingAlerts);
      // Voice Alert trigger for critical alerts
      if (incomingAlerts.length > 0 && 'speechSynthesis' in window) {
        const latest = incomingAlerts[0];
        // Only announce if it's new (created in the last 15 seconds)
        const isNew = new Date(latest.createdAt).getTime() > Date.now() - 15000;
        if (isNew) {
          const utterance = new SpeechSynthesisUtterance(`Public Safety Alert: ${latest.message}`);
          utterance.rate = 1.0;
          utterance.pitch = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      }
    });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, []);

  // Analyze crime trends periodically or on load
  useEffect(() => {
    if (crimes.length > 0 && !crimeAnalysis) {
      analyzeCrimeTrends(crimes).then(setCrimeAnalysis);
    }
  }, [crimes, crimeAnalysis]);

  // Auto detect logic is now handled by LocationInput component.

  const handleReportAccident = async (e) => {
    e.preventDefault();
    setReportingAcc(true);
    try {
      // In a real app, you'd send `accImage` to your backend or DynamoDB here.
      // Since this calls `reportAccident` in safetyService, you might need to ensure safetyService accepts image_key
      const newAcc = await reportAccident({ location: accLoc, description: accDesc, image_key: accImage }, user);
      setAccidents(prev => [newAcc, ...prev]);
      setAccLoc(''); setAccDesc(''); setAccImage(null);
      setMsg('Accident reported successfully. AI prioritized.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); }
    setReportingAcc(false);
  };

  const handleVerifyAccident = async (accidentId) => {
    try {
      const success = await verifyAccident(accidentId, user.uid);
      if (success) {
        setMsg('Accident verified successfully.');
      } else {
        setMsg('Already verified or error occurred.');
      }
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleRequestAmbulance = async (e) => {
    e.preventDefault();
    setReqAmb(true);
    try {
      const newAmb = await requestAmbulance(ambLoc, ambDesc, user);
      setEmergencies(prev => [newAmb, ...prev]);
      setAmbLoc(''); setAmbDesc('');
      setMsg('Ambulance requested (Simulated).');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); }
    setReqAmb(false);
  };

  const handleReportCrime = async (e) => {
    e.preventDefault();
    setReportingCrime(true);
    try {
      const newCrime = await reportCrime({ type: crimeType, location: crimeLoc, description: crimeDesc, image_key: crimeImage }, user);
      setCrimes(prev => [newCrime, ...prev]);
      setCrimeLoc(''); setCrimeDesc(''); setCrimeImage(null);
      setMsg('Crime reported successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); }
    setReportingCrime(false);
  };

  const handlePoliceDispatch = async (e) => {
    e.preventDefault();
    setReqPol(true);
    try {
      const newPolice = await requestPoliceDispatch(polLoc, polReason, user);
      setDispatches(prev => [newPolice, ...prev]);
      setPolLoc(''); setPolReason('');
      setMsg('Police dispatch requested (Simulated).');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); }
    setReqPol(false);
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setBroadcasting(true);
    try {
      const { triggerEmergencyAlert } = require('../services/safetyService');
      await triggerEmergencyAlert(bcTitle, bcMsg, bcPriority, bcDept, user.uid);
      setBcTitle(''); setBcMsg('');
      setMsg('Broadcast sent successfully!');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.message); }
    setBroadcasting(false);
  };

  return (
    <div style={S.page}>
      <style>{`
        @keyframes pulseAlert { 0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(255, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); } }
        .danger-card { border: 1px solid var(--danger-border); background: var(--danger-bg); animation: pulseAlert 2s infinite; }
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={{display:'flex', alignItems:'center', gap:16}}>
          <div style={S.headerOrb}>
            <span style={{fontSize:26}}>🚨</span>
          </div>
          <div>
            <h1 style={S.title}>Public Safety Hub</h1>
            <p style={S.subtitle}>Accidents, Emergencies, Crime, and Police Assistance</p>
          </div>
        </div>
        
        {/* Active Emergency Alerts */}
        {alerts.length > 0 && (
          <div className="danger-card" style={S.alertBanner}>
            <span style={{fontSize:24}}>⚠️</span>
            <div>
              <p style={{color:'var(--danger-text)', fontWeight:800, margin:0}}>ACTIVE EMERGENCY ALERT</p>
              <p style={{color:'var(--text-main)', fontSize:13, margin:'4px 0 0'}}>{alerts[0].message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[
          { id:'accidents', icon:'🚗', label:'Accident Management' },
          ...(userData?.role === 'admin' || userData?.role === 'official' ? [
            { id:'emergencies', icon:'🚑', label:'Emergency Response' },
            { id:'broadcasts', icon:'📢', label:'Emergency Broadcasts' }
          ] : []),
          { id:'crimes', icon:'🔍', label:'Crime Monitoring' },
          ...(userData?.role === 'admin' || userData?.role === 'official' ? [
            { id:'police', icon:'🚓', label:'Police Assistance' }
          ] : []),
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...S.tabBtn,
            background: tab === t.id ? 'var(--brand-primary)' : 'var(--bg-card)',
            color: tab === t.id ? '#fff' : 'var(--text-main)',
            borderColor: tab === t.id ? 'var(--brand-primary)' : 'var(--border-main)',
          }}>
            <span style={{fontSize:18}}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={S.content}>
        
        {/* ── ACCIDENT MANAGEMENT ── */}
        {tab === 'accidents' && (
          <div style={S.grid2}>
            {/* Form */}
            <div style={S.card}>
              <h2 style={S.cardTitle}>Report Accident</h2>
              <form onSubmit={handleReportAccident} style={S.form}>
                <div style={{display:'flex', gap:10}}>
                  <LocationInput required style={{...S.input, flex:1}} placeholder="Location (e.g., Main St & 5th Ave)" value={accLoc} onChange={e=>setAccLoc(e.target.value)} />
                </div>
                <textarea required style={{...S.input, height:100, resize:'vertical'}} placeholder="Describe the accident (e.g. 2 cars involved, minor injuries)" value={accDesc} onChange={e=>setAccDesc(e.target.value)} />
                <S3ImageUpload category="accidents" onUploadComplete={setAccImage} />
                <button type="submit" disabled={reportingAcc} style={S.submitBtn}>
                  {reportingAcc ? 'Reporting...' : 'Submit Report (AI Validated)'}
                </button>
              </form>
            </div>
            {/* List */}
            <div style={S.card}>
              <h2 style={S.cardTitle}>Recent Accidents ({accidents.length})</h2>
              <div style={S.listWrap}>
                {accidents.map(a => (
                  <div key={a.id} style={S.listItem}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <p style={S.listHeader}>📍 {a.location}</p>
                      <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        {a.status === 'pending' && (
                          <span style={{...S.badge, background:'#ff8800', color:'#fff'}}>PENDING ({a.confirmations||0}/3)</span>
                        )}
                        {a.status === 'verified' && (
                          <span style={{...S.badge, background:'#00cc66', color:'#fff'}}>VERIFIED ✅</span>
                        )}
                        <span style={{...S.badge, background: a.severity==='critical'?'#ff4444':a.severity==='high'?'#ff8800':'#00cc66', color:'#fff'}}>
                          {a.severity?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p style={S.listBody}>{a.description}</p>
                    {a.aiSummary && <p style={{fontSize:11, color:'var(--brand-primary)', margin:'4px 0 0'}}>🤖 AI: {a.aiSummary}</p>}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 8}}>
                      <p style={S.listMeta}>Reported by {a.reporterName} · {new Date(a.createdAt).toLocaleString()}</p>
                      {a.status === 'pending' && a.reporterId !== user.uid && (
                        <button onClick={() => handleVerifyAccident(a.id)} style={{...S.actionBtn, background:'var(--bg-card-hover)', border:'1px solid var(--border-main)', fontSize:12, padding:'4px 8px', borderRadius:6, color:'var(--text-main)'}}>
                          Verify 👀
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── EMERGENCY RESPONSE ── */}
        {tab === 'emergencies' && (
          <div style={S.grid2}>
            <div style={S.card}>
              <h2 style={S.cardTitle}>🚑 Request Ambulance</h2>
              <p style={{fontSize:12, color:'var(--danger-text)', marginBottom:16}}>*This is a simulation. For real emergencies, call 911.*</p>
              <form onSubmit={handleRequestAmbulance} style={S.form}>
                <div style={{display:'flex', gap:10}}>
                  <LocationInput required style={{...S.input, flex:1}} placeholder="Current Location / Address" value={ambLoc} onChange={e=>setAmbLoc(e.target.value)} />
                </div>
                <textarea required style={{...S.input, height:80}} placeholder="Nature of emergency" value={ambDesc} onChange={e=>setAmbDesc(e.target.value)} />
                <button type="submit" disabled={reqAmb} style={{...S.submitBtn, background:'var(--danger-text)'}}>
                  {reqAmb ? 'Dispatching...' : 'Request Ambulance Now'}
                </button>
              </form>
              <div style={{marginTop:20, paddingTop:20, borderTop:'1px solid var(--border-main)'}}>
                <a href="tel:911" style={{...S.submitBtn, background:'#1a1a1a', display:'block', textAlign:'center', textDecoration:'none'}}>📞 Call Emergency Services</a>
              </div>
            </div>
            
            <div style={S.card}>
              <h2 style={S.cardTitle}>Active Dispatches</h2>
              <div style={S.listWrap}>
                {emergencies.map(e => {
                  const minutes = Math.round((Date.now() - new Date(e.createdAt).getTime()) / 60000);
                  return (
                    <div key={e.id} style={S.listItem}>
                      <div style={{display:'flex', justifyContent:'space-between'}}>
                        <p style={S.listHeader}>🚑 To: {e.location}</p>
                        <span style={{...S.badge, background:'#ffcc00', color:'#000'}}>{e.status.toUpperCase()}</span>
                      </div>
                      <p style={S.listBody}>{e.details}</p>
                      <p style={S.listMeta}>Requested {minutes} min ago by {e.requesterName}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CRIME MONITORING ── */}
        {tab === 'crimes' && (
          <div style={S.grid2}>
            <div style={S.card}>
              <h2 style={S.cardTitle}>Report Crime / Suspicious Activity</h2>
              <form onSubmit={handleReportCrime} style={S.form}>
                <select style={S.input} value={crimeType} onChange={e=>setCrimeType(e.target.value)}>
                  <option>Theft / Burglary</option>
                  <option>Vandalism</option>
                  <option>Suspicious Activity</option>
                  <option>Assault</option>
                  <option>Other</option>
                </select>
                <div style={{display:'flex', gap:10}}>
                  <LocationInput required style={{...S.input, flex:1}} placeholder="Location" value={crimeLoc} onChange={e=>setCrimeLoc(e.target.value)} />
                </div>
                  <textarea required style={{...S.input, height:80, resize:'vertical'}} placeholder="Describe the crime" value={crimeDesc} onChange={e=>setCrimeDesc(e.target.value)} />
                <S3ImageUpload category="crimes" onUploadComplete={setCrimeImage} />
                <button type="submit" disabled={reportingCrime} style={S.submitBtn}>
                  {reportingCrime ? 'Reporting...' : 'Submit Report'}
                </button>
              </form>

              {/* AI Crime Analytics */}
              <div style={{marginTop:24, background:'var(--bg-card-hover)', padding:16, borderRadius:12, border:'1px solid var(--brand-primary)'}}>
                <h3 style={{fontSize:14, color:'var(--brand-primary)', margin:'0 0 10px', display:'flex', alignItems:'center', gap:8}}>
                  🤖 AI Crime Analytics
                </h3>
                {crimeAnalysis ? (
                  <>
                    <p style={{fontSize:13, color:'var(--text-main)', margin:'0 0 10px', lineHeight:1.5}}>{crimeAnalysis.summary}</p>
                    <p style={{fontSize:12, color:'var(--text-sub)', margin:0}}><b>High Risk Areas:</b> {crimeAnalysis.highRiskAreas?.join(', ')}</p>
                  </>
                ) : <p style={{fontSize:13, color:'var(--text-sub)'}}>Analyzing recent crime data...</p>}
              </div>
            </div>

            <div style={S.card}>
              <h2 style={S.cardTitle}>Community Crime Alerts ({crimes.length})</h2>
              <div style={S.listWrap}>
                {crimes.map(c => (
                  <div key={c.id} style={S.listItem}>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <p style={S.listHeader}>🔍 {c.type}</p>
                      <span style={{...S.badge, background:'#1a1a1a', border:'1px solid #333', color:'#aaa'}}>{c.status}</span>
                    </div>
                    <p style={S.listBody}><b>Location:</b> {c.location}</p>
                    <p style={S.listBody}>{c.description}</p>
                    <p style={S.listMeta}>{new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── POLICE ASSISTANCE ── */}
        {tab === 'police' && (
          <div style={S.grid2}>
            <div style={S.card}>
              <h2 style={S.cardTitle}>🚓 Request Police Dispatch</h2>
              <p style={{fontSize:12, color:'var(--text-sub)', marginBottom:16}}>*Simulation only.*</p>
              <form onSubmit={handlePoliceDispatch} style={S.form}>
                <div style={{display:'flex', gap:10}}>
                  <LocationInput required style={{...S.input, flex:1}} placeholder="Location for dispatch" value={polLoc} onChange={e=>setPolLoc(e.target.value)} />
                </div>
                <textarea required style={{...S.input, height:80}} placeholder="Reason for dispatch" value={polReason} onChange={e=>setPolReason(e.target.value)} />
                <button type="submit" disabled={reqPol} style={{...S.submitBtn, background:'#1a73e8'}}>
                  {reqPol ? 'Dispatching...' : 'Request Police Unit'}
                </button>
              </form>
            </div>

            <div style={S.card}>
              <h2 style={S.cardTitle}>Police Investigation Dashboard</h2>
              <div style={S.listWrap}>
                {dispatches.map(d => (
                  <div key={d.id} style={S.listItem}>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <p style={S.listHeader}>📍 Unit to: {d.location}</p>
                      <span style={{...S.badge, background:'#4488ff', color:'#fff'}}>EN ROUTE</span>
                    </div>
                    <p style={S.listBody}>{d.reason}</p>
                    <p style={S.listMeta}>Dispatched {new Date(d.createdAt).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── EMERGENCY BROADCASTS ── */}
        {tab === 'broadcasts' && (
          <div style={S.grid2}>
            <div style={S.card}>
              <h2 style={S.cardTitle}>📢 Create Emergency Broadcast</h2>
              <form onSubmit={handleBroadcast} style={S.form}>
                <input required style={S.input} placeholder="Alert Title (e.g. Flood Warning)" value={bcTitle} onChange={e=>setBcTitle(e.target.value)} />
                <textarea required style={{...S.input, height:80}} placeholder="Detailed message" value={bcMsg} onChange={e=>setBcMsg(e.target.value)} />
                <select style={S.input} value={bcPriority} onChange={e=>setBcPriority(e.target.value)}>
                  <option value="High">High Priority</option>
                  <option value="Critical">Critical (SNS / SMS Broadcast)</option>
                  <option value="Low">Low / Informational</option>
                </select>
                <select style={S.input} value={bcDept} onChange={e=>setBcDept(e.target.value)}>
                  <option>General</option>
                  <option>Police</option>
                  <option>Fire Dept</option>
                  <option>Medical</option>
                </select>
                <button type="submit" disabled={broadcasting} style={{...S.submitBtn, background:'var(--danger-text)'}}>
                  {broadcasting ? 'Broadcasting...' : 'Broadcast Alert'}
                </button>
              </form>
            </div>
            
            <div style={S.card}>
               <h2 style={S.cardTitle}>Recent Broadcasts</h2>
               <div style={S.listWrap}>
                 {alerts.map(a => (
                   <div key={a.alertId || a.messageId} style={S.listItem}>
                     <div style={{display:'flex', justifyContent:'space-between'}}>
                       <p style={S.listHeader}>{a.title || 'Emergency Alert'}</p>
                       <span style={{...S.badge, background:'#ff4444', color:'#fff'}}>{a.priority || 'Critical'}</span>
                     </div>
                     <p style={S.listBody}>{a.message || a.content}</p>
                     <p style={S.listMeta}>{new Date(a.timestamp || a.createdAt).toLocaleString()} • {a.department || 'General'}</p>
                   </div>
                 ))}
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
  headerOrb: { width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.3)', flexShrink: 0 },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 14, color: 'var(--text-sub)', margin: '4px 0 0', fontWeight: 500 },
  alertBanner: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderRadius: 14, flex: 1, minWidth: 300 },
  tabs: { display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 },
  tabBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', border: '1px solid', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  content: { animation: 'fadeUp 0.3s ease' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))' },
  cardTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 20px' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  input: { padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  submitBtn: { padding: 14, borderRadius: 12, border: 'none', background: 'var(--gradient-brand, linear-gradient(135deg,#2563eb,#7c3aed))', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s', boxShadow: '0 4px 14px rgba(37,99,235,0.25)' },
  listWrap: { display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', maxHeight: 500, paddingRight: 4 },
  listItem: { background: 'var(--bg-input)', border: '1px solid var(--border-main)', borderRadius: 14, padding: 18, transition: 'all 0.2s' },
  listHeader: { fontSize: 15, fontWeight: 700, color: 'var(--text-main)', margin: 0 },
  badge: { fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 8 },
  listBody: { fontSize: 13, color: 'var(--text-main)', margin: '8px 0 0', lineHeight: 1.6 },
  listMeta: { fontSize: 11, color: 'var(--text-sub)', margin: '8px 0 0' },
  toast: { position: 'fixed', bottom: 30, right: 30, background: 'var(--text-main)', color: 'var(--bg-page)', padding: '14px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 9999, boxShadow: 'var(--shadow-lg, 0 12px 40px rgba(0,0,0,0.15))' }
};
