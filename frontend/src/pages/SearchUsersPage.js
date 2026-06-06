import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUserData } from '../services/authService';
import {
  searchUsers, sendFollowRequest, getFollowStatus, unfollowUser,
  subscribeToPendingRequests, subscribeToFollowers, subscribeToFollowing,
  acceptFollowRequest, rejectFollowRequest, removeFollower,
  calculateReputation, getReputationBadge
} from '../services/socialService';

const ROLE_COLOR = { admin:'#ff8800', official:'#4488ff', citizen:'#00cc66' };

export default function SearchUsersPage({ userData, user }) {
  const [tab, setTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [followStatuses, setFollowStatuses] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const debounceRef = useRef(null);

  // Subscribe to pending requests, followers, following
  useEffect(() => {
    if (!user?.uid) return;
    const unsub1 = subscribeToPendingRequests(user.uid, setPendingRequests);
    const unsub2 = subscribeToFollowers(user.uid, setFollowers);
    const unsub3 = subscribeToFollowing(user.uid, setFollowing);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user]);

  // Debounced search
  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsers(q, user.uid);
        setResults(res);
        // Load follow statuses
        const statuses = {};
        await Promise.all(res.map(async (u) => {
          statuses[u.uid] = await getFollowStatus(user.uid, u.uid);
        }));
        setFollowStatuses(statuses);
      } catch (err) { console.error(err); }
      setSearching(false);
    }, 400);
  }, [user]);

  const handleFollow = async (targetUid) => {
    setActionLoading(p => ({ ...p, [targetUid]: true }));
    try {
      await sendFollowRequest({ uid: user.uid, name: userData?.name, email: userData?.email }, targetUid);
      setFollowStatuses(p => ({ ...p, [targetUid]: 'pending' }));
    } catch (err) { alert(err.message); }
    setActionLoading(p => ({ ...p, [targetUid]: false }));
  };

  const handleUnfollow = async (targetUid) => {
    setActionLoading(p => ({ ...p, [targetUid]: true }));
    try {
      await unfollowUser(user.uid, targetUid);
      setFollowStatuses(p => ({ ...p, [targetUid]: 'none' }));
    } catch (err) { alert(err.message); }
    setActionLoading(p => ({ ...p, [targetUid]: false }));
  };

  const handleAccept = async (req) => {
    setActionLoading(p => ({ ...p, [req.id]: true }));
    try {
      await acceptFollowRequest(req.id, req.fromUid, req.fromName, req.fromEmail, user.uid, userData?.name, userData?.email);
    } catch (err) { alert(err.message); }
    setActionLoading(p => ({ ...p, [req.id]: false }));
  };

  const handleReject = async (req) => {
    setActionLoading(p => ({ ...p, [req.id]: true }));
    try { await rejectFollowRequest(req.id); }
    catch (err) { alert(err.message); }
    setActionLoading(p => ({ ...p, [req.id]: false }));
  };

  const handleRemoveFollower = async (followerUid) => {
    setActionLoading(p => ({ ...p, [`rm-${followerUid}`]: true }));
    try { await removeFollower(user.uid, followerUid); }
    catch (err) { alert(err.message); }
    setActionLoading(p => ({ ...p, [`rm-${followerUid}`]: false }));
  };

  const viewProfile = async (uid) => {
    try {
      const data = await getUserData(uid);
      setSelectedUser(data);
    } catch (err) { console.error(err); }
  };

  const renderAvatar = (name, role) => {
    const rc = ROLE_COLOR[role] || '#888';
    return (
      <div style={{...S.avatar, background:`linear-gradient(135deg,${rc}44,${rc}22)`, border:`1px solid ${rc}44`}}>
        <span style={{color:rc, fontWeight:800, fontSize:15}}>{name?.[0]?.toUpperCase()||'?'}</span>
      </div>
    );
  };

  const renderFollowBtn = (uid) => {
    const status = followStatuses[uid];
    const loading = actionLoading[uid];
    if (status === 'following') {
      return <button style={S.btnUnfollow} disabled={loading} onClick={() => handleUnfollow(uid)}>{loading ? '...' : 'Unfollow'}</button>;
    }
    if (status === 'pending') {
      return <button style={S.btnPending} disabled>Pending</button>;
    }
    return <button style={S.btnFollow} disabled={loading} onClick={() => handleFollow(uid)}>{loading ? '...' : 'Follow'}</button>;
  };

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .people-tab:hover{background:var(--bg-card-hover) !important}
        .user-row:hover{background:var(--bg-card-hover) !important}
      `}</style>

      <div style={S.header}>
        <div>
          <h1 style={S.title}>👥 People</h1>
          <p style={S.subtitle}>Discover, connect, and engage with the community</p>
        </div>
        <div style={S.counters}>
          <div style={S.counter}>
            <span style={S.counterVal}>{followers.length}</span>
            <span style={S.counterLabel}>Followers</span>
          </div>
          <div style={S.counter}>
            <span style={S.counterVal}>{following.length}</span>
            <span style={S.counterLabel}>Following</span>
          </div>
          {pendingRequests.length > 0 && (
            <div style={{...S.counter, borderColor:'#ff8800'}}>
              <span style={{...S.counterVal, color:'#ff8800'}}>{pendingRequests.length}</span>
              <span style={S.counterLabel}>Pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        {[
          ['search', '🔍 Search'],
          ['requests', `📥 Requests${pendingRequests.length ? ` (${pendingRequests.length})` : ''}`],
          ['followers', `👥 Followers (${followers.length})`],
          ['following', `➡️ Following (${following.length})`],
        ].map(([id, label]) => (
          <button key={id} className="people-tab" onClick={() => setTab(id)} style={{
            ...S.tab, background: tab === id ? 'rgba(68,136,255,0.12)' : 'transparent',
            borderColor: tab === id ? '#4488ff' : 'var(--border-main)',
            color: tab === id ? '#4488ff' : 'var(--text-sub)',
          }}>{label}</button>
        ))}
      </div>

      {/* Search Tab */}
      {tab === 'search' && (
        <div className="glass-panel" style={S.card}>
          <div style={S.searchWrap}>
            <span style={S.searchIcon}>🔍</span>
            <input
              style={S.searchInput}
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
            />
            {searching && <span style={S.searchSpinner}>⏳</span>}
          </div>

          {results.length === 0 && searchQuery.length >= 2 && !searching && (
            <div style={S.empty}>
              <span style={{fontSize:36}}>🔍</span>
              <p style={{color:'var(--text-sub)',marginTop:8}}>No users found for "{searchQuery}"</p>
            </div>
          )}

          {results.map(u => {
            const rep = calculateReputation(u);
            const badge = getReputationBadge(rep);
            return (
              <div key={u.uid} className="user-row" style={S.userRow} onClick={() => viewProfile(u.uid)}>
                {renderAvatar(u.name, u.role)}
                <div style={{flex:1, overflow:'hidden'}}>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    <p style={S.userName}>{u.name}</p>
                    <span style={{...S.repBadge, background:`${badge.color}18`, color:badge.color}}>{badge.icon} {badge.label}</span>
                  </div>
                  <p style={S.userEmail}>{u.email}</p>
                  <div style={{display:'flex', gap:10, marginTop:4}}>
                    <span style={{...S.rolePill, color:ROLE_COLOR[u.role]||'#888', background:(ROLE_COLOR[u.role]||'#888')+'18'}}>{u.role}</span>
                    <span style={S.userStat}>👥 {u.followersCount||0}</span>
                  </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  {renderFollowBtn(u.uid)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Requests Tab */}
      {tab === 'requests' && (
        <div className="glass-panel" style={S.card}>
          <p style={S.cardTitle}>📥 Incoming Follow Requests</p>
          {pendingRequests.length === 0 && (
            <div style={S.empty}>
              <span style={{fontSize:36}}>📭</span>
              <p style={{color:'var(--text-sub)',marginTop:8}}>No pending requests</p>
            </div>
          )}
          {pendingRequests.map(req => (
            <div key={req.id} className="user-row" style={S.userRow}>
              {renderAvatar(req.fromName)}
              <div style={{flex:1}}>
                <p style={S.userName}>{req.fromName}</p>
                <p style={S.userEmail}>{req.fromEmail}</p>
                <p style={{color:'var(--text-sub)', fontSize:11, marginTop:2}}>
                  {new Date(req.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div style={{display:'flex', gap:6}}>
                <button style={S.btnAccept} disabled={actionLoading[req.id]} onClick={() => handleAccept(req)}>
                  {actionLoading[req.id] ? '...' : '✓ Accept'}
                </button>
                <button style={S.btnReject} disabled={actionLoading[req.id]} onClick={() => handleReject(req)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Followers Tab */}
      {tab === 'followers' && (
        <div className="glass-panel" style={S.card}>
          <p style={S.cardTitle}>👥 Your Followers ({followers.length})</p>
          {followers.length === 0 && (
            <div style={S.empty}>
              <span style={{fontSize:36}}>👤</span>
              <p style={{color:'var(--text-sub)',marginTop:8}}>No followers yet</p>
            </div>
          )}
          {followers.map(f => (
            <div key={f.uid} className="user-row" style={S.userRow}>
              {renderAvatar(f.name)}
              <div style={{flex:1}}>
                <p style={S.userName}>{f.name}</p>
                <p style={S.userEmail}>{f.email}</p>
                <p style={{color:'var(--text-sub)', fontSize:11}}>Since {new Date(f.followedAt).toLocaleDateString()}</p>
              </div>
              <button style={S.btnRemove} disabled={actionLoading[`rm-${f.uid}`]} onClick={() => handleRemoveFollower(f.uid)}>
                {actionLoading[`rm-${f.uid}`] ? '...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Following Tab */}
      {tab === 'following' && (
        <div className="glass-panel" style={S.card}>
          <p style={S.cardTitle}>➡️ People You Follow ({following.length})</p>
          {following.length === 0 && (
            <div style={S.empty}>
              <span style={{fontSize:36}}>🔍</span>
              <p style={{color:'var(--text-sub)',marginTop:8}}>You aren't following anyone yet</p>
            </div>
          )}
          {following.map(f => (
            <div key={f.uid} className="user-row" style={S.userRow}>
              {renderAvatar(f.name)}
              <div style={{flex:1}}>
                <p style={S.userName}>{f.name}</p>
                <p style={S.userEmail}>{f.email}</p>
              </div>
              <button style={S.btnUnfollow} onClick={() => handleUnfollow(f.uid)} disabled={actionLoading[f.uid]}>
                {actionLoading[f.uid] ? '...' : 'Unfollow'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <div style={S.overlay} onClick={() => setSelectedUser(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div style={{display:'flex', gap:16, alignItems:'center'}}>
                {renderAvatar(selectedUser.name, selectedUser.role)}
                <div>
                  <h3 style={{color:'var(--text-main)', fontSize:18, fontWeight:700, margin:0}}>{selectedUser.name}</h3>
                  <p style={{color:'var(--text-sub)', fontSize:13, margin:'2px 0 0'}}>{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{background:'none',border:'none',color:'var(--text-sub)',fontSize:20,cursor:'pointer'}}>✕</button>
            </div>

            <div style={{display:'flex', gap:12, marginTop:16, flexWrap:'wrap'}}>
              <span style={{...S.rolePill, color:ROLE_COLOR[selectedUser.role]||'#888', background:(ROLE_COLOR[selectedUser.role]||'#888')+'18'}}>
                {selectedUser.role}
              </span>
              {(() => { const r = calculateReputation(selectedUser); const b = getReputationBadge(r); return (
                <span style={{...S.repBadge, background:`${b.color}18`, color:b.color}}>{b.icon} {b.label} ({r})</span>
              );})()}
            </div>

            {selectedUser.bio && <p style={{color:'var(--text-muted)', fontSize:14, marginTop:12}}>{selectedUser.bio}</p>}

            <div style={{display:'flex', gap:20, marginTop:16, padding:'12px 0', borderTop:'1px solid var(--border-main)'}}>
              <div><span style={{color:'var(--text-main)', fontWeight:700}}>{selectedUser.followersCount||0}</span> <span style={{color:'var(--text-sub)', fontSize:13}}>Followers</span></div>
              <div><span style={{color:'var(--text-main)', fontWeight:700}}>{selectedUser.followingCount||0}</span> <span style={{color:'var(--text-sub)', fontSize:13}}>Following</span></div>
            </div>

            <p style={{color:'var(--text-sub)', fontSize:12, marginTop:8}}>📅 Member since {new Date(selectedUser.createdAt||Date.now()).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:        { padding:28, maxWidth:900, margin:'0 auto', minHeight:'100vh', fontFamily:'system-ui,sans-serif' },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:16 },
  title:       { color:'var(--text-main)', fontSize:26, fontWeight:800, letterSpacing:'-0.02em', margin:0 },
  subtitle:    { color:'var(--text-sub)', fontSize:14, marginTop:4 },
  counters:    { display:'flex', gap:10 },
  counter:     { background:'var(--bg-card)', border:'1px solid var(--border-main)', borderRadius:12, padding:'10px 18px', textAlign:'center', minWidth:80 },
  counterVal:  { display:'block', color:'var(--brand-primary)', fontSize:22, fontWeight:800 },
  counterLabel:{ display:'block', color:'var(--text-sub)', fontSize:11, marginTop:2 },
  tabs:        { display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' },
  tab:         { padding:'8px 16px', border:'1px solid', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', transition:'all 0.2s' },
  card:        { background:'var(--bg-card)', borderRadius:14, padding:22, border:'1px solid var(--border-main)' },
  cardTitle:   { color:'var(--text-main)', fontWeight:700, fontSize:15, margin:'0 0 16px' },
  searchWrap:  { display:'flex', alignItems:'center', gap:10, background:'var(--bg-input)', border:'1px solid var(--border-main)', borderRadius:12, padding:'8px 16px', marginBottom:16 },
  searchIcon:  { fontSize:16, flexShrink:0 },
  searchInput: { flex:1, background:'transparent', border:'none', color:'var(--text-main)', fontSize:14, outline:'none', padding:'6px 0' },
  searchSpinner:{ fontSize:14, animation:'spin 1s linear infinite' },
  empty:       { textAlign:'center', padding:'32px 0' },
  userRow:     { display:'flex', gap:14, alignItems:'center', padding:'14px 12px', borderRadius:12, marginBottom:6, cursor:'pointer', transition:'background 0.15s', borderBottom:'1px solid var(--border-main)' },
  avatar:      { width:44, height:44, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  userName:    { color:'var(--text-main)', fontSize:14, fontWeight:600, margin:0 },
  userEmail:   { color:'var(--text-sub)', fontSize:12, margin:'2px 0 0' },
  userStat:    { color:'var(--text-sub)', fontSize:11 },
  rolePill:    { fontSize:11, padding:'2px 8px', borderRadius:6, textTransform:'capitalize', fontWeight:600 },
  repBadge:    { fontSize:11, padding:'2px 8px', borderRadius:6, fontWeight:600 },
  btnFollow:   { background:'var(--brand-primary)', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, padding:'8px 16px', cursor:'pointer', flexShrink:0 },
  btnUnfollow: { background:'transparent', border:'1px solid var(--border-main)', borderRadius:8, color:'var(--text-sub)', fontSize:12, fontWeight:600, padding:'7px 14px', cursor:'pointer', flexShrink:0 },
  btnPending:  { background:'rgba(255,136,0,0.12)', border:'1px solid rgba(255,136,0,0.25)', borderRadius:8, color:'#ff8800', fontSize:12, fontWeight:600, padding:'7px 14px', cursor:'default', flexShrink:0 },
  btnAccept:   { background:'rgba(0,204,102,0.12)', border:'1px solid rgba(0,204,102,0.25)', borderRadius:8, color:'#00cc66', fontSize:12, fontWeight:700, padding:'7px 14px', cursor:'pointer' },
  btnReject:   { background:'rgba(255,68,68,0.08)', border:'1px solid rgba(255,68,68,0.2)', borderRadius:8, color:'#ff4444', fontSize:12, fontWeight:700, padding:'7px 14px', cursor:'pointer' },
  btnRemove:   { background:'transparent', border:'1px solid rgba(255,68,68,0.2)', borderRadius:8, color:'#ff4444', fontSize:12, fontWeight:600, padding:'7px 14px', cursor:'pointer', flexShrink:0 },
  overlay:     { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 },
  modal:       { background:'var(--bg-card)', border:'1px solid var(--border-main)', borderRadius:20, padding:28, width:'100%', maxWidth:480, boxShadow:'0 32px 64px rgba(0,0,0,0.5)' },
};
