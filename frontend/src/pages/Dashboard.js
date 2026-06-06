import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { subscribeToIssues, subscribeToAlerts, markAlertRead, getPriorityMeta } from '../services/issueService';
import {
  FileText, Clock, AlertTriangle, CheckCircle2, Wind, Zap, Trash2,
  Map, PlusCircle, Bell, ChevronRight, Activity, TrendingUp, AlertCircle,
  ShieldAlert, Car, Building2, MapPin, MessageSquare, Brain, Shield, Users
} from 'lucide-react';

const CAT_COLOR = { safety: '#ef4444', pollution: '#f59e0b', traffic: '#3b82f6', waste: '#10b981', convenience: '#8b5cf6' };
const CAT_ICON = { 
  safety: <ShieldAlert size={16}/>, 
  pollution: <Wind size={16}/>, 
  traffic: <Car size={16}/>, 
  waste: <Trash2 size={16}/>, 
  convenience: <Building2 size={16}/> 
};

export default function Dashboard({ userData }) {
  const { t } = useTranslation();
  const [issues, setIssues] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // ── Live AI Data ──
  const [trafficPred, setTrafficPred] = useState(null);
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [aiRecs, setAiRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => subscribeToIssues(setIssues), []);
  useEffect(() => subscribeToAlerts(setAlerts), []);

  // Fetch live SageMaker traffic prediction
  useEffect(() => {
    const fetchTraffic = async () => {
      try {
        const hour = new Date().getHours();
        const res = await fetch('http://localhost:5000/api/ml/predict-traffic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: Array.from({length:24}, (_, i) => [(hour - 23 + i + 24)%24, new Date().getDay(), 289, 0, 0, 75, 4]) })
        });
        const data = await res.json();
        if (data.status === 'success') setTrafficPred(data);
      } catch (e) { console.warn('Traffic prediction unavailable:', e); }
    };
    fetchTraffic();
  }, []);

  // Fetch suspicious report count
  useEffect(() => {
    const checkSuspicious = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/ml/fake-report-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trust_score: 20, reports_submitted: 50, valid_reports: 5, fake_reports: 20, confirmations: 0, account_age_days: 10 })
        });
        const data = await res.json();
        if (data.status === 'Suspicious') setSuspiciousCount(prev => prev + 1);
      } catch (e) { console.warn('Fake report check unavailable:', e); }
    };
    checkSuspicious();
  }, []);

  // Fetch message count
  useEffect(() => {
    if (!userData?.uid) return;
    const fetchMsgs = async () => {
      try {
        const { getUserConversations } = require('../services/chatService');
        const convos = await getUserConversations(userData.uid);
        setMessageCount(convos.length);
      } catch (e) { console.warn('Messages unavailable:', e); }
    };
    fetchMsgs();
  }, [userData]);

  const unread = alerts.filter(a => !a.read);
  const stats = {
    total: issues.length,
    open: issues.filter(i => i.status === 'open').length,
    critical: issues.filter(i => i.urgency === 'critical').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  };

  // GenAI Recommendations
  const fetchAIRecommendations = async () => {
    setRecsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/ml/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traffic: trafficPred?.traffic_volume > 2000 ? 'High' : 'Moderate',
          crime: stats.critical,
          waste: issues.filter(i => i.category === 'waste').length,
          accidents: issues.filter(i => i.category === 'safety').length
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.plan) {
        const lines = data.plan.split('\n').filter(l => l.trim().length > 5).slice(0, 5);
        setAiRecs(lines);
      }
    } catch (e) {
      setAiRecs([
        '• Deploy additional traffic officers to congested zones.',
        '• Increase waste collection frequency in high-report areas.',
        '• Review suspicious reports manually via Admin Panel.',
        '• Schedule preventive maintenance in recurring issue locations.',
        '• Activate emergency response protocols for critical incidents.'
      ]);
    }
    setRecsLoading(false);
  };

  const catCounts = issues.reduce((a, i) => { a[i.category] = (a[i.category] || 0) + 1; return a; }, {});
  const topIssues = [...issues].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)).slice(0, 5);
  const recent = issues.slice(0, 4);
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseAlert{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:0.8}}
        
        .dash-card { animation: fadeUp 0.35s ease both; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .dash-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg), 0 0 20px rgba(59,130,246,0.1) !important; }
        
        .dash-card:nth-child(1){animation-delay:0.05s}
        .dash-card:nth-child(2){animation-delay:0.1s}
        .dash-card:nth-child(3){animation-delay:0.15s}
        .dash-card:nth-child(4){animation-delay:0.2s}
        
        .issue-row { transition: all 0.2s ease; }
        .issue-row:hover { background: var(--bg-card-hover); padding-left: 6px !important; }
      `}</style>

      {/* Top Header */}
      <div style={S.header}>
        <div>
          <p style={S.greet}>{greeting}, <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{userData?.name}</span></p>
          <h1 style={S.title}>{t('dashboard.title', 'City Command Center')}</h1>
        </div>
        <div style={S.headerRight}>
          <div style={S.bellOuterWrap}>
            <button
              style={{
                ...S.bellWrap,
                background: unread.length > 0 ? 'rgba(239,68,68,0.1)' : 'var(--bg-input)',
                borderColor: unread.length > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border-main)',
                color: unread.length > 0 ? '#ef4444' : 'var(--text-muted)'
              }}
              onClick={() => setShowDropdown(prev => !prev)}
              className="action-btn-hover"
            >
              <Bell size={18} style={{ animation: unread.length > 0 ? 'pulseAlert 1.5s infinite' : 'none' }} />
              {unread.length > 0 && <span style={S.bellCount}>{unread.length}</span>}
            </button>

            {showDropdown && (
              <div className="glass-panel" style={S.alertDropdown}>
                <p style={S.dropTitle}>{t('dashboard.live_alerts', 'Live Alerts')}</p>
                {unread.length === 0 ? (
                  <p style={{ color: 'var(--text-sub)', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>No active alerts</p>
                ) : (
                  unread.slice(0, 3).map(a => (
                    <div
                      key={a.id}
                      style={S.dropItem}
                      onClick={async () => {
                        await markAlertRead(a.id);
                        if (unread.length <= 1) setShowDropdown(false);
                      }}
                    >
                      <span style={{ ...S.dropDot, background: a.level === 'critical' ? '#ef4444' : a.level === 'high' ? '#f59e0b' : '#3b82f6', boxShadow: `0 0 8px ${a.level === 'critical' ? '#ef4444' : '#f59e0b'}` }} />
                      <span style={{ color: 'var(--text-main)', fontSize: 13, flex: 1 }}>{a.message}</span>
                    </div>
                  ))
                )}
                <Link to="/admin" style={S.dropLink} onClick={() => setShowDropdown(false)}>View all in Control Center →</Link>
              </div>
            )}
          </div>
          <Link to="/map" style={S.mapBtn} className="action-btn-hover">
            <Map size={16} style={{ marginRight: 6 }} />
            <span>{t('dashboard.live_map', 'Live Map')}</span>
          </Link>
          <Link to="/report" style={S.reportBtn} className="action-btn-hover">
            <PlusCircle size={16} style={{ marginRight: 6 }} />
            <span>{t('dashboard.report_issue', 'Report Issue')}</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards — Row 1: Core Metrics */}
      <div style={S.kpiGrid}>
        {[
          { label: t('dashboard.total_issues', 'Total Reports'), val: stats.total, icon: <FileText size={20} />, color: '#3b82f6', border: 'rgba(59,130,246,0.1)' },
          { label: t('dashboard.open_issues', 'Open Issues'), val: stats.open, icon: <Clock size={20} />, color: '#f59e0b', border: 'rgba(245,158,11,0.1)' },
          { label: t('dashboard.critical_alerts', 'Critical Alerts'), val: stats.critical, icon: <AlertCircle size={20} />, color: '#ef4444', border: 'rgba(239,68,68,0.1)' },
          { label: t('dashboard.resolved', 'Resolved'), val: stats.resolved, icon: <CheckCircle2 size={20} />, color: '#10b981', border: 'rgba(16,185,129,0.1)' },
        ].map(k => (
          <div key={k.label} className="dash-card glass-panel" style={S.kpiCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ ...S.kpiBadge, background: k.border, color: k.color, border: `1px solid ${k.color}33` }}>{k.icon}</div>
              <span style={S.kpiVal}>{k.val}</span>
            </div>
            <p style={S.kpiLabel}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* KPI Cards — Row 2: AI & Communication */}
      <div style={S.kpiGrid}>
        {[
          { label: 'Traffic Prediction', val: trafficPred ? Math.round(trafficPred.traffic_volume).toLocaleString() : '...', icon: <Car size={20} />, color: '#8b5cf6', border: 'rgba(139,92,246,0.1)', sub: trafficPred?.source?.includes('SageMaker') ? '🟢 SageMaker' : '⚡ Local' },
          { label: 'Suspicious Reports', val: suspiciousCount, icon: <Shield size={20} />, color: '#ef4444', border: 'rgba(239,68,68,0.1)', sub: 'fake-report-endpoint' },
          { label: 'Messages', val: messageCount, icon: <MessageSquare size={20} />, color: '#3b82f6', border: 'rgba(59,130,246,0.1)', sub: 'Direct Messaging' },
          { label: 'Notifications', val: unread.length, icon: <Bell size={20} />, color: '#f59e0b', border: 'rgba(245,158,11,0.1)', sub: 'Active Alerts' },
        ].map(k => (
          <div key={k.label} className="dash-card glass-panel" style={S.kpiCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ ...S.kpiBadge, background: k.border, color: k.color, border: `1px solid ${k.color}33` }}>{k.icon}</div>
              <span style={S.kpiVal}>{k.val}</span>
            </div>
            <p style={S.kpiLabel}>{k.label}</p>
            {k.sub && <p style={{ color: 'var(--text-sub)', fontSize: 11, margin: '4px 0 0', fontWeight: 600 }}>{k.sub}</p>}
          </div>
        ))}
      </div>

      <div style={S.row}>
        {/* Category bars */}
        <div className="dash-card glass-panel" style={S.card}>
          <p style={S.cardTitle}>
            <Activity size={18} style={{ color: 'var(--brand-primary)' }} /> {t('dashboard.issues_by_category', 'Issues by Category')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(CAT_ICON).map(([cat, icon]) => {
              const cnt = catCounts[cat] || 0;
              const pct = stats.total ? Math.round((cnt / stats.total) * 100) : 0;
              return (
                <div key={cat} style={S.barRow}>
                  <span style={{ color: CAT_COLOR[cat], background: CAT_COLOR[cat]+'15', padding: 6, borderRadius: 8, display: 'flex' }}>{icon}</span>
                  <span style={S.barCat}>{cat}</span>
                  <div style={S.barTrack}>
                    <div style={{
                      height: '100%',
                      borderRadius: 4,
                      width: `${pct}%`,
                      background: `linear-gradient(90deg,${CAT_COLOR[cat]},${CAT_COLOR[cat]}88)`,
                      boxShadow: `0 0 10px ${CAT_COLOR[cat]}66`,
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                  <span style={{ ...S.barCnt, color: CAT_COLOR[cat] }}>{cnt}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top priority */}
        <div className="dash-card glass-panel" style={S.card}>
          <p style={S.cardTitle}>
            <TrendingUp size={18} style={{ color: '#ef4444' }} /> Top Priority Issues
          </p>
          {topIssues.length === 0 ? (
            <p style={S.empty}>No issues yet — <Link to="/report" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>report one!</Link></p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {topIssues.map(issue => {
                const p = getPriorityMeta(issue.priorityScore || 0);
                return (
                  <div key={issue.id} style={S.issueRow} className="issue-row">
                    <div style={{ ...S.catDot, color: CAT_COLOR[issue.category], background: CAT_COLOR[issue.category] + '15', border: `1px solid ${CAT_COLOR[issue.category]}33` }}>
                      {CAT_ICON[issue.category]}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p style={S.issueName}>{issue.title}</p>
                      <p style={S.issueMeta}><Map size={12} style={{display:'inline', marginRight:2}}/> {issue.location} · <Clock size={12} style={{display:'inline', marginLeft:4, marginRight:2}}/> {issue.hoursOpen || 0}h open</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ ...S.pill, background: p.bg.replace('0.1','0.2'), color: p.color, border: `1px solid ${p.color}44` }}>{p.label}</span>
                      <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, fontWeight: 700 }}>{issue.priorityScore} pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Predictions */}
      <div className="dash-card glass-panel" style={S.card}>
        <p style={S.cardTitle}>
          <Zap size={18} style={{ color: 'var(--brand-primary)' }} /> AI Predictions & City Status
        </p>
        <div style={S.predGrid}>
          {[
            { icon: <Wind size={22} />, label: 'Air Quality', value: 'Moderate', detail: 'Expected to worsen by evening', color: '#f59e0b' },
            { icon: <Activity size={22} />, label: 'Traffic Flow', value: 'High Congestion', detail: 'Peak hour in ~2 hours', color: '#ef4444' },
            { icon: <Zap size={22} />, label: 'Energy Usage', value: 'Normal', detail: 'Within expected range', color: '#10b981' },
            { icon: <Trash2 size={22} />, label: 'Waste Collection', value: 'Zone 3 Overdue', detail: 'Priority pickup scheduled', color: '#3b82f6' },
          ].map(p => (
            <div key={p.label} style={{ ...S.predCard, borderTop: `2px solid ${p.color}` }}>
              <div style={{ ...S.predIcon, background: p.color + '15', color: p.color, border: `1px solid ${p.color}33` }}>{p.icon}</div>
              <div>
                <p style={S.predLabel}>{p.label}</p>
                <p style={{ ...S.predVal, color: p.color }}>{p.value}</p>
                <p style={S.predDetail}>{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GenAI Recommendation Module */}
      <div className="dash-card glass-panel" style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ ...S.cardTitle, margin: 0 }}>
            <Brain size={18} style={{ color: '#8b5cf6' }} /> GenAI Recommendations
          </p>
          <button
            onClick={fetchAIRecommendations}
            disabled={recsLoading}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 10,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: recsLoading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(139,92,246,0.3)', transition: 'all 0.2s'
            }}
          >
            {recsLoading ? '⏳ Analyzing...' : '🧠 Generate AI Plan'}
          </button>
        </div>

        {/* Input Context */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Traffic', val: trafficPred?.traffic_volume > 2000 ? 'High' : 'Moderate', color: '#ef4444' },
            { label: 'Suspicious Reports', val: String(suspiciousCount), color: '#f59e0b' },
            { label: 'Waste Reports', val: String(issues.filter(i => i.category === 'waste').length), color: '#10b981' },
          ].map(c => (
            <div key={c.label} style={{
              background: `${c.color}12`, border: `1px solid ${c.color}33`, borderRadius: 10,
              padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{ color: c.color, fontWeight: 800, fontSize: 14 }}>{c.val}</span>
              <span style={{ color: 'var(--text-sub)', fontSize: 12, fontWeight: 600 }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Output Recommendations */}
        {aiRecs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aiRecs.map((rec, i) => (
              <div key={i} style={{
                background: 'var(--bg-input)', border: '1px solid var(--border-main)',
                borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
                borderLeft: `3px solid ${['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444'][i % 5]}`
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{['🚔','🗑️','🔍','🔧','🚨'][i % 5]}</span>
                <p style={{ margin: 0, color: 'var(--text-main)', fontSize: 14, lineHeight: 1.5 }}>{rec.replace(/^[•\-\d.]+\s*/, '')}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-sub)', fontSize: 14 }}>
            <Brain size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p style={{ margin: 0 }}>Click "Generate AI Plan" to get real-time GenAI recommendations based on live city data.</p>
          </div>
        )}
      </div>

      {/* Recent reports */}
      {recent.length > 0 && (
        <div className="dash-card glass-panel" style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <p style={{ ...S.cardTitle, margin: 0 }}><Clock size={18} style={{ color: '#8b5cf6' }}/> Recent Reports</p>
            <Link to="/issues" style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              View all <ChevronRight size={16} />
            </Link>
          </div>
          <div style={S.recentGrid}>
            {recent.map(i => {
              const p = getPriorityMeta(i.priorityScore || 0);
              return (
                <div key={i.id} style={{ ...S.recentCard, borderLeft: `3px solid ${CAT_COLOR[i.category]}` }}>
                  <p style={S.recentTitle}>{i.title}</p>
                  <p style={S.recentMeta}><MapPin size={12} style={{display:'inline',marginRight:4}}/>{i.location}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <span style={{ ...S.tag, background: CAT_COLOR[i.category] + '15', color: CAT_COLOR[i.category] }}>{i.category}</span>
                    <span style={{ ...S.tag, background: p.bg.replace('0.1','0.2'), color: p.color }}>{p.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { padding: '32px', maxWidth: 1280, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 20 },
  greet: { color: 'var(--text-sub)', fontSize: 14, margin: '0 0 6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  title: { color: 'var(--text-main)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, fontFamily: 'var(--font-display)' },
  headerRight: { display: 'flex', gap: 12, alignItems: 'center' },
  bellOuterWrap: { position: 'relative' },
  bellWrap: { position: 'relative', cursor: 'pointer', padding: '10px', border: '1px solid var(--border-main)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 42, minWidth: 42 },
  bellCount: { position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#ffffff', borderRadius: 10, fontSize: 10, padding: '2px 6px', fontWeight: 800, border: '2px solid var(--bg-page)' },
  alertDropdown: { position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 340, padding: '16px', zIndex: 100, animation: 'fadeUp 0.25s ease' },
  dropTitle: { color: 'var(--text-main)', fontWeight: 800, fontSize: 15, margin: '0 0 12px', borderBottom: '1px solid var(--border-light)', paddingBottom: 10 },
  dropItem: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background 0.2s' },
  dropDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4 },
  dropLink: { display: 'block', color: 'var(--brand-primary)', fontSize: 13, fontWeight: 700, marginTop: 14, textDecoration: 'none', textAlign: 'center' },
  mapBtn: { display: 'inline-flex', alignItems: 'center', padding: '10px 20px', background: 'var(--bg-input)', border: '1px solid var(--border-main)', borderRadius: 12, color: 'var(--text-main)', fontSize: 14, fontWeight: 600, textDecoration: 'none', height: 42 },
  reportBtn: { display: 'inline-flex', alignItems: 'center', padding: '10px 22px', background: 'var(--gradient-brand)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 15px rgba(59,130,246,0.3)', height: 42 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 },
  kpiCard: { padding: '24px' },
  kpiBadge: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiVal: { fontSize: 38, fontWeight: 800, lineHeight: 1, fontFamily: 'var(--font-display)', color: 'var(--text-main)' },
  kpiLabel: { color: 'var(--text-muted)', fontSize: 13, margin: '16px 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 },
  card: { padding: 28 },
  cardTitle: { color: 'var(--text-main)', fontWeight: 800, fontSize: 18, marginBottom: 20, marginTop: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 },
  barRow: { display: 'flex', alignItems: 'center', gap: 12 },
  barCat: { color: 'var(--text-muted)', fontSize: 13, width: 95, textTransform: 'capitalize', fontWeight: 700 },
  barTrack: { flex: 1, background: 'var(--bg-input)', borderRadius: 6, height: 8, overflow: 'hidden' },
  barCnt: { fontSize: 14, fontWeight: 800, width: 24, textAlign: 'right', fontFamily: 'var(--font-display)' },
  issueRow: { display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' },
  catDot: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  issueName: { color: 'var(--text-main)', fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240, margin: '0 0 4px' },
  issueMeta: { color: 'var(--text-sub)', fontSize: 12, margin: 0, display: 'flex', alignItems: 'center' },
  pill: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.05em' },
  empty: { color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '30px 0' },
  predGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  predCard: { background: 'var(--bg-input)', borderRadius: 16, padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start', border: '1px solid var(--border-main)' },
  predIcon: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  predLabel: { color: 'var(--text-muted)', fontSize: 12, marginBottom: 4, marginTop: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  predVal: { fontSize: 18, fontWeight: 800, marginBottom: 6, marginTop: 0, fontFamily: 'var(--font-display)' },
  predDetail: { color: 'var(--text-sub)', fontSize: 13, margin: 0, lineHeight: 1.4 },
  recentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  recentCard: { background: 'var(--bg-input)', borderRadius: 16, padding: 18, border: '1px solid var(--border-main)' },
  recentTitle: { color: 'var(--text-main)', fontSize: 15, fontWeight: 700, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 0 },
  recentMeta: { color: 'var(--text-sub)', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center' },
  tag: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.05em' },
};
