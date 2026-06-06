import React, { useState, useEffect } from 'react';
import { subscribeToIssues } from '../services/issueService';
import {
  predictTraffic,
  detectFakeReportWithAI,
  allocateResources,
  generateCityRecommendations,
} from '../services/sagemaker';
import LocationInput from '../components/LocationInput';
import { 
  Sparkles, Car, ShieldAlert, Ambulance, Building2, 
  MapPin, Clock, Search, BarChart3, AlertTriangle, 
  CheckCircle2, ChevronRight, Zap
} from 'lucide-react';

// ── 1. Traffic Prediction ─────────────────────────────────────────
function TrafficPrediction() {
  const [location, setLocation] = useState('');
  const [time, setTime]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);

  const analyze = async () => {
    if (!location || !time) return;
    setLoading(true); setResult(null);
    const r = await predictTraffic(location, time);
    setResult(r); setLoading(false);
  };

  return (
    <div className="fade-in">
      <div style={S.tabHeader}>
        <div style={S.iconBox}><Car size={24} color="#3b82f6" /></div>
        <div>
          <h2 style={S.tabTitle}>Traffic Flow Prediction</h2>
          <p style={S.tabDesc}>Forecast congestion patterns using Gemini's predictive intelligence.</p>
        </div>
      </div>

      <div style={S.formGrid}>
        <div style={S.field}>
          <label style={S.label}><MapPin size={14}/> Target Location</label>
          <LocationInput value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. 5th Avenue, Downtown" style={S.input} />
        </div>
        <div style={S.field}>
          <label style={S.label}><Clock size={14}/> Time of Day</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={S.input} />
        </div>
      </div>
      
      <button onClick={analyze} disabled={loading || !location || !time} style={{ ...S.aiBtn, opacity: (loading || !location || !time) ? 0.7 : 1 }}>
        {loading ? <span className="pulse-text">⏳ Analyzing Routes...</span> : <><Sparkles size={16}/> Predict Traffic</>}
      </button>

      {result && (
        <div style={S.resultCard} className="glass-panel slide-up">
          <div style={S.resultHeader}>
            <span style={S.resultTitle}>Forecast Results</span>
            <span style={S.smBadge}><Sparkles size={12}/> Gemini AI</span>
          </div>
          <div style={S.metricsGrid}>
            <div style={S.metricBox}>
              <span style={S.metricLabel}>Prediction</span>
              <span style={{...S.metricValue, color: '#3b82f6'}}>{result.prediction}</span>
            </div>
            <div style={S.metricBox}>
              <span style={S.metricLabel}>Confidence</span>
              <span style={S.metricValue}>{(result.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div style={S.suggestionBox}>
            <Zap size={16} color="#eab308" style={{marginTop: 2}}/>
            <div>
              <span style={S.suggestionLabel}>AI Recommendation</span>
              <p style={S.suggestionText}>{result.suggestion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. Fake Report Detection ──────────────────────────────────────
function FakeReportDetection() {
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);

  const detect = async () => {
    if (!title || !desc) return;
    setLoading(true); setResult(null);
    const r = await detectFakeReportWithAI(title, desc, location);
    setResult(r); setLoading(false);
  };

  return (
    <div className="fade-in">
      <div style={S.tabHeader}>
        <div style={{...S.iconBox, background: 'rgba(239, 68, 68, 0.1)'}}><ShieldAlert size={24} color="#ef4444" /></div>
        <div>
          <h2 style={S.tabTitle}>Anomaly Detection</h2>
          <p style={S.tabDesc}>Scan civic reports for fraudulent patterns and anomalies.</p>
        </div>
      </div>

      <div style={S.formGrid}>
        <div style={S.field}><label style={S.label}>Report Title</label><input value={title} onChange={e=>setTitle(e.target.value)} style={S.input} placeholder="Suspicious title..." /></div>
        <div style={S.field}><label style={S.label}>Location</label><LocationInput value={location} onChange={e=>setLocation(e.target.value)} style={S.input} /></div>
      </div>
      <div style={{...S.field, marginTop: 16}}>
        <label style={S.label}>Report Description</label>
        <textarea value={desc} onChange={e=>setDesc(e.target.value)} style={{...S.input, minHeight: 80}} placeholder="Full report text..." rows={3}/>
      </div>
      
      <button onClick={detect} disabled={loading || !title || !desc} style={{ ...S.aiBtn, background: 'linear-gradient(135deg, #ef4444, #b91c1c)', opacity: (loading || !title || !desc) ? 0.7 : 1 }}>
        {loading ? <span className="pulse-text">⏳ Scanning Data...</span> : <><Search size={16}/> Analyze Report</>}
      </button>

      {result && (
        <div style={S.resultCard} className="glass-panel slide-up">
          <div style={S.resultHeader}>
            <span style={S.resultTitle}>Security Analysis</span>
            <span style={{...S.smBadge, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)'}}><ShieldAlert size={12}/> Gemini Security</span>
          </div>
          
          <div style={{...S.suggestionBox, background: result.isFake ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', borderColor: result.isFake ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}}>
            {result.isFake ? <AlertTriangle size={24} color="#ef4444"/> : <CheckCircle2 size={24} color="#10b981"/>}
            <div>
              <span style={{...S.suggestionLabel, color: result.isFake ? '#ef4444' : '#10b981'}}>
                {result.isFake ? 'High Risk - Suspicious Report' : 'Verified - Authentic Report'}
              </span>
              <p style={S.suggestionText}>{result.reason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. Resource Allocation ────────────────────────────────────────
function ResourceAllocation({ issues }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  const allocate = async () => {
    setLoading(true); setResult(null);
    const r = await allocateResources(issues);
    setResult(r); setLoading(false);
  };

  return (
    <div className="fade-in">
      <div style={S.tabHeader}>
        <div style={{...S.iconBox, background: 'rgba(16, 185, 129, 0.1)'}}><Ambulance size={24} color="#10b981" /></div>
        <div>
          <h2 style={S.tabTitle}>Dynamic Dispatch</h2>
          <p style={S.tabDesc}>Optimize emergency vehicle and maintenance crew routes instantly.</p>
        </div>
      </div>

      <div style={{background: 'var(--bg-card)', padding: 20, borderRadius: 16, border: '1px solid var(--border-main)', marginBottom: 20}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
          <BarChart3 size={20} color="#10b981" />
          <span style={{color: 'var(--text-main)', fontWeight: 600}}>System Ready</span>
        </div>
        <p style={{color: 'var(--text-sub)', margin: 0, fontSize: 14}}>
          Monitoring {issues.length} active civic issues across all city sectors. Ready to dispatch available units.
        </p>
      </div>

      <button onClick={allocate} disabled={loading} style={{ ...S.aiBtn, background: 'linear-gradient(135deg, #10b981, #059669)', opacity: loading ? 0.7 : 1 }}>
        {loading ? <span className="pulse-text">⏳ Calculating Optimal Routes...</span> : <><Ambulance size={16}/> Dispatch Resources</>}
      </button>

      {result && (
        <div style={S.resultCard} className="glass-panel slide-up">
          <div style={S.resultHeader}>
            <span style={S.resultTitle}>Active Dispatch Plan</span>
            <span style={{...S.smBadge, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)'}}><Sparkles size={12}/> Gemini Optimizer</span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
            {result.allocations.map((a, i) => (
              <div key={i} style={S.dispatchRow}>
                <div style={S.dispatchUnit}>
                  <Ambulance size={18} color="#10b981" />
                  <span>{a.unit}</span>
                </div>
                <div style={S.dispatchTask}>
                  <span style={S.taskText}>{a.task}</span>
                  <span style={{...S.priorityBadge, background: a.priority === 'High' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: a.priority === 'High' ? '#ef4444' : '#f59e0b'}}>
                    {a.priority} Priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4. City Planning ─────────────────────────────────────────────
function CityPlanning({ issues }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  
  const [location, setLocation] = useState('MG Road');
  const [traffic, setTraffic] = useState('High');
  const [crime, setCrime] = useState(12);
  const [waste, setWaste] = useState(18);
  const [accidents, setAccidents] = useState(5);

  const generate = async () => {
    setLoading(true); setResult(null);
    const stats = { traffic, crime, waste, accidents };
    const r = await generateCityRecommendations(location, stats);
    if (r.success) {
      setResult(r.plan);
    } else {
      setResult({ priority: 'Error', recommendations: r.error });
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div style={S.tabHeader}>
        <div style={{...S.iconBox, background: 'rgba(139, 92, 246, 0.1)'}}><Building2 size={24} color="#8b5cf6" /></div>
        <div>
          <h2 style={S.tabTitle}>GenAI City Planning Assistant</h2>
          <p style={S.tabDesc}>Transforms real-time smart city analytics into actionable governance recommendations.</p>
        </div>
      </div>

      <div style={S.formGrid}>
        <div style={S.field}>
          <label style={S.label}>Target Location</label>
          <LocationInput value={location} onChange={e=>setLocation(e.target.value)} style={S.input} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Traffic Status</label>
          <select value={traffic} onChange={e=>setTraffic(e.target.value)} style={S.input}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Severe">Severe</option>
          </select>
        </div>
        <div style={S.field}>
          <label style={S.label}>Crime Reports</label>
          <input type="number" value={crime} onChange={e=>setCrime(e.target.value)} style={S.input} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Waste Reports</label>
          <input type="number" value={waste} onChange={e=>setWaste(e.target.value)} style={S.input} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Accidents</label>
          <input type="number" value={accidents} onChange={e=>setAccidents(e.target.value)} style={S.input} />
        </div>
      </div>

      <button onClick={generate} disabled={loading || !location} style={{ ...S.aiBtn, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', opacity: (loading || !location) ? 0.7 : 1 }}>
        {loading ? <span className="pulse-text">⏳ Synthesizing City Plan...</span> : <><Building2 size={16}/> Generate Strategy</>}
      </button>

      {result && (
        <div style={S.resultCard} className="glass-panel slide-up">
          <div style={S.resultHeader}>
            <span style={S.resultTitle}>AI City Planner</span>
            <span style={{...S.smBadge, background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', borderColor: 'rgba(139, 92, 246, 0.2)'}}><Sparkles size={12}/> Gemini Intelligence</span>
          </div>
          
          <div style={{...S.insightBox, background: 'var(--bg-input)'}}>
            <div style={{ marginBottom: 16 }}>
              <span style={{ color: '#94a3b8', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Location</span>
              <div style={{ fontSize: 18, color: 'var(--text-main)', fontWeight: 700 }}>{result.location || location}</div>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <span style={{ color: '#94a3b8', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Priority</span>
              <div style={{ 
                display: 'inline-block', marginTop: 4, padding: '4px 12px', borderRadius: 20, fontSize: 14, fontWeight: 700,
                background: result.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : result.priority === 'Medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: result.priority === 'High' ? '#ef4444' : result.priority === 'Medium' ? '#f59e0b' : '#10b981',
                border: `1px solid ${result.priority === 'High' ? 'rgba(239, 68, 68, 0.2)' : result.priority === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
              }}>
                {result.priority || 'Medium'}
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div style={{
                whiteSpace:'pre-line', 
                fontSize: 15, 
                lineHeight: 1.8, 
                color: 'var(--text-main)', 
                background: 'linear-gradient(145deg, var(--bg-card), rgba(59, 130, 246, 0.03))', 
                padding: 28, 
                borderRadius: 20,
                border: '1px solid var(--border-main)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.04), inset 0 2px 4px rgba(255,255,255,0.5)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', top: 0, left: 0, width: 4, height: '100%', 
                  background: 'linear-gradient(to bottom, var(--brand-primary), #8b5cf6)' 
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-main)', paddingBottom: 16 }}>
                  <Sparkles size={18} color="var(--brand-primary)" />
                  <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--text-main)' }}>AI Strategy Document</span>
                </div>
                <div style={{ color: 'var(--text-sub)', fontWeight: 500 }}>
                  {result.recommendations}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function GeminiPage() {
  const [tab, setTab]       = useState('traffic');
  const [issues, setIssues] = useState([]);

  useEffect(() => subscribeToIssues(setIssues), []);

  const tabs = [
    { id: 'traffic',   icon: <Car size={18}/>,         label: 'Traffic AI' },
    { id: 'fake',      icon: <ShieldAlert size={18}/>, label: 'Security AI' },
    { id: 'resources', icon: <Ambulance size={18}/>,   label: 'Dispatch AI' },
    { id: 'planning',  icon: <Building2 size={18}/>,   label: 'Strategy AI' },
  ];

  return (
    <div style={S.pageWrapper}>
      <style>{`
        @keyframes orbFloat { 0%, 100% { transform: translateY(0) scale(1); filter: hue-rotate(0deg); } 50% { transform: translateY(-10px) scale(1.05); filter: hue-rotate(30deg); } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.3); } 50% { box-shadow: 0 0 60px rgba(59, 130, 246, 0.6); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pulse-text { animation: fadeIn 1s infinite alternate; }
        

        
        .nav-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .nav-btn:hover:not(.active) { background: var(--bg-card-hover); transform: translateY(-2px); }
        .nav-btn.active { background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2)); border-color: rgba(139, 92, 246, 0.5); box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15); }
        
        .ai-btn-hover { transition: all 0.3s ease; position: relative; overflow: hidden; }
        .ai-btn-hover::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s ease; }
        .ai-btn-hover:hover::before { left: 100%; }
        .ai-btn-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4); }
      `}</style>

      {/* Dynamic Background Effects */}
      <div style={S.bgGlow1} />
      <div style={S.bgGlow2} />

      <div style={S.container}>
        {/* Header Section */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.orbContainer}>
              <div style={S.orbCenter}>
                <Sparkles size={32} color="var(--brand-primary)" />
              </div>
            </div>
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                <h1 style={S.mainTitle}>Gemini Intelligence</h1>
                <div style={S.liveChip}>
                  <div style={S.liveDot} />
                  <span>Systems Online</span>
                </div>
              </div>
              <p style={S.mainSubtitle}>Advanced neural processing for SmartCity infrastructure.</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={S.tabContainer}>
          {tabs.map(t => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)} 
              className={`nav-btn ${tab === t.id ? 'active' : ''}`}
              style={{
                ...S.tabButton,
                color: tab === t.id ? 'var(--text-main)' : 'var(--text-sub)',
                borderColor: tab === t.id ? 'transparent' : 'var(--border-main)'
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="glass-panel" style={S.contentArea}>
          {tab === 'traffic'   && <TrafficPrediction />}
          {tab === 'fake'      && <FakeReportDetection />}
          {tab === 'resources' && <ResourceAllocation issues={issues} />}
          {tab === 'planning'  && <CityPlanning issues={issues} />}
        </div>
      </div>
    </div>
  );
}

// ── Styling ─────────────────────────────────────────────────────
const S = {
  pageWrapper: {
    minHeight: '100vh',
    background: 'var(--bg-page)', // Dynamic background
    position: 'relative',
    overflow: 'hidden',
    padding: '40px 24px',
    fontFamily: "'Inter', system-ui, sans-serif"
  },
  bgGlow1: {
    position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw',
    background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(0,0,0,0) 70%)',
    zIndex: 0, pointerEvents: 'none'
  },
  bgGlow2: {
    position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw',
    background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(0,0,0,0) 70%)',
    zIndex: 0, pointerEvents: 'none'
  },
  container: {
    maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 24
  },
  orbContainer: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)',
    padding: 3,
    animation: 'orbFloat 6s ease-in-out infinite, pulseGlow 4s ease-in-out infinite',
  },
  orbCenter: {
    width: '100%', height: '100%', borderRadius: '50%',
    background: 'var(--bg-card)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  mainTitle: {
    fontSize: 36, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em',
    background: 'linear-gradient(to right, var(--text-main), var(--brand-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
  },
  mainSubtitle: {
    fontSize: 16, color: '#94a3b8', margin: '8px 0 0', fontWeight: 400
  },
  liveChip: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
    background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: 20, color: '#10b981', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
  },
  liveDot: {
    width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981',
    animation: 'fadeIn 1s infinite alternate'
  },
  tabContainer: {
    display: 'flex', gap: 12, marginBottom: 24, overflowX: 'auto', paddingBottom: 8,
    scrollbarWidth: 'none'
  },
  tabButton: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 24px',
    borderRadius: 16, border: '1px solid', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', outline: 'none', flexShrink: 0
  },
  contentArea: {
    borderRadius: 24, padding: 40, minHeight: 400
  },
  tabHeader: {
    display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32
  },
  iconBox: {
    width: 60, height: 60, borderRadius: 16, background: 'rgba(59, 130, 246, 0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-main)'
  },
  tabTitle: {
    fontSize: 24, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px'
  },
  tabDesc: {
    fontSize: 15, color: '#94a3b8', margin: 0
  },
  formGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24
  },
  field: {
    display: 'flex', flexDirection: 'column', gap: 10
  },
  label: {
    fontSize: 13, fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.05em'
  },
  input: {
    padding: '16px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 14, color: 'var(--text-main)', fontSize: 15, outline: 'none', transition: 'all 0.2s ease', width: '100%'
  },
  aiBtn: {
    width: '100%', padding: '18px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(0,0,0,0.2)', marginTop: 12
  },
  resultCard: {
    marginTop: 32, background: 'var(--bg-card)', border: '1px solid var(--border-main)',
    borderRadius: 20, padding: 28
  },
  resultHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
    borderBottom: '1px solid var(--border-main)', paddingBottom: 16
  },
  resultTitle: {
    fontSize: 18, fontWeight: 700, color: 'var(--text-main)'
  },
  smBadge: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
    background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 20, color: '#a78bfa', fontSize: 12, fontWeight: 700, textTransform: 'uppercase'
  },
  metricsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20
  },
  metricBox: {
    background: 'var(--bg-input)', borderRadius: 16, padding: 20, border: '1px solid var(--border-main)'
  },
  metricLabel: {
    display: 'block', fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 600
  },
  metricValue: {
    fontSize: 28, fontWeight: 800, color: 'var(--text-main)'
  },
  suggestionBox: {
    display: 'flex', gap: 16, background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.1)',
    borderRadius: 16, padding: 20
  },
  suggestionLabel: {
    display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6
  },
  suggestionText: {
    fontSize: 14, color: '#cbd5e1', margin: 0, lineHeight: 1.6
  },
  dispatchRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-input)', padding: '16px 20px', borderRadius: 14, border: '1px solid var(--border-main)'
  },
  dispatchUnit: {
    display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-main)', fontWeight: 600, fontSize: 15
  },
  dispatchTask: {
    display: 'flex', alignItems: 'center', gap: 16
  },
  taskText: {
    color: '#94a3b8', fontSize: 14
  },
  priorityBadge: {
    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase'
  },
  insightBox: {
    background: 'var(--bg-input)', borderRadius: 16, padding: 24, border: '1px solid var(--border-main)'
  }
};
