import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUserData, subscribeToUserData } from './services/authService';
import { subscribeToAlerts, markAlertRead } from './services/issueService';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ThemeProvider, useTheme } from './utils/ThemeContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import ReportIssue from './pages/ReportIssue';
import IssueList from './pages/IssueList';
import AdminPanel from './pages/AdminPanel';
import MapPage from './pages/MapPage';
import SuggestionsPage from './pages/SuggestionsPage';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import GeminiPage from './pages/GeminiPage';
import SearchUsersPage from './pages/SearchUsersPage';
import MessagesPage from './pages/MessagesPage';
import PublicSafetyPage from './pages/PublicSafetyPage';
import WasteManagementPage from './pages/WasteManagementPage';
import CommunityPage from './pages/CommunityPage';
import SecurityDashboard from './pages/SecurityDashboard';
import FoodRescueHub from './pages/FoodRescueHub';
import TrafficPrediction from './pages/TrafficPrediction';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import GlobalChatbot from './components/GlobalChatbot';

// ── Toast Notification Component ─────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={TS.wrap}>
      {toasts.map(t => {
        const color = t.level==='critical'?'#ff4444':t.level==='high'?'#ff8800':'#ffcc00';
        const icon  = t.level==='critical'?'🚨':t.level==='high'?'⚠️':'🔔';
        const title = t.level==='critical'?'Critical Alert':t.level==='high'?'High Priority Alert':'Notification';
        return (
          <div key={t.toastId} style={{
            ...TS.toast,
            borderLeft: `4px solid ${color}`,
            animation: t.leaving ? 'toastOut 0.35s ease forwards' : 'toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            <div style={{...TS.glow, background:`radial-gradient(ellipse at top left, ${color}18, transparent 70%)`}}/>
            <div style={{...TS.iconWrap, background:`${color}18`, border:`1px solid ${color}30`}}>
              <span style={{fontSize:20}}>{icon}</span>
            </div>
            <div style={TS.toastBody}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                <span style={{...TS.dot, background:color, animation:'pulse 1.5s infinite'}}/>
                <p style={{...TS.toastTitle, color}}>{title}</p>
              </div>
              <p style={TS.toastMsg}>{t.message}</p>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
                <p style={TS.toastTime}>🕐 {new Date(t.createdAt).toLocaleTimeString()}</p>
                <span style={{...TS.levelTag, background:`${color}18`, color}}>{t.category}</span>
              </div>
            </div>
            <button style={TS.toastClose} onClick={() => onDismiss(t.toastId)}>✕</button>
            <div style={{...TS.progress, background:color,
              animation:`progressShrink ${t.duration||6}s linear forwards`}}/>
          </div>
        );
      })}
    </div>
  );
}

// ── Notification Permission Banner ────────────────────────────
function NotifBanner({ onAllow, onDismiss }) {
  return (
    <div style={NB.wrap}>
      <span style={{fontSize:20}}>🔔</span>
      <p style={NB.text}>Enable AWS AppSync / Amazon Pinpoint notifications for real-time alerts</p>
      <button style={NB.allow} onClick={onAllow}>Enable</button>
      <button style={NB.dismiss} onClick={onDismiss}>✕</button>
    </div>
  );
}

const TS = {
  wrap:      { position:'fixed', top:20, right:20, zIndex:99999, display:'flex', flexDirection:'column', gap:10, maxWidth:370, pointerEvents:'none' },
  toast:     { background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:14, padding:'14px 14px 20px', display:'flex', gap:12, alignItems:'flex-start', boxShadow:'0 16px 48px rgba(0,0,0,0.4)', position:'relative', overflow:'hidden', pointerEvents:'all', minWidth:320, backdropFilter:'blur(12px)' },
  glow:      { position:'absolute', inset:0, pointerEvents:'none' },
  iconWrap:  { width:42, height:42, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  dot:       { width:7, height:7, borderRadius:'50%', flexShrink:0 },
  toastBody: { flex:1, overflow:'hidden' },
  toastTitle:{ fontSize:13, fontWeight:700, margin:0, letterSpacing:'-0.01em', color:'var(--text-main)' },
  toastMsg:  { color:'var(--text-muted)', fontSize:13, margin:0, lineHeight:1.5, wordBreak:'break-word' },
  toastTime: { color:'var(--text-sub)', fontSize:11, margin:0 },
  levelTag:  { fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, textTransform:'capitalize' },
  toastClose:{ background:'transparent', border:'none', color:'var(--text-sub)', fontSize:15, cursor:'pointer', flexShrink:0, padding:'0 0 0 6px', lineHeight:1, alignSelf:'flex-start' },
  progress:  { position:'absolute', bottom:0, left:0, height:3, width:'100%', transformOrigin:'left' },
};

const NB = {
  wrap:    { position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12, zIndex:99998, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', maxWidth:500 },
  text:    { color:'var(--text-muted)', fontSize:13, flex:1, margin:0 },
  allow:   { background:'var(--brand-primary)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:600, padding:'7px 16px', cursor:'pointer', flexShrink:0 },
  dismiss: { background:'transparent', border:'none', color:'var(--text-sub)', fontSize:16, cursor:'pointer', flexShrink:0 },
};

function AppInner() {
  const { dark } = useTheme();
  const [user,             setUser]             = useState(null);
  const [userData,         setUserData]         = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts,           setToasts]           = useState([]);
  const [showBanner,       setShowBanner]       = useState(false);
  const seenAlerts = useRef(new Set());
  const isFirst    = useRef(true);
  const audioCtx   = useRef(null);

  useEffect(() => {
    let unsubUserData = null;

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (unsubUserData) unsubUserData();
        unsubUserData = subscribeToUserData(currentUser.uid, (data) => {
          setUserData(data);
          setLoading(false);
        });
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
        if (unsubUserData) {
          unsubUserData();
          unsubUserData = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubUserData) unsubUserData();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => setShowBanner(true), 3000);
    }
  }, [user]);

  const playSound = (level) => {
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = level === 'critical' ? 880 : 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch(_) {}
  };

  const sendBrowserNotif = (alert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const icon = alert.level === 'critical' ? '🚨' : '⚠️';
      new Notification(`${icon} SmartCity Alert`, {
        body: alert.message,
        icon: '/favicon.ico',
      });
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Firestore Alert Listener (existing)
    const unsub = subscribeToAlerts((alerts) => {
      if (isFirst.current) {
        alerts.forEach(a => seenAlerts.current.add(a.id));
        isFirst.current = false;
        return;
      }
      alerts.forEach(alert => {
        if (seenAlerts.current.has(alert.id) || alert.read) return;
        seenAlerts.current.add(alert.id);
        const toastId = `toast-${alert.id}-${Date.now()}`;
        const duration = alert.level === 'critical' ? 10 : 7;
        setToasts(prev => [...prev, { ...alert, toastId, duration }]);
        playSound(alert.level);
        sendBrowserNotif(alert);
        setTimeout(() => dismissToast(toastId), duration * 1000);
      });
    });

    return () => {
      unsub();
    };
  }, [user]);

  const dismissToast = (toastId) => {
    setToasts(prev => prev.map(t => t.toastId === toastId ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.toastId !== toastId)), 350);
  };

  const enableNotifications = async () => {
    setShowBanner(false);
    if ('Notification' in window) {
      await Notification.requestPermission();
      // Push notifications integration needs to be moved to AWS Pinpoint or standard web push
    }
  };

  if (loading) return (
    <div style={S.loader}>
      <div style={S.spinner}/>
      <p style={{ color: '#4488ff', marginTop: 18, fontSize: 15, fontWeight: 600 }}>Loading SmartCity...</p>
    </div>
  );

  const sideW = sidebarCollapsed ? 68 : 220;

  return (
    <BrowserRouter>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800&family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

        :root {
          /* Clean White Mode Palette */
          --bg-page: #f8fafc;
          --bg-card: rgba(255, 255, 255, 0.8);
          --bg-card-hover: rgba(255, 255, 255, 1);
          --bg-input: rgba(0, 0, 0, 0.05);
          --border-main: rgba(0, 0, 0, 0.1);
          --border-light: rgba(0, 0, 0, 0.05);
          
          /* Typography Colors */
          --text-main: #0f172a;
          --text-muted: #334155;
          --text-sub: #475569;
          
          /* Branding Gradients & Colors */
          --brand-primary: #3b82f6;
          --brand-light: rgba(59, 130, 246, 0.15);
          --danger-bg: rgba(239, 68, 68, 0.1);
          --danger-border: rgba(239, 68, 68, 0.2);
          --danger-text: #ef4444;
          
          /* Shadows & Borders */
          --shadow-sm: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
          --shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          
          /* Radii */
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 20px;
          
          /* Gradients */
          --gradient-brand: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
          --gradient-danger: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          --gradient-warning: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);

          /* Typography scale */
          --font-body: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          --font-display: 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
          --tracking-tight: -0.025em;
          --tracking-tighter: -0.04em;
        }

        /* Global Glassmorphism Utilities */
        .glass-panel {
          background: var(--bg-card);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-main);
          box-shadow: var(--shadow-lg);
          border-radius: var(--radius-xl);
        }
        
        .action-btn-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .action-btn-hover::before {
          content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; 
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); 
          transition: left 0.5s ease;
        }
        .action-btn-hover:hover::before { left: 100%; }
        .action-btn-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4); }


        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(120%) scale(0.9)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes toastOut{from{opacity:1;transform:translateX(0) scale(1)}to{opacity:0;transform:translateX(120%) scale(0.9)}}
        @keyframes progressShrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes mapPulse{0%{transform:scale(1);opacity:0.8}100%{transform:scale(2.5);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes gentlePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}

        *{box-sizing:border-box;margin:0;padding:0}

        body{
          background:var(--bg-page);
          color:var(--text-main);
          font-family: var(--font-body);
          font-size: 14.5px;
          line-height: 1.6;
          letter-spacing: -0.01em;
          transition:background 0.3s ease, color 0.3s ease;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        /* Display headings — Outfit: geometric, modern, clean */
        h1, h2, h3, h4, h5, h6 {
          font-family: var(--font-display);
          letter-spacing: var(--tracking-tight);
          line-height: 1.2;
          font-weight: 700;
          color: var(--text-main);
        }

        /* Refined heading sizes */
        h1 { font-size: 2rem;   font-weight: 800; letter-spacing: var(--tracking-tighter); }
        h2 { font-size: 1.5rem; font-weight: 700; }
        h3 { font-size: 1.2rem; font-weight: 700; }
        h4 { font-size: 1rem;   font-weight: 600; }

        /* Body — Plus Jakarta Sans: clean, humanist, readable */
        p { line-height: 1.65; color: var(--text-muted); }
        small { font-size: 0.8rem; letter-spacing: 0; }

        /* Mono — JetBrains Mono: for code, numbers, badges */
        code, pre, .mono {
          font-family: var(--font-mono);
          font-size: 0.85em;
          font-feature-settings: 'liga' 1, 'calt' 1;
        }

        /* Labels and caps */
        .label, label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-sub);
        }

        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:var(--border-main);border-radius:10px}
        ::-webkit-scrollbar-thumb:hover{background:var(--text-sub)}
        a{text-decoration:none}

        input,select,textarea{
          outline:none;
          background:var(--bg-input);
          color:var(--text-main);
          border:1px solid var(--border-main);
          border-radius:var(--radius-sm);
          font-family: var(--font-body);
          font-size: 14px;
          letter-spacing: -0.01em;
          transition:border-color 0.2s ease, box-shadow 0.2s ease;
        }
        input::placeholder, textarea::placeholder { color: var(--text-sub); font-weight: 400; }
        input:focus,select:focus,textarea:focus{
          border-color:var(--brand-primary) !important;
          box-shadow:0 0 0 3px rgba(37,99,235,0.08) !important;
        }

        button{
          cursor:pointer;
          font-family: var(--font-body);
          font-weight: 600;
          letter-spacing: -0.01em;
          transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        button:active:not(:disabled){transform:scale(0.97)}

        /* Number/stat display */
        .stat-number {
          font-family: var(--font-display);
          font-variant-numeric: tabular-nums;
          font-feature-settings: 'tnum';
        }

        .page-enter{animation:fadeUp 0.35s ease both}
      `}</style>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <GlobalChatbot />
      {showBanner && <NotifBanner onAllow={enableNotifications} onDismiss={() => setShowBanner(false)} />}

      <div style={S.app}>
        {user && <Navbar userData={userData} collapsed={sidebarCollapsed} onToggle={()=>setSidebarCollapsed(c=>!c)} />}
        <main style={{ marginLeft: user ? sideW : 0, transition:'margin-left 0.25s ease', flex:1, minHeight:'100vh' }}>
          <Routes>
            <Route path="/login"       element={!user ? <LoginPage />    : <Navigate to="/" />} />
            <Route path="/register"    element={!user ? <RegisterPage /> : <Navigate to="/" />} />
            <Route path="/"            element={user  ? <Dashboard userData={userData} />  : <LandingPage />} />
            <Route path="/report"      element={user  ? <ReportIssue userData={userData} /> : <Navigate to="/login" />} />
            <Route path="/issues"      element={user  ? <IssueList userData={userData} />   : <Navigate to="/login" />} />
            <Route path="/map"         element={user  ? <MapPage userData={userData} />      : <Navigate to="/login" />} />
            <Route path="/admin"       element={user && userData?.role==="admin" ? <AdminPanel /> : <Navigate to="/" />} />
            <Route path="/suggestions" element={user  ? <SuggestionsPage userData={userData} user={user} /> : <Navigate to="/login" />} />
            <Route path="/profile"     element={user  ? <ProfilePage userData={userData} user={user} /> : <Navigate to="/login" />} />
            <Route path="/analytics"   element={user  ? <AnalyticsPage userData={userData} /> : <Navigate to="/login" />} />
            <Route path="/ai-hub"      element={user  ? <GeminiPage userData={userData} /> : <Navigate to="/login" />} />
            <Route path="/people"      element={user  ? <SearchUsersPage userData={userData} user={user} /> : <Navigate to="/login" />} />
            <Route path="/messages"    element={user  ? <MessagesPage userData={userData} user={user} /> : <Navigate to="/login" />} />
            <Route path="/safety"      element={user  ? <PublicSafetyPage userData={userData} user={user} /> : <Navigate to="/login" />} />
            <Route path="/waste"       element={user  ? <WasteManagementPage userData={userData} user={user} /> : <Navigate to="/login" />} />
            <Route path="/community"   element={user  ? <CommunityPage userData={userData} user={user} /> : <Navigate to="/login" />} />
            <Route path="/security"    element={user && userData?.role==="admin" ? <SecurityDashboard userData={userData} /> : <Navigate to="/" />} />
            <Route path="/food-rescue" element={user  ? <FoodRescueHub userData={userData} /> : <Navigate to="/login" />} />
            <Route path="/traffic"     element={user  ? <TrafficPrediction userData={userData} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

const S = {
  app:     { display:'flex', minHeight:'100vh', background:'var(--bg-page)', transition:'background 0.3s ease' },
  loader:  { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-page)' },
  spinner: { width:44, height:44, border:'3px solid var(--border-main)', borderTop:'3px solid var(--brand-primary)', borderRadius:'50%', animation:'spin 1s linear infinite' },
};

// Trigger recompile
