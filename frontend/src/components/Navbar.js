import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { logout, fetchCurrentUser } from '../services/authService';
import { useTheme } from '../utils/ThemeContext';
import { subscribeToChats, getTotalUnread } from '../services/chatService';
import { 
  LayoutDashboard, Map, PlusCircle, List, Users, MessageSquare, 
  ShieldAlert, Trash2, Award, Lightbulb, LineChart, BrainCircuit, 
  UserCircle, Settings, LogOut, ChevronLeft, ChevronRight,
  Utensils, Sun, Moon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar({ userData, collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUserAndSubscribe = async () => {
      try {
        const currentUser = await fetchCurrentUser();
        if (!currentUser) return;
        return subscribeToChats(currentUser.uid, (chats) => {
          setUnreadCount(getTotalUnread(chats, currentUser.uid));
        });
      } catch (err) {
        // Not logged in
      }
    };
    fetchUserAndSubscribe();
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { to:'/',            label:t('nav.dashboard', 'Dashboard'),   icon:<LayoutDashboard size={19}/>, desc:'City overview' },
        { to:'/map',         label:'Live Map',     icon:<Map size={19}/>, desc:'Real-time map' },
      ]
    },
    {
      label: 'Reports',
      items: [
        { to:'/report',      label:'Report Issue', icon:<PlusCircle size={19}/>, desc:'Submit a report' },
        { to:'/issues',      label:'All Issues',   icon:<List size={19}/>, desc:'Browse reports' },
      ]
    },
    {
      label: 'Community',
      items: [
        { to:'/people',      label:'People',       icon:<Users size={19}/>, desc:'Search & connect' },
        { to:'/messages',    label:'Messages',     icon:<MessageSquare size={19}/>, desc:'Direct messages', badge: unreadCount },
        { to:'/community',   label:'Community',    icon:<Award size={19}/>, desc:'Trust & Leaderboards' },
        { to:'/suggestions', label:'Suggestions',  icon:<Lightbulb size={19}/>, desc:'Community ideas' },
      ]
    },
    {
      label: 'Services',
      items: [
        { to:'/safety',      label:'Public Safety',icon:<ShieldAlert size={19}/>, desc:'Emergency & Police' },
        { to:'/waste',       label:'Waste Mgmt',   icon:<Trash2 size={19}/>, desc:'Clean city tracking' },
        { to:'/food-rescue', label:'Food Rescue',  icon:<Utensils size={19}/>, desc:'Donate & rescue food' },
      ]
    },
    {
      label: 'Insights',
      items: [
        { to:'/analytics',   label:'Analytics',    icon:<LineChart size={19}/>, desc:'Data insights' },
        { to:'/ai-hub',      label:'AWS Gemini AI', icon:<BrainCircuit size={19}/>, desc:'AI Analytics' },
        { to:'/traffic',     label:'Traffic AI',   icon:<BrainCircuit size={19}/>, desc:'Traffic Predictor' },
        ...(userData?.role==='admin'?[{ to:'/security',    label:'Security AI',  icon:<ShieldAlert size={19}/>, desc:'Trust & Fake Detection' }]:[]),
      ]
    },
    {
      label: 'Account',
      items: [
        { to:'/profile',     label:'Profile',      icon:<UserCircle size={19}/>, desc:'My account' },
        ...(userData?.role==='admin'?[{to:'/admin',label:'Admin Panel',icon:<Settings size={19}/>,desc:'Control center'}]:[]),
      ]
    },
  ];

  const roleColor = { admin:'#f59e0b', official:'#2563eb', citizen:'#10b981' };
  const rc = roleColor[userData?.role] || 'var(--text-sub)';
  const activeColor = '#2563eb';

  return (
    <div style={{ ...S.sidebar, width: collapsed ? 70 : 240 }}>
      <style>{`
        .nav-link { position: relative; }
        .nav-link:hover { background: var(--bg-card-hover) !important; }
        .nav-link:hover .nav-icon { color: var(--text-muted) !important; }
        .nav-link::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); width:3px; height:0; background:var(--brand-primary); border-radius:0 4px 4px 0; transition:height 0.2s ease; }
        .nav-link:hover::before { height: 20px; }
        .nav-link-active::before { height: 28px !important; }
        .toggle-btn:hover { background: var(--bg-card-hover) !important; }
        .logout-btn:hover { color: var(--danger-text) !important; background: var(--danger-bg) !important; }
        .theme-btn:hover { background: var(--bg-card-hover) !important; }
      `}</style>

      {/* Logo */}
      <div style={{ ...S.logoRow, borderBottom: '1px solid var(--border-light)' }}>
        {!collapsed && (
          <div style={S.logoWrap}>
            <div style={S.logoOrb}>
              <span style={{ fontSize: 18, filter: 'drop-shadow(0 2px 4px rgba(37,99,235,0.3))' }}>🏙️</span>
            </div>
            <div>
              <p style={{ ...S.logoText, color: 'var(--text-main)' }}>SmartCity</p>
              <p style={{ ...S.logoSub, color: 'var(--text-sub)' }}>Urban AI Platform</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ ...S.logoOrb, margin: '0 auto' }}>
            <span style={{ fontSize: 16 }}>🏙️</span>
          </div>
        )}
        <button className="toggle-btn" onClick={onToggle} style={{
          ...S.toggleBtn,
          display: collapsed ? 'none' : 'flex',
          background: 'transparent',
          border: '1px solid var(--border-light)',
          color: 'var(--text-sub)',
        }}>
          {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
        </button>
      </div>

      {/* User Card */}
      <div style={{ ...S.userWrap, padding: collapsed?'14px 0':'14px 16px', justifyContent: collapsed?'center':'flex-start' }}>
        <div style={{ ...S.avatar, background: userData?.photoURL ? 'transparent' : `linear-gradient(135deg,${rc},${rc}88)`, border: 'none', overflow: 'hidden' }}>
          {userData?.photoURL ? (
            <img src={userData.photoURL} alt={userData?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ color:'#fff', fontWeight:800, fontSize:13 }}>{userData?.name?.[0]?.toUpperCase()||'U'}</span>
          )}
        </div>
        {!collapsed && (
          <div style={{ overflow:'hidden' }}>
            <p style={{ ...S.userName, color: 'var(--text-main)' }}>{userData?.name}</p>
            <span style={{ ...S.roleBadge, background:`${rc}18`, color:rc, border:`1px solid ${rc}30` }}>{userData?.role}</span>
          </div>
        )}
      </div>

      {/* Nav links — grouped */}
      <nav style={S.nav}>
        {navGroups.map((group, gi) => (
          <div key={group.label}>
            {!collapsed && (
              <p style={S.navLabel}>{group.label}</p>
            )}
            {collapsed && gi > 0 && (
              <div style={{ height: 1, background: 'var(--border-light)', margin: '6px 14px' }} />
            )}
            {group.items.map(l => {
              const active = location.pathname === l.to;
              return (
                <Link key={l.to} to={l.to} className={`nav-link ${active ? 'nav-link-active' : ''}`} title={collapsed?l.label:''} style={{
                  ...S.link,
                  background: active ? 'linear-gradient(90deg, rgba(59,130,246,0.1), transparent)' : 'transparent',
                  color: active ? 'var(--brand-primary)' : 'var(--text-muted)',
                  justifyContent: collapsed?'center':'flex-start',
                  paddingLeft: collapsed?0:16,
                  borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
                  boxShadow: active ? 'inset 10px 0 20px -10px rgba(59,130,246,0.2)' : 'none'
                }}>
                  <span className="nav-icon" style={{ ...S.linkIcon, color: active?'#3b82f6':'var(--text-sub)' }}>{l.icon}</span>
                  {!collapsed && (
                    <div style={{flex:1}}>
                      <p style={{ margin:0, fontSize:13, fontWeight:active?700:500, color: active?'var(--brand-primary)':'var(--text-muted)' }}>{l.label}</p>
                    </div>
                  )}
                  {l.badge > 0 && <span style={S.navBadge}>{l.badge > 9 ? '9+' : l.badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom — theme toggle + expand + logout */}
      <div style={S.bottom}>
        <div style={{ height:1, background:'var(--border-light)' }}/>

        {/* Dark mode toggle */}
        <button className="theme-btn" onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'} style={{
          ...S.themeBtn,
          justifyContent: collapsed?'center':'flex-start',
          paddingLeft: collapsed?0:16,
        }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            {dark ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#64748b" />}
          </span>
          {!collapsed && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{dark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>

        {/* Expand/collapse for collapsed state */}
        {collapsed && (
          <button className="toggle-btn" onClick={onToggle} style={{
            ...S.themeBtn, justifyContent: 'center',
            color: 'var(--text-sub)',
          }}>
            <ChevronRight size={16}/>
          </button>
        )}

        {!collapsed && (
          <div style={S.versionTag}>
            <span style={{ color:'#10b981', fontSize:10, display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', display:'inline-block' }}/>
              LIVE
            </span>
            <span style={{ color: 'var(--text-sub)', fontSize:10 }}>v2.1 · Firebase</span>
          </div>
        )}

        <div style={{ padding: collapsed ? '10px 0' : '10px 16px', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <LanguageSwitcher />
        </div>

        <button className="logout-btn" onClick={handleLogout} title={collapsed?t('nav.sign_out', 'Logout'):''} style={{
          ...S.logoutBtn,
          justifyContent: collapsed?'center':'flex-start',
          paddingLeft: collapsed?0:16,
          color: 'var(--text-sub)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center' }}><LogOut size={18}/></span>
          {!collapsed && <span>{t('nav.sign_out', 'Logout')}</span>}
        </button>
      </div>
    </div>
  );
}

const S = {
  sidebar:   { height:'100vh', display:'flex', flexDirection:'column', position:'fixed', left:0, top:0, zIndex:300, transition:'width 0.25s cubic-bezier(0.4,0,0.2,1)', overflow:'hidden', background:'var(--bg-card)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRight:'1px solid var(--border-main)', boxShadow:'10px 0 30px var(--shadow-md)' },
  logoRow:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 16px', minHeight:68 },
  logoWrap:  { display:'flex', alignItems:'center', gap:12 },
  logoOrb:   { width:38, height:38, borderRadius:12, background:'var(--gradient-brand, linear-gradient(135deg,#2563eb,#7c3aed))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 4px 12px rgba(37,99,235,0.25)' },
  logoText:  { fontWeight:800, fontSize:15, margin:0, letterSpacing:'-0.02em', fontFamily:"'Outfit','Inter',sans-serif" },
  logoSub:   { fontSize:10, margin:0, fontWeight:500 },
  toggleBtn: { borderRadius:8, width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'all 0.2s' },
  userWrap:  { display:'flex', alignItems:'center', gap:10, overflow:'hidden', borderBottom:'1px solid var(--border-light)' },
  avatar:    { width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  userName:  { fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:130, margin:0 },
  roleBadge: { fontSize:10, padding:'2px 8px', borderRadius:6, textTransform:'capitalize', display:'inline-block', marginTop:3, fontWeight:600 },
  nav:       { flex:1, padding:'4px 0', display:'flex', flexDirection:'column', overflowY:'auto', overflowX:'hidden' },
  navLabel:  { fontSize:10, fontWeight:700, letterSpacing:'0.08em', padding:'14px 16px 6px', textTransform:'uppercase', color:'var(--text-sub)' },
  link:      { display:'flex', alignItems:'center', gap:10, padding:'9px 16px', textDecoration:'none', transition:'all 0.15s', whiteSpace:'nowrap', height:42, position:'relative', borderRadius:0, margin:'1px 0' },
  linkIcon:  { flexShrink:0, width:20, display:'flex', alignItems:'center', justifyContent:'center', transition:'color 0.15s' },
  bottom:    { flexShrink:0 },
  themeBtn:  { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 16px', background:'transparent', border:'none', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all 0.2s', height:42 },
  versionTag:{ display:'flex', justifyContent:'space-between', padding:'6px 16px', alignItems:'center' },
  logoutBtn: { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 16px', background:'transparent', border:'none', fontSize:13, fontWeight:500, cursor:'pointer', transition:'all 0.2s', height:44 },
  navBadge:  { background:'#ef4444', color:'#fff', borderRadius:10, fontSize:10, fontWeight:700, padding:'1px 6px', minWidth:18, textAlign:'center', flexShrink:0 },
};
