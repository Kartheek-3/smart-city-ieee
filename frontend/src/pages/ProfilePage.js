import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { logout, updateProfile } from '../services/authService';
import { useNavigate, Link } from 'react-router-dom';
import { getPriorityMeta } from '../services/issueService';
import { calculateReputation, getReputationBadge, subscribeToFollowers, subscribeToFollowing, subscribeToUserActivity } from '../services/socialService';
import { 
  User, Mail, Calendar, Shield, Award, MapPin, 
  LogOut, Edit3, FileText, CheckCircle2, Clock, 
  Activity, BarChart3, AlertCircle, Eye, ChevronRight, X, Phone
} from 'lucide-react';
import { encryptText, decryptText } from '../utils/crypto';
import { getSNSSubscriptions, updateSNSSubscription } from '../services/snsService';
import { Bell, Smartphone } from 'lucide-react';
import S3Image from '../components/S3Image';

const CAT_COLOR = { traffic:'#ffcc00', pollution:'#ff8800', waste:'#00cc66', safety:'#ff4444', convenience:'#4488ff' };
const CAT_ICON  = { traffic:'🚗', pollution:'💨', waste:'🗑️', safety:'🛡️', convenience:'🏗️' };

export default function ProfilePage({ userData, user }) {
  const [myIssues, setMyIssues] = useState([]);
  const [tab, setTab] = useState('issues');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [activity, setActivity] = useState([]);
  
  const [snsSubs, setSnsSubs] = useState(null);
  const [isSnsLoading, setIsSnsLoading] = useState(false);
  
  // Profile edit state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhoto, setEditPhoto] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'issues'), orderBy('createdAt','desc'));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      setMyIssues(all.filter(i => i.userId === user.uid || i.reportedBy === userData?.name));
    });
  }, [user, userData?.name]);

  // Social subscriptions
  useEffect(() => {
    if (!user?.uid) return;
    const unsub1 = subscribeToFollowers(user.uid, setFollowers);
    const unsub2 = subscribeToFollowing(user.uid, setFollowing);
    const unsub3 = subscribeToUserActivity(user.uid, setActivity);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user]);

  useEffect(() => {
    if (tab === 'sns' && !snsSubs && !isSnsLoading) {
      setIsSnsLoading(true);
      getSNSSubscriptions().then(data => {
        setSnsSubs(data);
        setIsSnsLoading(false);
      });
    }
  }, [tab, snsSubs, isSnsLoading]);

  const handleToggleSNS = async (topicKey, protocol, currentVal) => {
    setSnsSubs(prev => ({ ...prev, [topicKey]: { ...prev[topicKey], [protocol]: !currentVal } }));
    await updateSNSSubscription(topicKey, protocol, !currentVal);
  };

  const stats = {
    total:    myIssues.length,
    open:     myIssues.filter(i=>i.status==='open').length,
    resolved: myIssues.filter(i=>i.status==='resolved').length,
    critical: myIssues.filter(i=>i.urgency==='critical').length,
    avgScore: myIssues.length ? Math.round(myIssues.reduce((s,i)=>s+(i.priorityScore||0),0)/myIssues.length) : 0,
  };

  const catBreakdown = Object.entries(CAT_ICON).map(([cat,icon]) => ({
    cat, icon, count: myIssues.filter(i=>i.category===cat).length,
  })).filter(x => x.count > 0);

  const roleColor = { admin:'#ff8800', official:'#4488ff', citizen:'#00cc66' };
  const rc = roleColor[userData?.role] || '#718096';

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleOpenEdit = () => {
    setEditName(userData?.name || '');
    setEditBio(userData?.bio || '');
    setEditPhoto(userData?.photoURL || '');
    setPhotoPreview(userData?.photoURL || '');
    setEditPhone(decryptText(userData?.phone || ''));
    setEditEmergency(decryptText(userData?.emergencyContact || ''));
    setIsEditOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 150; // 150x150 pixels is plenty for a high-quality display avatar
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Center crop & resize
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoPreview(dataUrl);

        // Upload to S3
        canvas.toBlob(async (blob) => {
          setIsSaving(true);
          const formData = new FormData();
          formData.append("file", blob, "avatar.jpg");
          formData.append("category", "users");
          
          try {
            const res = await fetch("http://localhost:5000/api/storage/upload", {
              method: "POST",
              body: formData
            });
            const data = await res.json();
            if (res.ok) {
              setEditPhoto(data.image_key);
            } else {
              alert("Avatar upload failed: " + data.error);
            }
          } catch (err) {
            console.error(err);
            alert("Avatar upload failed.");
          }
          setIsSaving(false);
        }, 'image/jpeg', 0.8);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setEditPhoto('');
    setPhotoPreview('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsSaving(true);
    try {
      const result = await updateProfile(user.uid, {
        name: editName.trim(),
        bio: editBio.trim(),
        photoURL: editPhoto,
        phone: encryptText(editPhone.trim()),
        emergencyContact: encryptText(editEmergency.trim())
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      setIsEditOpen(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const rep = calculateReputation(userData, stats.total, stats.resolved);
  const badge = getReputationBadge(rep);

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes scaleUp{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        .profile-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .profile-card:hover { transform: translateY(-3px); box-shadow: 0 16px 36px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.02) !important; }
        .stat-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.04) !important; }
        .tab-btn { transition: all 0.2s ease; }
        .tab-btn:hover:not(.active) { background: rgba(0,0,0,0.03) !important; color: var(--text-main) !important; }
        .issue-row { transition: all 0.2s ease; }
        .issue-row:hover { transform: translateX(3px); background: var(--bg-card-hover) !important; border-color: var(--border-main) !important; }
        .action-btn { transition: all 0.2s ease; }
        .action-btn:hover { filter: brightness(0.96); transform: translateY(-1px); }
        .action-btn:active { transform: translateY(0); }
        .form-input:focus { border-color: var(--brand-primary) !important; box-shadow: 0 0 0 3px var(--brand-light) !important; }
      `}</style>

      {/* Profile Hero */}
      <div style={S.hero} className="profile-card glass-panel">
        <div style={{ ...S.heroBanner, background: `linear-gradient(135deg, ${rc}df, ${rc}99), radial-gradient(circle at top right, rgba(255,255,255,0.15), transparent 70%)` }} />
        
        <div style={S.heroDetails}>
          <div style={S.avatarWrapper}>
            <div style={{...S.avatar, background: userData?.photoURL ? 'transparent' : `linear-gradient(135deg,${rc}22,${rc}44)`, border:`4px solid var(--bg-card)`, overflow: 'hidden'}}>
              {userData?.photoURL ? (
                <S3Image imageKey={userData.photoURL} alt={userData?.name} style={{width:'100%', height:'100%', objectFit:'cover'}} />
              ) : (
                <span style={{color:rc, fontSize:40, fontWeight:800}}>{userData?.name?.[0]?.toUpperCase()||'U'}</span>
              )}
            </div>
            
            <div style={S.heroActions}>
              <button style={S.editBtn} className="action-btn" onClick={handleOpenEdit}>
                <Edit3 size={15} /> Edit Profile
              </button>
              <button style={S.logoutBtn} className="action-btn" onClick={handleLogout}>
                <LogOut size={15} /> Logout
              </button>
            </div>
          </div>

          <div style={S.heroMeta}>
            <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
              <h1 style={S.heroName}>{userData?.name}</h1>
              <span style={{...S.repBadge, background:`${badge.color}14`, color:badge.color, border:`1px solid ${badge.color}25`}}>
                {badge.icon} {badge.label} ({rep})
              </span>
              <span style={{...S.roleBadge, background:`${rc}14`, color:rc, border:`1px solid ${rc}25`}}>
                {userData?.role === 'admin' ? <Shield size={13} style={{marginRight:4}} /> : userData?.role === 'official' ? '🏛️ ' : '👤 '}
                {userData?.role}
              </span>
            </div>
            
            <p style={S.heroEmail}>
              <Mail size={14} style={{opacity:0.7}} /> {userData?.email || user?.email}
            </p>
            
            <p style={{
              ...S.heroBio, 
              color: userData?.bio ? 'var(--text-main)' : 'var(--text-muted)',
              fontStyle: userData?.bio ? 'normal' : 'italic'
            }}>
              {userData?.bio || "No biography written yet. Click 'Edit Profile' to introduce yourself."}
            </p>

            <div style={S.metaTagsRow}>
              <span style={S.metaTag}>
                <Calendar size={13} style={{opacity:0.7}} /> Joined {new Date(userData?.createdAt||Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <Link to="/people" style={S.socialTag}>
                👥 <strong>{followers.length}</strong> followers · <strong>{following.length}</strong> following
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={S.statsGrid}>
        {[
          { label:'Issues Reported', val:stats.total,    icon:<FileText size={20}/>, color:'var(--brand-primary)' },
          { label:'Resolved',        val:stats.resolved, icon:<CheckCircle2 size={20}/>, color:'#10b981' },
          { label:'Open',            val:stats.open,     icon:<Clock size={20}/>, color:'#f59e0b' },
          { label:'Critical',        val:stats.critical, icon:<AlertCircle size={20}/>, color:'#ef4444' },
          { label:'Avg Priority',    val:stats.avgScore, icon:<Award size={20}/>, color:'#8b5cf6' },
        ].map(k => (
          <div key={k.label} style={S.statCard} className="stat-card glass-panel">
            <div style={{ ...S.statLine, background: k.color }} />
            <div style={{...S.statIconWrap, background:`${k.color}12`, color: k.color}}>
              {k.icon}
            </div>
            <span style={{...S.statVal, color:'var(--text-main)'}}>{k.val}</span>
            <span style={S.statLabel}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs Menu */}
      <div style={S.tabs}>
        {[
          { id: 'issues', label: 'My Issues', icon: <FileText size={15} /> },
          { id: 'breakdown', label: 'Category Breakdown', icon: <BarChart3 size={15} /> },
          { id: 'activity', label: 'Activity', icon: <Activity size={15} /> },
          { id: 'sns', label: 'Alert Settings', icon: <Bell size={15} /> },
          { id: 'account', label: 'Account Info', icon: <User size={15} /> }
        ].map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id)} 
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            style={{
              ...S.tab,
              background: tab === t.id ? 'var(--bg-card)' : 'transparent',
              color: tab === t.id ? 'var(--brand-primary)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              fontWeight: tab === t.id ? '700' : '500'
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Dynamic Tab Card */}
      <div style={S.card} className="glass-panel">
        {/* My Issues Content */}
        {tab === 'issues' && (
          <div style={{animation: 'fadeUp 0.3s ease-out'}}>
            <p style={S.cardTitle}>
              <FileText size={18} style={{color: 'var(--brand-primary)'}} /> My Reported Issues ({myIssues.length})
            </p>
            
            {myIssues.length === 0 ? (
              <div style={S.empty}>
                <span style={{fontSize:44, marginBottom: 8}}>📭</span>
                <p style={{color:'var(--text-muted)', fontWeight: 600, fontSize: 16, margin: '8px 0'}}>No issues reported yet</p>
                <p style={{color:'var(--text-sub)', fontSize: 13, maxWidth: 300, margin: '0 auto 16px'}}>Help improve your community by submitting reports on local civic matters.</p>
                <button onClick={() => navigate('/report')} style={S.ctaBtn} className="action-btn">
                  Report a New Issue
                </button>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap: 10}}>
                {myIssues.map(issue => {
                  const p = getPriorityMeta(issue.priorityScore||0);
                  const color = CAT_COLOR[issue.category]||'var(--brand-primary)';
                  const statusColors = {
                    'resolved': { text: '#10b981', bg: '#10b98112' },
                    'in-progress': { text: '#f59e0b', bg: '#f59e0b12' },
                    'open': { text: '#3b82f6', bg: '#3b82f612' }
                  };
                  const sc = statusColors[issue.status] || { text: 'var(--text-muted)', bg: 'var(--border-light)' };

                  return (
                    <div key={issue.id} style={{...S.issueRow, borderLeft:`4px solid ${color}`}} className="issue-row">
                      <div style={{...S.catIcon, background:color+'12'}}>{CAT_ICON[issue.category]||'📌'}</div>
                      
                      <div style={{flex:1, minWidth: 0}}>
                        <p style={S.issueName}>{issue.title}</p>
                        <p style={S.issueMeta}>
                          <MapPin size={12} style={{marginRight: 3, verticalAlign:'middle'}} /> 
                          <span style={{verticalAlign:'middle'}}>{issue.location}</span> 
                          <span style={{margin:'0 6px', opacity: 0.5}}>·</span> 
                          <Calendar size={12} style={{marginRight: 3, verticalAlign:'middle'}} />
                          <span style={{verticalAlign:'middle'}}>{new Date(issue.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>
                      
                      <div style={S.issueStatusCol}>
                        <span style={{...S.pill, background:p.bg, color:p.color}}>{p.label}</span>
                        <span style={{
                          ...S.statusBadge, 
                          background: sc.bg, 
                          color: sc.text,
                        }}>
                          <span style={{...S.statusDot, background: sc.text}} />
                          {issue.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Category Breakdown Content */}
        {tab === 'breakdown' && (
          <div style={{animation: 'fadeUp 0.3s ease-out'}}>
            <p style={S.cardTitle}>
              <BarChart3 size={18} style={{color: 'var(--brand-primary)'}} /> Report Category Breakdown
            </p>
            
            {catBreakdown.length === 0 ? (
              <div style={S.empty}>
                <span style={{fontSize:44, marginBottom: 8}}>📊</span>
                <p style={{color:'var(--text-muted)', fontWeight: 600, fontSize: 16, margin: '8px 0'}}>No category statistics available</p>
                <p style={{color:'var(--text-sub)', fontSize: 13}}>Submit reports to view your profile category metrics.</p>
              </div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap: 20, padding:'10px 0'}}>
                {catBreakdown.map(({ cat, icon, count }) => {
                  const pct = stats.total ? Math.round((count/stats.total)*100) : 0;
                  const color = CAT_COLOR[cat]||'var(--brand-primary)';
                  return (
                    <div key={cat} style={S.barRow}>
                      <div style={S.barInfo}>
                        <span style={{fontSize:18}}>{icon}</span>
                        <span style={S.barLabel}>{cat}</span>
                        <span style={{...S.barCount, color}}>{count} {count === 1 ? 'report' : 'reports'}</span>
                      </div>
                      <div style={S.barContainer}>
                        <div style={S.barTrack}>
                          <div style={{
                            height:'100%',
                            borderRadius:6,
                            width:`${pct}%`,
                            background:`linear-gradient(90deg, ${color}, ${color}aa)`,
                            boxShadow: `0 2px 6px ${color}22`,
                            transition:'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}/>
                        </div>
                        <span style={S.barPct}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Recent Activity Content */}
        {tab === 'activity' && (
          <div style={{animation: 'fadeUp 0.3s ease-out'}}>
            <p style={S.cardTitle}>
              <Activity size={18} style={{color: 'var(--brand-primary)'}} /> Recent Activity Timeline
            </p>
            
            {activity.length === 0 ? (
              <div style={S.empty}>
                <span style={{fontSize:44, marginBottom: 8}}>📝</span>
                <p style={{color:'var(--text-muted)', fontWeight: 600, fontSize: 16, margin: '8px 0'}}>No recent activity found</p>
                <p style={{color:'var(--text-sub)', fontSize: 13}}>Social interactions and report updates will appear here.</p>
              </div>
            ) : (
              <div style={S.timelineContainer}>
                <div style={S.timelineLine} />
                {activity.map(a => {
                  const icons = { 
                    issue_reported: '📝', 
                    issue_resolved: '✅', 
                    follow_request: '👥', 
                    follow_accepted: '🤝', 
                    suggestion: '💡' 
                  };
                  return (
                    <div key={a.id} style={S.timelineItem}>
                      <div style={S.timelineDot}>
                        <span style={{fontSize: 11}}>{icons[a.type] || '📌'}</span>
                      </div>
                      <div style={S.timelineContent}>
                        <p style={S.timelineText}>{a.message}</p>
                        <p style={S.timelineDate}>{new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Amazon SNS Subscriptions Content */}
        {tab === 'sns' && (
          <div style={{animation: 'fadeUp 0.3s ease-out'}}>
            <div style={{
              background: 'linear-gradient(135deg, #FF9900 0%, #FFB84D 100%)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              boxShadow: '0 8px 32px rgba(255, 153, 0, 0.15)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute', top: -30, right: -20, 
                width: 150, height: 150, borderRadius: '50%', 
                background: 'rgba(255,255,255,0.2)', filter: 'blur(20px)'
              }} />
              <div style={{
                background: 'rgba(255,255,255,0.9)', color: '#FF9900', 
                padding: '12px', borderRadius: '12px', display: 'flex'
              }}>
                <Bell size={24} />
              </div>
              <div style={{flex: 1, zIndex: 1}}>
                <h3 style={{margin: '0 0 8px 0', color: 'var(--text-main)', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.01em'}}>
                  Amazon SNS Alerts
                </h3>
                <p style={{margin: 0, color: 'rgba(255,255,255,0.95)', fontSize: '14px', lineHeight: 1.5}}>
                  Subscribe to receive critical civic alerts instantly via Email or SMS. 
                  Powered by Amazon Simple Notification Service.
                </p>
              </div>
            </div>
            
            {isSnsLoading || !snsSubs ? (
              <div style={S.empty}>
                <div style={{...S.spinner, margin: '0 auto 16px', borderTopColor: '#FF9900'}} />
                <p style={{color:'var(--text-muted)'}}>Loading subscriptions...</p>
              </div>
            ) : (
              <div style={{display:'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px'}}>
                {[
                  { key: 'accident', label: 'Accident Alerts', desc: 'Critical traffic and accident reports', icon: '🚨', color: '#ef4444' },
                  { key: 'crime', label: 'Crime Alerts', desc: 'Safety issues and community watch', icon: '🛡️', color: '#8b5cf6' },
                  { key: 'waste', label: 'Waste Alerts', desc: 'Missed collections and hazard cleanups', icon: '🗑️', color: '#10b981' },
                  { key: 'food', label: 'Food Distribution', desc: 'New food rescues available near you', icon: '🍎', color: '#f59e0b' },
                ].map(topic => (
                  <div key={topic.key} style={{
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: '16px', 
                    padding: '20px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)';
                  }}
                  >
                    <div style={{display:'flex', gap: '16px', marginBottom: '16px'}}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px', 
                        background: `${topic.color}15`, display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                      }}>
                        {topic.icon}
                      </div>
                      <div>
                        <h4 style={{margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)'}}>{topic.label}</h4>
                        <p style={{margin: 0, fontSize: '13px', color: 'var(--text-muted)'}}>{topic.desc}</p>
                      </div>
                    </div>
                    
                    <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                      <button 
                        onClick={() => handleToggleSNS(topic.key, 'email', snsSubs[topic.key]?.email)}
                        className="action-btn"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                          background: snsSubs[topic.key]?.email ? '#10b98115' : 'var(--bg-input)',
                          color: snsSubs[topic.key]?.email ? '#10b981' : 'var(--text-sub)',
                          border: `1px solid ${snsSubs[topic.key]?.email ? '#10b98140' : 'var(--border-main)'}`,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <Mail size={16} /> Email
                      </button>
                      <button 
                        onClick={() => handleToggleSNS(topic.key, 'sms', snsSubs[topic.key]?.sms)}
                        className="action-btn"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                          background: snsSubs[topic.key]?.sms ? '#3b82f615' : 'var(--bg-input)',
                          color: snsSubs[topic.key]?.sms ? '#3b82f6' : 'var(--text-sub)',
                          border: `1px solid ${snsSubs[topic.key]?.sms ? '#3b82f640' : 'var(--border-main)'}`,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <Smartphone size={16} /> SMS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account Info Content */}
        {tab === 'account' && (
          <div style={{animation: 'fadeUp 0.3s ease-out'}}>
            <p style={S.cardTitle}>
              <User size={18} style={{color: 'var(--brand-primary)'}} /> Account Metadata
            </p>
            
            <div style={S.infoGrid}>
              {[
                { label:'Full Name',    val:userData?.name, icon: <User size={16} /> },
                { label:'Email Address', val:userData?.email || user?.email, icon: <Mail size={16} /> },
                { label:'Phone Number',  val:decryptText(userData?.phone) || 'Not Configured (Encrypted)', icon: <Phone size={16} /> },
                { label:'Emergency Contact', val:decryptText(userData?.emergencyContact) || 'Not Configured (Encrypted)', icon: <Shield size={16} /> },
                { label:'Access Role',   val:userData?.role, icon: <Shield size={16} /> },
                { label:'Account ID',    val:user?.uid, icon: <FileText size={16} /> },
                { label:'Registration Date', val:new Date(userData?.createdAt||Date.now()).toLocaleString(), icon: <Calendar size={16} /> },
                { label:'Database Layer', val:'Google Cloud Firestore', icon: <Award size={16} /> },
                { label:'Authentication', val:'Google Firebase Auth Provider', icon: <Shield size={16} /> },
              ].map(row => (
                <div key={row.label} style={S.infoRow}>
                  <div style={S.infoLeft}>
                    <span style={S.infoIcon}>{row.icon}</span>
                    <span style={S.infoLabel}>{row.label}</span>
                  </div>
                  <span style={S.infoVal}>{row.val}</span>
                </div>
              ))}
            </div>
            
            <div style={S.accountActions}>
              <button onClick={handleLogout} style={S.logoutFullBtn} className="action-btn">
                <LogOut size={16} style={{marginRight: 6}} /> Sign Out of App
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div style={S.modalOverlay}>
          <div style={S.modalBox}>
            <div style={S.modalHeader}>
              <div style={{display:'flex', alignItems:'center', gap: 10}}>
                <div style={{...S.statIconWrap, background: 'var(--brand-light)', color: 'var(--brand-primary)', width: 34, height: 34}}>
                  <User size={18} />
                </div>
                <h3 style={S.modalTitle}>Edit Profile Info</h3>
              </div>
              <button style={S.closeBtn} onClick={() => setIsEditOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile}>
              <div style={S.photoEditSection}>
                <div style={{...S.avatarPreview, background: photoPreview ? 'transparent' : `linear-gradient(135deg,${rc}22,${rc}44)`, border: `3px solid var(--border-main)`}}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{color:rc, fontSize:28, fontWeight:800}}>{editName?.[0]?.toUpperCase()||'U'}</span>
                  )}
                </div>
                <div style={S.photoEditActions}>
                  <label htmlFor="photo-upload" style={S.uploadBtnLabel} className="action-btn">
                    Choose Image
                  </label>
                  <input 
                    type="file" 
                    id="photo-upload" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    style={{display: 'none'}}
                  />
                  {photoPreview && (
                    <button type="button" onClick={handleRemovePhoto} style={S.removePhotoBtn} className="action-btn">
                      Remove Photo
                    </button>
                  )}
                  <p style={{fontSize: 11, color: 'var(--text-sub)', margin: '4px 0 0'}}>Square JPEG, auto-scaled</p>
                </div>
              </div>

              <div style={S.field}>
                <label style={S.label}>
                  <User size={14} style={{marginRight: 4, verticalAlign: 'middle'}} />
                  <span style={{verticalAlign: 'middle'}}>Display Name</span>
                </label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Your Name"
                  required
                  className="form-input"
                  style={S.input}
                />
              </div>

              <div style={S.field}>
                <label style={S.label}>
                  <FileText size={14} style={{marginRight: 4, verticalAlign: 'middle'}} />
                  <span style={{verticalAlign: 'middle'}}>Biography / Catchphrase</span>
                </label>
                <textarea 
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  maxLength={160}
                  className="form-input"
                  style={S.textarea}
                />
                <span style={S.charCount}>{editBio.length}/160</span>
              </div>

              <div style={S.field}>
                <label style={S.label}>
                  <Phone size={14} style={{marginRight: 4, verticalAlign: 'middle'}} />
                  <span style={{verticalAlign: 'middle'}}>Phone Number</span>
                </label>
                <input 
                  type="tel" 
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="form-input"
                  style={S.input}
                />
              </div>

              <div style={S.field}>
                <label style={S.label}>
                  <Shield size={14} style={{marginRight: 4, verticalAlign: 'middle'}} />
                  <span style={{verticalAlign: 'middle'}}>Emergency Contact Name & Phone</span>
                </label>
                <input 
                  type="text" 
                  value={editEmergency}
                  onChange={e => setEditEmergency(e.target.value)}
                  placeholder="e.g. Spouse: +1 555-0100"
                  className="form-input"
                  style={S.input}
                />
              </div>

              <div style={S.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setIsEditOpen(false)} 
                  style={S.cancelBtn}
                  className="action-btn"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={S.saveBtn}
                  className="action-btn"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page: { 
    padding: '24px', 
    maxWidth: '920px', 
    margin: '0 auto', 
    background: 'var(--bg-page)', 
    minHeight: '100vh', 
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  hero: { 
    background: 'var(--bg-card)', 
    borderRadius: '20px', 
    border: '1px solid var(--border-main)', 
    overflow: 'hidden', 
    boxShadow: '0 4px 20px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.01)', 
    position: 'relative' 
  },
  heroBanner: { 
    height: '130px', 
    width: '100%' 
  },
  heroDetails: { 
    padding: '0 24px 24px', 
    position: 'relative', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '12px' 
  },
  avatarWrapper: { 
    marginTop: '-45px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end', 
    flexWrap: 'wrap', 
    gap: '16px' 
  },
  avatar: { 
    width: '90px', 
    height: '90px', 
    borderRadius: '24px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexShrink: 0,
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
  },
  heroActions: { 
    display: 'flex', 
    gap: '8px' 
  },
  editBtn: { 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '6px', 
    background: 'var(--bg-input)', 
    border: '1px solid var(--border-main)', 
    borderRadius: '10px', 
    color: 'var(--text-main)', 
    padding: '10px 16px', 
    fontSize: '13px', 
    fontWeight: '600', 
    cursor: 'pointer' 
  },
  logoutBtn: { 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '6px', 
    background: 'var(--danger-bg)', 
    border: '1px solid var(--danger-border)', 
    borderRadius: '10px', 
    color: 'var(--danger-text)', 
    padding: '10px 16px', 
    fontSize: '13px', 
    fontWeight: '600', 
    cursor: 'pointer' 
  },
  heroMeta: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '6px',
    marginTop: '6px'
  },
  heroName: { 
    color: 'var(--text-main)', 
    fontSize: '26px', 
    fontWeight: '850', 
    letterSpacing: '-0.025em', 
    margin: 0 
  },
  repBadge: { 
    fontSize: '11px', 
    padding: '3px 10px', 
    borderRadius: '20px', 
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  roleBadge: { 
    fontSize: '11px', 
    padding: '3px 10px', 
    borderRadius: '20px', 
    fontWeight: '700', 
    textTransform: 'capitalize',
    display: 'inline-flex',
    alignItems: 'center'
  },
  heroEmail: { 
    color: 'var(--text-muted)', 
    fontSize: '13.5px', 
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  heroBio: { 
    fontSize: '14.5px', 
    lineHeight: '1.55', 
    margin: '8px 0 2px', 
    maxWidth: '720px' 
  },
  metaTagsRow: { 
    display: 'flex', 
    gap: '16px', 
    flexWrap: 'wrap', 
    marginTop: '6px', 
    alignItems: 'center' 
  },
  metaTag: { 
    fontSize: '12px', 
    color: 'var(--text-muted)', 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '5px' 
  },
  socialTag: { 
    fontSize: '12px', 
    color: 'var(--brand-primary)', 
    textDecoration: 'none', 
    display: 'inline-flex', 
    alignItems: 'center',
    transition: 'opacity 0.2s'
  },
  
  // Stats
  statsGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
    gap: '14px' 
  },
  statCard: { 
    background: 'var(--bg-card)', 
    borderRadius: '16px', 
    padding: '18px 12px', 
    border: '1px solid var(--border-main)', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    gap: '6px', 
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.01)'
  },
  statLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px'
  },
  statIconWrap: {
    width: '38px',
    height: '38px',
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2px'
  },
  statVal: { 
    fontSize: '24px', 
    fontWeight: '800', 
    lineHeight: 1 
  },
  statLabel: { 
    color: 'var(--text-muted)', 
    fontSize: '11.5px',
    fontWeight: '500'
  },

  // Tabs
  tabs: { 
    display: 'flex', 
    gap: '4px', 
    background: 'var(--border-light)', 
    padding: '4px', 
    borderRadius: '12px',
    width: 'fit-content',
    flexWrap: 'wrap'
  },
  tab: { 
    padding: '8px 16px', 
    border: 'none', 
    borderRadius: '9px', 
    fontSize: '13px', 
    cursor: 'pointer', 
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  },

  // Card Content Panel
  card: { 
    background: 'var(--bg-card)', 
    borderRadius: '20px', 
    padding: '24px', 
    border: '1px solid var(--border-main)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
  },
  cardTitle: { 
    color: 'var(--text-main)', 
    fontWeight: '800', 
    fontSize: '16px', 
    margin: '0 0 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    letterSpacing: '-0.01em'
  },
  empty: { 
    textAlign: 'center', 
    padding: '40px 16px' 
  },
  ctaBtn: {
    background: 'var(--brand-primary)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    padding: '10px 20px',
    fontSize: '13.5px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(26,115,232,0.15)'
  },

  // Issues Tab
  issueRow: { 
    display: 'flex', 
    gap: '14px', 
    alignItems: 'center', 
    padding: '12px 16px', 
    background: 'var(--bg-input)', 
    borderRadius: '12px',
    border: '1px solid var(--border-light)'
  },
  catIcon: { 
    width: '38px', 
    height: '38px', 
    borderRadius: '10px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '18px', 
    flexShrink: 0 
  },
  issueName: { 
    color: 'var(--text-main)', 
    fontSize: '14px', 
    fontWeight: '650', 
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  issueMeta: { 
    color: 'var(--text-muted)', 
    fontSize: '12px', 
    margin: '4px 0 0',
    display: 'flex',
    alignItems: 'center'
  },
  issueStatusCol: {
    textAlign: 'right',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px'
  },
  pill: { 
    fontSize: '11px', 
    fontWeight: '700', 
    padding: '2.5px 8px', 
    borderRadius: '20px', 
    display: 'inline-block' 
  },
  statusBadge: {
    fontSize: '11px',
    fontWeight: '600',
    padding: '2.5px 8px',
    borderRadius: '20px',
    textTransform: 'capitalize',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px'
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%'
  },

  // Category Breakdown Tab
  barRow: { 
    display: 'flex', 
    flexDirection: 'column',
    gap: '6px'
  },
  barInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px'
  },
  barLabel: { 
    color: 'var(--text-main)', 
    fontWeight: '600',
    textTransform: 'capitalize' 
  },
  barCount: {
    fontSize: '11.5px',
    fontWeight: '600',
    opacity: 0.8
  },
  barContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  barTrack: { 
    flex: 1, 
    background: 'var(--border-light)', 
    borderRadius: '6px', 
    height: '10px',
    overflow: 'hidden'
  },
  barPct: {
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: '600',
    width: '32px',
    textAlign: 'right'
  },

  // Activity Timeline
  timelineContainer: {
    position: 'relative',
    paddingLeft: '20px'
  },
  timelineLine: {
    position: 'absolute',
    left: '9px',
    top: '8px',
    bottom: '8px',
    width: '2px',
    background: 'var(--border-light)'
  },
  timelineItem: {
    position: 'relative',
    display: 'flex',
    gap: '14px',
    paddingBottom: '20px',
    alignItems: 'flex-start'
  },
  timelineDot: {
    position: 'absolute',
    left: '-20px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--bg-card)',
    border: '2px solid var(--border-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2
  },
  timelineContent: {
    flex: 1,
    paddingTop: '2px'
  },
  timelineText: {
    color: 'var(--text-main)',
    fontSize: '13.5px',
    fontWeight: '500',
    margin: 0
  },
  timelineDate: {
    color: 'var(--text-sub)',
    fontSize: '11px',
    margin: '3px 0 0'
  },

  // Account Info Tab
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  infoRow: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    padding: '14px 0', 
    borderBottom: '1px solid var(--border-light)',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  infoLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'var(--text-muted)'
  },
  infoIcon: {
    display: 'flex',
    alignItems: 'center'
  },
  infoLabel: { 
    fontSize: '13.5px',
    fontWeight: '500'
  },
  infoVal: { 
    color: 'var(--text-main)', 
    fontSize: '13.5px', 
    fontWeight: '600',
    wordBreak: 'break-all'
  },
  accountActions: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid var(--border-light)'
  },
  logoutFullBtn: { 
    width: '100%', 
    padding: '12px', 
    background: 'var(--danger-bg)', 
    border: '1px solid var(--danger-border)', 
    borderRadius: '10px', 
    color: 'var(--danger-text)', 
    fontSize: '13.5px', 
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    animation: 'fadeIn 0.2s ease-out'
  },
  modalBox: {
    background: 'var(--bg-card)',
    borderRadius: '20px',
    padding: '24px',
    width: '90%',
    maxWidth: '460px',
    border: '1px solid var(--border-main)',
    boxShadow: '0 20px 48px rgba(0,0,0,0.12)',
    animation: 'scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-light)'
  },
  modalTitle: {
    color: 'var(--text-main)',
    fontSize: '16.5px',
    fontWeight: '800',
    margin: 0
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '50%',
    transition: 'background 0.2s'
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '18px',
    position: 'relative'
  },
  label: {
    fontSize: '12.5px',
    fontWeight: '600',
    color: 'var(--text-muted)',
    display: 'inline-block'
  },
  input: {
    padding: '10px 12px',
    borderRadius: '9px',
    border: '1px solid var(--border-main)',
    fontSize: '14px',
    background: 'var(--bg-input)',
    color: 'var(--text-main)',
    width: '100%',
    transition: 'all 0.2s'
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: '9px',
    border: '1px solid var(--border-main)',
    fontSize: '14px',
    background: 'var(--bg-input)',
    color: 'var(--text-main)',
    width: '100%',
    minHeight: '80px',
    maxHeight: '120px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  },
  charCount: {
    fontSize: '10px',
    color: 'var(--text-sub)',
    textAlign: 'right',
    marginTop: '2px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-light)'
  },
  cancelBtn: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border-main)',
    borderRadius: '9px',
    color: 'var(--text-main)',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  saveBtn: {
    background: 'var(--brand-primary)',
    border: 'none',
    borderRadius: '9px',
    color: '#ffffff',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  photoEditSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
    background: 'var(--bg-input)',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-light)'
  },
  avatarPreview: {
    width: '70px',
    height: '70px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0
  },
  photoEditActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px'
  },
  uploadBtnLabel: {
    background: 'var(--brand-primary)',
    color: '#ffffff',
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-block',
    border: 'none',
    boxShadow: '0 2px 6px rgba(26,115,232,0.15)'
  },
  removePhotoBtn: {
    background: 'transparent',
    border: '1px solid var(--danger-border)',
    color: 'var(--danger-text)',
    padding: '5px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '2px'
  }
};
